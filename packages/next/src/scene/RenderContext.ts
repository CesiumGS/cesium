import { storageWritesRunPerSample } from "../gpu/sampleRateProbe.ts";
import { EngineErrors } from "../gpu/EngineErrors.ts";
import type { Capabilities } from "../gpu/GpuDevice.ts";
import { MipGenerator } from "../gpu/MipGenerator.ts";
import { Environment } from "../gpu/Environment.ts";
import {
  PROPERTY_TEXTURES,
  PROPERTY_TEXTURE_BINDING,
  VIEW_SIZE,
} from "../render/layout.ts";
import commonWgsl from "../shaders/common.wgsl?raw";
import aoWgsl from "../shaders/generated/ao.wgsl?raw";
import { SHADOW_CASCADES, SHADOW_SIZE, SHADOWS_SIZE } from "./shadows.ts";
import cullWgsl from "../shaders/generated/cull.wgsl?raw";
import pointCullWgsl from "../shaders/generated/pointCull.wgsl?raw";
import splatWgsl from "../shaders/generated/splat.wgsl?raw";
import scatterWgsl from "../shaders/generated/scatter.wgsl?raw";
import raycastWgsl from "../shaders/generated/raycast.wgsl?raw";
import opaqueWgsl from "../shaders/opaque.wgsl?raw";
import presentWgsl from "../shaders/generated/present.wgsl?raw";
import overlayWgsl from "../shaders/generated/overlay.wgsl?raw";
import pickWgsl from "../shaders/generated/pick.wgsl?raw";
import meterWgsl from "../shaders/generated/meter.wgsl?raw";
import adaptWgsl from "../shaders/generated/adapt.wgsl?raw";
import lightsWgsl from "../shaders/generated/lights.wgsl?raw";
import depthRangeWgsl from "../shaders/generated/depthRange.wgsl?raw";
import translucentWgsl from "../shaders/translucent.wgsl?raw";
import compositeWgsl from "../shaders/generated/composite.wgsl?raw";
import fxaaWgsl from "../shaders/generated/fxaa.wgsl?raw";
import { CLUSTERS_SIZE, LIGHTS_SIZE } from "./lights.ts";
import {
  DEFAULT_FRAGMENT_MAIN,
  DEFAULT_VERTEX_MAIN,
  DEFAULT_NAMED,
  withNamedVaryings,
  type CustomShader,
} from "./CustomShader.ts";
import { ShaderCache } from "./ShaderCache.ts";
import { ShaderBindings } from "./ShaderBindings.ts";
import { UNIFORM_BINDING, textureBinding } from "./uniforms.ts";

/**
 * The single render-target configuration views draw their 3D content into.
 * Render bundles are keyed on it, so every view shares one bundle per world.
 * Views differ only after the bundle runs (present, post, overlays).
 */
/**
 * The generic point cull's style (pointCull.slang): every point shown, none
 * small enough to splat.
 */
export const POINT_STYLE_DEFAULTS = `fn styleShow(i: u32, distance: f32) -> bool { return true; }
fn styleSize(i: u32, distance: f32) -> f32 { return 3.4e38; }
fn styleColor(i: u32, distance: f32) -> vec4f { return vec4f(1.0); }
fn styleShapeAt(i: u32, distance: f32, p: vec2f) -> f32 { return -1.0; }
fn styleOffset(i: u32, distance: f32) -> vec2f { return vec2f(0.0); }
`;

export const SCENE_TARGETS = {
  // r32uint cannot be multisampled in WebGPU, so 32-bit feature IDs are
  // split across the two channels of rg16uint (lo, hi).
  // The third is display-referred color (unlit: photographs), kept apart
  // from scene-referred light so it is never tonemapped; alpha is its
  // coverage. 8-bit sRGB: the precision of the images it comes from.
  colorFormats: [
    "rgba16float",
    "rg16uint",
    "rgba8unorm-srgb",
  ] as GPUTextureFormat[],
  depthFormat: "depth32float" as GPUTextureFormat,
  sampleCount: 4,
};

/**
 * One shader's pipelines for every pass that draws content: the engine's
 * (`Pipelines`), or a custom shader's (`ShaderCache`), compiled from one
 * module so its vertex stage moves geometry the same way in all of them.
 */
export interface SurfacePipelines {
  opaque: GPURenderPipeline;
  opaqueDoubleSided: GPURenderPipeline;
  /** Line-list variant (CAD edges, glTF LINES); same shaders, no culling. */
  opaqueLines: GPURenderPipeline;
  /**
   * Point sets (`World.addPointMesh`): triangles outside the depth
   * prepass, depth-tested and written as they shade, as lines are; their
   * six vertices a point would cost twice in the prepass.
   */
  opaquePoints: GPURenderPipeline;
  /**
   * Instanced triangles (`PlacementOptions.instances`), one- and double-sided:
   * outside the depth prepass too. Instances are many small copies whose
   * vertices outnumber the samples they cover, so drawing them twice
   * costs more than shading over each other saves (100,000 milk trucks:
   * 40 ms against 75).
   */
  opaqueInstanced: GPURenderPipeline;
  opaqueInstancedDoubleSided: GPURenderPipeline;
  /**
   * The sun's shadow-map casters: depth only, and double-sided; "masked"
   * for materials that cut out (a fragment stage that discards).
   */
  shadow: GPURenderPipeline;
  shadowDoubleSided: GPURenderPipeline;
  shadowMasked: GPURenderPipeline;
  shadowMaskedDoubleSided: GPURenderPipeline;
  /**
   * Height captures (Engine `addHeightCapture`): the casters' depth from
   * above without the shadows' depth bias, which would offset heights on
   * slopes.
   */
  height: GPURenderPipeline;
  heightDoubleSided: GPURenderPipeline;
  heightMasked: GPURenderPipeline;
  heightMaskedDoubleSided: GPURenderPipeline;
  /** The depth and normal prepass (ambient occlusion), and double-sided. */
  prepass: GPURenderPipeline;
  prepassDoubleSided: GPURenderPipeline;
  /**
   * The opaque pass's depth, first (`World.depthBundle`): depth only, with
   * the opaque pass's discards; masked (alpha cutoff) or not, one- or
   * double-sided. Its triangles then shade at equal depth, each pixel's
   * sample once, not every fragment drawn over it.
   */
  depth: GPURenderPipeline;
  depthDoubleSided: GPURenderPipeline;
  depthMasked: GPURenderPipeline;
  depthMaskedDoubleSided: GPURenderPipeline;
  /**
   * Translucency (translucent.wgsl), one- and double-sided: blended
   * surfaces into per-pixel lists ("exact"), or their moments, then their
   * light weighted by what shows through in front ("moments"). Bound with
   * `translucentLayout` as group 3.
   */
  translucentList: GPURenderPipeline;
  translucentListDoubleSided: GPURenderPipeline;
  translucentMoments: GPURenderPipeline;
  translucentMomentsDoubleSided: GPURenderPipeline;
  translucentColor: GPURenderPipeline;
  translucentColorDoubleSided: GPURenderPipeline;
}

