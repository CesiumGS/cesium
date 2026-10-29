import { RangeAllocator } from "../gpu/RangeAllocator.ts";
import {
  INDIRECT_SIZE,
  INSTANCE_SIZE,
  MATERIAL_SIZE,
  NO_STREAM,
  RECORD_SIZE,
  RECORD_WORDS,
  RecordFlags,
  writeDrawRecord,
  writeMaterial,
  type MaterialData,
  type MeshStreams,
} from "../render/layout.ts";
import * as v3 from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { MeshData } from "./meshes.ts";
import type { FeatureTable, FeatureValue } from "../io/gltfTypes.ts";
import { featureName, featureProperties } from "../io/features.ts";
import type { RenderContext } from "./RenderContext.ts";

export interface WorldOptions {
  maxDraws?: number;
  maxMaterials?: number;
  vertexBytes?: number;
  indexBytes?: number;
}

export interface MeshHandle {
  readonly id: number;
  readonly firstIndex: number;
  readonly indexCount: number;
  readonly vertexCount: number;
  readonly streams: MeshStreams;
  /** Local feature IDs the mesh's vertices use (1 when it has none). */
  readonly featureCount: number;
  readonly topology: "triangle-list" | "line-list";
  /** Bounding sphere in mesh-local coordinates. */
  readonly center: readonly [number, number, number];
  readonly radius: number;
}

export interface TextureBinding {
  view: GPUTextureView;
  sampler: GPUSampler;
}

export interface TextureSetOptions {
  baseColor?: TextureBinding;
  metallicRoughness?: TextureBinding;
  normal?: TextureBinding;
  occlusion?: TextureBinding;
  emissive?: TextureBinding;
}

export type MaterialOptions = Partial<MaterialData>;

export interface DrawOptions {
  mesh: MeshHandle;
  origin: Vec3;
  model: Mat4;
  /** Bounding radius; computed from the mesh bounds and `model` when omitted. */
  radius?: number;
  /** Linear RGBA tint multiplied with the material base color. */
  color?: readonly [number, number, number, number];
  /** Skip lighting regardless of the material. */
  unlit?: boolean;
  /** Index from `addMaterial`; the default is a white, non-textured material. */
  material?: number;
  /** Index from `createTextureSet`; 0 binds the default 1×1 textures. */
  textureSet?: number;
  doubleSided?: boolean;
  /** Application-level name, returned by picking. */
  name?: string;
  /** Properties of the mesh's features, indexed by local feature ID. */
  features?: FeatureTable;
}

/** What a picked feature ID resolves to. */
export interface FeatureInfo {
  draw: DrawHandle;
  /** Feature ID local to the draw's mesh. */
  localId: number;
  name: string | undefined;
  properties?: Record<string, FeatureValue>;
}

export type SubmissionMode = "indirect" | "direct";

/** A registered draw. Mutations go through the world so it can track dirtiness. */
export interface DrawHandle {
  readonly index: number;
  readonly name: string | undefined;
}

interface Batch {
  index: number;
  mesh: MeshHandle;
  textureSet: number;
  doubleSided: boolean;
  records: number;
  instanceBase: number;
}

/**
 * Scene content shared by any number of views: a geometry arena (separate
 * attribute streams pulled by vertex shaders), a material table, texture
 * sets, and a table of draw records mirrored to the GPU.
 *
 * Records that share a mesh, material, texture set and cull mode form a
 * batch. Per view, the prep kernel culls records and compacts the visible
 * ones into their batch's slice of an instance list; the bundle then issues
 * one indirect draw per batch. The bundle is rebuilt only when draws are added.
 */
export class World {
  readonly maxDraws: number;
  readonly maxMaterials: number;
  private _submission: SubmissionMode = "indirect";
  private readonly vertexAllocator: RangeAllocator;
  private readonly indexAllocator: RangeAllocator;
  private readonly recordsF32: Float32Array;
  private readonly recordsU32: Uint32Array;
  private readonly materialsF32: Float32Array;
  private readonly materialsU32: Uint32Array;
  private materialCount = 0;
  private materialsDirty = false;
  private readonly textureSets: GPUBindGroup[] = [];
  private readonly batches = new Map<string, Batch>();
  private readonly batchList: Batch[] = [];
  private readonly names: Array<string | undefined> = [];
  private readonly featureTables: Array<FeatureTable | undefined> = [];
  /**
   * Global feature-ID ranges in allocation order (so sorted by first ID):
   * first ID and draw index, for resolving picks by binary search.
   */
  private readonly featureRangeFirst: number[] = [];
  private readonly featureRangeDraw: number[] = [];
  private readonly drawFeatureFirst: number[] = [];
  private nextFeatureId = 1;
  private readonly freeSlots: number[] = [];
  private nextMeshId = 0;
  private drawCount = 0;
  private dirtyMin = Number.POSITIVE_INFINITY;
  private dirtyMax = -1;
  private bundle?: GPURenderBundle;
  private readonly prepParamsData = new Uint32Array(4);
  private readonly prepPassDesc: GPUComputePassDescriptor = { label: "prep" };

