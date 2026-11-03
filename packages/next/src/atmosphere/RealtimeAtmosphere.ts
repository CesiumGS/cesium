import atmosphereWgsl from "./atmosphere.wgsl?raw";
import {
  EARTH,
  coefficients,
  solarIrradiance,
  spectralBands,
  withVisibility,
  type AerosolType,
  type AtmosphereParameters,
} from "./model.ts";

type V3 = readonly [number, number, number];

/** Four of the 8 bands: their parameters and tables. */
export interface AtmosphereGroup {
  wavelengths: number[];
  uniforms: GPUBuffer;
  transmittance: GPUTexture;
  multipleScattering: GPUTexture;
}

/**
 * The real-time atmosphere (atmosphere.wgsl, Hillaire 2020): transmittance
 * and multiple-scattering tables built on the GPU for a set of parameters,
 * at 8 wavelengths (two groups of four, one RGBA table each), and sky
 * radiance from them in linear sRGB, cd/m². `radiance` evaluates directions
 * for checking against the reference (AtmosphereReference); the sky, the
 * environment lighting and aerial perspective build on the same tables.
 */
export class RealtimeAtmosphere {
  /** @internal The two groups of four wavelengths (Sky draws from them). */
  readonly groups: AtmosphereGroup[];
  /** @internal Band weights to sRGB (`spectralBands`), 8 × rgb. */
  readonly weights: Array<[number, number, number]>;
  /** @internal Bilinear, clamped: the tables' sampler. */
  readonly sampler: GPUSampler;
  /** 1 × 1 zero: the multiple-scattering term left out. */
  private readonly zero: GPUTexture;
  private readonly pipelines: Record<
    "transmittanceLut" | "multipleScatteringLut" | "skyProbe",
    GPUComputePipeline
  >;

  /** The parameters the tables are built from (`parameters` with haze). */
  private effective: Readonly<AtmosphereParameters>;
  private visibility_: number | undefined;
  private aerosol_: AerosolType | undefined;

  private constructor(
    private readonly device: GPUDevice,
    pipelines: RealtimeAtmosphere["pipelines"],
    /** The atmosphere as described (its body's); `visibility` hazes it. */
    readonly parameters: AtmosphereParameters,
  ) {
    this.effective = parameters;
    this.pipelines = pipelines;
    const bands = spectralBands(8);
    this.weights = bands.weights;
    // COPY_SRC: Sky gathers both groups for the opaque pass's march.
    const usage =
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC;
    this.groups = [0, 4].map((first) => {
      const wavelengths = bands.centers.slice(first, first + 4);
      const uniforms = device.createBuffer({
        label: "atmosphere.uniforms",
        size: 112,
        usage:
          GPUBufferUsage.UNIFORM |
          GPUBufferUsage.COPY_DST |
          GPUBufferUsage.COPY_SRC,
      });
      device.queue.writeBuffer(
        uniforms,
        0,
        packAtmosphere(parameters, wavelengths),
      );
      return {
        wavelengths,
        uniforms,
        transmittance: device.createTexture({
          label: "atmosphere.transmittance",
          size: [256, 64],
          format: "rgba16float",
          usage,
        }),
        multipleScattering: device.createTexture({
          label: "atmosphere.multipleScattering",
          size: [32, 32],
          format: "rgba16float",
          usage,
        }),
      };
    });
    this.zero = device.createTexture({
      size: [1, 1],
      format: "rgba16float",
      usage: GPUTextureUsage.TEXTURE_BINDING,
    });
    this.sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
    this.build();
  }

  static async create(
    device: GPUDevice,
    parameters: AtmosphereParameters = EARTH,
  ): Promise<RealtimeAtmosphere> {
    const module = device.createShaderModule({
      label: "atmosphere",
      code: atmosphereWgsl,
    });
    const entries = [
      "transmittanceLut",
      "multipleScatteringLut",
      "skyProbe",
    ] as const;
    const built = await Promise.all(
      entries.map((entryPoint) =>
        device.createComputePipelineAsync({
          label: `atmosphere.${entryPoint}`,
          layout: "auto",
          compute: { module, entryPoint },
        }),
      ),
    );
    const pipelines = Object.fromEntries(
      entries.map((e, i) => [e, built[i]!]),
    ) as RealtimeAtmosphere["pipelines"];
    return new RealtimeAtmosphere(device, pipelines, parameters);
  }

