import { RangeAllocator } from "../gpu/RangeAllocator.ts";
import {
  INDIRECT_SIZE,
  INSTANCE_WORDS,
  INSTANCE_COUNT_WORD,
  INSTANCE_FIRST_WORD,
  MATERIAL_SIZE,
  NO_FEATURE,
  NO_RECORD,
  NO_STREAM,
  attributeHash,
  metadataKey,
  DRAW_ITEM_SIZE,
  RECORD_WORDS,
  TRANSFORM_WORDS,
  TRANSFORM_WORD,
  FLAGS_WORD,
  VIEW_MASK_WORD,
  IMAGERY_SLICE_WORD,
  LIGHTS_SLICE_WORD,
  ALL_VIEWS,
  CLIP_BLOCK_WORD,
  CLIP_BOXES,
  CLIP_BOX_FLOATS,
  CLIP_COUNT_WORD,
  MATERIAL_WORDS,
  PLACEHOLDER_MASK_WORD,
  MaterialFlags,
  RecordFlags,
  packTint,
  writeDrawRecord,
  writeInstance,
  writeMaterial,
  writeTransform,
  type MaterialData,
  type MeshStreams,
} from "../render/layout.ts";
import { splitVec3 } from "../math/transforms.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { MeshData } from "./meshes.ts";
import type { FeatureTable, FeatureValue } from "../io/gltfTypes.ts";
import { featureName, featureProperties } from "../io/features.ts";
import type { RenderContext, SurfaceKey } from "./RenderContext.ts";
import type { CustomShader } from "./CustomShader.ts";
import type { LightHandle, LightOptions } from "./lights.ts";

export interface WorldOptions {
  maxDraws?: number;
  maxMaterials?: number;
  vertexBytes?: number;
  indexBytes?: number;
  /** Mixed-LOD clip blocks (placeholder tiles drawn at once; default 2048). */
  maxClipBlocks?: number;
  /** Transform table entries (default: `maxDraws`). */
  maxTransforms?: number;
  /** Instance table entries, shared by all instanced draws (default 16384). */
  maxInstances?: number;
}

/**
 * An oriented box in Earth-fixed coordinates: `rows` (3×3, row-major) maps an
 * offset from `center` to box coordinates, inside when all lie in [-1, 1].
 */
export interface ClipBox {
  center: ArrayLike<number>;
  rows: ArrayLike<number>;
}

/** Clip boxes on the GPU, shared by the draws of one placeholder tile. */
export interface ClipHandle {
  readonly block: number;
  readonly count: number;
}

export interface Usage {
  used: number;
  capacity: number;
}

export interface WorldMemory {
  vertexBytes: Usage;
  indexBytes: Usage;
  draws: Usage;
  transforms: Usage;
  instances: Usage;
  materials: Usage;
  batches: number;
  /** Fixed-size GPU tables: records, transforms, instances, materials, lists, args. */
  tableBytes: number;
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
  /**
   * Where the draw is (`addTransform`), shared with other draws. Without
   * it, `origin` and `model` place the draw and it owns its transform.
   */
  transform?: TransformHandle;
  /** Float64 Earth-fixed origin of `model` (without `transform`). */
  origin?: Vec3;
  /** Rotation, scale and small offsets relative to `origin`. */
  model?: Mat4;
  /**
   * Bounding radius in meters (Earth-fixed), per instance when instanced;
   * from the mesh bounds when omitted.
   */
  radius?: number;
  /** Draws the mesh once per instance (culled per instance on the GPU). */
  instances?: InstanceOptions;
  /** Linear RGBA tint multiplied with the material base color. */
  color?: readonly [number, number, number, number];
  /** Skip lighting regardless of the material. */
  unlit?: boolean;
  /** Ray casts may hit it (`castRays` with `collisionOnly`). */
  collision?: boolean;
  /** Drawn behind all other content (`RecordFlags.underlay`). */
  underlay?: boolean;
  /** Index from `addMaterial`; the default is a white, non-textured material. */
  material?: number;
  /** Index from `createTextureSet`; 0 binds the default 1×1 textures. */
  textureSet?: number;
  doubleSided?: boolean;
  /**
   * Its shader stages (`CustomShader`); the engine's by default. Draws
   * batch by shader; until its pipelines compile the draw uses the
   * engine's.
   */
  shader?: CustomShader;
  /** Application-level name, returned by picking. */
  name?: string;
  /** Properties of the mesh's features, indexed by local feature ID. */
  features?: FeatureTable;
  /** Views that draw it, one bit per view (`Engine.viewBit`); default all. */
  viewMask?: number;
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

/**
 * Instances of a draw: each draws the mesh with its own matrix, relative to
 * the draw's transform (instances of one model sit within kilometers of
 * it, so float32 suffices).
 */
export interface InstanceOptions {
  /** Column-major 4×4 affine matrices, 16 numbers per instance. */
  matrices: ArrayLike<number>;
  /** Local feature ID per instance (picking and styling per instance). */
  featureIds?: ArrayLike<number>;
  /** Linear RGBA tint per instance, 4 numbers each (stored as 8 bits). */
  tints?: ArrayLike<number>;
  /**
   * Per-instance data for custom shaders: `stride` 32-bit words per
   * instance, uploaded to the arena and read by instance index the way
   * vertex streams are (`DrawRecord.instanceStreams`).
   */
  streams?: { data: Float32Array | Uint32Array; stride: number };
}

/**
 * A registered draw. Mutations go through the world so it can track
 * dirtiness. Slots are reused: the generation makes a handle to a removed
 * draw inert instead of pointing at whatever took its slot.
 */
export interface DrawHandle {
  readonly index: number;
  readonly generation: number;
  readonly name: string | undefined;
}

/** A ray for `World.castRays`. */
export interface CastRay {
  /** Float64 Earth-fixed origin. */
  origin: ArrayLike<number>;
  /** Unit direction, Earth-fixed axes. */
  direction: ArrayLike<number>;
  /** Hits beyond it are ignored (meters). */
  maxDistance: number;
}

export interface CastOptions {
  /** Only draws marked `collision` (tilesets with `enableCollision`). */
  collisionOnly?: boolean;
  /** Only draws some of these views draw (default: any). */
  viewMask?: number;
  /**
   * Only these draws, drawn or not (content loaded for a query); the view
   * mask is not checked.
   */
  draws?: readonly DrawHandle[];
}

/** A placement in the world's transform table (`addTransform`). */
export interface TransformHandle {
  readonly index: number;
  readonly generation: number;
}

interface Batch {
  index: number;
  /** Key in `batches`; empty when the batch is free for reuse. */
  key: string;
  mesh: MeshHandle;
  textureSet: number;
  /** Its material's index (shadow casters: cut out or not). */
  material: number;
  doubleSided: boolean;
  /** Its custom shader; undefined: the engine's. */
  shader: CustomShader | undefined;
  /** Draw items: records without instances plus instances. */
  items: number;
  itemBase: number;
}

/**
 * A CPU table mirrored to a GPU storage buffer. Changed entries upload once
 * per frame: a contiguous run with one write, entries spread across the
 * table as packed (index, data) pairs that a compute pass scatters
 * (`scatter.wgsl`), instead of the whole span between them. The GPU buffer
 * holds the full capacity; the CPU rows grow as entries are used
 * (`reserve`).
 */
class MirroredTable {
  f32: Float32Array;
  u32: Uint32Array;
  readonly buffer: GPUBuffer;
  private flags: Uint8Array;
  private readonly dirty: number[] = [];
  private readonly params: GPUBuffer;
  private readonly paramsData = new Uint32Array(4);
  private staging?: GPUBuffer;
  private scratch = new Uint32Array(0);
  private bindGroup?: GPUBindGroup;