  readonly vertexBuffer: GPUBuffer;
  readonly indexBuffer: GPUBuffer;
  readonly recordBuffer: GPUBuffer;
  readonly instanceBuffer: GPUBuffer;
  readonly materialBuffer: GPUBuffer;
  /** Visible record indices, compacted per batch by the prep kernel. */
  readonly instanceListBuffer: GPUBuffer;
  /** All record indices per batch, for "direct" submission. */
  private readonly directListBuffer: GPUBuffer;
  private readonly batchCountBuffer: GPUBuffer;
  private readonly batchBuffer: GPUBuffer;
  readonly indirectBuffer: GPUBuffer;
  private readonly prepParams: GPUBuffer;
  private readonly prepBindGroup: GPUBindGroup;
  private readonly drawBindGroup: GPUBindGroup;

  constructor(
    private readonly ctx: RenderContext,
    options: WorldOptions = {},
  ) {
    const device = ctx.device;
    this.maxDraws = options.maxDraws ?? 16384;
    this.maxMaterials = options.maxMaterials ?? 4096;
    const vertexBytes = options.vertexBytes ?? 64 * 1024 * 1024;
    const indexBytes = options.indexBytes ?? 32 * 1024 * 1024;
    this.vertexAllocator = new RangeAllocator(vertexBytes, 4);
    this.indexAllocator = new RangeAllocator(indexBytes, 4);

    const records = new ArrayBuffer(this.maxDraws * RECORD_SIZE);
    this.recordsF32 = new Float32Array(records);
    this.recordsU32 = new Uint32Array(records);
    const materials = new ArrayBuffer(this.maxMaterials * MATERIAL_SIZE);
    this.materialsF32 = new Float32Array(materials);
    this.materialsU32 = new Uint32Array(materials);

    const buffer = (label: string, size: number, usage: GPUBufferUsageFlags) =>
      device.createBuffer({ label: `world.${label}`, size, usage });
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.vertexBuffer = buffer("vertices", vertexBytes, storage);
    this.indexBuffer = buffer(
      "indices",
      indexBytes,
      GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    );
    this.recordBuffer = buffer("records", records.byteLength, storage);
    // COPY_SRC lets precision tests read back the prep kernel's output.
    this.instanceBuffer = buffer(
      "instances",
      this.maxDraws * INSTANCE_SIZE,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    );
    this.materialBuffer = buffer("materials", materials.byteLength, storage);
    this.instanceListBuffer = buffer(
      "instanceList",
      this.maxDraws * 4,
      GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
    );
    this.directListBuffer = buffer(
      "directList",
      this.maxDraws * 4,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );
    this.batchCountBuffer = buffer(
      "batchCounts",
      this.maxDraws * 4,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    );
    this.batchBuffer = buffer("batches", this.maxDraws * 16, storage);
    this.indirectBuffer = buffer(
      "indirect",
      this.maxDraws * INDIRECT_SIZE,
      GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT,
    );
    this.prepParams = buffer(
      "prepParams",
      16,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );

    this.prepBindGroup = device.createBindGroup({
      label: "world.prep",
      layout: ctx.pipelines.prepWorldLayout,
      entries: [
        this.recordBuffer,
        this.instanceBuffer,
        this.instanceListBuffer,
        this.batchCountBuffer,
        this.batchBuffer,
        this.indirectBuffer,
        this.prepParams,
      ].map((b, binding) => ({ binding, resource: { buffer: b } })),
    });
    this.drawBindGroup = device.createBindGroup({
      label: "world.draw",
      layout: ctx.pipelines.drawWorldLayout,
      entries: [
        this.recordBuffer,
        this.instanceBuffer,
        this.vertexBuffer,
        this.materialBuffer,
      ].map((b, binding) => ({ binding, resource: { buffer: b } })),
    });

    this.addMaterial({}); // material 0: white, lit, untextured
    this.createTextureSet({}); // texture set 0: defaults
  }

  /** Number of record slots in use, including hidden and freed-but-trailing slots. */
  get recordCount(): number {
    return this.drawCount;
  }

  /** Number of batches, i.e. indirect draw calls per view. */
  get batchCount(): number {
    return this.batchList.length;
  }

