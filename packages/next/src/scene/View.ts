import { Camera } from "./Camera.ts";
import type { World } from "./World.ts";
import type { FeatureValue } from "../io/gltfTypes.ts";
import type { ViewLighting } from "../render/layout.ts";
import { EARTH, type Body } from "./Body.ts";

/** A normalized rectangle within a target, origin at the top-left. */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Something views draw into. Several views may share one target. */
export interface RenderTarget {
  readonly kind: "canvas" | "offscreen";
  /** Current size in device pixels. */
  readonly width: number;
  readonly height: number;
  /** Called once per frame before views render into it. */
  acquire(device: GPUDevice, format: GPUTextureFormat): GPUTextureView;
  /** The texture behind the last `acquire` (copy destination). */
  readonly texture?: GPUTexture | undefined;
}

/**
 * Renders into a canvas. An `HTMLCanvasElement` tracks its CSS size ×
 * its pixel ratio (devicePixelRatio unless fixed, e.g. 1 to render at CSS
 * resolution on a high-DPI display, as 1.x's default
 * `useBrowserRecommendedResolution`); an `OffscreenCanvas` (e.g. inside a
 * worker) keeps whatever size its owner sets, typically from resize
 * messages.
 */
export class CanvasTarget implements RenderTarget {
  readonly kind = "canvas";
  /** The canvas texture of the current frame. */
  texture?: GPUTexture;
  private context?: GPUCanvasContext;
  private configuredFor?: GPUDevice;

  constructor(
    readonly canvas: HTMLCanvasElement | OffscreenCanvas,
    options: { pixelRatio?: number } = {},
  ) {
    this.fixedPixelRatio = options.pixelRatio;
  }

  /** Fixed pixel ratio, or undefined to follow devicePixelRatio. */
  fixedPixelRatio: number | undefined;

  /** Drawing-buffer pixels per CSS pixel (1 for an `OffscreenCanvas`). */
  get pixelRatio(): number {
    return "clientWidth" in this.canvas
      ? (this.fixedPixelRatio ?? globalThis.devicePixelRatio ?? 1)
      : 1;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  acquire(device: GPUDevice, format: GPUTextureFormat): GPUTextureView {
    const canvas = this.canvas;
    if ("clientWidth" in canvas) {
      const dpr = this.pixelRatio;
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }
    if (this.configuredFor !== device) {
      this.context =
        (canvas.getContext("webgpu") as GPUCanvasContext | null) ?? undefined;
      if (!this.context) {
        throw new Error("Could not create a WebGPU canvas context.");
      }
      this.context.configure({
        device,
        format,
        alphaMode: "opaque",
        // COPY_DST: views sharing a canvas are composited into it.
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
      });
      this.configuredFor = device;
    }
    this.texture = this.context!.getCurrentTexture();
    return this.texture.createView();
  }
}

/** Renders into a texture that can be read back, e.g. thumbnails or tests. */
export class OffscreenTarget implements RenderTarget {
  readonly kind = "offscreen";
  /** The texture rendered into (copy destination when views share it). */
  texture?: GPUTexture;
  private view?: GPUTextureView;
  private device?: GPUDevice;
  private format?: GPUTextureFormat;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  acquire(device: GPUDevice, format: GPUTextureFormat): GPUTextureView {
    if (!this.texture || this.device !== device) {
      this.texture?.destroy();
      this.device = device;
      this.format = format;
      this.texture = device.createTexture({
        label: "offscreen",
        size: { width: this.width, height: this.height },
        format,
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT |
          GPUTextureUsage.COPY_SRC |
          GPUTextureUsage.COPY_DST,
      });
      this.view = this.texture.createView();
    }
    return this.view!;
  }

