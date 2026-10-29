import { Camera } from "./Camera.ts";
import type { World } from "./World.ts";
import type { FeatureValue } from "../io/gltfTypes.ts";
import type { ViewLighting } from "../render/layout.ts";

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
}

/**
 * Renders into a canvas. An `HTMLCanvasElement` tracks its CSS size ×
 * devicePixelRatio; an `OffscreenCanvas` (e.g. inside a worker) keeps
 * whatever size its owner sets, typically from resize messages.
 */
export class CanvasTarget implements RenderTarget {
  readonly kind = "canvas";
  private context?: GPUCanvasContext;
  private configuredFor?: GPUDevice;

  constructor(readonly canvas: HTMLCanvasElement | OffscreenCanvas) {}

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  acquire(device: GPUDevice, format: GPUTextureFormat): GPUTextureView {
    const canvas = this.canvas;
    if ("clientWidth" in canvas) {
      const dpr = globalThis.devicePixelRatio ?? 1;
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
      this.context.configure({ device, format, alphaMode: "opaque" });
      this.configuredFor = device;
    }
    return this.context!.getCurrentTexture().createView();
  }
}

/** Renders into a texture that can be read back, e.g. thumbnails or tests. */
export class OffscreenTarget implements RenderTarget {
  readonly kind = "offscreen";
  private texture?: GPUTexture;
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
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
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

export interface PickResult {
  /** Global feature ID (unique within the world). */
  featureId: number;
  name: string | undefined;
  /** Feature properties from the content's property or batch table. */
  properties?: Record<string, FeatureValue>;
}

export interface ViewOptions {
  target: RenderTarget;
  world: World;
  camera?: Camera;
  viewport?: Viewport;
  exposure?: number;
  /** Linear HDR background color. */
  clearColor?: readonly [number, number, number];
  /** Output transfer function. "gamma2.2" matches CesiumJS 1.x. */
  outputEncoding?: OutputEncoding;
  lighting?: Partial<ViewLighting>;
}

export type OutputEncoding = "srgb" | "gamma2.2";

/**
 * A camera looking at a world through a rectangle of a target. Views are
 * cheap: they own no geometry, only per-view state.
 */
export class View {
  readonly camera: Camera;
  readonly target: RenderTarget;
  world: World;
  viewport: Viewport;
  exposure: number;
  clearColor: readonly [number, number, number];
  outputEncoding: OutputEncoding;
  /** Sun intensity and image-based lighting factors for this view. */
  lighting: ViewLighting;
  /** Disabled views are skipped (e.g. an offscreen view between captures). */
  enabled = true;
  readonly overlays: Overlay[] = [];
  /** @internal */
  pendingPicks: Array<{
    x: number;
    y: number;
    resolve: (r: PickResult | undefined) => void;
  }> = [];

  constructor(options: ViewOptions) {
    this.target = options.target;
    this.world = options.world;
    this.camera = options.camera ?? new Camera();
    this.viewport = options.viewport ?? { x: 0, y: 0, width: 1, height: 1 };
    this.exposure = options.exposure ?? 1;
    this.clearColor = options.clearColor ?? [0.004, 0.008, 0.02];
    this.outputEncoding = options.outputEncoding ?? "srgb";
    this.lighting = {
      sunIntensity: 2,
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
}
