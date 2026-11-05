/**
 * Whether a multisampled fragment shader's storage writes run once per
 * covered sample rather than once per pixel. WebGPU doesn't say how many
 * times a fragment shader runs for a pixel; Apple's GPUs (Metal) at 4× run
 * one a covered sample, each seeing the pixel's whole coverage mask, where
 * others run one a pixel. Translucency's lists (translucent.wgsl
 * `fsListSamples`) need to know: one draw of a full-screen triangle into
 * a small 4× target, its fragment shader counting itself.
 */
export async function storageWritesRunPerSample(
  device: GPUDevice,
): Promise<boolean> {
  const size = 8;
  const module = device.createShaderModule({
    label: "sample-rate probe",
    code: /* wgsl */ `
      @group(0) @binding(0) var<storage, read_write> runs: atomic<u32>;
      @vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
        let uv = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
        return vec4f(uv * 2.0 - 1.0, 0.5, 1.0);
      }
      @fragment fn fs(@builtin(sample_mask) mask: u32) {
        if (mask != 0u) {
          atomicAdd(&runs, 1u);
        }
      }`,
  });
  const runs = device.createBuffer({
    label: "sample-rate probe",
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const readback = device.createBuffer({
    label: "sample-rate probe",
    size: 4,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const target = device.createTexture({
    label: "sample-rate probe",
    size: [size, size],
    format: "rgba8unorm",
    sampleCount: 4,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  try {
    const pipeline = await device.createRenderPipelineAsync({
      label: "sample-rate probe",
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [{ format: "rgba8unorm", writeMask: 0 }],
      },
      multisample: { count: 4 },
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view: target.createView(), loadOp: "clear", storeOp: "discard" },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(
      0,
      device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: runs } }],
      }),
    );
    pass.draw(3);
    pass.end();
    encoder.copyBufferToBuffer(runs, 0, readback, 0, 4);
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const count = new Uint32Array(readback.getMappedRange())[0]!;
    readback.unmap();
    // Every pixel fully covered: once a pixel is exactly one run each.
    return count !== size * size;
  } catch {
    // Unknown: per sample is right either way, only slower.
    return true;
  } finally {
    runs.destroy();
    readback.destroy();
    target.destroy();
  }
}
