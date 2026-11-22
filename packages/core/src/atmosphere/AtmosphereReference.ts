import referenceWgsl from "../shaders/generated/reference.wgsl?raw";
import { EARTH, type AtmosphereParameters } from "./model.ts";
import {
  CIE_1931,
  MAX_LUMINOUS_EFFICACY,
  OZONE_CROSS_SECTION,
  SOLAR_IRRADIANCE,
  XYZ_TO_LINEAR_SRGB,
} from "./spectra.ts";

type V3 = readonly [number, number, number];

export interface ReferenceOptions {
  /** The observer, relative to the planet's center, meters. */
  observer: V3;
  /** Unit vector toward the sun, in the same frame. */
  sun: V3;
  /** Unit view directions in the same frame, xyz per direction. */
  directions: Float64Array | Float32Array | number[];
  /** Paths per direction (a multiple of 32 keeps wavelengths stratified). */
  samples: number;
  /** Scattering events per path (1: single scattering). Default 64. */
  maxScattering?: number;
  /** Count light reflected by the ground. Default true. */
  groundReflection?: boolean;
  parameters?: AtmosphereParameters;
  seed?: number;
}

export interface ReferenceResult {
  /** Linear sRGB (Rec. 709) radiance per direction, cd/m², rgb triples. */
  rgb: Float64Array;
  /** Luminance per direction, cd/m². */
  luminance: Float64Array;
}

/** Paths per direction in one dispatch (keeps each dispatch short). */
const SAMPLES_PER_DISPATCH = 32;

/**
 * The reference atmosphere (reference.slang): sky radiance by spectral
 * Monte Carlo path tracing, for judging real-time approximations. A test
 * oracle, not a renderer: seconds per call.
 */
export class AtmosphereReference {
  private readonly pipeline: GPUComputePipeline;
  private readonly spectra: GPUBuffer;

  private constructor(
    private readonly device: GPUDevice,
    pipeline: GPUComputePipeline,
  ) {
    this.pipeline = pipeline;
    const data = new Float32Array(48 + 48 + 95 * 3);
    data.set(SOLAR_IRRADIANCE, 0);
    data.set(
      OZONE_CROSS_SECTION.map((v) => v * 1e25),
      48,
    );
    for (let i = 0; i < 95; i++) {
      for (let k = 0; k < 3; k++) {
        data[96 + i * 3 + k] = CIE_1931[i * 4 + 1 + k]!;
      }
    }
    this.spectra = device.createBuffer({
      label: "atmosphere.reference.spectra",
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.spectra, 0, data);
  }

  static async create(device: GPUDevice): Promise<AtmosphereReference> {
    const module = device.createShaderModule({
      label: "atmosphere.reference",
      code: referenceWgsl,
    });
    const pipeline = await device.createComputePipelineAsync({
      label: "atmosphere.reference",
      layout: "auto",
      compute: { module, entryPoint: "main" },
    });
    return new AtmosphereReference(device, pipeline);
  }

  async radiance(options: ReferenceOptions): Promise<ReferenceResult> {
    const device = this.device;
    const p = options.parameters ?? EARTH;
    const count = options.directions.length / 3;
    // A frame with the observer on +z: rotate the sun and the directions.
    const o = options.observer;
    const radius = Math.hypot(o[0], o[1], o[2]);
    const rotate = toZUp([o[0] / radius, o[1] / radius, o[2] / radius]);
    const sun = rotate(options.sun);
    const dirs = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const d = rotate([
        options.directions[i * 3]!,
        options.directions[i * 3 + 1]!,
        options.directions[i * 3 + 2]!,
      ]);
      dirs.set(d, i * 4);
    }
    const directions = device.createBuffer({
      label: "atmosphere.reference.directions",
      size: dirs.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(directions, 0, dirs);
    const accum = device.createBuffer({
      label: "atmosphere.reference.accum",
      size: count * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const paramsBuffer = device.createBuffer({
      label: "atmosphere.reference.params",
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: directions } },
        { binding: 2, resource: { buffer: accum } },
        { binding: 3, resource: { buffer: this.spectra } },
      ],
    });
    const dispatches = Math.ceil(options.samples / SAMPLES_PER_DISPATCH);
    const seed = options.seed ?? 1;
    // Ozone cross-sections are uploaded ×1e25 (f32 range); the density
    // carries the inverse.
    const ozoneMaxDensity = ((p.ozoneDobson * 2.687e20) / 15000) * 1e-25;
    for (let i = 0; i < dispatches; i++) {
      const data = new ArrayBuffer(96);
      const f = new Float32Array(data);
      const u = new Uint32Array(data);
      f[0] = radius - p.bottomRadius;
      u[1] = SAMPLES_PER_DISPATCH;
      u[2] = seed * 7919 + i * SAMPLES_PER_DISPATCH;
      u[3] = count;
      f.set(sun, 4);
      u[7] = options.maxScattering ?? 64;
      f[8] = p.bottomRadius;
      f[9] = p.topRadius;
      f[10] = p.rayleigh;
      f[11] = p.rayleighScaleHeight;
      f[12] = p.mieBeta;
      f[13] = p.mieAngstromAlpha;
      f[14] = p.mieScaleHeight;
      f[15] = p.mieSingleScatteringAlbedo;
      f[16] = p.miePhaseG;
      f[17] = ozoneMaxDensity;
      f[18] = p.groundAlbedo;
      u[19] = options.groundReflection === false ? 0 : 1;
      device.queue.writeBuffer(paramsBuffer, 0, data);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(count / 64));
      pass.end();
      device.queue.submit([encoder.finish()]);
      // One dispatch in flight at a time: each is long.
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
    directions.destroy();
    accum.destroy();
    paramsBuffer.destroy();

    const rgb = new Float64Array(count * 3);
    const luminance = new Float64Array(count);
    const m = XYZ_TO_LINEAR_SRGB;
    for (let i = 0; i < count; i++) {
      const n = sums[i * 4 + 3]!;
      const x = (MAX_LUMINOUS_EFFICACY * sums[i * 4]!) / n;
      const y = (MAX_LUMINOUS_EFFICACY * sums[i * 4 + 1]!) / n;
      const z = (MAX_LUMINOUS_EFFICACY * sums[i * 4 + 2]!) / n;
      for (let r = 0; r < 3; r++) {
        rgb[i * 3 + r] = m[r * 3]! * x + m[r * 3 + 1]! * y + m[r * 3 + 2]! * z;
      }
      luminance[i] = y;
    }
    return { rgb, luminance };
  }

  destroy(): void {
    this.spectra.destroy();
  }
}

/** A rotation taking unit `up` to +z (any rotation about it will do). */
export function toZUp(up: V3): (v: V3) => [number, number, number] {
  // Rodrigues' formula for the rotation from `up` to z.
  const [ux, uy, uz] = up;
  const c = uz;
  if (c > 1 - 1e-12) {
    return (v) => [v[0], v[1], v[2]];
  }
  if (c < -1 + 1e-12) {
    return (v) => [v[0], -v[1], -v[2]];
  }
  // Axis = up × z = (uy, −ux, 0), normalized; sinθ = |axis|.
  const s = Math.hypot(uy, ux);
  const kx = uy / s;
  const ky = -ux / s;
  return (v) => {
    const [vx, vy, vz] = v;
    const kv = kx * vx + ky * vy;
    const cx = ky * vz;
    const cy = -kx * vz;
    const cz = kx * vy - ky * vx;
    return [
      vx * c + cx * s + kx * kv * (1 - c),
      vy * c + cy * s + ky * kv * (1 - c),
      vz * c + cz * s,
    ];
  };
}
