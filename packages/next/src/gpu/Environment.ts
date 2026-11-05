import iblWgsl from "../shaders/generated/ibl.wgsl?raw";
import { MipGenerator } from "./MipGenerator.ts";

export interface SkyOptions {
  /**
   * Linear radiance at the zenith, the horizon and the ground: cd/m² for
   * physical scenes (`DEFAULT_SKY`), unitless for 1.x-style ones
   * (`UNITLESS_SKY`).
   */
  zenith: readonly [number, number, number];
  horizon: readonly [number, number, number];
  ground: readonly [number, number, number];
  /** Just below the horizon, blending to `ground` (default: half `horizon`). */
  belowHorizon?: readonly [number, number, number];
}

/**
 * The procedural sky without units, as 2.0 lit scenes before physical
 * units (with a sun of 2 and an exposure scale of 1, like 1.x).
 */
export const UNITLESS_SKY: SkyOptions = {
  zenith: [0.18, 0.32, 0.65],
  horizon: [0.62, 0.72, 0.85],
  ground: [0.2, 0.18, 0.15],
};

/** cd/m² per unit of `UNITLESS_SKY` for the physical default. */
const SKY_LUMINANCE = 12_000;

/**
 * The default sky in cd/m², until the atmosphere replaces it: the unitless
 * gradient scaled so its diffuse horizontal illuminance is about 13 klx (a
 * clear sky's; zenith about 3,800 cd/m², horizon 8,500).
 */
export const DEFAULT_SKY: SkyOptions = {
  zenith: UNITLESS_SKY.zenith.map((c) => c * SKY_LUMINANCE) as [
    number,
    number,
    number,
  ],
  horizon: UNITLESS_SKY.horizon.map((c) => c * SKY_LUMINANCE) as [
    number,
    number,
    number,
  ],
  ground: UNITLESS_SKY.ground.map((c) => c * SKY_LUMINANCE) as [
    number,
    number,
    number,
  ],
};

const SKY_SIZE = 128;
const SPECULAR_SIZE = 128;
const SPECULAR_LEVELS = 6;
const SH_SOURCE_LEVEL = 2; // 32×32 faces
/**
 * GGX samples per prefiltered texel, by level from the first blurred one
 * (filtered importance sampling: each sample reads a level as blurred as
 * its share of the lobe, so a few dozen do what hundreds did, Křivánek
 * and Colbert 2008). 256 at every level made the prefilter most of a
 * rebuild's 4 ms.
 */
const PREFILTER_SAMPLES = [64, 32, 32, 32, 32];
/**
 * The irradiance cube's faces: irradiance is smooth (a cosine's integral),
 * so 16 texels a face (5.6°) hold it, with a quarter of the integral's
 * work of 32.
 */
const IRRADIANCE_SIZE = 16;
/** The radiance it integrates: 16 × 16 faces (1,536 texels per output). */
const IRRADIANCE_SOURCE_LEVEL = 3;
const BRDF_SIZE = 64;

type Groups = [number, number, number];

/**
 * An environment's radiance and what lighting reads from it: the radiance
 * cube (in the environment frame: east, up, −north), its GGX-prefiltered
 * specular cube, its irradiance cube, and its irradiance SH (9 × vec4, E/π
 * form; for reading back and comparing with 1.x, which lights with it).
 */
export interface EnvironmentProbe {
  readonly skyCube: GPUTexture;
  readonly specularCube: GPUTexture;
  /** Diffuse irradiance (E/π) by normal: what shading reads. */
  readonly irradianceCube: GPUTexture;
  readonly sh: GPUBuffer;
}

/**
 * Image-based lighting resources, built entirely on the GPU by compute
 * shaders (src/shaders/ibl.slang): environment radiance cubes, GGX-
 * prefiltered specular cubes, SH9 irradiance coefficients and the
 * split-sum BRDF table.
 *
 * Lighting reads one specular cube and one SH buffer (`specularView`,
 * `shBuffer`, bound once). Probes are environments built apart (the
 * procedural sky of `setSky`, a view's atmosphere), each copied into the
 * bound ones by `select` before the draws that use it. Regenerating reuses
 * the same GPU objects, so bind groups stay valid.
 */
export class Environment {
  readonly specularCube: GPUTexture;
  readonly specularView: GPUTextureView;
  readonly irradianceCube: GPUTexture;
  readonly irradianceView: GPUTextureView;
  readonly brdfLut: GPUTexture;
  readonly brdfView: GPUTextureView;
  /** 9 × vec4: irradiance SH in E/π form (see shFinal in ibl.slang). */
  readonly shBuffer: GPUBuffer;
  readonly sampler: GPUSampler;
  readonly maxLod = SPECULAR_LEVELS - 1;
  /** The procedural sky (`setSky`). */
  readonly procedural: EnvironmentProbe;
  /** The probe last copied into the bound cube and SH. */
  private current: EnvironmentProbe | undefined;
  private readonly shPartial: GPUBuffer;
  /** The prefilter's uniforms per specular level (constant). */
  private readonly prefilterParams: GPUBuffer[];
  private readonly module: GPUShaderModule;
  private readonly pipelines = new Map<string, GPUComputePipeline>();

