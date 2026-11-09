// Glare (CESIUM2_WEBGPU_PLAN.md §13.22, §13.32): settings to passes. It comes after the
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
  type PostStage,
  type PostStagePass,
} from "../../scene/postStage.ts";
import type { ChainEntry, ChainEngine, ChainIo, GraphStage } from "./chain.ts";
import type { GlareKernelImage } from "./glareKernel.ts";
import { VEIL_LEVELS, veilWeights } from "./veilWeights.ts";

export { GLARE_BRIGHT_STARS };

/** Records in a view's list, the sun's among them (glare.slang `GLARE_SOURCES`). */
export const GLARE_SOURCES = 256;
/** Taps over the sun's disc (glare.slang `GLARE_DISC_TAPS`). */
export const GLARE_DISC_TAPS = 32;
/** The pixels a view's sprites may cover. */
export const GLARE_SPRITE_PIXELS = 4_000_000;
/** A sprite's largest radius, pixels (glare.slang `GLARE_SPRITE_MAX_RADIUS`). */
export const GLARE_SPRITE_MAX_RADIUS = 512;

/** The image's largest value in glare's chain, pre-exposed. */
export const GLARE_IMAGE_CLAMP = 10_000;
/** A sprite's largest value at a pixel, pre-exposed (glare.slang `GLARE_SPRITE_CLAMP`). */
export const GLARE_SPRITE_CLAMP = 200;
/** The buffer of sources, as the veil's passes name it. */
export const GLARE_RECORDS = "glareRecords";
const SOURCES_BUFFER = GLARE_RECORDS;

/** The veil stage's result in a view's graph. */
const GLARE_IMAGE = "post.glare";
const DEG = Math.PI / 180;

/** Bytes of a record; the header is one more. */
const RECORD_BYTES = 32;
/** The list's buffer: the header, then the records. */
export const GLARE_SOURCES_BYTES = (GLARE_SOURCES + 1) * RECORD_BYTES;
/** glare.slang's `GlareFrame`, floats. */
const FRAME_FLOATS = 88;