  /**
   * Meteorological visibility, km, and the kind of aerosols: the haze
   * (`withVisibility`), the tables rebuilt; no visibility: the parameters'
   * own (Bruneton's Earth, about 220 km, gray aerosols).
   */
  get visibility(): number | undefined {
    return this.visibility_;
  }

  get aerosol(): AerosolType | undefined {
    return this.aerosol_;
  }

  setHaze(kilometers: number | undefined, aerosol?: AerosolType): void {
    if (kilometers === this.visibility_ && aerosol === this.aerosol_) {
      return;
    }
    this.visibility_ = kilometers;
    this.aerosol_ = aerosol;
    this.effective =
      kilometers === undefined
        ? this.parameters
        : withVisibility(this.parameters, kilometers, aerosol);
    for (const g of this.groups) {
      this.device.queue.writeBuffer(
        g.uniforms,
        0,
        packAtmosphere(this.effective, g.wavelengths),
      );
    }
    this.build();
  }

  /** The parameters the tables are built from: with `visibility`'s haze. */
  get effectiveParameters(): Readonly<AtmosphereParameters> {
    return this.effective;
  }

  /** Builds each group's transmittance, then multiple-scattering table. */
  private build(): void {
    const encoder = this.device.createCommandEncoder({
      label: "atmosphere.build",
    });
    for (const g of this.groups) {
      this.pass(
        encoder,
        "transmittanceLut",
        g,
        { 0: g.transmittance.createView() },
        [32, 8],
      );
      // The multiple-scattering table doesn't read itself (uniform phase):
      // a placeholder fills its binding.
      this.pass(
        encoder,
        "multipleScatteringLut",
        g,
        {
          1: g.transmittance.createView(),
          2: this.sampler,
          3: this.zero.createView(),
          4: g.multipleScattering.createView(),
        },
        [4, 4],
      );
    }
    this.device.queue.submit([encoder.finish()]);
  }

  private pass(
    encoder: GPUCommandEncoder,
    name: keyof RealtimeAtmosphere["pipelines"],
    group: AtmosphereGroup,
    resources: Record<number, GPUBindingResource>,
    workgroups: [number, number],
  ): void {
    const pipeline = this.pipelines[name];
    const pass = encoder.beginComputePass({ label: `atmosphere.${name}` });
    pass.setPipeline(pipeline);
    pass.setBindGroup(
      0,
      this.bindGroup(pipeline, 0, { 0: { buffer: group.uniforms } }),
    );
    pass.setBindGroup(1, this.bindGroup(pipeline, 1, resources));
    pass.dispatchWorkgroups(...workgroups);
    pass.end();
  }

