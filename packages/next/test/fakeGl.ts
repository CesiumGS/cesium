// A WebGL 2 stand-in for Node (docs/superpowers/plans/2026-11-13-webgl2-renderer.md,
// section 7), beside test/fakeGpu.ts: it records calls and state and draws
// nothing. It follows the rules the probe depends on: a float color format is
// renderable only after `EXT_color_buffer_float` was asked for with
// `getExtension`, samples above `MAX_SAMPLES` are refused, and a context made
// with `failIfMajorPerformanceCaveat` can be refused. A persona's facts stand
// it up (`fakeGlFor`).
import {
  webgl2Personas,
  type Webgl2PersonaName,
} from "../src/profile/personas.ts";
import type { Webgl2Facts } from "../src/profile/webgl2Facts.ts";

export const GL = {
  VENDOR: 0x1f00,
  RENDERER: 0x1f01,
  VERSION: 0x1f02,
  SHADING_LANGUAGE_VERSION: 0x8b8c,
  MAX_TEXTURE_SIZE: 0x0d33,
  MAX_3D_TEXTURE_SIZE: 0x8073,
  MAX_ARRAY_TEXTURE_LAYERS: 0x88ff,
  MAX_UNIFORM_BLOCK_SIZE: 0x8a30,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
  MAX_SAMPLES: 0x8d57,
  MAX_DRAW_BUFFERS: 0x8824,
  FRAMEBUFFER: 0x8d40,
  RENDERBUFFER: 0x8d41,
  TEXTURE_2D: 0x0de1,
  COLOR_ATTACHMENT0: 0x8ce0,
  DEPTH_ATTACHMENT: 0x8d00,
  FRAMEBUFFER_COMPLETE: 0x8cd5,
  FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 0x8cd6,
  FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 0x8cd7,
  FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 0x8cd9,
  FRAMEBUFFER_UNSUPPORTED: 0x8cdd,
  FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: 0x8d56,
  RGBA8: 0x8058,
  RGBA16F: 0x881a,
  SRGB8_ALPHA8: 0x8c43,
  RG16UI: 0x823a,
  DEPTH_COMPONENT32F: 0x8cac,
  COLOR_BUFFER_BIT: 0x4000,
  DEPTH_BUFFER_BIT: 0x100,
  SCISSOR_TEST: 0x0c11,
  NO_ERROR: 0,
  INVALID_ENUM: 0x0500,
  INVALID_VALUE: 0x0501,
  INVALID_OPERATION: 0x0502,
  CONTEXT_LOST_WEBGL: 0x9242,
} as const;

/** Formats that are only renderable with EXT_color_buffer_float. */
const FLOAT_COLOR = new Set<number>([GL.RGBA16F]);

export interface FakeGlOptions {
  /** `getSupportedExtensions()`. */
  extensions?: readonly string[];
  /** Limits by their GL names' camel-case keys (`maxSamples`). */
  limits?: Partial<Record<keyof Webgl2Facts["limits"], number>>;
  version?: string;
  vendor?: string;
  renderer?: string;
  /** What `WEBGL_debug_renderer_info` reports; undefined: the extension is blocked. */
  unmasked?: { vendor: string; renderer: string };
  /** Internal formats a framebuffer can't be completed with. */
  incompleteFormats?: readonly number[];
  /** A context made with `failIfMajorPerformanceCaveat: true` is refused (null). */
  refusesCaveat?: boolean;
  /** `getContext("webgl2")` returns null, as on a browser without WebGL 2. */
  noWebgl2?: boolean;
}

/** One recorded call: its name and arguments. */
export interface GlCall {
  name: string;
  args: unknown[];
}

let nextObject = 1;
const make = (kind: string) => ({ kind, id: nextObject++ });

interface Storage {
  format: number;
  samples: number;
}