  /** Uploads geometry into the arena as separate attribute streams. */
  addMesh(mesh: MeshData): MeshHandle {
    const vertexCount = mesh.positions.length / 3;
    const queue = this.ctx.device.queue;
    const upload = (data: Float32Array | Uint32Array | undefined): number => {
      if (!data) {
        return NO_STREAM;
      }
      const offset = this.vertexAllocator.allocate(data.byteLength);
      if (offset === undefined) {
        throw new Error("World vertex arena is full.");
      }
      queue.writeBuffer(this.vertexBuffer, offset, data);
      return offset / 4;
    };
    const streams: MeshStreams = {
      position: upload(mesh.positions),
      normal: upload(mesh.normals),
      uv: upload(mesh.uvs),
      color: upload(mesh.colors),
      tangent: upload(mesh.tangents),
      featureId: upload(mesh.featureIds),
    };
    const indexOffset = this.indexAllocator.allocate(mesh.indices.byteLength);
    if (indexOffset === undefined) {
      throw new Error("World index arena is full.");
    }
    queue.writeBuffer(this.indexBuffer, indexOffset, mesh.indices);
    const { center, radius } = boundingSphere(mesh.positions);
    return {
      id: this.nextMeshId++,
      firstIndex: indexOffset / 4,
      indexCount: mesh.indices.length,
      vertexCount,
      streams,
      featureCount: mesh.featureIds ? (mesh.featureCount ?? 1) : 1,
      topology: mesh.topology ?? "triangle-list",
      center,
      radius,
    };
  }

  /** Adds a material to the table and returns its index. */
  addMaterial(options: MaterialOptions): number {
    const index = this.materialCount++;
    if (index >= this.maxMaterials) {
      throw new Error("World material table is full.");
    }
    writeMaterial(this.materialsF32, this.materialsU32, index, {
      baseColor: options.baseColor ?? [1, 1, 1, 1],
      emissive: options.emissive ?? [0, 0, 0],
      metallic: options.metallic ?? 0,
      roughness: options.roughness ?? 1,
      alphaCutoff: options.alphaCutoff ?? 0.5,
      normalScale: options.normalScale ?? 1,
      occlusionStrength: options.occlusionStrength ?? 1,
      flags: options.flags ?? 0,
    });
    this.materialsDirty = true;
    return index;
  }

  /** Binds up to five material textures; missing ones get 1×1 defaults. */
  createTextureSet(options: TextureSetOptions): number {
    const { defaults } = this.ctx;
    const slots = [
      options.baseColor,
      options.metallicRoughness,
      options.normal,
      options.occlusion,
      options.emissive,
    ];
    const entries: GPUBindGroupEntry[] = [];
    slots.forEach((slot, i) => {
      entries.push({ binding: i, resource: slot?.view ?? defaults.whiteView });
      entries.push({
        binding: 5 + i,
        resource: slot?.sampler ?? defaults.sampler,
      });
    });
    this.textureSets.push(
      this.ctx.device.createBindGroup({
        label: `world.textureSet${this.textureSets.length}`,
        layout: this.ctx.pipelines.textureSetLayout,
        entries,
      }),
    );
    return this.textureSets.length - 1;
  }

  addDraw(options: DrawOptions): DrawHandle {
    const index = this.freeSlots.pop() ?? this.drawCount++;
    if (index >= this.maxDraws) {
      throw new Error("World draw table is full.");
    }
    const material = options.material ?? 0;
    const textureSet = options.textureSet ?? 0;
    const doubleSided = options.doubleSided ?? false;
    const key = `${options.mesh.id}|${material}|${textureSet}|${doubleSided ? 1 : 0}`;
    let batch = this.batches.get(key);
    if (!batch) {
      batch = {
        index: this.batchList.length,
        mesh: options.mesh,
        textureSet,
        doubleSided,
        records: 0,
        instanceBase: 0,
      };
      this.batches.set(key, batch);
      this.batchList.push(batch);
    }
    batch.records++;

    const m = options.model;
    const mesh = options.mesh;
    const center = v3.vec3(
      m[0]! * mesh.center[0] +
        m[4]! * mesh.center[1] +
        m[8]! * mesh.center[2] +
        m[12]!,
      m[1]! * mesh.center[0] +
        m[5]! * mesh.center[1] +
        m[9]! * mesh.center[2] +
        m[13]!,
      m[2]! * mesh.center[0] +
        m[6]! * mesh.center[1] +
        m[10]! * mesh.center[2] +
        m[14]!,
    );
    const scale = Math.max(
      Math.hypot(m[0]!, m[1]!, m[2]!),
      Math.hypot(m[4]!, m[5]!, m[6]!),
      Math.hypot(m[8]!, m[9]!, m[10]!),
    );
    this.names[index] = options.name;
    this.featureTables[index] = options.features;
    const firstFeature = this.nextFeatureId;
    this.nextFeatureId += Math.max(1, mesh.featureCount);
    this.featureRangeFirst.push(firstFeature);
    this.featureRangeDraw.push(index);
    this.drawFeatureFirst[index] = firstFeature;
    writeDrawRecord(this.recordsF32, this.recordsU32, index, {
      origin: options.origin,
      model: options.model,
      center,
      radius: options.radius ?? mesh.radius * scale,
      color: options.color ?? [1, 1, 1, 1],
      indexCount: mesh.indexCount,
      firstIndex: mesh.firstIndex,
      streams: mesh.streams,
      materialIndex: material,
      textureSet,
      batch: batch.index,
      featureId: firstFeature,
      // Lines have no surface to light; 1.x draws them unlit too.
      flags:
        options.unlit || mesh.topology === "line-list" ? RecordFlags.unlit : 0,
    });
    this.markDirty(index);
    this.bundle = undefined;
    return { index, name: options.name };
  }

