// Glare (docs/design/custom-post-processing.md, docs/design/sky-light-and-points-unifications.md): settings to passes. It comes after the
// meter and the eye's adaptation, so neither sees it. Its light list (glare.slang
// `glareSources`) gives the sun's record, and the stars that get a sprite.
import type { Sky } from "../../atmosphere/Sky.ts";
import { GLARE_BRIGHT_STARS } from "../../atmosphere/starCells.ts";
import type { GpuTimer } from "../../gpu/GpuTimer.ts";
import type { Camera } from "../../scene/Camera.ts";
import { lightListFor, type LightList } from "../../scene/lightList.ts";
import type {
  GlarePupil,
  GlareSettings,
  GlareTier,
} from "../../scene/observer.ts";
import type { View } from "../../scene/View.ts";
import type { FrameGraph } from "../FrameGraph.ts";
import {
  createPostStage,
  slangPostShader,
  type PostStage,
  type PostStagePass,
  type SlangPostLayout,
} from "../../scene/postStage.ts";
import glareClosedWgsl from "../../shaders/generated/glareClosed.wgsl?raw";
import glareClosedLayout from "../../shaders/generated/glareClosed.json";
import glareCompositeWgsl from "../../shaders/generated/glareComposite.wgsl?raw";
import glareCompositeLayout from "../../shaders/generated/glareComposite.json";
import glareDownWgsl from "../../shaders/generated/glareDown.wgsl?raw";
import glareDownLayout from "../../shaders/generated/glareDown.json";
import glareInputWgsl from "../../shaders/generated/glareInput.wgsl?raw";
import glareInputLayout from "../../shaders/generated/glareInput.json";
import glareUpWgsl from "../../shaders/generated/glareUp.wgsl?raw";
import glareUpLayout from "../../shaders/generated/glareUp.json";
import glareUpTopWgsl from "../../shaders/generated/glareUpTop.wgsl?raw";
import glareUpTopLayout from "../../shaders/generated/glareUpTop.json";
import glareVeilWgsl from "../../shaders/generated/glareVeil.wgsl?raw";
import glareVeilLayout from "../../shaders/generated/glareVeil.json";
import type {
  ChainEntry,
  ChainEngine,
  ChainIo,
  GlareIo,
  GraphStage,
} from "./chain.ts";
import type { GlareKernelImage } from "./glareKernel.ts";
import { VEIL_LEVELS, veilWeights } from "./veilWeights.ts";

export { GLARE_BRIGHT_STARS };

/** Records in a view's list, the sun's among them (glare.slang `GLARE_SOURCES`). */
export const GLARE_SOURCES = 256;
/** Taps over the sun's disk (glare.slang `GLARE_DISC_TAPS`). */
export const GLARE_DISC_TAPS = 32;
/** The pixels a view's sprites may cover. */
export const GLARE_SPRITE_PIXELS = 4_000_000;
/** A sprite's largest radius, pixels (glare.slang `GLARE_SPRITE_MAX_RADIUS`). */
export const GLARE_SPRITE_MAX_RADIUS = 512;

/** The image's largest value in glare's chain, pre-exposed. */
export const GLARE_IMAGE_CLAMP = 10_000;
/** The buffer of sources, as the veil's passes name it. */
export const GLARE_RECORDS = "glareRecords";

/** Passes the chain registers, as a stage's are: named at run time. */
const SOURCES_PASS = "glare.sources";
const DEG = Math.PI / 180;

/** Bytes of a record; the header is one more. */
const RECORD_BYTES = 32;
/** The list's buffer: the header, then the records. */
export const GLARE_SOURCES_BYTES = (GLARE_SOURCES + 1) * RECORD_BYTES;
/** glare.slang's `GlareFrame`, floats. */
const FRAME_FLOATS = 88;

/**
 * `n` points evenly spread in the unit disk: a Vogel spiral. glare.slang holds
 * `discTaps(32)` as a constant.
 */
export function discTaps(n: number): [number, number][] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i): [number, number] => {
    const r = Math.sqrt((i + 0.5) / n);
    return [r * Math.cos(i * golden), r * Math.sin(i * golden)];
  });
}