/** What `fakeGl` returns: the context, and what happened to it. */
export class FakeGl {
  readonly calls: GlCall[] = [];
  readonly enabled = new Set<string>();
  readonly attributes: unknown;
  lost = false;
  private readonly bound = new Map<number, object | null>();
  private readonly attached = new Map<object, Storage[]>();
  private readonly storage = new Map<object, Storage>();
  private readonly extensionsOn = new Set<string>();
  private error: number = GL.NO_ERROR;
  private readonly limits: Webgl2Facts["limits"];

  constructor(
    private readonly options: FakeGlOptions,
    attributes: unknown,
  ) {
    this.attributes = attributes;
    this.limits = {
      ...webgl2Personas["webgl2-basic"].limits,
      ...options.limits,
    };
  }

  // The constants.
  readonly VENDOR = GL.VENDOR;
  readonly RENDERER = GL.RENDERER;
  readonly VERSION = GL.VERSION;
  readonly SHADING_LANGUAGE_VERSION = GL.SHADING_LANGUAGE_VERSION;
  readonly MAX_TEXTURE_SIZE = GL.MAX_TEXTURE_SIZE;
  readonly MAX_3D_TEXTURE_SIZE = GL.MAX_3D_TEXTURE_SIZE;
  readonly MAX_ARRAY_TEXTURE_LAYERS = GL.MAX_ARRAY_TEXTURE_LAYERS;
  readonly MAX_UNIFORM_BLOCK_SIZE = GL.MAX_UNIFORM_BLOCK_SIZE;
  readonly MAX_VERTEX_TEXTURE_IMAGE_UNITS = GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS;
  readonly MAX_SAMPLES = GL.MAX_SAMPLES;
  readonly MAX_DRAW_BUFFERS = GL.MAX_DRAW_BUFFERS;
  readonly FRAMEBUFFER = GL.FRAMEBUFFER;
  readonly RENDERBUFFER = GL.RENDERBUFFER;
  readonly TEXTURE_2D = GL.TEXTURE_2D;
  readonly COLOR_ATTACHMENT0 = GL.COLOR_ATTACHMENT0;
  readonly DEPTH_ATTACHMENT = GL.DEPTH_ATTACHMENT;
  readonly FRAMEBUFFER_COMPLETE = GL.FRAMEBUFFER_COMPLETE;
  readonly FRAMEBUFFER_INCOMPLETE_ATTACHMENT =
    GL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
  readonly FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT =
    GL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT;
  readonly FRAMEBUFFER_INCOMPLETE_DIMENSIONS =
    GL.FRAMEBUFFER_INCOMPLETE_DIMENSIONS;
  readonly FRAMEBUFFER_UNSUPPORTED = GL.FRAMEBUFFER_UNSUPPORTED;
  readonly FRAMEBUFFER_INCOMPLETE_MULTISAMPLE =
    GL.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE;
  readonly RGBA8 = GL.RGBA8;
  readonly RGBA16F = GL.RGBA16F;
  readonly SRGB8_ALPHA8 = GL.SRGB8_ALPHA8;
  readonly RG16UI = GL.RG16UI;
  readonly DEPTH_COMPONENT32F = GL.DEPTH_COMPONENT32F;
  readonly COLOR_BUFFER_BIT = GL.COLOR_BUFFER_BIT;
  readonly DEPTH_BUFFER_BIT = GL.DEPTH_BUFFER_BIT;
  readonly SCISSOR_TEST = GL.SCISSOR_TEST;
  readonly NO_ERROR = GL.NO_ERROR;

  private record(name: string, ...args: unknown[]): void {
    this.calls.push({ name, args });
  }

  /** The calls named `name`, in order. */
  called(name: string): GlCall[] {
    return this.calls.filter((c) => c.name === name);
  }

  getSupportedExtensions(): string[] {
    const list = [...(this.options.extensions ?? []), "WEBGL_lose_context"];
    if (this.options.unmasked) {
      list.push("WEBGL_debug_renderer_info");
    }
    return list;
  }