  removeDraw(handle: DrawHandle): void {
    this.recordsU32[handle.index * RECORD_WORDS + 7] = RecordFlags.hidden;
    this.names[handle.index] = undefined;
    this.featureTables[handle.index] = undefined;
    // The slot may be reused; its old feature range must not resolve to it.
    this.drawFeatureFirst[handle.index] = -1;
    this.freeSlots.push(handle.index);
    this.markDirty(handle.index);
  }

  setVisible(handle: DrawHandle, visible: boolean): void {
    const flagsIndex = handle.index * RECORD_WORDS + 7;
    const flags = this.recordsU32[flagsIndex]!;
    this.recordsU32[flagsIndex] = visible
      ? flags & ~RecordFlags.hidden
      : flags | RecordFlags.hidden;
    this.markDirty(handle.index);
  }

  /** Resolves a picked global feature ID to its draw, local ID and properties. */
  feature(featureId: number): FeatureInfo | undefined {
    const first = this.featureRangeFirst;
    if (featureId <= 0 || first.length === 0 || featureId < first[0]!) {
      return undefined;
    }
    let lo = 0;
    let hi = first.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (first[mid]! <= featureId) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    const index = this.featureRangeDraw[lo]!;
    if (this.drawFeatureFirst[index] !== first[lo]) {
      return undefined; // removed draw
    }
    const localId = featureId - first[lo]!;
    const table = this.featureTables[index];
    const draw = { index, name: this.names[index] };
    if (!table || localId >= table.count) {
      return { draw, localId, name: this.names[index] };
    }
    return {
      draw,
      localId,
      name: featureName(table, localId) ?? this.names[index],
      properties: featureProperties(table, localId),
    };
  }

