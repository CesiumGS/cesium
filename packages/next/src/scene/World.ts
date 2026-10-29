import { RangeAllocator } from "../gpu/RangeAllocator.ts";
import {
  INDIRECT_SIZE,
  INSTANCE_SIZE,
  RECORD_FLOATS,
  RECORD_SIZE,
  RecordFlags,
  VERTEX_FLOATS,
  writeDrawRecord,
  type DrawRecordData,
} from "../render/layout.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { MeshData } from "./meshes.ts";
import type { RenderContext } from "./RenderContext.ts";

export interface WorldOptions {
  maxDraws?: number;
  vertexBytes?: number;
  indexBytes?: number;
}

export interface MeshHandle {
  readonly baseVertex: number;
  readonly firstIndex: number;
  readonly indexCount: number;
  readonly vertexCount: number;
}

export interface DrawOptions {
  mesh: MeshHandle;
  origin: Vec3;
  model: Mat4;
  radius: number;
  color: readonly [number, number, number, number];
  /** Application-level name, returned by picking. */
  name?: string;
}

/** A registered draw. Mutations go through the world so it can track dirtiness. */
export interface DrawHandle {
  readonly index: number;
  readonly name: string | undefined;
}

/**
 * Scene content shared by any number of views: a geometry arena (vertex
 * pulling from one storage buffer, one index buffer) and a table of draw
 * records mirrored to the GPU. One render bundle replays every draw for
 * every view; per-view state reaches it through the "current view" buffer
 * and the indirect args written by the prep kernel.
 */
export class World {
  readonly maxDraws: number;
  private readonly vertexAllocator: RangeAllocator;
  private readonly indexAllocator: RangeAllocator;
  private readonly recordsF32: Float32Array;
  private readonly recordsU32: Uint32Array;
  private readonly recordsI32: Int32Array;
  private readonly names: Array<string | undefined> = [];
  private readonly freeSlots: number[] = [];
  private drawCount = 0;
  private dirtyMin = Number.POSITIVE_INFINITY;
  private dirtyMax = -1;
  private bundle?: GPURenderBundle;
  private readonly prepParamsData = new Uint32Array(4);

  readonly vertexBuffer: GPUBuffer;
  readonly indexBuffer: GPUBuffer;
  readonly recordBuffer: GPUBuffer;
  readonly instanceBuffer: GPUBuffer;
  readonly indirectBuffer: GPUBuffer;
  /** u32 0..maxDraws-1, read as an instance-step attribute when firstInstance is unsupported. */
  readonly drawIndexBuffer: GPUBuffer;
  private readonly prepParams: GPUBuffer;
  readonly prepBindGroup: GPUBindGroup;
  readonly drawBindGroup: GPUBindGroup;