  /**
   * Creates the environment with its kernels compiled off the main thread
   * (in parallel with whatever else is compiling), then builds the BRDF LUT.
   */
  static async create(device: GPUDevice): Promise<Environment> {
    const environment = new Environment(device);
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
    ]);
    const encoder = device.createCommandEncoder({ label: "env.brdf" });
    environment.run(encoder, "brdf", undefined, { 7: environment.brdfView }, [
      BRDF_SIZE / 8,
      BRDF_SIZE / 8,
      1,
    ]);
    device.queue.submit([encoder.finish()]);
    return environment;
  }

  private constructor(private readonly device: GPUDevice) {
    this.specularCube = specularCube(device, "env.specular", COPY_DST);
    this.specularView = this.specularCube.createView({ dimension: "cube" });
    this.irradianceCube = irradianceCube(
      device,
      "env.irradiance",
      COPY_DST | COPY_SRC,
    );
    this.irradianceView = this.irradianceCube.createView({
      dimension: "cube",
    });
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
        GPUBufferUsage.UNIFORM |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
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
    this.prefilterParams = Array.from({ length: SPECULAR_LEVELS }, (_, mip) =>
      this.params(
        SPECULAR_SIZE >> mip,
        mip,
        PREFILTER_SAMPLES[Math.max(mip - 1, 0)] ?? 32,
      ),
    );
    this.procedural = this.createProbe("env.procedural");
  }

  /** The procedural sky's radiance cube. */
  get skyCube(): GPUTexture {
    return this.procedural.skyCube;
  }

  /** A probe's textures, for `build` and `select`. */
  createProbe(label = "env.probe"): EnvironmentProbe {
    const device = this.device;
    return {
      skyCube: device.createTexture({
        label: `${label}.sky`,
        size: [SKY_SIZE, SKY_SIZE, 6],
        format: "rgba16float",
        mipLevelCount: MipGenerator.levelCount(SKY_SIZE, SKY_SIZE),
        usage:
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.RENDER_ATTACHMENT,
      }),
      specularCube: specularCube(device, `${label}.specular`, COPY_SRC),
      irradianceCube: irradianceCube(device, `${label}.irradiance`, COPY_SRC),
      sh: device.createBuffer({
        label: `${label}.sh`,
        size: 9 * 16,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      }),
    };
  }

  destroyProbe(probe: EnvironmentProbe): void {
    if (this.current === probe) {
      this.current = undefined;
    }
    probe.skyCube.destroy();
    probe.specularCube.destroy();
    probe.irradianceCube.destroy();
    probe.sh.destroy();
  }

  /** Renders `sky` into the procedural probe, builds it and selects it. */
  setSky(sky: SkyOptions = DEFAULT_SKY): void {
    const params = this.params(SKY_SIZE, 0, 0, sky);
    const encoder = this.device.createCommandEncoder({ label: "env.sky" });
    this.run(
      encoder,
      "sky",
      params,
      { 0: level(this.procedural.skyCube, 0) },
      faces(SKY_SIZE),
    );
    this.build(this.procedural, encoder);
    this.select(encoder, this.procedural);
    this.device.queue.submit([encoder.finish()]);
    params.destroy();
  }

  /**
   * Encodes building a probe from the radiance in its sky cube's top
   * level: the cube's mips, the prefiltered specular cube, the irradiance
   * cube and the SH.
   */
  build(probe: EnvironmentProbe, encoder: GPUCommandEncoder): void {
    for (let mip = 1; mip < probe.skyCube.mipLevelCount; mip++) {
      this.run(
        encoder,
        "downsample",
        undefined,
        {
          10: level(probe.skyCube, mip - 1),
          11: level(probe.skyCube, mip),
        },
        faces(SKY_SIZE >> mip),
      );
    }
    const skyView = probe.skyCube.createView({ dimension: "cube" });
    for (let mip = 0; mip < SPECULAR_LEVELS; mip++) {
      this.run(
        encoder,
        "prefilter",
        this.prefilterParams[mip],
        { 1: skyView, 2: this.sampler, 3: level(probe.specularCube, mip) },
        faces(SPECULAR_SIZE >> mip),
      );
    }
    this.run(
      encoder,
      "shFace",
      undefined,
      {
        4: level(probe.skyCube, SH_SOURCE_LEVEL),
        5: { buffer: this.shPartial },
      },
      [6, 1, 1],
    );
    this.run(
      encoder,
      "shFinal",
      undefined,
      { 5: { buffer: this.shPartial }, 6: { buffer: probe.sh } },
      [1, 1, 1],
    );
    this.run(
      encoder,
      "irradianceCube",
      undefined,
      {
        8: level(probe.skyCube, IRRADIANCE_SOURCE_LEVEL),
        9: level(probe.irradianceCube, 0),
      },
      faces(IRRADIANCE_SIZE),
    );
    if (this.current === probe) {
      this.current = undefined;
    }
  }

  /**
   * Makes `probe` the environment lighting reads, for the draws encoded
   * after this: copies its specular and irradiance cubes and SH into the
   * bound ones, unless they already hold it.
   */
  select(encoder: GPUCommandEncoder, probe: EnvironmentProbe): void {
    if (this.current === probe) {
      return;
    }
    this.current = probe;
    for (let mip = 0; mip < SPECULAR_LEVELS; mip++) {
      const size = SPECULAR_SIZE >> mip;
      encoder.copyTextureToTexture(
        { texture: probe.specularCube, mipLevel: mip },
        { texture: this.specularCube, mipLevel: mip },
        [size, size, 6],
      );
    }
    encoder.copyTextureToTexture(
      { texture: probe.irradianceCube },
      { texture: this.irradianceCube },
      [IRRADIANCE_SIZE, IRRADIANCE_SIZE, 6],
    );
    encoder.copyBufferToBuffer(probe.sh, 0, this.shBuffer, 0, 9 * 16);
  }

  /**
   * Reads the bound irradiance cube at the zenith (E/π, linear rgb): the
   * diffuse light on a horizontal surface, divided by π.
   */
  async readIrradianceUp(): Promise<[number, number, number]> {
    // Face +Y (2): its center is the zenith, between four texels.
    const half = IRRADIANCE_SIZE / 2;
    const readback = this.device.createBuffer({
      size: 256 * 2,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture: this.irradianceCube, origin: [half - 1, half - 1, 2] },
      { buffer: readback, bytesPerRow: 256 },
      [2, 2, 1],
    );
    this.device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const halves = new Uint16Array(readback.getMappedRange().slice(0));
    readback.destroy();
    // Rows are 256 bytes (128 halves) apart; texels 4 halves.
    const channel = (k: number) =>
      [0, 128, 4, 132].reduce(
        (sum, at) => sum + halfToFloat(halves[at + k]!) / 4,
        0,
      );
    return [channel(0), channel(1), channel(2)];
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
    size: number,
    level: number,
    sampleCount = 0,
    sky: SkyOptions = UNITLESS_SKY,
  ): GPUBuffer {
    const buffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM,
      mappedAtCreation: true,
    });
    const range = buffer.getMappedRange();
    const f = new Float32Array(range);
    const u = new Uint32Array(range);
    f.set(sky.zenith, 0);
    f.set(sky.horizon, 4);
    f.set(sky.ground, 8);
    f.set(sky.belowHorizon ?? sky.horizon.map((c) => c * 0.5), 12);
    u[16] = size;
    u[17] = level;
    u[18] = SPECULAR_LEVELS;
    u[19] = sampleCount;
    buffer.unmap();
    return buffer;
  }

  private run(
    encoder: GPUCommandEncoder,
    entry: string,
    params: GPUBuffer | undefined,
    resources: Record<number, GPUBindingResource>,
    groups: Groups,
  ): void {
    const pipeline = this.pipeline(entry);
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
  }

  private pipeline(entry: string): GPUComputePipeline {
    return this.pipelines.get(entry)!;
  }
}

