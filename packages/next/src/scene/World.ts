import {
  onTextureDestroyed,
  textureOf,
  isDestroyed,
} from "../gpu/textureTracking.ts";
import { RangeAllocator } from "../gpu/RangeAllocator.ts";
import { CapacityError } from "./CapacityError.ts";
import { Slabs, type Slab } from "./Slabs.ts";
import {
  INITIAL_ROWS,
  MirroredTable,
  grownSize,
  resized,
} from "./MirroredTable.ts";
import { DrawConstants } from "../render/drawConstants.ts";
import { DrawArguments } from "../render/drawArguments.ts";
import {
  checkParameterValue,
  checkPlacement,
  maxDisplacement,
  type FittedOperation,
  type Placement,
  type PlacementParameter,
} from "./placement.ts";
import { PlacementTable } from "./placementTable.ts";
import {
  INSTANCE_WORDS,
  INSTANCE_COUNT_WORD,
  INSTANCE_STRIDE_WORD,
  INSTANCE_FIRST_WORD,
  MATERIAL_SIZE,
  NO_FEATURE,
  NO_RECORD,
  NO_STREAM,
  COMPONENT_TYPE_CODES,
  PROPERTY_TEXTURES,
  PROPERTY_TEXTURE_BINDING,
  TABLE_PROPERTY,
  instanceDistanceFlags,
  TEXTURE_PROPERTY,
  TEXTURE_PROPERTY_WORDS,
  attributeHash,
  metadataKey,
  DRAW_ITEM_SIZE,
  RECORD_WORDS,
  TRANSFORM_WORDS,
  TRANSFORM_WORD,
  RADIUS_WORD,
  CENTER_WORD,
  NO_PLACEMENT,
  FLAGS_WORD,
  VIEW_MASK_WORD,
  ALL_VIEWS,
  CLIP_BOXES,
  CLIP_BOX_FLOATS,
  CLIP_BLOCK_ROWS,
  MAX_ANCHORS,
  MAX_TERRAIN_CLIPS,
  MAX_TERRAIN_CLIP_BLOCKS,
  packClip,
  MATERIAL_WORDS,
  NO_TEXTURE,
  MaterialFlags,
  RecordFlags,
  packTint,
  writeInstance,
  writeMaterial,
  writeTransform,
  type MaterialData,
  type MeshStreams,
} from "../render/layout.ts";
import { rigidMatrixError, splitHigh, splitVec3 } from "../math/transforms.ts";
import { bodyKey, type Body } from "./Body.ts";
import type { FrameKey } from "../camera/frameResolver.ts";
import { TerrainClipError } from "../globe/terrainClip.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { MeshData } from "./meshes.ts";
import type { FeatureTable, FeatureValue } from "../io/gltfTypes.ts";
import { featureName, featureProperties } from "../io/features.ts";
import type { RenderContext, SurfaceKey } from "./RenderContext.ts";
import type { CustomShader } from "./CustomShader.ts";
import { PointCuller } from "./PointCuller.ts";
import type { UniformDeclaration } from "./uniforms.ts";
import type { LightHandle, LightOptions } from "./lights.ts";
import {
  NO_ACCELERATION,
  type AccelerationStructures,
} from "../streaming/acceleration.ts";

/**
 * A world's ceilings (CESIUM2_WEBGPU_PLAN.md §13.15, "Growable tables"):
 * every per-slot GPU table starts small and doubles as slots are used, up to
 * these and to what the device's largest storage binding holds. A pool at
 * its ceiling throws `CapacityError`, which streaming answers by evicting
 * (`World.pressure` lets it act before then).
 */
export interface WorldOptions {
  /** Draw records (default 262,144). */
  maxDraws?: number;
  /** Distinct materials, after sharing (default 65,536). */
  maxMaterials?: number;
  /**
   * Geometry budgets across the world's slabs (default 1 GiB of vertex
   * data, 512 MiB of indices). Slabs start small, grow and multiply up to
   * these; none holds more than one storage binding.
   */
  vertexBytes?: number;
  indexBytes?: number;
  /**
   * The most one slab's vertex or index buffer holds (default 256 MiB,
   * and never past the device's largest storage binding).
   */
  slabBytes?: number;
  /**
   * Clip blocks, of 8 boxes each (default 16,384, at least 2). Block 0 is
   * the terrain clip regions' directory. A quarter of the rest, at most
   * 3,840 blocks (32 regions of `MAX_TERRAIN_CLIP_BLOCKS`), is set aside
   * for terrain clip regions (`Tileset3D.addTerrainClip`); the others
   * hold mixed-LOD placeholders, a block for each placeholder tile drawn
   * at once (12,544 by default).
   */
  maxClipBlocks?: number;
  /** Transform table entries (default: `maxDraws`). */
  maxTransforms?: number;
  /** Point draws culled at once (default 4096). */
  maxPointSets?: number;
  /**
   * Instance table entries, shared by all instanced draws (default 16384).
   * The GPU tables start at 16,384 rows (or fewer) and double as used up to
   * this, within the device's buffer limits (80 bytes an item, draws
   * first).
   */
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

/**
 * A world's pools against their ceilings (CESIUM2_WEBGPU_PLAN.md §13.15):
 * tables count rows, the arenas bytes against the world's budgets.
 */
export interface WorldMemory {
  vertexBytes: Usage;
  indexBytes: Usage;
  draws: Usage;
  transforms: Usage;
  instances: Usage;
  /** Distinct materials (shared by content), against the ceiling. */
  materials: Usage;
  /** Mixed-LOD placeholders' clip blocks. */
  clipBlocks: Usage;
  /** Terrain clip regions' clip blocks, against those set aside for them. */
  terrainClipBlocks: Usage;
  pointSets: Usage;
  batches: number;
  /** The GPU tables' buffers (records, transforms, instances, materials, lists, args), as grown. */
  tableBytes: number;
  /** The geometry slabs: their buffers' sizes and what's in use. */
  slabs: Array<{
    id: number;
    vertexBytes: number;
    vertexUsed: number;
    indexBytes: number;
    indexUsed: number;
  }>;
  /** The largest slab buffer allowed (one storage binding at most). */
  slabBytes: number;
}

export interface MeshHandle {
  readonly id: number;
  /**
   * The slab holding its geometry (scene/Slabs.ts): its streams' and
   * indices' offsets are the slab's, and so are its draws' instance
   * streams, feature table columns and point lists.
   */
  readonly slab: number;
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

/**
 * A point set's mesh (`World.addPointMesh`): `capacity` anchors in the
 * arena and the points' property streams beside them.
 */
export interface PointMesh extends MeshHandle {
  readonly points: {
    readonly capacity: number;
    /** Arena word of point 0's anchor (x, y, z and a fourth float). */
    readonly anchors: number;
    /** Arena word of point 0's properties, `stride` words a point. */
    readonly streams: number;
    readonly stride: number;
    /** Arena word of the properties' directory (NO_STREAM: none). */
    readonly directory: number;
  };
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
  /**
   * Up to 2 `EXT_structural_metadata` property textures (read with
   * `textureLoad`, no filtering), for the meshes' `propertyTextures` slots.
   */
  properties?: Array<TextureBinding | undefined>;
}

export type MaterialOptions = Partial<MaterialData>;

export interface DrawOptions {
  mesh: MeshHandle;
  /**
   * Where the draw is (`addTransform`), shared with other draws. Without
   * it, `origin` and `model` place the draw and it owns its transform.
   */
  transform?: TransformHandle;
  /**
   * What the transform the draw owns (placed by `origin` and `model`)
   * hangs under: an anchor (`addAnchor`, `bodyAnchor`) or any transform.
   * Without it the draw is under no anchor, in render space, as every draw
   * was before anchors. Not with `transform`.
   */
  parent?: TransformHandle;
  /**
   * Float64 origin of `model` (without `transform`), relative to `parent`:
   * Earth-fixed under the Earth's anchor.
   */
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
  /**
   * Draws the mesh as a billboard (`createBillboard`): facing the camera,
   * its model xy after the custom vertex stage are pixel offsets from the
   * instance's (or draw's) position, times `size` and the instance's
   * scale. Unlit, casting no shadows. Within `depthTestDistance` meters
   * of the camera it draws in front of everything (1.x
   * `disableDepthTestDistance`; default 0, depth-tested).
   */
  billboard?: { size: number; depthTestDistance?: number };
  /**
   * Ground for height captures (default true); false for what clamps to
   * the ground itself (tracks), so it doesn't land on itself.
   */
  ground?: boolean;
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
   * Drawn only within this distance (m, up to 65,504) of each view's
   * camera, per instance; or only beyond `visibleBeyond`. Two draws with
   * the same distance switch representations (a model up close, a
   * billboard from afar).
   */
  visibleWithin?: number;
  visibleBeyond?: number;
  /**
   * Per-instance data for custom shaders: `stride` 32-bit words per
   * instance, uploaded to the arena and read by instance index the way
   * vertex streams are (`DrawRecord.instanceStreams`).
   */
  streams?: {
    data: Float32Array | Uint32Array;
    stride: number;
    /**
     * Named fields of each instance's `stride` words, read by custom
     * shaders that declare them (`CustomShaderOptions.instance`): the word
     * offset within an instance and components (1–4).
     */
    layout?: Record<string, { offset: number; components: number }>;
  };
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
  /** Float64 origin, in the cast's anchor's coordinates (`CastOptions.anchor`). */
  origin: ArrayLike<number>;
  /** Unit direction, in the anchor's axes. */
  direction: ArrayLike<number>;
  /** Hits beyond it are ignored (meters). */
  maxDistance: number;
}

export interface CastOptions {
  /**
   * The anchor whose coordinates the rays are in (Earth-fixed for the
   * Earth's anchor, `bodyAnchor`); only draws under it are tested. Default:
   * none, the transform table's root and the draws under no anchor.
   */
  anchor?: AnchorHandle;
  /** Only draws marked `collision` (tilesets with `enableCollision`). */
  collisionOnly?: boolean;
  /** Only draws some of these views draw (default: any). */
  viewMask?: number;
  /**
   * Only these draws, drawn or not (content loaded for a query); the view
   * mask is not checked. Each must hang under the cast's `anchor` (or under
   * none without one): a draw under another throws, naming both.
   */
  draws?: readonly DrawHandle[];
  /**
   * @internal Not the draws in the slots it is true for (height clamping
   * leaves the globes' out).
   */
  exclude?: (draw: number) => boolean;
}

/** A placement in the world's transform table (`addTransform`). */
export interface TransformHandle {
  readonly index: number;
  readonly generation: number;
}

/**
 * A top-level transform whose placement in render space is set per view
 * (`View.setAnchorPlacement`); content under it keeps its anchor-relative
 * transforms (spec section 7.4). Its own matrix is the identity, forever.
 * It names a reference frame: a body's fixed axes for a body anchor.
 */
export interface AnchorHandle extends TransformHandle, FrameKey {
  /** Its slot in each view's anchor table, 1 to `MAX_ANCHORS` - 1. */
  readonly slot: number;
  /** The body it belongs to (`World.bodyAnchor`), if any. */
  readonly body?: Body;
}

/** A transform node as a reference frame (`World.frameOf`). */
export interface TransformFrameKey extends FrameKey {
  readonly world: World;
  readonly transform: TransformHandle;
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
  /** Billboards: not in the shadow and ambient-occlusion passes. */
  billboard: boolean;
  /** A point set's: drawn without indices, six vertices per point. */
  points: boolean;
  /** Its draws have instances: outside the opaque pass's depth prepass. */
  instanced: boolean;
  /** Draw items: records without instances plus instances. */
  items: number;
  itemBase: number;
  /**
   * Its records some view draws (a view mask not 0). The bundles skip a
   * batch with none: a streamed tile kept in the cache but not selected
   * would otherwise cost an empty indirect draw in every pass, and its
   * bundles' recording, for as long as it stays resident.
   */
  shown: number;
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
  /** Geometry, in slabs of one storage binding each (scene/Slabs.ts). */
  readonly slabs: Slabs;
  // Per-slot CPU tables (records, transforms, instances, materials) start
  // small and grow as slots are used; the GPU tables are full size (a
  // 65536-draw world's CPU tables held 37 MB on NYC, r39).
  /**
   * @internal The draw records (the per-draw constants seam): every
   * record write goes through it.
   */
  readonly drawConstants: DrawConstants;
  /** The records' words, to read (written through `drawConstants`). */
  private get recordsU32(): ArrayLike<number> {
    return this.drawConstants.u32;
  }
  private get recordsF32(): ArrayLike<number> {
    return this.drawConstants.f32;
  }
  /** Generation per draw slot (`DrawHandle.generation`). */
  private drawGeneration: Uint32Array;
  /** Transform a draw owns (placed by origin and model), or -1. */
  private drawOwnedTransform: Int32Array;
  /** Per-instance stream ranges in their mesh's slab, by draw slot. */
  private readonly instanceStreamRanges: Array<
    [offset: number, size: number, dataBytes: number, slab: number] | undefined
  > = [];

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
  /**
   * The anchor slot a transform hangs under (0: none), inherited from its
   * parent; an anchor's own slot for an anchor.
   */
  private transformAnchor: Uint8Array;
  /** Anchors by slot; slot 0 ("no anchor") stays empty. */
  private readonly anchorSlots: Array<AnchorHandle | undefined> = [];
  /** Anchors' places in the table root, by slot (16 float64 each). */
  private readonly anchorPlaces = new Float64Array(MAX_ANCHORS * 16);
  private readonly bodyAnchors = new Map<string, AnchorHandle>();
  private anchorList: readonly AnchorHandle[] | undefined;
  /** `frameOf`'s keys by transform slot. */
  private readonly transformFrames = new Map<number, TransformFrameKey>();
  /**
   * The transform table's own top level, where transforms under no anchor
   * sit (render space, as every draw was before anchors).
   */
  readonly root: FrameKey = Object.freeze({ name: "transform table" });
  /**
   * Counts changes that move a transform node or an anchor in the table
   * root: `setTransform`, `placeAnchor` and removals. The core's frame
   * resolver (`tableResolver`) reports it as the revision of any route
   * through a node (`frameOf`).
   */
  get transformRevision(): number {
    return this.transformRevision_;
  }
  private transformRevision_ = 0;
  /**
   * Counts changes to the anchors' places in the table root: `placeAnchor`
   * and `removeAnchor` only. A route between anchors and the root changes
   * only with it, so animating a node re-places no anchor.
   */
  get anchorPlaceRevision(): number {
    return this.anchorPlaceRevision_;
  }
  private anchorPlaceRevision_ = 0;
  /**
   * Counts changes to what a ray may meet: draws added and removed
   * (`addDraw`, `removeDraw`), a draw's views changed (`setViewMask`, as
   * selections show and hide cached tiles), and terrain clip regions added
   * or removed. The query interface reports it as the revision of what a
   * ray may meet (`Engine.queries`).
   */
  get contentRevision(): number {
    return this.contentRevision_;
  }
  private contentRevision_ = 0;
  /**
   * The acceleration-structure lifetime hook (spec section 7.10): told of
   * each draw added and removed here, and of each tile placed and unloaded
   * by the world's tilesets. A no-op by default; a ray-query engine sets
   * its own.
   */
  acceleration: AccelerationStructures = NO_ACCELERATION;
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
  /**
   * The placements buffer (plan 5a's call 42): parameters and each placed
   * draw's block, bound in the draw group for the vertex stage.
   */
  private readonly placementTable: PlacementTable;
  /** Each draw's per-vertex placement, by draw slot (`setPlacement`). */
  private readonly drawPlacements: Array<DrawPlacement | undefined> = [];
  /** This world's placement parameters: their float and their draws. */
  private readonly parameters = new WeakMap<
    PlacementParameter,
    ParameterSlot
  >();
  private readonly frameComputes: Array<(pass: GPUComputePassEncoder) => void> =
    [];
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
   * bits; a material change, every view. A change wakes the engine's
   * frame loop (`RenderContext.wake`).
   */
  get changedViews(): number {
    return this.changedViews_;
  }
  set changedViews(views: number) {
    this.changedViews_ = views;
    // Every change, not only the first since a frame: a frame that failed
    // leaves the bits set, and the loop must still wake (`wake` is cheap
    // once a frame is asked for).
    if (views !== 0) {
      this.ctx.wake();
    }
  }
  private changedViews_ = 0;
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
  /** Shared materials: slot by record key, key and references by slot. */
  private readonly materialByKey = new Map<string, number>();
  private readonly materialKeys: Array<string | undefined> = [];
  private readonly materialReferences: number[] = [];
  private readonly materialScratch = (() => {
    const data = new ArrayBuffer(MATERIAL_SIZE);
    return { f32: new Float32Array(data), u32: new Uint32Array(data) };
  })();
  private readonly batches = new Map<string, Batch>();
  private readonly batchList: Batch[] = [];
  /** Emptied batches, reused (index kept) so live records stay valid. */
  private readonly freeBatches: Batch[] = [];
  private readonly drawBatches: Array<Batch | undefined> = [];
  /** Slab ranges per mesh id, as [byte offset, byte size]. */
  private readonly meshRanges = new Map<
    number,
    {
      slab: number;
      vertex: Array<[number, number]>;
      index: [number, number];
      /** Its feature table's columns (`tableColumns`), shared. */
      table?: FeatureTable;
      /** Its named attributes' components (a dual position's check). */
      named?: Map<string, number>;
    }
  >();
  /**
   * Feature tables' columns in the arena (directory entries: hash, offset,
   * components with `TABLE_PROPERTY`), shared by the meshes using them.
   */
  private readonly tableColumns = new Map<
    string,
    { entries: number[][]; ranges: Array<[number, number]>; meshes: number }
  >();
  /** An id per feature table object, for `tableColumns`' slab keys. */
  private readonly tableIds = new WeakMap<FeatureTable, number>();
  private nextTableId = 1;
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
  /**
   * Block 0 is the terrain clip regions' directory (`addTerrainClipRegion`),
   * reserved so the shaders find it without a binding of its own. Blocks
   * past it are placeholders' (one each) or terrain regions' (runs); each
   * kind keeps its own free list, so placeholders don't break up the runs
   * regions free.
   */
  private clipBlockCount = 1;
  /** Placeholders' free blocks. */
  private readonly freeClipBlocks: number[] = [];
  /** Blocks placeholders hold, and the most they may. */
  private placeholderBlocks = 0;
  private readonly placeholderCapacity: number;
  /** Free runs terrain regions left: sorted by block, never touching. */
  private readonly freeClipRuns: Array<{ block: number; blocks: number }> = [];
  /** Blocks terrain regions hold, and the most they may. */
  private terrainClipBlocks = 0;
  private readonly terrainClipBudget: number;
  /**
   * Terrain clip regions by slot: their first block, block count and rows
   * (kept to move them: only the directory points at them).
   */
  private readonly terrainClipRuns: Array<
    { block: number; blocks: number; rows: Float32Array } | undefined
  > = [];
  private readonly clipScratch = new Float32Array(CLIP_BOXES * CLIP_BOX_FLOATS);
  private nextMeshId = 0;
  private drawCount = 0;
  private bundle?: GPURenderBundle;
  /**
   * A batch gained its first shown record or lost its last (`Batch.shown`):
   * the bundles are recorded again, without rewriting the batch table.
   */
  private batchesShownChanged = false;
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

