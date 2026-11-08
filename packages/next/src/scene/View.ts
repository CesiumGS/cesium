import { Camera, projectToPixel, type CameraPose } from "./Camera.ts";
import type { AnchorHandle, World } from "./World.ts";
import type { FrameKey } from "../camera/frameResolver.ts";
import type { FeatureValue } from "../io/gltfTypes.ts";
import { MAX_ANCHORS, type ViewLighting } from "../render/layout.ts";
import { EARTH, bodyKey, type Body } from "./Body.ts";
import { rigidMatrixError } from "../math/transforms.ts";
import type { CorePick } from "./pick.ts";
import type { SceneItem } from "./SceneItem.ts";

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
    this.fixedPixelRatio_ = options.pixelRatio;
    if (!("clientWidth" in canvas)) {
      // An OffscreenCanvas keeps the size its owner sets (no ResizeObserver
      // sees it): setting its width or height calls the watchers.
      for (const key of ["width", "height"] as const) {
        watchProperty(canvas, key, this.changed);
      }
    }
  }

  private fixedPixelRatio_: number | undefined;
  private readonly watchers: Array<() => void> = [];
  private readonly changed = () => {
    const watchers = this.watchers;
    for (let i = 0; i < watchers.length; i++) {
      watchers[i]!();
    }
  };

  /**
   * Fixed pixel ratio, or undefined to follow devicePixelRatio. Setting it
   * calls the watchers.
   */
  get fixedPixelRatio(): number | undefined {
    return this.fixedPixelRatio_;
  }
  set fixedPixelRatio(ratio: number | undefined) {
    this.fixedPixelRatio_ = ratio;
    this.changed();
  }

  /**
   * Calls `watcher` when the drawing-buffer size may change without a
   * resize the page can observe: `fixedPixelRatio` set, or an
   * `OffscreenCanvas`'s width or height. The engine's loop, which sleeps on
   * demand, wakes for it (and observes an HTML canvas's CSS box itself).
   * Returns the remover.
   */
  watch(watcher: () => void): () => void {
    this.watchers.push(watcher);
    return () => {
      const i = this.watchers.indexOf(watcher);
      if (i >= 0) {
        this.watchers.splice(i, 1);
      }
    };
  }

  /** Releases the canvas's context (its textures) from the device. */
  destroy(): void {
    this.context?.unconfigure();
    this.context = undefined;
    this.configuredFor = undefined;
    this.texture = undefined;
  }

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

/**
 * Makes setting `object[key]` also call `changed`, with an own property
 * that keeps the inherited accessor's (or the data property's) behaviour.
 * Leaves an object it can't redefine as it is.
 */
function watchProperty(object: object, key: string, changed: () => void): void {
  let descriptor: PropertyDescriptor | undefined;
  for (
    let o: object | null = object;
    o && !descriptor;
    o = Object.getPrototypeOf(o) as object | null
  ) {
    descriptor = Object.getOwnPropertyDescriptor(o, key);
  }
  if (!descriptor || descriptor.configurable === false) {
    return;
  }
  let value: unknown = descriptor.value;
  const { get, set } = descriptor;
  try {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: descriptor.enumerable ?? true,
      get: get ? () => get.call(object) : () => value,
      set: (v: unknown) => {
        if (set) {
          set.call(object, v);
        } else {
          value = v;
        }
        changed();
      },
    });
  } catch {
    // A sealed object: its writes need `Engine.requestRender`.
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

const IDENTITY_16 = Float64Array.of(
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
const scratchPlacement = new Float64Array(16);
const scratchP = new Float64Array(3);
const scratchD = new Float64Array(3);
const scratchU = new Float64Array(3);
const scratchR = new Float64Array(3);

function copy3(v: ArrayLike<number>, out: Float64Array): void {
  out[0] = v[0]!;
  out[1] = v[1]!;
  out[2] = v[2]!;
}

/**
 * `out` = R v (+ t for a point), for a column-major rigid `m`; a copy of
 * `v` without one (the identity, bit for bit).
 */
function rotate(
  m: ArrayLike<number> | undefined,
  v: ArrayLike<number>,
  out: Float64Array,
  point: boolean,
): void {
  if (!m) {
    out[0] = v[0]!;
    out[1] = v[1]!;
    out[2] = v[2]!;
    return;
  }
  const x = v[0]!,
    y = v[1]!,
    z = v[2]!;
  const w = point ? 1 : 0;
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]! * w;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]! * w;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]! * w;
}

