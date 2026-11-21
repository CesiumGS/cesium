// What the probe observes about a WebGL 2 context, under WebGL's own names
// (docs/superpowers/plans/2026-11-13-engine-profiles.md, section 2: facts are
// per renderer and never mapped onto WebGPU's), and the floor a context has
// to meet to run the renderer
// (docs/superpowers/plans/2026-11-13-webgl2-renderer.md, section 9, review
// answer 4). Plain data and pure functions: nothing here touches a GL
// context, so it runs in Node tests and on either thread.

/** The limits the renderer reads, as `gl.getParameter` reports them. */
export interface Webgl2Limits {
  /** `MAX_TEXTURE_SIZE`. */
  maxTextureSize: number;
  /** `MAX_ARRAY_TEXTURE_LAYERS` (imagery slices: 256 on some Android). */
  maxArrayTextureLayers: number;
  /** `MAX_3D_TEXTURE_SIZE`. */
  max3dTextureSize: number;
  /** `MAX_UNIFORM_BLOCK_SIZE`, bytes. */
  maxUniformBlockSize: number;
  /** `MAX_VERTEX_TEXTURE_IMAGE_UNITS` (the data textures a vertex stage reads). */
  maxVertexTextureImageUnits: number;
  /** `MAX_SAMPLES` (MSAA renderbuffers). */
  maxSamples: number;
  /** `MAX_DRAW_BUFFERS`. */
  maxDrawBuffers: number;
}

/** One framebuffer the renderer will build, built for real and checked. */
export interface FramebufferCheck {
  /** What it is for (`PROBED_FRAMEBUFFERS`). */
  name: string;
  /** `checkFramebufferStatus` was `FRAMEBUFFER_COMPLETE`. */
  complete: boolean;
  /** The status's name, or why it couldn't be made. */
  status: string;
}

/**
 * The framebuffers the renderer builds (the WebGL 2 plan's "MSAA" and "Outputs
 * and post stages"): the probe makes each at a few pixels and checks it is complete, so a
 * context that lists `EXT_color_buffer_float` but can't render to the
 * formats is found out here, not at the first frame.
 */
export const PROBED_FRAMEBUFFERS = [
  "hdr",
  "hdr-multisampled",
  "display",
  "ids",
] as const;

export type ProbedFramebuffer = (typeof PROBED_FRAMEBUFFERS)[number];

export interface Webgl2Facts {
  renderer: "webgl2";
  /** `gl.VERSION`, e.g. "WebGL 2.0 (OpenGL ES 3.0 Chromium)". */
  version: string;
  /** `gl.SHADING_LANGUAGE_VERSION`. */
  shadingLanguage: string;
  /** `gl.VENDOR` and `gl.RENDERER`: what the browser says, which it may mask. */
  vendor: string;
  glRenderer: string;
  /**
   * `WEBGL_debug_renderer_info`'s strings, where the browser allows them
   * (undefined where it doesn't).
   */
  unmasked: { vendor: string; renderer: string } | undefined;
  /** The ANGLE backend named in the unmasked renderer ("metal", "d3d11", "vulkan", "opengl"). */
  angleBackend: string | undefined;
  /** The context is drawn by a software renderer (SwiftShader, llvmpipe, WARP). Run and reported, never refused. */
  software: boolean;
  /**
   * What a context made with `failIfMajorPerformanceCaveat: true` did:
   * "refused" (the browser sees a major caveat), "accepted", or "unknown"
   * (not asked, as on an emulated persona).
   */
  failIfMajorPerformanceCaveat: "accepted" | "refused" | "unknown";
  limits: Webgl2Limits;
  /** Every extension the context lists, sorted. */
  extensions: readonly string[];
  framebuffers: readonly FramebufferCheck[];
  /** The persona this device was clamped toward (`emulate`), if any. */
  emulating?: string;
}

/** The least a context may have (review answer 4). The extension list adds `REQUIRED_EXTENSIONS`. */
export const WEBGL2_FLOOR: Readonly<Omit<Webgl2Limits, "max3dTextureSize">> = {
  maxTextureSize: 4096,
  maxArrayTextureLayers: 256,
  maxUniformBlockSize: 16384,
  maxVertexTextureImageUnits: 16,
  maxSamples: 4,
  maxDrawBuffers: 4,
};

/** The extensions without which there is no renderer, with what each is for. */
export const REQUIRED_EXTENSIONS = {
  EXT_color_buffer_float: "float and half-float render targets (HDR color)",
} as const;

/** The GL names of the limits, for messages. */
export const LIMIT_NAMES: Readonly<Record<keyof Webgl2Limits, string>> = {
  maxTextureSize: "MAX_TEXTURE_SIZE",
  maxArrayTextureLayers: "MAX_ARRAY_TEXTURE_LAYERS",
  max3dTextureSize: "MAX_3D_TEXTURE_SIZE",
  maxUniformBlockSize: "MAX_UNIFORM_BLOCK_SIZE",
  maxVertexTextureImageUnits: "MAX_VERTEX_TEXTURE_IMAGE_UNITS",
  maxSamples: "MAX_SAMPLES",
  maxDrawBuffers: "MAX_DRAW_BUFFERS",
};

/**
 * What the facts lack of the floor, one message each, naming the item: an
 * extension, a limit (with its value and the least), a framebuffer that
 * isn't complete. Empty when the context can run the renderer. A software
 * renderer that meets the floor is not refused.
 */
export function belowFloor(facts: Webgl2Facts): string[] {
  const missing: string[] = [];
  for (const [name, why] of Object.entries(REQUIRED_EXTENSIONS)) {
    if (!facts.extensions.includes(name)) {
      missing.push(`the extension ${name} (${why})`);
    }
  }
  for (const key of Object.keys(
    WEBGL2_FLOOR,
  ) as (keyof typeof WEBGL2_FLOOR)[]) {
    if (facts.limits[key] < WEBGL2_FLOOR[key]) {
      missing.push(
        `${LIMIT_NAMES[key]} is ${facts.limits[key]}, and at least ${WEBGL2_FLOOR[key]} is needed`,
      );
    }
  }
  for (const name of PROBED_FRAMEBUFFERS) {
    const check = facts.framebuffers.find((f) => f.name === name);
    if (!check) {
      missing.push(`the ${name} framebuffer was not checked`);
    } else if (!check.complete) {
      missing.push(`the ${name} framebuffer is incomplete (${check.status})`);
    }
  }
  return missing;
}

/**
 * Facts clamped toward a persona (`Engine.create({ emulate })`): what the
 * persona lacks is hidden, and nothing is added. Limits are the lesser of
 * the two, extensions the ones both have, a framebuffer complete only if
 * both are. The software flag and the unmasked names stay the device's.
 */
export function clampWebgl2Facts(
  real: Webgl2Facts,
  persona: Webgl2Facts,
  name: string,
): Webgl2Facts {
  const limits = { ...real.limits };
  for (const key of Object.keys(limits) as (keyof Webgl2Limits)[]) {
    limits[key] = Math.min(real.limits[key], persona.limits[key]);
  }
  return {
    ...real,
    limits,
    extensions: real.extensions.filter((e) => persona.extensions.includes(e)),
    framebuffers: real.framebuffers.map((f) => {
      const other = persona.framebuffers.find((p) => p.name === f.name);
      return other && !other.complete ? { ...other } : f;
    }),
    emulating: name,
  };
}