  /** Reads the last rendered image as tightly packed RGBA8. */
  async read(): Promise<Uint8ClampedArray<ArrayBuffer>> {
    if (!this.texture || !this.device) {
      throw new Error("Nothing has been rendered to this target yet.");
    }
    const device = this.device;
    const bytesPerRow = Math.ceil((this.width * 4) / 256) * 256;
    const buffer = device.createBuffer({
      size: bytesPerRow * this.height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture: this.texture },
      { buffer, bytesPerRow },
      { width: this.width, height: this.height },
    );
    device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const src = new Uint8Array(buffer.getMappedRange());
    const out = new Uint8ClampedArray(this.width * this.height * 4);
    const bgra = this.format?.startsWith("bgra") ?? false;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const s = y * bytesPerRow + x * 4;
        const d = (y * this.width + x) * 4;
        out[d] = src[s + (bgra ? 2 : 0)]!;
        out[d + 1] = src[s + 1]!;
        out[d + 2] = src[s + (bgra ? 0 : 2)]!;
        out[d + 3] = 255;
      }
    }
    buffer.unmap();
    buffer.destroy();
    return out;
  }

  destroy(): void {
    this.texture?.destroy();
  }
}

/** A line list drawn on top of a view. */
export interface Overlay {
  /** Earth-fixed float64 endpoints, xyz per vertex, two per segment. */
  positions: Float64Array;
  /** Vertices in use (the array may have spare capacity). */
  count: number;
  color: readonly [number, number, number, number];
}

/** A view's scene-referred image (`View.readHdr`). */
export interface HdrImage {
  width: number;
  height: number;
  /**
   * Linear Rec. 709 RGBA per pixel, row by row from the top: the light in
   * the scene before exposure and tonemapping, in the scene's units
   * (cd/m² by default). Unlit content is display-referred and not in it.
   * Emission is display-relative (added after exposure), so it appears
   * divided by the exposure scale here.
   */
  data: Float32Array;
}

export interface PickResult {
  /** Global feature ID (unique within the world). */
  featureId: number;
  name: string | undefined;
  /** Feature properties from the content's property or batch table. */
  properties?: Record<string, FeatureValue>;
}

/**
 * How a view turns the scene's light into an image (plan §4.2): as a
 * camera records it (a fixed exposure, a plain scale, or metered), or as
 * the eye sees it (`EYE`). Light is in physical units by default (lux,
 * cd/m²), so the default is a camera set for daylight.
 */
export type Exposure =
  /**
   * A camera's exposure value at ISO 100: about 15 in direct sun ("sunny
   * 16"), 12 overcast, 7 in a lit interior. Scale 1 / (1.2 · 2^EV100).
   */
  | { ev100: number }
  /** A plain multiplier, for scenes without physical units. */
  | { scale: number }
  /**
   * Automatic: from the image's average luminance (reflected-light meter,
   * K = 12.5), adapting over time. EV100 is kept within [min, max];
   * `compensation` (stops) brightens when positive; `speed` is the
   * adaptation rate per second.
   */
  | {
      auto: true;
      compensation?: number;
      min?: number;
      max?: number;
      speed?: number;
    }
  /**
   * The eye: the scene's light as a person there would see it
   * (scene/eye.ts). Its cones and rods adapt to the scene, each showing
   * what it sees as visible as it was (Ferwerda et al. 1996's thresholds):
   * in dim light the rods take over, gray and a little blue (Thompson et
   * al. 2002), colors fading; night looks darker than day (Tumblin and
   * Rushmeier's brightness: 1.8 stops by moonlight); adapting to light
   * takes a moment, to dark longer. It sees the stars against a dark sky
   * even where the scene is bright (from orbit). `compensation` (stops)
   * brightens when positive.
   */
  | { eye: true; compensation?: number };

/** The eye (`Exposure`): the `Viewer`'s default. */
export const EYE: Exposure = { eye: true };

/** No exposure: for scenes lit without units (1.x's terms). */
export const UNITLESS_EXPOSURE: Exposure = { scale: 1 };

/** Daylight: EV100 15. */
export const DAYLIGHT_EXPOSURE: Exposure = { ev100: 15 };

/** The exposure scale for an EV100 (Lagarde and de Rousiers 2014). */
export const ev100ToScale = (ev100: number): number => 1 / (1.2 * 2 ** ev100);

