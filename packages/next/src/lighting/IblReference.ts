import iblReferenceWgsl from "../shaders/generated/iblReference.wgsl?raw";

type V3 = ArrayLike<number>;

export interface ReferenceSphere {
  /** Center (world, Earth-fixed), meters. */
  center: V3;
  radius: number;
  /** Linear base color. */
  baseColor: readonly [number, number, number];
  metallic: number;
  roughness: number;
}

export interface IblReferenceOptions {
  width: number;
  height: number;
  /** The camera: position (world), unit basis, tan of half the field of view. */
  camera: {
    position: V3;
    direction: V3;
    up: V3;
    right: V3;
    tanX: number;
    tanY: number;
  };
  /** World → environment frame, three rows (2.0's iblFrame). */
  environmentFrame: readonly [V3, V3, V3];
  /** The environment's radiance cube (rgba16float, sampled at level 0). */
  environment: GPUTexture;
  spheres: ReferenceSphere[];
  /** Sample pairs (cosine + visible normal) per pixel. */
  samples: number;
}

export interface IblReferenceImage {
  width: number;
  height: number;
  /** Linear RGBA per pixel, rows from the top; alpha 1 where a sphere is. */
  data: Float32Array;
}

const SAMPLES_PER_DISPATCH = 64;

/**
 * Environment lighting by Monte Carlo integration of the glTF BRDF
 * (iblReference.slang): the reference 2.0's real-time image-based lighting
 * (spherical harmonics, prefiltered specular, split sum) is judged against.
 */
export class IblReference {
  private constructor(
    private readonly device: GPUDevice,
    private readonly pipeline: GPUComputePipeline,
    private readonly sampler: GPUSampler,
  ) {}

  static async create(device: GPUDevice): Promise<IblReference> {
    const module = device.createShaderModule({
      label: "ibl.reference",
      code: iblReferenceWgsl,
    });
    const pipeline = await device.createComputePipelineAsync({
      label: "ibl.reference",
      layout: "auto",
      compute: { module, entryPoint: "main" },
    });
    const sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });
    return new IblReference(device, pipeline, sampler);
  }

  async render(options: IblReferenceOptions): Promise<IblReferenceImage> {
    const device = this.device;
    const { width, height, camera } = options;
    const count = width * height;
    const spheres = new Float32Array(options.spheres.length * 12);
    options.spheres.forEach((s, i) => {
      const o = i * 12;
      for (let k = 0; k < 3; k++) {
        // Relative to the camera in float64 before rounding to float32.
        spheres[o + k] = s.center[k]! - camera.position[k]!;
      }
      spheres[o + 3] = s.radius;
      spheres.set(s.baseColor, o + 4);
      spheres[o + 7] = s.metallic;
      spheres[o + 8] = s.roughness;
    });
    const sphereBuffer = device.createBuffer({
      label: "ibl.reference.spheres",
      size: Math.max(spheres.byteLength, 48),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(sphereBuffer, 0, spheres);
    const accum = device.createBuffer({
      label: "ibl.reference.accum",
      size: count * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const paramsBuffer = device.createBuffer({
      label: "ibl.reference.params",
      size: 112,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: sphereBuffer } },
        {
          binding: 2,
          resource: options.environment.createView({ dimension: "cube" }),
        },
        { binding: 3, resource: this.sampler },
        { binding: 4, resource: { buffer: accum } },
      ],
    });
    const dispatches = Math.ceil(options.samples / SAMPLES_PER_DISPATCH);
    for (let i = 0; i < dispatches; i++) {
      const data = new ArrayBuffer(112);
      const f = new Float32Array(data);
      const u = new Uint32Array(data);
      u[0] = width;
      u[1] = height;
      u[2] = SAMPLES_PER_DISPATCH;
      u[3] = i + 1;
      f.set(Array.from(camera.direction), 4);
      f[7] = camera.tanX;
      f.set(Array.from(camera.up), 8);
      f[11] = camera.tanY;
      f.set(Array.from(camera.right), 12);
      u[15] = options.spheres.length;
      f.set(Array.from(options.environmentFrame[0]), 16);
      f.set(Array.from(options.environmentFrame[1]), 20);
      f.set(Array.from(options.environmentFrame[2]), 24);
      device.queue.writeBuffer(paramsBuffer, 0, data);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
      pass.end();
      device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone();
    }
    const readback = device.createBuffer({
      size: count * 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(accum, 0, readback, 0, count * 16);
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const sums = new Float32Array(readback.getMappedRange().slice(0));
    readback.destroy();
    accum.destroy();
    sphereBuffer.destroy();
    paramsBuffer.destroy();
    const data = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const n = sums[i * 4 + 3]! * SAMPLES_PER_DISPATCH;
      if (n > 0) {
        data[i * 4] = sums[i * 4]! / n;
        data[i * 4 + 1] = sums[i * 4 + 1]! / n;
        data[i * 4 + 2] = sums[i * 4 + 2]! / n;
        data[i * 4 + 3] = 1;
      }
    }
    return { width, height, data };
  }
}