/**
 * @internal `out` = Rᵀ (v - t for a point), for a column-major rigid `m`; a
 * copy without one.
 */
export function inverseRotate(
  m: ArrayLike<number> | undefined,
  v: ArrayLike<number>,
  out: Float64Array,
  point: boolean,
): void {
  if (!m) {
    rotate(undefined, v, out, point);
    return;
  }
  const x = v[0]! - (point ? m[12]! : 0),
    y = v[1]! - (point ? m[13]! : 0),
    z = v[2]! - (point ? m[14]! : 0);
  out[0] = m[0]! * x + m[1]! * y + m[2]! * z;
  out[1] = m[4]! * x + m[5]! * y + m[6]! * z;
  out[2] = m[8]! * x + m[9]! * y + m[10]! * z;
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
   * divided by the exposure scale here. Alpha is not divided: it is the
   * share of the pixel's luminance that is scene light (1 without
   * emission), which the exposure meter takes of the color.
   */
  data: Float32Array;
}

export interface PickResult {
  /** Global feature ID (unique within the world). */
  featureId: number;
  name: string | undefined;
  /** Feature properties from the content's property or batch table. */
  properties?: Record<string, FeatureValue>;
  /** The item that drew it, if an item did (`World.add`). */
  item?: SceneItem;
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
   * brightens when positive; `speed` is how many times faster than a
   * real eye it adapts (1: to dark in minutes, as the eye does; default
   * `EYE_ADAPTATION_SPEED`, 400: a few seconds).
   */
  | { eye: true; compensation?: number; speed?: number };

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
   * turns them on. A budgeted 3D tileset also loads tiles off screen that
   * may cast into view, coarser, and only with room in its cache
   * (`TilesetOptions.casterErrorScale`).
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
  /** How blended surfaces are put in order (`TranslucencyMethod`). */
  translucencyMethod?: TranslucencyMethod;
  /**
   * FXAA after tonemapping, on top of 4× MSAA: smooths the edges MSAA
   * leaves (within shading, and translucency's moments). Default false.
   */
  fxaa?: boolean;
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
 * How blended surfaces (glTF alpha mode "BLEND": glass, water, ghosted
 * design) are put in order, whatever order they're drawn in:
 *
 * - "moments" (default): moment-based order-independent transparency. Two
 *   passes over them and a fixed 36 bytes a pixel; where many layers
 *   overlap, the light reaching each is estimated, so their order blurs.
 * - "exact": every layer kept per pixel and sorted, the nearest 32 blended
 *   in order. Memory grows with the layers on screen (16 bytes each); the
 *   reference "moments" is tested against.
 */
export type TranslucencyMethod = "moments" | "exact";

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
 * A copy of `value` whose writes call `changed`: a view's viewport,
 * exposure and lighting edited in place wake the engine's loop, as
 * assigning them does.
 */
function watched<T extends object>(value: T, changed: () => void): T {
  return new Proxy(
    { ...value },
    {
      set(target, key, v) {
        (target as Record<PropertyKey, unknown>)[key] = v;
        changed();
        return true;
      },
      deleteProperty(target, key) {
        delete (target as Record<PropertyKey, unknown>)[key];
        changed();
        return true;
      },
    },
  );
}

/**
 * A camera looking at a world through a rectangle of a target. Views are
 * cheap: they own no geometry, only per-view state.
 */
export class View {
  readonly camera: Camera;
  readonly target: RenderTarget;
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
    /**
     * A rendered tick skipped its meter pass because a reading was in
     * flight: the reading that lands asks for a tick to meter it.
     */
    skipped: boolean;
    /** At least one reading arrived (the first is taken as is). */
    metered: boolean;
  };
  /** The body whose sky and light the view sees. */
  readonly body: Body;
  shadows: boolean;
  ambientOcclusion: boolean;
  ambientOcclusionRadius: number;
  translucencyMethod: TranslucencyMethod;
  fxaa: boolean;
  cityLights: boolean;
  /**
   * @internal Wakes the engine's frame loop (it sleeps on demand when
   * nothing changes): set by `Engine.addView`, called when what the view's
   * on-demand fingerprint reads is set (`viewport`, `exposure` and
   * `lighting` also when written in place), and for a pick.
   */
  wake?: () => void;
  /**
   * @internal The view's render root (the camera layer's,
   * `CameraLayer.root`): set by `Engine.addView`, read by the frames
   * module's placement query (`placementOf`), which is given the view.
   */
  renderRoot?: () => FrameKey;
  private readonly state = {} as {
    world: World;
    viewport: Viewport;
    exposure: Exposure;
    background: ViewBackground;
    sunDisk: boolean;
    aerialPerspective: boolean;
    clearColor: readonly [number, number, number];
    outputEncoding: OutputEncoding;
    toneMapping: ToneMapping;
    enabled: boolean;
    lighting: ViewLighting;
  };
  private readonly changed = () => this.wake?.();