export interface ViewOptions {
  target: RenderTarget;
  world: World;
  camera?: Camera;
  viewport?: Viewport;
  /** How light becomes an image (`Exposure`). Default: daylight, EV100 15. */
  exposure?: Exposure;
  /** The body whose sky and light the view sees. Default: the Earth. */
  body?: Body;
  /**
   * Behind the scene: the body's sky from its atmosphere (the default) or
   * `clearColor`.
   */
  background?: ViewBackground;
  /** The sun's disk in the sky. Default true. */
  sunDisk?: boolean;
  /**
   * The air between the camera and the scene (haze, the blue of distant
   * mountains, the orange of a low sun through it), from the atmosphere,
   * with background "atmosphere". Default true.
   */
  aerialPerspective?: boolean;
  /**
   * The sun's shadows (cascaded shadow maps, out to 20 times the camera's
   * height above the ground, 200 m to 150 km). Default false in the
   * engine (its tests compare with 1.x, which draws none); the `Viewer`
   * turns them on.
   */
  shadows?: boolean;
  /**
   * Ambient occlusion (GTAO from a depth and normal prepass): the sky's
   * light hidden by nearby surfaces, in corners, under eaves, between
   * buildings. Default false in the engine (as `shadows`); the `Viewer`
   * turns it on.
   */
  ambientOcclusion?: boolean;
  /** How far ambient occlusion looks for occluders, m. Default 3. */
  ambientOcclusionRadius?: number;
  /**
   * The globe's night lights (`GlobeOptions.lights`), where it has them.
   * Default true.
   */
  cityLights?: boolean;
  /** Background color as displayed (already exposed), with "color". */
  clearColor?: readonly [number, number, number];
  /** Output transfer function. "gamma2.2" matches CesiumJS 1.x. */
  outputEncoding?: OutputEncoding;
  /** How exposed light becomes display color (`ToneMapping`). */
  toneMapping?: ToneMapping;
  lighting?: Partial<ViewLighting>;
}

export type OutputEncoding = "srgb" | "gamma2.2";

/**
 * How exposed scene light becomes display color:
 *
 * - "pbrNeutral" (default): Khronos PBR Neutral. Base colors stay as
 *   authored up to about 0.8, then highlights compress toward white; the
 *   choice for design review and product color.
 * - "agx": Troy Sobotka's AgX (as Blender 4 and Filament ship it). A
 *   filmic curve in a wider gamut: bright saturated light desaturates
 *   toward white the way film and the eye see it (a sunset, a lamp), with
 *   lower contrast and a slightly lifted middle gray.
 * - "aces": the ACES filmic curve as CesiumJS 1.x applies it (Narkowicz's
 *   fit): more contrast and saturation, highlights clipping toward hue.
 */
export type ToneMapping = "pbrNeutral" | "agx" | "aces";

export type ViewBackground = "atmosphere" | "color";

/**
 * A camera looking at a world through a rectangle of a target. Views are
 * cheap: they own no geometry, only per-view state.
 */
export class View {
  readonly camera: Camera;
  readonly target: RenderTarget;
  world: World;
  viewport: Viewport;
  exposure: Exposure;
  /**
   * The multiplier from the light in the scene to what is tonemapped, as
   * of the last frame (automatic exposure moves it). Shading applies it
   * before writing the HDR target (pre-exposure: fp16 stops at 65,504, and
   * a sunny day spans about 20 stops from night).
   */
  exposureScale: number;
  /**
   * @internal Automatic exposure's EV100, or the eye's adaptation (log10
   * cd/m², the cones' photopic and the rods' scotopic), and when it last
   * moved.
   */
  autoExposure?: {
    ev100: number;
    cones: number;
    rods: number;
    time: number;
    /** A reading is in flight. */
    pending: boolean;
    /** At least one reading arrived (the first is taken as is). */
    metered: boolean;
  };
  /** The body whose sky and light the view sees. */
  readonly body: Body;
  background: ViewBackground;
  sunDisk: boolean;
  aerialPerspective: boolean;
  shadows: boolean;
  ambientOcclusion: boolean;
  ambientOcclusionRadius: number;
  cityLights: boolean;
  clearColor: readonly [number, number, number];
  outputEncoding: OutputEncoding;
  toneMapping: ToneMapping;
  /** The sun's illuminance and image-based lighting factors. */
  lighting: ViewLighting;
  /** Disabled views are skipped (e.g. an offscreen view between captures). */
  enabled = true;
  readonly overlays: Overlay[] = [];
  /** @internal */
  pendingPicks: Array<{
    x: number;
    y: number;
    resolve?: (r: PickResult | undefined) => void;
    resolvePosition?: (p: Float64Array | undefined) => void;
  }> = [];
  /** @internal Waiting for the view's next render (`readHdr`). */
  pendingHdrReads: Array<(image: HdrImage) => void> = [];

