// A world's rasterizer data: draw records, batches, bundles, culling and the GPU
// tables behind them. The scene's half is `WorldScene`.
import { CLIP_BOXES, CLIP_BOX_FLOATS } from "../layout.ts";
import type {
  SubmissionMode,
  Batch,
  PointDraw,
} from "../../scene/world/types.ts";
import type { DrawConstants } from "../drawConstants.ts";
import type { MirroredTable } from "../../scene/MirroredTable.ts";
import type { RangeAllocator } from "../../gpu/RangeAllocator.ts";
import type { PlacementTable } from "../../scene/placementTable.ts";
import type { DrawArguments } from "../drawArguments.ts";

/** One per world, made once with it, and filled by its constructor. */
export class WorldRaster {
  _submission: SubmissionMode = "indirect";
  // Per-slot CPU tables (records, transforms, instances, materials) start
  // small and grow as slots are used; the GPU tables are full size (a
  // 65536-draw world's CPU tables held 37 MB on NYC, r39).
  /**
   * The draw records (the per-draw constants seam): every
   * record write goes through it.
   */
  drawConstants!: DrawConstants;
  /** The records' words, to read (written through `drawConstants`). */
  get recordsU32(): ArrayLike<number> {
    return this.drawConstants.u32;
  }
  get recordsF32(): ArrayLike<number> {
    return this.drawConstants.f32;
  }
  /** Generation per draw slot (`DrawHandle.generation`). */
  drawGeneration!: Uint32Array;
  /** Transform a draw owns (placed by origin and model), or -1. */
  drawOwnedTransform!: Int32Array;
  /** Per-instance stream ranges in their mesh's slab, by draw slot. */
  readonly instanceStreamRanges: Array<
    [offset: number, size: number, dataBytes: number, slab: number] | undefined
  > = [];

  // The transform table: float64 local and world matrices on the CPU,
  // composed parents first; GPU entries mirror the world matrices.
  transforms!: MirroredTable;

  // The instance table: ranges owned by instanced draws.
  instances!: MirroredTable;
  instanceAllocator!: RangeAllocator;
  /** Instance slots in use or freed below the highest (cull dispatch size). */
  instanceHighWater = 0;
  uploadsPending = false;
  /**
   * The placements buffer (plan 5a's call 42): parameters and each placed
   * draw's block, bound in the draw group for the vertex stage.
   */
  placementTable!: PlacementTable;
  readonly frameComputes: Array<(pass: GPUComputePassEncoder) => void> = [];
  materialsF32!: Float32Array;
  materialsU32!: Uint32Array;
  materialsDirty = false;
  readonly textureSets: Array<GPUBindGroup | undefined> = [];
  /** Each texture set's entries, for custom shaders' groups beside them. */
  readonly textureSetEntries: Array<GPUBindGroupEntry[] | undefined> = [];
  readonly freeTextureSets: number[] = [];
  /**
   * Group 2 of batches drawing with a custom shader that has uniforms:
   * its texture set's entries and the shader's (ShaderBindings), by texture
   * set, shader and the shader's texture version.
   */
  readonly shaderGroups = new Map<string, GPUBindGroup>();
  /** `ShaderBindings.generation` the bundles were recorded at. */
  bindingsGeneration = 0;
  readonly batches = new Map<string, Batch>();
  readonly batchList: Batch[] = [];
  /** Emptied batches, reused (index kept) so live records stay valid. */
  readonly freeBatches: Batch[] = [];
  readonly drawBatches: Array<Batch | undefined> = [];
  readonly freeSlots: number[] = [];
  readonly clipScratch = new Float32Array(CLIP_BOXES * CLIP_BOX_FLOATS);
  drawCount = 0;
  bundle?: GPURenderBundle;
  /**
   * A batch gained its first shown record or lost its last (`Batch.shown`):
   * the bundles are recorded again, without rewriting the batch table.
   */
  batchesShownChanged = false;
  /** Draws of blended surfaces (`translucentRange`), until draws change. */
  translucentDraws?: number[];
  /** The shadow casters' bundle, and the draw bundle it was recorded with. */
  casters?: GPURenderBundle;
  castersFor?: GPURenderBundle;
  /** The depth and normal prepass's bundle, likewise. */
  prepassBundle_?: GPURenderBundle;
  depthBundle_?: GPURenderBundle;
  depthFor?: GPURenderBundle;
  prepassFor?: GPURenderBundle;
  readonly cullParamsData = new Uint32Array(4);
  readonly cullPassDesc: GPUComputePassDescriptor = { label: "cull" };
  /**
   * The draw arguments, the item lists and the batches' draws
   * (the draw-arguments seam).
   */
  drawArguments!: DrawArguments;
  /** Point draws by draw index: their per-view cull (pointCull.slang). */
  readonly pointDraws = new Map<number, PointDraw>();
  pointCounts!: GPUBuffer;
  readonly freePointCounters: number[] = [];
  /** A view's point splats, a word per pixel each (pointCull.slang). */
  splats!: {
    pixels: number;
    depth: GPUBuffer;
    color: GPUBuffer;
    feature: GPUBuffer;
    group: GPUBindGroup;
  };
  batchBuffer!: GPUBuffer;
  /**
   * GPU rows of the draw tables (records, batches, their counts and
   * arguments, the items' draw part); grows to `maxDraws`.
   */
  drawRows!: number;
  /** GPU rows of the material table; grows to `maxMaterials`. */
  materialRows!: number;
  /** GPU blocks of clip boxes; grows to `maxClipBlocks`. */
  clipRows!: number;
  pointSetCount = 0;
  cullParams!: GPUBuffer;
  cullBindGroup!: GPUBindGroup;
  pointCullBindGroup!: GPUBindGroup;
  /** Globe imagery array (a 1×1 placeholder until imagery is attached). */
  imageryView!: GPUTextureView;
  /** Bound while no imagery array is (no globe imagery in this world). */
  imageryPlaceholder!: GPUTextureView;
  /** Each texture set's (tracked) textures, for `textureDestroyed`. */
  readonly textureSetTextures: Array<GPUTexture[] | undefined> = [];
  readonly setsOfTexture = new WeakMap<GPUTexture, Set<number>>();
  /**
   * Texture sets binding a destroyed texture: their batches are skipped
   * (a bind group naming a destroyed texture fails the whole submit).
   */
  readonly brokenTextureSets = new Set<number>();
  imagerySampler!: GPUSampler;

  /**
   * Geometry written since the last frame, copied in one batch
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
   * Staging buffers mapped at creation, the queued bytes copied into them
   * when queued (as writeBuffer copied them); destroyed after each flush,
   * so nothing stays on this thread between bursts (a reused copy buffer
   * kept its peak, 4 MB after NYC's load, r39).
   */
  readonly uploadChunks: Array<{
    buffer: GPUBuffer;
    bytes: Uint8Array;
    used: number;
  }> = [];
  heights: GPURenderBundle | undefined;
  heightsFor: GPURenderBundle | undefined;
}
