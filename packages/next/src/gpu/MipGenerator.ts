/**
 * Generates a texture's mip chain by successive linear downsampling in render
 * passes. Render passes rather than compute because sRGB formats (used for
 * base color and emissive textures) cannot be bound as storage textures.
 */
const SHADER = /* wgsl */ `
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;

struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VsOut {
  let uv = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var out: VsOut;
  out.position = vec4f(uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  return textureSampleLevel(source, linearSampler, in.uv, 0.0);
}
`;

export class MipGenerator {
  private readonly module: GPUShaderModule;
  private readonly sampler: GPUSampler;
  private readonly pipelines = new Map<GPUTextureFormat, GPURenderPipeline>();

  constructor(private readonly device: GPUDevice) {
    this.module = device.createShaderModule({ label: "mipgen", code: SHADER });
    this.sampler = device.createSampler({
      label: "mipgen",
      minFilter: "linear",
      magFilter: "linear",
    });
  }

  static levelCount(width: number, height: number): number {
    return Math.floor(Math.log2(Math.max(width, height))) + 1;
  }

  /**
   * Fills levels 1..n-1 from level 0 for every array layer (cube faces
   * included). The texture needs RENDER_ATTACHMENT usage.
   */
  generate(texture: GPUTexture): void {
    if (texture.mipLevelCount < 2) {
      return;
    }
    const pipeline = this.pipeline(texture.format);
    const encoder = this.device.createCommandEncoder({ label: "mipgen" });
    const view = (level: number, layer: number) =>
      texture.createView({
        dimension: "2d",
        baseMipLevel: level,
        mipLevelCount: 1,
        baseArrayLayer: layer,
        arrayLayerCount: 1,
      });
    for (let layer = 0; layer < texture.depthOrArrayLayers; layer++) {
      for (let level = 1; level < texture.mipLevelCount; level++) {
        const bindGroup = this.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: view(level - 1, layer) },
            { binding: 1, resource: this.sampler },
          ],
        });
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            { view: view(level, layer), loadOp: "clear", storeOp: "store" },
          ],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
      }
    }
    this.device.queue.submit([encoder.finish()]);
  }

  private pipeline(format: GPUTextureFormat): GPURenderPipeline {
    let pipeline = this.pipelines.get(format);
    if (!pipeline) {
      pipeline = this.device.createRenderPipeline({
        label: `mipgen.${format}`,
        layout: "auto",
        vertex: { module: this.module, entryPoint: "vs" },
        fragment: {
          module: this.module,
          entryPoint: "fs",
          targets: [{ format }],
        },
        primitive: { topology: "triangle-list" },
      });
      this.pipelines.set(format, pipeline);
    }
    return pipeline;
  }
}