  getExtension(name: string): object | null {
    this.record("getExtension", name);
    if (!this.getSupportedExtensions().includes(name)) {
      return null;
    }
    this.extensionsOn.add(name);
    if (name === "WEBGL_debug_renderer_info") {
      return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
    }
    if (name === "WEBGL_lose_context") {
      return { loseContext: () => (this.lost = true) };
    }
    return {};
  }

  getParameter(pname: number): unknown {
    switch (pname) {
      case GL.VERSION:
        return this.options.version ?? "WebGL 2.0 (fake)";
      case GL.SHADING_LANGUAGE_VERSION:
        return "WebGL GLSL ES 3.00 (fake)";
      case GL.VENDOR:
        return this.options.vendor ?? "WebKit";
      case GL.RENDERER:
        return this.options.renderer ?? "WebKit WebGL";
      case 0x9245:
        return this.options.unmasked?.vendor;
      case 0x9246:
        return this.options.unmasked?.renderer;
      case GL.MAX_TEXTURE_SIZE:
        return this.limits.maxTextureSize;
      case GL.MAX_3D_TEXTURE_SIZE:
        return this.limits.max3dTextureSize;
      case GL.MAX_ARRAY_TEXTURE_LAYERS:
        return this.limits.maxArrayTextureLayers;
      case GL.MAX_UNIFORM_BLOCK_SIZE:
        return this.limits.maxUniformBlockSize;
      case GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS:
        return this.limits.maxVertexTextureImageUnits;
      case GL.MAX_SAMPLES:
        return this.limits.maxSamples;
      case GL.MAX_DRAW_BUFFERS:
        return this.limits.maxDrawBuffers;
      default:
        return null;
    }
  }

  getError(): number {
    const error = this.error;
    this.error = GL.NO_ERROR;
    return error;
  }

  isContextLost(): boolean {
    return this.lost;
  }

  createFramebuffer(): object {
    return make("framebuffer");
  }
  createTexture(): object {
    return make("texture");
  }
  createRenderbuffer(): object {
    return make("renderbuffer");
  }
  deleteFramebuffer(object: object): void {
    this.record("deleteFramebuffer", object);
  }
  deleteTexture(object: object): void {
    this.record("deleteTexture", object);
  }
  deleteRenderbuffer(object: object): void {
    this.record("deleteRenderbuffer", object);
  }

  bindFramebuffer(target: number, framebuffer: object | null): void {
    this.bound.set(target, framebuffer);
    this.record("bindFramebuffer", target, framebuffer);
  }
  bindTexture(target: number, texture: object | null): void {
    this.bound.set(target, texture);
  }
  bindRenderbuffer(target: number, renderbuffer: object | null): void {
    this.bound.set(target, renderbuffer);
  }

  texStorage2D(target: number, _levels: number, format: number): void {
    const texture = this.bound.get(target);
    if (texture) {
      this.storage.set(texture, { format, samples: 0 });
    }
  }

  renderbufferStorageMultisample(
    target: number,
    samples: number,
    format: number,
  ): void {
    if (samples > this.limits.maxSamples) {
      this.error = GL.INVALID_VALUE;
      return;
    }
    const renderbuffer = this.bound.get(target);
    if (renderbuffer) {
      this.storage.set(renderbuffer, { format, samples });
    }
  }

  renderbufferStorage(target: number, format: number): void {
    this.renderbufferStorageMultisample(target, 0, format);
  }

  framebufferTexture2D(
    _target: number,
    attachment: number,
    _textarget: number,
    texture: object,
  ): void {
    this.attach(attachment, texture);
  }

  framebufferRenderbuffer(
    _target: number,
    attachment: number,
    _renderbufferTarget: number,
    renderbuffer: object,
  ): void {
    this.attach(attachment, renderbuffer);
  }

  private attach(attachment: number, object: object): void {
    const framebuffer = this.bound.get(GL.FRAMEBUFFER);
    const storage = this.storage.get(object);
    if (!framebuffer || !storage) {
      return;
    }
    const list = this.attached.get(framebuffer) ?? [];
    list.push({ ...storage, samples: storage.samples });
    void attachment;
    this.attached.set(framebuffer, list);
  }