  constructor(
    private readonly ctx: RenderContext,
    label: string,
    readonly words: number,
    readonly capacity: number,
  ) {
    const rows = Math.min(capacity, INITIAL_ROWS);
    const data = new ArrayBuffer(rows * words * 4);
    this.f32 = new Float32Array(data);
    this.u32 = new Uint32Array(data);
    this.flags = new Uint8Array(rows);
    this.buffer = ctx.device.createBuffer({
      label: `world.${label}`,
      size: capacity * words * 4,
      // COPY_SRC: tests compare the GPU copy with the CPU table.
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    this.params = ctx.device.createBuffer({
      label: `world.${label}.scatter`,
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.paramsData[1] = words;
  }

  /** Rows on the CPU. */
  get rows(): number {
    return this.flags.length;
  }

  /**
   * Room for rows below `count` on the CPU (doubling, up to the capacity);
   * true when `f32` and `u32` were replaced.
   */
  reserve(count: number): boolean {
    if (count <= this.rows) {
      return false;
    }
    const rows = grownSize(this.rows, count, this.capacity);
    const data = new ArrayBuffer(rows * this.words * 4);
    new Uint32Array(data).set(this.u32);
    this.f32 = new Float32Array(data);
    this.u32 = new Uint32Array(data);
    this.flags = resized(this.flags, rows);
    return true;
  }

  mark(index: number): void {
    if (this.flags[index] === 0) {
      this.flags[index] = 1;
      this.dirty.push(index);
    }
  }

  /** Uploads the changes; a scatter is encoded into `pass`. */
  upload(pass: GPUComputePassEncoder): void {
    const n = this.dirty.length;
    if (n === 0) {
      return;
    }
    const queue = this.ctx.device.queue;
    const bytes = this.words * 4;
    let min = Number.POSITIVE_INFINITY;
    let max = -1;
    for (const i of this.dirty) {
      min = Math.min(min, i);
      max = Math.max(max, i);
      this.flags[i] = 0;
    }
    const span = max - min + 1;
    if (span <= 2 * n + 16) {
      queue.writeBuffer(
        this.buffer,
        min * bytes,
        this.f32.buffer,
        min * bytes,
        span * bytes,
      );
      this.dirty.length = 0;
      return;
    }
    const total = n * (1 + this.words);
    if (this.scratch.length < total) {
      const size = 1 << Math.ceil(Math.log2(total));
      this.scratch = new Uint32Array(size);
      this.staging?.destroy();
      this.staging = this.ctx.device.createBuffer({
        label: "world.scatter.staging",
        size: size * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this.bindGroup = this.ctx.device.createBindGroup({
        label: "world.scatter",
        layout: this.ctx.pipelines.scatterLayout,
        entries: [
          { binding: 0, resource: { buffer: this.params } },
          { binding: 1, resource: { buffer: this.staging } },
          { binding: 2, resource: { buffer: this.buffer } },
        ],
      });
    }
    const out = this.scratch;
    for (let k = 0; k < n; k++) {
      const i = this.dirty[k]!;
      out[k] = i;
      out.set(
        this.u32.subarray(i * this.words, (i + 1) * this.words),
        n + k * this.words,
      );
    }
    this.dirty.length = 0;
    queue.writeBuffer(this.staging!, 0, out.buffer, 0, total * 4);
    this.paramsData[0] = n;
    queue.writeBuffer(this.params, 0, this.paramsData);
    pass.setPipeline(this.ctx.pipelines.scatter);
    pass.setBindGroup(0, this.bindGroup!);
    pass.dispatchWorkgroups(Math.ceil((n * this.words) / 64));
  }

  destroy(): void {
    this.buffer.destroy();
    this.params.destroy();
    this.staging?.destroy();
  }
}

/**
 * Scene content shared by any number of views: a geometry arena (separate
 * attribute streams pulled by vertex shaders), a material table, texture
 * sets, and a table of draw records mirrored to the GPU.
 *
 * Records that share a mesh, material, texture set and cull mode form a
 * batch. Per view, the cull kernels cull records and compacts the visible
 * ones into their batch's slice of an instance list; the bundle then issues
 * one indirect draw per batch. The bundle is rebuilt only when draws are added.
 */
export class World {
  private static nextId = 1;
  /** Stable identity (indexes in lists shift as worlds come and go). */
  readonly id = World.nextId++;
  readonly maxDraws: number;
  readonly maxTransforms: number;
  readonly maxInstances: number;
  readonly maxMaterials: number;
  private _submission: SubmissionMode = "indirect";
  private readonly vertexAllocator: RangeAllocator;
  private readonly indexAllocator: RangeAllocator;
  // Per-slot CPU tables (records, transforms, instances, materials) start
  // small and grow as slots are used; the GPU tables are full size (a
  // 65536-draw world's CPU tables held 37 MB on NYC, r39).
  private readonly records: MirroredTable;
  private recordsF32: Float32Array;
  private recordsU32: Uint32Array;
  /** Generation per draw slot (`DrawHandle.generation`). */
  private drawGeneration: Uint32Array;
  /** Transform a draw owns (placed by origin and model), or -1. */
  private drawOwnedTransform: Int32Array;
  /** Per-instance stream ranges in the vertex arena, by draw slot. */
  private readonly instanceStreamRanges: Array<[number, number] | undefined> =
    [];

  // The transform table: float64 local and world matrices on the CPU,
  // composed parents first; GPU entries mirror the world matrices.
  private readonly transforms: MirroredTable;
  private transformLocal: Float64Array;
  private transformWorld: Float64Array;
  private transformParent: Int32Array;
  private readonly transformChildren: Array<number[] | undefined> = [];
  private transformGeneration: Uint32Array;
  private transformLive: Uint8Array;
  /** Hidden by itself, and by itself or an ancestor. */
  private transformHidden: Uint8Array;
  private transformHiddenWorld: Uint8Array;
  /** Point and spot lights by slot (`addLight`), free slots undefined. */
  private readonly lights: Array<LightOptions | undefined> = [];
  private readonly lightGenerations: number[] = [];
  private readonly freeLights: number[] = [];
  private readonly transformPending: number[] = [];
  private transformPendingFlag: Uint8Array;
  private transformStamp: Uint32Array;
  private transformResolve = 0;
  private transformCount = 0;
  private readonly freeTransforms: number[] = [];

  // The instance table: ranges owned by instanced draws.
  private readonly instances: MirroredTable;
  private readonly instanceAllocator: RangeAllocator;
  /** Instance slots in use or freed below the highest (cull dispatch size). */
  private instanceHighWater = 0;
  private uploadsPending = false;
  private materialsF32: Float32Array;
  private materialsU32: Uint32Array;
  private materialCount = 0;
  private materialsDirty = false;
  /**
   * Bumped by every change that can alter a rendered frame (records,
   * materials).
   */
  version = 0;
  /**
   * View bits (`Engine.viewBit`) of every record changed since the engine
   * last rendered: the views that can see a change, so on-demand rendering
   * redraws only those. A changed view mask contributes its old and new
   * bits; a material change, every view.
   */
  changedViews = 0;
  private readonly textureSets: Array<GPUBindGroup | undefined> = [];
  /** Each texture set's entries, for custom shaders' groups beside them. */
  private readonly textureSetEntries: Array<GPUBindGroupEntry[] | undefined> =
    [];
  private readonly freeTextureSets: number[] = [];
  /**
   * Group 2 of batches drawing with a custom shader that has uniforms:
   * its texture set's entries and the shader's (ShaderBindings), by texture
   * set, shader and the shader's texture version.
   */
  private readonly shaderGroups = new Map<string, GPUBindGroup>();
  /** `ShaderBindings.generation` the bundles were recorded at. */
  private bindingsGeneration = 0;
  private readonly freeMaterials: number[] = [];
  private readonly batches = new Map<string, Batch>();
  private readonly batchList: Batch[] = [];
  /** Emptied batches, reused (index kept) so live records stay valid. */
  private readonly freeBatches: Batch[] = [];
  private readonly drawBatches: Array<Batch | undefined> = [];
  /** Arena ranges per mesh id, as [byte offset, byte size]. */
  private readonly meshRanges = new Map<
    number,
    { vertex: Array<[number, number]>; index: [number, number] }
  >();
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
  private readonly maxClipBlocks: number;
  private clipBlockCount = 0;
  private readonly freeClipBlocks: number[] = [];
  private readonly clipScratch = new Float32Array(CLIP_BOXES * CLIP_BOX_FLOATS);
  private nextMeshId = 0;
  private drawCount = 0;
  private bundle?: GPURenderBundle;
  /** Draws of blended surfaces (`translucentRange`), until draws change. */
  private translucentDraws?: number[];
  /** The shadow casters' bundle, and the draw bundle it was recorded with. */
  private casters?: GPURenderBundle;
  private castersFor?: GPURenderBundle;
  /** The depth and normal prepass's bundle, likewise. */
  private prepassBundle_?: GPURenderBundle;
  private depthBundle_?: GPURenderBundle;
  private depthFor?: GPURenderBundle;
  private prepassFor?: GPURenderBundle;
  private readonly cullParamsData = new Uint32Array(4);
  private readonly cullPassDesc: GPUComputePassDescriptor = { label: "cull" };

  readonly vertexBuffer: GPUBuffer;
  readonly indexBuffer: GPUBuffer;
  readonly recordBuffer: GPUBuffer;
  readonly transformBuffer: GPUBuffer;
  readonly instanceBuffer: GPUBuffer;
  /** Per draw item and view: its camera-relative matrix and record (cull). */
  readonly itemBuffer: GPUBuffer;
  readonly materialBuffer: GPUBuffer;
  /** Mixed-LOD clip boxes, `CLIP_BOXES` per block. */
  readonly clipBuffer: GPUBuffer;
  /** Visible draw items, compacted per batch by the cull kernels. */
  readonly itemListBuffer: GPUBuffer;
  /** All draw items per batch, for "direct" submission. */
  private readonly directListBuffer: GPUBuffer;
  private readonly batchCountBuffer: GPUBuffer;
  private readonly batchBuffer: GPUBuffer;
  readonly indirectBuffer: GPUBuffer;
  private readonly cullParams: GPUBuffer;
  private readonly cullBindGroup: GPUBindGroup;
  private drawBindGroup!: GPUBindGroup;
  /** Globe imagery array (a 1×1 placeholder until imagery is attached). */
  private imageryView: GPUTextureView;
  /** Night lights array (the same until lights are attached). */
  private lightsView: GPUTextureView;
  private readonly imagerySampler: GPUSampler;

  constructor(
    private readonly ctx: RenderContext,
    options: WorldOptions = {},
  ) {
    const device = ctx.device;
    this.maxDraws = options.maxDraws ?? 16384;
    this.maxTransforms = options.maxTransforms ?? this.maxDraws;
    this.maxInstances = options.maxInstances ?? 16384;
    this.maxMaterials = options.maxMaterials ?? 4096;
    const items = this.maxDraws + this.maxInstances;
    const vertexBytes = options.vertexBytes ?? 64 * 1024 * 1024;
    const indexBytes = options.indexBytes ?? 32 * 1024 * 1024;
    this.vertexAllocator = new RangeAllocator(vertexBytes, 4);
    this.indexAllocator = new RangeAllocator(indexBytes, 4);

    this.records = new MirroredTable(
      ctx,
      "records",
      RECORD_WORDS,
      this.maxDraws,
    );
    this.recordsF32 = this.records.f32;
    this.recordsU32 = this.records.u32;
    this.drawGeneration = new Uint32Array(this.records.rows);
    this.drawOwnedTransform = new Int32Array(this.records.rows).fill(-1);
    this.transforms = new MirroredTable(
      ctx,
      "transforms",
      TRANSFORM_WORDS,
      this.maxTransforms,
    );
    const t = this.transforms.rows;
    this.transformLocal = new Float64Array(t * 16);
    this.transformWorld = new Float64Array(t * 16);
    this.transformParent = new Int32Array(t).fill(-1);
    this.transformGeneration = new Uint32Array(t);
    this.transformLive = new Uint8Array(t);
    this.transformHidden = new Uint8Array(t);
    this.transformHiddenWorld = new Uint8Array(t);
    this.transformPendingFlag = new Uint8Array(t);
    this.transformStamp = new Uint32Array(t);
    this.instances = new MirroredTable(
      ctx,
      "instances",
      INSTANCE_WORDS,
      Math.max(1, this.maxInstances),
    );
    this.instanceAllocator = new RangeAllocator(this.maxInstances, 1);
    const materials = new ArrayBuffer(
      Math.min(this.maxMaterials, INITIAL_ROWS) * MATERIAL_SIZE,
    );
    this.materialsF32 = new Float32Array(materials);
    this.materialsU32 = new Uint32Array(materials);

    const buffer = (label: string, size: number, usage: GPUBufferUsageFlags) =>
      device.createBuffer({ label: `world.${label}`, size, usage });
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.vertexBuffer = buffer("vertices", vertexBytes, storage);
    // STORAGE: ray casts read triangles (`castRays`).
    this.indexBuffer = buffer(
      "indices",
      indexBytes,
      GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    );
    this.recordBuffer = this.records.buffer;
    this.transformBuffer = this.transforms.buffer;
    this.instanceBuffer = this.instances.buffer;
    // COPY_SRC lets precision tests read back the cull kernels' output.
    this.itemBuffer = buffer(
      "items",
      items * DRAW_ITEM_SIZE,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    );
    // Full size: the CPU mirror grows (reserveMaterials), the table doesn't.
    this.materialBuffer = buffer(
      "materials",
      this.maxMaterials * MATERIAL_SIZE,
      storage,
    );
    this.maxClipBlocks = options.maxClipBlocks ?? 2048;
    this.clipBuffer = buffer(
      "clipBoxes",
      this.maxClipBlocks * this.clipScratch.byteLength,
      storage,
    );
    this.itemListBuffer = buffer(
      "itemList",
      items * 4,
      GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
    );
    this.directListBuffer = buffer(
      "directList",
      items * 4,
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
    this.cullParams = buffer(
      "cullParams",
      16,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );

    this.cullBindGroup = device.createBindGroup({
      label: "world.cull",
      layout: ctx.pipelines.cullWorldLayout,
      entries: [
        this.recordBuffer,
        this.transformBuffer,
        this.instanceBuffer,
        this.itemBuffer,
        this.itemListBuffer,
        this.batchCountBuffer,
        this.batchBuffer,
        this.indirectBuffer,
        this.cullParams,
      ].map((b, binding) => ({ binding, resource: { buffer: b } })),
    });
    this.imageryView = device
      .createTexture({
        label: "world.imagery.placeholder",
        size: [1, 1, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING,
      })
      .createView({ dimension: "2d-array" });
    this.lightsView = this.imageryView;
    this.imagerySampler = device.createSampler({
      label: "world.imagery",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      maxAnisotropy: 16,
    });
    this.createDrawBindGroup();

    this.addMaterial({}); // material 0: white, lit, untextured
    this.createTextureSet({}); // texture set 0: defaults
  }

  /** Number of record slots in use, including hidden and freed-but-trailing slots. */
  get recordCount(): number {
    return this.drawCount;
  }

  /** Number of batches, i.e. indirect draw calls per view. */
  /** Arena, table and fixed-buffer usage, for diagnostics. */
  get memory(): WorldMemory {
    return {
      vertexBytes: {
        used: this.vertexAllocator.used,
        capacity: this.vertexAllocator.capacity,
      },
      indexBytes: {
        used: this.indexAllocator.used,
        capacity: this.indexAllocator.capacity,
      },
      draws: {
        used: this.drawCount - this.freeSlots.length,
        capacity: this.maxDraws,
      },
      transforms: {
        used: this.transformCount - this.freeTransforms.length,
        capacity: this.maxTransforms,
      },
      instances: {
        used: this.instanceAllocator.used,
        capacity: this.maxInstances,
      },
      materials: {
        used: this.materialCount - this.freeMaterials.length,
        capacity: this.maxMaterials,
      },
      batches: this.batches.size,
      tableBytes:
        this.recordBuffer.size +
        this.transformBuffer.size +
        this.instanceBuffer.size +
        this.itemBuffer.size +
        this.materialBuffer.size +
        this.clipBuffer.size +
        this.itemListBuffer.size +
        this.indirectBuffer.size,
    };
  }

  /** Live batches: indirect draws per view. */
  get batchCount(): number {
    return this.batches.size;
  }

  /**
   * Geometry written since the last frame, copied in one batch
   * (`flushUploads`). A queue.writeBuffer per stream of every mesh went
   * through the browser's transfer ring to the GPU process: a burst of
   * tiles blocked the main thread in writeBuffer (NYC, vsync off: 1.2 s
   * over 8 s of an orbit, r38).
   */
  private readonly pendingUploads: Array<{
    target: GPUBuffer;
    offset: number;
    source: GPUBuffer;
    at: number;
    size: number;
  }> = [];
  /**
   * Staging buffers mapped at creation, the queued bytes copied into them
   * when queued (as writeBuffer copied them); destroyed after each flush,
   * so nothing stays on this thread between bursts (a reused copy buffer
   * kept its peak, 4 MB after NYC's load, r39).
   */
  private readonly uploadChunks: Array<{
    buffer: GPUBuffer;
    bytes: Uint8Array;
    used: number;
  }> = [];

  /** Queues a write of `data` at `offset` in `target` (`flushUploads`). */
  private queueUpload(
    target: GPUBuffer,
    offset: number,
    data: Float32Array | Uint32Array,
  ): void {
    const size = data.byteLength;
    let chunk = this.uploadChunks.at(-1);
    if (!chunk || chunk.used + size > chunk.bytes.length) {
      const buffer = this.ctx.device.createBuffer({
        label: "world.uploads",
        size: Math.max(UPLOAD_CHUNK_BYTES, Math.ceil(size / 4) * 4),
        usage: GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
      });
      chunk = {
        buffer,
        bytes: new Uint8Array(buffer.getMappedRange()),
        used: 0,
      };
      this.uploadChunks.push(chunk);
    }
    chunk.bytes.set(
      new Uint8Array(data.buffer, data.byteOffset, size),
      chunk.used,
    );
    this.pendingUploads.push({
      target,
      offset,
      source: chunk.buffer,
      at: chunk.used,
      size,
    });
    chunk.used += size;
  }

  /**
   * Copies the queued geometry into place: the mapped staging buffers
   * filled on this thread, and a buffer-to-buffer copy per write, submitted
   * before anything that reads the arenas (the frame, ray casts) and before
   * any other write to them or a release of their ranges.
   */
  flushUploads(): void {
    if (this.pendingUploads.length === 0) {
      return;
    }
    for (const chunk of this.uploadChunks) {
      chunk.buffer.unmap();
    }
    const encoder = this.ctx.device.createCommandEncoder({
      label: "world.uploads",
    });
    for (const { target, offset, source, at, size } of this.pendingUploads) {
      encoder.copyBufferToBuffer(source, at, target, offset, size);
    }
    this.ctx.device.queue.submit([encoder.finish()]);
    for (const chunk of this.uploadChunks) {
      chunk.buffer.destroy(); // released once the copies have run
    }
    this.uploadChunks.length = 0;
    this.pendingUploads.length = 0;
  }

  /** Uploads geometry into the arena as separate attribute streams. */
  addMesh(mesh: MeshData): MeshHandle {
    const vertexCount = mesh.positions.length / 3;
    const vertexRanges: Array<[number, number]> = [];
    const upload = (data: Float32Array | Uint32Array | undefined): number => {
      if (!data) {
        return NO_STREAM;
      }
      const offset = this.vertexAllocator.allocate(data.byteLength);
      if (offset === undefined) {
        for (const [o, size] of vertexRanges) {
          this.vertexAllocator.release(o, size);
        }
        throw new Error("World vertex arena is full.");
      }
      vertexRanges.push([offset, data.byteLength]);
      this.queueUpload(this.vertexBuffer, offset, data);
      return offset / 4;
    };
    const streams: MeshStreams = {
      position: upload(mesh.positions),
      normal: upload(mesh.normals),
      uv: upload(mesh.uvs),
      color: upload(mesh.colors),
      tangent: upload(mesh.tangents),
      featureId: upload(mesh.featureIds),
      attributes: NO_STREAM,
    };
    // Metadata properties share the directory, their names prefixed.
    const named = [
      ...Object.entries(mesh.attributes ?? {}),
      ...Object.entries(mesh.metadata ?? {}).map(
        ([id, stream]) => [metadataKey(id), stream] as const,
      ),
    ];
    if (named.length > 0) {
      const directory = new Uint32Array(1 + named.length * 3);
      directory[0] = named.length;
      named.forEach(([name, { data, components }], i) => {
        directory[1 + i * 3] = attributeHash(name);
        directory[2 + i * 3] = upload(data);
        directory[3 + i * 3] = components;
      });
      streams.attributes = upload(directory);
    }
    const indexOffset = this.indexAllocator.allocate(mesh.indices.byteLength);
    if (indexOffset === undefined) {
      for (const [o, size] of vertexRanges) {
        this.vertexAllocator.release(o, size);
      }
      throw new Error("World index arena is full.");
    }
    this.queueUpload(this.indexBuffer, indexOffset, mesh.indices);
    const { center, radius } = boundingSphere(mesh.positions);
    const id = this.nextMeshId++;
    this.meshRanges.set(id, {
      vertex: vertexRanges,
      index: [indexOffset, mesh.indices.byteLength],
    });
    return {
      id,
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

  /**
   * Frees a mesh's arena ranges. Draws that use it must be removed first.
   * Returns the bytes released.
   */
  removeMesh(mesh: MeshHandle): number {
    const ranges = this.meshRanges.get(mesh.id);
    if (!ranges) {
      return 0;
    }
    // Its ranges may be reused before the next frame: its queued data
    // must not land on their next owner's.
    this.flushUploads();
    this.meshRanges.delete(mesh.id);
    let bytes = 0;
    for (const [offset, size] of ranges.vertex) {
      this.vertexAllocator.release(offset, size);
      bytes += size;
    }
    this.indexAllocator.release(ranges.index[0], ranges.index[1]);
    return bytes + ranges.index[1];
  }

  /** Bytes in use in the vertex and index arenas. */
  get arenaBytes(): number {
    return this.vertexAllocator.used + this.indexAllocator.used;
  }

  /** CPU room for draw slots below `count`. */
  private reserveDraws(count: number): void {
    if (this.records.reserve(count)) {
      const rows = this.records.rows;
      this.recordsF32 = this.records.f32;
      this.recordsU32 = this.records.u32;
      this.drawGeneration = resized(this.drawGeneration, rows);
      this.drawOwnedTransform = resized(this.drawOwnedTransform, rows, -1);
    }
  }

  /** CPU room for transforms below `count`. */
  private reserveTransforms(count: number): void {
    if (this.transforms.reserve(count)) {
      const t = this.transforms.rows;
      this.transformLocal = resized(this.transformLocal, t * 16);
      this.transformWorld = resized(this.transformWorld, t * 16);
      this.transformParent = resized(this.transformParent, t, -1);
      this.transformGeneration = resized(this.transformGeneration, t);
      this.transformLive = resized(this.transformLive, t);
      this.transformHidden = resized(this.transformHidden, t);
      this.transformHiddenWorld = resized(this.transformHiddenWorld, t);
      this.transformPendingFlag = resized(this.transformPendingFlag, t);
      this.transformStamp = resized(this.transformStamp, t);
    }
  }

  /** CPU room for materials below `count`. */
  private reserveMaterials(count: number): void {
    const rows = this.materialsF32.byteLength / MATERIAL_SIZE;
    if (count > rows) {
      const data = new ArrayBuffer(
        grownSize(rows, count, this.maxMaterials) * MATERIAL_SIZE,
      );
      new Uint32Array(data).set(this.materialsU32);
      this.materialsF32 = new Float32Array(data);
      this.materialsU32 = new Uint32Array(data);
    }
  }

  /** Adds a material to the table and returns its index. */
  addMaterial(options: MaterialOptions): number {
    const index = this.freeMaterials.pop() ?? this.materialCount++;
    if (index >= this.maxMaterials) {
      this.materialCount--;
      throw new Error("World material table is full.");
    }
    this.reserveMaterials(index + 1);
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
    this.version++;
    this.changedViews = ALL_VIEWS;
    return index;
  }

  /** Frees a material slot. Draws that use it must be removed first. */
  removeMaterial(index: number): void {
    this.freeMaterials.push(index);
  }

  /** Frees a texture set (not its textures). Draws must be removed first. */
  removeTextureSet(index: number): void {
    if (index > 0 && this.textureSets[index]) {
      this.textureSets[index] = undefined;
      this.textureSetEntries[index] = undefined;
      this.freeTextureSets.push(index);
      for (const key of this.shaderGroups.keys()) {
        if (key.startsWith(`${index}|`)) {
          this.shaderGroups.delete(key);
        }
      }
    }
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
    const group = this.ctx.device.createBindGroup({
      label: "world.textureSet",
      layout: this.ctx.pipelines.textureSetLayout,
      entries,
    });
    const index = this.freeTextureSets.pop();
    if (index !== undefined) {
      this.textureSets[index] = group;
      this.textureSetEntries[index] = entries;
      return index;
    }
    this.textureSets.push(group);
    this.textureSetEntries.push(entries);
    return this.textureSets.length - 1;
  }

  addDraw(options: DrawOptions): DrawHandle {
    const index = this.freeSlots.pop() ?? this.drawCount++;
    if (index >= this.maxDraws) {
      this.drawCount--;
      throw new Error("World draw table is full.");
    }
    this.reserveDraws(index + 1);
    const mesh = options.mesh;
    // Placement: a shared transform, or one the draw owns.
    let transform: number;
    if (options.transform) {
      if (!this.transformAlive(options.transform)) {
        this.freeSlots.push(index);
        throw new Error("addDraw: the transform was removed.");
      }
      transform = options.transform.index;
      this.drawOwnedTransform[index] = -1;
    } else {
      const m = new Float64Array(16);
      m.set(options.model ?? IDENTITY);
      const origin = options.origin ?? ZERO;
      m[12] = origin[0]! + m[12]!;
      m[13] = origin[1]! + m[13]!;
      m[14] = origin[2]! + m[14]!;
      transform = this.addTransform(m).index;
      this.drawOwnedTransform[index] = transform;
    }

    // Instances: a range in the instance table, culled one by one.
    const instances = options.instances;
    const instanceCount = instances ? instances.matrices.length / 16 : 0;
    let instanceFirst = 0;
    let instanceFeatures = 0;
    if (instances && instanceCount > 0) {
      const first = this.instanceAllocator.allocate(instanceCount);
      if (first === undefined) {
        this.releaseOwnedTransform(index);
        this.freeSlots.push(index);
        throw new Error("World instance table is full.");
      }
      this.instances.reserve(first + instanceCount);
      instanceFirst = first;
      this.instanceHighWater = Math.max(
        this.instanceHighWater,
        first + instanceCount,
      );
      const { f32, u32 } = this.instances;
      for (let k = 0; k < instanceCount; k++) {
        const feature = instances.featureIds?.[k] ?? NO_FEATURE;
        if (feature !== NO_FEATURE) {
          instanceFeatures = Math.max(instanceFeatures, feature + 1);
        }
        writeInstance(
          f32,
          u32,
          first + k,
          instances.matrices,
          k * 16,
          index,
          feature,
          0,
          instances.tints ? packTint(instances.tints, k * 4) : 0xffffffff,
        );
        this.instances.mark(first + k);
      }
    }
    let instanceStreams = NO_STREAM;
    let instanceStride = 0;
    this.instanceStreamRanges[index] = undefined;
    if (instances?.streams && instanceCount > 0) {
      const data = instances.streams.data;
      const offset = this.vertexAllocator.allocate(data.byteLength);
      if (offset === undefined) {
        this.releaseInstances(instanceFirst, instanceCount);
        this.releaseOwnedTransform(index);
        this.freeSlots.push(index);
        throw new Error("World vertex arena is full.");
      }
      this.queueUpload(this.vertexBuffer, offset, data);
      this.instanceStreamRanges[index] = [offset, data.byteLength];
      instanceStreams = offset / 4;
      instanceStride = instances.streams.stride;
    }

    const material = options.material ?? 0;
    const textureSet = options.textureSet ?? 0;
    const doubleSided = options.doubleSided ?? false;
    const shader = options.shader;
    const key = `${mesh.id}|${material}|${textureSet}|${doubleSided ? 1 : 0}|${shader?.id ?? 0}`;
    let batch = this.batches.get(key);
    if (!batch) {
      const reused = this.freeBatches.pop();
      if (reused) {
        batch = reused;
        batch.key = key;
        batch.mesh = mesh;
        batch.textureSet = textureSet;
        batch.material = material;
        batch.doubleSided = doubleSided;
        batch.shader = shader;
      } else {
        batch = {
          index: this.batchList.length,
          key,
          mesh,
          textureSet,
          material,
          doubleSided,
          shader,
          items: 0,
          itemBase: 0,
        };
        this.batchList.push(batch);
      }
      this.batches.set(key, batch);
    }
    batch.items += instanceCount > 0 ? instanceCount : 1;
    this.drawBatches[index] = batch;

    // Bounds live in the transform's local frame, so moving or rotating
    // the transform never stales them; an explicit radius is in meters.
    // A custom vertex stage's displacement (model units) pads them.
    this.resolveTransforms();
    const scale = this.transformsF32Scale(transform);
    this.names[index] = options.name;
    this.featureTables[index] = options.features;
    const firstFeature = this.nextFeatureId;
    this.nextFeatureId += Math.max(1, mesh.featureCount, instanceFeatures);
    this.featureRangeFirst.push(firstFeature);
    this.featureRangeDraw.push(index);
    this.drawFeatureFirst[index] = firstFeature;
    writeDrawRecord(this.recordsF32, this.recordsU32, index, {
      transform,
      center: mesh.center,
      radius:
        (options.radius !== undefined
          ? options.radius / (scale || 1)
          : mesh.radius) + (shader?.displacement ?? 0),
      color: options.color ?? [1, 1, 1, 1],
      indexCount: mesh.indexCount,
      firstIndex: mesh.firstIndex,
      streams: mesh.streams,
      materialIndex: material,
      textureSet,
      batch: batch.index,
      featureId: firstFeature,
      viewMask: options.viewMask,
      // Lines have no surface to light; 1.x draws them unlit too.
      flags:
        (options.unlit || mesh.topology === "line-list"
          ? RecordFlags.unlit
          : 0) |
        (options.collision ? RecordFlags.collision : 0) |
        (options.underlay ? RecordFlags.underlay : 0),
      instanceFirst,
      instanceCount,
      instanceStreams,
      instanceStride,
    });
    this.markDirty(index);
    this.bundle = undefined;
    this.translucentDraws = undefined;
    return {
      index,
      generation: this.drawGeneration[index]!,
      name: options.name,
    };
  }

  /** Whether `handle` still names a live draw. */
  hasDraw(handle: DrawHandle): boolean {
    return (
      this.drawBatches[handle.index] !== undefined &&
      this.drawGeneration[handle.index] === handle.generation
    );
  }

  removeDraw(handle: DrawHandle): void {
    if (!this.hasDraw(handle)) {
      return; // already removed
    }
    const batch = this.drawBatches[handle.index]!;
    const o = handle.index * RECORD_WORDS;
    const instanceCount = this.recordsU32[o + INSTANCE_COUNT_WORD]!;
    this.drawBatches[handle.index] = undefined;
    this.drawGeneration[handle.index] = this.drawGeneration[handle.index]! + 1;
    batch.items -= instanceCount > 0 ? instanceCount : 1;
    if (batch.items === 0) {
      this.batches.delete(batch.key);
      batch.key = "";
      this.freeBatches.push(batch);
    }
    // Slices of the item list follow batch sizes: rebuild them.
    this.bundle = undefined;
    this.translucentDraws = undefined;
    this.recordsU32[o + FLAGS_WORD] = RecordFlags.hidden;
    if (instanceCount > 0) {
      this.releaseInstances(
        this.recordsU32[o + INSTANCE_FIRST_WORD]!,
        instanceCount,
      );
      this.recordsU32[o + INSTANCE_COUNT_WORD] = 0;
    }
    const streams = this.instanceStreamRanges[handle.index];
    if (streams) {
      this.flushUploads(); // before its range can be reused
      this.vertexAllocator.release(streams[0], streams[1]);
      this.instanceStreamRanges[handle.index] = undefined;
    }
    this.releaseOwnedTransform(handle.index);
    this.names[handle.index] = undefined;
    this.featureTables[handle.index] = undefined;
    // The slot may be reused; its old feature range must not resolve to it.
    this.drawFeatureFirst[handle.index] = -1;
    this.freeSlots.push(handle.index);
    this.markDirty(handle.index);
  }

  private releaseInstances(first: number, count: number): void {
    for (let k = first; k < first + count; k++) {
      this.instances.u32[k * INSTANCE_WORDS + 12] = NO_RECORD;
      this.instances.mark(k);
    }
    this.instanceAllocator.release(first, count);
    this.version++;
  }

  private releaseOwnedTransform(draw: number): void {
    const owned = this.drawOwnedTransform[draw]!;
    if (owned >= 0) {
      this.drawOwnedTransform[draw] = -1;
      this.removeTransform({
        index: owned,
        generation: this.transformGeneration[owned]!,
      });
    }
  }

  /**
   * Changes one instance of an instanced draw: its matrix (relative to the
   * draw's transform), visibility or tint.
   */
  setInstance(
    handle: DrawHandle,
    instance: number,
    change: {
      matrix?: ArrayLike<number>;
      visible?: boolean;
      tint?: ArrayLike<number>;
    },
  ): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const o = handle.index * RECORD_WORDS;
    const count = this.recordsU32[o + INSTANCE_COUNT_WORD]!;
    if (instance < 0 || instance >= count) {
      throw new RangeError(`instance ${instance} of ${count}`);
    }
    const slot = this.recordsU32[o + INSTANCE_FIRST_WORD]! + instance;
    const { f32, u32 } = this.instances;
    const w = slot * INSTANCE_WORDS;
    if (change.matrix) {
      writeInstance(
        f32,
        u32,
        slot,
        change.matrix,
        0,
        u32[w + 12]!,
        u32[w + 13]!,
        u32[w + 14]!,
        u32[w + 15]!,
      );
    }
    if (change.visible !== undefined) {
      u32[w + 14] = change.visible ? 0 : 1;
    }
    if (change.tint) {
      u32[w + 15] = packTint(change.tint);
    }
    this.instances.mark(slot);
    this.version++;
    this.changedViews |= this.recordsU32[o + VIEW_MASK_WORD]!;
  }

  // ------------------------------------------------------------ transforms

  /**
   * Adds a placement: `matrix` (column-major float64) relative to `parent`,
   * or Earth-fixed without one. Draws, other transforms and instanced
   * draws' instances hang off it; moving it moves them all.
   */
  addTransform(
    matrix: ArrayLike<number>,
    parent?: TransformHandle,
  ): TransformHandle {
    if (parent && !this.transformAlive(parent)) {
      throw new Error("addTransform: the parent was removed.");
    }
    const index = this.freeTransforms.pop() ?? this.transformCount++;
    if (index >= this.maxTransforms) {
      this.transformCount--;
      throw new Error("World transform table is full.");
    }
    this.reserveTransforms(index + 1);
    this.transformLocal.set(matrix, index * 16);
    this.transformParent[index] = parent ? parent.index : -1;
    if (parent) {
      (this.transformChildren[parent.index] ??= []).push(index);
    }
    this.transformChildren[index] = undefined;
    this.transformLive[index] = 1;
    this.transformHidden[index] = 0;
    this.pendTransform(index);
    return { index, generation: this.transformGeneration[index]! };
  }

  /** Replaces a transform's matrix (relative to its parent). */
  setTransform(handle: TransformHandle, matrix: ArrayLike<number>): void {
    if (!this.transformAlive(handle)) {
      return;
    }
    this.transformLocal.set(matrix, handle.index * 16);
    this.pendTransform(handle.index);
    this.changedViews = ALL_VIEWS;
  }

  /** Hides or shows a transform and everything below it. */
  setTransformVisible(handle: TransformHandle, visible: boolean): void {
    if (!this.transformAlive(handle)) {
      return;
    }
    const hidden = visible ? 0 : 1;
    if (this.transformHidden[handle.index] !== hidden) {
      this.transformHidden[handle.index] = hidden;
      this.pendTransform(handle.index);
      this.changedViews = ALL_VIEWS;
    }
  }

  /** A transform's matrix relative to its parent. */
  localMatrix(
    handle: TransformHandle,
    out = new Float64Array(16),
  ): Float64Array {
    out.set(
      this.transformLocal.subarray(handle.index * 16, handle.index * 16 + 16),
    );
    return out;
  }

  /** A transform's Earth-fixed matrix (float64), composed with its parents. */
  worldMatrix(
    handle: TransformHandle,
    out = new Float64Array(16),
  ): Float64Array {
    this.resolveTransforms();
    out.set(
      this.transformWorld.subarray(handle.index * 16, handle.index * 16 + 16),
    );
    return out;
  }

  /**
   * Removes a transform and its descendants. Draws placed by them must be
   * removed first.
   */
  removeTransform(handle: TransformHandle): void {
    if (!this.transformAlive(handle)) {
      return;
    }
    const index = handle.index;
    const parent = this.transformParent[index]!;
    if (parent >= 0) {
      const siblings = this.transformChildren[parent];
      const at = siblings?.indexOf(index) ?? -1;
      if (at >= 0) {
        siblings!.splice(at, 1);
      }
    }
    this.freeTransformTree(index);
  }

  /** Whether `handle` still names a live transform. */
  transformAlive(handle: TransformHandle): boolean {
    return (
      this.transformLive[handle.index] === 1 &&
      this.transformGeneration[handle.index] === handle.generation
    );
  }

  private freeTransformTree(index: number): void {
    for (const child of this.transformChildren[index] ?? []) {
      this.freeTransformTree(child);
    }
    this.transformChildren[index] = undefined;
    this.transformLive[index] = 0;
    this.transformParent[index] = -1;
    this.transformGeneration[index] = this.transformGeneration[index]! + 1;
    this.freeTransforms.push(index);
  }

  private pendTransform(index: number): void {
    if (this.transformPendingFlag[index] === 0) {
      this.transformPendingFlag[index] = 1;
      this.transformPending.push(index);
    }
    this.version++;
  }

  /** Composes changed transforms and their descendants, parents first. */
  private resolveTransforms(): void {
    if (this.transformPending.length === 0) {
      return;
    }
    const stamp = ++this.transformResolve;
    for (const index of this.transformPending) {
      this.transformPendingFlag[index] = 0;
      if (this.transformLive[index] === 1) {
        // From the highest pending ancestor, so each subtree composes once.
        let top = index;
        for (
          let p = this.transformParent[index]!;
          p >= 0;
          p = this.transformParent[p]!
        ) {
          if (
            this.transformPendingFlag[p] === 1 ||
            this.transformStamp[p] === stamp
          ) {
            top = p;
          }
        }
        if (this.transformStamp[top] !== stamp) {
          this.composeTransform(top, stamp);
        }
      }
    }
    this.transformPending.length = 0;
  }

  private composeTransform(index: number, stamp: number): void {
    this.transformStamp[index] = stamp;
    const parent = this.transformParent[index]!;
    const world = this.transformWorld;
    if (parent >= 0) {
      multiplyInto(
        world,
        index * 16,
        world,
        parent * 16,
        this.transformLocal,
        index * 16,
      );
    } else {
      world.set(
        this.transformLocal.subarray(index * 16, index * 16 + 16),
        index * 16,
      );
    }
    const hidden =
      this.transformHidden[index] === 1 ||
      (parent >= 0 && this.transformHiddenWorld[parent] === 1);
    this.transformHiddenWorld[index] = hidden ? 1 : 0;
    writeTransform(
      this.transforms.f32,
      this.transforms.u32,
      index,
      world.subarray(index * 16, index * 16 + 16),
      hidden,
    );
    this.transforms.mark(index);
    this.uploadsPending = true;
    for (const child of this.transformChildren[index] ?? []) {
      this.composeTransform(child, stamp);
    }
  }

  // ---------------------------------------------------------------- lights

  /**
   * Adds a point or spot light (`LightOptions`) at a transform: moving or
   * hiding the transform moves or hides it; removing it removes the light.
   */
  addLight(options: LightOptions): LightHandle {
    if (!this.transformAlive(options.transform)) {
      throw new Error("addLight: the transform was removed.");
    }
    const index = this.freeLights.pop() ?? this.lights.length;
    const generation = this.lightGenerations[index] ?? 0;
    this.lightGenerations[index] = generation;
    this.lights[index] = { ...options };
    this.lightsChanged();
    return { index, generation };
  }

  /** Changes a light; its transform stays (move that instead). */
  setLight(
    handle: LightHandle,
    changes: Partial<Omit<LightOptions, "transform">>,
  ): void {
    if (this.lightAlive(handle)) {
      Object.assign(this.lights[handle.index]!, changes);
      this.lightsChanged();
    }
  }

  removeLight(handle: LightHandle): void {
    if (!this.lightAlive(handle)) {
      return;
    }
    this.lights[handle.index] = undefined;
    this.lightGenerations[handle.index] = handle.generation + 1;
    this.freeLights.push(handle.index);
    this.lightsChanged();
  }

  /** Whether `handle` still names a light. */
  lightAlive(handle: LightHandle): boolean {
    return (
      this.lights[handle.index] !== undefined &&
      this.lightGenerations[handle.index] === handle.generation
    );
  }

  /** How many lights the world holds. */
  get lightCount(): number {
    return this.lights.length - this.freeLights.length;
  }

  /**
   * @internal Each shown light with its transform's Earth-fixed matrix
   * (lights.ts `packViewLights`); lights whose transform was removed go.
   */
  forEachLight(
    visit: (light: LightOptions, matrix: Float64Array) => void,
  ): void {
    if (this.lightCount === 0) {
      return;
    }
    this.resolveTransforms();
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];
      if (!light) {
        continue;
      }
      const t = light.transform;
      if (!this.transformAlive(t)) {
        this.removeLight({ index: i, generation: this.lightGenerations[i]! });
        continue;
      }
      if (this.transformHiddenWorld[t.index] === 0) {
        visit(
          light,
          this.transformWorld.subarray(t.index * 16, t.index * 16 + 16),
        );
      }
    }
  }

  private lightsChanged(): void {
    this.version++;
    this.changedViews = ALL_VIEWS;
  }

  /** Largest axis scale of a composed transform. */
  private transformsF32Scale(index: number): number {
    return this.transforms.f32[index * TRANSFORM_WORDS + 3]!;
  }

  /**
   * Sets which views draw a record (bit per view, see `Engine.viewBit`):
   * per-view tile selection over one shared draw table.
   */
  /** Binds the globe imagery array (`GlobeImagery`) for this world's draws. */
  setImageryArray(view: GPUTextureView): void {
    this.imageryView = view;
    this.createDrawBindGroup();
    // The cached bundle binds the old group (and its soon-destroyed array).
    this.bundle = undefined;
    this.changedViews = ALL_VIEWS;
    this.version++;
  }

  /** Binds the night lights array (`GlobeImagery`, "lights") for draws. */
  setLightsArray(view: GPUTextureView): void {
    this.lightsView = view;
    this.createDrawBindGroup();
    // The cached bundle binds the old group (and its soon-destroyed array).
    this.bundle = undefined;
    this.changedViews = ALL_VIEWS;
    this.version++;
  }

  /**
   * Points a globe tile's record at its night lights (`packImagery`, 0:
   * none): light the surface emits (cities), in cd/m², added to what it
   * reflects.
   */
  setLights(handle: DrawHandle, packed: number): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const o = handle.index * RECORD_WORDS;
    if (this.recordsU32[o + LIGHTS_SLICE_WORD] !== packed >>> 0) {
      this.recordsU32[o + LIGHTS_SLICE_WORD] = packed >>> 0;
      this.markDirty(handle.index);
    }
  }

  /**
   * Points a globe tile's record at its imagery (`packImagery`, 0: none).
   * Imagery replaces the material's color, lit like any surface, or with
   * `unlit` shown as is (display-referred, as 1.x's globe without scene
   * lighting).
   */
  setImagery(handle: DrawHandle, packed: number, unlit = false): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const o = handle.index * RECORD_WORDS;
    const flags = this.recordsU32[o + FLAGS_WORD]!;
    const next =
      packed !== 0 && unlit
        ? flags | RecordFlags.unlit
        : flags & ~RecordFlags.unlit;
    if (
      this.recordsU32[o + IMAGERY_SLICE_WORD] !== packed >>> 0 ||
      flags !== next
    ) {
      this.recordsU32[o + IMAGERY_SLICE_WORD] = packed >>> 0;
      this.recordsU32[o + FLAGS_WORD] = next;
      this.markDirty(handle.index);
    }
  }

  setViewMask(handle: DrawHandle, mask: number): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const index = handle.index * RECORD_WORDS + VIEW_MASK_WORD;
    if (this.recordsU32[index] !== mask >>> 0) {
      this.changedViews |= this.recordsU32[index]!; // the views it left
      this.recordsU32[index] = mask >>> 0;
      this.markDirty(handle.index);
    }
  }

  /**
   * Uploads up to `CLIP_BOXES` clip boxes for a mixed-LOD placeholder, or
   * returns undefined when there are too many or no block is free.
   */
  allocateClip(boxes: readonly ClipBox[]): ClipHandle | undefined {
    if (boxes.length === 0 || boxes.length > CLIP_BOXES) {
      return undefined;
    }
    const block =
      this.freeClipBlocks.pop() ??
      (this.clipBlockCount < this.maxClipBlocks ? this.clipBlockCount++ : -1);
    if (block < 0) {
      return undefined;
    }
    const f = this.clipScratch;
    f.fill(0);
    boxes.forEach((box, i) => {
      const o = i * CLIP_BOX_FLOATS;
      splitVec3(box.center as Vec3, f, o, f, o + 4);
      for (let k = 0; k < 3; k++) {
        f[o + 8 + k] = box.rows[k]!;
        f[o + 12 + k] = box.rows[3 + k]!;
        f[o + 16 + k] = box.rows[6 + k]!;
      }
    });
    this.ctx.device.queue.writeBuffer(this.clipBuffer, block * f.byteLength, f);
    return { block, count: boxes.length };
  }

  freeClip(clip: ClipHandle): void {
    this.freeClipBlocks.push(clip.block);
  }

  /**
   * Makes a record a mixed-LOD placeholder in the views of `mask`: there it
   * draws only inside `clip` (the volumes of its missing finer descendants),
   * at its true depth. No clip restores normal drawing.
   */
  setPlaceholder(handle: DrawHandle, mask: number, clip?: ClipHandle): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const o = handle.index * RECORD_WORDS;
    const m = clip ? mask >>> 0 : 0;
    const block = clip?.block ?? 0;
    const count = clip?.count ?? 0;
    if (
      this.recordsU32[o + PLACEHOLDER_MASK_WORD] !== m ||
      this.recordsU32[o + CLIP_BLOCK_WORD] !== block ||
      this.recordsU32[o + CLIP_COUNT_WORD] !== count
    ) {
      this.recordsU32[o + PLACEHOLDER_MASK_WORD] = m;
      this.recordsU32[o + CLIP_BLOCK_WORD] = block;
      this.recordsU32[o + CLIP_COUNT_WORD] = count;
      this.markDirty(handle.index);
    }
  }

  /** Whether ray casts with `collisionOnly` may hit the draw. */
  setCollision(handle: DrawHandle, collision: boolean): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const index = handle.index * RECORD_WORDS + FLAGS_WORD;
    const flags = this.recordsU32[index]!;
    const next = collision
      ? flags | RecordFlags.collision
      : flags & ~RecordFlags.collision;
    if (next !== flags) {
      this.recordsU32[index] = next;
      this.records.mark(handle.index);
      this.uploadsPending = true;
    }
  }

  /**
   * Casts rays (float64 Earth-fixed origins, unit directions) against the
   * triangles of the draws they may hit and resolves each ray's nearest
   * hit distance in meters, or undefined. Brute force on the GPU over the
   * draws whose bounds a ray crosses (`raycast.wgsl`); one readback.
   */
  async castRays(
    rays: readonly CastRay[],
    options: CastOptions = {},
  ): Promise<Array<number | undefined>> {
    const out: Array<number | undefined> = rays.map(() => undefined);
    if (rays.length === 0) {
      return out;
    }
    this.flushUploads();
    this.resolveTransforms();
    const jobs = this.rayJobs(rays, options);
    if (jobs.length === 0) {
      return out;
    }
    const device = this.ctx.device;
    const rayData = new Float32Array(rays.length * 12);
    const rayWords = new Uint32Array(rayData.buffer);
    rays.forEach((ray, i) => {
      for (let k = 0; k < 3; k++) {
        const value = ray.origin[k]!;
        const hi = Math.fround(value);
        rayData[i * 12 + k] = hi;
        rayData[i * 12 + 4 + k] = Math.fround(value - hi);
        rayData[i * 12 + 8 + k] = ray.direction[k]!;
      }
      rayData[i * 12 + 3] = ray.maxDistance;
      rayWords[i * 12 + 7] = 0;
      rayWords[i * 12 + 11] = 0;
    });
    const buffer = (
      label: string,
      data: ArrayBufferView<ArrayBuffer>,
      usage: number,
    ) => {
      const b = device.createBuffer({
        label: `world.raycast.${label}`,
        size: Math.max(16, data.byteLength),
        usage: usage | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(b, 0, data);
      return b;
    };
    const STORAGE = GPUBufferUsage.STORAGE;
    const rayBuffer = buffer("rays", rayData, STORAGE);
    const jobBuffer = buffer("jobs", jobs, STORAGE);
    const hitBuffer = buffer(
      "hits",
      new Uint32Array(rays.length).fill(NO_HIT),
      STORAGE | GPUBufferUsage.COPY_SRC,
    );
    const readback = device.createBuffer({
      label: "world.raycast.readback",
      size: Math.max(16, rays.length * 4),
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const pipeline = this.ctx.pipelines.raycast;
    const group = device.createBindGroup({
      label: "world.raycast",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        rayBuffer,
        jobBuffer,
        this.recordBuffer,
        this.transformBuffer,
        this.instanceBuffer,
        this.vertexBuffer,
        this.indexBuffer,
        hitBuffer,
      ].map((b, binding) => ({ binding, resource: { buffer: b } })),
    });
    const encoder = device.createCommandEncoder({ label: "world.raycast" });
    const pass = encoder.beginComputePass({ label: "raycast" });
    // The tables as the CPU has them (draws added since the last frame).
    this.uploadTables(pass);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    const count = jobs.length / 4;
    const x = Math.min(count, 65535);
    pass.dispatchWorkgroups(x, Math.ceil(count / x));
    pass.end();
    encoder.copyBufferToBuffer(hitBuffer, 0, readback, 0, rays.length * 4);
    device.queue.submit([encoder.finish()]);
    try {
      await readback.mapAsync(GPUMapMode.READ);
      const hits = new Uint32Array(readback.getMappedRange(0, rays.length * 4));
      const f32 = new Float32Array(hits.buffer, hits.byteOffset, hits.length);
      for (let i = 0; i < rays.length; i++) {
        out[i] = hits[i] === NO_HIT ? undefined : f32[i];
      }
      readback.unmap();
    } finally {
      for (const b of [rayBuffer, jobBuffer, hitBuffer, readback]) {
        b.destroy();
      }
    }
    return out;
  }

  /**
   * The (ray, record, first triangle, instance) jobs of a cast: each
   * candidate draw's bounding sphere is tested against each ray segment
   * on the CPU, and crossing draws are split into 64-triangle jobs.
   */
  private rayJobs(
    rays: readonly CastRay[],
    options: CastOptions,
  ): Uint32Array<ArrayBuffer> {
    const jobs: number[] = [];
    const u = this.recordsU32;
    const f = this.recordsF32;
    const mask = options.viewMask ?? ALL_VIEWS;
    const only = options.draws
      ? new Set(
          options.draws.filter((d) => this.hasDraw(d)).map((d) => d.index),
        )
      : undefined;
    const center = new Float64Array(3);
    const world = this.transformWorld;
    const test = (record: number, instance: number, radius: number) => {
      const triangles = Math.floor(u[record * RECORD_WORDS + 11]! / 3);
      rays.forEach((ray, r) => {
        const dx = center[0]! - ray.origin[0]!;
        const dy = center[1]! - ray.origin[1]!;
        const dz = center[2]! - ray.origin[2]!;
        const along =
          dx * ray.direction[0]! +
          dy * ray.direction[1]! +
          dz * ray.direction[2]!;
        if (along < -radius || along > ray.maxDistance + radius) {
          return;
        }
        if (dx * dx + dy * dy + dz * dz - along * along > radius * radius) {
          return;
        }
        for (let first = 0; first < triangles; first += 64) {
          jobs.push(r, record, first, instance);
        }
      });
    };
    for (let i = 0; i < this.drawCount; i++) {
      const batch = this.drawBatches[i];
      if (
        !batch ||
        batch.mesh.topology !== "triangle-list" ||
        (only && !only.has(i))
      ) {
        continue;
      }
      const o = i * RECORD_WORDS;
      const flags = u[o + FLAGS_WORD]!;
      if (
        flags & RecordFlags.hidden ||
        (options.collisionOnly && !(flags & RecordFlags.collision)) ||
        (!only && (u[o + VIEW_MASK_WORD]! & mask) === 0)
      ) {
        continue;
      }
      const t = u[o + TRANSFORM_WORD]!;
      if (this.transformHiddenWorld[t] === 1) {
        continue;
      }
      const w = t * 16;
      const scale = this.transforms.f32[t * TRANSFORM_WORDS + 3]!;
      const local = [f[o]!, f[o + 1]!, f[o + 2]!];
      const radius = f[o + 3]!;
      const count = u[o + INSTANCE_COUNT_WORD]!;
      if (count === 0) {
        for (let k = 0; k < 3; k++) {
          center[k] =
            world[w + k]! * local[0]! +
            world[w + 4 + k]! * local[1]! +
            world[w + 8 + k]! * local[2]! +
            world[w + 12 + k]!;
        }
        test(i, NO_RECORD, radius * scale);
        continue;
      }
      const first = u[o + INSTANCE_FIRST_WORD]!;
      const it = this.instances.f32;
      for (let j = first; j < first + count; j++) {
        const a = j * INSTANCE_WORDS;
        if (this.instances.u32[a + 14]! & 1) {
          continue;
        }
        // The instance's affine (rows), then the transform.
        const p = [0, 1, 2].map(
          (row) =>
            it[a + row * 4]! * local[0]! +
            it[a + row * 4 + 1]! * local[1]! +
            it[a + row * 4 + 2]! * local[2]! +
            it[a + row * 4 + 3]!,
        );
        for (let k = 0; k < 3; k++) {
          center[k] =
            world[w + k]! * p[0]! +
            world[w + 4 + k]! * p[1]! +
            world[w + 8 + k]! * p[2]! +
            world[w + 12 + k]!;
        }
        const instanceScale = Math.max(
          Math.hypot(it[a]!, it[a + 4]!, it[a + 8]!),
          Math.hypot(it[a + 1]!, it[a + 5]!, it[a + 9]!),
          Math.hypot(it[a + 2]!, it[a + 6]!, it[a + 10]!),
        );
        test(i, j, radius * scale * instanceScale);
      }
    }
    return Uint32Array.from(jobs);
  }

  /** Changes a draw's tint (linear RGBA, multiplied with its material). */
  setColor(handle: DrawHandle, color: ArrayLike<number>): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const o = handle.index * RECORD_WORDS;
    for (let i = 0; i < 4; i++) {
      this.recordsF32[o + 4 + i] = color[i] ?? 1;
    }
    this.markDirty(handle.index);
  }

  setVisible(handle: DrawHandle, visible: boolean): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const flagsIndex = handle.index * RECORD_WORDS + FLAGS_WORD;
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
    const draw = {
      index,
      generation: this.drawGeneration[index]!,
      name: this.names[index],
    };
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

  /**
   * Composes changed transforms, uploads materials and returns the current
   * bundle; table changes upload in the first view's cull pass.
   */
  prepareFrame(): GPURenderBundle {
    const queue = this.ctx.device.queue;
    this.flushUploads();
    this.resolveTransforms();
    this.uploadsPending = true;
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
    // A custom shader's texture loaded or changed: its groups are new.
    const generation = this.ctx.shaderBindings.generation;
    if (generation !== this.bindingsGeneration) {
      this.bindingsGeneration = generation;
      this.bundle = undefined;
      this.translucentDraws = undefined;
    }
    if (!this.bundle) {
      this.writeBatches();
      this.bundle = this.recordBundle();
    }
    this.cullParamsData[0] = this.drawCount;
    this.cullParamsData[1] = this.batchList.length;
    this.cullParamsData[2] = this.instanceHighWater;
    this.cullParamsData[3] = this.maxDraws;
    queue.writeBuffer(this.cullParams, 0, this.cullParamsData);
    return this.bundle;
  }

  /**
   * The bundle drawing this world's shadow casters (depth only, after a
   * cull for the shadow map's cascade), current with `prepareFrame`'s.
   */
  shadowBundle(): GPURenderBundle {
    if (!this.casters || this.castersFor !== this.bundle) {
      this.casters = this.recordBundle("shadow");
      this.castersFor = this.bundle;
    }
    return this.casters;
  }

  /**
   * The bundle drawing this world into the depth and normal prepass (after
   * the view's cull), current with `prepareFrame`'s.
   */
  prepassBundle(): GPURenderBundle {
    if (!this.prepassBundle_ || this.prepassFor !== this.bundle) {
      this.prepassBundle_ = this.recordBundle("prepass");
      this.prepassFor = this.bundle;
    }
    return this.prepassBundle_;
  }

  /**
   * The bundle drawing this world's depth into the opaque pass before it
   * shades (after the view's cull; no lines), current with
   * `prepareFrame`'s.
   */
  depthBundle(): GPURenderBundle {
    if (!this.depthBundle_ || this.depthFor !== this.bundle) {
      this.depthBundle_ = this.recordBundle("depth");
      this.depthFor = this.bundle;
    }
    return this.depthBundle_;
  }

  /** Encodes this world's per-view culling: clear batch counts, cull, write args. */
  encodeCull(
    encoder: GPUCommandEncoder,
    timestampWrites?: GPUComputePassTimestampWrites,
  ): void {
    const { pipelines, currentViewBindGroup } = this.ctx;
    encoder.clearBuffer(
      this.batchCountBuffer,
      0,
      Math.max(4, this.batchList.length * 4),
    );
    this.cullPassDesc.timestampWrites = timestampWrites;
    const pass = encoder.beginComputePass(this.cullPassDesc);
    // Once per frame, before any view's culling reads the tables.
    this.uploadTables(pass);
    pass.setBindGroup(0, currentViewBindGroup);
    pass.setBindGroup(1, this.cullBindGroup);
    pass.setPipeline(pipelines.cullRecords);
    pass.dispatchWorkgroups(Math.ceil(Math.max(this.drawCount, 1) / 64));
    if (this.instanceHighWater > 0) {
      pass.setPipeline(pipelines.cullInstances);
      pass.dispatchWorkgroups(Math.ceil(this.instanceHighWater / 64));
    }
    pass.setPipeline(pipelines.writeDrawArgs);
    pass.dispatchWorkgroups(Math.ceil(Math.max(this.batchList.length, 1) / 64));
    pass.end();
  }

  /** Uploads changed table entries (a scatter is encoded into `pass`). */
  private uploadTables(pass: GPUComputePassEncoder): void {
    if (!this.uploadsPending) {
      return;
    }
    this.uploadsPending = false;
    this.records.upload(pass);
    this.transforms.upload(pass);
    this.instances.upload(pass);
  }

  /**
   * How the bundle issues draws. "indirect" (default) takes per-view culling
   * from the cull kernels; "direct" bakes CPU-side draw arguments into the
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

  /** Assigns each batch its slice of the item list and uploads the batch table. */
  private writeBatches(): void {
    const table = new Uint32Array(Math.max(1, this.batchList.length) * 4);
    let items = 0;
    for (const batch of this.batchList) {
      items += batch.items;
    }
    const direct = new Uint32Array(Math.max(1, items));
    const fill = new Uint32Array(this.batchList.length);
    let base = 0;
    for (const batch of this.batchList) {
      batch.itemBase = base;
      const o = batch.index * 4;
      table[o] = base;
      table[o + 1] = batch.mesh.indexCount;
      table[o + 2] = batch.mesh.firstIndex;
      base += batch.items;
    }
    for (let i = 0; i < this.drawCount; i++) {
      const batch = this.drawBatches[i];
      if (!batch) {
        continue;
      }
      const o = i * RECORD_WORDS;
      const count = this.recordsU32[o + INSTANCE_COUNT_WORD]!;
      if (count === 0) {
        direct[batch.itemBase + fill[batch.index]!++] = i;
      } else {
        const first = this.maxDraws + this.recordsU32[o + INSTANCE_FIRST_WORD]!;
        for (let k = 0; k < count; k++) {
          direct[batch.itemBase + fill[batch.index]!++] = first + k;
        }
      }
    }
    const queue = this.ctx.device.queue;
    queue.writeBuffer(this.batchBuffer, 0, table);
    queue.writeBuffer(this.directListBuffer, 0, direct);
  }

  /**
   * One draw per batch, grouped by cull mode and texture set: the opaque
   * pass's, or the sun's shadow casters' (depth only; no lines).
   */
  private recordBundle(
    kind: "opaque" | "shadow" | "prepass" | "depth" = "opaque",
  ): GPURenderBundle {
    const { device, targets, currentViewBindGroup } = this.ctx;
    const shadow = kind === "shadow";
    const prepass = kind === "prepass";
    const depth = kind === "depth";
    const encoder = device.createRenderBundleEncoder(
      shadow || prepass
        ? {
            label: `world.${kind}Bundle`,
            colorFormats: prepass ? ["rgba16float"] : [],
            depthStencilFormat: "depth32float",
            sampleCount: 1,
          }
        : {
            label: depth ? "world.depthBundle" : "world.bundle",
            colorFormats: targets.colorFormats,
            depthStencilFormat: targets.depthFormat,
            sampleCount: targets.sampleCount,
          },
    );
    encoder.setBindGroup(
      0,
      shadow ? this.ctx.shadowViewBindGroup : currentViewBindGroup,
    );
    encoder.setBindGroup(1, this.drawBindGroup);
    encoder.setIndexBuffer(this.indexBuffer, "uint32");
    // Casters: depth, the fragment stage clipping placeholders, and where
    // a material cuts out (alpha mask) its cutoff too.
    // Blended surfaces draw their opaque parts here, cut out where they're
    // translucent (opaque.wgsl `cutOut`); the rest in the translucent
    // passes (`encodeTranslucent`). Glass lets the sun through.
    const masked = (batch: Batch) =>
      (this.materialsU32[batch.material * MATERIAL_WORDS + 12]! &
        (MaterialFlags.alphaMask | MaterialFlags.alphaBlend)) !==
      0;
    const keyOf = (batch: Batch): SurfaceKey =>
      prepass
        ? batch.doubleSided
          ? "prepassDoubleSided"
          : "prepass"
        : depth
          ? masked(batch)
            ? batch.doubleSided
              ? "depthMaskedDoubleSided"
              : "depthMasked"
            : batch.doubleSided
              ? "depthDoubleSided"
              : "depth"
          : shadow
            ? masked(batch)
              ? batch.doubleSided
                ? "shadowMaskedDoubleSided"
                : "shadowMasked"
              : batch.doubleSided
                ? "shadowDoubleSided"
                : "shadow"
            : batch.mesh.topology === "line-list"
              ? "opaqueLines"
              : batch.doubleSided
                ? "opaqueDoubleSided"
                : "opaque";
    const rank = (batch: Batch) =>
      batch.mesh.topology === "line-list" ? 2 : Number(batch.doubleSided);
    const order = [...this.batchList].sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.shader?.id ?? 0) - (b.shader?.id ?? 0) ||
        a.textureSet - b.textureSet,
    );
    const direct = this._submission === "direct";
    const list = direct ? this.directListBuffer : this.itemListBuffer;
    let pipeline: GPURenderPipeline | undefined;
    let group: GPUBindGroup | undefined;
    for (const batch of order) {
      if (
        batch.items === 0 ||
        ((shadow || prepass || depth) && batch.mesh.topology === "line-list")
      ) {
        continue;
      }
      const key = keyOf(batch);
      const wanted = this.pipeline(batch, key);
      if (wanted !== pipeline) {
        pipeline = wanted;
        encoder.setPipeline(pipeline);
      }
      const wantedGroup = this.setGroup(batch, wanted, key);
      if (wantedGroup !== group) {
        group = wantedGroup;
        encoder.setBindGroup(2, group);
      }
      encoder.setVertexBuffer(0, list, batch.itemBase * 4);
      if (direct) {
        encoder.drawIndexed(
          batch.mesh.indexCount,
          batch.items,
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

  /**
   * A batch's pipeline for a pass: its custom shader's once made, else the
   * engine's (then recorded again when it is ready).
   */
  private pipeline(batch: Batch, key: SurfaceKey): GPURenderPipeline {
    return (
      (batch.shader &&
        this.ctx.shaders.pipeline(batch.shader, key, this.shaderReady)) ??
      this.ctx.pipelines[key]
    );
  }

  /**
   * A batch's group 2: its texture set's, or with its custom shader's
   * pipeline (not the engine's stand-in) and uniforms, beside the shader's.
   */
  private setGroup(
    batch: Batch,
    pipeline: GPURenderPipeline,
    key: SurfaceKey,
  ): GPUBindGroup {
    const shader = batch.shader;
    const plain = this.textureSets[batch.textureSet]!;
    if (!shader || pipeline === this.ctx.pipelines[key]) {
      return plain;
    }
    const layout = this.ctx.pipelines.setLayout(shader);
    if (!layout) {
      return plain;
    }
    const own = this.ctx.shaderBindings.entries(shader);
    const groupKey = `${batch.textureSet}|${shader.id}|${own.version}`;
    let group = this.shaderGroups.get(groupKey);
    if (!group) {
      group = this.ctx.device.createBindGroup({
        label: `world.textureSet ${shader.label}`,
        layout,
        entries: [...this.textureSetEntries[batch.textureSet]!, ...own.entries],
      });
      // Older versions of this shader's group are unused now.
      for (const k of this.shaderGroups.keys()) {
        if (k.startsWith(`${batch.textureSet}|${shader.id}|`)) {
          this.shaderGroups.delete(k);
        }
      }
      this.shaderGroups.set(groupKey, group);
    }
    return group;
  }

  /** A custom shader's pipeline is ready: draw with it from now on. */
  private readonly shaderReady = () => {
    this.bundle = undefined;
    this.version++;
    this.changedViews = ALL_VIEWS;
  };

  /** A batch of blended triangles (alpha mode "BLEND"); lines stay opaque. */
  private translucent(batch: Batch): boolean {
    return (
      batch.mesh.topology !== "line-list" &&
      (this.materialsU32[batch.material * MATERIAL_WORDS + 12]! &
        MaterialFlags.alphaBlend) !==
        0
    );
  }

  /**
   * The nearest and farthest a blended surface may be from `eye` (their
   * draws' bounding spheres, shown or not, as of the last `prepareFrame`),
   * m; undefined without any.
   */
  translucentRange(
    eye: ArrayLike<number>,
  ): { near: number; far: number } | undefined {
    if (!this.translucentDraws) {
      this.translucentDraws = [];
      for (let i = 0; i < this.drawCount; i++) {
        const batch = this.drawBatches[i];
        if (batch && this.translucent(batch)) {
          this.translucentDraws.push(i);
        }
      }
    }
    if (this.translucentDraws.length === 0) {
      return undefined;
    }
    const u = this.recordsU32;
    const f = this.recordsF32;
    const world = this.transformWorld;
    let near = Infinity;
    let far = 0;
    const sphere = (x: number, y: number, z: number, radius: number) => {
      const d = Math.hypot(x - eye[0]!, y - eye[1]!, z - eye[2]!);
      near = Math.min(near, d - radius);
      far = Math.max(far, d + radius);
    };
    for (const i of this.translucentDraws) {
      const o = i * RECORD_WORDS;
      const t = u[o + TRANSFORM_WORD]!;
      if (
        u[o + FLAGS_WORD]! & RecordFlags.hidden ||
        this.transformHiddenWorld[t] === 1
      ) {
        continue;
      }
      const w = t * 16;
      const scale = this.transforms.f32[t * TRANSFORM_WORDS + 3]!;
      const local = [f[o]!, f[o + 1]!, f[o + 2]!];
      const point = (p: readonly number[], k: number) =>
        world[w + k]! * p[0]! +
        world[w + 4 + k]! * p[1]! +
        world[w + 8 + k]! * p[2]! +
        world[w + 12 + k]!;
      const count = u[o + INSTANCE_COUNT_WORD]!;
      if (count === 0) {
        sphere(
          point(local, 0),
          point(local, 1),
          point(local, 2),
          f[o + 3]! * scale,
        );
        continue;
      }
      const first = u[o + INSTANCE_FIRST_WORD]!;
      const it = this.instances.f32;
      for (let j = first; j < first + count; j++) {
        const a = j * INSTANCE_WORDS;
        if (this.instances.u32[a + 14]! & 1) {
          continue;
        }
        const p = [0, 1, 2].map(
          (row) =>
            it[a + row * 4]! * local[0]! +
            it[a + row * 4 + 1]! * local[1]! +
            it[a + row * 4 + 2]! * local[2]! +
            it[a + row * 4 + 3]!,
        );
        const instanceScale = Math.max(
          Math.hypot(it[a]!, it[a + 4]!, it[a + 8]!),
          Math.hypot(it[a + 1]!, it[a + 5]!, it[a + 9]!),
          Math.hypot(it[a + 2]!, it[a + 6]!, it[a + 10]!),
        );
        sphere(
          point(p, 0),
          point(p, 1),
          point(p, 2),
          f[o + 3]! * scale * instanceScale,
        );
      }
    }
    return far > 0 ? { near: Math.max(near, 0), far } : undefined;
  }

  /**
   * Encodes this world's blended surfaces into a translucent pass (after
   * the view's cull): the pass's pipeline (`keyOf`, one- or double-sided)
   * from each batch's shader, and its group 3. Encoded directly, not
   * bundled: group 3 is per view.
   */
  encodeTranslucent(
    pass: GPURenderPassEncoder,
    keyOf: (doubleSided: boolean) => SurfaceKey,
    group: GPUBindGroup,
  ): void {
    pass.setBindGroup(0, this.ctx.currentViewBindGroup);
    pass.setBindGroup(1, this.drawBindGroup);
    pass.setBindGroup(3, group);
    pass.setIndexBuffer(this.indexBuffer, "uint32");
    const direct = this._submission === "direct";
    const list = direct ? this.directListBuffer : this.itemListBuffer;
    let current: GPURenderPipeline | undefined;
    let bound: GPUBindGroup | undefined;
    for (const batch of this.batchList) {
      if (batch.items === 0 || !this.translucent(batch)) {
        continue;
      }
      const key = keyOf(batch.doubleSided);
      const wanted = this.pipeline(batch, key);
      if (wanted !== current) {
        current = wanted;
        pass.setPipeline(wanted);
      }
      const wantedGroup = this.setGroup(batch, wanted, key);
      if (wantedGroup !== bound) {
        bound = wantedGroup;
        pass.setBindGroup(2, bound);
      }
      pass.setVertexBuffer(0, list, batch.itemBase * 4);
      if (direct) {
        pass.drawIndexed(
          batch.mesh.indexCount,
          batch.items,
          batch.mesh.firstIndex,
          0,
          0,
        );
      } else {
        pass.drawIndexedIndirect(
          this.indirectBuffer,
          batch.index * INDIRECT_SIZE,
        );
      }
    }
  }

  private createDrawBindGroup(): void {
    const buffers = [
      this.recordBuffer,
      this.itemBuffer,
      this.vertexBuffer,
      this.materialBuffer,
      this.clipBuffer,
    ];
    this.drawBindGroup = this.ctx.device.createBindGroup({
      label: "world.draw",
      layout: this.ctx.pipelines.drawWorldLayout,
      entries: [
        ...buffers.map((b, binding) => ({ binding, resource: { buffer: b } })),
        { binding: 5, resource: this.imageryView },
        { binding: 6, resource: this.imagerySampler },
        { binding: 7, resource: this.lightsView },
      ],
    });
  }

  private markDirty(index: number): void {
    this.records.mark(index);
    this.uploadsPending = true;
    this.version++;
    this.changedViews |=
      this.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD]!;
  }

  destroy(): void {
    for (const chunk of this.uploadChunks) {
      chunk.buffer.destroy();
    }
    this.records.destroy();
    this.transforms.destroy();
    this.instances.destroy();
    for (const buffer of [
      this.vertexBuffer,
      this.indexBuffer,
      this.itemBuffer,
      this.materialBuffer,
      this.clipBuffer,
      this.itemListBuffer,
      this.directListBuffer,
      this.batchCountBuffer,
      this.batchBuffer,
      this.indirectBuffer,
      this.cullParams,
    ]) {
      buffer.destroy();
    }
  }
}

/** Hit distance bits meaning "no hit" (the largest finite float). */
const NO_HIT = 0x7f7fffff;
/** Smallest staging buffer for queued uploads. */
const UPLOAD_CHUNK_BYTES = 1 << 20;
/** CPU rows a per-slot table starts with. */
const INITIAL_ROWS = 1024;

/** Rows after growing from `rows` to hold `count`: doubling, capped. */
function grownSize(rows: number, count: number, capacity: number): number {
  return Math.min(capacity, Math.max(count, rows * 2));
}

/** A copy of `array` with `length` elements, the new ones `fill`. */
function resized<
  T extends Uint8Array | Uint32Array | Int32Array | Float64Array,
>(array: T, length: number, fill = 0): T {
  const out = new (array.constructor as new (length: number) => T)(length);
  out.set(array);
  if (fill !== 0) {
    out.fill(fill, array.length);
  }
  return out;
}
const IDENTITY = Float64Array.of(
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
);
const ZERO = Float64Array.of(0, 0, 0);

/** out[o..o+16) = a[ao..] × b[bo..] (column-major); `out` may alias `a`'s slot only via distinct offsets. */
function multiplyInto(
  out: Float64Array,
  o: number,
  a: Float64Array,
  ao: number,
  b: Float64Array,
  bo: number,
): void {
  for (let c = 0; c < 4; c++) {
    const b0 = b[bo + c * 4]!;
    const b1 = b[bo + c * 4 + 1]!;
    const b2 = b[bo + c * 4 + 2]!;
    const b3 = b[bo + c * 4 + 3]!;
    for (let r = 0; r < 4; r++) {
      out[o + c * 4 + r] =
        a[ao + r]! * b0 +
        a[ao + 4 + r]! * b1 +
        a[ao + 8 + r]! * b2 +
        a[ao + 12 + r]! * b3;
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