/** What glare adds to the engine's pipelines, made when first asked for. */
export interface GlarePipelines {
  sources: GPUComputePipeline;
}

/** A kernel's grid: the plan's GPU safety table holds a worker to one at this size. */
const KERNEL_SIZE = 1024;

/** A kernel on the GPU. */
export interface LoadedKernel {
  readonly view: GPUTextureView;
  readonly image: GlareKernelImage;
}

/**
 * The engine's kernels, one per aperture: computed once in a worker, on first use. Until
 * one is here its spikes draw nothing, and the veil runs. Its arrival asks for one tick.
 */
export class GlareKernels {
  private readonly loaded = new Map<GlarePupil, LoadedKernel | "waiting">();
  private readonly textures: GPUTexture[] = [];
  private sampler_: GPUSampler | undefined;

  constructor(
    private readonly device: GPUDevice,
    private readonly request: (
      aperture: GlarePupil,
      size: number,
    ) => Promise<GlareKernelImage>,
    private readonly arrived: () => void,
    private readonly failed: (message: string) => void,
  ) {}

  /** The aperture's kernel, if it's here. The first ask starts it. */
  get(aperture: GlarePupil): LoadedKernel | undefined {
    const known = this.loaded.get(aperture);
    if (known !== undefined) {
      return known === "waiting" ? undefined : known;
    }
    this.loaded.set(aperture, "waiting");
    this.request(aperture, KERNEL_SIZE).then(
      (image) => {
        this.loaded.set(aperture, this.upload(aperture, image));
        this.arrived();
      },
      (reason: unknown) => {
        this.failed(`A ${aperture} kernel for glare: ${String(reason)}`);
      },
    );
    return undefined;
  }

  get sampler(): GPUSampler {
    return (this.sampler_ ??= this.device.createSampler({
      label: "glare.kernel",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    }));
  }