  get world(): World {
    return this.state.world;
  }
  set world(value: World) {
    this.state.world = value;
    this.wake?.();
  }
  get viewport(): Viewport {
    return this.state.viewport;
  }
  set viewport(value: Viewport) {
    this.state.viewport = watched(value, this.changed);
    this.wake?.();
  }
  get exposure(): Exposure {
    return this.state.exposure;
  }
  set exposure(value: Exposure) {
    this.state.exposure = watched(value, this.changed);
    this.wake?.();
  }
  /**
   * The sun's illuminance and image-based lighting factors. Like
   * `viewport` and `exposure`, a copy of what is set: written in place
   * too, it wakes the engine's loop.
   */
  get lighting(): ViewLighting {
    return this.state.lighting;
  }
  set lighting(value: ViewLighting) {
    this.state.lighting = watched(value, this.changed);
    this.wake?.();
  }
  get background(): ViewBackground {
    return this.state.background;
  }
  set background(value: ViewBackground) {
    this.state.background = value;
    this.wake?.();
  }
  get sunDisk(): boolean {
    return this.state.sunDisk;
  }
  set sunDisk(value: boolean) {
    this.state.sunDisk = value;
    this.wake?.();
  }
  get aerialPerspective(): boolean {
    return this.state.aerialPerspective;
  }
  set aerialPerspective(value: boolean) {
    this.state.aerialPerspective = value;
    this.wake?.();
  }
  get clearColor(): readonly [number, number, number] {
    return this.state.clearColor;
  }
  set clearColor(value: readonly [number, number, number]) {
    this.state.clearColor = value;
    this.wake?.();
  }
  get outputEncoding(): OutputEncoding {
    return this.state.outputEncoding;
  }
  set outputEncoding(value: OutputEncoding) {
    this.state.outputEncoding = value;
    this.wake?.();
  }
  get toneMapping(): ToneMapping {
    return this.state.toneMapping;
  }
  set toneMapping(value: ToneMapping) {
    this.state.toneMapping = value;
    this.wake?.();
  }
  /** Disabled views are skipped (e.g. an offscreen view between captures). */
  get enabled(): boolean {
    return this.state.enabled;
  }
  set enabled(value: boolean) {
    this.state.enabled = value;
    this.wake?.();
  }
  readonly overlays: Overlay[] = [];
  /** @internal */
  pendingPicks: Array<{
    x: number;
    y: number;
    resolve?: (r: PickResult | undefined) => void;
    resolvePosition?: (p: Float64Array | undefined) => void;
    resolvePoint?: (p: CorePick | undefined) => void;
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
    this.translucencyMethod = options.translucencyMethod ?? "moments";
    this.fxaa = options.fxaa ?? false;
    this.cityLights = options.cityLights ?? true;
    this.clearColor = options.clearColor ?? [0.004, 0.008, 0.02];
    this.outputEncoding = options.outputEncoding ?? "srgb";
    this.toneMapping = options.toneMapping ?? "pbrNeutral";
    this.enabled = true;
    this.lighting = {
      sunIlluminance: "atmosphere",
      environment: "atmosphere",
      diffuseIbl: 1,
      specularIbl: 1,
      ...options.lighting,
    };
  }

  private readonly rect: PixelRect = { x: 0, y: 0, width: 1, height: 1 };

  // ------------------------------------------------------- anchor placements

