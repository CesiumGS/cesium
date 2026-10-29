import type { Capabilities } from "../gpu/GpuDevice.ts";
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
  prep: GPUComputePipeline;
  opaque: GPURenderPipeline;
  present: GPURenderPipeline;
  overlay: GPURenderPipeline;
  overlayLayout: GPUBindGroupLayout;
  pick: GPUComputePipeline;
}

/** Device-level state shared by the engine, worlds and views. */
export interface RenderContext {
  device: GPUDevice;
  caps: Capabilities;
  targets: typeof SCENE_TARGETS;
  pipelines: Pipelines;
  outputFormat: GPUTextureFormat;
  /** Uniform buffer each view's block is copied into before its passes run. */
  currentViewBuffer: GPUBuffer;
  currentViewBindGroup: GPUBindGroup;
}

export async function createRenderContext(
  device: GPUDevice,
  caps: Capabilities,
  outputFormat: GPUTextureFormat,
): Promise<RenderContext> {
  const pipelines = await createPipelines(device, caps, outputFormat);
  const currentViewBuffer = device.createBuffer({
    label: "currentView",
    size: VIEW_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const currentViewBindGroup = device.createBindGroup({
    label: "currentView",
    layout: pipelines.viewLayout,
    entries: [{ binding: 0, resource: { buffer: currentViewBuffer } }],
  });
  return {
    device,
    caps,
    targets: SCENE_TARGETS,
    pipelines,
    outputFormat,
    currentViewBuffer,
    currentViewBindGroup,
  };
}

async function createPipelines(
  device: GPUDevice,
  caps: Capabilities,
  outputFormat: GPUTextureFormat,
): Promise<Pipelines> {
  const viewLayout = device.createBindGroupLayout({
    label: "view",
    entries: [
      {
        binding: 0,
        visibility:
          GPUShaderStage.VERTEX |
          GPUShaderStage.FRAGMENT |
          GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });
  const prepWorldLayout = device.createBindGroupLayout({
    label: "prep.world",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });
  const drawWorldLayout = device.createBindGroupLayout({
    label: "draw.world",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
    ],
  });
  const overlayLayout = device.createBindGroupLayout({
    label: "overlay",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  const module = (label: string, ...sources: string[]) =>
    device.createShaderModule({ label, code: sources.join("\n") });

  // Per-draw index: instance_index when firstInstance works in indirect
  // draws; otherwise an instance-step vertex attribute.
  const opaqueSource = caps.indirectFirstInstance
    ? opaqueWgsl
        .replace("DRAW_INDEX_PARAM", "@builtin(instance_index) drawIndex: u32")
        .replace("DRAW_INDEX_EXPR", "drawIndex")
    : opaqueWgsl
        .replace("DRAW_INDEX_PARAM", "@location(0) drawIndex: u32")
        .replace("DRAW_INDEX_EXPR", "drawIndex");
  const opaqueModule = module("opaque", commonWgsl, opaqueSource);

  const [prep, opaque, present, overlay, pick] = await Promise.all([
    device.createComputePipelineAsync({
      label: "prep",
      layout: device.createPipelineLayout({
        bindGroupLayouts: [viewLayout, prepWorldLayout],
      }),
      compute: {
        module: module("prep", commonWgsl, prepWgsl),
        entryPoint: "main",
      },
    }),
    device.createRenderPipelineAsync({
      label: "opaque",
      layout: device.createPipelineLayout({
        bindGroupLayouts: [viewLayout, drawWorldLayout],
      }),
      vertex: {
        module: opaqueModule,
        entryPoint: "vs",
        buffers: caps.indirectFirstInstance
          ? []
          : [
              {
                arrayStride: 4,
                stepMode: "instance",
                attributes: [
                  { shaderLocation: 0, offset: 0, format: "uint32" },
                ],
              },
            ],
      },
      fragment: {
        module: opaqueModule,
        entryPoint: "fs",
        targets: SCENE_TARGETS.colorFormats.map((format) => ({ format })),
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
        frontFace: "ccw",
      },
      depthStencil: {
        format: SCENE_TARGETS.depthFormat,
        depthWriteEnabled: true,
        depthCompare: "greater",
      },
      multisample: { count: SCENE_TARGETS.sampleCount },
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
  ]);

  return {
    viewLayout,
    prepWorldLayout,
    drawWorldLayout,
    prep,
    opaque,
    present,
    overlay,
    overlayLayout,
    pick,
  };
}
