// A world's rasterizer data: bundles, culling and the GPU tables behind them,
// the WebGPU device's copy of the world. The CPU data it mirrors is
// `WorldDraws`; the scene's half is `WorldScene`.
import { CLIP_BOXES, CLIP_BOX_FLOATS } from "../layout.ts";
import type {
  SubmissionMode,
  Batch,
  PatchDraw,
  PointDraw,
} from "../../scene/world/types.ts";
import type { MirroredTable } from "../../scene/MirroredTable.ts";
import type { PlacementTable } from "../../scene/placementTable.ts";
import type { DrawArguments } from "../drawArguments.ts";

/** One per world, made once with it, and filled by its constructor. */
export class WorldRaster {
  _submission: SubmissionMode = "indirect";
  /** Per-instance stream ranges in their mesh's slab, by draw slot. */
  readonly instanceStreamRanges: Array<
    [offset: number, size: number, dataBytes: number, slab: number] | undefined
  > = [];

  /** The draw records' GPU table (`WorldDraws.drawConstants`'s rows). */
  records!: MirroredTable;
  /** The transform table's GPU copy (`WorldDraws.transforms`). */
  transforms!: MirroredTable;
  /** The instance table's GPU copy (`WorldDraws.instances`). */
  instances!: MirroredTable;
  /**
   * The placements buffer (plan 5a's call 42): parameters and each placed
   * draw's block, bound in the draw group for the vertex stage.
   */
  placementTable!: PlacementTable;
  readonly frameComputes: Array<(pass: GPUComputePassEncoder) => void> = [];
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
  readonly clipScratch = new Float32Array(CLIP_BOXES * CLIP_BOX_FLOATS);
  bundle?: GPURenderBundle;
  /** Patch draws' chunk lists, by batch index: their draws' instances. */
  readonly batchChunks: Array<GPUBuffer | undefined> = [];
  /** Draws of blended surfaces (`translucentRange`), until draws change. */
  translucentDraws?: number[];
  /** The shadow casters' bundle, and the draw bundle it was recorded with. */
  casters?: GPURenderBundle;
  castersFor?: GPURenderBundle;
  /** The depth and normal prepass's bundle, likewise. */
  prepassBundle_?: GPURenderBundle;
  depthBundle_?: GPURenderBundle;
  depthFor?: GPURenderBundle;
  /** The pick variant's bundle, likewise (`World.pickBundle`). */
  pickBundle_?: GPURenderBundle;
  pickFor?: GPURenderBundle;
  prepassFor?: GPURenderBundle;
  /**
   * The bundles of the same kinds with the clip test on, for views that have
   * clips (`clippedBundle`), by kind, each with the draw bundle it was
   * recorded with.
   */
  readonly clippedBundles = new Map<
    string,
    { bundle: GPURenderBundle; for: GPURenderBundle }
  >();
  /**
   * The second phase's bundles of two-phase occlusion culling
   * (`retestBundle`): the occludable batches' draws from their second set of
   * arguments, by kind, each with the draw bundle it was recorded with.
   */
  readonly retestBundles = new Map<
    string,
    { bundle: GPURenderBundle; for: GPURenderBundle }
  >();
  /**
   * Per bundle recorded (kind, and "+clip" for the clipped one), the batches
   * it draws with a stand-in: their custom shader's pipeline is still being
   * made, or its textures are loading (`World.ready`). Cleared when the draw
   * bundle is recorded again.
   */
  readonly pipelineGaps = new Map<string, ReadonlySet<Batch>>();
  readonly cullParamsData = new Uint32Array(4);
  readonly cullPassDesc: GPUComputePassDescriptor = { label: "cull" };
  /** The patch dice's own pass, timed apart from the cull. */
  readonly dicePassDesc: GPUComputePassDescriptor = { label: "dice" };
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
  /** Patch draws by draw index: their per-view dice (dice.slang). */
  readonly patchDraws = new Map<number, PatchDraw>();
  /** The dice's group 1: records, items and the draw arguments (`cullPatchWorldLayout`). */
  patchWorldBindGroup!: GPUBindGroup;
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
   * Geometry written since the last tick, copied in one batch
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