/** One of a shader's pipelines (`SurfacePipelines`). */
export type SurfaceKey = keyof SurfacePipelines;

export const SURFACE_KEYS: readonly SurfaceKey[] = [
  "opaque",
  "opaqueDoubleSided",
  "opaqueLines",
  "opaquePoints",
  "opaqueInstanced",
  "opaqueInstancedDoubleSided",
  "shadow",
  "shadowDoubleSided",
  "shadowMasked",
  "shadowMaskedDoubleSided",
  "height",
  "heightDoubleSided",
  "heightMasked",
  "heightMaskedDoubleSided",
  "prepass",
  "prepassDoubleSided",
  "depth",
  "depthDoubleSided",
  "depthMasked",
  "depthMaskedDoubleSided",
  "translucentList",
  "translucentListDoubleSided",
  "translucentMoments",
  "translucentMomentsDoubleSided",
  "translucentColor",
  "translucentColorDoubleSided",
];

export interface Pipelines extends SurfacePipelines {
  viewLayout: GPUBindGroupLayout;
  cullWorldLayout: GPUBindGroupLayout;
  /** The point cull's group 1: records, transforms, indirect arguments. */
  cullPointWorldLayout: GPUBindGroupLayout;
  drawWorldLayout: GPUBindGroupLayout;
  textureSetLayout: GPUBindGroupLayout;
  /** Per-record cull and compaction. */
  cullRecords: GPUComputePipeline;
  /** Per-instance cull and compaction (instanced records). */
  cullInstances: GPUComputePipeline;
  /** Per-batch indirect args. */
  writeDrawArgs: GPUComputePipeline;
  /**
   * Point draws' per-view cull into their lists and their indirect args
   * (pointCull.slang, with the default style: no splats); group 2 of their
   * pipelines (group 3: a style's uniforms, vector/PointCuller.ts).
   */
  pointCullLayout: GPUBindGroupLayout;
  cullPoints: GPUComputePipeline;
  writePointArgs: GPUComputePipeline;
  /** Point splats into the opaque pass (splat.wgsl) and its group 1. */
  splatLayout: GPUBindGroupLayout;
  splatResolve: GPURenderPipeline;
  /**
   * A custom shader's pipelines from its stages' WGSL, one by key; rejects
   * with the compiler's messages.
   */
  surface(
    shader: CustomShader,
  ): Promise<(key: SurfaceKey) => Promise<GPURenderPipeline>>;
  /**
   * A custom shader's group-2 layout: the texture set's and its uniforms'
   * (uniforms.ts); undefined without uniforms.
   */
  setLayout(shader: CustomShader): GPUBindGroupLayout | undefined;
  /**
   * The opaque pass draws its depth first (`depth`); false with an
   * override shader, which may not compute the same depths.
   */
  depthPrepass: boolean;
  /** Ambient occlusion (`ao.wgsl`): the horizon search, then the blur. */
  aoTrace: GPUComputePipeline;
  aoDenoise: GPUComputePipeline;
  present: GPURenderPipeline;
  /**
   * With FXAA (View.fxaa): the present pass into an encoded 8-bit image,
   * then FXAA from it into the target (`fxaa.wgsl`).
   */
  presentLdr: GPURenderPipeline;
  fxaa: GPURenderPipeline;
  overlay: GPURenderPipeline;
  overlayLayout: GPUBindGroupLayout;
  pick: GPUComputePipeline;
  /** Scatter upload of table entries (`scatter.slang`). */
  scatter: GPUComputePipeline;
  scatterLayout: GPUBindGroupLayout;
  /** Rays against draw geometry (`World.castRays`, `raycast.slang`). */
  raycast: GPUComputePipeline;
  /** Average log luminance for automatic exposure (`meter.wgsl`). */
  meter: GPUComputePipeline;
  /** The eye's local adaptation map (`adapt.wgsl`): reduce, then blur. */
  adaptReduce: GPUComputePipeline;
  adaptBlur: GPUComputePipeline;
  /** Point and spot lights into the view's froxels (`lights.wgsl`). */
  lightsAssign: GPUComputePipeline;
  /** The nearest and farthest surface a view shows (`depthRange.slang`). */
  depthRange: GPUComputePipeline;
  /** The translucent passes' group 3 (`SurfacePipelines.translucent*`). */
  translucentLayout: GPUBindGroupLayout;
  /**
   * "exact": each pixel's list sorted and blended (composite.slang
   * `sortLists`), into the accumulation targets the moments use.
   */
  translucentSort: GPUComputePipeline;
  /** Either way's layers over the opaque pass's targets (composite.slang). */
  compositeExact: GPURenderPipeline;
  compositeMoments: GPURenderPipeline;
  /**
   * The moments' targets (absorbance, its moments): 32-bit floats where
   * they blend, else 16-bit; and the bias their precision calls for.
   */
  momentFormats: readonly [GPUTextureFormat, GPUTextureFormat];
  momentBias: number;
  /**
   * "exact": a fragment shader's storage writes run once a covered
   * sample here (gpu/sampleRateProbe.ts), so the lists' pass runs per
   * sample explicitly (translucent.wgsl `fsListSamples`).
   */
  listsPerSample: boolean;
}

export interface Defaults {
  /** 1×1 white, bound wherever a material has no texture. */
  whiteView: GPUTextureView;
  sampler: GPUSampler;
}

/** Device-level state shared by the engine, worlds and views. */
export interface RenderContext {
  device: GPUDevice;
  /** The engine's errors (`Engine.errors`), with what it did about each. */
  errors: EngineErrors;
  caps: Capabilities;
  targets: typeof SCENE_TARGETS;
  pipelines: Pipelines;
  /** Custom shaders' pipelines, compiled in the background. */
  shaders: ShaderCache;
  /** Custom shaders' uniforms and textures (`flush` before frames). */
  shaderBindings: ShaderBindings;
  defaults: Defaults;
  mips: MipGenerator;
  environment: Environment;
  outputFormat: GPUTextureFormat;
  /** Uniform buffer each view's block is copied into before its passes run. */
  currentViewBuffer: GPUBuffer;
  currentViewBindGroup: GPUBindGroup;
  /**
   * The sun's cascaded shadow maps (scene/shadows.ts): one depth layer per
   * cascade, rewritten for each view before its opaque pass reads them,
   * and the view's `Shadows` uniform, copied in like its block.
   */
  shadowMap: GPUTexture;
  shadowLayers: GPUTextureView[];
  currentShadowsBuffer: GPUBuffer;
  /**
   * Ambient occlusion by pixel, 8 bits each, for the view being drawn
   * (rewritten per view before its opaque pass): up to `AO_MAX_PIXELS`.
   */
  aoBuffer: GPUBuffer;
  /**
   * The view's point and spot lights (scene/lights.ts, copied in per view
   * before its opaque pass), and the group that sorts them into its
   * froxels (`lightsAssign`).
   */
  lightBuffer: GPUBuffer;
  lightAssignGroup: GPUBindGroup;
  /**
   * The view bind group for drawing into the shadow maps: the same, with
   * a placeholder where the maps are bound (a texture can't be read and
   * drawn into in one pass).
   */
  shadowViewBindGroup: GPUBindGroup;
}