  /** Render space ← anchor, by slot (16 float64 each); slot 0: no anchor. */
  private readonly placements = new Float64Array(MAX_ANCHORS * 16);
  /**
   * The anchor each slot's placement was set for; a slot whose anchor was
   * removed (and the slot reused) reads as the identity again.
   */
  private readonly placementOwners: Array<AnchorHandle | undefined> = [];
  /** Slots whose placement is not the identity. */
  private readonly placed = new Uint8Array(MAX_ANCHORS);
  private anchorRevision_ = 0;
  /** The world and its `anchorRemovals` the placements were last checked against. */
  private anchorsWorld: World | undefined;
  private anchorsRemovals = 0;
  /** `bodyKey(body)`, for `bodyAnchor`. */
  private bodyKey_: string | undefined;

  /**
   * Counts changes to this view's anchor placements: a placement set to a
   * new value (`setAnchorPlacement`; one set to the value it has doesn't
   * count), an anchor removed from the world (`World.removeAnchor`), and
   * the view moved to another world.
   */
  get anchorRevision(): number {
    this.syncAnchors();
    return this.anchorRevision_;
  }

  /**
   * The view's body's anchor (`World.bodyAnchor(view.body)`) if the world
   * has made it; undefined until then (content is then in render space).
   */
  get bodyAnchor(): AnchorHandle | undefined {
    return this.world.findBodyAnchor((this.bodyKey_ ??= bodyKey(this.body)));
  }

  /**
   * Render space ← `anchor` for this view (column-major float64, rigid):
   * the identity until set. `undefined` is no anchor: the transform
   * table's root.
   */
  anchorPlacement(
    anchor: AnchorHandle | undefined,
    out = new Float64Array(16),
  ): Float64Array {
    const slot = this.placementSlot(anchor, "anchorPlacement");
    if (this.placed[slot] === 1) {
      out.set(this.placements.subarray(slot * 16, slot * 16 + 16));
    } else {
      out.fill(0);
      out[0] = out[5] = out[10] = out[15] = 1;
    }
    return out;
  }

  /**
   * Places `anchor` (or, with `undefined`, the table's root) in this view's
   * render space: `matrix` is render space ← anchor, column-major float64,
   * a rotation (columns orthonormal within 10⁻⁹) and a translation. Refuses
   * any other matrix, naming the anchor. Stored, and drawn from the
   * following render; `anchorRevision` counts it only when a value changes.
   */
  setAnchorPlacement(
    anchor: AnchorHandle | undefined,
    matrix: ArrayLike<number>,
  ): void {
    const slot = this.placementSlot(anchor, "setAnchorPlacement");
    const name = anchor ? anchor.name : "the transform table's root";
    const error = rigidMatrixError(matrix);
    if (error) {
      throw new Error(
        `setAnchorPlacement: ${name}'s placement is not rigid: ${error}.`,
      );
    }
    const current = this.anchorPlacement(anchor, scratchPlacement);
    let same = true;
    for (let i = 0; i < 16; i++) {
      if (current[i] !== matrix[i]) {
        same = false;
        break;
      }
    }
    if (same) {
      return;
    }
    let identity = true;
    for (let i = 0; i < 16; i++) {
      const v = matrix[i]!;
      this.placements[slot * 16 + i] = v;
      if (v !== IDENTITY_16[i]) {
        identity = false;
      }
    }
    this.placed[slot] = identity ? 0 : 1;
    this.placementOwners[slot] = anchor;
    this.anchorRevision_++;
    this.wake?.();
  }

  /**
   * This view's camera re-expressed in `anchor`'s coordinates (`undefined`:
   * the table's root), through its placement: written into `out` (a new
   * camera by default), field of view and near plane copied. With
   * `setCameraFromAnchor` the round trip is exact, to the float64 step of
   * the camera's coordinates, near the anchor; far from it, about one
   * float64 step of the placement's translation (about 60 nm at 400,000 km).
   */
  anchorCamera(anchor: AnchorHandle | undefined, out = new Camera()): Camera {
    const m = this.placementOf(anchor, "anchorCamera");
    const camera = this.camera;
    // anchor ← render space is the transpose of the rotation, and minus the
    // rotated-back translation: p' = Rᵀ (p - t).
    inverseRotate(m, camera.position, out.position, true);
    inverseRotate(m, camera.direction, out.direction, false);
    inverseRotate(m, camera.up, out.up, false);
    inverseRotate(m, camera.right, out.right, false);
    if (out !== camera) {
      out.fov = camera.fov;
      out.near = camera.near;
    }
    out.version++;
    return out;
  }

