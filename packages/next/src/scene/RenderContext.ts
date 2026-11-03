import type { Capabilities } from "../gpu/GpuDevice.ts";
import { MipGenerator } from "../gpu/MipGenerator.ts";
import { Environment } from "../gpu/Environment.ts";
import { VIEW_SIZE } from "../render/layout.ts";
import commonWgsl from "../shaders/common.wgsl?raw";
import aoWgsl from "../shaders/ao.wgsl?raw";
import { SHADOW_CASCADES, SHADOW_SIZE, SHADOWS_SIZE } from "./shadows.ts";
import cullWgsl from "../shaders/cull.wgsl?raw";
import scatterWgsl from "../shaders/scatter.wgsl?raw";
import raycastWgsl from "../shaders/raycast.wgsl?raw";
import opaqueWgsl from "../shaders/opaque.wgsl?raw";
import presentWgsl from "../shaders/present.wgsl?raw";
import overlayWgsl from "../shaders/overlay.wgsl?raw";
import pickWgsl from "../shaders/pick.wgsl?raw";
import meterWgsl from "../shaders/meter.wgsl?raw";

/**
 * The single render-target configuration views draw their 3D content into.
 * Render bundles are keyed on it, so every view shares one bundle per world.
 * Views differ only after the bundle runs (present, post, overlays).
 */
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

export interface Pipelines {
  viewLayout: GPUBindGroupLayout;
  cullWorldLayout: GPUBindGroupLayout;
  drawWorldLayout: GPUBindGroupLayout;
  textureSetLayout: GPUBindGroupLayout;
  /** Per-record cull and compaction. */
  cullRecords: GPUComputePipeline;
  /** Per-instance cull and compaction (instanced records). */
  cullInstances: GPUComputePipeline;
  /** Per-batch indirect args. */
  writeDrawArgs: GPUComputePipeline;
  opaque: GPURenderPipeline;
  opaqueDoubleSided: GPURenderPipeline;
  /** Line-list variant (CAD edges, glTF LINES); same shaders, no culling. */
  opaqueLines: GPURenderPipeline;
  /**
   * The sun's shadow-map casters: depth only, and double-sided; "masked"
   * for materials that cut out (a fragment stage that discards).
   */
  shadow: GPURenderPipeline;
  shadowDoubleSided: GPURenderPipeline;
  shadowMasked: GPURenderPipeline;
  shadowMaskedDoubleSided: GPURenderPipeline;
  /** The depth and normal prepass (ambient occlusion), and double-sided. */
  prepass: GPURenderPipeline;
  prepassDoubleSided: GPURenderPipeline;
  /** Ambient occlusion (`ao.wgsl`): the horizon search, then the blur. */
  aoTrace: GPUComputePipeline;
  aoDenoise: GPUComputePipeline;
  present: GPURenderPipeline;
  overlay: GPURenderPipeline;
  overlayLayout: GPUBindGroupLayout;
  pick: GPUComputePipeline;
  /** Scatter upload of table entries (`scatter.wgsl`). */
  scatter: GPUComputePipeline;
  scatterLayout: GPUBindGroupLayout;
  /** Rays against draw geometry (`World.castRays`, `raycast.wgsl`). */
  raycast: GPUComputePipeline;
  /** Average log luminance for automatic exposure (`meter.wgsl`). */
  meter: GPUComputePipeline;
}

export interface Defaults {
  /** 1×1 white, bound wherever a material has no texture. */
  whiteView: GPUTextureView;
  sampler: GPUSampler;
}