/**
 * `n` points evenly spread in the unit disc: a Vogel spiral. glare.slang holds
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
  sprite: GPURenderPipeline;
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
  private spriteKernel: LoadedKernel | undefined;
  private spriteGroup: GPUBindGroup | undefined;
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
        { binding: 4, resource: { buffer: sky.glareStarBuffer() } },
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

  /** Draws the sprites: a degenerate triangle for each slot past the list's count. */
  drawSprites(pass: GPURenderPassEncoder): void {
    const { pipelines, kernel } = this;
    if (pipelines && kernel) {
      pass.setPipeline(pipelines.sprite);
      pass.setBindGroup(0, this.spriteGroupFor(pipelines, kernel));
    }
    pass.draw(4, GLARE_SOURCES);
  }

  private spriteGroupFor(
    pipelines: GlarePipelines,
    kernel: LoadedKernel,
  ): GPUBindGroup {
    if (this.spriteKernel !== kernel) {
      this.spriteKernel = kernel;
      this.spriteGroup = this.engine.ctx.device.createBindGroup({
        label: "glare.sprites",
        layout: pipelines.sprite.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.frameBuffer } },
          { binding: 6, resource: { buffer: this.sources } },
          { binding: 7, resource: kernel.view },
          { binding: 8, resource: this.engine.raster.glareKernels.sampler },
        ],
      });
    }
    return this.spriteGroup!;
  }

  /**
   * The stage that draws the sprites, additively, into glare's image. It leaves no
   * image of its own.
   */
  spritesStage(): GraphStage {
    const color: GPURenderPassColorAttachment = {
      view: undefined as never,
      loadOp: "load",
      storeOp: "store",
    };
    const descriptor: GPURenderPassDescriptor = {
      label: "glare.sprites",
      colorAttachments: [color],
    };
    return {
      name: "glare-sprites",
      slot: "scene",
      kind: "physics",
      label: "Glare: a lens's spikes",
      enabled: false,
      register: (graph: FrameGraph, io: ChainIo) => {
        graph.addPass(
          "glare.sprites",
          { reads: [...io.sources], sideEffect: true },
          (enc, get) => {
            const source = io.source();
            if (
              source.name !== GLARE_IMAGE ||
              !this.kernel ||
              !this.pipelines
            ) {
              return;
            }
            color.view = get(source);
            descriptor.timestampWrites =
              this.engine.raster.timer.passWrites("glare.sprites");
            const pass = enc.beginRenderPass(descriptor);
            this.drawSprites(pass);
            pass.end();
          },
        );
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
          "glare.sources",
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
 * A down pass's tap, source texels from its center. With what the joins' B-splines add, a
 * level's σ comes to `basePixels × 2^i`: a variance of 5/3 of a texel² per axis here.
 */
const DOWN_REACH = 1.2083;
/** How far past the sun's disc the veil's input is masked, the view's pixels. */
const MASK_MARGIN = 1.5;

const float = (value: number) =>
  Number.isInteger(value) ? `${value}.0` : `${value}`;

/** The weight of level `i`, as a uniform. */
const levelWeight = (i: number) =>
  i < 8 ? `uniforms.w${i >> 2}.${"xyzw"[i & 3]}` : "uniforms.w2";

/** `veilSpread` in WGSL: per the view's pixel². */
function spreadWgsl(levels: number, basePixels: number): string {
  const terms = Array.from({ length: levels }, (_, i) => {
    const variance = (basePixels * 2 ** i) ** 2;
    return `  sum += ${levelWeight(i)} * exp(-r2 / ${float(2 * variance)}) / ${float(2 * Math.PI * variance)};`;
  });
  return `fn glareSpread(r2: f32) -> f32 {
  var sum = 0.0;
${terms.join("\n")}
  return sum;
}`;
}

const GLARE_COMMON = `struct GlareSource {
  pixel: vec2<f32>,
  radius: f32,
  visibility: f32,
  light: vec3<f32>,
  kind: f32,
};

fn glareImage(c: vec4<f32>) -> vec4<f32> {
  // Below 0 is light out of sRGB's gamut, which a veil can't spread.
  let finite = postFinite(c);
  return vec4<f32>(clamp(finite.rgb, vec3<f32>(0.0), vec3<f32>(${float(GLARE_IMAGE_CLAMP)})), finite.a);
}

// A pixel at \`uv\` is within the sun's disc, and the margin: by the sine of its angle
// from the sun, in the view's axes.
fn glareInSun(uv: vec2<f32>) -> bool {
  let sun = ${SOURCES_BUFFER}[1];
  let head = ${SOURCES_BUFFER}[0];
  if (sun.kind < 0.5 || head.pixel.y <= 0.0) {
    return false;
  }
  let t = (uv - vec2<f32>(0.5)) * uniforms.viewSize * uniforms.pixelAngle;
  let s = (sun.pixel - uniforms.viewSize * 0.5) * uniforms.pixelAngle;
  let d = t - s;
  let across = t.x * s.y - t.y * s.x;
  let sine = sqrt(dot(d, d) + across * across) / sqrt((1.0 + dot(t, t)) * (1.0 + dot(s, s)));
  return sine < head.radius + ${float(MASK_MARGIN)} * uniforms.pixelAngle;
}`;

/** The sun's veil at `uv`, pre-exposed: `sunVeil`, as veilWeights.ts has it. */
const SUN_VEIL = `fn glareSunVeil(uv: vec2<f32>, preExposure: f32) -> vec3<f32> {
  let sun = ${SOURCES_BUFFER}[1];
  let head = ${SOURCES_BUFFER}[0];
  if (sun.visibility <= 0.0) {
    return vec3<f32>(0.0);
  }
  let pixel = uv * uniforms.viewSize;
  let offset = pixel - sun.pixel;
  let t = (pixel - uniforms.viewSize * 0.5) * uniforms.pixelAngle;
  let z = 1.0 / sqrt(1.0 + dot(t, t));
  let solid = uniforms.pixelAngle * uniforms.pixelAngle * z * z * z;
  let fade = smoothstep(0.05, 0.15, head.pixel.y);
  return sun.light * sun.visibility * uniforms.share * glareSpread(dot(offset, offset)) / solid * fade * preExposure;
}`;

/** A pass's common text, and the buffer it reads. */
const withSources = (
  name: string,
  shader: string,
  more: Partial<PostStagePass> = {},
): PostStagePass => ({
  name,
  shader: `${GLARE_COMMON}\n${shader}`,
  storage: [{ name: SOURCES_BUFFER, type: "array<GlareSource>" }],
  ...more,
});

/** A cubic B-spline over a texture of one level, in 4 bilinear taps (Sigg and Hadwiger 2005). */
const bicubic = (
  texture: string,
) => `fn glareBicubic(uv: vec2<f32>) -> vec3<f32> {
  let size = vec2<f32>(textureDimensions(${texture}));
  let p = uv * size - vec2<f32>(0.5);
  let i = floor(p);
  let f = p - i;
  let f2 = f * f;
  let f3 = f2 * f;
  let w0 = (vec2<f32>(1.0) - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  let w1 = (vec2<f32>(4.0) - 6.0 * f2 + 3.0 * f3) / 6.0;
  let w3 = f3 / 6.0;
  let g0 = w0 + w1;
  let g1 = vec2<f32>(1.0) - g0;
  let h0 = (i + vec2<f32>(-0.5) + w1 / g0) / size;
  let h1 = (i + vec2<f32>(1.5) + w3 / g1) / size;
  let a = textureSampleLevel(${texture}, postSampler, h0, 0.0).rgb;
  let b = textureSampleLevel(${texture}, postSampler, vec2<f32>(h1.x, h0.y), 0.0).rgb;
  let c = textureSampleLevel(${texture}, postSampler, vec2<f32>(h0.x, h1.y), 0.0).rgb;
  let d = textureSampleLevel(${texture}, postSampler, h1, 0.0).rgb;
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}`;

/**
 * The passes of a veil with a pyramid: `levels` of them, from `basePixels`. The levels
 * join from the top, each taking the sum above it up one level: 4 taps a pixel in all, not
 * 4 per level (3.6 ms at 2560×1440 on an M2, composed in one pass; this is under 1).
 */
function pyramidPasses(levels: number, basePixels: number): PostStagePass[] {
  const down: PostStagePass[] = [];
  for (let i = 1; i < levels; i++) {
    down.push({
      name: `down.${i}`,
      reads: [{ texture: "pyramid", mip: i - 1 }],
      writes: [{ texture: "pyramid", mip: i }],
      shader: `fn postStage(input: PostInput) -> vec4<f32> {
  let o = ${float(DOWN_REACH)} / vec2<f32>(textureDimensions(pyramid));
  return 0.25 * (
    textureSampleLevel(pyramid, postSampler, input.uv + vec2<f32>(-o.x, -o.y), 0.0) +
    textureSampleLevel(pyramid, postSampler, input.uv + vec2<f32>(o.x, -o.y), 0.0) +
    textureSampleLevel(pyramid, postSampler, input.uv + vec2<f32>(-o.x, o.y), 0.0) +
    textureSampleLevel(pyramid, postSampler, input.uv + vec2<f32>(o.x, o.y), 0.0));
}`,
    });
  }
  const pyramidAt =
    "textureSampleLevel(pyramid, postSampler, input.uv, 0.0).rgb";
  const up: PostStagePass[] = [
    {
      name: `up.${levels - 1}`,
      reads: [{ texture: "pyramid", mip: levels - 1 }],
      writes: [{ texture: "veil", mip: levels - 1 }],
      shader: `fn postStage(input: PostInput) -> vec4<f32> {
  return vec4<f32>(${levelWeight(levels - 1)} * ${pyramidAt}, 1.0);
}`,
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
      shader: `${bicubic("veil")}
fn postStage(input: PostInput) -> vec4<f32> {
  return vec4<f32>(${levelWeight(i)} * ${pyramidAt} + glareBicubic(input.uv), 1.0);
}`,
    });
  }
  return [
    withSources(
      "input",
      `fn postStage(input: PostInput) -> vec4<f32> {
  if (glareInSun(input.uv)) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }
  let o = 0.25 / input.size;
  let c = 0.25 * (
    glareImage(postColor(input.uv + vec2<f32>(-o.x, -o.y))) +
    glareImage(postColor(input.uv + vec2<f32>(o.x, -o.y))) +
    glareImage(postColor(input.uv + vec2<f32>(-o.x, o.y))) +
    glareImage(postColor(input.uv + vec2<f32>(o.x, o.y))));
  return vec4<f32>(c.rgb, 1.0);
}`,
      { writes: [{ texture: "pyramid", mip: 0 }] },
    ),
    ...down,
    ...up,
    withSources(
      "veil",
      `${spreadWgsl(levels, basePixels)}
${SUN_VEIL}
${bicubic("veil")}
fn postStage(input: PostInput) -> vec4<f32> {
  let sum = ${levelWeight(0)} * ${pyramidAt} + glareBicubic(input.uv);
  let veil = uniforms.share * sum + glareSunVeil(input.uv, input.preExposure);
  return vec4<f32>(min(veil, vec3<f32>(${float(GLARE_IMAGE_CLAMP)})), 1.0);
}`,
      {
        reads: [
          { texture: "pyramid", mip: 0 },
          { texture: "veil", mip: 1 },
        ],
        writes: [{ texture: "veil", mip: 0 }],
      },
    ),
    withSources(
      "composite",
      `fn postStage(input: PostInput) -> vec4<f32> {
  let c = glareImage(postColorAt(input.pixel));
  let veil = textureSampleLevel(veil, postSampler, input.uv, 0.0).rgb;
  let lit = c.rgb * (1.0 - uniforms.imageShare) + veil;
  return vec4<f32>(min(lit, vec3<f32>(${float(GLARE_IMAGE_CLAMP)})), c.a);
}`,
      { reads: [{ texture: "veil", mip: 0 }] },
    ),
  ];
}

/** The pass of glare with no pyramid: the image, and the sun's veil in closed form. */
function closedFormPass(levels: number, basePixels: number): PostStagePass[] {
  return [
    withSources(
      "composite",
      `${spreadWgsl(levels, basePixels)}
${SUN_VEIL}
fn postStage(input: PostInput) -> vec4<f32> {
  let c = glareImage(postColorAt(input.pixel));
  let lit = c.rgb + glareSunVeil(input.uv, input.preExposure);
  return vec4<f32>(min(lit, vec3<f32>(${float(GLARE_IMAGE_CLAMP)})), c.a);
}`,
    ),
  ];
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
    },
    ...(levels > 0
      ? {
          textures: {
            pyramid: { scale: 1 / basePixels, mips: levels },
            veil: { scale: 1 / basePixels, mips: levels },
          },
          passes: pyramidPasses(levels, basePixels),
        }
      : { passes: closedFormPass(weightLevels, basePixels) }),
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
      values.setUniform("w0", [...weights.subarray(0, 4)]);
      values.setUniform("w1", [...weights.subarray(4, 8)]);
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
  if (resolved.tier === "off") {
    return undefined;
  }
  const state = new GlareViewState(engine, view, resolved);
  const entries: ChainEntry[] = [
    state.sourcesStage(),
    veilStage(resolved.levels, resolved.basePixels),
  ];
  if (resolved.spikes) {
    entries.push(state.spritesStage());
  }
  return { entries, state };
}
