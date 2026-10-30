import type { Capabilities } from "../gpu/GpuDevice.ts";
import { MipGenerator } from "../gpu/MipGenerator.ts";
import { Environment } from "../gpu/Environment.ts";
import { VIEW_SIZE } from "../render/layout.ts";
import commonWgsl from "../shaders/common.wgsl?raw";
import prepWgsl from "../shaders/prep.wgsl?raw";
import opaqueWgsl from "../shaders/opaque.wgsl?raw";
import presentWgsl from "../shaders/present.wgsl?raw";
import overlayWgsl from "../shaders/overlay.wgsl?raw";
import pickWgsl from "../shaders/pick.wgsl?raw";

/**
 * The single render-target configuration views draw their 3D content into.
 * Render bundles are keyed on it, so every view shares one bundle per world.
 * Views differ only after the bundle runs (present, post, overlays).
 */
export const SCENE_TARGETS = {
  // r32uint cannot be multisampled in WebGPU, so 32-bit feature IDs are
  // split across the two channels of rg16uint (lo, hi).
  colorFormats: ["rgba16float", "rg16uint"] as GPUTextureFormat[],
  depthFormat: "depth32float" as GPUTextureFormat,
  sampleCount: 4,
};

export interface Pipelines {
  viewLayout: GPUBindGroupLayout;
  prepWorldLayout: GPUBindGroupLayout;
  drawWorldLayout: GPUBindGroupLayout;
  textureSetLayout: GPUBindGroupLayout;
  /** Per-record cull and compaction. */
  prep: GPUComputePipeline;
  /** Per-batch indirect args. */
  prepArgs: GPUComputePipeline;
  opaque: GPURenderPipeline;
  opaqueDoubleSided: GPURenderPipeline;
  /** Line-list variant (CAD edges, glTF LINES); same shaders, no culling. */
  opaqueLines: GPURenderPipeline;
  present: GPURenderPipeline;
  overlay: GPURenderPipeline;
  overlayLayout: GPUBindGroupLayout;
  pick: GPUComputePipeline;
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
}

/**
 * Complete WGSL modules that replace the built-in shaders, e.g. output of the
 * Slang toolchain. They must keep the built-in bind group layouts and entry
 * point names (`vs`/`fs` for opaque, `main`/`writeArgs` for prep).
 */
export interface ShaderOverrides {
  opaque?: string;
  prep?: string;
}

export async function createRenderContext(
  device: GPUDevice,
  caps: Capabilities,
  outputFormat: GPUTextureFormat,
  overrides: ShaderOverrides = {},
): Promise<RenderContext> {
  // Everything compiles in parallel: engine pipelines, IBL kernels and the
  // mip generator for the formats glTF textures use.
  const mips = new MipGenerator(device);
  const [pipelines, environment] = await Promise.all([
    createPipelines(device, outputFormat, overrides),
    Environment.create(device, mips),
    mips.prepare("rgba8unorm"),
    mips.prepare("rgba8unorm-srgb"),
  ]);
  const currentViewBuffer = device.createBuffer({
    label: "currentView",
    size: VIEW_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  environment.setSky();
  const currentViewBindGroup = device.createBindGroup({
    label: "currentView",
    layout: pipelines.viewLayout,
    entries: [
      { binding: 0, resource: { buffer: currentViewBuffer } },
      { binding: 1, resource: environment.specularView },
      { binding: 2, resource: environment.sampler },
      { binding: 3, resource: environment.brdfView },
      { binding: 4, resource: { buffer: environment.shBuffer } },
    ],
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
  };
}

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
      { binding: 2, visibility: FRAGMENT, sampler: { type: "filtering" } },
      { binding: 3, visibility: FRAGMENT, texture: {} },
      { binding: 4, visibility: FRAGMENT, buffer: { type: "uniform" } },
    ],
  });
  const prepWorldLayout = device.createBindGroupLayout({
    label: "prep.world",
    entries: [
      storage(0, true, COMPUTE), // records
      storage(1, false, COMPUTE), // instances
      storage(2, false, COMPUTE), // instance list
      storage(3, false, COMPUTE), // batch counts
      storage(4, true, COMPUTE), // batches
      storage(5, false, COMPUTE), // indirect args
      { binding: 6, visibility: COMPUTE, buffer: { type: "uniform" } },
    ],
  });
  const drawWorldLayout = device.createBindGroupLayout({
    label: "draw.world",
    entries: [
      storage(0, true, VERTEX | FRAGMENT), // records
      storage(1, true, VERTEX), // instances
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
  const prepModule =
    overrides.prep !== undefined
      ? module("prep (override)", overrides.prep)
      : module("prep", commonWgsl, prepWgsl);
  const prepLayout = device.createPipelineLayout({
    bindGroupLayouts: [viewLayout, prepWorldLayout],
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

  const [
    prep,
    prepArgs,
    opaque,
    opaqueDoubleSided,
    opaqueLines,
    present,
    overlay,
    pick,
  ] = await Promise.all([
    device.createComputePipelineAsync({
      label: "prep",
      layout: prepLayout,
      compute: { module: prepModule, entryPoint: "main" },
    }),
    device.createComputePipelineAsync({
      label: "prep.args",
      layout: prepLayout,
      compute: { module: prepModule, entryPoint: "writeArgs" },
    }),
    opaquePipeline("opaque", "back"),
    opaquePipeline("opaque.doubleSided", "none"),
    opaquePipeline("opaque.lines", "none", "line-list"),
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
  ]);

  return {
    viewLayout,
    prepWorldLayout,
    drawWorldLayout,
    textureSetLayout,
    prep,
    prepArgs,
    opaque,
    opaqueDoubleSided,
    opaqueLines,
    present,
    overlay,
    overlayLayout,
    pick,
  };
}