  /** Uploads dirty records and materials and returns the current bundle. */
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
    if (this.materialsDirty) {
      queue.writeBuffer(
        this.materialBuffer,
        0,
        this.materialsF32.buffer,
        0,
        this.materialCount * MATERIAL_SIZE,
      );
      this.materialsDirty = false;
    }
    if (!this.bundle) {
      this.writeBatches();
      this.bundle = this.recordBundle();
    }
    this.prepParamsData[0] = this.drawCount;
    this.prepParamsData[1] = this.batchList.length;
    queue.writeBuffer(this.prepParams, 0, this.prepParamsData);
    return this.bundle;
  }

  /** Encodes this world's per-view prep: clear batch counts, cull, write args. */
  encodePrep(
    encoder: GPUCommandEncoder,
    timestampWrites?: GPUComputePassTimestampWrites,
  ): void {
    const { pipelines, currentViewBindGroup } = this.ctx;
    encoder.clearBuffer(
      this.batchCountBuffer,
      0,
      Math.max(4, this.batchList.length * 4),
    );
    this.prepPassDesc.timestampWrites = timestampWrites;
    const pass = encoder.beginComputePass(this.prepPassDesc);
    pass.setBindGroup(0, currentViewBindGroup);
    pass.setBindGroup(1, this.prepBindGroup);
    pass.setPipeline(pipelines.prep);
    pass.dispatchWorkgroups(Math.ceil(Math.max(this.drawCount, 1) / 64));
    pass.setPipeline(pipelines.prepArgs);
    pass.dispatchWorkgroups(Math.ceil(Math.max(this.batchList.length, 1) / 64));
    pass.end();
  }

  /**
   * How the bundle issues draws. "indirect" (default) takes per-view culling
   * from the prep kernel; "direct" bakes CPU-side draw arguments into the
   * bundle and draws everything — a baseline for measuring indirect overhead.
   */
  get submission(): SubmissionMode {
    return this._submission;
  }

  set submission(mode: SubmissionMode) {
    if (mode !== this._submission) {
      this._submission = mode;
      this.bundle = undefined;
    }
  }

  /** Assigns each batch its slice of the instance list and uploads the batch table. */
  private writeBatches(): void {
    const table = new Uint32Array(Math.max(1, this.batchList.length) * 4);
    const direct = new Uint32Array(Math.max(1, this.drawCount));
    const fill = new Uint32Array(this.batchList.length);
    let base = 0;
    for (const batch of this.batchList) {
      batch.instanceBase = base;
      const o = batch.index * 4;
      table[o] = base;
      table[o + 1] = batch.mesh.indexCount;
      table[o + 2] = batch.mesh.firstIndex;
      base += batch.records;
    }
    for (let i = 0; i < this.drawCount; i++) {
      const b = this.recordsU32[i * RECORD_WORDS + 35]!;
      const batch = this.batchList[b]!;
      direct[batch.instanceBase + fill[b]!++] = i;
    }
    const queue = this.ctx.device.queue;
    queue.writeBuffer(this.batchBuffer, 0, table);
    queue.writeBuffer(this.directListBuffer, 0, direct);
  }

  /** One draw per batch, grouped by cull mode and texture set. */
  private recordBundle(): GPURenderBundle {
    const { device, pipelines, targets, currentViewBindGroup } = this.ctx;
    const encoder = device.createRenderBundleEncoder({
      label: "world.bundle",
      colorFormats: targets.colorFormats,
      depthStencilFormat: targets.depthFormat,
      sampleCount: targets.sampleCount,
    });
    encoder.setBindGroup(0, currentViewBindGroup);
    encoder.setBindGroup(1, this.drawBindGroup);
    encoder.setIndexBuffer(this.indexBuffer, "uint32");
    const pipelineOf = (batch: Batch) =>
      batch.mesh.topology === "line-list"
        ? pipelines.opaqueLines
        : batch.doubleSided
          ? pipelines.opaqueDoubleSided
          : pipelines.opaque;
    const rank = (batch: Batch) =>
      batch.mesh.topology === "line-list" ? 2 : Number(batch.doubleSided);
    const order = [...this.batchList].sort(
      (a, b) => rank(a) - rank(b) || a.textureSet - b.textureSet,
    );
    const direct = this._submission === "direct";
    const list = direct ? this.directListBuffer : this.instanceListBuffer;
    let pipeline: GPURenderPipeline | undefined;
    let textureSet = -1;
    for (const batch of order) {
      const wanted = pipelineOf(batch);
      if (wanted !== pipeline) {
        pipeline = wanted;
        encoder.setPipeline(pipeline);
      }
      if (batch.textureSet !== textureSet) {
        textureSet = batch.textureSet;
        encoder.setBindGroup(2, this.textureSets[textureSet]!);
      }
      encoder.setVertexBuffer(0, list, batch.instanceBase * 4);
      if (direct) {
        encoder.drawIndexed(
          batch.mesh.indexCount,
          batch.records,
          batch.mesh.firstIndex,
          0,
          0,
        );
      } else {
        encoder.drawIndexedIndirect(
          this.indirectBuffer,
          batch.index * INDIRECT_SIZE,
        );
      }
    }
    return encoder.finish();
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
      this.materialBuffer,
      this.instanceListBuffer,
      this.directListBuffer,
      this.batchCountBuffer,
      this.batchBuffer,
      this.indirectBuffer,
      this.prepParams,
    ]) {
      buffer.destroy();
    }
  }
}

/** Ritter-style bounding sphere around the AABB center, tightened by a pass. */
function boundingSphere(positions: Float32Array): {
  center: [number, number, number];
  radius: number;
} {
  if (positions.length === 0) {
    return { center: [0, 0, 0], radius: 0 };
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const v = positions[i + c]!;
      min[c] = Math.min(min[c]!, v);
      max[c] = Math.max(max[c]!, v);
    }
  }
  const center: [number, number, number] = [
    (min[0]! + max[0]!) / 2,
    (min[1]! + max[1]!) / 2,
    (min[2]! + max[2]!) / 2,
  ];
  let r2 = 0;
  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i]! - center[0];
    const dy = positions[i + 1]! - center[1];
    const dz = positions[i + 2]! - center[2];
    r2 = Math.max(r2, dx * dx + dy * dy + dz * dz);
  }
  return { center, radius: Math.sqrt(r2) };
}