  /**
   * Sky radiance seen from `observer` (planet-centered, meters) along unit
   * `directions` with the sun along `sun`: linear sRGB, cd/m², the same
   * units as AtmosphereReference. The planet's sphere is the parameters'
   * bottom radius, centered at the origin. `multipleScattering: false`
   * leaves out Hillaire's term (single scattering, for diagnosis);
   * `maxLength` (meters) stops each ray there, the in-scattered light along
   * that stretch of air (the aerial-perspective volume's; short of the
   * ground, whose light it leaves out).
   */
  async radiance(
    observer: V3,
    sun: V3,
    directions: ArrayLike<number>,
    { steps = 64, multipleScattering = true, maxLength = 1e12 } = {},
  ): Promise<Float64Array> {
    const device = this.device;
    const count = directions.length / 3;
    const dirs = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      dirs[i * 4] = directions[i * 3]!;
      dirs[i * 4 + 1] = directions[i * 3 + 1]!;
      dirs[i * 4 + 2] = directions[i * 3 + 2]!;
    }
    const probe = new ArrayBuffer(48);
    const f = new Float32Array(probe);
    const u = new Uint32Array(probe);
    f.set(
      observer.map((v) => v / 1000),
      0,
    );
    u[3] = count;
    f.set(sun, 4);
    u[7] = steps;
    f[8] = maxLength / 1000;
    const buffer = (size: number, usage: number) =>
      device.createBuffer({ size: Math.max(16, size), usage });
    const probeBuffer = buffer(
      48,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
    device.queue.writeBuffer(probeBuffer, 0, probe);
    const dirBuffer = buffer(
      dirs.byteLength,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    );
    device.queue.writeBuffer(dirBuffer, 0, dirs);
    const outs = this.groups.map(() =>
      buffer(count * 16, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC),
    );
    const readback = buffer(
      count * 32,
      GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    );
    const encoder = device.createCommandEncoder();
    this.groups.forEach((g, i) => {
      this.pass(
        encoder,
        "skyProbe",
        g,
        {
          1: g.transmittance.createView(),
          2: this.sampler,
          3: multipleScattering
            ? g.multipleScattering.createView()
            : this.zero.createView(),
          5: { buffer: probeBuffer },
          6: { buffer: dirBuffer },
          7: { buffer: outs[i]! },
        },
        [Math.ceil(count / 64), 1],
      );
      encoder.copyBufferToBuffer(
        outs[i]!,
        0,
        readback,
        i * count * 16,
        count * 16,
      );
    });
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const spectral = new Float32Array(readback.getMappedRange().slice(0));
    readback.destroy();
    outs.forEach((b) => b.destroy());
    dirBuffer.destroy();
    probeBuffer.destroy();
    const rgb = new Float64Array(count * 3);
    for (let i = 0; i < count; i++) {
      for (let band = 0; band < 8; band++) {
        const group = band >> 2;
        const value = spectral[group * count * 4 + i * 4 + (band & 3)]!;
        const w = this.weights[band]!;
        rgb[i * 3] = rgb[i * 3]! + value * w[0];
        rgb[i * 3 + 1] = rgb[i * 3 + 1]! + value * w[1];
        rgb[i * 3 + 2] = rgb[i * 3 + 2]! + value * w[2];
      }
    }
    return rgb;
  }

  private bindGroup(
    pipeline: GPUComputePipeline,
    index: number,
    resources: Record<number, GPUBindingResource>,
  ): GPUBindGroup {
    return this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(index),
      entries: Object.entries(resources).map(([binding, resource]) => ({
        binding: Number(binding),
        resource,
      })),
    });
  }

  destroy(): void {
    for (const g of this.groups) {
      g.transmittance.destroy();
      g.multipleScattering.destroy();
      g.uniforms.destroy();
    }
    this.zero.destroy();
  }
}

/** The WGSL `Atmosphere` struct for four wavelengths: coefficients per km. */
export function packAtmosphere(
  p: AtmosphereParameters,
  wavelengths: readonly number[],
): Float32Array {
  const c = wavelengths.map((l) => coefficients(p, l));
  const per = (pick: (k: (typeof c)[number]) => number) =>
    c.map((k) => pick(k) * 1000);
  const out = new Float32Array(28);
  out.set(
    per((k) => k.rayleighScattering),
    0,
  );
  out.set(
    per((k) => k.mieScattering),
    4,
  );
  out.set(
    per((k) => k.mieExtinction),
    8,
  );
  out.set(
    per((k) => k.ozoneAbsorption),
    12,
  );
  out.set(wavelengths.map(solarIrradiance), 16);
  out[20] = p.bottomRadius / 1000;
  out[21] = p.topRadius / 1000;
  out[22] = p.rayleighScaleHeight / 1000;
  out[23] = p.mieScaleHeight / 1000;
  out[24] = p.miePhaseG;
  out[25] = p.groundAlbedo;
  return out;
}
