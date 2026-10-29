import iblWgsl from "../shaders/ibl.wgsl?raw";
import { MipGenerator } from "./MipGenerator.ts";

export interface SkyOptions {
  /** Linear radiance at the zenith, the horizon and the ground. */
  zenith: readonly [number, number, number];
  horizon: readonly [number, number, number];
  ground: readonly [number, number, number];
}

export const DEFAULT_SKY: SkyOptions = {
  zenith: [0.18, 0.32, 0.65],
  horizon: [0.62, 0.72, 0.85],
  ground: [0.2, 0.18, 0.15],
};

const SKY_SIZE = 128;
const SPECULAR_SIZE = 128;
const SPECULAR_LEVELS = 6;
const SH_SOURCE_LEVEL = 2; // 32×32 faces
const BRDF_SIZE = 64;

type Groups = [number, number, number];

/**
 * Image-based lighting resources, built entirely on the GPU by compute
 * shaders (src/shaders/ibl.wgsl): environment radiance cube, GGX-prefiltered
 * specular cube, SH9 irradiance coefficients and the split-sum BRDF table.
 * Regenerating reuses the same GPU objects, so bind groups stay valid.
 */
export class Environment {
  readonly skyCube: GPUTexture;
  readonly specularCube: GPUTexture;
  readonly specularView: GPUTextureView;
  readonly brdfLut: GPUTexture;
  readonly brdfView: GPUTextureView;
  /** 9 × vec4: irradiance SH in E/π form (see shFinal in ibl.wgsl). */
  readonly shBuffer: GPUBuffer;
  readonly sampler: GPUSampler;
  readonly maxLod = SPECULAR_LEVELS - 1;
  private readonly shPartial: GPUBuffer;
  private readonly module: GPUShaderModule;
  private readonly pipelines = new Map<string, GPUComputePipeline>();

  /**
   * Creates the environment with its kernels compiled off the main thread
   * (in parallel with whatever else is compiling), then builds the BRDF LUT.
   */
  static async create(
    device: GPUDevice,
    mips: MipGenerator,
  ): Promise<Environment> {
    const environment = new Environment(device, mips);
    await Promise.all([
      ...KERNELS.map(async (entry) => {
        environment.pipelines.set(
          entry,
          await device.createComputePipelineAsync({
            label: `ibl.${entry}`,
            layout: "auto",
            compute: { module: environment.module, entryPoint: entry },
          }),
        );
      }),
      mips.prepare(environment.skyCube.format),
    ]);
    environment.run("brdf", undefined, { 7: environment.brdfView }, [
      BRDF_SIZE / 8,
      BRDF_SIZE / 8,
      1,
    ]);
    return environment;
  }