/**
 * Complete WGSL modules that replace the built-in shaders, e.g. output of the
 * Slang toolchain. They must keep the built-in bind group layouts and entry
 * point names (`vs`/`fs` for opaque; `cullRecords`, `cullInstances` and
 * `writeDrawArgs` for cull).
 */
export interface ShaderOverrides {
  opaque?: string;
  cull?: string;
}

export async function createRenderContext(
  device: GPUDevice,
  caps: Capabilities,
  outputFormat: GPUTextureFormat,
  sky: {
    sunLight: GPUTextureView;
    /** In-scatter, then transmittance, along depth (Sky.aerialVolume). */
    aerialVolume: GPUTextureView;
    /** In-scatter (layer 0) and transmittance (layer 1). */
    aerialScreen: GPUTextureView;
    air: GPUBuffer;
    airTransmittance: GPUTextureView;
    airScattering: GPUTextureView;
  },
  overrides: ShaderOverrides = {},
): Promise<RenderContext> {
  // Everything compiles in parallel: engine pipelines, IBL kernels and the
  // mip generator for the formats glTF textures use.
  const mips = new MipGenerator(device);
  const [pipelines, environment] = await Promise.all([
    createPipelines(device, caps, outputFormat, overrides),
    Environment.create(device),
    mips.prepare("rgba8unorm"),
    mips.prepare("rgba8unorm-srgb"),
  ]);
  const currentViewBuffer = device.createBuffer({
    label: "currentView",
    size: VIEW_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  environment.setSky();
  const shadowMap = device.createTexture({
    label: "shadowMap",
    size: [SHADOW_SIZE, SHADOW_SIZE, SHADOW_CASCADES],
    format: "depth32float",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  const shadowPlaceholder = device.createTexture({
    label: "shadowMap.placeholder",
    size: [1, 1, 1],
    format: "depth32float",
    usage: GPUTextureUsage.TEXTURE_BINDING,
  });
  const aoBuffer = device.createBuffer({
    label: "ambientOcclusion",
    size: AO_MAX_PIXELS,
    usage: GPUBufferUsage.STORAGE,
  });
  // The lights (written by the CPU), then their froxels' lists (written by
  // lights.assign): one buffer, one binding (common.wgsl `LightTable`).
  const lightBuffer = device.createBuffer({
    label: "currentLights",
    size: LIGHTS_SIZE + CLUSTERS_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const currentShadowsBuffer = device.createBuffer({
    label: "currentShadows",
    size: SHADOWS_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  // Reverse-Z: a receiver is lit where it is at least as near the sun as
  // the nearest caster.
  const shadowSampler = device.createSampler({
    label: "shadow",
    magFilter: "linear",
    minFilter: "linear",
    compare: "greater-equal",
  });
  const viewEntries = (shadows: GPUTextureView): GPUBindGroupEntry[] => [
    { binding: 0, resource: { buffer: currentViewBuffer } },
    { binding: 1, resource: environment.specularView },
    { binding: 2, resource: environment.sampler },
    { binding: 3, resource: environment.brdfView },
    { binding: 4, resource: { buffer: environment.shBuffer } },
    { binding: 5, resource: sky.sunLight },
    { binding: 6, resource: environment.irradianceView },
    { binding: 7, resource: sky.aerialVolume },
    { binding: 9, resource: { buffer: sky.air } },
    { binding: 10, resource: sky.airTransmittance },
    { binding: 11, resource: sky.airScattering },
    { binding: 12, resource: { buffer: currentShadowsBuffer } },
    { binding: 13, resource: shadows },
    { binding: 14, resource: shadowSampler },
    { binding: 15, resource: { buffer: aoBuffer } },
    { binding: 16, resource: sky.aerialScreen },
    { binding: 18, resource: { buffer: lightBuffer } },
  ];
  const shadowViewBindGroup = device.createBindGroup({
    label: "currentView.shadowCasters",
    layout: pipelines.viewLayout,
    entries: viewEntries(
      shadowPlaceholder.createView({ dimension: "2d-array" }),
    ),
  });
  const currentViewBindGroup = device.createBindGroup({
    label: "currentView",
    layout: pipelines.viewLayout,
    entries: viewEntries(shadowMap.createView({ dimension: "2d-array" })),
  });
  const white = device.createTexture({
    label: "default.white",
    size: [1, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture(
    { texture: white },
    new Uint8Array([255, 255, 255, 255]),
    {},
    [1, 1],
  );
  const whiteView = white.createView();
  const errors = new EngineErrors();
  return {
    device,
    errors,
    caps,
    targets: SCENE_TARGETS,
    pipelines,
    shaders: new ShaderCache((shader) => pipelines.surface(shader), errors),
    shaderBindings: new ShaderBindings(device, { whiteView }, mips),
    defaults: {
      whiteView,
      sampler: device.createSampler({
        label: "default",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "repeat",
        addressModeV: "repeat",
      }),
    },
    mips,
    environment,
    outputFormat,
    currentViewBuffer,
    currentViewBindGroup,
    shadowMap,
    shadowLayers: Array.from({ length: SHADOW_CASCADES }, (_, layer) =>
      shadowMap.createView({
        dimension: "2d",
        baseArrayLayer: layer,
        arrayLayerCount: 1,
      }),
    ),
    currentShadowsBuffer,
    aoBuffer,
    lightBuffer,
    lightAssignGroup: device.createBindGroup({
      label: "lights.assign",
      layout: pipelines.lightsAssign.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: lightBuffer } }],
    }),
    shadowViewBindGroup,
  };
}

/**
 * The largest view (in pixels) ambient occlusion covers: one byte each in
 * one buffer (16 MB, 4096 × 4096); larger views go without.
 */
export const AO_MAX_PIXELS = 4096 * 4096;

function storage(
  binding: number,
  readOnly: boolean,
  visibility: number,
): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility,
    buffer: { type: readOnly ? "read-only-storage" : "storage" },
  };
}

async function createPipelines(
  device: GPUDevice,
  caps: Capabilities,
  outputFormat: GPUTextureFormat,
  overrides: ShaderOverrides,
): Promise<Pipelines> {
  const { VERTEX, FRAGMENT, COMPUTE } = GPUShaderStage;
  const perSample = storageWritesRunPerSample(device);
  const viewLayout = device.createBindGroupLayout({
    label: "view",
    entries: [
      {
        binding: 0,
        visibility: VERTEX | FRAGMENT | COMPUTE,
        buffer: { type: "uniform" },
      },
      // Image-based lighting: prefiltered specular cube, its sampler, the
      // split-sum BRDF table and the irradiance SH.
      { binding: 1, visibility: FRAGMENT, texture: { viewDimension: "cube" } },
      {
        binding: 2,
        visibility: VERTEX | FRAGMENT,
        sampler: { type: "filtering" },
      },
      { binding: 3, visibility: FRAGMENT, texture: {} },
      { binding: 4, visibility: FRAGMENT, buffer: { type: "uniform" } },
      // The sun's light through the atmosphere (atmosphere/Sky.ts).
      { binding: 5, visibility: FRAGMENT, texture: {} },
      // Diffuse irradiance by normal (the environment's irradiance cube).
      { binding: 6, visibility: FRAGMENT, texture: { viewDimension: "cube" } },
      // Aerial perspective: in-scatter, then transmittance, along depth
      // (one volume, §13.15).
      { binding: 7, visibility: FRAGMENT, texture: { viewDimension: "3d" } },
      // The air marched per vertex: parameters, then transmittance and
      // multiple-scattering tables (a layer per group of wavelengths).
      { binding: 9, visibility: VERTEX, buffer: { type: "uniform" } },
      {
        binding: 10,
        visibility: VERTEX,
        texture: { viewDimension: "2d-array" },
      },
      {
        binding: 11,
        visibility: VERTEX,
        texture: { viewDimension: "2d-array" },
      },
      // The sun's shadows: the cascades' uniform, maps and comparisons.
      { binding: 12, visibility: FRAGMENT, buffer: { type: "uniform" } },
      {
        binding: 13,
        visibility: FRAGMENT,
        texture: { sampleType: "depth", viewDimension: "2d-array" },
      },
      { binding: 14, visibility: FRAGMENT, sampler: { type: "comparison" } },
      // Ambient occlusion by pixel (ao.wgsl).
      storage(15, true, FRAGMENT),
      // Aerial perspective from high up, on a screen grid: in-scatter and
      // transmittance as two layers of one array.
      {
        binding: 16,
        visibility: FRAGMENT,
        texture: { viewDimension: "2d-array" },
      },
      // Point and spot lights, then their froxels' lists (scene/lights.ts).
      storage(18, true, FRAGMENT),
    ],
  });
  const cullWorldLayout = device.createBindGroupLayout({
    label: "cull.world",
    entries: [
      storage(0, true, COMPUTE), // records
      storage(1, true, COMPUTE), // transforms
      storage(2, true, COMPUTE), // instance table
      storage(3, false, COMPUTE), // draw items
      storage(4, false, COMPUTE), // item list
      // (5: batch counts, now the indirect arguments' instance counts.)
      storage(6, true, COMPUTE), // batches
      storage(7, false, COMPUTE), // indirect args, visible items counted in
      { binding: 8, visibility: COMPUTE, buffer: { type: "uniform" } },
    ],
  });
  // The point cull's world tables: only what its kernels read (records,
  // transforms, indirect arguments), so with its own group 2 the compute
  // stage binds 8 storage buffers, not 13 (the base tier, §13.15).
  const cullPointWorldLayout = device.createBindGroupLayout({
    label: "cull.pointWorld",
    entries: [
      storage(0, true, COMPUTE), // records
      storage(1, true, COMPUTE), // transforms
      storage(7, false, COMPUTE), // indirect args
    ],
  });
  const drawWorldLayout = device.createBindGroupLayout({
    label: "draw.world",
    entries: [
      storage(0, true, VERTEX | FRAGMENT), // records
      storage(1, true, VERTEX), // draw items
      // Vertex streams; fragments read texture properties' blocks.
      storage(2, true, VERTEX | FRAGMENT),
      storage(3, true, FRAGMENT), // materials
      storage(4, true, FRAGMENT), // mixed-LOD clip boxes
      // Globe imagery: the world's composited texture array.
      {
        binding: 5,
        visibility: FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d-array" },
      },
      { binding: 6, visibility: FRAGMENT, sampler: { type: "filtering" } },
      // Night lights are slices of the same array (globe/SlicePool.ts).
    ],
  });
  const textureSetEntries: GPUBindGroupLayoutEntry[] = [
    ...[0, 1, 2, 3, 4].map((binding) => ({
      binding,
      visibility: FRAGMENT,
      texture: { sampleType: "float" as const },
    })),
    ...[5, 6, 7, 8, 9].map((binding) => ({
      binding,
      visibility: FRAGMENT,
      sampler: { type: "filtering" as const },
    })),
  ];
  // Metadata property textures (read with textureLoad): only in the layouts
  // of custom shaders that read metadata per fragment, so the built-in
  // pipelines don't spend two of the base tier's 16 sampled textures on
  // them (§13.15). Bindless: they become texture references too.
  const propertyTextureEntries: GPUBindGroupLayoutEntry[] = Array.from(
    { length: PROPERTY_TEXTURES },
    (_, k) => ({
      binding: PROPERTY_TEXTURE_BINDING + k,
      visibility: FRAGMENT,
      texture: { sampleType: "float" as const },
    }),
  );
  const textureSetLayout = device.createBindGroupLayout({
    label: "textureSet",
    entries: textureSetEntries,
  });
  // A custom shader's group 2: the texture set's, then its uniforms and
  // textures (uniforms.ts); one per distinct code, none without them.
  const setLayouts = new Map<string, GPUBindGroupLayout | undefined>();
  const setLayout = (shader: CustomShader) => {
    if (setLayouts.has(shader.code)) {
      return setLayouts.get(shader.code);
    }
    const { bytes, textures } = shader.uniformLayout;
    let layout: GPUBindGroupLayout | undefined;
    if (bytes > 0 || textures.length > 0 || shader.readsPropertyTextures) {
      const visibility = VERTEX | FRAGMENT;
      const entries = [
        ...textureSetEntries,
        ...(shader.readsPropertyTextures ? propertyTextureEntries : []),
      ];
      if (bytes > 0) {
        entries.push({
          binding: UNIFORM_BINDING,
          visibility,
          buffer: { type: "uniform" },
        });
      }
      textures.forEach((_, k) => {
        entries.push(
          { binding: textureBinding(k), visibility, texture: {} },
          {
            binding: textureBinding(k) + 1,
            visibility,
            sampler: { type: "filtering" },
          },
        );
      });
      layout = device.createBindGroupLayout({
        label: `${shader.label} textureSet`,
        entries,
      });
    }
    setLayouts.set(shader.code, layout);
    return layout;
  };
  const scatterLayout = device.createBindGroupLayout({
    label: "scatter",
    entries: [
      { binding: 0, visibility: COMPUTE, buffer: { type: "uniform" } },
      storage(1, true, COMPUTE), // indices, then data
      storage(2, false, COMPUTE), // the table
    ],
  });
  const translucentLayout = device.createBindGroupLayout({
    label: "translucent",
    entries: [
      { binding: 0, visibility: FRAGMENT, buffer: { type: "uniform" } },
      storage(1, false, FRAGMENT), // the lists
      {
        binding: 2,
        visibility: FRAGMENT,
        texture: { sampleType: "depth", multisampled: true },
      },
      {
        binding: 3,
        visibility: FRAGMENT,
        texture: { sampleType: "unfilterable-float" },
      },
      {
        binding: 4,
        visibility: FRAGMENT,
        texture: { sampleType: "unfilterable-float" },
      },
    ],
  });
  // Shared by the present pass's two pipelines (to the target, or to the
  // image FXAA reads).
  const presentLayout = device.createPipelineLayout({
    bindGroupLayouts: [
      device.createBindGroupLayout({
        label: "present",
        entries: [
          { binding: 0, visibility: FRAGMENT, texture: {} },
          { binding: 1, visibility: FRAGMENT, buffer: { type: "uniform" } },
          { binding: 2, visibility: FRAGMENT, texture: {} },
          {
            binding: 3,
            visibility: FRAGMENT,
            texture: { viewDimension: "3d" },
          },
          { binding: 4, visibility: FRAGMENT, sampler: { type: "filtering" } },
        ],
      }),
    ],
  });
  const overlayLayout = device.createBindGroupLayout({
    label: "overlay",
    entries: [
      { binding: 0, visibility: FRAGMENT, buffer: { type: "uniform" } },
    ],
  });

  const module = (label: string, ...sources: string[]) =>
    device.createShaderModule({ label, code: sources.join("\n") });
  // The engine's own stages: the custom shader contract's defaults.
  const defaultStages = `${DEFAULT_VERTEX_MAIN}\n${DEFAULT_FRAGMENT_MAIN}\n${DEFAULT_NAMED.code}`;
  const builtinOpaque = () =>
    module("opaque", commonWgsl, opaqueWgsl, defaultStages);
  const opaqueModule =
    overrides.opaque !== undefined
      ? module("opaque (override)", overrides.opaque)
      : builtinOpaque();
  const cullModule =
    overrides.cull !== undefined
      ? module("cull (override)", overrides.cull)
      : module("cull", cullWgsl);
  const cullLayout = device.createPipelineLayout({
    bindGroupLayouts: [viewLayout, cullWorldLayout],
  });
  const pointCullLayout = device.createBindGroupLayout({
    label: "cull.points",
    entries: [
      { binding: 0, visibility: COMPUTE, buffer: { type: "uniform" } },
      storage(1, false, COMPUTE), // the vertex arena
      storage(2, false, COMPUTE), // point counts
      storage(3, false, COMPUTE), // splats: depth
      storage(4, false, COMPUTE), // splats: color
      storage(5, false, COMPUTE), // splats: feature
    ],
  });
  // The generic point cull: every point drawn as a quad (no style).
  const pointCullModule = module(
    "cull.points",
    pointCullWgsl,
    POINT_STYLE_DEFAULTS,
  );
  const splatLayout = device.createBindGroupLayout({
    label: "splats",
    entries: [
      storage(0, true, FRAGMENT),
      storage(1, true, FRAGMENT),
      storage(2, true, FRAGMENT),
    ],
  });
  const pointCullPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [viewLayout, cullPointWorldLayout, pointCullLayout],
  });
  const opaqueLayout = device.createPipelineLayout({
    bindGroupLayouts: [viewLayout, drawWorldLayout, textureSetLayout],
  });

  // With the depth drawn first, triangles shade where their depth is the
  // pass's (opaque.wgsl's positions are invariant); lines draw as before.
  const depthPrepass = overrides.opaque === undefined;
  const opaquePipeline = (
    shaders: GPUShaderModule,
    label: string,
    cullMode: GPUCullMode,
    topology: GPUPrimitiveTopology = "triangle-list",
    layout: GPUPipelineLayout = opaqueLayout,
    prepassed = topology === "triangle-list",
    points = false,
  ) =>
    device.createRenderPipelineAsync({
      label,
      layout,
      vertex: {
        module: shaders,
        // Point sets: six vertices per listed point, the batch's one item.
        entryPoint: points ? "vsPoints" : "vs",
        // The draw index: one u32 per instance from the batch's slice of the
        // instance list, bound at the batch's offset.
        buffers: [
          {
            arrayStride: 4,
            stepMode: "instance",
            attributes: [{ shaderLocation: 0, offset: 0, format: "uint32" }],
          },
        ],
      },
      fragment: {
        module: shaders,
        // Point sets: their symbols' coverage as the sample mask.
        entryPoint: points ? "fsPoints" : "fs",
        // Cutouts were decided per sample by the depth (`depthCoverageFs`).
        ...(depthPrepass && prepassed
          ? { constants: { cutOutInDepth: 1 } }
          : {}),
        targets: SCENE_TARGETS.colorFormats.map((format) => ({ format })),
      },
      primitive: { topology, cullMode, frontFace: "ccw" },
      depthStencil:
        depthPrepass && prepassed
          ? {
              format: SCENE_TARGETS.depthFormat,
              depthWriteEnabled: false,
              depthCompare: "equal",
            }
          : {
              format: SCENE_TARGETS.depthFormat,
              depthWriteEnabled: true,
              depthCompare: "greater",
            },
      multisample: { count: SCENE_TARGETS.sampleCount },
    });
  // The opaque pass's depth: the casters' vertex stage and discards, into
  // the pass's targets (no color written).
  const depthPipeline = (
    shaders: GPUShaderModule,
    label: string,
    cullMode: GPUCullMode,
    masked: boolean,
    layout: GPUPipelineLayout = opaqueLayout,
  ) =>
    device.createRenderPipelineAsync({
      label,
      layout,
      vertex: {
        module: shaders,
        entryPoint: "vsDepth",
        buffers: [
          {
            arrayStride: 4,
            stepMode: "instance",
            attributes: [{ shaderLocation: 0, offset: 0, format: "uint32" }],
          },
        ],
      },
      fragment: {
        module: shaders,
        entryPoint: masked ? "depthCoverageFs" : "shadowPlaceholderFs",
        targets: SCENE_TARGETS.colorFormats.map((format) => ({
          format,
          writeMask: 0,
        })),
      },
      primitive: { topology: "triangle-list", cullMode, frontFace: "ccw" },
      depthStencil: {
        format: SCENE_TARGETS.depthFormat,
        depthWriteEnabled: true,
        depthCompare: "greater",
      },
      // Cutouts' edges antialiased: their alpha picks the samples.
      multisample: {
        count: SCENE_TARGETS.sampleCount,
        alphaToCoverageEnabled: masked,
      },
    });
  // Shadow casters always use the built-in module (an override has no
  // `vsDepth` or `shadowFs`).
  const casterModule =
    overrides.opaque !== undefined ? builtinOpaque() : opaqueModule;
  const shadowPipeline = (
    shaders: GPUShaderModule,
    label: string,
    cullMode: GPUCullMode,
    masked: boolean,
    layout: GPUPipelineLayout = opaqueLayout,
    bias = true,
  ) =>
    device.createRenderPipelineAsync({
      label,
      layout,
      vertex: {
        module: shaders,
        entryPoint: "vsDepth",
        buffers: [
          {
            arrayStride: 4,
            stepMode: "instance",
            attributes: [{ shaderLocation: 0, offset: 0, format: "uint32" }],
          },
        ],
      },
      // Masked: the material's alpha cutoff and placeholders' clip; else
      // the clip alone (a record turns placeholder without the bundle
      // being recorded again, so every caster checks).
      fragment: {
        module: shaders,
        entryPoint: masked ? "shadowFs" : "shadowPlaceholderFs",
        targets: [],
      },
      primitive: { topology: "triangle-list", cullMode, frontFace: "ccw" },
      depthStencil: {
        format: "depth32float",
        depthWriteEnabled: true,
        depthCompare: "greater",
        // Away from the sun (reverse-Z: smaller), more where the surface
        // slopes away from it; none for height captures.
        depthBias: bias ? -2 : 0,
        depthBiasSlopeScale: bias ? -1.5 : 0,
        depthBiasClamp: 0,
      },
    });

  // The prepass: single-sampled depth and normals, the casters' vertex
  // stage (no aerial perspective) and discards.
  // Translucency: single-sampled, no depth attachment (translucent.wgsl
  // tests the opaque depth itself). Override shaders have no translucent
  // entry points: the built-in module draws them.
  const translucentModule = module(
    "translucent",
    commonWgsl,
    opaqueWgsl,
    translucentWgsl,
    defaultStages,
  );
  const translucentPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [
      viewLayout,
      drawWorldLayout,
      textureSetLayout,
      translucentLayout,
    ],
  });
  const added: GPUBlendState = {
    color: { srcFactor: "one", dstFactor: "one" },
    alpha: { srcFactor: "one", dstFactor: "one" },
  };
  const momentFormats = caps.float32Blendable
    ? (["r32float", "rgba32float"] as const)
    : (["r16float", "rgba16float"] as const);
  const translucentPipeline = (
    shaders: GPUShaderModule,
    label: string,
    cullMode: GPUCullMode,
    entryPoint: string,
    targets: GPUColorTargetState[],
    sampleCount = 1,
    layout: GPUPipelineLayout = translucentPipelineLayout,
  ) =>
    device.createRenderPipelineAsync({
      label,
      layout,
      multisample: { count: sampleCount },
      vertex: {
        module: shaders,
        entryPoint: "vs",
        buffers: [
          {
            arrayStride: 4,
            stepMode: "instance",
            attributes: [{ shaderLocation: 0, offset: 0, format: "uint32" }],
          },
        ],
      },
      fragment: { module: shaders, entryPoint, targets },
      primitive: { topology: "triangle-list", cullMode, frontFace: "ccw" },
    });
  // The lists' pass writes no color; its one target is the scene's
  // multisampled one (its fragments' coverage antialiases glass's edges).
  const listTargets: GPUColorTargetState[] = [
    { format: "rgba16float", writeMask: 0 },
  ];
  const momentTargets: GPUColorTargetState[] = momentFormats.map((format) => ({
    format,
    blend: added,
  }));
  const colorTargets: GPUColorTargetState[] = [
    { format: "rgba16float", blend: added },
    { format: "rgba16float", blend: added },
  ];
  // Premultiplied, alpha 1 - T: the scene's light and coverage "over";
  // the display's color the same, its alpha (the unlit share) times T.
  const over: GPUBlendComponent = {
    srcFactor: "one",
    dstFactor: "one-minus-src-alpha",
  };
  const compositeModule = module("composite", compositeWgsl);
  const compositePipeline = (label: string, entryPoint: string) =>
    device.createRenderPipelineAsync({
      label,
      layout: "auto",
      vertex: { module: compositeModule, entryPoint: "vs" },
      fragment: {
        module: compositeModule,
        entryPoint,
        targets: [
          { format: "rgba16float", blend: { color: over, alpha: over } },
          {
            format: "rgba8unorm-srgb",
            blend: {
              color: over,
              alpha: { srcFactor: "zero", dstFactor: "one-minus-src-alpha" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });

  const prepassPipeline = (
    shaders: GPUShaderModule,
    label: string,
    cullMode: GPUCullMode,
    layout: GPUPipelineLayout = opaqueLayout,
  ) =>
    device.createRenderPipelineAsync({
      label,
      layout,
      vertex: {
        module: shaders,
        entryPoint: "vsDepth",
        buffers: [
          {
            arrayStride: 4,
            stepMode: "instance",
            attributes: [{ shaderLocation: 0, offset: 0, format: "uint32" }],
          },
        ],
      },
      fragment: {
        module: shaders,
        entryPoint: "prepassFs",
        targets: [{ format: "rgba16float" }],
      },
      primitive: { topology: "triangle-list", cullMode, frontFace: "ccw" },
      depthStencil: {
        format: "depth32float",
        depthWriteEnabled: true,
        depthCompare: "greater",
      },
    });

  // One shader's set: the opaque stages from `opaque`, the casters' and
  // prepass's from `caster` (the same but for an override), translucency
  // from `translucent` (the same stages with translucent.wgsl).
  const surfacePipelines = async (
    prefix: string,
    opaque: GPUShaderModule,
    caster: GPUShaderModule,
    translucent: GPUShaderModule,
  ): Promise<SurfacePipelines> => {
    const build = surfaceBuilder(prefix, opaque, caster, () => translucent);
    const built = await Promise.all(SURFACE_KEYS.map((key) => build(key)));
    return Object.fromEntries(
      SURFACE_KEYS.map((key, i) => [key, built[i]!]),
    ) as unknown as SurfacePipelines;
  };

  // One pipeline of a shader's set by key: from its opaque stages, its
  // casters' (the same but for an override) and its translucent ones (the
  // same stages with translucent.wgsl, made when first needed).
  function surfaceBuilder(
    prefix: string,
    opaque: GPUShaderModule,
    caster: GPUShaderModule,
    translucent: () => GPUShaderModule,
    // A custom shader's with its uniforms (group 2: `setLayout`).
    layouts?: { opaque: GPUPipelineLayout; translucent: GPUPipelineLayout },
  ): (key: SurfaceKey) => Promise<GPURenderPipeline> {
    const name = (label: string) => `${prefix}${label}`;
    const o = layouts?.opaque;
    const t = layouts?.translucent;
    const tri = "triangle-list";
    const builders: Record<SurfaceKey, () => Promise<GPURenderPipeline>> = {
      opaque: () => opaquePipeline(opaque, name("opaque"), "back", tri, o),
      opaqueDoubleSided: () =>
        opaquePipeline(opaque, name("opaque.doubleSided"), "none", tri, o),
      opaqueLines: () =>
        opaquePipeline(opaque, name("opaque.lines"), "none", "line-list", o),
      // Point sets draw with `caster`'s stages: the built-in ones under a
      // whole-shader override (ShaderOverrides keep `vs`/`fs` only, so the
      // Slang port has no `vsPoints`), the same module otherwise.
      opaquePoints: () =>
        opaquePipeline(
          caster,
          name("opaque.points"),
          "none",
          tri,
          o,
          false,
          true,
        ),
      opaqueInstanced: () =>
        opaquePipeline(opaque, name("opaque.instanced"), "back", tri, o, false),
      opaqueInstancedDoubleSided: () =>
        opaquePipeline(
          opaque,
          name("opaque.instanced.doubleSided"),
          "none",
          tri,
          o,
          false,
        ),
      shadow: () => shadowPipeline(caster, name("shadow"), "back", false, o),
      shadowDoubleSided: () =>
        shadowPipeline(caster, name("shadow.doubleSided"), "none", false, o),
      shadowMasked: () =>
        shadowPipeline(caster, name("shadow.masked"), "back", true, o),
      height: () =>
        shadowPipeline(caster, name("height"), "back", false, o, false),
      heightDoubleSided: () =>
        shadowPipeline(
          caster,
          name("height.doubleSided"),
          "none",
          false,
          o,
          false,
        ),
      heightMasked: () =>
        shadowPipeline(caster, name("height.masked"), "back", true, o, false),
      heightMaskedDoubleSided: () =>
        shadowPipeline(
          caster,
          name("height.maskedDoubleSided"),
          "none",
          true,
          o,
          false,
        ),
      shadowMaskedDoubleSided: () =>
        shadowPipeline(
          caster,
          name("shadow.maskedDoubleSided"),
          "none",
          true,
          o,
        ),
      prepass: () => prepassPipeline(caster, name("prepass"), "back", o),
      prepassDoubleSided: () =>
        prepassPipeline(caster, name("prepass.doubleSided"), "none", o),
      // The depth prepass's stages are the casters' (`caster`: built-in
      // under a whole-shader override, which has `vs`/`fs` only).
      depth: () => depthPipeline(caster, name("depth"), "back", false, o),
      depthDoubleSided: () =>
        depthPipeline(caster, name("depth.doubleSided"), "none", false, o),
      depthMasked: () =>
        depthPipeline(caster, name("depth.masked"), "back", true, o),
      depthMaskedDoubleSided: () =>
        depthPipeline(caster, name("depth.maskedDoubleSided"), "none", true, o),
      translucentList: async () =>
        translucentPipeline(
          translucent(),
          name("translucent.list"),
          "back",
          (await perSample) ? "fsListSamples" : "fsList",
          listTargets,
          SCENE_TARGETS.sampleCount,
          t,
        ),
      translucentListDoubleSided: async () =>
        translucentPipeline(
          translucent(),
          name("translucent.list.doubleSided"),
          "none",
          (await perSample) ? "fsListSamples" : "fsList",
          listTargets,
          SCENE_TARGETS.sampleCount,
          t,
        ),
      translucentMoments: () =>
        translucentPipeline(
          translucent(),
          name("translucent.moments"),
          "back",
          "fsMoments",
          momentTargets,
          1,
          t,
        ),
      translucentMomentsDoubleSided: () =>
        translucentPipeline(
          translucent(),
          name("translucent.moments.doubleSided"),
          "none",
          "fsMoments",
          momentTargets,
          1,
          t,
        ),
      translucentColor: () =>
        translucentPipeline(
          translucent(),
          name("translucent.color"),
          "back",
          "fsMomentColor",
          colorTargets,
          1,
          t,
        ),
      translucentColorDoubleSided: () =>
        translucentPipeline(
          translucent(),
          name("translucent.color.doubleSided"),
          "none",
          "fsMomentColor",
          colorTargets,
          1,
          t,
        ),
    };
    return (key) => builders[key]();
  }

  // A custom shader's pipelines, each made when first asked for: its
  // stages in place of the defaults. The compiler's errors first, at their
  // line in the stage's own code.
  const surface = async (
    shader: CustomShader,
  ): Promise<(key: SurfaceKey) => Promise<GPURenderPipeline>> => {
    const { code, label, vertexLines } = shader;
    // Its named values' varyings in VsOut.
    const opaqueSource = withNamedVaryings(opaqueWgsl, shader.varyings);
    const base = [commonWgsl, opaqueSource].join("\n");
    // Its errors are reported below, once, not as an uncaptured error too.
    device.pushErrorScope("validation");
    const opaque = module(`${label} opaque`, base, code);
    void device.popErrorScope();
    const info = await opaque.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === "error");
    if (errors.length > 0) {
      const offset = base.split("\n").length;
      const where = (line: number) =>
        vertexLines === undefined
          ? `line ${line}`
          : line <= vertexLines
            ? `vertex line ${line}`
            : `fragment line ${line - vertexLines}`;
      throw new Error(
        `${label}: ${errors
          .map((m) =>
            m.lineNum > offset
              ? `${where(m.lineNum - offset)}: ${m.message}`
              : m.message,
          )
          .join("; ")}`,
      );
    }
    let translucent: GPUShaderModule | undefined;
    const set = setLayout(shader);
    const layouts = set && {
      opaque: device.createPipelineLayout({
        label: `${label} opaque`,
        bindGroupLayouts: [viewLayout, drawWorldLayout, set],
      }),
      translucent: device.createPipelineLayout({
        label: `${label} translucent`,
        bindGroupLayouts: [viewLayout, drawWorldLayout, set, translucentLayout],
      }),
    };
    return surfaceBuilder(
      `${label} `,
      opaque,
      opaque,
      () => {
        translucent ??= module(
          `${label} translucent`,
          commonWgsl,
          opaqueSource,
          translucentWgsl,
          code,
        );
        return translucent;
      },
      layouts,
    );
  };

  const [
    cullRecords,
    cullInstances,
    writeDrawArgs,
    cullPoints,
    writePointArgs,
    splatResolve,
    builtinSurface,
    aoTrace,
    aoDenoise,
    present,
    presentLdr,
    fxaa,
    overlay,
    pick,
    scatter,
    raycast,
    meter,
    adaptReduce,
    adaptBlur,
    lightsAssign,
    depthRange,
    translucentSort,
    compositeExact,
    compositeMoments,
  ] = await Promise.all([
    device.createComputePipelineAsync({
      label: "cull.records",
      layout: cullLayout,
      compute: { module: cullModule, entryPoint: "cullRecords" },
    }),
    device.createComputePipelineAsync({
      label: "cull.instances",
      layout: cullLayout,
      compute: { module: cullModule, entryPoint: "cullInstances" },
    }),
    device.createComputePipelineAsync({
      label: "cull.args",
      layout: cullLayout,
      compute: { module: cullModule, entryPoint: "writeDrawArgs" },
    }),
    device.createComputePipelineAsync({
      label: "cull.points",
      layout: pointCullPipelineLayout,
      compute: { module: pointCullModule, entryPoint: "cullPoints" },
    }),
    device.createComputePipelineAsync({
      label: "cull.pointArgs",
      layout: pointCullPipelineLayout,
      compute: { module: pointCullModule, entryPoint: "writePointArgs" },
    }),
    (() => {
      const splatModule = module("splats", splatWgsl);
      return device.createRenderPipelineAsync({
        label: "splats",
        layout: device.createPipelineLayout({
          bindGroupLayouts: [viewLayout, splatLayout],
        }),
        vertex: { module: splatModule, entryPoint: "vs" },
        fragment: {
          module: splatModule,
          entryPoint: "fs",
          // The scene's light untouched; the display color over what is
          // drawn by the splat's coverage (premultiplied).
          targets: [
            { format: SCENE_TARGETS.colorFormats[0]!, writeMask: 0 },
            { format: SCENE_TARGETS.colorFormats[1]! },
            {
              format: SCENE_TARGETS.colorFormats[2]!,
              blend: {
                color: {
                  srcFactor: "one",
                  dstFactor: "one-minus-src-alpha",
                },
                alpha: {
                  srcFactor: "one",
                  dstFactor: "one-minus-src-alpha",
                },
              },
            },
          ],
        },
        primitive: { topology: "triangle-list" },
        depthStencil: {
          format: SCENE_TARGETS.depthFormat,
          depthWriteEnabled: true,
          depthCompare: "greater",
        },
        multisample: { count: SCENE_TARGETS.sampleCount },
      });
    })(),
    surfacePipelines("", opaqueModule, casterModule, translucentModule),
    device.createComputePipelineAsync({
      label: "ao.trace",
      layout: "auto",
      compute: { module: module("ao", aoWgsl), entryPoint: "gtao" },
    }),
    device.createComputePipelineAsync({
      label: "ao.denoise",
      layout: "auto",
      compute: { module: module("ao", aoWgsl), entryPoint: "denoise" },
    }),
    device.createRenderPipelineAsync({
      label: "present",
      layout: presentLayout,
      vertex: { module: module("present", presentWgsl), entryPoint: "vs" },
      fragment: {
        module: module("present", presentWgsl),
        entryPoint: "fs",
        targets: [{ format: outputFormat }],
      },
      primitive: { topology: "triangle-list" },
    }),
    device.createRenderPipelineAsync({
      label: "present.ldr",
      layout: presentLayout,
      vertex: { module: module("present", presentWgsl), entryPoint: "vs" },
      fragment: {
        module: module("present", presentWgsl),
        entryPoint: "fs",
        targets: [{ format: "rgba8unorm" }],
      },
      primitive: { topology: "triangle-list" },
    }),
    device.createRenderPipelineAsync({
      label: "fxaa",
      layout: "auto",
      vertex: { module: module("fxaa", fxaaWgsl), entryPoint: "vs" },
      fragment: {
        module: module("fxaa", fxaaWgsl),
        entryPoint: "fs",
        targets: [{ format: outputFormat }],
      },
      primitive: { topology: "triangle-list" },
    }),
    device.createRenderPipelineAsync({
      label: "overlay",
      layout: device.createPipelineLayout({
        bindGroupLayouts: [viewLayout, overlayLayout],
      }),
      vertex: {
        module: module("overlay", overlayWgsl),
        entryPoint: "vs",
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
          },
        ],
      },
      fragment: {
        module: module("overlay", overlayWgsl),
        entryPoint: "fs",
        targets: [{ format: outputFormat }],
      },
      primitive: { topology: "line-list" },
    }),
    device.createComputePipelineAsync({
      label: "pick",
      layout: "auto",
      compute: { module: module("pick", pickWgsl), entryPoint: "main" },
    }),
    device.createComputePipelineAsync({
      label: "scatter",
      layout: device.createPipelineLayout({
        bindGroupLayouts: [scatterLayout],
      }),
      compute: { module: module("scatter", scatterWgsl), entryPoint: "main" },
    }),
    device.createComputePipelineAsync({
      label: "raycast",
      layout: "auto",
      compute: {
        module: module("raycast", raycastWgsl),
        entryPoint: "main",
      },
    }),
    device.createComputePipelineAsync({
      label: "meter",
      layout: "auto",
      compute: { module: module("meter", meterWgsl), entryPoint: "main" },
    }),
    device.createComputePipelineAsync({
      label: "adapt.reduce",
      layout: "auto",
      compute: { module: module("adapt", adaptWgsl), entryPoint: "reduce" },
    }),
    device.createComputePipelineAsync({
      label: "adapt.blur",
      layout: "auto",
      compute: { module: module("adapt", adaptWgsl), entryPoint: "blur" },
    }),
    device.createComputePipelineAsync({
      label: "lights.assign",
      layout: "auto",
      compute: {
        module: module("lights", lightsWgsl),
        entryPoint: "assign",
      },
    }),
    device.createComputePipelineAsync({
      label: "depthRange",
      layout: "auto",
      compute: {
        module: module("depthRange", depthRangeWgsl),
        entryPoint: "main",
      },
    }),
    device.createComputePipelineAsync({
      label: "translucent.sort",
      layout: "auto",
      compute: { module: compositeModule, entryPoint: "sortLists" },
    }),
    compositePipeline("composite.exact", "fsSorted"),
    compositePipeline("composite.moments", "fsMoments"),
  ]);

  return {
    viewLayout,
    cullWorldLayout,
    cullPointWorldLayout,
    drawWorldLayout,
    textureSetLayout,
    cullRecords,
    cullInstances,
    writeDrawArgs,
    pointCullLayout,
    cullPoints,
    writePointArgs,
    splatLayout,
    splatResolve,
    ...builtinSurface,
    surface,
    setLayout,
    depthPrepass,
    aoTrace,
    aoDenoise,
    present,
    presentLdr,
    fxaa,
    overlay,
    overlayLayout,
    pick,
    scatter,
    scatterLayout,
    raycast,
    meter,
    adaptReduce,
    adaptBlur,
    lightsAssign,
    depthRange,
    translucentLayout,
    translucentSort,
    compositeExact,
    compositeMoments,
    momentFormats,
    // Münstermann et al. give 5·10⁻⁷ for four power moments in 32-bit
    // floats; computed in 32-bit floats here, that left a lone layer's
    // reconstruction failing often enough to speckle (5·10⁻⁶: never in
    // 400,000 random stacks of one to four layers). In 16-bit (without
    // their quantization), more.
    momentBias: caps.float32Blendable ? 5e-6 : 6e-4,
    listsPerSample: await perSample,
  };
}
