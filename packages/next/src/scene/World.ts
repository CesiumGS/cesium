import { onTextureDestroyed } from "../gpu/textureTracking.ts";
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
import type { Placement, PlacementParameter } from "./placement.ts";
import { PlacementTable } from "./placementTable.ts";
import type { SceneItem, SceneItemOptions } from "./SceneItem.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import {
  INSTANCE_WORDS,
  INSTANCE_COUNT_WORD,
  INSTANCE_STRIDE_WORD,
  INSTANCE_FIRST_WORD,
  MATERIAL_SIZE,
  NO_FEATURE,
  NO_RECORD,
  NO_STREAM,
  PROPERTY_TEXTURE_BINDING,
  instanceDistanceFlags,
  MAX_DIRECTORY_ENTRIES,
  attributeHash,
  DRAW_ITEM_SIZE,
  RECORD_WORDS,
  TRANSFORM_WORDS,
  TRANSFORM_WORD,
  RADIUS_WORD,
  FEATURE_ID_WORD,
  FLAGS_WORD,
  CASTER_MASK_WORD,
  VIEW_MASK_WORD,
  ALL_VIEWS,
  CLIP_BOXES,
  CLIP_BOX_FLOATS,
  MAX_ANCHORS,
  MAX_TERRAIN_CLIPS,
  MAX_TERRAIN_CLIP_BLOCKS,
  MATERIAL_WORDS,
  MaterialFlags,
  RecordFlags,
  packTint,
  writeInstance,
} from "../render/layout.ts";
import type { Body } from "./Body.ts";
import type { FrameKey } from "../camera/frameResolver.ts";
import type { MeshData } from "./meshes.ts";
import type { FeatureTable } from "../io/gltfTypes.ts";
import { featureName, featureProperties } from "../io/features.ts";
import type { RenderContext, SurfaceKey } from "./RenderContext.ts";
import type { CustomShader } from "./CustomShader.ts";
import { PointCuller } from "./PointCuller.ts";
import { stringIds } from "./stringIds.ts";
import type { UniformDeclaration } from "./uniforms.ts";
import type { LightHandle, LightOptions } from "./lights.ts";
import {
  NO_ACCELERATION,
  type AccelerationStructures,
} from "../streaming/acceleration.ts";
import type {
  SubmissionMode,
  AnchorHandle,
  TransformFrameKey,
  DrawPlacement,
  ParameterSlot,
  Batch,
  PointDraw,
  WorldOptions,
  WorldMemory,
  MeshHandle,
  PointMesh,
  MaterialOptions,
  TextureSetOptions,
  DrawOptions,
  DrawHandle,
  TransformHandle,
  ClipBox,
  ClipHandle,
  CastRay,
  CastOptions,
  FeatureInfo,
} from "./world/types.ts";
import {
  anchorAt,
  IDENTITY,
  resolveTransforms,
  addTransform,
  setTransform,
  setTransformVisible,
  localMatrix,
  worldMatrix,
  drawMatrix,
  removeTransform,
  transformAlive,
  addAnchor,
  bodyAnchor,
  findBodyAnchor,
  anchorOf,
  drawAnchor,
  placeAnchor,
  anchorMatrix,
  removeAnchor,
  frameOf,
} from "./world/transforms.ts";
import { warnUnavailable, uploadTables } from "./world/featureTables.ts";
import { flushUploads, queueUpload } from "./world/uploads.ts";
import {
  addMesh,
  addPointMesh,
  setPointProperties,
  removeMesh,
} from "./world/meshes.ts";
import {
  textureDestroyed,
  addMaterial,
  removeMaterial,
  removeTextureSet,
  textureRefs,
  createTextureSet,
  materialWithFlags,
} from "./world/materials.ts";
import {
  allocateClip,
  freeClip,
  setPlaceholder,
  addTerrainClipRegion,
  removeTerrainClipRegion,
  setTerrainClipOpacity,
  setTerrainClipGround,
  setTerrainClip,
} from "./world/terrainClips.ts";
import { castRays } from "./world/rays.ts";
import {
  releasePlacementParameter,
  releasePlacement,
  createPlacementParameter,
  setPlacement,
  drawPlacement,
} from "./world/placements.ts";

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
  /** @internal The records' words, to read (written through `drawConstants`). */
  get recordsU32(): ArrayLike<number> {
    return this.drawConstants.u32;
  }
  /** @internal */
  get recordsF32(): ArrayLike<number> {
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
  /** @internal */
  readonly transforms: MirroredTable;
  /** @internal */
  transformLocal: Float64Array;
  /** @internal */
  transformWorld: Float64Array;
  /** @internal */
  transformParent: Int32Array;
  /** @internal */
  readonly transformChildren: Array<number[] | undefined> = [];
  /** @internal */
  transformGeneration: Uint32Array;
  /** @internal */
  transformLive: Uint8Array;
  /** @internal Hidden by itself, and by itself or an ancestor. */
  transformHidden: Uint8Array;
  /** @internal */
  transformHiddenWorld: Uint8Array;
  /**
   * @internal The anchor slot a transform hangs under (0: none), inherited from its
   * parent; an anchor's own slot for an anchor.
   */
  transformAnchor: Uint8Array;
  /** @internal Anchors by slot; slot 0 ("no anchor") stays empty. */
  readonly anchorSlots: Array<AnchorHandle | undefined> = [];
  /** @internal Anchors' places in the table root, by slot (16 float64 each). */
  readonly anchorPlaces = new Float64Array(MAX_ANCHORS * 16);
  /** @internal */
  readonly bodyAnchors = new Map<string, AnchorHandle>();
  /** @internal */
  anchorList: readonly AnchorHandle[] | undefined;
  /** @internal `frameOf`'s keys by transform slot. */
  readonly transformFrames = new Map<number, TransformFrameKey>();
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
  /** @internal */
  transformRevision_ = 0;
  /**
   * Counts changes to the anchors' places in the table root: `placeAnchor`
   * and `removeAnchor` only. A route between anchors and the root changes
   * only with it, so animating a node re-places no anchor.
   */
  get anchorPlaceRevision(): number {
    return this.anchorPlaceRevision_;
  }
  /** @internal */
  anchorPlaceRevision_ = 0;
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
  /** @internal */
  contentRevision_ = 0;
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
  /** @internal */
  readonly transformPending: number[] = [];
  /** @internal */
  transformPendingFlag: Uint8Array;
  /** @internal */
  transformStamp: Uint32Array;
  /** @internal */
  transformResolve = 0;
  /** @internal */
  transformCount = 0;
  /** @internal */
  readonly freeTransforms: number[] = [];

  // The instance table: ranges owned by instanced draws.
  /** @internal */
  readonly instances: MirroredTable;
  private readonly instanceAllocator: RangeAllocator;
  /** Instance slots in use or freed below the highest (cull dispatch size). */
  private instanceHighWater = 0;
  /** @internal */
  uploadsPending = false;
  /**
   * @internal The placements buffer (plan 5a's call 42): parameters and each placed
   * draw's block, bound in the draw group for the vertex stage.
   */
  readonly placementTable: PlacementTable;
  /** @internal Each draw's per-vertex placement, by draw slot (`setPlacement`). */
  readonly drawPlacements: Array<DrawPlacement | undefined> = [];
  /** @internal This world's placement parameters: their float and their draws. */
  readonly parameters = new WeakMap<PlacementParameter, ParameterSlot>();
  /** @internal */
  readonly frameComputes: Array<(pass: GPUComputePassEncoder) => void> = [];
  private materialsF32: Float32Array;
  /** @internal */
  materialsU32: Uint32Array;
  /** @internal */
  materialCount = 0;
  /** @internal */
  materialsDirty = false;
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
  /** @internal */
  readonly textureSets: Array<GPUBindGroup | undefined> = [];
  /** @internal Each texture set's entries, for custom shaders' groups beside them. */
  readonly textureSetEntries: Array<GPUBindGroupEntry[] | undefined> = [];
  /** @internal */
  readonly freeTextureSets: number[] = [];
  /**
   * @internal Group 2 of batches drawing with a custom shader that has uniforms:
   * its texture set's entries and the shader's (ShaderBindings), by texture
   * set, shader and the shader's texture version.
   */
  readonly shaderGroups = new Map<string, GPUBindGroup>();
  /** `ShaderBindings.generation` the bundles were recorded at. */
  private bindingsGeneration = 0;
  /** @internal */
  readonly freeMaterials: number[] = [];
  /** @internal Shared materials: slot by record key, key and references by slot. */
  readonly materialByKey = new Map<string, number>();
  /** @internal */
  readonly materialKeys: Array<string | undefined> = [];
  /** @internal */
  readonly materialReferences: number[] = [];
  /** @internal */
  readonly materialScratch = (() => {
    const data = new ArrayBuffer(MATERIAL_SIZE);
    return { f32: new Float32Array(data), u32: new Uint32Array(data) };
  })();
  private readonly batches = new Map<string, Batch>();
  private readonly batchList: Batch[] = [];
  /** Emptied batches, reused (index kept) so live records stay valid. */
  private readonly freeBatches: Batch[] = [];
  /** @internal */
  readonly drawBatches: Array<Batch | undefined> = [];
  /** @internal Slab ranges per mesh id, as [byte offset, byte size]. */
  readonly meshRanges = new Map<
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
   * @internal Feature tables' columns in the arena (directory entries: hash, offset,
   * components with `TABLE_PROPERTY`), shared by the meshes using them.
   */
  readonly tableColumns = new Map<
    string,
    {
      entries: number[][];
      ranges: Array<[number, number]>;
      meshes: number;
      /** The strings its string columns hold references on (`stringIds`). */
      strings: string[];
      /** Columns left out, by name, with why (`warnUnavailable`). */
      skipped: Map<string, string>;
    }
  >();
  /** @internal An id per feature table object, for `tableColumns`' slab keys. */
  readonly tableIds = new WeakMap<FeatureTable, number>();
  /** @internal */
  nextTableId = 1;
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
  /** @internal */
  readonly maxClipBlocks: number;
  /**
   * @internal Block 0 is the terrain clip regions' directory (`addTerrainClipRegion`),
   * reserved so the shaders find it without a binding of its own. Blocks
   * past it are placeholders' (one each) or terrain regions' (runs); each
   * kind keeps its own free list, so placeholders don't break up the runs
   * regions free.
   */
  clipBlockCount = 1;
  /** @internal Placeholders' free blocks. */
  readonly freeClipBlocks: number[] = [];
  /** @internal Blocks placeholders hold, and the most they may. */
  placeholderBlocks = 0;
  /** @internal */
  readonly placeholderCapacity: number;
  /** @internal Free runs terrain regions left: sorted by block, never touching. */
  readonly freeClipRuns: Array<{ block: number; blocks: number }> = [];
  /** @internal Blocks terrain regions hold, and the most they may. */
  terrainClipBlocks = 0;
  /** @internal */
  readonly terrainClipBudget: number;
  /**
   * @internal Terrain regions by slot: their first block, block count and rows
   * (kept to move them: only the directory points at them), their opacity
   * (0 to 1) and whether they hold everywhere (no rows, no blocks).
   */
  readonly terrainClipRuns: Array<
    | {
        block: number;
        blocks: number;
        rows: Float32Array;
        opacity: number;
        ground: boolean;
        everywhere: boolean;
      }
    | undefined
  > = [];
  /** @internal */
  readonly clipScratch = new Float32Array(CLIP_BOXES * CLIP_BOX_FLOATS);
  /** @internal */
  nextMeshId = 0;
  /** @internal */
  drawCount = 0;
  /** @internal */
  bundle?: GPURenderBundle;
  /**
   * A batch gained its first shown record or lost its last (`Batch.shown`):
   * the bundles are recorded again, without rewriting the batch table.
   */
  private batchesShownChanged = false;
  /** @internal Draws of blended surfaces (`translucentRange`), until draws change. */
  translucentDraws?: number[];
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
  /** @internal GPU rows of the material table; grows to `maxMaterials`. */
  materialRows: number;
  /** @internal GPU blocks of clip boxes; grows to `maxClipBlocks`. */
  clipRows: number;
  readonly maxPointSets: number;
  private pointSetCount = 0;
  private readonly cullParams: GPUBuffer;
  private cullBindGroup!: GPUBindGroup;
  private pointCullBindGroup!: GPUBindGroup;
  /** @internal Globe imagery array (a 1×1 placeholder until imagery is attached). */
  imageryView: GPUTextureView;
  /** Bound while no imagery array is (no globe imagery in this world). */
  private readonly imageryPlaceholder: GPUTextureView;
  /** @internal Each texture set's (tracked) textures, for `textureDestroyed`. */
  readonly textureSetTextures: Array<GPUTexture[] | undefined> = [];
  /** @internal */
  readonly setsOfTexture = new WeakMap<GPUTexture, Set<number>>();
  /**
   * @internal Texture sets binding a destroyed texture: their batches are skipped
   * (a bind group naming a destroyed texture fails the whole submit).
   */
  readonly brokenTextureSets = new Set<number>();
  private readonly stopTracking: () => void;
  private readonly imagerySampler: GPUSampler;

  constructor(
    /** @internal */ readonly ctx: RenderContext,
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
        bindingBytes: binding,
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
    this.stopTracking = onTextureDestroyed((t) => textureDestroyed(this, t));
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
   * @internal Geometry written since the last frame, copied in one batch
   * (`flushUploads`). A queue.writeBuffer per stream of every mesh went
   * through the browser's transfer ring to the GPU process: a burst of
   * tiles blocked the main thread in writeBuffer (NYC, vsync off: 1.2 s
   * over 8 s of an orbit, r38).
   */
  readonly pendingUploads: Array<{
    target: GPUBuffer;
    offset: number;
    source: GPUBuffer;
    at: number;
    size: number;
  }> = [];
  /**
   * @internal Staging buffers mapped at creation, the queued bytes copied into them
   * when queued (as writeBuffer copied them); destroyed after each flush,
   * so nothing stays on this thread between bursts (a reused copy buffer
   * kept its peak, 4 MB after NYC's load, r39).
   */
  readonly uploadChunks: Array<{
    buffer: GPUBuffer;
    bytes: Uint8Array;
    used: number;
  }> = [];

  /**
   * Copies the queued geometry into place: the mapped staging buffers
   * filled on this thread, and a buffer-to-buffer copy per write, submitted
   * before anything that reads the arenas (the frame, ray casts) and before
   * any other write to them or a release of their ranges.
   */
  flushUploads(): void {
    flushUploads(this);
  }

  /** Uploads geometry into the arena as separate attribute streams. */
  addMesh(mesh: MeshData): MeshHandle {
    return addMesh(this, mesh);
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
    return addPointMesh(this, capacity, streams);
  }

  /** Writes points' properties (`addPointMesh` streams) from `first` on. */
  setPointProperties(
    mesh: PointMesh,
    first: number,
    data: Float32Array | Uint32Array,
  ): void {
    setPointProperties(this, mesh, first, data);
  }

  /**
   * Frees a mesh's arena ranges. Draws that use it must be removed first.
   * Returns the bytes released.
   */
  removeMesh(mesh: MeshHandle): number {
    return removeMesh(this, mesh);
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

  /** @internal CPU room for transforms below `count`. */
  reserveTransforms(count: number): void {
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

  /** @internal CPU room for materials below `count`. */
  reserveMaterials(count: number): void {
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
    return addMaterial(this, options);
  }

  /**
   * Drops one reference to a material (one per `addMaterial`); the slot is
   * freed with the last. Draws that use it must be removed first.
   */
  removeMaterial(index: number): void {
    removeMaterial(this, index);
  }

  /** Materials in use: distinct records, after sharing. */
  get materialsInUse(): number {
    return this.materialByKey.size;
  }

  /** Frees a texture set (not its textures). Draws must be removed first. */
  removeTextureSet(index: number): void {
    removeTextureSet(this, index);
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
    return textureRefs(this, options);
  }

  /** Binds up to five material textures; missing ones get 1×1 defaults. */
  createTextureSet(options: TextureSetOptions): number {
    return createTextureSet(this, options);
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
      ? anchorAt(this, options.transform.index)
      : undefined;
    if (onAnchor && this.transformAlive(options.transform!)) {
      throw new Error(
        `addDraw: ${onAnchor.name} is an anchor; hang the draw under it with parent (and origin or model), or under a transform added under it.`,
      );
    }
    const streams = options.instances?.streams;
    const fieldCount = Object.keys(streams?.layout ?? {}).length;
    if (fieldCount > MAX_DIRECTORY_ENTRIES) {
      // surface.slang `readInstance` reads this many at most.
      throw new RangeError(
        `addDraw: ${fieldCount} instance fields; a draw holds at most ${MAX_DIRECTORY_ENTRIES}.`,
      );
    }
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
      queueUpload(this, slab.vertexBuffer, offset, data);
      if (fields.length) {
        queueUpload(
          this,
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
    if (shader) {
      warnUnavailable(this, mesh, shader);
    }

    // Bounds live in the transform's local frame, so moving or rotating
    // the transform never stales them; an explicit radius is in meters.
    // A custom vertex stage's displacement (model units) pads them.
    resolveTransforms(this);
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
      ...(mesh.skirtStart !== undefined ? { skirtStart: mesh.skirtStart } : {}),
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
      batch.casters = 0;
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
        casters: 0,
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
    if (shader) {
      warnUnavailable(this, old.mesh, shader);
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
    if (this.recordsU32[o + CASTER_MASK_WORD] !== 0) {
      old.casters--;
      batch.casters++;
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

  /**
   * @internal A draw's first global feature ID, as picks read it (0 for a
   * removed draw).
   */
  featureIdOf(handle: DrawHandle): number {
    return this.hasDraw(handle)
      ? this.recordsU32[handle.index * RECORD_WORDS + FEATURE_ID_WORD]!
      : 0;
  }

  /**
   * @internal A draw's material index (`addMaterial`), as its record has
   * it; undefined for a removed draw.
   */
  drawMaterial(handle: DrawHandle): number | undefined {
    return this.hasDraw(handle)
      ? this.drawBatches[handle.index]!.material
      : undefined;
  }

  /**
   * @internal Changes a draw's material in place (an index from
   * `addMaterial`, or `materialWithFlags`), as `setDrawShader` its
   * shader: the draw moves to the batch for its new material, keeping its
   * record, instances, features and handle. The caller holds the
   * material's reference while the draw uses it.
   */
  setDrawMaterial(handle: DrawHandle, material: number): void {
    if (!this.hasDraw(handle)) {
      throw new Error("setDrawMaterial: the draw was removed");
    }
    if (this.materialReferences[material] === undefined || material < 0) {
      throw new RangeError(`setDrawMaterial: no material ${material}`);
    }
    const index = handle.index;
    const old = this.drawBatches[index]!;
    if (old.material === material) {
      return;
    }
    const o = index * RECORD_WORDS;
    const instanceCount = this.recordsU32[o + INSTANCE_COUNT_WORD]!;
    const items = instanceCount > 0 ? instanceCount : 1;
    const batch = this.batchFor({
      mesh: old.mesh,
      material,
      textureSet: old.textureSet,
      doubleSided: old.doubleSided,
      shader: old.shader,
      billboard: old.billboard,
      points: old.points,
      instanced: old.instanced,
      draw: index,
    });
    // Any count a batch keeps per draw (items, shown, casters, and one a
    // later change adds) must move with the record here, as in
    // `setDrawShader`.
    old.items -= items;
    if (this.recordsU32[o + VIEW_MASK_WORD] !== 0) {
      old.shown--;
      batch.shown++;
    }
    if (this.recordsU32[o + CASTER_MASK_WORD] !== 0) {
      old.casters--;
      batch.casters++;
    }
    if (old.items === 0) {
      this.batches.delete(old.key);
      old.key = "";
      this.freeBatches.push(old);
    }
    batch.items += items;
    this.drawBatches[index] = batch;
    this.drawConstants.setBatch(
      index,
      batch.index,
      this.recordsF32[o + RADIUS_WORD]!,
    );
    this.drawConstants.setMaterial(index, material);
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

  /**
   * @internal A material like `material` with `flags` (`MaterialFlags`)
   * set too, shared by content as `addMaterial`'s: one more reference,
   * balanced by one `removeMaterial`.
   */
  materialWithFlags(material: number, flags: number): number {
    return materialWithFlags(this, material, flags);
  }

  /**
   * @internal A second draw of `source`'s mesh, on `source`'s transform and
   * with its features, to draw a tileset's tile again (`SceneItem`): the geometry and the transform are shared, so it
   * costs a record, a draw item and its feature IDs. Hidden until given a
   * view mask. Not ground or collision (`SceneItem` sets those for the item
   * that stands for the tileset). Ray queries test each mesh and transform once, whichever draws show it. Undefined for a draw that
   * can't be drawn twice this way: instanced, points or a billboard, whose
   * records are tied to their instance or point tables. Remove it before
   * `source`'s transform goes.
   */
  twinDraw(source: DrawHandle): DrawHandle | undefined {
    if (!this.hasDraw(source)) {
      throw new Error("twinDraw: the draw was removed.");
    }
    const index = source.index;
    const batch = this.drawBatches[index]!;
    const o = index * RECORD_WORDS;
    if (
      batch.points ||
      batch.billboard ||
      this.recordsU32[o + INSTANCE_COUNT_WORD]! > 0
    ) {
      return undefined;
    }
    const transform = this.recordsU32[o + TRANSFORM_WORD]!;
    const flags = this.recordsU32[o + FLAGS_WORD]!;
    const features = this.featureTables[index];
    const name = this.names[index];
    return this.addDraw({
      mesh: batch.mesh,
      transform: {
        index: transform,
        generation: this.transformGeneration[transform]!,
      },
      material: batch.material,
      textureSet: batch.textureSet,
      doubleSided: batch.doubleSided,
      ...(batch.shader !== undefined && { shader: batch.shader }),
      unlit: (flags & RecordFlags.unlit) !== 0,
      underlay: (flags & RecordFlags.underlay) !== 0,
      ground: false,
      viewMask: 0,
      ...(name !== undefined && { name }),
      ...(features !== undefined && { features }),
    });
  }

  /**
   * @internal Whether the draw can take a dual position: its mesh has the
   * named attribute, with at least 3 components, and it isn't instanced, a
   * point set or a billboard.
   */
  drawHasPosition(handle: DrawHandle, semantic: string): boolean {
    return this.positionRefusal(handle, semantic) === undefined;
  }

  /**
   * @internal Why the draw can't take a dual position, as words that follow
   * "the draw's mesh" or "the draw": undefined when it can.
   */
  positionRefusal(handle: DrawHandle, semantic: string): string | undefined {
    if (!this.hasDraw(handle)) {
      return "was removed";
    }
    const { mesh, points, billboard } = this.drawBatches[handle.index]!;
    if (points || billboard) {
      return "is a point set or a billboard";
    }
    if (
      this.recordsU32[handle.index * RECORD_WORDS + INSTANCE_COUNT_WORD]! > 0
    ) {
      return "is instanced";
    }
    const components = this.meshRanges.get(mesh.id)?.named?.get(semantic);
    return components !== undefined && components >= 3
      ? undefined
      : `has no ${semantic} attribute of 3 components`;
  }

  /**
   * @internal `parameter` is no longer used by anything: its float is free.
   * Its draws must have left it.
   */
  releasePlacementParameter(parameter: PlacementParameter): void {
    releasePlacementParameter(this, parameter);
  }

  /**
   * Draws `tileset` in this world, once more if it is drawn already: the same
   * loaded tiles, one selection and one cache, with this item's own placement,
   * tint, opacity and view mask. Its draws share the tiles' geometry and
   * transforms; after the first item each adds a draw record and a draw item
   * (about 550 bytes a draw). Every tile that loads gets them too. Stop drawing
   * it with `SceneItem.remove`.
   *
   * A tileset belongs to one world: the first it is added to, or the one it
   * was loaded for (`Engine.addTileset`). Throws for a tileset of another
   * world, a destroyed one, a globe's (its surface isn't an item), and what
   * the options refuse: an opacity outside 0 to 1, a tint that isn't three
   * finite numbers, a placement that isn't finite or, on a tileset with no
   * second position (a `CESIUM_dual_position` declaration), isn't 0. Throws a
   * `CapacityError` where a loaded tile's draws don't fit the world's tables,
   * leaving nothing behind.
   */
  add(tileset: Tileset3D, options: SceneItemOptions = {}): SceneItem {
    const item = tileset.addItem(this, options);
    this.sceneItems.push(item);
    return item;
  }

  /**
   * Everything this world draws as an item (`add`), in the order added: a flat
   * list. Nothing here walks it per tick. `Tileset3D.items` lists one tileset's.
   */
  get items(): readonly SceneItem[] {
    return this.sceneItems;
  }
  private readonly sceneItems: SceneItem[] = [];

  /** @internal The item left its tileset. */
  itemRemoved(item: SceneItem): void {
    const at = this.sceneItems.indexOf(item);
    if (at >= 0) {
      this.sceneItems.splice(at, 1);
    }
  }

  /** @internal The item that drew `draw`, if an item did. */
  itemOfDraw(draw: DrawHandle): SceneItem | undefined {
    for (const item of this.sceneItems) {
      const hit = item.tileset.itemOfDraw(draw);
      if (hit !== undefined) {
        return hit;
      }
    }
    return undefined;
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
    if (this.recordsU32[o + CASTER_MASK_WORD] !== 0) {
      batch.casters--;
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
    releasePlacement(this, handle.index);
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
    queueUpload(
      this,
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
    return addTransform(this, matrix, parent);
  }

  /** Replaces a transform's matrix (relative to its parent). */
  setTransform(handle: TransformHandle, matrix: ArrayLike<number>): void {
    setTransform(this, handle, matrix);
  }

  /** Hides or shows a transform and everything below it. */
  setTransformVisible(handle: TransformHandle, visible: boolean): void {
    setTransformVisible(this, handle, visible);
  }

  /** A transform's matrix relative to its parent. */
  localMatrix(
    handle: TransformHandle,
    out = new Float64Array(16),
  ): Float64Array {
    return localMatrix(this, handle, out);
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
    return worldMatrix(this, handle, out);
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
    return drawMatrix(this, handle, out);
  }

  /**
   * Removes a transform and its descendants. Draws placed by them must be
   * removed first. An anchor goes through `removeAnchor`.
   */
  removeTransform(handle: TransformHandle): void {
    removeTransform(this, handle);
  }

  /** Whether `handle` still names a live transform. */
  transformAlive(handle: TransformHandle): boolean {
    return transformAlive(this, handle);
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
    return addAnchor(this, name, options);
  }

  /**
   * The body's anchor, made on first ask and named after the body: one per
   * body, by its name and NAIF id (plan 5a's call 19).
   */
  bodyAnchor(body: Body): AnchorHandle {
    return bodyAnchor(this, body);
  }

  /**
   * @internal The anchor of the body with this key (`bodyKey`) if the
   * world has made it (`View.bodyAnchor`).
   */
  findBodyAnchor(key: string): AnchorHandle | undefined {
    return findBodyAnchor(this, key);
  }

  /**
   * @internal Counts `removeAnchor` calls that removed one, so a view can
   * forget the placements it held for removed anchors.
   */
  get anchorRemovals(): number {
    return this.anchorRemovals_;
  }
  /** @internal */
  anchorRemovals_ = 0;

  /** The world's anchors, by slot. */
  get anchors(): readonly AnchorHandle[] {
    return (this.anchorList ??= Object.freeze(
      this.anchorSlots.filter((a): a is AnchorHandle => a !== undefined),
    ));
  }

  /** The anchor a transform hangs under (itself for an anchor), or undefined under none. */
  anchorOf(handle: TransformHandle): AnchorHandle | undefined {
    return anchorOf(this, handle);
  }

  /** The anchor a draw hangs under, or undefined under none (or once removed). */
  drawAnchor(handle: DrawHandle): AnchorHandle | undefined {
    return drawAnchor(this, handle);
  }

  /**
   * Sets an anchor's place in the table root (column-major float64, rigid):
   * where the core's own frame resolver (`tableResolver`) finds it. Views
   * place anchors in render space themselves (`View.setAnchorPlacement`,
   * or the camera layer for a view with a rig); this moves no content by
   * itself. Default: the identity.
   */
  placeAnchor(anchor: AnchorHandle, matrix: ArrayLike<number>): void {
    placeAnchor(this, anchor, matrix);
  }

  /** An anchor's place in the table root (`placeAnchor`), float64. */
  anchorMatrix(anchor: AnchorHandle, out = new Float64Array(16)): Float64Array {
    return anchorMatrix(this, anchor, out);
  }

  /**
   * Removes an anchor, freeing its slot. Throws, naming it, while any
   * transform hangs under it; draws hang under transforms (a draw can't sit
   * on an anchor itself), so none can be left on it. Views forget their
   * placements of it (`View.anchorRevision` counts that).
   */
  removeAnchor(anchor: AnchorHandle): void {
    removeAnchor(this, anchor);
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
    return frameOf(this, handle, name);
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
    resolveTransforms(this);
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
   * The views whose shadow cascades draw this record though the view itself
   * doesn't (a tile off screen whose shadow may be in view). Only their
   * cascades see it: not the view's own passes, picks, ray casts or depth
   * ranges, which read the view mask.
   */
  setCasterMask(handle: DrawHandle, mask: number): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const old =
      this.recordsU32[handle.index * RECORD_WORDS + CASTER_MASK_WORD]!;
    if (this.drawConstants.setCasterMask(handle.index, mask)) {
      this.changedViews |= old | (mask >>> 0);
      this.markDirty(handle.index);
      if ((old === 0) !== (mask === 0)) {
        const batch = this.drawBatches[handle.index]!;
        batch.casters += mask === 0 ? -1 : 1;
        // Its first caster, or its last, with no view drawing it: it joins
        // the shadow bundle alone, or leaves it, and that is recorded again.
        if (batch.shown === 0 && batch.casters === (mask === 0 ? 0 : 1)) {
          this.casters = undefined;
        }
      }
    }
  }

  /**
   * Uploads up to `CLIP_BOXES` clip boxes for a mixed-LOD placeholder, or
   * returns undefined when there are too many or no block is free.
   */
  allocateClip(boxes: readonly ClipBox[]): ClipHandle | undefined {
    return allocateClip(this, boxes);
  }

  freeClip(clip: ClipHandle): void {
    freeClip(this, clip);
  }

  /**
   * Makes a record a mixed-LOD placeholder in the views of `mask`: there it
   * draws only inside `clip` (the volumes of its missing finer descendants),
   * at its true depth. No clip restores normal drawing.
   */
  setPlaceholder(handle: DrawHandle, mask: number, clip?: ClipHandle): void {
    setPlaceholder(this, handle, mask, clip);
  }

  /**
   * @internal Uploads a terrain region (globe/terrainClip.ts
   * `packClipShape`: vec4 rows) into a run of whole clip blocks and points
   * its directory row (block 0) at it; returns its slot, the record mask's
   * bit (`setTerrainClip`). `opacity` 0 (the default): no terrain drawn
   * inside; between 0 and 1 the terrain inside is drawn at that opacity
   * (`Globe.terrain.addRegion`); 1 changes nothing. No rows: the slot
   * holds everywhere a record's mask names it (`addRegion("everywhere")`),
   * and takes no blocks. `ground` (default: unless `opacity` is 0) is what
   * height captures draw. Throws a `TerrainRegionError` when all
   * `MAX_TERRAIN_CLIPS` slots are taken, or the region doesn't fit the
   * blocks set aside for regions (`WorldOptions.maxClipBlocks`).
   */
  addTerrainClipRegion(
    rows: Float32Array,
    opacity = 0,
    ground = opacity > 0,
  ): number {
    return addTerrainClipRegion(this, rows, opacity, ground);
  }

  /** @internal Frees a terrain clip region's slot and blocks. */
  removeTerrainClipRegion(slot: number): void {
    removeTerrainClipRegion(this, slot);
  }

  /**
   * @internal Changes a terrain region's opacity (`addTerrainClipRegion`),
   * 0 to 1, in place: one directory row, nothing re-uploaded.
   */
  setTerrainClipOpacity(slot: number, opacity: number): void {
    setTerrainClipOpacity(this, slot, opacity);
  }

  /**
   * @internal Changes whether a terrain region's terrain is ground
   * (`addTerrainClipRegion`): height captures leave out what isn't. One
   * directory row; the captures are redone, and the views redrawn.
   */
  setTerrainClipGround(slot: number, ground: boolean): void {
    setTerrainClipGround(this, slot, ground);
  }

  /**
   * @internal Which terrain clip regions (a bit per slot) a globe tile's
   * record tests per fragment: inside any of them it draws nothing.
   */
  setTerrainClip(handle: DrawHandle, mask: number): void {
    setTerrainClip(this, handle, mask);
  }

  /**
   * @internal Whether the draw is ground: what the height pass samples and
   * clamping stands on (`RecordFlags.notGround` when it isn't).
   */
  setGround(handle: DrawHandle, ground: boolean): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const flags = this.recordsU32[handle.index * RECORD_WORDS + FLAGS_WORD]!;
    const next = ground
      ? flags & ~RecordFlags.notGround
      : flags | RecordFlags.notGround;
    if (this.drawConstants.setFlags(handle.index, next)) {
      this.uploadsPending = true;
    }
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
   *
   * A draw's per-vertex placement (`setPlacement`) isn't applied: its
   * triangles are tested where its vertex buffers have them, unplaced
   * (only its bounds grow), and so is terrain line of sight through the
   * query interface. Picks read the drawn depth and agree with it.
   */
  async castRays(
    rays: readonly CastRay[],
    options: CastOptions = {},
  ): Promise<Array<number | undefined>> {
    return castRays(this, rays, options);
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
    return createPlacementParameter(this, value);
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
   * Rays don't see it: `castRays`, and terrain line of sight through the
   * query interface, test the draw's triangles unplaced. Picks read the
   * drawn depth, so they agree with it.
   *
   * Refuses (nothing changed) a non-finite number, or one past float32's
   * range where the GPU reads it, naming its field (plan 5a's Review Focus
   * 4); a parameter of another world; a dual position
   * whose semantic isn't one of the draw's mesh's attributes of 3
   * components; a billboard or point draw, whose positions are
   * offsets on screen; and an instanced draw, whose instances' matrices come
   * after the mesh's vertices.
   */
  setPlacement(handle: DrawHandle, placement: Placement | undefined): void {
    setPlacement(this, handle, placement);
  }

  /** The draw's per-vertex placement (`setPlacement`), if any. */
  drawPlacement(handle: DrawHandle): Placement | undefined {
    return drawPlacement(this, handle);
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
    const item = this.itemOfDraw(draw);
    if (!table || localId >= table.count) {
      return {
        draw,
        localId,
        name: this.names[index],
        ...(item && { item }),
      };
    }
    return {
      draw,
      localId,
      name: featureName(table, localId) ?? this.names[index],
      properties: featureProperties(table, localId),
      ...(item && { item }),
    };
  }

  /**
   * Composes changed transforms, uploads materials and returns the current
   * bundle; table changes upload in the first view's cull pass.
   */
  prepareFrame(): GPURenderBundle {
    const queue = this.ctx.device.queue;
    this.flushUploads();
    resolveTransforms(this);
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
    uploadTables(this, pass);
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
    // Only batches some view draws (`Batch.shown`), and for shadows those
    // some view's cascades alone do: the cache's resident tiles that no
    // view selected cost nothing here.
    const order = this.batchList
      .filter(
        (batch) =>
          (batch.shown > 0 || (kind === "shadow" && batch.casters > 0)) &&
          // Only the translucent passes draw it (`encodeTranslucent`); lines
          // can't blend, and stay here.
          (batch.mesh.topology === "line-list" ||
            (this.materialsU32[batch.material * MATERIAL_WORDS + 12]! &
              MaterialFlags.blendedOnly) ===
              0),
      )
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

  /** @internal Room for transforms below `count` on the GPU (copied, rebound). */
  growTransforms(count: number): void {
    this.transforms.growGpu(
      grownSize(this.transforms.gpuRows, count, this.maxTransforms),
    );
    this.transformBuffer = this.transforms.buffer;
    this.tablesReplaced();
  }

  /** @internal Room for materials below `count` on the GPU (rewritten, rebound). */
  growMaterials(count: number): void {
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

  /** @internal Room for clip blocks below `count` on the GPU (copied, rebound). */
  growClips(count: number): void {
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

  /** @internal */
  markDirty(index: number): void {
    this.drawConstants.mark(index);
    this.uploadsPending = true;
    this.version++;
    // The views that draw it, and those whose cascades do.
    this.changedViews |=
      this.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD]! |
      this.recordsU32[index * RECORD_WORDS + CASTER_MASK_WORD]!;
  }

  /** The world was destroyed (`destroy`): its GPU resources are gone. */
  get destroyed(): boolean {
    return this.destroyed_;
  }
  private destroyed_ = false;

  destroy(): void {
    this.destroyed_ = true;
    this.stopTracking();
    // Its tables' string ids go back to the shared table.
    for (const uploaded of this.tableColumns.values()) {
      for (const value of uploaded.strings) {
        stringIds.release(value);
      }
    }
    this.tableColumns.clear();
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

/** A point draw's cull parameters (pointCull.slang `PointCull`). */
const POINT_CULL_BYTES = 48;
/** Pixels past a view's edges a point's symbol may reach. */
const POINT_MARGIN = 64;
const ZERO = Float64Array.of(0, 0, 0);
