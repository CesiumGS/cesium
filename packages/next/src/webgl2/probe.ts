// The WebGL 2 probe (docs/superpowers/plans/2026-11-13-webgl2-renderer.md,
// section 6, and CS-43's additions): a throwaway context on an
// `OffscreenCanvas`, so it runs where the engine will, on the page or in a
// worker. It reads the facts under WebGL's names, builds the renderer's
// framebuffers for real and checks that they are complete, and records what
// the unmasked renderer says: the ANGLE backend, a software-renderer flag,
// and what a context made with `failIfMajorPerformanceCaveat` did. The real
// canvas's context is taken only after the probe succeeds (a canvas holds one
// context type, and `transferControlToOffscreen()` can't be undone).
import { type Webgl2Probe, cachedProbe } from "../scene/deviceChoice.ts";
import {
  belowFloor,
  PROBED_FRAMEBUFFERS,
  REQUIRED_EXTENSIONS,
  type FramebufferCheck,
  type ProbedFramebuffer,
  type Webgl2Facts,
} from "../profile/webgl2Facts.ts";

/** A context, and a way to ask for another one (the probe asks up to twice). */
export type ContextMaker = (
  attributes: WebGLContextAttributes,
) => WebGL2RenderingContext | null;

/** A throwaway canvas: an `OffscreenCanvas`, else (on the page only) a canvas element. */
const makeContext: ContextMaker = (attributes) => {
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(1, 1)
      : typeof document !== "undefined"
        ? document.createElement("canvas")
        : undefined;
  return (canvas?.getContext("webgl2", attributes) ??
    null) as WebGL2RenderingContext | null;
};

/** Renderers that are software: SwiftShader, llvmpipe and softpipe (Mesa), WARP and the Basic Render Driver (Windows). */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|warp|basic render/i;

/**
 * The ANGLE backend an unmasked renderer string names ("ANGLE (Apple, ANGLE
 * Metal Renderer: Apple M2, Unspecified Version)": metal), or undefined for
 * a renderer that isn't ANGLE's.
 */
export function angleBackend(renderer: string): string | undefined {
  if (!/angle/i.test(renderer)) {
    return undefined;
  }
  const backends: readonly [RegExp, string][] = [
    [/metal/i, "metal"],
    [/d3d11|direct3d11/i, "d3d11"],
    [/d3d9|direct3d9/i, "d3d9"],
    [/vulkan/i, "vulkan"],
    [/opengl/i, "opengl"],
  ];
  return backends.find(([pattern]) => pattern.test(renderer))?.[1];
}

/** `getParameter` as text: a browser may hand back null for a blocked string. */
const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

/** `getParameter` as a count: 0 where the context can't say (which fails the floor). */
const count = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/** The name of a framebuffer status, for messages. */
function statusName(gl: WebGL2RenderingContext, status: number): string {
  const names: [number, string][] = [
    [gl.FRAMEBUFFER_COMPLETE, "FRAMEBUFFER_COMPLETE"],
    [gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT, "FRAMEBUFFER_INCOMPLETE_ATTACHMENT"],
    [
      gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT,
      "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT",
    ],
    [gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS, "FRAMEBUFFER_INCOMPLETE_DIMENSIONS"],
    [gl.FRAMEBUFFER_UNSUPPORTED, "FRAMEBUFFER_UNSUPPORTED"],
    [
      gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE,
      "FRAMEBUFFER_INCOMPLETE_MULTISAMPLE",
    ],
  ];
  return (
    names.find(([value]) => value === status)?.[1] ??
    `status 0x${status.toString(16)}`
  );
}

/** The samples of the multisampled targets (the WebGL 2 plan's "MSAA"). */
const MSAA_SAMPLES = 4;
/** The probe's framebuffers are a few pixels: only completeness is asked. */
const SIZE = 4;

/**
 * Builds the framebuffer `name` for real (the formats the renderer will use, in the
 * WebGL 2 plan) and checks its status, then deletes what it made.
 */