  private constructor(
    private readonly device: GPUDevice,
    private readonly mips: MipGenerator,
  ) {
    const cube = (label: string, size: number, levels: number, extra: number) =>
      device.createTexture({
        label,
        size: [size, size, 6],
        format: "rgba16float",
        mipLevelCount: levels,
        usage:
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING |
          extra,
      });
    this.skyCube = cube(
      "env.sky",
      SKY_SIZE,
      MipGenerator.levelCount(SKY_SIZE, SKY_SIZE),
      GPUTextureUsage.RENDER_ATTACHMENT,
    );
    this.specularCube = cube("env.specular", SPECULAR_SIZE, SPECULAR_LEVELS, 0);
    this.specularView = this.specularCube.createView({ dimension: "cube" });
    this.brdfLut = device.createTexture({
      label: "env.brdf",
      size: [BRDF_SIZE, BRDF_SIZE],
      format: "rgba16float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.brdfView = this.brdfLut.createView();
    this.shBuffer = device.createBuffer({
      label: "env.sh",
      size: 9 * 16,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.UNIFORM |
        GPUBufferUsage.COPY_SRC,
    });
    this.shPartial = device.createBuffer({
      label: "env.shPartial",
      size: 6 * 9 * 16,
      usage: GPUBufferUsage.STORAGE,
    });
    this.sampler = device.createSampler({
      label: "env",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    });
    this.module = device.createShaderModule({ label: "ibl", code: iblWgsl });
  }

  /** Renders `sky` into the environment and rebuilds the specular mips and SH. */
  setSky(sky: SkyOptions = DEFAULT_SKY): void {
    const level = (texture: GPUTexture, mip: number) =>
      texture.createView({
        dimension: "2d-array",
        baseMipLevel: mip,
        mipLevelCount: 1,
      });
    const faces = (size: number): Groups => [
      Math.ceil(size / 8),
      Math.ceil(size / 8),
      6,
    ];

    this.run(
      "sky",
      this.params(sky, SKY_SIZE, 0),
      { 0: level(this.skyCube, 0) },
      faces(SKY_SIZE),
    );
    this.mips.generate(this.skyCube);

    const skyView = this.skyCube.createView({ dimension: "cube" });
    for (let mip = 0; mip < SPECULAR_LEVELS; mip++) {
      const size = SPECULAR_SIZE >> mip;
      this.run(
        "prefilter",
        this.params(sky, size, mip, 256),
        { 1: skyView, 2: this.sampler, 3: level(this.specularCube, mip) },
        faces(size),
      );
    }

    this.run(
      "shFace",
      undefined,
      {
        4: level(this.skyCube, SH_SOURCE_LEVEL),
        5: { buffer: this.shPartial },
      },
      [6, 1, 1],
    );
    this.run(
      "shFinal",
      undefined,
      { 5: { buffer: this.shPartial }, 6: { buffer: this.shBuffer } },
      [1, 1, 1],
    );
  }

  /** Reads the irradiance SH back (9 × rgb, E/π form, environment frame). */
  async readSphericalHarmonics(): Promise<Array<[number, number, number]>> {
    const readback = this.device.createBuffer({
      size: 9 * 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.shBuffer, 0, readback, 0, 9 * 16);
    this.device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const data = new Float32Array(readback.getMappedRange().slice(0));
    readback.destroy();
    return Array.from({ length: 9 }, (_, i) => [
      data[i * 4]!,
      data[i * 4 + 1]!,
      data[i * 4 + 2]!,
    ]);
  }

  private params(
    sky: SkyOptions,
    size: number,
    level: number,
    sampleCount = 0,
  ): GPUBuffer {
    const buffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM,
      mappedAtCreation: true,
    });
    const range = buffer.getMappedRange();
    const f = new Float32Array(range);
    const u = new Uint32Array(range);
    f.set(sky.zenith, 0);
    f.set(sky.horizon, 4);
    f.set(sky.ground, 8);
    u[12] = size;
    u[13] = level;
    u[14] = SPECULAR_LEVELS;
    u[15] = sampleCount;
    buffer.unmap();
    return buffer;
  }

  private run(
    entry: string,
    params: GPUBuffer | undefined,
    resources: Record<number, GPUBindingResource>,
    groups: Groups,
  ): void {
    const pipeline = this.pipeline(entry);
    const encoder = this.device.createCommandEncoder({ label: `ibl.${entry}` });
    const pass = encoder.beginComputePass({ label: `ibl.${entry}` });
    pass.setPipeline(pipeline);
    if (params) {
      pass.setBindGroup(
        0,
        this.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: params } }],
        }),
      );
    }
    pass.setBindGroup(
      1,
      this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(1),
        entries: Object.entries(resources).map(([binding, resource]) => ({
          binding: Number(binding),
          resource,
        })),
      }),
    );
    pass.dispatchWorkgroups(...groups);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    params?.destroy();
  }

  private pipeline(entry: string): GPUComputePipeline {
    return this.pipelines.get(entry)!;
  }
}

const KERNELS = ["brdf", "sky", "prefilter", "shFace", "shFinal"] as const;
