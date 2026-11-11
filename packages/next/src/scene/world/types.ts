// The types of a world's options, handles and internal tables.
import type { FrameKey } from "../../camera/frameResolver.ts";
import type { ClipFilter } from "../../geometry/query.ts";
import type { FeatureTable, FeatureValue } from "../../io/gltfTypes.ts";
import type { Mat4 } from "../../math/mat4.ts";
import type { Vec3 } from "../../math/vec3.ts";
import type { MeshStreams, MaterialData } from "../../render/layout.ts";
import type { Body } from "../Body.ts";
import type { CustomShader } from "../CustomShader.ts";
import type { PointCuller } from "../PointCuller.ts";
import type { SceneItem } from "../SceneItem.ts";
import type { World } from "../World.ts";
import type { Placement } from "../placement.ts";
import type { TermBounds } from "../warpBounds.ts";
import type { WarpAt } from "../warpAnchor.ts";
import type { WarpTerms } from "../warpTerms.ts";

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
   * The most one slab's vertex or index buffer grows to by doubling
   * (default 256 MiB, and never past the device's largest storage
   * binding). A range larger than this gets a slab of its own, at its
   * size, up to the binding.
   */
  slabBytes?: number;
  /**
   * Clip blocks, of 8 boxes each (default 16,384, at least 2). Block 0 is
   * the terrain clip regions' directory. A quarter of the rest, at most
   * 3,840 blocks (32 regions of `MAX_TERRAIN_CLIP_BLOCKS`), is set aside
   * for terrain regions (`Globe.terrain.addRegion`); the others
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
  /** A globe tile's first skirt vertex (`MeshData.skirtStart`), if any. */
  readonly skirtStart?: number;
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

/**
 * A b-rep's patches as a mesh (`World.addPatchMesh`, provisional): the
 * span records and control points (src/brep/gpuPatches.ts) in the slab's
 * arena, drawn by a view's dice kernel and vertex stage instead of from
 * vertices. A draw of it (`addDraw`) is a patch draw (`PatchDraw`).
 */
export interface PatchMesh extends MeshHandle {
  readonly patches: {
    /** Arena word of the first span record. */
    readonly table: number;
    readonly spans: number;
    /** The target error a cell may leave, pixels, a draw starts with. */
    readonly errorPixels: number;
    /** The most chunks of 8 � 8 cells a draw of it lists per view. */
    readonly maxChunks: number;
    /** Some span's face needs the trim test: its draws use the trimmed pipelines (`SurfacePipelines`). */
    readonly trimmed: boolean;
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
  /**
   * Where the route that places the draw's anchor is evaluated, when it
   * crosses a warp (`World.setWarpAt`): per `"vertex"` (the default), or
   * once at its `"anchor"`, keeping its shape. A billboard or an instanced
   * draw is anchored whatever this says.
   */
  warpAt?: WarpAt;
  /** With `warpAt: "anchor"`: the transform whose origin it moves about (its own by default). */
  warpOrigin?: TransformHandle;
}

/** What a picked feature ID resolves to. */
export interface FeatureInfo {
  draw: DrawHandle;
  /** Feature ID local to the draw's mesh. */
  localId: number;
  name: string | undefined;
  properties?: Record<string, FeatureValue>;
  /** The item that drew it, if an item did (`World.add`). */
  item?: SceneItem;
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
  /**
   * Clips applied (`clipFilter`, scene/world/clips.ts), in the cast's anchor's
   * coordinates: a hit where they remove the surface is passed over, and the
   * nearest kept hit is the answer. Each pass over a removed hit costs one more
   * dispatch (for the rays still searching).
   */
  clips?: ClipFilter;
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

export interface Batch {
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
  /** A patch draw's (`PatchDraw`): its chunks, not an item list, are its instances. */
  patches: boolean;
  /** A patch draw's chunk list, which the draw binds as its instances. */
  chunks: GPUBuffer | undefined;
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
  /**
   * Its records some view's shadow cascades alone draw (`setCasterMask`).
   * Only the shadow bundle holds a batch with these and none shown.
   */
  casters: number;
}

/** A draw's per-vertex placement (`World.setPlacement`). */
export interface DrawPlacement {
  /** The public placement it was set from; undefined when set from terms. */
  placement: Placement | undefined;
  /** What the GPU evaluates: the placement as terms, or the terms it was set with. */
  terms: WarpTerms;
  /** Its block's header row in the placements buffer. */
  at: number;
  /** The record's bounding radius without the placement (model units). */
  base: number;
  /** The record's bounding sphere's centre without it: the record carries the moved one while placed. */
  center: readonly [number, number, number];
  /** What the placement adds to the radius (`drawnSphere`), including the moved centre's float32 rounding. */
  pad: number;
  /** Each term's displacement at the centre and its residual over the sphere (`termBoundsOver`). */
  bounds: TermBounds[];
  /** The parameters it reads. */
  slots: ParameterSlot[];
}

/** A placement parameter's float and the draws whose placements read it. */
export interface ParameterSlot {
  word: number;
  /** Draws with a weight that reads it and has no range: a change recomputes their bounds. A ranged parameter's draws are not here. */
  draws: Set<number>;
  /** How many draws' placements read it, ranged or not. */
  readers: number;
}

/** A point draw (`World.addDraw` of a point mesh) and its per-view cull. */
export interface PointDraw {
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

/**
 * A patch draw (`World.addDraw` of a patch mesh) and its per-view dice:
 * the kernels' parameters and group (shaders/dice.slang), and the chunks
 * they list, which are the draw's instances.
 */
export interface PatchDraw {
  mesh: PatchMesh;
  batch: Batch;
  /** `PatchDice`: the draw's record, batch, span count, capacity, target error and a placement's bounds. */
  params: GPUBuffer;
  /** The chunks, 16 bytes each: instance-step vertex data and the dice's output. */
  chunks: GPUBuffer;
  /** What the view's dice made (shaders/dice.slang `stats`): 4 words, read back by `readPatchStats`. */
  stats: GPUBuffer;
  /** Whether the last cull pass encoded dispatched the draw's dice: false until a frame is encoded after the draw is added, and while no view shows it. */
  diced: boolean;
  capacity: number;
  group: GPUBindGroup;
  errorPixels: number;
  /** A placement's bounds on the surface's error (scene/world/patches.ts `placementBounds`): 1 and 0 without one. */
  jacobian: number;
  curvature: number;
}

/**
 * A feature table's column as the arena holds it: numbers as they are, or
 * a string column, uploaded as the ids of its strings (`stringIds`) when a
 * style reads it.
 */
export interface TableColumn {
  name: string;
  components: number;
  /** A numeric column's float32 rows. */
  data?: Float32Array;
  /** A string column (its rows are the table's). */
  text?: true;
}

/** What a table's columns come to: those to upload, and why others aren't. */
export interface TablePlan {
  columns: TableColumn[];
  /** Column name to the reason it isn't uploaded (a style reading it reads 0). */
  skipped: Map<string, string>;
}