/** Device-level state shared by the engine, worlds and views. */
export interface RenderContext {
  device: GPUDevice;
  caps: Capabilities;
  targets: typeof SCENE_TARGETS;
  pipelines: Pipelines;
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
    aerialInscatter: GPUTextureView;
    aerialTransmittance: GPUTextureView;
    aerialScreenInscatter: GPUTextureView;
    aerialScreenTransmittance: GPUTextureView;
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
    createPipelines(device, outputFormat, overrides),
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
    { binding: 7, resource: sky.aerialInscatter },
    { binding: 8, resource: sky.aerialTransmittance },
    { binding: 9, resource: { buffer: sky.air } },
    { binding: 10, resource: sky.airTransmittance },
    { binding: 11, resource: sky.airScattering },
    { binding: 12, resource: { buffer: currentShadowsBuffer } },
    { binding: 13, resource: shadows },
    { binding: 14, resource: shadowSampler },
    { binding: 15, resource: { buffer: aoBuffer } },
    { binding: 16, resource: sky.aerialScreenInscatter },
    { binding: 17, resource: sky.aerialScreenTransmittance },
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
  return {
    device,
    caps,
    targets: SCENE_TARGETS,
    pipelines,
    defaults: {
      whiteView: white.createView(),
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
  outputFormat: GPUTextureFormat,
  overrides: ShaderOverrides,
): Promise<Pipelines> {
  const { VERTEX, FRAGMENT, COMPUTE } = GPUShaderStage;
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
      // Aerial perspective: in-scatter and transmittance volumes.
      { binding: 7, visibility: FRAGMENT, texture: { viewDimension: "3d" } },
      { binding: 8, visibility: FRAGMENT, texture: { viewDimension: "3d" } },
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
      // Aerial perspective from high up, on a screen grid.
      { binding: 16, visibility: FRAGMENT, texture: {} },
      { binding: 17, visibility: FRAGMENT, texture: {} },
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
      storage(5, false, COMPUTE), // batch counts
      storage(6, true, COMPUTE), // batches
      storage(7, false, COMPUTE), // indirect args
      { binding: 8, visibility: COMPUTE, buffer: { type: "uniform" } },
    ],
  });
  const drawWorldLayout = device.createBindGroupLayout({
    label: "draw.world",
    entries: [
      storage(0, true, VERTEX | FRAGMENT), // records
      storage(1, true, VERTEX), // draw items
      storage(2, true, VERTEX), // vertex streams
      storage(3, true, FRAGMENT), // materials
      storage(4, true, FRAGMENT), // mixed-LOD clip boxes
      // Globe imagery: the world's composited texture array.
      {
        binding: 5,
        visibility: FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d-array" },
      },
      { binding: 6, visibility: FRAGMENT, sampler: { type: "filtering" } },
      // Night lights: the same, emitted light.
      {
        binding: 7,
        visibility: FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d-array" },
      },
    ],
  });
  const textureSetLayout = device.createBindGroupLayout({
    label: "textureSet",
    entries: [
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
    ],
  });
  const scatterLayout = device.createBindGroupLayout({
    label: "scatter",
    entries: [
      { binding: 0, visibility: COMPUTE, buffer: { type: "uniform" } },
      storage(1, true, COMPUTE), // indices, then data
      storage(2, false, COMPUTE), // the table
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
  const opaqueModule =
    overrides.opaque !== undefined
      ? module("opaque (override)", overrides.opaque)
      : module("opaque", commonWgsl, opaqueWgsl);
  const cullModule =
    overrides.cull !== undefined
      ? module("cull (override)", overrides.cull)
      : module("cull", commonWgsl, cullWgsl);
  const cullLayout = device.createPipelineLayout({
    bindGroupLayouts: [viewLayout, cullWorldLayout],
  });
  const opaqueLayout = device.createPipelineLayout({
    bindGroupLayouts: [viewLayout, drawWorldLayout, textureSetLayout],
  });

  const opaquePipeline = (
    label: string,
    cullMode: GPUCullMode,
    topology: GPUPrimitiveTopology = "triangle-list",
  ) =>
    device.createRenderPipelineAsync({
      label,
      layout: opaqueLayout,
      vertex: {
        module: opaqueModule,
        entryPoint: "vs",
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
        module: opaqueModule,
        entryPoint: "fs",
        targets: SCENE_TARGETS.colorFormats.map((format) => ({ format })),
      },
      primitive: { topology, cullMode, frontFace: "ccw" },
      depthStencil: {
        format: SCENE_TARGETS.depthFormat,
        depthWriteEnabled: true,
        depthCompare: "greater",
      },
      multisample: { count: SCENE_TARGETS.sampleCount },
    });
  // Shadow casters always use the built-in module (an override has no
  // `vsDepth` or `shadowFs`).
  const casterModule =
    overrides.opaque !== undefined
      ? module("opaque", commonWgsl, opaqueWgsl)
      : opaqueModule;
  const shadowPipeline = (
    label: string,
    cullMode: GPUCullMode,
    masked: boolean,
  ) =>
    device.createRenderPipelineAsync({
      label,
      layout: opaqueLayout,
      vertex: {
        module: casterModule,
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
        module: casterModule,
        entryPoint: masked ? "shadowFs" : "shadowPlaceholderFs",
        targets: [],
      },
      primitive: { topology: "triangle-list", cullMode, frontFace: "ccw" },
      depthStencil: {
        format: "depth32float",
        depthWriteEnabled: true,
        depthCompare: "greater",
        // Away from the sun (reverse-Z: smaller), more where the surface
        // slopes away from it.
        depthBias: -2,
        depthBiasSlopeScale: -1.5,
        depthBiasClamp: 0,
      },
    });

  // The prepass: single-sampled depth and normals, the casters' vertex
  // stage (no aerial perspective) and discards.
  const prepassPipeline = (label: string, cullMode: GPUCullMode) =>
    device.createRenderPipelineAsync({
      label,
      layout: opaqueLayout,
      vertex: {
        module: casterModule,
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
        module: casterModule,
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

  const [
    cullRecords,
    cullInstances,
    writeDrawArgs,
    opaque,
    opaqueDoubleSided,
    opaqueLines,
    shadow,
    shadowDoubleSided,
    shadowMasked,
    shadowMaskedDoubleSided,
    prepass,
    prepassDoubleSided,
    aoTrace,
    aoDenoise,
    present,
    overlay,
    pick,
    scatter,
    raycast,
    meter,
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
    opaquePipeline("opaque", "back"),
    opaquePipeline("opaque.doubleSided", "none"),
    opaquePipeline("opaque.lines", "none", "line-list"),
    shadowPipeline("shadow", "back", false),
    shadowPipeline("shadow.doubleSided", "none", false),
    shadowPipeline("shadow.masked", "back", true),
    shadowPipeline("shadow.maskedDoubleSided", "none", true),
    prepassPipeline("prepass", "back"),
    prepassPipeline("prepass.doubleSided", "none"),
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
      layout: "auto",
      vertex: { module: module("present", presentWgsl), entryPoint: "vs" },
      fragment: {
        module: module("present", presentWgsl),
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
        module: module("overlay", commonWgsl, overlayWgsl),
        entryPoint: "vs",
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
          },
        ],
      },
      fragment: {
        module: module("overlay", commonWgsl, overlayWgsl),
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
        module: module("raycast", commonWgsl, raycastWgsl),
        entryPoint: "main",
      },
    }),
    device.createComputePipelineAsync({
      label: "meter",
      layout: "auto",
      compute: { module: module("meter", meterWgsl), entryPoint: "main" },
    }),
  ]);

  return {
    viewLayout,
    cullWorldLayout,
    drawWorldLayout,
    textureSetLayout,
    cullRecords,
    cullInstances,
    writeDrawArgs,
    opaque,
    opaqueDoubleSided,
    opaqueLines,
    shadow,
    shadowDoubleSided,
    shadowMasked,
    shadowMaskedDoubleSided,
    prepass,
    prepassDoubleSided,
    aoTrace,
    aoDenoise,
    present,
    overlay,
    overlayLayout,
    pick,
    scatter,
    scatterLayout,
    raycast,
    meter,
  };
}