  checkFramebufferStatus(): number {
    const framebuffer = this.bound.get(GL.FRAMEBUFFER);
    const attachments = framebuffer
      ? this.attached.get(framebuffer)
      : undefined;
    if (!attachments?.length) {
      return GL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT;
    }
    const samples = new Set(attachments.map((a) => a.samples));
    if (samples.size > 1) {
      return GL.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE;
    }
    for (const { format } of attachments) {
      if (
        this.options.incompleteFormats?.includes(format) ||
        (FLOAT_COLOR.has(format) &&
          !this.extensionsOn.has("EXT_color_buffer_float"))
      ) {
        return GL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
      }
    }
    return GL.FRAMEBUFFER_COMPLETE;
  }

  // Calls the device makes: recorded, nothing drawn.
  enable(cap: number): void {
    this.enabled.add(String(cap));
    this.record("enable", cap);
  }
  disable(cap: number): void {
    this.enabled.delete(String(cap));
    this.record("disable", cap);
  }
  viewport(x: number, y: number, width: number, height: number): void {
    this.record("viewport", x, y, width, height);
  }
  scissor(x: number, y: number, width: number, height: number): void {
    this.record("scissor", x, y, width, height);
  }
  clearColor(r: number, g: number, b: number, a: number): void {
    this.record("clearColor", r, g, b, a);
  }
  clear(mask: number): void {
    this.record("clear", mask);
  }
}

/** A canvas that hands out fake contexts (`OffscreenCanvas`, in Node). */
export class FakeOffscreenCanvas {
  /** Every context made, newest last, across canvases. */
  static readonly contexts: FakeGl[] = [];
  static options: FakeGlOptions = {};
  /** The `getContext` calls: kind and attributes. */
  static readonly requests: { kind: string; attributes: unknown }[] = [];
  private context: FakeGl | null | undefined;

  constructor(
    public width: number,
    public height: number,
  ) {}

  getContext(kind: string, attributes?: unknown): FakeGl | null {
    FakeOffscreenCanvas.requests.push({ kind, attributes });
    if (this.context !== undefined) {
      return this.context;
    }
    const options = FakeOffscreenCanvas.options;
    const caveat =
      (attributes as { failIfMajorPerformanceCaveat?: boolean } | undefined)
        ?.failIfMajorPerformanceCaveat === true;
    if (
      kind !== "webgl2" ||
      options.noWebgl2 ||
      (caveat && options.refusesCaveat)
    ) {
      // A refused request leaves the canvas free for another attempt.
      return null;
    }
    this.context = new FakeGl(options, attributes);
    FakeOffscreenCanvas.contexts.push(this.context);
    return this.context;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
}

/** The options that stand up persona `name`'s facts as a context. */
export function fakeGlFor(
  name: Webgl2PersonaName,
  extra: FakeGlOptions = {},
): FakeGlOptions {
  const persona = webgl2Personas[name];
  const { unmasked } = persona;
  return {
    extensions: persona.extensions,
    limits: persona.limits,
    version: persona.version,
    vendor: persona.vendor,
    renderer: persona.glRenderer,
    ...(unmasked && { unmasked }),
    ...extra,
  };
}

/** Makes `OffscreenCanvas` a fake whose WebGL 2 contexts follow `options`. */
export function installFakeGl(options: FakeGlOptions): void {
  FakeOffscreenCanvas.options = options;
  FakeOffscreenCanvas.contexts.length = 0;
  FakeOffscreenCanvas.requests.length = 0;
  Object.defineProperty(globalThis, "OffscreenCanvas", {
    configurable: true,
    writable: true,
    value: FakeOffscreenCanvas,
  });
}

/** Takes the fake `OffscreenCanvas` away again. */
export function uninstallFakeGl(): void {
  delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
}