  /**
   * Sets this view's camera from a pose in `anchor`'s coordinates
   * (`undefined`: the table's root): `anchorCamera`'s inverse, with the same
   * round trip (exact near the anchor; about 60 nm far from it at 400,000
   * km).
   */
  setCameraFromAnchor(
    anchor: AnchorHandle | undefined,
    pose: CameraPose,
  ): void {
    const m = this.placementOf(anchor, "setCameraFromAnchor");
    const camera = this.camera;
    // Read the pose first: it may be the camera itself.
    const p = scratchP,
      d = scratchD,
      u = scratchU,
      r = scratchR;
    copy3(pose.position, p);
    copy3(pose.direction, d);
    copy3(pose.up, u);
    copy3(pose.right, r);
    rotate(m, p, camera.position, true);
    rotate(m, d, camera.direction, false);
    rotate(m, u, camera.up, false);
    rotate(m, r, camera.right, false);
    camera.version++;
  }

  /**
   * @internal This view's placements now, for a pick to keep (render space
   * ← anchor, copied): the table root's (key `undefined`) and each anchor
   * of its world's, `undefined` at the identity.
   */
  pickPlacements(): Map<AnchorHandle | undefined, Float64Array | undefined> {
    const out = new Map<AnchorHandle | undefined, Float64Array | undefined>();
    const copy = (m: Float64Array | undefined) => m && Float64Array.from(m);
    out.set(undefined, copy(this.placementOf(undefined, "pickPlacements")));
    for (const anchor of this.world.anchors) {
      out.set(anchor, copy(this.placementOf(anchor, "pickPlacements")));
    }
    return out;
  }

  /** An anchor's placement, or undefined at the identity. */
  private placementOf(
    anchor: AnchorHandle | FrameKey | undefined,
    caller: string,
  ): Float64Array | undefined {
    const slot = this.placementSlot(anchor, caller);
    return this.placed[slot] === 1
      ? this.placements.subarray(slot * 16, slot * 16 + 16)
      : undefined;
  }

  /**
   * An anchor's slot, checked against this view's world; 0 for none
   * (`undefined`, or the world's `root`).
   */
  private placementSlot(
    anchor: AnchorHandle | FrameKey | undefined,
    caller: string,
  ): number {
    this.syncAnchors();
    if (!anchor || anchor === this.world.root) {
      return 0;
    }
    if (
      !("slot" in anchor) ||
      this.world.anchorOf(anchor as AnchorHandle) !== anchor
    ) {
      throw new Error(
        `${caller}: ${anchor.name} is not an anchor of this view's world.`,
      );
    }
    const slot = (anchor as AnchorHandle).slot;
    if (this.placementOwners[slot] !== anchor) {
      // The slot's last placement was for a removed anchor (normally
      // forgotten already, by syncAnchors).
      this.placementOwners[slot] = anchor as AnchorHandle;
      if (this.placed[slot] === 1) {
        this.placed[slot] = 0;
        this.anchorRevision_++;
        this.wake?.();
      }
    }
    return slot;
  }

  /**
   * Forgets placements of anchors the world removed (or of another world's
   * anchors, after `world` was set), counting it in `anchorRevision`.
   */
  private syncAnchors(): void {
    const world = this.world;
    const removals = world.anchorRemovals;
    if (world === this.anchorsWorld && removals === this.anchorsRemovals) {
      return;
    }
    const first = this.anchorsWorld === undefined;
    this.anchorsWorld = world;
    this.anchorsRemovals = removals;
    for (let slot = 1; slot < MAX_ANCHORS; slot++) {
      const owner = this.placementOwners[slot];
      if (owner && world.anchorOf(owner) !== owner) {
        this.placementOwners[slot] = undefined;
        this.placed[slot] = 0;
      }
    }
    if (!first) {
      this.anchorRevision_++;
      this.wake?.();
    }
  }

