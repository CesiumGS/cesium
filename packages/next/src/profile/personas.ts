// Named synthetic devices, as the facts the engine would record for them.
// test/fakeGpu.ts stands up the same devices as a fake `navigator.gpu`;
// test/profilePersonas.test.ts checks that the two agree. Fact sets are per
// renderer: a WebGL 2 persona arrives with that renderer's facts (CS-30).
import type { DeviceFacts } from "../gpu/GpuDevice.ts";

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
