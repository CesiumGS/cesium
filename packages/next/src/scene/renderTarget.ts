// What a view draws into: a canvas or an offscreen texture, and rectangles on it.

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