  constructor(options: ViewOptions) {
    this.target = options.target;
    this.world = options.world;
    this.camera = options.camera ?? new Camera();
    this.viewport = options.viewport ?? { x: 0, y: 0, width: 1, height: 1 };
    this.exposure = options.exposure ?? DAYLIGHT_EXPOSURE;
    this.exposureScale =
      "scale" in this.exposure
        ? this.exposure.scale
        : ev100ToScale("ev100" in this.exposure ? this.exposure.ev100 : 15);
    this.body = options.body ?? EARTH;
    this.background = options.background ?? "atmosphere";
    this.sunDisk = options.sunDisk ?? true;
    this.aerialPerspective = options.aerialPerspective ?? true;
    this.shadows = options.shadows ?? false;
    this.ambientOcclusion = options.ambientOcclusion ?? false;
    this.ambientOcclusionRadius = options.ambientOcclusionRadius ?? 3;
    this.cityLights = options.cityLights ?? true;
    this.clearColor = options.clearColor ?? [0.004, 0.008, 0.02];
    this.outputEncoding = options.outputEncoding ?? "srgb";
    this.toneMapping = options.toneMapping ?? "pbrNeutral";
    this.lighting = {
      sunIlluminance: "atmosphere",
      environment: "atmosphere",
      diffuseIbl: 1,
      specularIbl: 1,
      ...options.lighting,
    };
  }

  private readonly rect: PixelRect = { x: 0, y: 0, width: 1, height: 1 };

  /**
   * Viewport in target pixels. The returned object is reused: it is current
   * until the next call.
   */
  pixelRect(): Readonly<PixelRect> {
    const x = Math.round(this.viewport.x * this.target.width);
    const y = Math.round(this.viewport.y * this.target.height);
    const width = Math.max(
      1,
      Math.round(this.viewport.width * this.target.width),
    );
    const height = Math.max(
      1,
      Math.round(this.viewport.height * this.target.height),
    );
    const rect = this.rect;
    rect.x = x;
    rect.y = y;
    rect.width = Math.min(width, this.target.width - x);
    rect.height = Math.min(height, this.target.height - y);
    return rect;
  }

  get aspect(): number {
    const rect = this.pixelRect();
    return rect.width / rect.height;
  }

  /** True when a point in target pixels falls inside this view. */
  contains(targetX: number, targetY: number): boolean {
    const r = this.pixelRect();
    return (
      targetX >= r.x &&
      targetX < r.x + r.width &&
      targetY >= r.y &&
      targetY < r.y + r.height
    );
  }

  /**
   * Feature under a pixel of this view (pixels relative to the view's
   * top-left). Resolves a few frames later; no extra render is needed.
   */
  pick(x: number, y: number): Promise<PickResult | undefined> {
    return new Promise((resolve) => this.pendingPicks.push({ x, y, resolve }));
  }

  /**
   * This view's scene-referred image (before exposure and tonemapping),
   * from its next render: for measurements and references, not display.
   * `Engine.renderFrame` renders now.
   */
  readHdr(): Promise<HdrImage> {
    return new Promise((resolve) => this.pendingHdrReads.push(resolve));
  }

  /**
   * Earth-fixed position of what is drawn under a pixel of this view
   * (float64, from the depth buffer), or undefined over the sky. Resolves a
   * few frames later, with the camera of the frame it was read in.
   */
  pickPosition(x: number, y: number): Promise<Float64Array | undefined> {
    return new Promise((resolvePosition) =>
      this.pendingPicks.push({ x, y, resolvePosition }),
    );
  }
}