  constructor(
    private readonly ctx: RenderContext,
    options: WorldOptions = {},
  ) {
    const device = ctx.device;
    this.maxDraws = options.maxDraws ?? 16384;
    const vertexBytes = options.vertexBytes ?? 64 * 1024 * 1024;
    const indexBytes = options.indexBytes ?? 32 * 1024 * 1024;
    this.vertexAllocator = new RangeAllocator(vertexBytes, VERTEX_FLOATS * 4);
    this.indexAllocator = new RangeAllocator(indexBytes, 4);

    const records = new ArrayBuffer(this.maxDraws * RECORD_SIZE);
    this.recordsF32 = new Float32Array(records);
    this.recordsU32 = new Uint32Array(records);
    this.recordsI32 = new Int32Array(records);

    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.vertexBuffer = device.createBuffer({
      label: "world.vertices",
      size: vertexBytes,
      usage: storage,
    });
    this.indexBuffer = device.createBuffer({
      label: "world.indices",
      size: indexBytes,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.recordBuffer = device.createBuffer({
      label: "world.records",
      size: records.byteLength,
      usage: storage,
    });
    this.instanceBuffer = device.createBuffer({
      label: "world.instances",
      size: this.maxDraws * INSTANCE_SIZE,
      usage: GPUBufferUsage.STORAGE,
    });
    this.indirectBuffer = device.createBuffer({
      label: "world.indirect",
      size: this.maxDraws * INDIRECT_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT,
    });
    this.drawIndexBuffer = device.createBuffer({
      label: "world.drawIndex",
      size: this.maxDraws * 4,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    const drawIndices = new Uint32Array(this.drawIndexBuffer.getMappedRange());
    for (let i = 0; i < this.maxDraws; i++) {
      drawIndices[i] = i;
    }
    this.drawIndexBuffer.unmap();
    this.prepParams = device.createBuffer({
      label: "world.prepParams",
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.prepBindGroup = device.createBindGroup({
      label: "world.prep",
      layout: ctx.pipelines.prepWorldLayout,
      entries: [
        { binding: 0, resource: { buffer: this.recordBuffer } },
        { binding: 1, resource: { buffer: this.instanceBuffer } },
        { binding: 2, resource: { buffer: this.indirectBuffer } },
        { binding: 3, resource: { buffer: this.prepParams } },
      ],
    });
    this.drawBindGroup = device.createBindGroup({
      label: "world.draw",
      layout: ctx.pipelines.drawWorldLayout,
      entries: [
        { binding: 0, resource: { buffer: this.recordBuffer } },
        { binding: 1, resource: { buffer: this.instanceBuffer } },
        { binding: 2, resource: { buffer: this.vertexBuffer } },
      ],
    });
  }

  /** Number of record slots in use, including hidden and freed-but-trailing slots. */
  get recordCount(): number {
    return this.drawCount;
  }

  /** Uploads geometry into the arena. */
  addMesh(mesh: MeshData): MeshHandle {
    const vertexCount = mesh.vertices.length / VERTEX_FLOATS;
    const vertexOffset = this.vertexAllocator.allocate(
      mesh.vertices.byteLength,
    );
    const indexOffset = this.indexAllocator.allocate(mesh.indices.byteLength);
    if (vertexOffset === undefined || indexOffset === undefined) {
      throw new Error("World geometry arena is full.");
    }
    const queue = this.ctx.device.queue;
    queue.writeBuffer(this.vertexBuffer, vertexOffset, mesh.vertices);
    queue.writeBuffer(this.indexBuffer, indexOffset, mesh.indices);
    return {
      baseVertex: vertexOffset / (VERTEX_FLOATS * 4),
      firstIndex: indexOffset / 4,
      indexCount: mesh.indices.length,
      vertexCount,
    };
  }

  addDraw(options: DrawOptions): DrawHandle {
    const index = this.freeSlots.pop() ?? this.drawCount++;
    if (index >= this.maxDraws) {
      throw new Error("World draw table is full.");
    }
    this.names[index] = options.name;
    this.write(index, options, 0);
    this.bundle = undefined;
    return { index, name: options.name };
  }

  removeDraw(handle: DrawHandle): void {
    this.recordsU32[handle.index * RECORD_FLOATS + 28] = 0; // indexCount = 0 → never drawn
    this.recordsU32[handle.index * RECORD_FLOATS + 7] = RecordFlags.hidden;
    this.names[handle.index] = undefined;
    this.freeSlots.push(handle.index);
    this.markDirty(handle.index);
  }

  setVisible(handle: DrawHandle, visible: boolean): void {
    const flagsIndex = handle.index * RECORD_FLOATS + 7;
    const flags = this.recordsU32[flagsIndex]!;
    this.recordsU32[flagsIndex] = visible
      ? flags & ~RecordFlags.hidden
      : flags | RecordFlags.hidden;
    this.markDirty(handle.index);
  }

  /** Name registered for a picked feature ID (record index + 1). */
  nameForFeature(featureId: number): string | undefined {
    return featureId > 0 ? this.names[featureId - 1] : undefined;
  }

  /** Uploads dirty records and returns the bundle for the current draw set. */
  prepareFrame(): GPURenderBundle {
    const queue = this.ctx.device.queue;
    if (this.dirtyMax >= 0) {
      const begin = this.dirtyMin * RECORD_SIZE;
      const end = (this.dirtyMax + 1) * RECORD_SIZE;
      queue.writeBuffer(
        this.recordBuffer,
        begin,
        this.recordsF32.buffer,
        begin,
        end - begin,
      );
      this.dirtyMin = Number.POSITIVE_INFINITY;
      this.dirtyMax = -1;
    }
    this.prepParamsData[0] = this.drawCount;
    this.prepParamsData[1] = this.ctx.caps.indirectFirstInstance ? 1 : 0;
    queue.writeBuffer(this.prepParams, 0, this.prepParamsData);
    this.bundle ??= this.recordBundle();
    return this.bundle;
  }

  /** Records one indirect draw per record. Rebuilt only when records are added. */
  private recordBundle(): GPURenderBundle {
    const encoder = this.ctx.device.createRenderBundleEncoder({
      label: "world.bundle",
      colorFormats: this.ctx.targets.colorFormats,
      depthStencilFormat: this.ctx.targets.depthFormat,
      sampleCount: this.ctx.targets.sampleCount,
    });
    const firstInstance = this.ctx.caps.indirectFirstInstance;
    encoder.setPipeline(this.ctx.pipelines.opaque);
    encoder.setBindGroup(0, this.ctx.currentViewBindGroup);
    encoder.setBindGroup(1, this.drawBindGroup);
    encoder.setIndexBuffer(this.indexBuffer, "uint32");
    for (let i = 0; i < this.drawCount; i++) {
      if (!firstInstance) {
        encoder.setVertexBuffer(0, this.drawIndexBuffer, i * 4, 4);
      }
      encoder.drawIndexedIndirect(this.indirectBuffer, i * INDIRECT_SIZE);
    }
    return encoder.finish();
  }

  private write(index: number, options: DrawOptions, flags: number): void {
    const record: DrawRecordData = {
      origin: options.origin,
      model: options.model,
      radius: options.radius,
      color: options.color,
      indexCount: options.mesh.indexCount,
      firstIndex: options.mesh.firstIndex,
      baseVertex: options.mesh.baseVertex,
      featureId: index + 1,
      flags,
    };
    writeDrawRecord(
      this.recordsF32,
      this.recordsU32,
      this.recordsI32,
      index,
      record,
    );
    this.markDirty(index);
  }

  private markDirty(index: number): void {
    this.dirtyMin = Math.min(this.dirtyMin, index);
    this.dirtyMax = Math.max(this.dirtyMax, index);
  }

  destroy(): void {
    for (const buffer of [
      this.vertexBuffer,
      this.indexBuffer,
      this.recordBuffer,
      this.instanceBuffer,
      this.indirectBuffer,
      this.drawIndexBuffer,
      this.prepParams,
    ]) {
      buffer.destroy();
    }
  }
}
