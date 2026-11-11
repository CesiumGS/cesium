import pointsWgsl from "../shaders/generated/points.wgsl?raw";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import * as m4 from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Engine } from "../scene/Engine.ts";
import type { HeightCapture } from "../scene/heightCaptures.ts";
import type { MeshData } from "../scene/meshes.ts";
import type { World } from "../scene/World.ts";
import type {
  AnchorHandle,
  DrawHandle,
  MeshHandle,
  PointMesh,
} from "../scene/world/types.ts";
import { contentAnchor } from "../scene/earthAnchor.ts";

/**
 * A property's type: a number (f32), an integer (u32), a vector, or one of
 * a fixed list of names (`enum`, stored as its index; styles compare it
 * with the names, as they read `EXT_structural_metadata` enums).
 */
export type PointPropertyType =
  "f32" | "u32" | "vec2f" | "vec3f" | "vec4f" | { enum: readonly string[] };

/** Where a property is in a point's words (`PointSource.layout`). */
export interface PointProperty {
  offset: number;
  components: number;
  type: PointPropertyType;
}

export interface PointSourceOptions {
  /** Points it holds (their GPU memory is made up front). */
  capacity: number;
  /**
   * Origin of its frame (east, north, up), in `anchor`'s coordinates
   * (Earth-fixed under the Earth's): positions are meters in it, so
   * float32 keeps centimeters within a few hundred kilometers.
   */
  origin: Vec3;
  /**
   * The anchor its points hang under (`World.addAnchor`,
   * `World.bodyAnchor`; default the Earth's). Its layers' draws, model
   * pools and ground capture follow it.
   */
  anchor?: AnchorHandle;
  /** Per-point properties styles read (`${name}`), besides `heading`. */
  properties?: Record<string, PointPropertyType>;
  /**
   * Seconds points are shown behind the clock, moving between their last
   * two samples (default 0: each shown at its latest sample). A feed's
   * interval between a point's updates.
   */
  delay?: number;
  /**
   * Clamp to the ground (terrain, 3D Tiles: what the world draws, as its
   * first view selected it) over a square around `origin` (`halfExtent`
   * meters each way), captured from above each frame in a `size`² depth
   * texture (default 2,048) from `top` down to `bottom` (m; defaults 9,000
   * and −1,000). Samples' z is then the height above the ground.
   */
  clamp?: { halfExtent: number; size?: number; top?: number; bottom?: number };
  /** The clock (seconds; default the engine's, `Engine.time`). */
  clock?: () => number;
  /**
   * Under a warped anchor (a rig on a warp frame) its points' positions go
   * through the route: fitted over a sphere of this radius (m, default
   * 50,000) around `origin`, to `warpTolerance` (m, default 0.05). A point
   * farther than the radius from `origin` is carried by the fit's
   * extrapolation, which grows less exact with distance.
   */
  warpRadius?: number;
  warpTolerance?: number;
}

/** The fit's default region around a source's origin, m. */
const WARP_RADIUS = 50_000;
/** The fit's default tolerance, m. */
const WARP_TOLERANCE = 0.05;

/** Words per point in the state buffer (points.slang `State`). */
const STATE_WORDS = 12;
const COMPONENTS = { f32: 1, u32: 1, vec2f: 2, vec3f: 3, vec4f: 4 } as const;

const pipelines = new WeakMap<
  GPUDevice,
  {
    place: GPUComputePipeline;
    apply: GPUComputePipeline;
    /** The frame kernel's group 1: the world's placements (placement.slang). */
    placements: GPUBindGroupLayout;
  }
>();

/** A one-triangle mesh: what the carrier draw needs to be a draw. */
const CARRIER: MeshData = {
  positions: Float32Array.of(0, 0, 0, 1, 0, 0, 0, 1, 0),
  indices: Uint32Array.of(0, 1, 2),
};

/** A dispatch of `n` threads in rows of at most 65,535 groups of 64. */
export function dispatchSize(n: number): {
  x: number;
  y: number;
  threads: number;
} {
  const groups = Math.max(1, Math.ceil(n / 64));
  const x = Math.min(groups, 65535);
  return { x, y: Math.ceil(groups / x), threads: x * 64 };
}

/**
 * Live points (plan §13.11, vector sources): many moving features as GPU
 * data, not objects, drawn by styled layers (`VectorLayer`). A feed's
 * update (`update`) is one copy of a typed array, four numbers per point;
 * a kernel applies it, and each frame another moves every point between
 * its last two samples, clamps it to the ground and writes its anchor in
 * the world's vertex arena, where layers' draws pull it six vertices per
 * point (`World.addPointMesh`). Properties (`setProperties`) sit beside
 * the anchors as streams the styles read; `heading` is written each frame.
 * No CPU work per point per frame, and no per-point instance rows.
 *
 * Under a warped anchor the same kernel carries each point through the
 * route (plan 13.26, increment 4): the source owns a hidden carrier draw,
 * which the world's warps fit like any draw over a sphere around `origin`,
 * and the kernel evaluates that fit's lattice at the point's position
 * before writing the anchor. Layers' draws and model pools, which read the
 * anchors, need nothing. Until the first fit lands the points are hidden.
 */