  private upload(aperture: GlarePupil, image: GlareKernelImage): LoadedKernel {
    const texture = this.device.createTexture({
      label: `glare.kernel.${aperture}`,
      size: [image.size, image.size],
      format: "rgba16float",
      mipLevelCount: image.levels.length,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    image.levels.forEach((level, mip) => {
      const n = image.size >> mip;
      this.device.queue.writeTexture(
        { texture, mipLevel: mip },
        level as Uint16Array<ArrayBuffer>,
        { bytesPerRow: n * 8 },
        [n, n],
      );
    });
    this.textures.push(texture);
    return { view: texture.createView(), image };
  }

  destroy(): void {
    for (const texture of this.textures) {
      texture.destroy();
    }
  }
}

/** What a view's glare needs of the engine. */
export interface GlareEngine {
  readonly ctx: ChainEngine["ctx"] & {
    readonly pipelines: { glare(): Promise<GlarePipelines> };
  };
  readonly raster: {
    readonly sky: Sky;
    readonly timer: Pick<GpuTimer, "passWrites">;
    readonly glareKernels: GlareKernels;
  };
  readonly gpu: { readonly adapterInfo: GlareAdapter };
  requestRender(): void;
}

/** What a tier goes by (`GpuDevice.adapterInfo`). */
export interface GlareAdapter {
  readonly vendor: string;
  readonly isFallbackAdapter: boolean;
}

/**
 * The tier for an adapter at `pixels` of view: a fallback adapter has none; Intel starts
 * reduced, and only sources above 3.7 million pixels; anything else is full, and reduced
 * above 8.3 million. Starting values: nothing but an M2 has been measured.
 */
export function glareTier(adapter: GlareAdapter, pixels: number): GlareTier {
  if (adapter.isFallbackAdapter) {
    return "off";
  }
  if (adapter.vendor.toLowerCase().includes("intel")) {
    return pixels > 3_700_000 ? "sources" : "reduced";
  }
  return pixels > 8_300_000 ? "reduced" : "full";
}

/** Why `glareTier` chose, in a sentence, for a readout. */
export function glareReason(
  settings: GlareSettings | null,
  adapter: GlareAdapter,
  pixels: number,
): string {
  if (!settings || (!settings.veil && !settings.spikes)) {
    return "no veil or spikes are on";
  }
  if (settings.tier !== "auto") {
    return "chosen in the settings";
  }
  if (adapter.isFallbackAdapter) {
    return "this GPU is a software fallback";
  }
  const megapixels = (pixels / 1e6).toFixed(1);
  if (adapter.vendor.toLowerCase().includes("intel")) {
    return pixels > 3_700_000
      ? `an Intel GPU at ${megapixels} million pixels`
      : "an Intel GPU, which starts reduced until it is measured";
  }
  return pixels > 8_300_000
    ? `${megapixels} million pixels is a lot for one view`
    : "this GPU has room for all of it";
}

/** What a view's glare settings mean on its adapter. */
export interface ResolvedGlare {
  tier: GlareTier;
  /** The pyramid's levels; 0 for no pyramid. */
  levels: number;
  /** A level's σ is this × 2^i pixels, and the pyramid's base 1 / this of the view. */
  basePixels: number;
  /** The sun's veil, in closed form, and the veil from the image with `levels`. */
  sunVeil: boolean;
  spikes: boolean;
  /** Records the list may hold, the sun's among them. */
  sprites: number;
  /** The pixels its sprites may cover. */
  spritePixels: number;
}

const OFF: ResolvedGlare = {
  tier: "off",
  levels: 0,
  basePixels: 2,
  sunVeil: false,
  spikes: false,
  sprites: 0,
  spritePixels: 0,
};

/** Levels, base, and sprites and pixels, by tier (the plan's "GPU safety"). */
const TIERS: Readonly<
  Record<
    Exclude<GlareTier, "off">,
    {
      levels: number;
      basePixels: number;
      sprites: number;
      spritePixels: number;
    }
  >
> = {
  full: {
    levels: VEIL_LEVELS,
    basePixels: 2,
    sprites: GLARE_SOURCES,
    spritePixels: GLARE_SPRITE_PIXELS,
  },
  reduced: { levels: 7, basePixels: 4, sprites: 64, spritePixels: 1_000_000 },
  sources: { levels: 0, basePixels: 2, sprites: 16, spritePixels: 1_000_000 },
};

/** What `settings` mean for this adapter at `pixels` of view. */
export function resolveGlare(
  settings: GlareSettings | null,
  adapter: GlareAdapter,
  pixels: number,
): ResolvedGlare {
  if (!settings || (!settings.veil && !settings.spikes)) {
    return OFF;
  }
  const tier =
    settings.tier === "auto" ? glareTier(adapter, pixels) : settings.tier;
  if (tier === "off") {
    return OFF;
  }
  const { levels, basePixels, sprites, spritePixels } = TIERS[tier];
  return {
    tier,
    levels: settings.veil ? levels : 0,
    basePixels,
    sunVeil: !!settings.veil,
    spikes: !!settings.spikes,
    sprites,
    spritePixels,
  };
}

/** A view's glare: its list, and what fills it. */
export class GlareViewState {
  /** The list: the header, then the records (glare.slang `GlareSource`). */
  readonly sources: GPUBuffer;
  private readonly frameBuffer: GPUBuffer;
  private readonly data = new Float32Array(FRAME_FLOATS);
  private readonly list: LightList = { sun: false, stars: 0 };
  private group: GPUBindGroup | undefined;
  private pipelines: GlarePipelines | undefined;
  private kernel: LoadedKernel | undefined;
  /** This tick wrote its frame: its sky was drawn. */
  private fresh = false;
  /** The list holds nothing, for a view with no sky. */
  private cleared = true;

  constructor(
    private readonly engine: GlareEngine,
    private readonly view: View,
    private readonly resolved: ResolvedGlare,
  ) {
    const { device } = engine.ctx;
    this.sources = device.createBuffer({
      label: "glare.sources",
      size: GLARE_SOURCES_BYTES,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    this.frameBuffer = device.createBuffer({
      label: "glare.frame",
      size: FRAME_FLOATS * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    void engine.ctx.pipelines.glare().then((pipelines) => {
      this.pipelines = pipelines;
      engine.requestRender();
    });
  }

  /**
   * This view's values for the kernel: from the sky's uniform, as the sky just wrote it
   * for this view, so there's no new read of the field of view.
   */
  writeFrame(camera: Pick<Camera, "position">): void {
    const { engine, view, data, list } = this;
    const { sky } = engine.raster;
    lightListFor(view, sky.glareStarCount, list);
    sky.writeGlareFrame(data, view.body.ellipsoid, camera.position);
    const sun = view.lighting.sunIlluminance;
    data[22] = sun === "atmosphere" ? -1 : sun;
    data[23] = list.sun ? 1 : 0;
    // Sprites show nothing until a kernel says how far they reach.
    const spikes = view.observer.glare?.spikes;
    const kernel = spikes
      ? engine.raster.glareKernels.get(spikes.aperture)
      : undefined;
    this.kernel = kernel;
    if (spikes && kernel) {
      const { size, radii, scale } = kernel.image;
      const pixelAngle = (2 * data[15]!) / data[21]!;
      const cellAngle = (2 * spikes.extent * DEG) / size;
      const pixelsPerCell = cellAngle / pixelAngle;
      data[31] = list.stars;
      data[50] = spikes.share / (cellAngle * cellAngle);
      data[51] = pixelsPerCell;
      data.set(radii, 52);
      data[84] = scale;
      data[85] = 1 / (size * pixelsPerCell);
      data[86] = Math.max(-Math.log2(pixelsPerCell), 0);
    } else {
      data[31] = 0;
      data[50] = 0;
      data[51] = 0;
      data.fill(0, 52, 84);
    }
    data[48] = this.resolved.spritePixels;
    data[49] = this.resolved.sprites;
    engine.ctx.device.queue.writeBuffer(this.frameBuffer, 0, data);
    this.fresh = true;
  }

  /** The list's pass: after the adaptation, reading depth. */
  private encode(enc: GPUCommandEncoder, depth: GPUTextureView): void {
    const { pipelines } = this;
    // A field that arrived after the group was made goes up now: the buffer is the same.
    const starBuffer = this.engine.raster.sky.glareStarBuffer();
    const fresh = this.fresh && (this.list.sun || this.list.stars > 0);
    this.fresh = false;
    if (!fresh) {
      if (!this.cleared) {
        enc.clearBuffer(this.sources);
        this.cleared = true;
      }
      return;
    }
    if (!pipelines) {
      return;
    }
    const { device } = this.engine.ctx;
    const { sky, timer } = this.engine.raster;
    this.group ??= device.createBindGroup({
      label: "glare.sources",
      layout: pipelines.sources.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.frameBuffer } },
        { binding: 1, resource: depth },
        { binding: 2, resource: sky.sunLightView },
        { binding: 3, resource: sky.tableSampler },
        { binding: 4, resource: { buffer: starBuffer } },
        { binding: 5, resource: { buffer: this.sources } },
      ],
    });
    this.descriptor.timestampWrites = timer.passWrites("glare.sources");
    const pass = enc.beginComputePass(this.descriptor);
    pass.setPipeline(pipelines.sources);
    pass.setBindGroup(0, this.group);
    pass.dispatchWorkgroups(1);
    pass.end();
    this.cleared = false;
  }
  private readonly descriptor: GPUComputePassDescriptor = {
    label: "glare.sources",
  };

  /**
   * What a stage that records passes sees of this view's glare (`ChainIo.glare`): the
   * list, and the spikes' kernel, as it stands when asked.
   */
  io(): GlareIo {
    const { engine, view } = this;
    return {
      sources: this.sources,
      kernel: () => {
        const spikes = view.observer.glare?.spikes;
        const { kernel } = this;
        if (!spikes || !kernel) {
          return undefined;
        }
        return {
          view: kernel.view,
          sampler: engine.raster.glareKernels.sampler,
          scale: kernel.image.scale,
          size: kernel.image.size,
          share: spikes.share,
          extent: spikes.extent,
        };
      },
    };
  }

  /** The stage that fills the list. It leaves no image. */
  sourcesStage(): GraphStage {
    return {
      name: "glare-sources",
      slot: "scene",
      kind: "physics",
      label: "Glare's light list",
      enabled: false,
      register: (graph: FrameGraph, io: ChainIo) => {
        graph.addPass(
          SOURCES_PASS,
          { reads: [io.depth], sideEffect: true },
          (enc, get) => this.encode(enc, get(io.depth)),
        );
      },
    };
  }

  destroy(): void {
    this.sources.destroy();
    this.frameBuffer.destroy();
  }
}

/**
 * A down pass's tap, source texels from its center (stages/glareCommon.slang
 * `DOWN_REACH`). With what the joins' B-splines add, a level's σ comes to `basePixels × 2^i`:
 * a variance of 5/3 of a texel² per axis here.
 */
export const DOWN_REACH = 1.2083;
/** How far past the sun's disk the veil's input is masked, the view's pixels. */
export const MASK_MARGIN = 1.5;

/** The veil's passes, written in Slang (shaders/stages/glare*.slang, built by `npm run shaders`). */
const unit = (name: string, wgsl: string, layout: unknown) =>
  slangPostShader(`${name}.slang`, wgsl, layout as SlangPostLayout);
const SHADERS = {
  input: unit("glareInput", glareInputWgsl, glareInputLayout),
  down: unit("glareDown", glareDownWgsl, glareDownLayout),
  upTop: unit("glareUpTop", glareUpTopWgsl, glareUpTopLayout),
  up: unit("glareUp", glareUpWgsl, glareUpLayout),
  veil: unit("glareVeil", glareVeilWgsl, glareVeilLayout),
  composite: unit("glareComposite", glareCompositeWgsl, glareCompositeLayout),
  closed: unit("glareClosed", glareClosedWgsl, glareClosedLayout),
};

/** The list the passes that read it bind, in group 1 after their textures. */
const records = [{ name: GLARE_RECORDS, type: "array<GlareSource>" }];

/**
 * The passes of a veil with a pyramid: `levels` of them, from `basePixels`. The levels
 * join from the top, each taking the sum above it up one level: 4 taps a pixel in all, not
 * 4 per level (3.6 ms at 2560×1440 on an M2, composed in one pass; this is under 1).
 */
function pyramidPasses(levels: number): PostStagePass[] {
  const down: PostStagePass[] = [];
  for (let i = 1; i < levels; i++) {
    down.push({
      name: `down.${i}`,
      reads: [{ texture: "pyramid", mip: i - 1 }],
      writes: [{ texture: "pyramid", mip: i }],
      shader: SHADERS.down,
    });
  }
  const up: PostStagePass[] = [
    {
      name: `up.${levels - 1}`,
      reads: [{ texture: "pyramid", mip: levels - 1 }],
      writes: [{ texture: "veil", mip: levels - 1 }],
      shader: SHADERS.upTop,
    },
  ];
  for (let i = levels - 2; i >= 1; i--) {
    up.push({
      name: `up.${i}`,
      reads: [
        { texture: "pyramid", mip: i },
        { texture: "veil", mip: i + 1 },
      ],
      writes: [{ texture: "veil", mip: i }],
      shader: SHADERS.up,
    });
  }
  return [
    {
      name: "input",
      shader: SHADERS.input,
      storage: records,
      writes: [{ texture: "pyramid", mip: 0 }],
    },
    ...down,
    ...up,
    {
      name: "veil",
      shader: SHADERS.veil,
      storage: records,
      reads: [
        { texture: "pyramid", mip: 0 },
        { texture: "veil", mip: 1 },
      ],
      writes: [{ texture: "veil", mip: 0 }],
    },
    {
      name: "composite",
      shader: SHADERS.composite,
      storage: records,
      reads: [{ texture: "veil", mip: 0 }],
    },
  ];
}

/** The pass of glare with no pyramid: the image, and the sun's veil in closed form. */
function closedFormPass(): PostStagePass[] {
  return [{ name: "composite", shader: SHADERS.closed, storage: records }];
}

/** What a view's veil last set, so a tick that changes nothing writes nothing. */
interface VeilValues {
  pixelAngle: number;
  share: number;
  width: number;
  height: number;
}

/** The stages, by what makes them differ: their shaders hold nothing of a view's. */
const veilStages = new Map<string, PostStage>();

/**
 * Glare's image: the image, less what the veil takes, plus the veil. A declared stage on
 * the public interface but for the list it reads. `levels` 0 has no pyramid: only the
 * sun's veil, of the weights of 9 levels from `basePixels`.
 */
export function veilStage(levels: number, basePixels: number): PostStage {
  const key = `${levels}|${basePixels}`;
  const known = veilStages.get(key);
  if (known) {
    return known;
  }
  const weightLevels = levels || VEIL_LEVELS;
  const weights = new Float32Array(weightLevels);
  const seen = new WeakMap<object, VeilValues>();
  const stage = createPostStage({
    name: "glare",
    slot: "scene",
    kind: "physics",
    label: "Glare: light scattered in the eye or the lens",
    uniforms: {
      viewSize: { type: "vec2f" },
      pixelAngle: { type: "f32" },
      share: { type: "f32" },
      imageShare: { type: "f32" },
      w0: { type: "vec4f" },
      w1: { type: "vec4f" },
      w2: { type: "f32" },
      basePixels: { type: "f32", value: basePixels },
    },
    ...(levels > 0
      ? {
          textures: {
            pyramid: { scale: 1 / basePixels, mips: levels },
            veil: { scale: 1 / basePixels, mips: levels },
          },
          passes: pyramidPasses(levels),
        }
      : { passes: closedFormPass() }),
    perView({ view, pixelAngle, width, height }, values) {
      const share = view.observer.glare?.veil?.share ?? 0;
      let last = seen.get(values);
      if (!last) {
        last = { pixelAngle: Number.NaN, share: 0, width: 0, height: 0 };
        seen.set(values, last);
      }
      if (
        last.pixelAngle === pixelAngle &&
        last.share === share &&
        last.width === width &&
        last.height === height
      ) {
        return;
      }
      last.pixelAngle = pixelAngle;
      last.share = share;
      last.width = width;
      last.height = height;
      veilWeights(pixelAngle, weightLevels, basePixels, weights);
      let total = 0;
      for (let i = 0; i < weightLevels; i++) {
        total += weights[i]!;
      }
      values.setUniform("viewSize", [width, height]);
      values.setUniform("pixelAngle", pixelAngle);
      values.setUniform("share", share);
      values.setUniform("imageShare", levels > 0 ? share * total : 0);
      // The shader sums 9 levels: a smaller pyramid's last weights are 0.
      values.setUniform(
        "w0",
        [0, 1, 2, 3].map((i) => weights[i] ?? 0),
      );
      values.setUniform(
        "w1",
        [4, 5, 6, 7].map((i) => weights[i] ?? 0),
      );
      values.setUniform("w2", weights[8] ?? 0);
    },
  });
  veilStages.set(key, stage);
  return stage;
}

/** A view's glare, if it has any: what joins its chain, and its state. */
export function glareFor(
  engine: GlareEngine,
  view: View,
  width: number,
  height: number,
): { entries: readonly ChainEntry[]; state: GlareViewState } | undefined {
  if (width < 2 || height < 2) {
    return undefined;
  }
  const resolved = resolveGlare(
    view.observer.glare,
    engine.gpu.adapterInfo,
    width * height,
  );
  view.glareResolved = {
    tier: resolved.tier,
    reason: glareReason(
      view.observer.glare,
      engine.gpu.adapterInfo,
      width * height,
    ),
  };
  if (resolved.tier === "off") {
    return undefined;
  }
  const state = new GlareViewState(engine, view, resolved);
  const entries: ChainEntry[] = [
    state.sourcesStage(),
    veilStage(resolved.levels, resolved.basePixels),
  ];
  return { entries, state };
}