  /** Replaced as the tables grow (`tableGeneration`). */
  recordBuffer: GPUBuffer;
  transformBuffer: GPUBuffer;
  /** Replaced when the instance table grows (`instanceGeneration`). */
  instanceBuffer: GPUBuffer;
  /** Per draw item and view: its camera-relative matrix and record (cull). */
  itemBuffer: GPUBuffer;
  materialBuffer: GPUBuffer;
  /** Mixed-LOD clip boxes, `CLIP_BOXES` per block. */
  clipBuffer: GPUBuffer;
  /**
   * @internal The draw arguments, the item lists and the batches' draws
   * (the draw-arguments seam).
   */
  readonly drawArguments: DrawArguments;
  /**
   * Counts table growths: whatever binds a world table's buffer (the
   * instance table, records, transforms, materials) rebinds when it
   * changes. Bindless: with resource tables the buffers would stay bound by
   * index and only this counter's users change.
   */
  instanceGeneration = 0;
  /** `instanceGeneration` by its general name. */
  get tableGeneration(): number {
    return this.instanceGeneration;
  }
  /** Point draws by draw index: their per-view cull (pointCull.slang). */
  private readonly pointDraws = new Map<number, PointDraw>();
  private pointCounts: GPUBuffer;
  private readonly freePointCounters: number[] = [];
  /** A view's point splats, a word per pixel each (pointCull.slang). */
  private splats: {
    pixels: number;
    depth: GPUBuffer;
    color: GPUBuffer;
    feature: GPUBuffer;
    group: GPUBindGroup;
  };
  private batchBuffer: GPUBuffer;
  /**
   * GPU rows of the draw tables (records, batches, their counts and
   * arguments, the items' draw part); grows to `maxDraws`.
   */
  private drawRows: number;
  /** GPU rows of the material table; grows to `maxMaterials`. */
  private materialRows: number;
  /** GPU blocks of clip boxes; grows to `maxClipBlocks`. */
  private clipRows: number;
  readonly maxPointSets: number;
  private pointSetCount = 0;
  private readonly cullParams: GPUBuffer;
  private cullBindGroup!: GPUBindGroup;
  private pointCullBindGroup!: GPUBindGroup;
  /** Globe imagery array (a 1×1 placeholder until imagery is attached). */
  private imageryView: GPUTextureView;
  /** Bound while no imagery array is (no globe imagery in this world). */
  private readonly imageryPlaceholder: GPUTextureView;
  /** Each texture set's (tracked) textures, for `textureDestroyed`. */
  private readonly textureSetTextures: Array<GPUTexture[] | undefined> = [];
  private readonly setsOfTexture = new WeakMap<GPUTexture, Set<number>>();
  /**
   * Texture sets binding a destroyed texture: their batches are skipped
   * (a bind group naming a destroyed texture fails the whole submit).
   */
  private readonly brokenTextureSets = new Set<number>();
  private readonly stopTracking: () => void;
  private readonly imagerySampler: GPUSampler;