export class PointSource {
  readonly capacity: number;
  /** The point mesh layers draw. */
  readonly mesh: PointMesh;
  readonly origin: Vec3;
  /** The anchor its points hang under (`PointSourceOptions.anchor`). */
  readonly anchor: AnchorHandle;
  /** East, north, up at the origin, in its anchor's coordinates (float64). */
  readonly frame: m4.Mat4;
  /** Each property's place in a point's words, `heading` included. */
  readonly layout: Readonly<Record<string, PointProperty>>;
  /** Words per point in `setProperties` data. */
  readonly stride: number;
  /** The ground captured from above (`clamp`), if clamped. */
  readonly heights: HeightCapture | undefined;
  /** Seconds points are shown behind the clock (`PointSourceOptions.delay`). */
  delay: number;
  private count_ = 0;
  private readonly clock: () => number;
  private readonly stateBuffer: GPUBuffer;
  private readonly params: GPUBuffer;
  private readonly paramsData = new ArrayBuffer(64);
  private readonly updateParams: GPUBuffer;
  private readonly updateData = new ArrayBuffer(32);
  private incoming?: GPUBuffer;
  private incomingGroup?: GPUBindGroup;
  /** Rebuilt when the world's tables or slabs are replaced (`groupFor`). */
  private group: GPUBindGroup;
  private groupGeneration: number;
  /** The world's placements buffer as the kernel's group 1 was made for it (`placementGroup`). */
  private placementsBound: GPUBuffer | undefined;
  private placementsGroup: GPUBindGroup | undefined;
  /** @internal The hidden draw whose warp fit the frame kernel evaluates. */
  readonly carrier: DrawHandle;
  private readonly carrierMesh: MeshHandle;
  private readonly noHeights: GPUTexture | undefined;
  private readonly kernels: {
    place: GPUComputePipeline;
    apply: GPUComputePipeline;
    placements: GPUBindGroupLayout;
  };
  private readonly removeHook: () => void;
  private destroyed = false;

