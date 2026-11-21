// Named synthetic devices, as the facts the engine would record for them.
// test/fakeGpu.ts stands up the same devices as a fake `navigator.gpu`;
// test/profilePersonas.test.ts checks that the two agree. Fact sets are per
// renderer: the WebGL 2 personas (`webgl2Personas`) are Webgl2Facts, under
// WebGL's own names.
import type { DeviceFacts } from "../gpu/GpuDevice.ts";
import { PROBED_FRAMEBUFFERS, type Webgl2Facts } from "./webgl2Facts.ts";

const ALL_FEATURES = [
  "clip-distances",
  "core-features-and-limits",
  "dual-source-blending",
  "float32-blendable",
  "float32-filterable",
  "indirect-first-instance",
  "shader-f16",
  "subgroups",
  "texture-compression-astc",
  "texture-compression-bc",
  "texture-compression-etc2",
  "timestamp-query",
] as const satisfies readonly GPUFeatureName[];

const without = (...names: GPUFeatureName[]): GPUFeatureName[] =>
  ALL_FEATURES.filter((f) => !names.includes(f));

const fake = { vendor: "fake", architecture: "fake", isFallbackAdapter: false };

export const personas = {
  "m2-chrome": {
    renderer: "webgpu",
    features: without(
      "texture-compression-bc",
      "clip-distances",
      "dual-source-blending",
    ),
    limitsTier: "base",
    adapter: {
      vendor: "apple",
      architecture: "metal-3",
      isFallbackAdapter: false,
    },
    probes: { storageWritesRunPerSample: true },
    canvasFormat: "bgra8unorm",
  },
  "intel-uhd-4k": {
    renderer: "webgpu",
    features: without("texture-compression-astc", "texture-compression-etc2"),
    limitsTier: "base",
    adapter: {
      vendor: "intel",
      architecture: "gen-12lp",
      isFallbackAdapter: false,
    },
    probes: { storageWritesRunPerSample: false },
    canvasFormat: "bgra8unorm",
  },
  swiftshader: {
    renderer: "webgpu",
    features: without("timestamp-query", "subgroups", "shader-f16"),
    limitsTier: "base",
    adapter: {
      vendor: "google",
      architecture: "swiftshader",
      isFallbackAdapter: true,
    },
    probes: { storageWritesRunPerSample: false },
    canvasFormat: "rgba8unorm",
  },
  "minimum-limits": {
    renderer: "webgpu",
    features: [...ALL_FEATURES],
    limitsTier: "minimum",
    adapter: fake,
    probes: { storageWritesRunPerSample: "unknown" },
    canvasFormat: "bgra8unorm",
  },
  "no-optional-features": {
    renderer: "webgpu",
    features: [],
    limitsTier: "base",
    adapter: fake,
    probes: { storageWritesRunPerSample: "unknown" },
    canvasFormat: "bgra8unorm",
  },
  "no-float32-blendable": {
    renderer: "webgpu",
    features: without("float32-blendable"),
    limitsTier: "base",
    adapter: fake,
    probes: { storageWritesRunPerSample: "unknown" },
    canvasFormat: "bgra8unorm",
  },
} as const satisfies Record<string, DeviceFacts>;

export type PersonaName = keyof typeof personas;

const framebuffersComplete = PROBED_FRAMEBUFFERS.map((name) => ({
  name,
  complete: true,
  status: "FRAMEBUFFER_COMPLETE",
}));

/**
 * WebGL 2 personas: the facts the probe would record for them, under WebGL's
 * own names. `webgl2-basic` is the floor and nothing more: WebGL 2's
 * minimums that the floor names, `EXT_color_buffer_float`, no clip control and
 * no multi-draw. `webgl2-chrome` has both and what a desktop Chrome lists.
 * The personas the browsers without WebGPU need (Firefox, Apple mobile,
 * Android) are written once the probe has measured real devices.
 */
export const webgl2Personas = {
  "webgl2-basic": {
    renderer: "webgl2",
    version: "WebGL 2.0 (OpenGL ES 3.0, persona)",
    shadingLanguage: "WebGL GLSL ES 3.00 (persona)",
    vendor: "fake",
    glRenderer: "fake",
    unmasked: undefined,
    angleBackend: undefined,
    software: false,
    failIfMajorPerformanceCaveat: "unknown",
    limits: {
      maxTextureSize: 4096,
      maxArrayTextureLayers: 256,
      max3dTextureSize: 256,
      maxUniformBlockSize: 16384,
      maxVertexTextureImageUnits: 16,
      maxSamples: 4,
      maxDrawBuffers: 4,
    },
    extensions: ["EXT_color_buffer_float"],
    framebuffers: framebuffersComplete,
  },
  "webgl2-chrome": {
    renderer: "webgl2",
    version: "WebGL 2.0 (OpenGL ES 3.0 Chromium, persona)",
    shadingLanguage: "WebGL GLSL ES 3.00 (persona)",
    vendor: "WebKit",
    glRenderer: "WebKit WebGL",
    unmasked: {
      vendor: "Google Inc. (Apple)",
      renderer:
        "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)",
    },
    angleBackend: "metal",
    software: false,
    failIfMajorPerformanceCaveat: "accepted",
    limits: {
      maxTextureSize: 16384,
      maxArrayTextureLayers: 2048,
      max3dTextureSize: 2048,
      maxUniformBlockSize: 65536,
      maxVertexTextureImageUnits: 16,
      maxSamples: 4,
      maxDrawBuffers: 8,
    },
    extensions: [
      "EXT_clip_control",
      "EXT_color_buffer_float",
      "EXT_disjoint_timer_query_webgl2",
      "EXT_float_blend",
      "OES_texture_float_linear",
      "WEBGL_compressed_texture_astc",
      "WEBGL_compressed_texture_etc",
      "WEBGL_multi_draw",
    ],
    framebuffers: framebuffersComplete,
  },
} as const satisfies Record<string, Webgl2Facts>;

export type Webgl2PersonaName = keyof typeof webgl2Personas;