  constructor(
    private readonly ctx: RenderContext,
    options: WorldOptions = {},
  ) {
    const device = ctx.device;
    // Ceilings: the option, and what one storage binding holds (the
    // device's capacity limits; the tables start small and grow to them).
    const limits = ctx.device.limits;
    const binding = Math.min(
      limits.maxStorageBufferBindingSize,
      limits.maxBufferSize,
    );
    const fits = (rowBytes: number) => Math.floor(binding / rowBytes);
    // Rows the item buffer (80 bytes each, draws first) can address.
    const itemLimit = fits(DRAW_ITEM_SIZE);
    this.maxDraws = Math.min(
      options.maxDraws ?? 1 << 18,
      fits(RECORD_WORDS * 4),
      Math.floor(itemLimit / 2),
    );
    this.maxTransforms = Math.min(
      options.maxTransforms ?? this.maxDraws,
      fits(TRANSFORM_WORDS * 4),
    );
    this.maxMaterials = Math.min(
      options.maxMaterials ?? 1 << 16,
      fits(MATERIAL_SIZE),
    );
    this.maxPointSets = options.maxPointSets ?? 4096;
    this.drawRows = Math.min(this.maxDraws, INITIAL_ROWS);
    this.materialRows = Math.min(this.maxMaterials, INITIAL_ROWS);
    this.maxInstances = Math.min(
      options.maxInstances ?? 16384,
      itemLimit - this.maxDraws,
    );
    const instanceRows = Math.max(1, Math.min(this.maxInstances, 16384));
    const items = this.drawRows + instanceRows;
    // A slab is one storage binding at most, and 256 MiB (growing to it).
    this.slabs = new Slabs(
      device,
      {
        vertexBudget: options.vertexBytes ?? 1 << 30,
        indexBudget: options.indexBytes ?? 1 << 29,
        slabCap: Math.min(binding, options.slabBytes ?? 256 << 20),
      },
      () => this.flushUploads(),
      (slab) => this.slabReplaced(slab),
    );

    this.drawConstants = new DrawConstants(ctx, this.maxDraws, this.drawRows);
    this.drawGeneration = new Uint32Array(this.drawConstants.rows);
    this.drawOwnedTransform = new Int32Array(this.drawConstants.rows).fill(-1);
    this.transforms = new MirroredTable(
      ctx,
      "transforms",
      TRANSFORM_WORDS,
      this.maxTransforms,
      Math.min(this.maxTransforms, INITIAL_ROWS),
    );
    const t = this.transforms.rows;
    this.transformLocal = new Float64Array(t * 16);
    this.transformWorld = new Float64Array(t * 16);
    this.transformParent = new Int32Array(t).fill(-1);
    this.transformGeneration = new Uint32Array(t);
    this.transformLive = new Uint8Array(t);
    this.transformHidden = new Uint8Array(t);
    this.transformHiddenWorld = new Uint8Array(t);
    this.transformAnchor = new Uint8Array(t);
    this.transformPendingFlag = new Uint8Array(t);
    this.transformStamp = new Uint32Array(t);
    this.instances = new MirroredTable(
      ctx,
      "instances",
      INSTANCE_WORDS,
      Math.max(1, this.maxInstances),
      instanceRows,
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
    this.recordBuffer = this.drawConstants.buffer;
    this.transformBuffer = this.transforms.buffer;
    this.instanceBuffer = this.instances.buffer;
    // COPY_SRC lets precision tests read back the cull kernels' output.
    this.itemBuffer = buffer(
      "items",
      items * DRAW_ITEM_SIZE,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    );
    // Grows with the CPU mirror (`addMaterial`), rewritten when changed.
    this.materialBuffer = buffer(
      "materials",
      this.materialRows * MATERIAL_SIZE,
      storage,
    );
    this.maxClipBlocks = Math.max(
      2,
      Math.min(
        options.maxClipBlocks ?? 1 << 14,
        fits(this.clipScratch.byteLength),
      ),
    );
    this.terrainClipBudget = Math.min(
      MAX_TERRAIN_CLIPS * MAX_TERRAIN_CLIP_BLOCKS,
      Math.floor((this.maxClipBlocks - 1) / 4),
    );
    this.placeholderCapacity = this.maxClipBlocks - 1 - this.terrainClipBudget;
    this.clipRows = Math.min(this.maxClipBlocks, 256);
    // COPY_SRC: copied into a larger buffer as it grows.
    this.clipBuffer = buffer(
      "clipBoxes",
      this.clipRows * this.clipScratch.byteLength,
      storage | GPUBufferUsage.COPY_SRC,
    );
    this.drawArguments = new DrawArguments(
      device,
      this.drawConstants,
      (record) => this.drawBatches[record] !== undefined,
      this.drawRows,
      items,
    );
    this.batchBuffer = this.createBatchBuffer(this.drawRows);
    this.cullParams = buffer(
      "cullParams",
      16,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
    this.pointCounts = buffer("pointCounts", 64 * 4, storage);
    this.growPointSets(64);
    this.splats = this.createSplats(1);

    this.createCullBindGroup();
    this.imageryPlaceholder = device
      .createTexture({
        label: "world.imagery.placeholder",
        size: [1, 1, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING,
      })
      .createView({ dimension: "2d-array" });
    this.imageryView = this.imageryPlaceholder;
    this.imagerySampler = device.createSampler({
      label: "world.imagery",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      maxAnisotropy: 16,
    });
    this.placementTable = new PlacementTable(device, () =>
      this.tablesReplaced(),
    );
    this.createDrawBindGroup();

    this.addMaterial({}); // material 0: white, lit, untextured
    this.createTextureSet({}); // texture set 0: defaults
    this.stopTracking = onTextureDestroyed((t) => this.textureDestroyed(t));
  }

  /**
   * A texture the engine made was destroyed: texture sets still binding it
   * are skipped from now on, and an imagery array bound still is unbound,
   * each reported (`Engine.errors`), so one bad resource costs its draws,
   * not the frame.
   */
  private textureDestroyed(texture: GPUTexture): void {
    const sets = this.setsOfTexture.get(texture);
    let broke = false;
    for (const set of sets ?? []) {
      if (this.textureSets[set] && !this.brokenTextureSets.has(set)) {
        this.brokenTextureSets.add(set);
        broke = true;
        this.ctx.errors.report(
          "resource",
          `texture "${texture.label}" was destroyed while a texture set still binds it: that set's draws are skipped until it is removed`,
        );
      }
    }
    if (broke) {
      this.bundle = undefined;
      this.translucentDraws = undefined;
      this.changedViews = ALL_VIEWS;
      this.version++;
    }
    if (textureOf(this.imageryView) === texture) {
      this.ctx.errors.report(
        "resource",
        `the imagery array "${texture.label}" was destroyed while bound: the world binds none`,
      );
      this.setImageryArray(undefined);
    }
  }

  /**
   * Binds everything again from the world's current state (groups and
   * bundles): after a frame the GPU rejected, in case a group named
   * something since replaced.
   */
  rebind(): void {
    this.tablesReplaced();
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
        used: this.slabs.vertexUsed,
        capacity: this.slabs.options.vertexBudget,
      },
      indexBytes: {
        used: this.slabs.indexUsed,
        capacity: this.slabs.options.indexBudget,
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
        used: this.materialByKey.size,
        capacity: this.maxMaterials,
      },
      clipBlocks: {
        used: this.placeholderBlocks,
        capacity: this.placeholderCapacity,
      },
      terrainClipBlocks: {
        used: this.terrainClipBlocks,
        capacity: this.terrainClipBudget,
      },
      pointSets: { used: this.pointDraws.size, capacity: this.maxPointSets },
      batches: this.batches.size,
      slabs: this.slabs.slabs
        .filter((x) => x !== undefined)
        .map((x) => ({
          id: x.id,
          vertexBytes: x.vertexBuffer.size,
          vertexUsed: x.vertex.used,
          indexBytes: x.indexBuffer.size,
          indexUsed: x.index.used,
        })),
      slabBytes: this.slabs.options.slabCap,
      tableBytes:
        this.recordBuffer.size +
        this.transformBuffer.size +
        this.instanceBuffer.size +
        this.itemBuffer.size +
        this.materialBuffer.size +
        this.clipBuffer.size +
        this.drawArguments.itemList.size +
        this.drawArguments.buffer.size,
    };
  }

  /**
   * How full the fullest pool is (0 to 1) and which it is: tables against
   * their ceilings, the arenas by bytes. Streaming evicts as it does over its
   * byte budget once this passes a threshold, so uploads rarely meet a full
   * pool (CESIUM2_WEBGPU_PLAN.md §13.15, "Capacity in the residency
   * budget").
   */
  pressure(): { fraction: number; pool: string } {
    const pools: Array<[string, number, number]> = [
      ["draw table", this.drawCount - this.freeSlots.length, this.maxDraws],
      [
        "transform table",
        this.transformCount - this.freeTransforms.length,
        this.maxTransforms,
      ],
      ["instance table", this.instanceAllocator.used, this.maxInstances],
      ["material table", this.materialByKey.size, this.maxMaterials],
      ["vertex arena", this.slabs.vertexUsed, this.slabs.options.vertexBudget],
      ["index arena", this.slabs.indexUsed, this.slabs.options.indexBudget],
      // Placeholders' only: terrain regions' blocks are set aside, and
      // evicting tiles wouldn't free them.
      ["clip blocks", this.placeholderBlocks, this.placeholderCapacity],
      ["point sets", this.pointDraws.size, this.maxPointSets],
    ];
    let fraction = 0;
    let pool = "none";
    for (const [name, used, capacity] of pools) {
      const f = capacity > 0 ? used / capacity : 0;
      if (f > fraction) {
        fraction = f;
        pool = name;
      }
    }
    return { fraction, pool };
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
    // One slab holds all of it (and its draws' instance streams later):
    // room for the streams, the directory and table columns together.
    const named0 =
      Object.keys(mesh.attributes ?? {}).length +
      Object.keys(mesh.metadata ?? {}).length;
    const streamBytes =
      [
        mesh.positions,
        mesh.normals,
        mesh.uvs,
        mesh.colors,
        mesh.tangents,
        mesh.featureIds,
        ...Object.values(mesh.attributes ?? {}).map((a) => a.data),
        ...Object.values(mesh.metadata ?? {}).map((a) => a.data),
      ].reduce((n, d) => n + (d ? align4(d.byteLength) : 0), 0) +
      (mesh.propertyTextures?.length ?? 0) * TEXTURE_PROPERTY_WORDS * 4 +
      4 *
        (1 +
          (named0 +
            (mesh.propertyTextures?.length ?? 0) +
            (mesh.featureTable
              ? tableColumnData(mesh.featureTable).length
              : 0)) *
            3) +
      (mesh.featureTable ? this.tableBytes(mesh.featureTable) : 0);
    const slab = this.slabs.pick(streamBytes, mesh.indices.byteLength);
    if (!slab) {
      throw new CapacityError("vertex arena");
    }
    const releaseRanges = () => {
      for (const [o, size] of vertexRanges) {
        slab.vertex.release(o, size);
      }
      this.slabs.tidy(slab);
    };
    const upload = (data: Float32Array | Uint32Array | undefined): number => {
      if (!data) {
        return NO_STREAM;
      }
      const offset = this.slabs.allocateVertex(slab, data.byteLength);
      if (offset === undefined) {
        releaseRanges();
        throw new CapacityError("vertex arena");
      }
      vertexRanges.push([offset, data.byteLength]);
      this.queueUpload(slab.vertexBuffer, offset, data);
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
    const textured = mesh.propertyTextures ?? [];
    let table: { entries: number[][] } | undefined;
    try {
      table = mesh.featureTable && this.uploadTable(mesh.featureTable, slab);
    } catch (error) {
      releaseRanges();
      throw error;
    }
    const tableEntries = table?.entries ?? [];
    const entries = named.length + textured.length + tableEntries.length;
    if (entries > 0) {
      const directory = new Uint32Array(1 + entries * 3);
      directory[0] = entries;
      named.forEach(([name, { data, components }], i) => {
        directory[1 + i * 3] = attributeHash(name);
        directory[2 + i * 3] = upload(data);
        directory[3 + i * 3] = components;
      });
      // Properties in textures: a block saying how to decode them, read
      // per fragment (opaque.wgsl `readFragmentProperty`).
      textured.forEach((p, j) => {
        const block = new Uint32Array(TEXTURE_PROPERTY_WORDS);
        const f32 = new Float32Array(block.buffer);
        block[0] = p.slot;
        block[1] = p.channels.length;
        block[2] = p.channels.reduce(
          (packed, c, k) => packed | (c << (k * 8)),
          0,
        );
        block[3] = COMPONENT_TYPE_CODES[p.componentType];
        block[4] = p.components;
        block[5] = p.normalized ? 1 : 0;
        for (let c = 0; c < 4; c++) {
          f32[6 + c] = p.offset?.[c] ?? 0;
          f32[10 + c] = p.scale?.[c] ?? 1;
        }
        const i = named.length + j;
        directory[1 + i * 3] = attributeHash(metadataKey(p.id));
        directory[2 + i * 3] = upload(block);
        directory[3 + i * 3] = TEXTURE_PROPERTY | p.components;
      });
      // Feature table columns, read by feature ID (`readNamed`).
      tableEntries.forEach((entry, j) => {
        directory.set(entry, 1 + (named.length + textured.length + j) * 3);
      });
      streams.attributes = upload(directory);
    }
    const indexOffset = this.slabs.allocateIndex(slab, mesh.indices.byteLength);
    if (indexOffset === undefined) {
      releaseRanges();
      if (mesh.featureTable) {
        this.releaseTable(mesh.featureTable, slab);
      }
      throw new CapacityError("index arena");
    }
    this.queueUpload(slab.indexBuffer, indexOffset, mesh.indices);
    const { center, radius } = boundingSphere(mesh.positions);
    const id = this.nextMeshId++;
    this.meshRanges.set(id, {
      slab: slab.id,
      vertex: vertexRanges,
      index: [indexOffset, mesh.indices.byteLength],
      ...(table ? { table: mesh.featureTable } : {}),
      ...(mesh.attributes
        ? {
            named: new Map(
              Object.entries(mesh.attributes).map(([name, a]) => [
                name,
                a.components,
              ]),
            ),
          }
        : {}),
    });
    return {
      id,
      slab: slab.id,
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
   * A point set's mesh: `capacity` anchors (four floats each: x, y, z
   * relative to the draw's transform, and a fourth value such as a
   * heading) for the GPU or `setPointProperties`' caller to write, and the
   * points' properties, `stride` words each, read by custom shaders as
   * instance values (`streams.layout`, as `InstanceOptions.streams`). A
   * draw of it (`billboard` required) draws six vertices per point and
   * expands each on screen; points whose anchor's x is past 1e37 (or NaN)
   * aren't drawn.
   * Each point is a feature (picking). Nothing is uploaded: anchors start
   * as whatever the arena held, so write them before the first frame.
   */
  addPointMesh(
    capacity: number,
    streams?: {
      stride: number;
      layout?: Record<string, { offset: number; components: number }>;
    },
  ): PointMesh {
    const fields = Object.entries(streams?.layout ?? {});
    for (const [name, { offset, components }] of fields) {
      if (
        components < 1 ||
        components > 4 ||
        offset < 0 ||
        offset + components > streams!.stride
      ) {
        throw new RangeError(
          `addPointMesh: field ${name} is outside the stride`,
        );
      }
    }
    const directory = new Uint32Array(
      fields.length ? 1 + fields.length * 3 : 0,
    );
    if (fields.length) {
      directory[0] = fields.length;
      fields.forEach(([name, { offset, components }], i) => {
        directory[1 + i * 3] = attributeHash(name);
        directory[2 + i * 3] = offset;
        directory[3 + i * 3] = components;
      });
    }
    const stride = streams?.stride ?? 0;
    const anchorBytes = Math.max(16, capacity * 16);
    const streamBytes = capacity * stride * 4;
    const bytes = anchorBytes + streamBytes + directory.byteLength;
    // Its draws' point lists go in the same slab (a word a point each).
    const slab = this.slabs.pick(bytes + Math.max(4, capacity * 4), 0);
    const offset = slab && this.slabs.allocateVertex(slab, bytes);
    if (!slab || offset === undefined) {
      throw new CapacityError("vertex arena");
    }
    if (directory.byteLength) {
      this.queueUpload(
        slab.vertexBuffer,
        offset + anchorBytes + streamBytes,
        directory,
      );
    }
    const id = this.nextMeshId++;
    this.meshRanges.set(id, {
      slab: slab.id,
      vertex: [[offset, bytes]],
      index: [0, 0],
    });
    const anchors = offset / 4;
    return {
      id,
      slab: slab.id,
      firstIndex: 0,
      indexCount: capacity * 6,
      vertexCount: capacity,
      streams: {
        position: anchors,
        normal: NO_STREAM,
        uv: NO_STREAM,
        color: NO_STREAM,
        tangent: NO_STREAM,
        featureId: NO_STREAM,
        attributes: NO_STREAM,
      },
      featureCount: Math.max(1, capacity),
      topology: "triangle-list",
      center: [0, 0, 0],
      radius: 0,
      points: {
        capacity,
        anchors,
        streams: stride ? (offset + anchorBytes) / 4 : NO_STREAM,
        stride,
        directory: directory.byteLength
          ? (offset + anchorBytes + streamBytes) / 4
          : NO_STREAM,
      },
    };
  }

  /** Writes points' properties (`addPointMesh` streams) from `first` on. */
  setPointProperties(
    mesh: PointMesh,
    first: number,
    data: Float32Array | Uint32Array,
  ): void {
    const { stride, streams, capacity } = mesh.points;
    if (
      stride === 0 ||
      first < 0 ||
      data.length % stride !== 0 ||
      first + data.length / stride > capacity
    ) {
      throw new RangeError(
        `setPointProperties: ${data.length / Math.max(1, stride)} points from ${first} don't fit`,
      );
    }
    this.queueUpload(
      this.slabs.get(mesh.slab).vertexBuffer,
      (streams + first * stride) * 4,
      data,
    );
    this.version++;
    this.changedViews = ALL_VIEWS;
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
    const slab = this.slabs.get(ranges.slab);
    let bytes = 0;
    if (ranges.table) {
      bytes += this.releaseTable(ranges.table, slab);
    }
    for (const [offset, size] of ranges.vertex) {
      slab.vertex.release(offset, size);
      bytes += size;
    }
    if (ranges.index[1] > 0) {
      slab.index.release(ranges.index[0], ranges.index[1]);
    }
    // An emptied slab past the first closes.
    this.slabs.tidy(slab);
    return bytes + ranges.index[1];
  }

  /** A mesh's reference to its table's columns in `slab` released. */
  private releaseTable(table: FeatureTable, slab: Slab): number {
    const key = this.tableKey(table, slab);
    const uploaded = this.tableColumns.get(key);
    if (!uploaded || --uploaded.meshes > 0) {
      return 0;
    }
    this.tableColumns.delete(key);
    let bytes = 0;
    for (const [offset, size] of uploaded.ranges) {
      slab.vertex.release(offset, size);
      bytes += size;
    }
    return bytes;
  }

  /** `tableColumns`' key: the table object's id and the slab. */
  private tableKey(table: FeatureTable, slab: Slab): string {
    let id = this.tableIds.get(table);
    if (id === undefined) {
      id = this.nextTableId++;
      this.tableIds.set(table, id);
    }
    return `${id}|${slab.id}`;
  }

  /** The bytes a feature table's uploaded columns take (`uploadTable`). */
  private tableBytes(table: FeatureTable): number {
    return tableColumnData(table).reduce((n, c) => n + c.data.byteLength, 0);
  }

  /**
   * A feature table's columns in the arena, uploaded once per table
   * object: numbers, booleans (0 or 1) and numeric arrays of up to 4
   * (shorter rows padded with zero), as float32 rows by local feature ID;
   * missing values (null) read 0. String columns aren't uploaded.
   */
  private uploadTable(
    table: FeatureTable,
    slab: Slab,
  ): {
    entries: number[][];
  } {
    // Once per table object and slab: a table used from two slabs is
    // copied into each (rare: a table belongs to one tile's content).
    const key = this.tableKey(table, slab);
    let uploaded = this.tableColumns.get(key);
    if (!uploaded) {
      const entries: number[][] = [];
      const ranges: Array<[number, number]> = [];
      for (const { name, data, components } of tableColumnData(table)) {
        const offset = this.slabs.allocateVertex(slab, data.byteLength);
        if (offset === undefined) {
          for (const [o, size] of ranges) {
            slab.vertex.release(o, size);
          }
          throw new CapacityError("vertex arena");
        }
        ranges.push([offset, data.byteLength]);
        this.queueUpload(slab.vertexBuffer, offset, data);
        entries.push([
          attributeHash(metadataKey(name)),
          offset / 4,
          TABLE_PROPERTY | components,
        ]);
      }
      uploaded = { entries, ranges, meshes: 0 };
      this.tableColumns.set(key, uploaded);
    }
    uploaded.meshes++;
    return uploaded;
  }

  /** Bytes in use in the vertex and index arenas. */
  get arenaBytes(): number {
    return this.slabs.vertexUsed + this.slabs.indexUsed;
  }

  /** CPU room for draw slots below `count`. */
  private reserveDraws(count: number): void {
    if (this.drawConstants.reserve(count)) {
      const rows = this.drawConstants.rows;
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
      this.transformAnchor = resized(this.transformAnchor, t);
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

  /**
   * Adds a material to the table and returns its index. Materials are
   * immutable and shared by content (§13.15, "Shared materials"): a record
   * equal to one in the table returns that index with one more reference,
   * so every terrain tile shares one or two slots instead of taking two
   * each. Each `addMaterial` is balanced by one `removeMaterial`.
   *
   * Bindless: the record will also carry texture references (an array
   * layer today, a resource-table index later), and they join the key the
   * same way; sharing doesn't change when bindless arrives.
   */
  addMaterial(options: MaterialOptions): number {
    const scratch = this.materialScratch;
    writeMaterial(scratch.f32, scratch.u32, 0, {
      baseColor: options.baseColor ?? [1, 1, 1, 1],
      emissive: options.emissive ?? [0, 0, 0],
      metallic: options.metallic ?? 0,
      roughness: options.roughness ?? 1,
      alphaCutoff: options.alphaCutoff ?? 0.5,
      normalScale: options.normalScale ?? 1,
      occlusionStrength: options.occlusionStrength ?? 1,
      flags: options.flags ?? 0,
      ...(options.textures ? { textures: options.textures } : {}),
    });
    // The record's words are the key (NaN payloads and -0 included, so
    // equal keys are bit-identical records).
    const key = scratch.u32.join(",");
    const shared = this.materialByKey.get(key);
    if (shared !== undefined) {
      this.materialReferences[shared]!++;
      return shared;
    }
    const index = this.freeMaterials.pop() ?? this.materialCount++;
    if (index >= this.maxMaterials) {
      this.materialCount--;
      throw new CapacityError("material table");
    }
    this.reserveMaterials(index + 1);
    if (index >= this.materialRows) {
      this.growMaterials(index + 1);
    }
    this.materialsU32.set(scratch.u32, index * MATERIAL_WORDS);
    this.materialByKey.set(key, index);
    this.materialKeys[index] = key;
    this.materialReferences[index] = 1;
    this.materialsDirty = true;
    this.version++;
    this.changedViews = ALL_VIEWS;
    return index;
  }

  /**
   * Drops one reference to a material (one per `addMaterial`); the slot is
   * freed with the last. Draws that use it must be removed first.
   */
  removeMaterial(index: number): void {
    const references = this.materialReferences[index] ?? 0;
    if (references <= 0) {
      return;
    }
    if (references > 1) {
      this.materialReferences[index] = references - 1;
      return;
    }
    this.materialReferences[index] = 0;
    const key = this.materialKeys[index];
    if (key !== undefined) {
      this.materialByKey.delete(key);
      this.materialKeys[index] = undefined;
    }
    this.freeMaterials.push(index);
  }

  /** Materials in use: distinct records, after sharing. */
  get materialsInUse(): number {
    return this.materialByKey.size;
  }

  /** Frees a texture set (not its textures). Draws must be removed first. */
  removeTextureSet(index: number): void {
    if (index > 0 && this.textureSets[index]) {
      this.textureSets[index] = undefined;
      this.textureSetEntries[index] = undefined;
      for (const texture of this.textureSetTextures[index] ?? []) {
        this.setsOfTexture.get(texture)?.delete(index);
      }
      this.textureSetTextures[index] = undefined;
      this.brokenTextureSets.delete(index);
      this.freeTextureSets.push(index);
      for (const key of this.shaderGroups.keys()) {
        if (key.startsWith(`${index}|`)) {
          this.shaderGroups.delete(key);
        }
      }
    }
  }

  /**
   * A material's texture references for `options` (its texture set's
   * textures), by slot (`MaterialTextureSlot`), for `addMaterial`'s
   * `textures`. The bindless seam (CESIUM2_WEBGPU_PLAN.md §7.1, §13.15):
   * with texture sets a reference is the slot itself (the batch binds the
   * set), `NO_TEXTURE` where the slot is empty; a resource-table backend
   * returns each texture's index in the world's table instead, and
   * `createTextureSet` the one group that binds the table. Nothing that
   * calls these, and no shader but opaque.wgsl `materialTexture`, changes.
   */
  textureRefs(options: TextureSetOptions): number[] {
    return [
      options.baseColor,
      options.metallicRoughness,
      options.normal,
      options.occlusion,
      options.emissive,
    ].map((binding, slot) => (binding ? slot : NO_TEXTURE));
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
    // Property textures (opaque.wgsl `propertyTexture0`, `1`).
    for (let k = 0; k < PROPERTY_TEXTURES; k++) {
      entries.push({
        binding: PROPERTY_TEXTURE_BINDING + k,
        resource: options.properties?.[k]?.view ?? defaults.whiteView,
      });
    }
    // The built-in pipelines' group has no property textures; custom
    // shaders reading metadata get them in their own group (setGroup).
    const group = this.ctx.device.createBindGroup({
      label: "world.textureSet",
      layout: this.ctx.pipelines.textureSetLayout,
      entries: entries.filter((e) => e.binding < PROPERTY_TEXTURE_BINDING),
    });
    let index = this.freeTextureSets.pop();
    if (index !== undefined) {
      this.textureSets[index] = group;
      this.textureSetEntries[index] = entries;
    } else {
      this.textureSets.push(group);
      this.textureSetEntries.push(entries);
      index = this.textureSets.length - 1;
    }
    this.trackTextureSet(index, entries);
    return index;
  }

  /** Records a texture set's textures, for `textureDestroyed`. */
  private trackTextureSet(index: number, entries: GPUBindGroupEntry[]): void {
    const textures: GPUTexture[] = [];
    for (const entry of entries) {
      const texture = textureOf(entry.resource as GPUTextureView);
      if (texture && !textures.includes(texture)) {
        textures.push(texture);
        let sets = this.setsOfTexture.get(texture);
        if (!sets) {
          sets = new Set();
          this.setsOfTexture.set(texture, sets);
        }
        sets.add(index);
        if (isDestroyed(texture)) {
          this.brokenTextureSets.add(index);
          this.ctx.errors.report(
            "resource",
            `texture "${texture.label}" was bound after it was destroyed: that set's draws are skipped`,
          );
        }
      }
    }
    this.textureSetTextures[index] = textures;
  }

  addDraw(options: DrawOptions): DrawHandle {
    // Checked before anything is allocated.
    if (options.parent && options.transform) {
      throw new Error(
        "addDraw: a parent is for the transform a draw owns (origin and model), not with a shared transform.",
      );
    }
    if (options.parent && !this.transformAlive(options.parent)) {
      throw new Error("addDraw: the parent was removed.");
    }
    const onAnchor = options.transform
      ? this.anchorAt(options.transform.index)
      : undefined;
    if (onAnchor && this.transformAlive(options.transform!)) {
      throw new Error(
        `addDraw: ${onAnchor.name} is an anchor; hang the draw under it with parent (and origin or model), or under a transform added under it.`,
      );
    }
    const streams = options.instances?.streams;
    for (const [name, { offset, components }] of Object.entries(
      streams?.layout ?? {},
    )) {
      if (
        components < 1 ||
        components > 4 ||
        offset < 0 ||
        offset + components > streams!.stride
      ) {
        throw new RangeError(
          `addDraw: instance field ${name} is outside the stride`,
        );
      }
    }
    const pointSet = (options.mesh as Partial<PointMesh>).points;
    if (pointSet && (!options.billboard || options.instances)) {
      throw new Error(
        "addDraw: a point mesh draws as a billboard, without instances",
      );
    }
    // A point draw's own list of points to draw (each view's cull writes
    // it), and its slot among the per-view counts.
    let pointList: number | undefined;
    let pointCounter: number | undefined;
    if (pointSet) {
      if (
        this.freePointCounters.length === 0 &&
        this.pointSetCount < this.maxPointSets
      ) {
        this.growPointSets(Math.min(this.maxPointSets, this.pointSetCount * 2));
      }
      pointCounter = this.freePointCounters.pop();
      const bytes = Math.max(4, pointSet.capacity * 4);
      // In the mesh's slab: the point cull reads anchors and list together.
      pointList =
        pointCounter === undefined
          ? undefined
          : this.slabs.allocateVertex(this.slabs.get(options.mesh.slab), bytes);
      if (pointList === undefined) {
        if (pointCounter !== undefined) {
          this.freePointCounters.push(pointCounter);
        }
        throw new CapacityError(
          pointCounter === undefined ? "point sets" : "vertex arena",
        );
      }
    }
    // Nothing taken may outlive a failure below (transactional, §13.15).
    const releasePoints = () => {
      if (pointList !== undefined) {
        this.slabs
          .get(options.mesh.slab)
          .vertex.release(pointList, Math.max(4, pointSet!.capacity * 4));
        this.freePointCounters.push(pointCounter!);
      }
    };
    const index = this.freeSlots.pop() ?? this.drawCount++;
    if (index >= this.maxDraws) {
      this.drawCount--;
      releasePoints();
      throw new CapacityError("draw table");
    }
    if (index >= this.drawRows) {
      this.growDraws(index + 1);
    }
    this.reserveDraws(index + 1);
    const mesh = options.mesh;
    // Placement: a shared transform, or one the draw owns.
    let transform: number;
    if (options.transform) {
      if (!this.transformAlive(options.transform)) {
        this.freeSlots.push(index);
        releasePoints();
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
      try {
        transform = this.addTransform(m, options.parent).index;
      } catch (error) {
        this.freeSlots.push(index);
        releasePoints();
        throw error;
      }
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
        releasePoints();
        throw new CapacityError("instance table");
      }
      this.instances.reserve(first + instanceCount);
      if (first + instanceCount > this.instances.gpuRows) {
        this.growInstances(first + instanceCount);
      }
      instanceFirst = first;
      this.instanceHighWater = Math.max(
        this.instanceHighWater,
        first + instanceCount,
      );
      const { f32, u32 } = this.instances;
      const distanceFlags = instanceDistanceFlags(
        instances.visibleWithin,
        instances.visibleBeyond,
      );
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
          distanceFlags,
          instances.tints ? packTint(instances.tints, k * 4) : 0xffffffff,
        );
        this.instances.mark(first + k);
      }
    }
    let instanceStreams = NO_STREAM;
    let instanceStride = 0;
    let instanceDirectory = NO_STREAM;
    this.instanceStreamRanges[index] = undefined;
    if (instances?.streams && instanceCount > 0) {
      const data = instances.streams.data;
      // The fields' directory right after the data, in one range.
      const fields = Object.entries(instances.streams.layout ?? {});
      const directory = new Uint32Array(
        fields.length ? 1 + fields.length * 3 : 0,
      );
      if (fields.length) {
        directory[0] = fields.length;
        fields.forEach(([name, { offset, components }], i) => {
          directory[1 + i * 3] = attributeHash(name);
          directory[2 + i * 3] = offset;
          directory[3 + i * 3] = components;
        });
      }
      // In the mesh's slab: the vertex shader reads both from its arena.
      const slab = this.slabs.get(mesh.slab);
      const offset = this.slabs.allocateVertex(
        slab,
        data.byteLength + directory.byteLength,
      );
      if (offset === undefined) {
        this.releaseInstances(instanceFirst, instanceCount);
        this.releaseOwnedTransform(index);
        this.freeSlots.push(index);
        releasePoints();
        throw new CapacityError("vertex arena");
      }
      this.queueUpload(slab.vertexBuffer, offset, data);
      if (fields.length) {
        this.queueUpload(
          slab.vertexBuffer,
          offset + data.byteLength,
          directory,
        );
        instanceDirectory = (offset + data.byteLength) / 4;
      }
      this.instanceStreamRanges[index] = [
        offset,
        data.byteLength + directory.byteLength,
        data.byteLength,
        slab.id,
      ];
      instanceStreams = offset / 4;
      instanceStride = instances.streams.stride;
    }
    // A point set's properties are its mesh's, shared by its draws.
    if (pointSet) {
      instanceStreams = pointSet.streams;
      instanceStride = pointSet.stride;
      instanceDirectory = pointSet.directory;
    }

    const material = options.material ?? 0;
    const textureSet = options.textureSet ?? 0;
    const doubleSided = options.doubleSided ?? false;
    const shader = options.shader;
    const billboard = options.billboard !== undefined;
    const instanced = instanceCount > 0;
    const batch = this.batchFor({
      mesh,
      material,
      textureSet,
      doubleSided,
      shader,
      billboard,
      points: pointSet !== undefined,
      instanced,
      draw: index,
    });
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
    this.drawConstants.write(index, {
      transform,
      center: mesh.center,
      radius:
        (options.radius !== undefined
          ? options.radius / (scale || 1)
          : mesh.radius) + (shader?.displacement ?? 0),
      color: options.color ?? [1, 1, 1, 1],
      indexCount: mesh.indexCount,
      firstIndex: mesh.firstIndex,
      // A point draw's list where its uv would be (points have none).
      streams:
        pointList !== undefined
          ? { ...mesh.streams, uv: pointList / 4 }
          : mesh.streams,
      materialIndex: material,
      textureSet,
      batch: batch.index,
      featureId: firstFeature,
      viewMask: options.viewMask,
      // Lines have no surface to light; 1.x draws them unlit too.
      flags:
        (options.unlit || mesh.topology === "line-list" || options.billboard
          ? RecordFlags.unlit
          : 0) |
        (options.billboard ? RecordFlags.billboard : 0) |
        (pointSet ? RecordFlags.points : 0) |
        (options.ground === false ? RecordFlags.notGround : 0) |
        (options.collision ? RecordFlags.collision : 0) |
        (options.underlay ? RecordFlags.underlay : 0),
      instanceFirst,
      instanceCount,
      instanceStreams,
      instanceStride,
      instanceDirectory,
      ...(options.billboard
        ? {
            billboardSize: options.billboard.size,
            billboardDepthTest: options.billboard.depthTestDistance ?? 0,
          }
        : {}),
    });
    if (this.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD] !== 0) {
      batch.shown++;
    }
    this.markDirty(index);
    this.bundle = undefined;
    this.translucentDraws = undefined;
    if (pointSet) {
      const params = this.ctx.device.createBuffer({
        label: "world.pointCull",
        size: POINT_CULL_BYTES,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const draw: PointDraw = {
        mesh: mesh as PointMesh,
        list: pointList!,
        counter: pointCounter!,
        params,
        group: undefined as never,
        batch,
        culler: undefined,
        tiny: 0,
      };
      draw.group = this.pointGroup(draw);
      this.pointDraws.set(index, draw);
    }
    const handle: DrawHandle = {
      index,
      generation: this.drawGeneration[index]!,
      name: options.name,
    };
    this.contentRevision_++;
    this.acceleration.drawAdded(handle);
    return handle;
  }

  /**
   * A point draw's cull in each view, by a compiled kernel (a vector
   * style's layer, vector/PointCuller.ts) instead of the generic one:
   * `encode` runs in the view's cull pass with groups 0–2 set (the view,
   * the world's cull tables, the draw's `PointCull`) and dispatches the
   * point cull, the splats and the draw's arguments. Symbols up to `tiny`
   * pixels it splats (0: none). Undefined restores the generic cull.
   */
  setPointCuller(
    handle: DrawHandle,
    culler: PointCuller | undefined,
    tiny = 0,
  ): void {
    const draw = this.pointDraws.get(handle.index);
    if (!draw || !this.hasDraw(handle)) {
      throw new Error("setPointCuller: not a point draw");
    }
    draw.culler = culler;
    draw.tiny = culler ? tiny : 0;
    this.writePointParams(draw, handle.index);
  }

  /**
   * A point draw's cull with a style's functions (WGSL defining
   * `styleShow`, `styleSize`, `styleColor`, `styleShapeAt` and
   * `styleOffset`, reading
   * `uniforms.<name>`), for `setPointCuller`.
   */
  createPointCuller(options: {
    code: string;
    uniforms: Record<string, UniformDeclaration>;
    label?: string;
  }): PointCuller {
    return new PointCuller(this.ctx, options);
  }

  /** A point draw's group 2 (pointCull.slang), its splats the current ones. */
  private pointGroup(draw: PointDraw): GPUBindGroup {
    return this.ctx.device.createBindGroup({
      label: "world.pointCull",
      layout: this.ctx.pipelines.pointCullLayout,
      entries: [
        draw.params,
        this.slabs.get(draw.mesh.slab).vertexBuffer,
        this.pointCounts,
        this.splats.depth,
        this.splats.color,
        this.splats.feature,
      ].map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
  }

  /** Splat buffers for `pixels` (a word each), and the resolve's group. */
  private createSplats(pixels: number): World["splats"] {
    const { device } = this.ctx;
    const make = (label: string) =>
      device.createBuffer({
        label: `world.splats.${label}`,
        size: Math.max(4, pixels * 4),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
    const depth = make("depth");
    const color = make("color");
    const feature = make("feature");
    return {
      pixels,
      depth,
      color,
      feature,
      group: device.createBindGroup({
        label: "world.splats",
        layout: this.ctx.pipelines.splatLayout,
        entries: [depth, color, feature].map((buffer, binding) => ({
          binding,
          resource: { buffer },
        })),
      }),
    };
  }

  /** A point draw's `PointCull` parameters. */
  private writePointParams(draw: PointDraw, record: number): void {
    const data = new Uint32Array(POINT_CULL_BYTES / 4);
    const f32 = new Float32Array(data.buffer);
    const p = draw.mesh.points;
    data[0] = p.anchors;
    data[1] = draw.list / 4;
    data[2] = p.capacity;
    data[3] = record;
    data[4] = draw.counter;
    data[5] = draw.batch.index;
    data[6] = draw.tiny > 0 ? 1 : 0;
    f32[7] = POINT_MARGIN;
    f32[8] = draw.tiny;
    data[9] = p.streams;
    data[10] = p.stride;
    this.ctx.device.queue.writeBuffer(draw.params, 0, data);
  }

  /**
   * The view's point splats over its opaque draws (splat.slang), in its
   * opaque pass after them; nothing when no draw splats.
   */
  drawSplats(pass: GPURenderPassEncoder): void {
    if (![...this.pointDraws.values()].some((d) => d.tiny > 0)) {
      return;
    }
    pass.setPipeline(this.ctx.pipelines.splatResolve);
    pass.setBindGroup(0, this.ctx.currentViewBindGroup);
    pass.setBindGroup(1, this.splats.group);
    pass.draw(3);
  }

  /**
   * The batch for draws of these fields, made (or a free one reused) when
   * none exists. A point set's draws batch alone: each batch's arguments
   * are its set's list (cull.slang `writePointArgs`).
   */
  private batchFor(f: {
    mesh: Batch["mesh"];
    material: number;
    textureSet: number;
    doubleSided: boolean;
    shader: CustomShader | undefined;
    billboard: boolean;
    points: boolean;
    instanced: boolean;
    draw: number;
  }): Batch {
    const key = `${f.mesh.id}|${f.material}|${f.textureSet}|${f.doubleSided ? 1 : 0}|${f.shader?.id ?? 0}|${f.billboard ? 1 : 0}|${f.instanced ? 1 : 0}${f.points ? `|${f.draw}` : ""}`;
    let batch = this.batches.get(key);
    if (batch) {
      return batch;
    }
    const reused = this.freeBatches.pop();
    if (reused) {
      batch = reused;
      batch.key = key;
      batch.mesh = f.mesh;
      batch.textureSet = f.textureSet;
      batch.material = f.material;
      batch.doubleSided = f.doubleSided;
      batch.shader = f.shader;
      batch.billboard = f.billboard;
      batch.points = f.points;
      batch.instanced = f.instanced;
      batch.shown = 0;
    } else {
      batch = {
        index: this.batchList.length,
        key,
        mesh: f.mesh,
        textureSet: f.textureSet,
        material: f.material,
        doubleSided: f.doubleSided,
        shader: f.shader,
        billboard: f.billboard,
        points: f.points,
        instanced: f.instanced,
        items: 0,
        itemBase: 0,
        shown: 0,
      };
      this.batchList.push(batch);
    }
    this.batches.set(key, batch);
    return batch;
  }

  /**
   * Changes a draw's custom shader (undefined: the engine's) in place: the
   * draw moves to the batch for its new shader, keeping its record,
   * instances, features and handle. Until the new shader's pipelines
   * compile it draws with the engine's, as a new draw would.
   */
  setDrawShader(handle: DrawHandle, shader: CustomShader | undefined): void {
    if (!this.hasDraw(handle)) {
      throw new Error("setDrawShader: the draw was removed");
    }
    const index = handle.index;
    const old = this.drawBatches[index]!;
    if (old.shader === shader) {
      return;
    }
    const o = index * RECORD_WORDS;
    const instanceCount = this.recordsU32[o + INSTANCE_COUNT_WORD]!;
    const items = instanceCount > 0 ? instanceCount : 1;
    const batch = this.batchFor({
      mesh: old.mesh,
      material: old.material,
      textureSet: old.textureSet,
      doubleSided: old.doubleSided,
      shader,
      billboard: old.billboard,
      points: old.points,
      instanced: old.instanced,
      draw: index,
    });
    old.items -= items;
    if (this.recordsU32[o + VIEW_MASK_WORD] !== 0) {
      old.shown--;
      batch.shown++;
    }
    if (old.items === 0) {
      this.batches.delete(old.key);
      old.key = "";
      this.freeBatches.push(old);
    }
    batch.items += items;
    this.drawBatches[index] = batch;
    // The bounds' padding for a vertex stage's displacement follows it.
    const placed = this.drawPlacements[index];
    if (placed) {
      placed.base +=
        (shader?.displacement ?? 0) - (old.shader?.displacement ?? 0);
    }
    this.drawConstants.setBatch(
      index,
      batch.index,
      this.recordsF32[o + RADIUS_WORD]! -
        (old.shader?.displacement ?? 0) +
        (shader?.displacement ?? 0),
    );
    const point = this.pointDraws.get(index);
    if (point) {
      point.batch = batch;
      this.writePointParams(point, index);
    }
    this.markDirty(index);
    this.bundle = undefined;
    this.translucentDraws = undefined;
    this.version++;
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
    this.contentRevision_++;
    this.acceleration.drawRemoved(handle);
    const batch = this.drawBatches[handle.index]!;
    const o = handle.index * RECORD_WORDS;
    const instanceCount = this.recordsU32[o + INSTANCE_COUNT_WORD]!;
    this.drawBatches[handle.index] = undefined;
    this.drawGeneration[handle.index] = this.drawGeneration[handle.index]! + 1;
    batch.items -= instanceCount > 0 ? instanceCount : 1;
    if (this.recordsU32[o + VIEW_MASK_WORD] !== 0) {
      batch.shown--;
    }
    if (batch.items === 0) {
      this.batches.delete(batch.key);
      batch.key = "";
      this.freeBatches.push(batch);
    }
    // Slices of the item list follow batch sizes: rebuild them.
    this.bundle = undefined;
    this.translucentDraws = undefined;
    if (instanceCount > 0) {
      this.releaseInstances(
        this.recordsU32[o + INSTANCE_FIRST_WORD]!,
        instanceCount,
      );
    }
    this.drawConstants.clear(handle.index);
    this.releasePlacement(handle.index);
    const pointDraw = this.pointDraws.get(handle.index);
    if (pointDraw) {
      this.flushUploads();
      this.slabs
        .get(pointDraw.mesh.slab)
        .vertex.release(
          pointDraw.list,
          Math.max(4, pointDraw.mesh.points.capacity * 4),
        );
      pointDraw.params.destroy();
      this.freePointCounters.push(pointDraw.counter);
      this.pointDraws.delete(handle.index);
    }
    const streams = this.instanceStreamRanges[handle.index];
    if (streams) {
      this.flushUploads(); // before its range can be reused
      this.slabs.get(streams[3]).vertex.release(streams[0], streams[1]);
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
      // Its distance rule stays (InstanceFlags).
      u32[w + 14] = (u32[w + 14]! & ~1) | (change.visible ? 0 : 1);
    }
    if (change.tint) {
      u32[w + 15] = packTint(change.tint);
    }
    this.instances.mark(slot);
    this.version++;
    this.changedViews |= this.recordsU32[o + VIEW_MASK_WORD]!;
  }

  /**
   * Overwrites instances' streams from `firstInstance` on: `data` is
   * whole instances (`stride` words each), uploaded in one copy (a feed
   * update of many tracks). The data is copied; the array may be reused.
   */
  setInstanceStreams(
    handle: DrawHandle,
    firstInstance: number,
    data: Float32Array | Uint32Array,
  ): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const range = this.instanceStreamRanges[handle.index];
    const stride =
      this.recordsU32[handle.index * RECORD_WORDS + INSTANCE_STRIDE_WORD]!;
    if (!range || stride === 0) {
      throw new Error("setInstanceStreams: the draw has no instance streams");
    }
    const at = firstInstance * stride * 4;
    if (
      firstInstance < 0 ||
      data.length % stride !== 0 ||
      at + data.byteLength > range[2]
    ) {
      throw new RangeError(
        `setInstanceStreams: ${data.length / stride} instances from ${firstInstance} don't fit`,
      );
    }
    this.queueUpload(
      this.slabs.get(range[3]).vertexBuffer,
      range[0] + at,
      data,
    );
    this.version++;
    this.changedViews |=
      this.recordsU32[handle.index * RECORD_WORDS + VIEW_MASK_WORD]!;
  }

  // ------------------------------------------------------------ transforms

  /**
   * Adds a placement: `matrix` (column-major float64) relative to `parent`,
   * or in the table's root (render space) without one. Under an anchor
   * (`addAnchor`, `bodyAnchor`) it is in the anchor's coordinates: under
   * the Earth's, Earth-fixed. Draws, other transforms and instanced draws'
   * instances hang off it; moving it moves them all.
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
      throw new CapacityError("transform table");
    }
    this.reserveTransforms(index + 1);
    if (index >= this.transforms.gpuRows) {
      this.growTransforms(index + 1);
    }
    this.transformLocal.set(matrix, index * 16);
    this.transformParent[index] = parent ? parent.index : -1;
    if (parent) {
      (this.transformChildren[parent.index] ??= []).push(index);
    }
    this.transformChildren[index] = undefined;
    this.transformLive[index] = 1;
    this.transformHidden[index] = 0;
    this.transformAnchor[index] = parent
      ? this.transformAnchor[parent.index]!
      : 0;
    this.pendTransform(index);
    return { index, generation: this.transformGeneration[index]! };
  }

  /** Replaces a transform's matrix (relative to its parent). */
  setTransform(handle: TransformHandle, matrix: ArrayLike<number>): void {
    if (!this.transformAlive(handle)) {
      return;
    }
    const anchor = this.anchorAt(handle.index);
    if (anchor) {
      throw new Error(
        `setTransform: ${anchor.name} is an anchor, whose matrix is the identity; place it per view (View.setAnchorPlacement) or in the table root (placeAnchor).`,
      );
    }
    this.transformLocal.set(matrix, handle.index * 16);
    this.pendTransform(handle.index);
    this.transformRevision_++;
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

  /**
   * A transform's matrix (float64) composed with its parents, relative to
   * its anchor (`anchorOf`), or to the table root under no anchor: under
   * the Earth's anchor, Earth-fixed. With every anchor placed at the
   * identity, render space too.
   */
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
   * A draw's matrix (float64) relative to its anchor, or to the table root
   * under no anchor: its transform's `worldMatrix`, shared or its own.
   * Undefined once the draw is removed.
   */
  drawMatrix<T extends Float64Array = Float64Array<ArrayBuffer>>(
    handle: DrawHandle,
    out: T = new Float64Array(16) as T,
  ): T | undefined {
    if (!this.hasDraw(handle)) {
      return undefined;
    }
    const t = this.recordsU32[handle.index * RECORD_WORDS + TRANSFORM_WORD]!;
    this.resolveTransforms();
    out.set(this.transformWorld.subarray(t * 16, t * 16 + 16));
    return out;
  }

  /**
   * Removes a transform and its descendants. Draws placed by them must be
   * removed first. An anchor goes through `removeAnchor`.
   */
  removeTransform(handle: TransformHandle): void {
    if (!this.transformAlive(handle)) {
      return;
    }
    const index = handle.index;
    const anchor = this.anchorAt(index);
    if (anchor) {
      throw new Error(
        `removeTransform: ${anchor.name} is an anchor; remove it with removeAnchor.`,
      );
    }
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
    this.transformRevision_++;
    for (const child of this.transformChildren[index] ?? []) {
      this.freeTransformTree(child);
    }
    this.transformChildren[index] = undefined;
    this.transformLive[index] = 0;
    this.transformParent[index] = -1;
    this.transformAnchor[index] = 0;
    this.transformFrames.delete(index);
    this.transformGeneration[index] = this.transformGeneration[index]! + 1;
    this.freeTransforms.push(index);
  }

  // --------------------------------------------------------------- anchors

  /**
   * Adds an anchor: a top-level transform whose matrix is the identity,
   * forever, and whose placement in render space each view sets
   * (`View.setAnchorPlacement`). Content hangs under it (`addTransform`'s
   * parent, `DrawOptions.parent`). With `body`, it is that body's anchor
   * (`bodyAnchor`). A world holds `MAX_ANCHORS` - 1 (31); one more throws
   * `CapacityError("anchor table")`.
   */
  addAnchor(name: string, options: { body?: Body } = {}): AnchorHandle {
    const body = options.body;
    const key = body ? bodyKey(body) : undefined;
    if (key !== undefined && this.bodyAnchors.has(key)) {
      throw new Error(
        `addAnchor: ${body!.name} already has an anchor (${this.bodyAnchors.get(key)!.name}).`,
      );
    }
    let slot = 1;
    while (slot < MAX_ANCHORS && this.anchorSlots[slot]) {
      slot++;
    }
    if (slot === MAX_ANCHORS) {
      throw new CapacityError("anchor table");
    }
    const transform = this.addTransform(IDENTITY);
    this.transformAnchor[transform.index] = slot;
    const anchor: AnchorHandle = Object.freeze({
      index: transform.index,
      generation: transform.generation,
      name,
      slot,
      ...(body ? { body } : {}),
    });
    this.anchorSlots[slot] = anchor;
    this.anchorPlaces.set(IDENTITY, slot * 16);
    if (key !== undefined) {
      this.bodyAnchors.set(key, anchor);
    }
    this.anchorList = undefined;
    return anchor;
  }

  /**
   * The body's anchor, made on first ask and named after the body: one per
   * body, by its name and NAIF id (plan 5a's call 19).
   */
  bodyAnchor(body: Body): AnchorHandle {
    return (
      this.bodyAnchors.get(bodyKey(body)) ?? this.addAnchor(body.name, { body })
    );
  }

  /**
   * @internal The anchor of the body with this key (`bodyKey`) if the
   * world has made it (`View.bodyAnchor`).
   */
  findBodyAnchor(key: string): AnchorHandle | undefined {
    return this.bodyAnchors.get(key);
  }

  /**
   * @internal Counts `removeAnchor` calls that removed one, so a view can
   * forget the placements it held for removed anchors.
   */
  get anchorRemovals(): number {
    return this.anchorRemovals_;
  }
  private anchorRemovals_ = 0;

  /** The world's anchors, by slot. */
  get anchors(): readonly AnchorHandle[] {
    return (this.anchorList ??= Object.freeze(
      this.anchorSlots.filter((a): a is AnchorHandle => a !== undefined),
    ));
  }

  /** The anchor a transform hangs under (itself for an anchor), or undefined under none. */
  anchorOf(handle: TransformHandle): AnchorHandle | undefined {
    if (!this.transformAlive(handle)) {
      return undefined;
    }
    return this.anchorSlots[this.transformAnchor[handle.index]!];
  }

  /** The anchor a draw hangs under, or undefined under none (or once removed). */
  drawAnchor(handle: DrawHandle): AnchorHandle | undefined {
    if (!this.hasDraw(handle)) {
      return undefined;
    }
    const t = this.recordsU32[handle.index * RECORD_WORDS + TRANSFORM_WORD]!;
    return this.anchorSlots[this.transformAnchor[t]!];
  }

  /**
   * Sets an anchor's place in the table root (column-major float64, rigid):
   * where the core's own frame resolver (`tableResolver`) finds it. Views
   * place anchors in render space themselves (`View.setAnchorPlacement`,
   * or the camera layer for a view with a rig); this moves no content by
   * itself. Default: the identity.
   */
  placeAnchor(anchor: AnchorHandle, matrix: ArrayLike<number>): void {
    this.checkAnchor(anchor, "placeAnchor");
    const error = rigidMatrixError(matrix);
    if (error) {
      throw new Error(
        `placeAnchor: ${anchor.name}'s place is not rigid: ${error}.`,
      );
    }
    for (let i = 0; i < 16; i++) {
      this.anchorPlaces[anchor.slot * 16 + i] = matrix[i]!;
    }
    // Views placed through the table resolver follow on the next tick.
    this.transformRevision_++;
    this.anchorPlaceRevision_++;
    this.ctx.wake();
  }

  /** An anchor's place in the table root (`placeAnchor`), float64. */
  anchorMatrix(anchor: AnchorHandle, out = new Float64Array(16)): Float64Array {
    this.checkAnchor(anchor, "anchorMatrix");
    out.set(
      this.anchorPlaces.subarray(anchor.slot * 16, anchor.slot * 16 + 16),
    );
    return out;
  }

  /**
   * Removes an anchor, freeing its slot. Throws, naming it, while any
   * transform hangs under it; draws hang under transforms (a draw can't sit
   * on an anchor itself), so none can be left on it. Views forget their
   * placements of it (`View.anchorRevision` counts that).
   */
  removeAnchor(anchor: AnchorHandle): void {
    if (
      !this.transformAlive(anchor) ||
      this.anchorSlots[anchor.slot] !== anchor
    ) {
      return;
    }
    if ((this.transformChildren[anchor.index]?.length ?? 0) > 0) {
      throw new Error(
        `removeAnchor: transforms still hang under ${anchor.name}; remove them first.`,
      );
    }
    this.anchorSlots[anchor.slot] = undefined;
    if (anchor.body) {
      this.bodyAnchors.delete(bodyKey(anchor.body));
    }
    this.anchorList = undefined;
    this.freeTransformTree(anchor.index);
    this.anchorRemovals_++;
    this.anchorPlaceRevision_++;
    this.version++;
    this.changedViews = ALL_VIEWS;
  }

  /**
   * A transform node as a reference frame a rig can name, carrying its
   * world and handle: the same key for the same node, under the name it
   * was first given. A reference frame is rigid: a node whose matrix
   * (or a parent's) scales or shears can't be a rig's reference frame;
   * the camera layer refuses its place, reporting it, and keeps the
   * view's last good placement and pose.
   */
  frameOf(handle: TransformHandle, name: string): TransformFrameKey {
    if (!this.transformAlive(handle)) {
      throw new Error(`frameOf: the transform for ${name} was removed.`);
    }
    const known = this.transformFrames.get(handle.index);
    if (known) {
      if (known.name !== name) {
        throw new Error(
          `frameOf: the transform is already the reference frame ${known.name}, not ${name}.`,
        );
      }
      return known;
    }
    const key: TransformFrameKey = Object.freeze({
      name,
      world: this,
      transform: Object.freeze({
        index: handle.index,
        generation: handle.generation,
      }),
    });
    this.transformFrames.set(handle.index, key);
    return key;
  }

  /** The anchor at a transform slot, if that transform is one. */
  private anchorAt(index: number): AnchorHandle | undefined {
    const anchor = this.anchorSlots[this.transformAnchor[index]!];
    return anchor?.index === index ? anchor : undefined;
  }

  private checkAnchor(anchor: AnchorHandle, caller: string): void {
    if (
      this.anchorSlots[anchor.slot] !== anchor ||
      !this.transformAlive(anchor)
    ) {
      throw new Error(
        `${caller}: ${anchor.name} is not an anchor of this world.`,
      );
    }
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
    // An anchor's matrix is the identity: its children's are their own,
    // bit for bit (as before anchors, at the top level).
    if (parent >= 0 && this.anchorAt(parent) === undefined) {
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
      this.transformAnchor[index],
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
   * @internal Each shown light with its transform's matrix relative to its
   * anchor and the anchor's slot (0: none; lights.ts `packViewLights`);
   * lights whose transform was removed go.
   */
  forEachLight(
    visit: (light: LightOptions, matrix: Float64Array, anchor: number) => void,
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
          this.transformAnchor[t.index]!,
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
  /**
   * The imagery array the globe's tiles sample (`SlicePool`), or none: the
   * placeholder again, before the array is destroyed. A bind group that
   * still names a destroyed texture fails every submit it's in (the whole
   * frame draws nothing).
   */
  setImageryArray(view: GPUTextureView | undefined): void {
    view ??= this.imageryPlaceholder;
    if (view === this.imageryView) {
      return;
    }
    this.imageryView = view;
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
    if (this.drawConstants.setLights(handle.index, packed)) {
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
    if (this.drawConstants.setImagery(handle.index, packed, unlit)) {
      this.markDirty(handle.index);
    }
  }

  setViewMask(handle: DrawHandle, mask: number): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const old = this.recordsU32[handle.index * RECORD_WORDS + VIEW_MASK_WORD]!;
    if (old !== mask >>> 0) {
      this.contentRevision_++;
      this.changedViews |= old; // the views it left
      this.drawConstants.setViewMask(handle.index, mask);
      this.markDirty(handle.index);
      if ((old === 0) !== (mask === 0)) {
        // Its batch joins or leaves the bundles: they're recorded again
        // (the batch table and item list stay as they are).
        const batch = this.drawBatches[handle.index]!;
        batch.shown += mask === 0 ? -1 : 1;
        if (batch.shown === (mask === 0 ? 0 : 1)) {
          this.batchesShownChanged = true;
        }
      }
    }
  }

  /**
   * Uploads up to `CLIP_BOXES` clip boxes for a mixed-LOD placeholder, or
   * returns undefined when there are too many or no block is free.
   */
  allocateClip(boxes: readonly ClipBox[]): ClipHandle | undefined {
    if (
      boxes.length === 0 ||
      boxes.length > CLIP_BOXES ||
      this.placeholderBlocks >= this.placeholderCapacity
    ) {
      return undefined;
    }
    const block =
      this.freeClipBlocks.pop() ??
      (this.clipBlockCount < this.maxClipBlocks
        ? this.clipBlockCount++
        : this.blockFromRuns());
    if (block < 0) {
      return undefined;
    }
    this.placeholderBlocks++;
    if (block >= this.clipRows) {
      this.growClips(block + 1);
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
    this.placeholderBlocks--;
  }

  /**
   * A placeholder's block from the terrain regions' free runs, when no
   * other is left: the end of the smallest, so larger runs stay whole.
   * -1 when there is none.
   */
  private blockFromRuns(): number {
    const runs = this.freeClipRuns;
    let smallest = -1;
    for (let i = 0; i < runs.length; i++) {
      if (smallest < 0 || runs[i]!.blocks < runs[smallest]!.blocks) {
        smallest = i;
      }
    }
    if (smallest < 0) {
      return -1;
    }
    const run = runs[smallest]!;
    run.blocks--;
    const block = run.block + run.blocks;
    if (run.blocks === 0) {
      runs.splice(smallest, 1);
    }
    return block;
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
    const m = clip ? mask >>> 0 : 0;
    const packed = clip ? packClip(clip.block, clip.count) : 0;
    if (this.drawConstants.setPlaceholder(handle.index, m, packed)) {
      this.markDirty(handle.index);
    }
  }

  /**
   * @internal Uploads a terrain clip region (globe/terrainClip.ts
   * `packClipShape`: vec4 rows) into a run of whole clip blocks and points
   * its directory row (block 0) at it; returns its slot, the record mask's
   * bit (`setTerrainClip`). Throws a `TerrainClipError` when all
   * `MAX_TERRAIN_CLIPS` slots are taken, or the region doesn't fit the
   * blocks set aside for regions (`WorldOptions.maxClipBlocks`).
   */
  addTerrainClipRegion(rows: Float32Array): number {
    let slot = 0;
    while (slot < MAX_TERRAIN_CLIPS && this.terrainClipRuns[slot]) {
      slot++;
    }
    if (slot === MAX_TERRAIN_CLIPS) {
      throw new TerrainClipError(
        `at most ${MAX_TERRAIN_CLIPS} terrain clip regions per world are supported; remove one, or merge neighboring regions into one polygon.`,
      );
    }
    const blocks = Math.ceil(rows.length / (CLIP_BLOCK_ROWS * 4));
    if (blocks > MAX_TERRAIN_CLIP_BLOCKS) {
      throw new TerrainClipError(
        `the region takes ${blocks} clip blocks, more than the ${MAX_TERRAIN_CLIP_BLOCKS} a region may; simplify the polygon, or split it.`,
      );
    }
    if (this.terrainClipBlocks + blocks > this.terrainClipBudget) {
      throw new TerrainClipError(
        `the world's terrain clip regions would take ${this.terrainClipBlocks + blocks} clip blocks, more than the ${this.terrainClipBudget} set aside for them (WorldOptions.maxClipBlocks); simplify the polygon, or remove a region.`,
      );
    }
    let block = this.allocateClipRun(blocks);
    if (block < 0) {
      // The free blocks are there but broken up: move the regions together.
      this.packTerrainClips();
      block = this.allocateClipRun(blocks);
    }
    if (block < 0) {
      throw new TerrainClipError(
        `no run of ${blocks} clip blocks is free for the region (placeholders hold the rest of the world's ${this.maxClipBlocks}, WorldOptions.maxClipBlocks); simplify the polygon, or remove a region.`,
      );
    }
    this.terrainClipRuns[slot] = { block, blocks, rows };
    this.terrainClipBlocks += blocks;
    this.writeTerrainClip(slot);
    this.version++;
    this.contentRevision_++; // rays pass through clipped terrain
    return slot;
  }

  /** @internal Frees a terrain clip region's slot and blocks. */
  removeTerrainClipRegion(slot: number): void {
    const run = this.terrainClipRuns[slot];
    if (!run) {
      return;
    }
    this.terrainClipRuns[slot] = undefined;
    this.terrainClipBlocks -= run.blocks;
    this.contentRevision_++;
    this.freeRun(run.block, run.blocks);
    // An empty directory row: a stale mask bit would read a region of no
    // rows at row 0, never the freed blocks (removal also clears the
    // tiles' masks at once).
    this.ctx.device.queue.writeBuffer(
      this.clipBuffer,
      slot * 16,
      new Uint32Array(4),
    );
    this.version++;
  }

  /** A region's rows into its run's blocks, and its directory row. */
  private writeTerrainClip(slot: number): void {
    const run = this.terrainClipRuns[slot]!;
    const floats = CLIP_BLOCK_ROWS * 4;
    const data = new Float32Array(run.blocks * floats);
    data.set(run.rows);
    const { queue } = this.ctx.device;
    queue.writeBuffer(this.clipBuffer, run.block * floats * 4, data);
    const entry = new Uint32Array([run.block * CLIP_BLOCK_ROWS, 0, 0, 0]);
    queue.writeBuffer(this.clipBuffer, slot * 16, entry);
  }

  /**
   * Returns a run of blocks to the regions' free runs, merging neighbors,
   * and (`trim`) lowers the blocks in use when it reaches the top.
   */
  private freeRun(block: number, blocks: number, trim = true): void {
    const runs = this.freeClipRuns;
    let i = 0;
    while (i < runs.length && runs[i]!.block < block) {
      i++;
    }
    runs.splice(i, 0, { block, blocks });
    if (i + 1 < runs.length && block + blocks === runs[i + 1]!.block) {
      runs[i]!.blocks += runs[i + 1]!.blocks;
      runs.splice(i + 1, 1);
    }
    if (i > 0 && runs[i - 1]!.block + runs[i - 1]!.blocks === block) {
      runs[i - 1]!.blocks += runs[i]!.blocks;
      runs.splice(i, 1);
    }
    if (trim) {
      this.trimClipRuns();
    }
  }

  /** A free run at the top lowers the blocks in use. */
  private trimClipRuns(): void {
    const runs = this.freeClipRuns;
    const last = runs[runs.length - 1];
    if (last && last.block + last.blocks === this.clipBlockCount) {
      this.clipBlockCount = last.block;
      runs.pop();
    }
  }

  /**
   * Slides every terrain region down, lowest first, to the first free run
   * of the regions' that holds it (at worst where it was), so their free
   * runs come together above them. Only the directory points at a region,
   * and the writes are queued before any later draw.
   */
  private packTerrainClips(): void {
    const slots = this.terrainClipRuns
      .map((run, slot) => (run ? slot : -1))
      .filter((slot) => slot >= 0)
      .sort(
        (a, b) =>
          this.terrainClipRuns[a]!.block - this.terrainClipRuns[b]!.block,
      );
    const runs = this.freeClipRuns;
    for (const slot of slots) {
      const run = this.terrainClipRuns[slot]!;
      this.freeRun(run.block, run.blocks, false);
      // Its own blocks are free again, so some run holds it.
      const i = runs.findIndex((r) => r.blocks >= run.blocks);
      const free = runs[i]!;
      const moved = free.block !== run.block;
      run.block = free.block;
      free.block += run.blocks;
      free.blocks -= run.blocks;
      if (free.blocks === 0) {
        runs.splice(i, 1);
      }
      if (moved) {
        this.writeTerrainClip(slot);
      }
    }
    this.trimClipRuns();
  }

  /**
   * @internal Which terrain clip regions (a bit per slot) a globe tile's
   * record tests per fragment: inside any of them it draws nothing.
   */
  setTerrainClip(handle: DrawHandle, mask: number): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    if (this.drawConstants.setTerrainClip(handle.index, mask)) {
      this.markDirty(handle.index);
    }
  }

  /**
   * `count` consecutive clip blocks for a terrain region: the smallest of
   * the regions' free runs that holds them, else a run of placeholders'
   * free blocks, else new ones (the buffer grows). -1 when none is free.
   */
  private allocateClipRun(count: number): number {
    const runs = this.freeClipRuns;
    let fit = -1;
    for (let i = 0; i < runs.length; i++) {
      if (
        runs[i]!.blocks >= count &&
        (fit < 0 || runs[i]!.blocks < runs[fit]!.blocks)
      ) {
        fit = i;
      }
    }
    if (fit >= 0) {
      const run = runs[fit]!;
      const block = run.block;
      run.block += count;
      run.blocks -= count;
      if (run.blocks === 0) {
        runs.splice(fit, 1);
      }
      return block;
    }
    const free = this.freeClipBlocks;
    if (free.length >= count) {
      free.sort((a, b) => a - b);
      for (let i = 0; i + count <= free.length; i++) {
        if (free[i + count - 1]! - free[i]! === count - 1) {
          const block = free[i]!;
          free.splice(i, count);
          return block;
        }
      }
    }
    const block = this.clipBlockCount;
    if (block + count > this.maxClipBlocks) {
      return -1;
    }
    this.clipBlockCount += count;
    if (block + count > this.clipRows) {
      this.growClips(block + count);
    }
    return block;
  }

  /** Whether ray casts with `collisionOnly` may hit the draw. */
  setCollision(handle: DrawHandle, collision: boolean): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const flags = this.recordsU32[handle.index * RECORD_WORDS + FLAGS_WORD]!;
    const next = collision
      ? flags | RecordFlags.collision
      : flags & ~RecordFlags.collision;
    if (this.drawConstants.setFlags(handle.index, next)) {
      this.uploadsPending = true;
    }
  }

  /**
   * Casts rays (float64 origins, unit directions, in the coordinates of
   * `options.anchor`, by default the table's root) against the triangles of
   * the draws under that anchor they may hit, and resolves each ray's
   * nearest hit distance in meters, or undefined. Brute force on the GPU
   * over the draws whose bounds a ray crosses (`raycast.slang`); one
   * readback.
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
    // Jobs by slab: each slab's triangles are bound with its own group.
    const bySlab = this.rayJobs(rays, options);
    if (bySlab.size === 0) {
      return out;
    }
    const device = this.ctx.device;
    const rayData = new Float32Array(rays.length * 12);
    const rayWords = new Uint32Array(rayData.buffer);
    rays.forEach((ray, i) => {
      for (let k = 0; k < 3; k++) {
        const value = ray.origin[k]!;
        const hi = splitHigh(value);
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
    const jobBuffers: GPUBuffer[] = [];
    const encoder = device.createCommandEncoder({ label: "world.raycast" });
    const pass = encoder.beginComputePass({ label: "raycast" });
    // The tables as the CPU has them (draws added since the last frame).
    this.uploadTables(pass);
    pass.setPipeline(pipeline);
    // Every slab's jobs into the same hits (an atomic min per ray).
    for (const [id, jobs] of bySlab) {
      const slab = this.slabs.get(id);
      const jobBuffer = buffer("jobs", jobs, STORAGE);
      jobBuffers.push(jobBuffer);
      const group = device.createBindGroup({
        label: `world.raycast.slab${id}`,
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          rayBuffer,
          jobBuffer,
          this.recordBuffer,
          this.transformBuffer,
          this.instanceBuffer,
          slab.vertexBuffer,
          slab.indexBuffer,
          hitBuffer,
        ].map((b, binding) => ({ binding, resource: { buffer: b } })),
      });
      pass.setBindGroup(0, group);
      const count = jobs.length / 4;
      const x = Math.min(count, 65535);
      pass.dispatchWorkgroups(x, Math.ceil(count / x));
    }
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
      for (const b of [rayBuffer, ...jobBuffers, hitBuffer, readback]) {
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
  ): Map<number, Uint32Array<ArrayBuffer>> {
    const bySlab = new Map<number, number[]>();
    let jobs: number[] = [];
    const u = this.recordsU32;
    const f = this.recordsF32;
    const mask = options.viewMask ?? ALL_VIEWS;
    let anchorSlot = 0;
    if (options.anchor) {
      this.checkAnchor(options.anchor, "castRays");
      anchorSlot = options.anchor.slot;
    }
    const only = options.draws
      ? new Set(
          options.draws.filter((d) => this.hasDraw(d)).map((d) => d.index),
        )
      : undefined;
    if (only) {
      const name = (slot: number) =>
        slot === 0
          ? "no anchor (the table's root)"
          : `the anchor ${this.anchorSlots[slot]?.name ?? `in slot ${slot}`}`;
      for (const draw of only) {
        const t = u[draw * RECORD_WORDS + TRANSFORM_WORD]!;
        const slot = this.transformAnchor[t]!;
        if (slot !== anchorSlot) {
          throw new Error(
            `castRays: draw ${draw} is under ${name(slot)}; the cast's rays are under ${name(anchorSlot)}.`,
          );
        }
      }
    }
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
        (only && !only.has(i)) ||
        options.exclude?.(i) === true
      ) {
        continue;
      }
      const o = i * RECORD_WORDS;
      const flags = u[o + FLAGS_WORD]!;
      let slabJobs = bySlab.get(batch.mesh.slab);
      if (!slabJobs) {
        slabJobs = [];
        bySlab.set(batch.mesh.slab, slabJobs);
      }
      jobs = slabJobs;
      if (
        flags & RecordFlags.hidden ||
        (options.collisionOnly && !(flags & RecordFlags.collision)) ||
        (!only && (u[o + VIEW_MASK_WORD]! & mask) === 0)
      ) {
        continue;
      }
      const t = u[o + TRANSFORM_WORD]!;
      if (
        this.transformHiddenWorld[t] === 1 ||
        this.transformAnchor[t] !== anchorSlot
      ) {
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
    const out = new Map<number, Uint32Array<ArrayBuffer>>();
    for (const [slab, list] of bySlab) {
      if (list.length > 0) {
        out.set(slab, Uint32Array.from(list));
      }
    }
    return out;
  }

  /**
   * A placement parameter (plan 5a's call 42): one float in this world's
   * placements buffer, which every placement naming it reads, so a morph
   * writes 4 bytes a tick however many draws it moves. Setting its `value`
   * to a non-finite number throws a `RangeError` (as `value` here does)
   * and keeps the old value; a dual position or blend that grows past its
   * bounds (`maxDisplacement`) as it changes grows its draws' bounds too.
   */
  createPlacementParameter(value: number): PlacementParameter {
    checkParameterValue("createPlacementParameter", value);
    const word = this.placementTable.allocateParameter(value);
    const slot: ParameterSlot = { word, draws: new Set() };
    let current = value;
    const changed = () => this.parameterChanged(slot, current);
    const parameter: PlacementParameter = Object.seal({
      get value() {
        return current;
      },
      set value(next: number) {
        checkParameterValue("PlacementParameter", next);
        if (next === current) {
          return;
        }
        current = next;
        changed();
      },
    });
    this.parameters.set(parameter, slot);
    return parameter;
  }

  /**
   * Sets the draw's placement (spec section 7.6): a dual position, a
   * fitted operation or a blend, evaluated per vertex before its custom
   * vertex stage (shaders/placement.slang); `undefined` or `{ kind:
   * "affine" }` leaves the transform alone. The draw's bounding radius
   * grows by the placement's largest displacement (`maxDisplacement`).
   * The placement is copied into the placements buffer: set it again after
   * changing its numbers (its parameters are read live). Vertex buffers
   * are never written.
   *
   * Refuses (nothing changed) a non-finite number, naming its field (plan
   * 5a's Review Focus 4); a parameter of another world; a dual position
   * whose semantic isn't one of the draw's mesh's attributes of 3
   * components; and a billboard or point draw, whose positions are
   * offsets on screen.
   */
  setPlacement(handle: DrawHandle, placement: Placement | undefined): void {
    if (!this.hasDraw(handle)) {
      throw new Error("setPlacement: the draw was removed.");
    }
    const index = handle.index;
    const next =
      placement !== undefined && placement.kind !== "affine"
        ? placement
        : undefined;
    const o = index * RECORD_WORDS;
    if (next) {
      checkPlacement("setPlacement", next);
      const flags = this.recordsU32[o + FLAGS_WORD]!;
      if (flags & (RecordFlags.billboard | RecordFlags.points)) {
        throw new Error(
          "setPlacement: a billboard or point draw's positions are offsets on screen; it has no per-vertex placement.",
        );
      }
      for (const t of parametersOf(next)) {
        if (!this.parameters.has(t)) {
          throw new Error(
            "setPlacement: the placement's t isn't a parameter of this world (World.createPlacementParameter).",
          );
        }
      }
      if (next.kind === "dual") {
        const mesh = this.drawBatches[index]!.mesh;
        const components = this.meshRanges
          .get(mesh.id)
          ?.named?.get(next.semantic);
        if (components === undefined || components < 3) {
          throw new RangeError(
            `setPlacement: the draw's mesh has no ${next.semantic} attribute of 3 components for its dual position.`,
          );
        }
      }
    }
    const old = this.drawPlacements[index];
    const base = old ? old.base : this.recordsF32[o + RADIUS_WORD]!;
    this.releasePlacement(index);
    if (!next) {
      if (old) {
        this.drawConstants.setPlacement(index, NO_PLACEMENT);
        this.drawConstants.setRadius(index, base);
        this.contentRevision_++;
        this.markDirty(index);
      }
      return;
    }
    const reach = this.placementReach(index, next, base);
    const at = this.placementTable.add(
      next,
      (t) => this.parameters.get(t)!.word,
    );
    const pad = maxDisplacement(next, reach);
    const slots = parametersOf(next).map((t) => this.parameters.get(t)!);
    for (const slot of slots) {
      slot.draws.add(index);
    }
    this.drawPlacements[index] = {
      placement: next,
      at,
      base,
      pad,
      reach,
      slots,
    };
    this.drawConstants.setPlacement(index, at);
    this.drawConstants.setRadius(index, base + pad);
    this.contentRevision_++;
    this.markDirty(index);
  }

  /** The draw's per-vertex placement (`setPlacement`), if any. */
  drawPlacement(handle: DrawHandle): Placement | undefined {
    return this.hasDraw(handle)
      ? this.drawPlacements[handle.index]?.placement
      : undefined;
  }

  /** A parameter changed: its float, and its draws' bounds and views. */
  private parameterChanged(slot: ParameterSlot, value: number): void {
    this.placementTable.setParameter(slot.word, value);
    if (slot.draws.size === 0) {
      return;
    }
    let views = 0;
    for (const index of slot.draws) {
      const placed = this.drawPlacements[index]!;
      const pad = maxDisplacement(placed.placement, placed.reach);
      if (pad !== placed.pad) {
        placed.pad = pad;
        this.drawConstants.setRadius(index, placed.base + pad);
        this.uploadsPending = true;
      }
      views |= this.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD]!;
    }
    this.version++;
    this.changedViews |= views;
  }

  /** Frees a draw's placement block and its parameters' links to it. */
  private releasePlacement(index: number): void {
    const placed = this.drawPlacements[index];
    if (!placed) {
      return;
    }
    this.placementTable.remove(placed.at, placed.placement);
    for (const slot of placed.slots) {
      slot.draws.delete(index);
    }
    this.drawPlacements[index] = undefined;
  }

  /**
   * How far a draw's vertices reach in a fitted operation's normalized
   * coordinates (at least 1): its bounding sphere's farthest point from
   * the operation's center over its scale.
   */
  private placementReach(
    index: number,
    placement: Placement,
    radius: number,
  ): number {
    const o = index * RECORD_WORDS + CENTER_WORD;
    const f32 = this.recordsF32;
    const reach = (f: "identity" | FittedOperation) =>
      f === "identity"
        ? 1
        : (Math.hypot(
            f32[o]! - f.center[0]!,
            f32[o + 1]! - f.center[1]!,
            f32[o + 2]! - f.center[2]!,
          ) +
            radius) /
          f.scale;
    switch (placement.kind) {
      case "fitted":
        return Math.max(1, reach(placement));
      case "blend":
        return Math.max(1, reach(placement.from), reach(placement.to));
      default:
        return 1;
    }
  }

  /** Changes a draw's tint (linear RGBA, multiplied with its material). */
  setColor(handle: DrawHandle, color: ArrayLike<number>): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    this.drawConstants.setColor(handle.index, color);
    this.markDirty(handle.index);
  }

  setVisible(handle: DrawHandle, visible: boolean): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const flags = this.recordsU32[handle.index * RECORD_WORDS + FLAGS_WORD]!;
    this.drawConstants.setFlags(
      handle.index,
      visible ? flags & ~RecordFlags.hidden : flags | RecordFlags.hidden,
    );
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
    } else if (this.batchesShownChanged) {
      this.bundle = this.recordBundle();
    }
    this.batchesShownChanged = false;
    this.cullParamsData[0] = this.drawCount;
    this.cullParamsData[1] = this.batchList.length;
    this.cullParamsData[2] = this.instanceHighWater;
    // Instance items follow the draw rows (cull.slang `firstInstanceItem`).
    this.cullParamsData[3] = this.drawRows;
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
   * The bundle drawing this world's ground into a height capture (the
   * casters, without depth bias; Engine `addHeightCapture`).
   */
  heightBundle(): GPURenderBundle {
    if (!this.heights || this.heightsFor !== this.bundle) {
      this.heights = this.recordBundle("height");
      this.heightsFor = this.bundle;
    }
    return this.heights;
  }
  private heights: GPURenderBundle | undefined;
  private heightsFor: GPURenderBundle | undefined;

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
  /**
   * One view's cull. `points`: also its point draws' (pointCull.slang),
   * for views that draw them (not shadow cascades or height captures),
   * `pixels` the view's (their splats' buffers).
   */
  encodeCull(
    encoder: GPUCommandEncoder,
    timestampWrites?: GPUComputePassTimestampWrites,
    points = true,
    pixels = 0,
  ): void {
    const { pipelines, currentViewBindGroup } = this.ctx;
    // The batches' instance counts start at zero (cull.slang `append`
    // counts into them); the rest of the arguments `writeDrawArgs` writes.
    this.drawArguments.clear(encoder, this.batchList.length);
    if (points && this.pointDraws.size) {
      encoder.clearBuffer(this.pointCounts);
      if ([...this.pointDraws.values()].some((d) => d.tiny > 0)) {
        if (pixels > this.splats.pixels) {
          // Larger buffers: every point draw's group binds them.
          this.splats.depth.destroy();
          this.splats.color.destroy();
          this.splats.feature.destroy();
          this.splats = this.createSplats(pixels);
          for (const draw of this.pointDraws.values()) {
            draw.group = this.pointGroup(draw);
          }
        }
        encoder.clearBuffer(this.splats.depth, 0, Math.max(4, pixels * 4));
      }
    }
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
      // Two dimensions past 65,535 groups (`cullInstances` reads them).
      const groups = Math.ceil(this.instanceHighWater / 64);
      const x = Math.min(groups, 65535);
      pass.dispatchWorkgroups(x, Math.ceil(groups / x));
    }
    pass.setPipeline(pipelines.writeDrawArgs);
    pass.dispatchWorkgroups(Math.ceil(Math.max(this.batchList.length, 1) / 64));
    // Point draws: their points in view into their lists (or splatted),
    // then their arguments (over `writeDrawArgs`'), with the narrower
    // world group their kernels read.
    if (points && this.pointDraws.size) {
      pass.setBindGroup(1, this.pointCullBindGroup);
    }
    for (const draw of points ? this.pointDraws.values() : []) {
      pass.setBindGroup(2, draw.group);
      const groups = Math.ceil(Math.max(1, draw.mesh.points.capacity) / 64);
      const x = Math.min(groups, 65535);
      const y = Math.ceil(groups / x);
      if (draw.culler) {
        draw.culler.encode(pass, x, y);
        continue;
      }
      pass.setPipeline(pipelines.cullPoints);
      pass.dispatchWorkgroups(x, y);
      pass.setPipeline(pipelines.writePointArgs);
      pass.dispatchWorkgroups(1);
    }
    pass.end();
  }

  /** Uploads changed table entries (a scatter is encoded into `pass`). */
  private uploadTables(pass: GPUComputePassEncoder): void {
    if (!this.uploadsPending) {
      return;
    }
    this.uploadsPending = false;
    this.drawConstants.upload(pass);
    this.transforms.upload(pass);
    this.instances.upload(pass);
    // Kernels writing the tables each frame (tracks' instance rows), after
    // the uploads and before any view culls.
    for (const encode of this.frameComputes) {
      encode(pass);
    }
  }

  /**
   * Runs `encode` once per frame in this world's first cull pass, after
   * table uploads and before culling: for kernels that write the tables
   * on the GPU (e.g. tracks' instance rows; their rows must not also be
   * changed on the CPU). It sets its own pipeline and bind groups. Returns
   * the remover.
   */
  addFrameCompute(encode: (pass: GPUComputePassEncoder) => void): () => void {
    this.frameComputes.push(encode);
    return () => {
      const i = this.frameComputes.indexOf(encode);
      if (i >= 0) {
        this.frameComputes.splice(i, 1);
      }
    };
  }

  /** A draw's first row in the instance table (`instanceBuffer`). */
  instanceFirst(handle: DrawHandle): number {
    return this.recordsU32[handle.index * RECORD_WORDS + INSTANCE_FIRST_WORD]!;
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
        const first = this.drawRows + this.recordsU32[o + INSTANCE_FIRST_WORD]!;
        for (let k = 0; k < count; k++) {
          direct[batch.itemBase + fill[batch.index]!++] = first + k;
        }
      }
    }
    const queue = this.ctx.device.queue;
    queue.writeBuffer(this.batchBuffer, 0, table);
    this.drawArguments.writeDirect(direct);
    for (const [record, draw] of this.pointDraws) {
      this.writePointParams(draw, record);
    }
  }

  /**
   * One draw per batch, grouped by cull mode and texture set: the opaque
   * pass's, or the sun's shadow casters' (depth only; no lines).
   */
  private recordBundle(
    kind: "opaque" | "shadow" | "height" | "prepass" | "depth" = "opaque",
  ): GPURenderBundle {
    const { device, targets, currentViewBindGroup } = this.ctx;
    // Height captures draw the casters, with their own pipelines.
    const height = kind === "height";
    const shadow = kind === "shadow" || height;
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
    // Group 1 and the index buffer are the batch's slab's (set below).
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
          : height
            ? masked(batch)
              ? batch.doubleSided
                ? "heightMaskedDoubleSided"
                : "heightMasked"
              : batch.doubleSided
                ? "heightDoubleSided"
                : "height"
            : shadow
              ? masked(batch)
                ? batch.doubleSided
                  ? "shadowMaskedDoubleSided"
                  : "shadowMasked"
                : batch.doubleSided
                  ? "shadowDoubleSided"
                  : "shadow"
              : batch.points
                ? "opaquePoints"
                : batch.mesh.topology === "line-list"
                  ? "opaqueLines"
                  : batch.instanced
                    ? batch.doubleSided
                      ? "opaqueInstancedDoubleSided"
                      : "opaqueInstanced"
                    : batch.doubleSided
                      ? "opaqueDoubleSided"
                      : "opaque";
    const rank = (batch: Batch) =>
      batch.mesh.topology === "line-list" ? 2 : Number(batch.doubleSided);
    // Only batches some view draws (`Batch.shown`): the cache's resident
    // tiles that no view selected cost nothing here.
    const order = this.batchList
      .filter((batch) => batch.shown > 0)
      .sort(
        (a, b) =>
          rank(a) - rank(b) ||
          (a.shader?.id ?? 0) - (b.shader?.id ?? 0) ||
          a.textureSet - b.textureSet ||
          a.mesh.slab - b.mesh.slab,
      );
    const direct = this._submission === "direct";
    let pipeline: GPURenderPipeline | undefined;
    let group: GPUBindGroup | undefined;
    let slab = -1;
    for (const batch of order) {
      if (
        batch.items === 0 ||
        this.brokenTextureSets.has(batch.textureSet) ||
        ((shadow || prepass || depth) && batch.mesh.topology === "line-list") ||
        // Point sets and instances shade outside the opaque pass's depth
        // prepass; point sets aren't ground either (their strips are the
        // opaque pass's alone).
        (depth && (batch.points || batch.instanced)) ||
        (height && batch.points) ||
        // Billboards face the camera: no shadows, no ambient occlusion.
        ((shadow || prepass) && batch.billboard)
      ) {
        continue;
      }
      if (batch.mesh.slab !== slab) {
        slab = batch.mesh.slab;
        this.bindSlab(encoder, slab);
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
      this.drawArguments.drawBatch(encoder, batch, direct);
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
        entries: [
          ...this.textureSetEntries[batch.textureSet]!.filter(
            (e) =>
              shader.readsPropertyTextures ||
              e.binding < PROPERTY_TEXTURE_BINDING,
          ),
          ...own.entries,
        ],
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
   * The nearest and farthest a blended surface may be from `eye` (the
   * bounding spheres of the draws the view of `viewBit` draws: shown and
   * in its view mask, as the cull's `drawable`), m; undefined without any,
   * and the view then runs no translucent passes. Unlike the cull it
   * doesn't test the frustum, empty draws (no indices) or a height
   * capture's ground-only rule: those can only run the passes for
   * nothing, never leave a drawn surface out.
   */
  translucentRange(
    eye: ArrayLike<number>,
    viewBit: number = ALL_VIEWS,
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
        (u[o + VIEW_MASK_WORD]! & viewBit) === 0 ||
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
    pass.setBindGroup(3, group);
    const direct = this._submission === "direct";
    let current: GPURenderPipeline | undefined;
    let bound: GPUBindGroup | undefined;
    let slab = -1;
    for (const batch of this.batchList) {
      if (
        batch.shown === 0 ||
        !this.translucent(batch) ||
        this.brokenTextureSets.has(batch.textureSet)
      ) {
        continue;
      }
      if (batch.mesh.slab !== slab) {
        slab = batch.mesh.slab;
        this.bindSlab(pass, slab);
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
      this.drawArguments.drawBatch(pass, batch, direct);
    }
  }

  private createCullBindGroup(): void {
    this.cullBindGroup = this.ctx.device.createBindGroup({
      label: "world.cull",
      layout: this.ctx.pipelines.cullWorldLayout,
      // Binding 5 (batch counts) is gone: the cull counts into the
      // arguments' instance counts.
      entries: (
        [
          [0, this.recordBuffer],
          [1, this.transformBuffer],
          [2, this.instanceBuffer],
          [3, this.itemBuffer],
          [4, this.drawArguments.itemList],
          [6, this.batchBuffer],
          [7, this.drawArguments.buffer],
          [8, this.cullParams],
        ] as const
      ).map(([binding, b]) => ({ binding, resource: { buffer: b } })),
    });
    this.pointCullBindGroup = this.ctx.device.createBindGroup({
      label: "world.cull.points",
      layout: this.ctx.pipelines.cullPointWorldLayout,
      entries: [
        { binding: 0, resource: { buffer: this.recordBuffer } },
        { binding: 1, resource: { buffer: this.transformBuffer } },
        { binding: 7, resource: { buffer: this.drawArguments.buffer } },
      ],
    });
  }

  /**
   * Room for instance rows below `count` on the GPU: the instance table and
   * the per-item buffers double (up to `maxInstances`), and what binds them
   * is rebuilt.
   */
  private growInstances(count: number): void {
    const rows = grownSize(this.instances.gpuRows, count, this.maxInstances);
    this.instances.growGpu(rows);
    this.instanceBuffer = this.instances.buffer;
    this.recreateItemBuffers();
    this.tablesReplaced();
  }

  /**
   * Room for draw slots below `count` on the GPU (§13.15, growable tables):
   * the records double (copied), the per-batch buffers and the items are
   * recreated (rewritten every frame or with the bundle), and what binds
   * them is rebuilt.
   */
  private growDraws(count: number): void {
    const rows = grownSize(this.drawRows, count, this.maxDraws);
    this.drawConstants.growGpu(rows);
    this.recordBuffer = this.drawConstants.buffer;
    this.batchBuffer.destroy();
    this.batchBuffer = this.createBatchBuffer(rows);
    this.drawArguments.growBatches(rows);
    this.drawRows = rows;
    this.recreateItemBuffers();
    this.tablesReplaced();
  }

  /** Room for transforms below `count` on the GPU (copied, rebound). */
  private growTransforms(count: number): void {
    this.transforms.growGpu(
      grownSize(this.transforms.gpuRows, count, this.maxTransforms),
    );
    this.transformBuffer = this.transforms.buffer;
    this.tablesReplaced();
  }

  /** Room for materials below `count` on the GPU (rewritten, rebound). */
  private growMaterials(count: number): void {
    this.materialRows = grownSize(this.materialRows, count, this.maxMaterials);
    this.materialBuffer.destroy();
    this.materialBuffer = this.ctx.device.createBuffer({
      label: "world.materials",
      size: this.materialRows * MATERIAL_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    // The whole table is written with the next frame.
    this.materialsDirty = true;
    this.tablesReplaced();
  }

  /** Room for clip blocks below `count` on the GPU (copied, rebound). */
  private growClips(count: number): void {
    const rows = grownSize(this.clipRows, count, this.maxClipBlocks);
    const { device } = this.ctx;
    const old = this.clipBuffer;
    this.clipBuffer = device.createBuffer({
      label: "world.clipBoxes",
      size: rows * this.clipScratch.byteLength,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    const encoder = device.createCommandEncoder({ label: "world.grow" });
    encoder.copyBufferToBuffer(old, 0, this.clipBuffer, 0, old.size);
    device.queue.submit([encoder.finish()]);
    old.destroy();
    this.clipRows = rows;
    this.tablesReplaced();
  }

  /**
   * Point-draw counters up to `count` (cleared every frame, so the buffer is
   * only recreated), and the point draws' groups that bind it.
   */
  private growPointSets(count: number): void {
    if (count <= this.pointSetCount) {
      return;
    }
    if (this.pointCounts.size < count * 4) {
      this.pointCounts.destroy();
      this.pointCounts = this.ctx.device.createBuffer({
        label: "world.pointCounts",
        size: count * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      for (const draw of this.pointDraws.values()) {
        draw.group = this.pointGroup(draw);
      }
    }
    // The lowest counters first.
    for (let k = count - 1; k >= this.pointSetCount; k--) {
      this.freePointCounters.push(k);
    }
    this.pointSetCount = count;
  }

  /** The batch table for `rows` batches (their arguments: `drawArguments`). */
  private createBatchBuffer(rows: number): GPUBuffer {
    return this.ctx.device.createBuffer({
      label: "world.batches",
      size: rows * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  /** The items and their lists for the current draw and instance rows. */
  private recreateItemBuffers(): void {
    const items = this.drawRows + this.instances.gpuRows;
    const { device } = this.ctx;
    this.itemBuffer.destroy();
    this.itemBuffer = device.createBuffer({
      label: "world.items",
      size: items * DRAW_ITEM_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    this.drawArguments.growItems(items);
  }

  /**
   * A table's buffer was replaced: rebuild the groups that bind it, drop the
   * bundles that baked them (the direct list is rewritten with the
   * batches), and tell outside binders (`tableGeneration`).
   */
  private tablesReplaced(): void {
    this.createCullBindGroup();
    this.createDrawBindGroup();
    this.bundle = undefined;
    this.translucentDraws = undefined;
    this.changedViews = ALL_VIEWS;
    this.version++;
    this.instanceGeneration++;
  }

  /** Every slab's draw group (the world's tables, the slab's arena). */
  private createDrawBindGroup(): void {
    for (const slab of this.slabs.slabs) {
      if (slab) {
        this.createSlabDrawGroup(slab);
      }
    }
  }

  private createSlabDrawGroup(slab: Slab): void {
    const buffers = [
      this.recordBuffer,
      this.itemBuffer,
      slab.vertexBuffer,
      this.materialBuffer,
      this.clipBuffer,
    ];
    slab.drawGroup = this.ctx.device.createBindGroup({
      label: `world.draw.slab${slab.id}`,
      layout: this.ctx.pipelines.drawWorldLayout,
      entries: [
        ...buffers.map((b, binding) => ({ binding, resource: { buffer: b } })),
        { binding: 5, resource: this.imageryView },
        { binding: 6, resource: this.imagerySampler },
        // Placements (placement.slang): the vertex stage's.
        { binding: 7, resource: { buffer: this.placementTable.buffer } },
      ],
    });
  }

  /** Binds a slab's group 1 and index buffer for its batches' draws. */
  private bindSlab(
    pass: GPURenderPassEncoder | GPURenderBundleEncoder,
    id: number,
  ): void {
    const slab = this.slabs.get(id);
    pass.setBindGroup(1, slab.drawGroup!);
    pass.setIndexBuffer(slab.indexBuffer, "uint32");
  }

  /**
   * A slab grew, opened or closed (scene/Slabs.ts): its group is rebuilt,
   * point draws in it rebind their arena, bundles are recorded again, and
   * outside binders (point sources, model pools) see `tableGeneration`.
   */
  private slabReplaced(slab: Slab): void {
    if (this.slabs.slabs[slab.id] === slab) {
      // The world's own tables exist once the constructor has made them.
      if (this.recordBuffer) {
        this.createSlabDrawGroup(slab);
      }
    } else {
      slab.drawGroup = undefined;
    }
    for (const draw of this.pointDraws.values()) {
      if (draw.mesh.slab === slab.id) {
        draw.group = this.pointGroup(draw);
      }
    }
    this.bundle = undefined;
    this.translucentDraws = undefined;
    this.changedViews = ALL_VIEWS;
    this.version++;
    this.instanceGeneration++;
  }

  /** The vertex arena buffer holding `mesh` (its slab's, scene/Slabs.ts). */
  vertexBufferOf(mesh: MeshHandle): GPUBuffer {
    return this.slabs.get(mesh.slab).vertexBuffer;
  }

  private markDirty(index: number): void {
    this.drawConstants.mark(index);
    this.uploadsPending = true;
    this.version++;
    this.changedViews |=
      this.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD]!;
  }

  /** The world was destroyed (`destroy`): its GPU resources are gone. */
  get destroyed(): boolean {
    return this.destroyed_;
  }
  private destroyed_ = false;

  destroy(): void {
    this.destroyed_ = true;
    this.stopTracking();
    for (const chunk of this.uploadChunks) {
      chunk.buffer.destroy();
    }
    for (const draw of this.pointDraws.values()) {
      draw.params.destroy();
    }
    this.splats.depth.destroy();
    this.splats.color.destroy();
    this.splats.feature.destroy();
    this.pointCounts.destroy();
    this.drawConstants.destroy();
    this.drawArguments.destroy();
    this.placementTable.destroy();
    this.transforms.destroy();
    this.instances.destroy();
    this.slabs.destroy();
    for (const buffer of [
      this.itemBuffer,
      this.materialBuffer,
      this.clipBuffer,
      this.batchBuffer,
      this.cullParams,
    ]) {
      buffer.destroy();
    }
  }
}

/** A draw's per-vertex placement (`World.setPlacement`). */
interface DrawPlacement {
  placement: Placement;
  /** Its block's header row in the placements buffer. */
  at: number;
  /** The record's bounding radius without the placement (model units). */
  base: number;
  /** What the placement adds to it (`maxDisplacement`). */
  pad: number;
  /** How far its vertices reach in a fitted operation's coordinates. */
  reach: number;
  /** The parameters it reads. */
  slots: ParameterSlot[];
}

/** A placement parameter's float and the draws whose placements read it. */
interface ParameterSlot {
  word: number;
  draws: Set<number>;
}

/** The parameters a placement reads. */
function parametersOf(placement: Placement): PlacementParameter[] {
  return placement.kind === "dual" || placement.kind === "blend"
    ? [placement.t]
    : [];
}

/** A point draw (`World.addDraw` of a point mesh) and its per-view cull. */
interface PointDraw {
  mesh: PointMesh;
  /** Arena byte offset of its list. */
  list: number;
  counter: number;
  params: GPUBuffer;
  group: GPUBindGroup;
  batch: Batch;
  culler: PointCuller | undefined;
  /** Symbols up to this many pixels are splatted (0: none). */
  tiny: number;
}

/** A point draw's cull parameters (pointCull.slang `PointCull`). */
const POINT_CULL_BYTES = 48;
/** Pixels past a view's edges a point's symbol may reach. */
const POINT_MARGIN = 64;

/** Hit distance bits meaning "no hit" (the largest finite float). */
const NO_HIT = 0x7f7fffff;
/** Smallest staging buffer for queued uploads. */
const UPLOAD_CHUNK_BYTES = 1 << 20;
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

/** A feature table's numeric columns as the arena holds them. */
interface TableColumn {
  name: string;
  data: Float32Array;
  components: number;
}

const tableColumnCache = new WeakMap<FeatureTable, TableColumn[]>();

/**
 * A feature table's columns as uploaded (`World.uploadTable`): numbers,
 * booleans (0 or 1) and numeric arrays of up to 4 (shorter rows padded
 * with zero), as float32 rows by local feature ID; missing values (null)
 * read 0. String columns aren't uploaded. Computed once per table.
 */
function tableColumnData(table: FeatureTable): TableColumn[] {
  let columns = tableColumnCache.get(table);
  if (columns) {
    return columns;
  }
  columns = [];
  for (const [name, values] of Object.entries(table.columns)) {
    let components = 0;
    let numeric = true;
    for (const v of values) {
      if (typeof v === "number" || typeof v === "boolean") {
        components = Math.max(components, 1);
      } else if (Array.isArray(v) && v.every((x) => typeof x === "number")) {
        components = Math.max(components, v.length);
      } else if (v !== null) {
        numeric = false;
        break;
      }
    }
    if (!numeric || components === 0 || components > 4) {
      continue;
    }
    const data = new Float32Array(Math.max(1, table.count) * components);
    values.forEach((v, row) => {
      if (Array.isArray(v)) {
        data.set(v as number[], row * components);
      } else if (v !== null) {
        data[row * components] = Number(v);
      }
    });
    columns.push({ name, data, components });
  }
  tableColumnCache.set(table, columns);
  return columns;
}

function align4(bytes: number): number {
  return Math.ceil(bytes / 4) * 4;
}