  constructor(
    private readonly engine: Engine,
    readonly world: World,
    options: PointSourceOptions,
  ) {
    const { device } = engine.gpu;
    const capacity = (this.capacity = options.capacity);
    this.anchor = contentAnchor(world, options.anchor, "PointSource");
    this.origin = options.origin;
    this.clock = options.clock ?? (() => engine.time);
    this.delay = options.delay ?? 0;
    this.frame = eastNorthUpToFixedFrame(
      options.origin,
      Ellipsoid.WGS84,
      m4.mat4(),
    );
    // Properties, then the heading the frame kernel writes.
    const layout: Record<string, PointProperty> = {};
    let stride = 0;
    for (const [name, type] of Object.entries(options.properties ?? {})) {
      if (name === "heading") {
        throw new Error("PointSource: `heading` is the source's own property");
      }
      const components = typeof type === "string" ? COMPONENTS[type] : 1;
      layout[name] = { offset: stride, components, type };
      stride += components;
    }
    layout.heading = { offset: stride, components: 1, type: "f32" };
    stride += 1;
    this.layout = layout;
    this.stride = stride;
    this.mesh = world.addPointMesh(capacity, {
      stride,
      layout: Object.fromEntries(
        Object.entries(layout).map(([name, p]) => [
          name,
          { offset: p.offset, components: p.components },
        ]),
      ),
    });

    this.stateBuffer = device.createBuffer({
      label: "points.state",
      size: Math.max(16, capacity * STATE_WORDS * 4),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const clamp = options.clamp;
    if (clamp) {
      this.heights = engine.addHeightCapture(world, {
        origin: options.origin,
        anchor: this.anchor,
        halfExtent: clamp.halfExtent,
        ...(clamp.size !== undefined ? { size: clamp.size } : {}),
        ...(clamp.top !== undefined ? { top: clamp.top } : {}),
        ...(clamp.bottom !== undefined ? { bottom: clamp.bottom } : {}),
      });
    } else {
      this.noHeights = device.createTexture({
        label: "points.noHeights",
        size: [1, 1],
        format: "depth32float",
        usage:
          GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    this.params = device.createBuffer({
      label: "points.params",
      size: this.paramsData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.updateParams = device.createBuffer({
      label: "points.update",
      size: this.updateData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    let kernels = pipelines.get(device);
    if (!kernels) {
      const module = device.createShaderModule({
        label: "points",
        code: pointsWgsl,
      });
      const layout0 = device.createBindGroupLayout({
        label: "points.state",
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "uniform" },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
          },
          {
            binding: 3,
            visibility: GPUShaderStage.COMPUTE,
            texture: { sampleType: "depth" },
          },
        ],
      });
      const layout1 = device.createBindGroupLayout({
        label: "points.samples",
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "uniform" },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "read-only-storage" },
          },
        ],
      });
      // The world's placements (placement.slang's binding 7 of group 1).
      const layoutPlacements = device.createBindGroupLayout({
        label: "points.placements",
        entries: [
          {
            binding: 7,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "read-only-storage" },
          },
        ],
      });
      const placeLayout = device.createPipelineLayout({
        bindGroupLayouts: [layout0, layoutPlacements],
      });
      const applyLayout = device.createPipelineLayout({
        bindGroupLayouts: [layout0, layout1],
      });
      kernels = {
        place: device.createComputePipeline({
          label: "points.place",
          layout: placeLayout,
          compute: { module, entryPoint: "placePoints" },
        }),
        apply: device.createComputePipeline({
          label: "points.apply",
          layout: applyLayout,
          compute: { module, entryPoint: "applySamples" },
        }),
        placements: layoutPlacements,
      };
      pipelines.set(device, kernels);
    }
    this.kernels = kernels;
    // The carrier: a draw that is never drawn (no views), under the source's
    // anchor in the source's frame, for the world's warps to fit.
    const rotation = m4.copy(m4.mat4(), this.frame);
    rotation[12] = rotation[13] = rotation[14] = 0;
    this.carrierMesh = world.addMesh(CARRIER);
    this.carrier = world.addDraw({
      mesh: this.carrierMesh,
      parent: this.anchor,
      origin: options.origin,
      model: rotation,
      radius: options.warpRadius ?? WARP_RADIUS,
      viewMask: 0,
      ground: false,
      name: "point source carrier",
    });
    world.setDrawGeometricError(
      this.carrier,
      (options.warpTolerance ?? WARP_TOLERANCE) * 64,
    );
    world.warps.markSourced(this.mesh);
    this.groupGeneration = world.tableGeneration;
    this.group = this.createGroup();
    this.removeHook = world.addFrameCompute((pass) => this.place(pass));
  }

  /**
   * The kernels' group: its points' slab (the anchors it writes) is bound
   * by buffer, so a grown slab (World.tableGeneration) means a new group.
   */
  private createGroup(): GPUBindGroup {
    return this.engine.gpu.device.createBindGroup({
      label: "points",
      layout: this.kernels.place.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.params } },
        { binding: 1, resource: { buffer: this.stateBuffer } },
        {
          binding: 2,
          resource: { buffer: this.world.vertexBufferOf(this.mesh) },
        },
        {
          binding: 3,
          resource: (this.heights?.texture ?? this.noHeights!).createView(),
        },
      ],
    });
  }

  /** The kernel's group 1: the world's placements, rebuilt when the buffer grew. */
  private placementGroup(): GPUBindGroup {
    const buffer = this.world.placementBuffer;
    if (this.placementsBound !== buffer || !this.placementsGroup) {
      this.placementsBound = buffer;
      this.placementsGroup = this.engine.gpu.device.createBindGroup({
        label: "points.placements",
        layout: this.kernels.placements,
        entries: [{ binding: 7, resource: { buffer } }],
      });
    }
    return this.placementsGroup;
  }

  private currentGroup(): GPUBindGroup {
    if (this.world.tableGeneration !== this.groupGeneration) {
      this.groupGeneration = this.world.tableGeneration;
      this.group = this.createGroup();
    }
    return this.group;
  }

  /** Points shown: the first `count` (the rest are hidden). */
  get count(): number {
    return this.count_;
  }
  set count(n: number) {
    this.count_ = Math.max(0, Math.min(this.capacity, Math.floor(n)));
    this.engine.requestRender();
  }

  /** The frame kernel: every point at the clock, written as its anchor. */
  private place(pass: GPUComputePassEncoder): void {
    const { x, y, threads } = dispatchSize(this.capacity);
    const u32 = new Uint32Array(this.paramsData);
    const f32 = new Float32Array(this.paramsData);
    const p = this.mesh.points;
    f32[0] = this.clock();
    f32[1] = this.delay;
    u32[2] = this.count_;
    u32[3] = this.capacity;
    u32[4] = p.anchors;
    u32[5] = p.streams;
    u32[6] = p.stride;
    u32[7] = this.layout.heading!.offset;
    u32[8] = this.heights ? 1 : 0;
    f32[9] = this.heights?.halfExtent ?? 1;
    f32[10] = this.heights?.top ?? 0;
    f32[11] = this.heights?.bottom ?? 0;
    u32[12] = threads;
    const placed = this.world.placementOf(this.carrier);
    u32[13] = placed.row;
    u32[14] = placed.held ? 1 : 0;
    this.engine.gpu.device.queue.writeBuffer(this.params, 0, this.paramsData);
    pass.setPipeline(this.kernels.place);
    pass.setBindGroup(0, this.currentGroup());
    pass.setBindGroup(1, this.placementGroup());
    pass.dispatchWorkgroups(x, y);
  }

  /**
   * A feed update: points `first` on take new samples, 4 floats each (x,
   * y, z in the source's frame, m, z above the ground when clamped; and
   * heading, degrees clockwise from north, a feed's course), stamped with
   * the clock. Each moves from where it is shown now to its new sample over
   * the next `delay`. One copy to the GPU and one dispatch; no CPU work per
   * point.
   */
  update(first: number, samples: Float32Array): void {
    const n = samples.length / 4;
    if (first < 0 || first + n > this.capacity || !Number.isInteger(n)) {
      throw new RangeError(`PointSource.update: ${n} points from ${first}`);
    }
    if (n === 0 || this.destroyed) {
      return;
    }
    const { device } = this.engine.gpu;
    if (!this.incoming || this.incoming.size < samples.byteLength) {
      this.incoming?.destroy();
      this.incoming = device.createBuffer({
        label: "points.samples",
        size: Math.max(16, samples.byteLength),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this.incomingGroup = device.createBindGroup({
        label: "points.samples",
        layout: this.kernels.apply.getBindGroupLayout(1),
        entries: [
          { binding: 0, resource: { buffer: this.updateParams } },
          { binding: 1, resource: { buffer: this.incoming } },
        ],
      });
    }
    const { x, y, threads } = dispatchSize(n);
    const u32 = new Uint32Array(this.updateData);
    const f32 = new Float32Array(this.updateData);
    u32[0] = first;
    u32[1] = n;
    f32[2] = this.clock();
    f32[3] = this.delay;
    u32[4] = threads;
    // Queue order: these writes land before the dispatch, and before the
    // next update's writes to the same buffers.
    device.queue.writeBuffer(this.updateParams, 0, this.updateData);
    device.queue.writeBuffer(
      this.incoming,
      0,
      samples.buffer,
      samples.byteOffset,
      samples.byteLength,
    );
    const encoder = device.createCommandEncoder({ label: "points.update" });
    const pass = encoder.beginComputePass({ label: "points.apply" });
    pass.setPipeline(this.kernels.apply);
    pass.setBindGroup(0, this.currentGroup());
    pass.setBindGroup(1, this.incomingGroup!);
    pass.dispatchWorkgroups(x, y);
    pass.end();
    device.queue.submit([encoder.finish()]);
    this.engine.requestRender();
  }

  /**
   * Properties of points `first` on, `stride` words each in `layout` order
   * (`packProperties` builds them by name). `heading` is the source's.
   */
  setProperties(first: number, data: Float32Array | Uint32Array): void {
    const n = data.length / this.stride;
    if (first < 0 || first + n > this.capacity || !Number.isInteger(n)) {
      throw new RangeError(
        `PointSource.setProperties: ${n} points from ${first}`,
      );
    }
    this.world.setPointProperties(this.mesh, first, data);
    this.engine.requestRender();
  }

  /**
   * Properties by name as `setProperties` data for `n` points: numbers per
   * component, an enum's names or indexes. Missing properties are 0.
   */
  packProperties(
    n: number,
    values: Record<string, ArrayLike<number> | readonly string[]>,
  ): Float32Array {
    const out = new Float32Array(n * this.stride);
    const words = new Uint32Array(out.buffer);
    for (const [name, column] of Object.entries(values)) {
      const p = this.layout[name];
      if (!p || name === "heading") {
        throw new Error(`PointSource.packProperties: no property ${name}`);
      }
      const type = p.type;
      for (let i = 0; i < n; i++) {
        for (let c = 0; c < p.components; c++) {
          const v = column[i * p.components + c]!;
          const at = i * this.stride + p.offset + c;
          if (typeof type === "object") {
            words[at] =
              typeof v === "string" ? Math.max(0, type.enum.indexOf(v)) : v;
          } else if (type === "u32") {
            words[at] = v as number;
          } else {
            out[at] = v as number;
          }
        }
      }
    }
    return out;
  }

  /** Removes the point mesh's arena ranges and frees the buffers. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.removeHook();
    this.world.removeDraw(this.carrier);
    this.world.removeMesh(this.carrierMesh);
    this.world.removeMesh(this.mesh);
    this.stateBuffer.destroy();
    this.params.destroy();
    this.updateParams.destroy();
    this.incoming?.destroy();
    if (this.heights) {
      this.engine.removeHeightCapture(this.heights);
    }
    this.noHeights?.destroy();
  }
}