  /**
   * Viewport in target pixels. The returned object is reused: it is current
   * until the next call.
   */
  pixelRect(): Readonly<PixelRect> {
    const { width: targetWidth, height: targetHeight } = this.target;
    // At least a pixel, inside the target: a canvas squeezed to 0 width is 1
    // across, where a viewport off its middle rounded to no size at all (a
    // texture without size, and every frame rejected).
    const x = Math.max(
      Math.min(Math.round(this.viewport.x * targetWidth), targetWidth - 1),
      0,
    );
    const y = Math.max(
      Math.min(Math.round(this.viewport.y * targetHeight), targetHeight - 1),
      0,
    );
    const rect = this.rect;
    rect.x = x;
    rect.y = y;
    rect.width = Math.max(
      Math.min(Math.round(this.viewport.width * targetWidth), targetWidth - x),
      1,
    );
    rect.height = Math.max(
      Math.min(
        Math.round(this.viewport.height * targetHeight),
        targetHeight - y,
      ),
      1,
    );
    return rect;
  }

  get aspect(): number {
    const rect = this.pixelRect();
    return rect.width / rect.height;
  }

  /**
   * Where a position in `anchor`'s coordinates shows in this view with its
   * current camera: CSS pixels from the view's top-left (as `pickDesign`
   * takes them), or undefined when the position is behind the camera or
   * nearer than its near plane (not drawn). Off-screen positions in front
   * of it give pixels outside the view.
   *
   * Without `anchor`, the view's body anchor (`bodyAnchor`: Earth-fixed
   * for the Earth), or the world's `root` while the world has none.
   * `world.root` is the transform table's root: render space while its
   * placement (`setAnchorPlacement(undefined, …)`) is the identity. An
   * explicit `undefined` is refused, so it can't be read as either.
   */
  toPixel(
    position: ArrayLike<number>,
    ...anchor: [] | [anchor: AnchorHandle | World["root"]]
  ): Float64Array | undefined {
    if (anchor.length > 0 && anchor[0] === undefined) {
      throw new Error(
        "toPixel: the anchor is undefined; pass world.root for the transform table's root, or omit it for the body anchor.",
      );
    }
    const m = this.placementOf(
      anchor.length > 0 ? anchor[0] : (this.bodyAnchor ?? this.world.root),
      "toPixel",
    );
    if (m) {
      const p = new Float64Array(3);
      rotate(m, position, p, true);
      position = p;
    }
    const rect = this.pixelRect();
    const ratio =
      this.target instanceof CanvasTarget ? this.target.pixelRatio : 1;
    const out = new Float64Array(2);
    const depth = projectToPixel(
      this.camera,
      this.camera.fovy(rect.width / rect.height),
      rect.width / ratio,
      rect.height / ratio,
      position,
      out,
    );
    return depth >= this.camera.near && depth > 0 ? out : undefined;
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
   *
   * What a pick sees through, here and in `pickPosition` and `pickPoint`:
   * blended surfaces (glass, ghosts) are not picked; what lies behind them
   * is. Terrain drawn below full opacity by a region is the exception
   * (`Globe.terrain.addRegion`): where it is ground, picks stop at it as
   * at opaque terrain, unless the region has `pickThrough`, when they go
   * on to what shows through it (a tunnel under the ground).
   */
  pick(x: number, y: number): Promise<PickResult | undefined> {
    return new Promise((resolve) => {
      this.pendingPicks.push({ x, y, resolve });
      this.wake?.();
    });
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
   * (float64, from the depth buffer): the body anchor's coordinates
   * (`bodyAnchor`), whatever the render root. Undefined over the sky.
   * Resolves a few frames later, with the camera of the frame it was read
   * in. Translucent terrain stops it unless made with `pickThrough`
   * (`pick`).
   */
  pickPosition(x: number, y: number): Promise<Float64Array | undefined> {
    return new Promise((resolvePosition) => {
      this.pendingPicks.push({ x, y, resolvePosition });
      this.wake?.();
    });
  }

  /**
   * What is drawn under a pixel of this view (pixels relative to its
   * top-left, as `pick`): the position in render space (the rig's position
   * reference frame) and in the hit draw's anchor, the draw and the
   * feature, with the camera, the render root and the scene time. All of it
   * is from the tick whose image was read, however many ticks later it
   * resolves; only the draw and the feature are looked up when the
   * readback maps. Undefined over the sky. A pick interpreter turns it into
   * a point tagged with its reference frame (`createFramesPickInterpreter`).
   * Translucent terrain stops it unless made with `pickThrough` (`pick`).
   */
  pickPoint(x: number, y: number): Promise<CorePick | undefined> {
    return new Promise((resolvePoint) => {
      this.pendingPicks.push({ x, y, resolvePoint });
      this.wake?.();
    });
  }
}