function checkFramebuffer(
  gl: WebGL2RenderingContext,
  name: ProbedFramebuffer,
): FramebufferCheck {
  const framebuffer = gl.createFramebuffer();
  const textures: WebGLTexture[] = [];
  const renderbuffers: WebGLRenderbuffer[] = [];
  const texture = (format: number) => {
    const t = gl.createTexture();
    textures.push(t);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, format, SIZE, SIZE);
    return t;
  };
  const renderbuffer = (format: number, samples: number) => {
    const r = gl.createRenderbuffer();
    renderbuffers.push(r);
    gl.bindRenderbuffer(gl.RENDERBUFFER, r);
    gl.renderbufferStorageMultisample(
      gl.RENDERBUFFER,
      samples,
      format,
      SIZE,
      SIZE,
    );
    return r;
  };
  try {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const colorTexture = (format: number) =>
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture(format),
        0,
      );
    const colorRenderbuffer = (format: number, samples: number) =>
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.RENDERBUFFER,
        renderbuffer(format, samples),
      );
    const depth = (samples: number) =>
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        renderbuffer(gl.DEPTH_COMPONENT32F, samples),
      );
    switch (name) {
      case "hdr":
        // The resolved scene color and its depth (a float depth buffer: reversed-z).
        colorTexture(gl.RGBA16F);
        depth(0);
        break;
      case "hdr-multisampled":
        colorRenderbuffer(gl.RGBA16F, MSAA_SAMPLES);
        depth(MSAA_SAMPLES);
        break;
      case "display":
        colorTexture(gl.SRGB8_ALPHA8);
        break;
      case "ids":
        // A 32-bit ID in two 16-bit halves, single-sampled (integer formats can't be multisampled).
        colorTexture(gl.RG16UI);
        break;
    }
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    const error = gl.getError();
    if (status === gl.FRAMEBUFFER_COMPLETE && error === gl.NO_ERROR) {
      return { name, complete: true, status: "FRAMEBUFFER_COMPLETE" };
    }
    return {
      name,
      complete: false,
      status:
        status === gl.FRAMEBUFFER_COMPLETE
          ? `GL error 0x${error.toString(16)}`
          : statusName(gl, status),
    };
  } catch (error) {
    return {
      name,
      complete: false,
      status: `threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);
    textures.forEach((t) => gl.deleteTexture(t));
    renderbuffers.forEach((r) => gl.deleteRenderbuffer(r));
    gl.getError(); // what a failed build left is not the next probe's
  }
}

/**
 * The facts of a context: its strings, limits and extensions, and its
 * framebuffers built and checked. The required extensions are asked for
 * first (a float color format is renderable only once its extension was).
 */
export function readFacts(
  gl: WebGL2RenderingContext,
  caveat: Webgl2Facts["failIfMajorPerformanceCaveat"],
): Webgl2Facts {
  const extensions = [...(gl.getSupportedExtensions() ?? [])].sort();
  for (const name of Object.keys(REQUIRED_EXTENSIONS)) {
    if (extensions.includes(name)) {
      gl.getExtension(name);
    }
  }
  const info = extensions.includes("WEBGL_debug_renderer_info")
    ? (gl.getExtension("WEBGL_debug_renderer_info") as {
        UNMASKED_VENDOR_WEBGL: number;
        UNMASKED_RENDERER_WEBGL: number;
      } | null)
    : null;
  const unmasked = info
    ? {
        vendor: text(gl.getParameter(info.UNMASKED_VENDOR_WEBGL)),
        renderer: text(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)),
      }
    : undefined;
  const vendor = text(gl.getParameter(gl.VENDOR));
  const glRenderer = text(gl.getParameter(gl.RENDERER));
  const named = unmasked?.renderer ?? glRenderer;
  return {
    renderer: "webgl2",
    version: text(gl.getParameter(gl.VERSION)),
    shadingLanguage: text(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
    vendor,
    glRenderer,
    unmasked,
    angleBackend: angleBackend(named),
    software: SOFTWARE.test(named),
    failIfMajorPerformanceCaveat: caveat,
    limits: {
      maxTextureSize: count(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
      maxArrayTextureLayers: count(
        gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS),
      ),
      max3dTextureSize: count(gl.getParameter(gl.MAX_3D_TEXTURE_SIZE)),
      maxUniformBlockSize: count(gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE)),
      maxVertexTextureImageUnits: count(
        gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      ),
      maxSamples: count(gl.getParameter(gl.MAX_SAMPLES)),
      maxDrawBuffers: count(gl.getParameter(gl.MAX_DRAW_BUFFERS)),
    },
    extensions,
    framebuffers: PROBED_FRAMEBUFFERS.map((name) => checkFramebuffer(gl, name)),
  };
}

/**
 * Runs the probe: first with `failIfMajorPerformanceCaveat` (a refusal is
 * recorded, and the context is asked for again without it, since a software
 * renderer runs and is reported, never refused), then reads the facts and
 * measures them against the floor. The throwaway context is released.
 */
export async function runProbe(make: ContextMaker): Promise<Webgl2Probe> {
  let caveat: Webgl2Facts["failIfMajorPerformanceCaveat"] = "accepted";
  let gl = make({ failIfMajorPerformanceCaveat: true });
  if (!gl) {
    caveat = "refused";
    gl = make({});
  }
  if (!gl) {
    return { ok: false, missing: ["a WebGL 2 context"] };
  }
  try {
    const facts = readFacts(gl, caveat);
    const missing = belowFloor(facts);
    return missing.length === 0
      ? { ok: true, facts }
      : { ok: false, missing, facts };
  } finally {
    // Free the context's memory now, not when the collector gets to it.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

/** The probe for this page or worker, run once (cached per user agent). */
export function probeWebgl2(
  make: ContextMaker = makeContext,
): Promise<Webgl2Probe> {
  return cachedProbe("webgl2", () => runProbe(make));
}
