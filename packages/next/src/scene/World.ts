import { onTextureDestroyed } from "../gpu/textureTracking.ts";
import { RangeAllocator } from "../gpu/RangeAllocator.ts";
import { Slabs } from "./Slabs.ts";
import { INITIAL_ROWS, MirroredTable } from "./MirroredTable.ts";
import { DrawConstants } from "../render/drawConstants.ts";
import { DrawArguments } from "../render/drawArguments.ts";
import type { Placement, PlacementParameter } from "./placement.ts";
import { PlacementTable } from "./placementTable.ts";
import type { SceneItem, SceneItemOptions } from "./SceneItem.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import type { TileWarp } from "../streaming/tileWarp.ts";
import {
  INSTANCE_WORDS,
  INSTANCE_COUNT_WORD,
  INSTANCE_FIRST_WORD,
  MATERIAL_SIZE,
  DRAW_ITEM_SIZE,
  RECORD_WORDS,
  TRANSFORM_WORDS,
  FEATURE_ID_WORD,
  FLAGS_WORD,
  CASTER_MASK_WORD,
  VIEW_MASK_WORD,
  ALL_VIEWS,
  DRAW_OVERHEAD_BYTES,
  MAX_TERRAIN_CLIPS,
  MAX_TERRAIN_CLIP_BLOCKS,
  RecordFlags,
} from "../render/layout.ts";
import type { Body } from "./Body.ts";
import type { FrameKey } from "../camera/frameResolver.ts";
import type { MeshData } from "./meshes.ts";
import type { BrepForm } from "../brep/form.ts";
import type { GpuPatchData } from "../brep/gpuPatches.ts";
import { featureName, featureProperties } from "../io/features.ts";
import type { RenderContext, SurfaceKey } from "./RenderContext.ts";
import type { CustomShader } from "./CustomShader.ts";
import type { PointCuller } from "./PointCuller.ts";
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
  WorldOptions,
  WorldMemory,
  MeshHandle,
  PatchMesh,
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
import { flushUploads } from "./world/uploads.ts";
import {
  addMesh,
  addPointMesh,
  setPointProperties,
  removeMesh,
} from "./world/meshes.ts";
import {
  addPatchMesh,
  readPatchStats,
  setPatchErrorPixels,
  type PatchDrawStats,
  type PatchMeshOptions,
} from "./world/patches.ts";
import {
  addBrep,
  removeBrep,
  type BrepHandle,
  type BrepOptions,
} from "./world/brep.ts";
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
  WorldWarps,
  type HeightNormalInfo,
  type WarpStats,
} from "./world/warps.ts";
import type { WarpAt } from "./warpAnchor.ts";
import {
  releasePlacementParameter,
  createPlacementParameter,
  setPlacement,
  drawPlacement,
} from "./world/placements.ts";
import {
  createSplats,
  setPointCuller,
  createPointCuller,
  drawSplats,
} from "./world/points.ts";
import {
  addDraw,
  setDrawShader,
  setDrawMaterial,
  twinDraw,
  removeDraw,
  setInstance,
  setInstanceStreams,
} from "./world/draws.ts";
import {
  slabReplaced,
  createBatchBuffer,
  growPointSets,
  createCullBindGroup,
  tablesReplaced,
  createDrawBindGroup,
  rebind,
  setImageryArray,
} from "../render/world/tables.ts";
import {
  prepareFrame,
  shadowBundle,
  heightBundle,
  prepassBundle,
  depthBundle,
  pickBundle,
  clippedBundle,
  type BundleKind,
  encodeCull,
  translucentRange,
  encodeTranslucent,
} from "../render/world/bundles.ts";
import { WorldClips, type ClipSet, type WorldClip } from "./world/clips.ts";
import { WorldScene } from "./world/worldScene.ts";
import type { PatchPickSource } from "./world/domains.ts";
import { WorldRaster } from "../render/world/worldRaster.ts";

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
  /** @internal Rasterizer data: records, batches, bundles, culling, GPU tables. */
  readonly raster: WorldRaster = new WorldRaster();
  /** @internal Scene data: transforms, anchors, material keys, placements, feature tables. */
  readonly scene: WorldScene = new WorldScene();
  /**
   * @internal Draws under an anchor whose route to the render root crosses a
   * warp, drawn warped by fits of it (scene/world/warps.ts). The engine steps
   * it once a frame.
   */
  readonly warps: WorldWarps = new WorldWarps(this);
  /** @internal The world's clip sets (`addClip`, scene/world/clips.ts). */
  readonly clipSets: WorldClips = new WorldClips(this);
  /** @internal What one draw costs the tables (`DrawSink.drawOverheadBytes`). */
  readonly drawOverheadBytes = DRAW_OVERHEAD_BYTES;
  /** @internal A custom shader's pipeline is ready: draw with it from now on. */
  readonly shaderReady = () => {
    this.raster.bundle = undefined;
    this.version++;
    this.changedViews = ALL_VIEWS;
  };

  private static nextId = 1;
  /** Stable identity (indexes in lists shift as worlds come and go). */
  readonly id = World.nextId++;
  readonly maxDraws: number;
  readonly maxTransforms: number;
  readonly maxInstances: number;
  readonly maxMaterials: number;
  /** Geometry, in slabs of one storage binding each (scene/Slabs.ts). */
  readonly slabs: Slabs;
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
    return this.scene.transformRevision_;
  }
  /**
   * Counts changes to the anchors' places in the table root: `placeAnchor`
   * and `removeAnchor` only. A route between anchors and the root changes
   * only with it, so animating a node re-places no anchor.
   */
  get anchorPlaceRevision(): number {
    return this.scene.anchorPlaceRevision_;
  }
  /**
   * Counts changes to what a ray may meet: draws added and removed
   * (`addDraw`, `removeDraw`), a draw's views changed (`setViewMask`, as
   * selections show and hide cached tiles), and terrain clip regions added
   * or removed. The query interface reports it as the revision of what a
   * ray may meet (`Engine.queries`).
   */
  get contentRevision(): number {
    return this.scene.contentRevision_;
  }
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
  readonly maxPointSets: number;
  private readonly stopTracking: () => void;

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
    this.raster.drawRows = Math.min(this.maxDraws, INITIAL_ROWS);
    this.raster.materialRows = Math.min(this.maxMaterials, INITIAL_ROWS);
    this.maxInstances = Math.min(
      options.maxInstances ?? 16384,
      itemLimit - this.maxDraws,
    );
    const instanceRows = Math.max(1, Math.min(this.maxInstances, 16384));
    const items = this.raster.drawRows + instanceRows;
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
      (slab) => slabReplaced(this, slab),
    );

    this.raster.drawConstants = new DrawConstants(
      ctx,
      this.maxDraws,
      this.raster.drawRows,
    );
    this.raster.drawGeneration = new Uint32Array(
      this.raster.drawConstants.rows,
    );
    this.raster.drawOwnedTransform = new Int32Array(
      this.raster.drawConstants.rows,
    ).fill(-1);
    this.raster.transforms = new MirroredTable(
      ctx,
      "transforms",
      TRANSFORM_WORDS,
      this.maxTransforms,
      Math.min(this.maxTransforms, INITIAL_ROWS),
    );
    const t = this.raster.transforms.rows;
    this.scene.transformLocal = new Float64Array(t * 16);
    this.scene.transformWorld = new Float64Array(t * 16);
    this.scene.transformParent = new Int32Array(t).fill(-1);
    this.scene.transformGeneration = new Uint32Array(t);
    this.scene.transformLive = new Uint8Array(t);
    this.scene.transformHidden = new Uint8Array(t);
    this.scene.transformHiddenWorld = new Uint8Array(t);
    this.scene.transformAnchor = new Uint8Array(t);
    this.scene.transformPendingFlag = new Uint8Array(t);
    this.scene.transformStamp = new Uint32Array(t);
    this.raster.instances = new MirroredTable(
      ctx,
      "instances",
      INSTANCE_WORDS,
      Math.max(1, this.maxInstances),
      instanceRows,
    );
    this.raster.instanceAllocator = new RangeAllocator(this.maxInstances, 1);
    const materials = new ArrayBuffer(
      Math.min(this.maxMaterials, INITIAL_ROWS) * MATERIAL_SIZE,
    );
    this.raster.materialsF32 = new Float32Array(materials);
    this.raster.materialsU32 = new Uint32Array(materials);

    const buffer = (label: string, size: number, usage: GPUBufferUsageFlags) =>
      device.createBuffer({ label: `world.${label}`, size, usage });
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.recordBuffer = this.raster.drawConstants.buffer;
    this.transformBuffer = this.raster.transforms.buffer;
    this.instanceBuffer = this.raster.instances.buffer;
    // COPY_SRC lets precision tests read back the cull kernels' output.
    this.itemBuffer = buffer(
      "items",
      items * DRAW_ITEM_SIZE,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    );
    // Grows with the CPU mirror (`addMaterial`), rewritten when changed.
    this.materialBuffer = buffer(
      "materials",
      this.raster.materialRows * MATERIAL_SIZE,
      storage,
    );
    this.scene.maxClipBlocks = Math.max(
      2,
      Math.min(
        options.maxClipBlocks ?? 1 << 14,
        fits(this.raster.clipScratch.byteLength),
      ),
    );
    this.scene.terrainClipBudget = Math.min(
      MAX_TERRAIN_CLIPS * MAX_TERRAIN_CLIP_BLOCKS,
      Math.floor((this.scene.maxClipBlocks - 1) / 4),
    );
    this.scene.placeholderCapacity =
      this.scene.maxClipBlocks - 1 - this.scene.terrainClipBudget;
    this.raster.clipRows = Math.min(this.scene.maxClipBlocks, 256);
    // COPY_SRC: copied into a larger buffer as it grows.
    this.clipBuffer = buffer(
      "clipBoxes",
      this.raster.clipRows * this.raster.clipScratch.byteLength,
      storage | GPUBufferUsage.COPY_SRC,
    );
    this.raster.drawArguments = new DrawArguments(
      device,
      this.raster.drawConstants,
      (record) => this.raster.drawBatches[record] !== undefined,
      this.raster.drawRows,
      items,
    );
    this.raster.batchBuffer = createBatchBuffer(this, this.raster.drawRows);
    this.raster.cullParams = buffer(
      "cullParams",
      16,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
    this.raster.pointCounts = buffer("pointCounts", 64 * 4, storage);
    growPointSets(this, 64);
    this.raster.splats = createSplats(this, 1);

    createCullBindGroup(this);
    this.raster.imageryPlaceholder = device
      .createTexture({
        label: "world.imagery.placeholder",
        size: [1, 1, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING,
      })
      .createView({ dimension: "2d-array" });
    this.raster.imageryView = this.raster.imageryPlaceholder;
    this.raster.imagerySampler = device.createSampler({
      label: "world.imagery",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      maxAnisotropy: 16,
    });
    this.raster.placementTable = new PlacementTable(device, () =>
      tablesReplaced(this),
    );
    createDrawBindGroup(this);

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
    rebind(this);
  }

  /** Number of record slots in use, including hidden and freed-but-trailing slots. */
  get recordCount(): number {
    return this.raster.drawCount;
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
        used: this.raster.drawCount - this.raster.freeSlots.length,
        capacity: this.maxDraws,
      },
      transforms: {
        used: this.scene.transformCount - this.scene.freeTransforms.length,
        capacity: this.maxTransforms,
      },
      instances: {
        used: this.raster.instanceAllocator.used,
        capacity: this.maxInstances,
      },
      materials: {
        used: this.scene.materialByKey.size,
        capacity: this.maxMaterials,
      },
      clipBlocks: {
        used: this.scene.placeholderBlocks,
        capacity: this.scene.placeholderCapacity,
      },
      terrainClipBlocks: {
        used: this.scene.terrainClipBlocks,
        capacity: this.scene.terrainClipBudget,
      },
      pointSets: {
        used: this.raster.pointDraws.size,
        capacity: this.maxPointSets,
      },
      batches: this.raster.batches.size,
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
        this.raster.drawArguments.itemList.size +
        this.raster.drawArguments.buffer.size,
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
      [
        "draw table",
        this.raster.drawCount - this.raster.freeSlots.length,
        this.maxDraws,
      ],
      [
        "transform table",
        this.scene.transformCount - this.scene.freeTransforms.length,
        this.maxTransforms,
      ],
      ["instance table", this.raster.instanceAllocator.used, this.maxInstances],
      ["material table", this.scene.materialByKey.size, this.maxMaterials],
      ["vertex arena", this.slabs.vertexUsed, this.slabs.options.vertexBudget],
      ["index arena", this.slabs.indexUsed, this.slabs.options.indexBudget],
      // Placeholders' only: terrain regions' blocks are set aside, and
      // evicting tiles wouldn't free them.
      [
        "clip blocks",
        this.scene.placeholderBlocks,
        this.scene.placeholderCapacity,
      ],
      ["point sets", this.raster.pointDraws.size, this.maxPointSets],
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
    return this.raster.batches.size;
  }

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

  /**
   * @internal Provisional (CESIUM2_WEBGPU_PLAN.md §13.33, step 5, part 1).
   * A b-rep's patches as a mesh: the span records and control points
   * `packGpuPatches` makes, in the arena. A draw of it (`addDraw`) is
   * diced per view on the GPU into chunks of 4 × 4 cells (dice.slang) and
   * drawn with the face as the feature; its materials are opaque.
   * `faces` is the form's face count (the local feature IDs).
   */
  addPatchMesh(
    data: GpuPatchData,
    faces: number,
    options?: PatchMeshOptions,
  ): PatchMesh {
    return addPatchMesh(this, data, faces, options);
  }

  /**
   * @internal Provisional. What the last view's dice made of each patch draw:
   * spans, cells, chunks, triangles and vertex invocations, read back
   * asynchronously (it copies after the frames submitted so far, so call it
   * after a frame has rendered). Measurements, not frames.
   */
  readPatchStats(): Promise<PatchDrawStats[]> {
    return readPatchStats(this);
  }

  /** @internal Provisional. A patch draw's target error, pixels. */
  setPatchErrorPixels(handle: DrawHandle, errorPixels: number): void {
    if (!this.hasDraw(handle)) {
      throw new Error("setPatchErrorPixels: the draw was removed");
    }
    setPatchErrorPixels(this, handle.index, errorPixels);
    this.version++;
    this.changedViews = 0xffffffff;
  }

  /**
   * @internal Provisional (CESIUM2_WEBGPU_PLAN.md §13.33, step 5, part 2).
   * A b-rep solid in this world: every face the GPU can evaluate as a patch
   * draw diced per view in pixels of error (`errorPixels`), faces that are
   * complete as their (u, v) rect (a box's, a cylinder's side) in one draw and
   * faces with a trim, tested per pixel in the fragment stage, in another;
   * only a face the GPU can't draw (a patch above degree 3) is a CPU mesh of
   * the chordal error `cpuTolerance` (`cpuFaces: "trimmed"` also sends every
   * trimmed face there, to compare). The form's coordinates are placed as
   * `addDraw` places a mesh (`parent`, `origin`, `model`), or by a shared
   * `transform`. Faces are features, as the form's face indices.
   * `removeBrep` takes it away.
   */
  addBrep(form: BrepForm, options?: BrepOptions): BrepHandle {
    return addBrep(this, form, options);
  }

  /** @internal Provisional. Removes what `addBrep` made. */
  removeBrep(handle: BrepHandle): void {
    removeBrep(this, handle);
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
    return this.scene.materialByKey.size;
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
    return addDraw(this, options);
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
    setPointCuller(this, handle, culler, tiny);
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
    return createPointCuller(this, options);
  }

  /**
   * The view's point splats over its opaque draws (splat.slang), in its
   * opaque pass after them; nothing when no draw splats.
   */
  drawSplats(pass: GPURenderPassEncoder): void {
    drawSplats(this, pass);
  }

  /**
   * Changes a draw's custom shader (undefined: the engine's) in place: the
   * draw moves to the batch for its new shader, keeping its record,
   * instances, features and handle. Until the new shader's pipelines
   * compile it draws with the engine's, as a new draw would.
   */
  setDrawShader(handle: DrawHandle, shader: CustomShader | undefined): void {
    setDrawShader(this, handle, shader);
  }

  /**
   * @internal A draw's first global feature ID, as picks read it (0 for a
   * removed draw).
   */
  featureIdOf(handle: DrawHandle): number {
    return this.hasDraw(handle)
      ? this.raster.recordsU32[handle.index * RECORD_WORDS + FEATURE_ID_WORD]!
      : 0;
  }

  /**
   * @internal A draw's material index (`addMaterial`), as its record has
   * it; undefined for a removed draw.
   */
  drawMaterial(handle: DrawHandle): number | undefined {
    return this.hasDraw(handle)
      ? this.raster.drawBatches[handle.index]!.material
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
    setDrawMaterial(this, handle, material);
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
    const twin = twinDraw(this, source);
    if (twin) {
      this.warps.inherit(source, twin);
    }
    return twin;
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
    const { mesh, points, billboard } = this.raster.drawBatches[handle.index]!;
    if (points || billboard) {
      return "is a point set or a billboard";
    }
    if (
      this.raster.recordsU32[
        handle.index * RECORD_WORDS + INSTANCE_COUNT_WORD
      ]! > 0
    ) {
      return "is instanced";
    }
    const components = this.scene.meshRanges.get(mesh.id)?.named?.get(semantic);
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
      this.raster.drawBatches[handle.index] !== undefined &&
      this.raster.drawGeneration[handle.index] === handle.generation
    );
  }

  removeDraw(handle: DrawHandle): void {
    removeDraw(this, handle);
  }

  /**
   * @internal A tile's geometric error (m), the budget its draw's warp fit
   * shares when its anchor's route crosses a warp: `max(1 mm, error / 64)`.
   */
  setDrawGeometricError(handle: DrawHandle, error: number): void {
    this.warps.setGeometricError(handle, error);
  }

  /**
   * Where the route that places the draw's anchor is evaluated, when it
   * crosses a warp (plan §13.26, `warpAt`):
   *
   * - `"vertex"`, the default: at every vertex, so content stretches with
   *   the warp (a reprojection, an exaggeration). Fitted per draw to
   *   `max(1 mm, geometricError / 64)`, held hidden until the first fit;
   *   a terrain tile under a height-scale warp is exact instead.
   * - `"anchor"`: once, at the origin of `origin` (a transform the draw hangs
   *   under; by default the draw's own), in float64. The draw moves
   *   rigidly by the route there: its translation, and the rotation of the
   *   route's Jacobian (so a vehicle stays upright on a curved Earth), with
   *   no scale or shear, so it keeps its shape. Give a model's draws one
   *   `origin` (its root) and the whole model moves as one.
   *
   * Billboards and instanced draws are always anchored (an instanced draw's
   * origin is each instance's). A point set, or instances the GPU writes (a
   * `ModelPool`'s), is drawn at its anchor's place, unwarped. Costs nothing
   * for a draw not under a warped anchor, which only remembers it. Changing
   * it refits the draw.
   */
  setWarpAt(handle: DrawHandle, at: WarpAt, origin?: TransformHandle): void {
    this.warps.setWarpAt(handle, at, origin);
  }

  /** What the draw asked of `setWarpAt`, and what it is drawn as (a billboard or an instanced draw is anchored). */
  drawWarpAt(
    handle: DrawHandle,
  ): { choice: WarpAt; effective: WarpAt } | undefined {
    return this.warps.warpAt(handle);
  }

  /**
   * Provisional. What the world's warps have done, and how its warped draws
   * stand: fits made and asked again, anchored draws placed, fits waiting,
   * and the draws under a warped anchor by state (fitted, stale, pending,
   * exact). Counts are since the world was made; a read changes nothing.
   */
  warpStats(): WarpStats {
    return this.warps.stats();
  }

  /**
   * @internal A terrain tile's draw carries `h·n̂` per vertex made on the
   * ellipsoid `info.radii` (`HEIGHT_NORMAL_ATTRIBUTE`): under a height-scale
   * warp on that ellipsoid its route term is exact, with no fit.
   */
  setDrawHeightNormal(handle: DrawHandle, info: HeightNormalInfo): void {
    this.warps.setHeightNormal(handle, info);
  }

  /**
   * @internal The draw's instances are written by the GPU (a `ModelPool`'s),
   * so a warp can't move them on the CPU: they are drawn unwarped.
   */
  markGpuInstances(handle: DrawHandle): void {
    this.warps.markGpuInstances(handle);
  }

  /**
   * @internal The map from an anchor's coordinates to where its content is
   * drawn, when the anchor's route to the view's root crosses a warp:
   * selection runs on drawn volumes (streaming/tileWarp.ts). Undefined for
   * an anchor placed rigidly.
   */
  tileWarp(anchor: AnchorHandle): TileWarp | undefined {
    return this.warps.tileWarp(anchor.slot);
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
    setInstance(this, handle, instance, change);
    if (change.matrix) {
      this.warps.instanceChanged(handle, instance);
    }
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
    setInstanceStreams(this, handle, firstInstance, data);
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
   * @internal Provisional. Where a patch draw's faces are exact, for picks:
   * the b-rep they draw (`PatchPickSource`), which gives a pick's (face, u,
   * v) its own point. `addBrep` sets it for the patch draws it makes; it goes
   * with the draw. Undefined clears it.
   */
  setPickSource(handle: DrawHandle, source: PatchPickSource | undefined): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    if (source) {
      this.scene.pickSources.set(handle.index, source);
    } else {
      this.scene.pickSources.delete(handle.index);
    }
  }

  /** @internal `setPickSource`'s. */
  pickSource(handle: DrawHandle): PatchPickSource | undefined {
    return this.hasDraw(handle)
      ? this.scene.pickSources.get(handle.index)
      : undefined;
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
    return this.scene.anchorRemovals_;
  }

  /** The world's anchors, by slot. */
  get anchors(): readonly AnchorHandle[] {
    return (this.scene.anchorList ??= Object.freeze(
      this.scene.anchorSlots.filter((a): a is AnchorHandle => a !== undefined),
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
      if (this.scene.transformHiddenWorld[t.index] === 0) {
        visit(
          light,
          this.scene.transformWorld.subarray(t.index * 16, t.index * 16 + 16),
          this.scene.transformAnchor[t.index]!,
        );
      }
    }
  }

  private lightsChanged(): void {
    this.version++;
    this.changedViews = ALL_VIEWS;
  }

  /** @internal Largest axis scale of a composed transform. */
  transformsF32Scale(index: number): number {
    return this.raster.transforms.f32[index * TRANSFORM_WORDS + 3]!;
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
    setImageryArray(this, view);
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
    if (this.raster.drawConstants.setLights(handle.index, packed)) {
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
    if (this.raster.drawConstants.setImagery(handle.index, packed, unlit)) {
      this.markDirty(handle.index);
    }
  }

  setViewMask(handle: DrawHandle, mask: number): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const old =
      this.raster.recordsU32[handle.index * RECORD_WORDS + VIEW_MASK_WORD]!;
    if (old !== mask >>> 0) {
      this.scene.contentRevision_++;
      this.changedViews |= old; // the views it left
      this.raster.drawConstants.setViewMask(handle.index, mask);
      this.markDirty(handle.index);
      if ((old === 0) !== (mask === 0)) {
        // Its batch joins or leaves the bundles: they're recorded again
        // (the batch table and item list stay as they are).
        const batch = this.raster.drawBatches[handle.index]!;
        batch.shown += mask === 0 ? -1 : 1;
        if (batch.shown === (mask === 0 ? 0 : 1)) {
          this.raster.batchesShownChanged = true;
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
      this.raster.recordsU32[handle.index * RECORD_WORDS + CASTER_MASK_WORD]!;
    if (this.raster.drawConstants.setCasterMask(handle.index, mask)) {
      this.changedViews |= old | (mask >>> 0);
      this.markDirty(handle.index);
      if ((old === 0) !== (mask === 0)) {
        const batch = this.raster.drawBatches[handle.index]!;
        batch.casters += mask === 0 ? -1 : 1;
        // Its first caster, or its last, with no view drawing it: it joins
        // the shadow bundle alone, or leaves it, and that is recorded again.
        if (batch.shown === 0 && batch.casters === (mask === 0 ? 0 : 1)) {
          this.raster.casters = undefined;
          this.raster.clippedBundles.delete("shadow");
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
    const flags =
      this.raster.recordsU32[handle.index * RECORD_WORDS + FLAGS_WORD]!;
    const next = ground
      ? flags & ~RecordFlags.notGround
      : flags | RecordFlags.notGround;
    if (this.raster.drawConstants.setFlags(handle.index, next)) {
      this.raster.uploadsPending = true;
    }
  }

  /** Whether ray casts with `collisionOnly` may hit the draw. */
  setCollision(handle: DrawHandle, collision: boolean): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    const flags =
      this.raster.recordsU32[handle.index * RECORD_WORDS + FLAGS_WORD]!;
    const next = collision
      ? flags | RecordFlags.collision
      : flags & ~RecordFlags.collision;
    if (this.raster.drawConstants.setFlags(handle.index, next)) {
      this.raster.uploadsPending = true;
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
   * A parameter (plan 5a's call 42): one float in this world's placements
   * buffer, which every placement naming it reads, so a morph writes 4 bytes
   * a tick however many draws it moves. Setting its `value` to a non-finite
   * number throws a `RangeError` (as `value` here does) and keeps the old
   * value.
   *
   * `options.range` `[min, max]` declares the values it will take (`value`
   * must be in it, and `min` not above `max`). The bounds of every draw
   * whose placement reads it are then made once, for the whole range (a
   * weight is at most two affine factors of parameters: its extreme over
   * their ranges), so a change within it writes the one float and walks no
   * draw. A value outside the range throws a `RangeError` and keeps the old
   * one: declare the range you drag over. Without a range a change
   * recomputes its draws' bounds at the value it has (the sphere's centre
   * moves by the displacement there, and its radius grows by the residual:
   * `drawnSphere`), as it always did.
   */
  createPlacementParameter(
    value: number,
    options?: { readonly range?: readonly [number, number] },
  ): PlacementParameter {
    return createPlacementParameter(this, value, options);
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
    if (this.warps.setUser(handle, placement)) {
      return; // drawn warped by its route: kept, with the route's term
    }
    setPlacement(this, handle, placement);
  }

  /** The draw's per-vertex placement (`setPlacement`), if any. */
  drawPlacement(handle: DrawHandle): Placement | undefined {
    return this.warps.has(handle)
      ? this.warps.userPlacement(handle)
      : drawPlacement(this, handle);
  }

  /** Changes a draw's tint (linear RGBA, multiplied with its material). */
  setColor(handle: DrawHandle, color: ArrayLike<number>): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    this.raster.drawConstants.setColor(handle.index, color);
    this.markDirty(handle.index);
  }

  setVisible(handle: DrawHandle, visible: boolean): void {
    if (!this.hasDraw(handle)) {
      return;
    }
    if (this.warps.setVisible(handle, visible)) {
      return; // held hidden until its route's fit lands: remembered
    }
    const flags =
      this.raster.recordsU32[handle.index * RECORD_WORDS + FLAGS_WORD]!;
    this.raster.drawConstants.setFlags(
      handle.index,
      visible ? flags & ~RecordFlags.hidden : flags | RecordFlags.hidden,
    );
    this.markDirty(handle.index);
  }

  /** Resolves a picked global feature ID to its draw, local ID and properties. */
  feature(featureId: number): FeatureInfo | undefined {
    const first = this.scene.featureRangeFirst;
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
    const index = this.scene.featureRangeDraw[lo]!;
    if (this.scene.drawFeatureFirst[index] !== first[lo]) {
      return undefined; // removed draw
    }
    const localId = featureId - first[lo]!;
    const table = this.scene.featureTables[index];
    const draw = {
      index,
      generation: this.raster.drawGeneration[index]!,
      name: this.scene.names[index],
    };
    const item = this.itemOfDraw(draw);
    if (!table || localId >= table.count) {
      return {
        draw,
        localId,
        name: this.scene.names[index],
        ...(item && { item }),
      };
    }
    return {
      draw,
      localId,
      name: featureName(table, localId) ?? this.scene.names[index],
      properties: featureProperties(table, localId),
      ...(item && { item }),
    };
  }

  /**
   * Composes changed transforms, uploads materials and returns the current
   * bundle; table changes upload in the first view's cull pass.
   */
  prepareFrame(): GPURenderBundle {
    return prepareFrame(this);
  }

  /**
   * The bundle drawing this world's shadow casters (depth only, after a
   * cull for the shadow map's cascade), current with `prepareFrame`'s.
   */
  shadowBundle(): GPURenderBundle {
    return shadowBundle(this);
  }

  /**
   * The bundle drawing this world's ground into a height capture (the
   * casters, without depth bias; Engine `addHeightCapture`).
   */
  heightBundle(): GPURenderBundle {
    return heightBundle(this);
  }

  /**
   * The bundle drawing this world into the depth and normal prepass (after
   * the view's cull), current with `prepareFrame`'s.
   */
  prepassBundle(): GPURenderBundle {
    return prepassBundle(this);
  }

  /**
   * The bundle drawing this world's depth into the opaque pass before it
   * shades (after the view's cull; no lines), current with
   * `prepareFrame`'s.
   */
  depthBundle(): GPURenderBundle {
    return depthBundle(this);
  }

  /**
   * @internal The bundle a pick variant draws (render/view/pickDomain.ts):
   * meshes non-indexed and patch draws, after the view's cull; undefined
   * before the world's first frame.
   */
  pickBundle(): GPURenderBundle | undefined {
    return pickBundle(this);
  }

  /**
   * @internal The bundle of `kind` with the clip test on, for a view that
   * has clips (`clippedBundle`); undefined before the world's first frame.
   */
  clippedBundle(kind: BundleKind): GPURenderBundle | undefined {
    return clippedBundle(this, kind);
  }

  /**
   * Adds a clip: shapes in a reference frame, combined, keeping their
   * inside or outside (`ClipSet`). It cuts nothing until a view uses it
   * (`View.clipMask`, the clip's `bit`). Each clip is tested where its
   * frame is, and moves with it. At most 32 per world.
   */
  addClip(set: ClipSet): WorldClip {
    const clip = this.clipSets.add(set);
    this.clipsChanged();
    return clip;
  }

  /** Replaces a clip's shapes, frame and rules; the views that use it redraw. */
  setClip(clip: WorldClip, set: ClipSet): void {
    this.clipSets.set(clip, set);
    this.clipsChanged();
  }

  /** Removes a clip; views that used it no longer cut with it. A removed clip's bit goes to the next clip added: clear it in the views' masks first if they should not take it. */
  removeClip(clip: WorldClip): void {
    this.clipSets.remove(clip);
    this.clipsChanged();
  }

  /** The clip's set as it was added (frozen), or undefined once removed. */
  clipOf(clip: WorldClip): ClipSet | undefined {
    return this.clipSets.get(clip);
  }

  /** Counts changes to the world's clips: added, set and removed. */
  get clipsRevision(): number {
    return this.clipSets.revision;
  }

  private clipsChanged(): void {
    this.version++;
    this.changedViews = ALL_VIEWS;
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
    diceWrites?: () => GPUComputePassTimestampWrites | undefined,
  ): void {
    encodeCull(this, encoder, timestampWrites, points, pixels, diceWrites);
  }

  /**
   * Runs `encode` once per frame in this world's first cull pass, after
   * table uploads and before culling: for kernels that write the tables
   * on the GPU (e.g. tracks' instance rows; their rows must not also be
   * changed on the CPU). It sets its own pipeline and bind groups. Returns
   * the remover.
   */
  addFrameCompute(encode: (pass: GPUComputePassEncoder) => void): () => void {
    this.raster.frameComputes.push(encode);
    return () => {
      const i = this.raster.frameComputes.indexOf(encode);
      if (i >= 0) {
        this.raster.frameComputes.splice(i, 1);
      }
    };
  }

  /** A draw's first row in the instance table (`instanceBuffer`). */
  instanceFirst(handle: DrawHandle): number {
    return this.raster.recordsU32[
      handle.index * RECORD_WORDS + INSTANCE_FIRST_WORD
    ]!;
  }

  /**
   * How the bundle issues draws. "indirect" (default) takes per-view culling
   * from the cull kernels; "direct" bakes CPU-side draw arguments into the
   * bundle and draws everything — a baseline for measuring indirect overhead.
   */
  get submission(): SubmissionMode {
    return this.raster._submission;
  }

  set submission(mode: SubmissionMode) {
    if (mode !== this.raster._submission) {
      this.raster._submission = mode;
      this.raster.bundle = undefined;
    }
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
    return translucentRange(this, eye, viewBit);
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
    clipped = false,
  ): void {
    encodeTranslucent(this, pass, keyOf, group, clipped);
  }

  /** The vertex arena buffer holding `mesh` (its slab's, scene/Slabs.ts). */
  vertexBufferOf(mesh: MeshHandle): GPUBuffer {
    return this.slabs.get(mesh.slab).vertexBuffer;
  }

  /** @internal */
  markDirty(index: number): void {
    this.raster.drawConstants.mark(index);
    this.raster.uploadsPending = true;
    this.version++;
    // The views that draw it, and those whose cascades do.
    this.changedViews |=
      this.raster.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD]! |
      this.raster.recordsU32[index * RECORD_WORDS + CASTER_MASK_WORD]!;
  }

  /** The world was destroyed (`destroy`): its GPU resources are gone. */
  get destroyed(): boolean {
    return this.destroyed_;
  }
  private destroyed_ = false;

  destroy(): void {
    this.destroyed_ = true;
    this.warps.clear();
    this.stopTracking();
    // Its tables' string ids go back to the shared table.
    for (const uploaded of this.scene.tableColumns.values()) {
      for (const value of uploaded.strings) {
        stringIds.release(value);
      }
    }
    this.scene.tableColumns.clear();
    for (const chunk of this.raster.uploadChunks) {
      chunk.buffer.destroy();
    }
    for (const draw of this.raster.pointDraws.values()) {
      draw.params.destroy();
    }
    this.raster.splats.depth.destroy();
    this.raster.splats.color.destroy();
    this.raster.splats.feature.destroy();
    this.raster.pointCounts.destroy();
    this.raster.drawConstants.destroy();
    this.raster.drawArguments.destroy();
    this.raster.placementTable.destroy();
    this.raster.transforms.destroy();
    this.raster.instances.destroy();
    this.slabs.destroy();
    for (const buffer of [
      this.itemBuffer,
      this.materialBuffer,
      this.clipBuffer,
      this.raster.batchBuffer,
      this.raster.cullParams,
    ]) {
      buffer.destroy();
    }
  }
}