const KERNELS = [
  "brdf",
  "sky",
  "downsample",
  "prefilter",
  "shFace",
  "shFinal",
  "irradianceCube",
] as const;

const COPY_SRC = GPUTextureUsage.COPY_SRC;
const COPY_DST = GPUTextureUsage.COPY_DST;

function specularCube(
  device: GPUDevice,
  label: string,
  extra: number,
): GPUTexture {
  return device.createTexture({
    label,
    size: [SPECULAR_SIZE, SPECULAR_SIZE, 6],
    format: "rgba16float",
    mipLevelCount: SPECULAR_LEVELS,
    usage:
      GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | extra,
  });
}

function irradianceCube(
  device: GPUDevice,
  label: string,
  extra: number,
): GPUTexture {
  return device.createTexture({
    label,
    size: [IRRADIANCE_SIZE, IRRADIANCE_SIZE, 6],
    format: "rgba16float",
    usage:
      GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | extra,
  });
}

function halfToFloat(h: number): number {
  const exponent = (h >> 10) & 0x1f;
  const fraction = h & 0x3ff;
  const sign = h & 0x8000 ? -1 : 1;
  if (exponent === 0) {
    return sign * 2 ** -14 * (fraction / 1024);
  }
  return exponent === 31
    ? Number.NaN
    : sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

/** One mip level of a cube, as the 2D array a compute kernel writes. */
function level(texture: GPUTexture, mip: number): GPUTextureView {
  return texture.createView({
    dimension: "2d-array",
    baseMipLevel: mip,
    mipLevelCount: 1,
  });
}

function faces(size: number): Groups {
  return [Math.ceil(size / 8), Math.ceil(size / 8), 6];
}
