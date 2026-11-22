/**
 * LDR-FLIP on the GPU: the same pipeline as `flip.ts` (its reference
 * implementation, kept for checks) as WebGPU compute passes, so comparing
 * frames doesn't stall the page that is measuring. Each separable filter is
 * a horizontal and a vertical pass over float planes; a last pass computes
 * the per-pixel error and reduces it (per-workgroup sums for the mean, a
 * histogram for the median and 95th percentile, the maximum).
 */
import { DEFAULT_PPD, type FlipResult } from "./flip.ts";

const QC = 0.7;
const QF = 0.5;
const PC = 0.4;
const PT = 0.95;

const RGB2XYZ = [
  0.41238656, 0.35759149, 0.18045049, 0.21263682, 0.71518298, 0.0721802,
  0.01933062, 0.11919716, 0.95037259,
];
const XYZ2RGB = [
  3.24096994, -1.53738318, -0.49861076, -0.96924364, 1.8759675, 0.04155506,
  0.05563008, -0.20397696, 1.05697151,
];
const WHITE = [
  RGB2XYZ[0]! + RGB2XYZ[1]! + RGB2XYZ[2]!,
  RGB2XYZ[3]! + RGB2XYZ[4]! + RGB2XYZ[5]!,
  RGB2XYZ[6]! + RGB2XYZ[7]! + RGB2XYZ[8]!,
];
/** Contrast-sensitivity parameters per opponent channel (a1, b1, a2, b2). */
const CSF = {
  A: [1, 0.0047, 0, 1e-5],
  RG: [1, 0.0053, 0, 1e-5],
  BY: [34.1, 0.04, 13.5, 0.025],
} as const;

/** Histogram bins over [0, 1] for the median and percentiles. */
const BINS = 4096;
const WORKGROUP = 256;

const mat3 = (m: number[]) =>
  `mat3x3f(${[0, 3, 6]
    .map((r) => [m[r], m[r + 1], m[r + 2]])
    .map(([a, b, c]) => `${a}, ${b}, ${c}`)
    .join(", ")})`;

// Source planes per image: Y, Cx, Cz (YCxCz) and Y normalized to [0, 1].
const CONVERT = /* wgsl */ `
struct P { n: u32, plane: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> rgba: array<u32>;
@group(0) @binding(2) var<storage, read_write> planes: array<f32>;
// Rows of RGB2XYZ (WGSL matrices are column-major: transpose on use).
const M = transpose(${mat3(RGB2XYZ)});
const WHITE = vec3f(${WHITE.join(", ")});
fn linear(c: vec3f) -> vec3f {
  return select(pow((c + 0.055) / 1.055, vec3f(2.4)), c / 12.92, c <= vec3f(0.04045));
}
@compute @workgroup_size(${WORKGROUP})
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= p.n) { return; }
  let rgb = linear(unpack4x8unorm(rgba[i]).rgb);
  let xyz = (M * rgb) / WHITE;
  let base = p.plane * p.n;
  planes[base + i] = 116.0 * xyz.y - 16.0;
  planes[base + p.n + i] = 500.0 * (xyz.x - xyz.y);
  planes[base + 2u * p.n + i] = 200.0 * (xyz.y - xyz.z);
  planes[base + 3u * p.n + i] = xyz.y; // (Y + 16) / 116 of the line above
}`;

// One 1D pass of a separable filter: plane `src` of `input` into plane
// `dst` of `output`, edges clamped.
const CONVOLVE = /* wgsl */ `
struct P {
  width: u32, height: u32, radius: u32, kernel: u32,
  src: u32, dst: u32, horizontal: u32, pad: u32,
}
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;
@group(0) @binding(3) var<storage, read> kernels: array<f32>;
@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) g: vec3u) {
  if (g.x >= p.width || g.y >= p.height) { return; }
  let n = p.width * p.height;
  let r = i32(p.radius);
  var sum = 0.0;
  for (var k = -r; k <= r; k++) {
    var x = i32(g.x);
    var y = i32(g.y);
    if (p.horizontal == 1u) {
      x = clamp(x + k, 0, i32(p.width) - 1);
    } else {
      y = clamp(y + k, 0, i32(p.height) - 1);
    }
    sum += kernels[p.kernel + u32(k + r)] * input[p.src * n + u32(y) * p.width + u32(x)];
  }
  output[p.dst * n + g.y * p.width + g.x] = sum;
}`;

// Filtered planes (see FILTERED): reference then test, each A, RG, BY1, BY2,
// edge dx, edge dy, point dx, point dy.
const ERROR = /* wgsl */ `
struct P { n: u32, errors: u32, wBy1: f32, wBy2: f32, cmax: f32, pccmax: f32, pad0: f32, pad1: f32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> f: array<f32>;
@group(0) @binding(2) var<storage, read_write> errors: array<f32>;
@group(0) @binding(3) var<storage, read_write> partial: array<f32>;
@group(0) @binding(4) var<storage, read_write> histogram: array<atomic<u32>>;
const M = transpose(${mat3(RGB2XYZ)});
const MI = transpose(${mat3(XYZ2RGB)});
const WHITE = vec3f(${WHITE.join(", ")});
const D = 6.0 / 29.0;
fn ff(t: f32) -> f32 {
  return select(t / (3.0 * D * D) + 4.0 / 29.0, pow(max(t, 0.0), 1.0 / 3.0), t > D * D * D);
}
fn huntLab(rgb: vec3f) -> vec3f {
  let xyz = (M * rgb) / WHITE;
  let L = 116.0 * ff(xyz.y) - 16.0;
  return vec3f(L, 0.01 * L * 500.0 * (ff(xyz.x) - ff(xyz.y)), 0.01 * L * 200.0 * (ff(xyz.y) - ff(xyz.z)));
}
fn lab(base: u32, i: u32) -> vec3f {
  let y = f[(base + 0u) * p.n + i];
  let cx = f[(base + 1u) * p.n + i];
  let cz = p.wBy1 * f[(base + 2u) * p.n + i] + p.wBy2 * f[(base + 3u) * p.n + i];
  let fy = (y + 16.0) / 116.0;
  let xyz = vec3f(cx / 500.0 + fy, fy, fy - cz / 200.0) * WHITE;
  return huntLab(clamp(MI * xyz, vec3f(0.0), vec3f(1.0)));
}
fn feature(base: u32, i: u32) -> vec2f {
  let e = length(vec2f(f[(base + 4u) * p.n + i], f[(base + 5u) * p.n + i]));
  let q = length(vec2f(f[(base + 6u) * p.n + i], f[(base + 7u) * p.n + i]));
  return vec2f(e, q);
}
var<workgroup> sums: array<f32, ${WORKGROUP}>;
@compute @workgroup_size(${WORKGROUP})
fn main(@builtin(global_invocation_id) g: vec3u, @builtin(local_invocation_index) l: u32, @builtin(workgroup_id) w: vec3u) {
  let i = g.x;
  var value = 0.0;
  if (i < p.n) {
    let r = lab(0u, i);
    let t = lab(8u, i);
    let d = r - t;
    let e = pow(abs(d.x) + length(d.yz), ${QC});
    let deltaC = select(${PT} + ((e - p.pccmax) / (p.cmax - p.pccmax)) * (1.0 - ${PT}), (${PT} / p.pccmax) * e, e < p.pccmax);
    let fr = feature(0u, i);
    let ft = feature(8u, i);
    let fe = max(abs(fr.x - ft.x), abs(fr.y - ft.y));
    let deltaF = pow(fe / sqrt(2.0), ${QF});
    value = pow(deltaC, 1.0 - deltaF);
    if (p.errors == 1u) { errors[i] = value; }
    atomicAdd(&histogram[min(u32(value * ${BINS}.0), ${BINS - 1}u)], 1u);
    atomicMax(&histogram[${BINS}], bitcast<u32>(value));
  }
  sums[l] = value;
  workgroupBarrier();
  for (var s = ${WORKGROUP / 2}u; s > 0u; s >>= 1u) {
    if (l < s) { sums[l] += sums[l + s]; }
    workgroupBarrier();
  }
  if (l == 0u) { partial[w.x] = sums[0]; }
}`;

const FILTERED = 16;

function csfKernels(ppd: number) {
  const maxB = Math.max(...Object.values(CSF).flatMap((p) => [p[1], p[3]]));
  const radius = Math.ceil(3 * Math.sqrt(maxB / (2 * Math.PI * Math.PI)) * ppd);
  const gaussian = (b: number) => {
    const k = new Float32Array(2 * radius + 1);
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const x = i / ppd;
      k[i + radius] = Math.exp((-Math.PI * Math.PI * x * x) / b);
      sum += k[i + radius]!;
    }
    return { k: k.map((v) => v / sum), sum };
  };
  const a = gaussian(CSF.A[1]);
  const rg = gaussian(CSF.RG[1]);
  const by1 = gaussian(CSF.BY[1]);
  const by2 = gaussian(CSF.BY[3]);
  // flip.ts: (c1·f1 + c2·f2) / (c1·S1² + c2·S2²) with unnormalized f; with
  // normalized kernels each f carries S², hence these weights.
  const c1 = CSF.BY[0] * Math.sqrt(Math.PI / CSF.BY[1]);
  const c2 = CSF.BY[2] * Math.sqrt(Math.PI / CSF.BY[3]);
  const norm = c1 * by1.sum ** 2 + c2 * by2.sum ** 2;
  return {
    radius,
    a: a.k,
    rg: rg.k,
    by1: by1.k,
    by2: by2.k,
    wBy1: (c1 * by1.sum ** 2) / norm,
    wBy2: (c2 * by2.sum ** 2) / norm,
  };
}

/** flip.ts detectionKernels: derivative (f) and smoothing (h) halves. */
function detection(ppd: number, type: "edge" | "point") {
  const sd = 0.5 * 0.082 * ppd;
  const radius = Math.ceil(3 * sd);
  const f = new Float32Array(2 * radius + 1);
  const h = new Float32Array(2 * radius + 1);
  for (let i = -radius; i <= radius; i++) {
    const g = Math.exp(-(i * i) / (2 * sd * sd));
    h[i + radius] = g;
    f[i + radius] = type === "edge" ? -i * g : ((i * i) / (sd * sd) - 1) * g;
  }
  let positive = 0;
  let negative = 0;
  for (const v of f) {
    if (v > 0) {
      positive += v;
    } else {
      negative -= v;
    }
  }
  const hs = h.reduce((s, v) => s + v, 0);
  return {
    radius,
    f: f.map((v) => (v > 0 ? v / positive : v / negative)),
    h: h.map((v) => v / hs),
  };
}

function huntLab(r: number, g: number, b: number): number[] {
  const X = (RGB2XYZ[0]! * r + RGB2XYZ[1]! * g + RGB2XYZ[2]! * b) / WHITE[0]!;
  const Y = (RGB2XYZ[3]! * r + RGB2XYZ[4]! * g + RGB2XYZ[5]! * b) / WHITE[1]!;
  const Z = (RGB2XYZ[6]! * r + RGB2XYZ[7]! * g + RGB2XYZ[8]! * b) / WHITE[2]!;
  const d = 6 / 29;
  const f = (t: number) =>
    t > d * d * d ? Math.cbrt(t) : t / (3 * d * d) + 4 / 29;
  const L = 116 * f(Y) - 16;
  return [L, 0.01 * L * 500 * (f(X) - f(Y)), 0.01 * L * 200 * (f(Y) - f(Z))];
}

/** One 1D pass: plane `src` → plane `dst` with the kernel at `offset`. */
interface Pass {
  radius: number;
  kernel: number;
  src: number;
  dst: number;
  horizontal: boolean;
}

interface Sized {
  width: number;
  height: number;
  ppd: number;
  n: number;
  groups: number;
  rgba: GPUBuffer;
  sources: GPUBuffer;
  temp: GPUBuffer;
  filtered: GPUBuffer;
  errors: GPUBuffer;
  partial: GPUBuffer;
  histogram: GPUBuffer;
  readback: GPUBuffer;
  readbackErrors: GPUBuffer;
  kernels: GPUBuffer;
  passes: Pass[];
  wBy1: number;
  wBy2: number;
  destroy(): void;
}

export interface GpuFlipResult extends Omit<FlipResult, "errors"> {
  /** Per-pixel errors, when asked for (heatmaps). */
  errors?: Float32Array;
}

export interface GpuFlip {
  /** FLIP of `test` against `reference` (sRGB8 RGBA, `width`×`height`). */
  flip(
    reference: Uint8ClampedArray,
    test: Uint8ClampedArray,
    width: number,
    height: number,
    ppd?: number,
    options?: { errors?: boolean },
  ): Promise<GpuFlipResult>;
  destroy(): void;
}

/** A GPU FLIP evaluator on its own device (calls run one at a time). */
export async function createGpuFlip(): Promise<GpuFlip> {
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    throw new Error("FLIP: no WebGPU adapter");
  }
  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
    },
  });
  const pipeline = (code: string) =>
    device.createComputePipeline({
      layout: "auto",
      compute: {
        module: device.createShaderModule({ code }),
        entryPoint: "main",
      },
    });
  const convert = pipeline(CONVERT);
  const convolve = pipeline(CONVOLVE);
  const errorPass = pipeline(ERROR);
  // Uniforms: one 256-byte slot per dispatch.
  const SLOT = 256;
  const uniforms = device.createBuffer({
    size: SLOT * 40,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const green = huntLab(0, 1, 0);
  const blue = huntLab(0, 0, 1);
  const cmax =
    (Math.abs(green[0]! - blue[0]!) +
      Math.hypot(green[1]! - blue[1]!, green[2]! - blue[2]!)) **
    QC;

  let sized: Sized | undefined;
  const size = (width: number, height: number, ppd: number): Sized => {
    if (
      sized &&
      sized.width === width &&
      sized.height === height &&
      sized.ppd === ppd
    ) {
      return sized;
    }
    sized?.destroy();
    const n = width * height;
    const groups = Math.ceil(n / WORKGROUP);
    const csf = csfKernels(ppd);
    const edge = detection(ppd, "edge");
    const point = detection(ppd, "point");
    // All kernels in one buffer.
    const list = [
      csf.a,
      csf.rg,
      csf.by1,
      csf.by2,
      edge.f,
      edge.h,
      point.f,
      point.h,
    ];
    const offsets: number[] = [];
    let total = 0;
    for (const k of list) {
      offsets.push(total);
      total += k.length;
    }
    const kernelData = new Float32Array(total);
    list.forEach((k, i) => kernelData.set(k, offsets[i]));
    const [kA, kRG, kBY1, kBY2, kEF, kEH, kPF, kPH] = offsets as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    // Per image (source planes base 0 or 4, filtered base 0 or 8): the
    // color channels with their CSF Gaussians, then the edge and point
    // derivatives of normalized Y in x and in y.
    const passes: Pass[] = [];
    let temp = 0;
    const job = (
      src: number,
      dst: number,
      kx: number,
      rx: number,
      ky: number,
      ry: number,
    ) => {
      passes.push({ radius: rx, kernel: kx, src, dst: temp, horizontal: true });
      passes.push({
        radius: ry,
        kernel: ky,
        src: temp,
        dst,
        horizontal: false,
      });
      temp++;
    };
    for (const image of [0, 1]) {
      const s = image * 4;
      const d = image * 8;
      const r = csf.radius;
      job(s + 0, d + 0, kA, r, kA, r);
      job(s + 1, d + 1, kRG, r, kRG, r);
      job(s + 2, d + 2, kBY1, r, kBY1, r);
      job(s + 2, d + 3, kBY2, r, kBY2, r);
      job(s + 3, d + 4, kEF, edge.radius, kEH, edge.radius);
      job(s + 3, d + 5, kEH, edge.radius, kEF, edge.radius);
      job(s + 3, d + 6, kPF, point.radius, kPH, point.radius);
      job(s + 3, d + 7, kPH, point.radius, kPF, point.radius);
    }
    const storage = (bytes: number, extra = 0) =>
      device.createBuffer({
        size: Math.max(16, bytes),
        usage: GPUBufferUsage.STORAGE | extra,
      });
    const kernels = storage(kernelData.byteLength, GPUBufferUsage.COPY_DST);
    device.queue.writeBuffer(kernels, 0, kernelData);
    const buffers = {
      rgba: storage(n * 4, GPUBufferUsage.COPY_DST),
      sources: storage(n * 4 * 8),
      temp: storage(n * 4 * temp),
      filtered: storage(n * 4 * FILTERED),
      errors: storage(n * 4, GPUBufferUsage.COPY_SRC),
      partial: storage(groups * 4, GPUBufferUsage.COPY_SRC),
      histogram: storage(
        (BINS + 1) * 4,
        GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      ),
      readback: device.createBuffer({
        size: (groups + BINS + 1) * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      }),
      readbackErrors: device.createBuffer({
        size: n * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      }),
    };
    sized = {
      width,
      height,
      ppd,
      n,
      groups,
      ...buffers,
      kernels,
      passes,
      wBy1: csf.wBy1,
      wBy2: csf.wBy2,
      destroy() {
        for (const b of [...Object.values(buffers), kernels]) {
          b.destroy();
        }
      },
    };
    return sized;
  };

  let queue: Promise<unknown> = Promise.resolve();

  const run = async (
    reference: Uint8ClampedArray,
    test: Uint8ClampedArray,
    width: number,
    height: number,
    ppd: number,
    withErrors: boolean,
  ): Promise<GpuFlipResult> => {
    const s = size(width, height, ppd);
    const { n, groups } = s;
    const slots = new ArrayBuffer(SLOT * (2 + s.passes.length + 1));
    const u32 = new Uint32Array(slots);
    const f32 = new Float32Array(slots);
    let slot = 0;
    const write = (values: number[], floats: boolean[] = []) => {
      const base = (slot * SLOT) / 4;
      values.forEach((v, i) => {
        if (floats[i]) {
          f32[base + i] = v;
        } else {
          u32[base + i] = v;
        }
      });
      return slot++ * SLOT;
    };
    const encoder = device.createCommandEncoder({ label: "flip" });
    encoder.clearBuffer(s.histogram);
    // Each image: upload, then convert into its four source planes. The
    // uploads go through the queue in order with the passes.
    const images = [reference, test];
    const offsets = images.map((_, i) => write([n, i * 4]));
    const convOffsets = s.passes.map((p) =>
      write([
        width,
        height,
        p.radius,
        p.kernel,
        p.src,
        p.dst,
        p.horizontal ? 1 : 0,
        0,
      ]),
    );
    const errorOffset = write(
      [n, withErrors ? 1 : 0, s.wBy1, s.wBy2, cmax, PC * cmax, 0, 0],
      [false, false, true, true, true, true],
    );
    device.queue.writeBuffer(uniforms, 0, slots);
    // Two uploads share one rgba buffer: submit the first conversion before
    // writing the second image.
    for (const [i, image] of images.entries()) {
      device.queue.writeBuffer(
        s.rgba,
        0,
        image.buffer,
        image.byteOffset,
        n * 4,
      );
      const e = i === 0 ? encoder : device.createCommandEncoder();
      const pass = e.beginComputePass();
      pass.setPipeline(convert);
      pass.setBindGroup(
        0,
        device.createBindGroup({
          layout: convert.getBindGroupLayout(0),
          entries: [
            {
              binding: 0,
              resource: { buffer: uniforms, offset: offsets[i]!, size: 32 },
            },
            { binding: 1, resource: { buffer: s.rgba } },
            { binding: 2, resource: { buffer: s.sources } },
          ],
        }),
      );
      pass.dispatchWorkgroups(groups);
      pass.end();
      if (i === 0) {
        device.queue.submit([encoder.finish()]);
      } else {
        device.queue.submit([e.finish()]);
      }
    }
    const main = device.createCommandEncoder({ label: "flip.filters" });
    const tiles = [Math.ceil(width / 16), Math.ceil(height / 16)] as const;
    s.passes.forEach((p, i) => {
      const pass = main.beginComputePass();
      pass.setPipeline(convolve);
      pass.setBindGroup(
        0,
        device.createBindGroup({
          layout: convolve.getBindGroupLayout(0),
          entries: [
            {
              binding: 0,
              resource: { buffer: uniforms, offset: convOffsets[i]!, size: 32 },
            },
            {
              binding: 1,
              resource: { buffer: p.horizontal ? s.sources : s.temp },
            },
            {
              binding: 2,
              resource: { buffer: p.horizontal ? s.temp : s.filtered },
            },
            { binding: 3, resource: { buffer: s.kernels } },
          ],
        }),
      );
      pass.dispatchWorkgroups(tiles[0], tiles[1]);
      pass.end();
    });
    const pass = main.beginComputePass();
    pass.setPipeline(errorPass);
    pass.setBindGroup(
      0,
      device.createBindGroup({
        layout: errorPass.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: uniforms, offset: errorOffset, size: 32 },
          },
          { binding: 1, resource: { buffer: s.filtered } },
          { binding: 2, resource: { buffer: s.errors } },
          { binding: 3, resource: { buffer: s.partial } },
          { binding: 4, resource: { buffer: s.histogram } },
        ],
      }),
    );
    pass.dispatchWorkgroups(groups);
    pass.end();
    main.copyBufferToBuffer(s.partial, 0, s.readback, 0, groups * 4);
    main.copyBufferToBuffer(
      s.histogram,
      0,
      s.readback,
      groups * 4,
      (BINS + 1) * 4,
    );
    if (withErrors) {
      main.copyBufferToBuffer(s.errors, 0, s.readbackErrors, 0, n * 4);
    }
    device.queue.submit([main.finish()]);

    await s.readback.mapAsync(GPUMapMode.READ);
    const data = s.readback.getMappedRange();
    const partial = new Float32Array(data, 0, groups);
    const histogram = new Uint32Array(data, groups * 4, BINS + 1);
    let sum = 0;
    for (const v of partial) {
      sum += v;
    }
    const max = new Float32Array(
      histogram.buffer,
      histogram.byteOffset + BINS * 4,
      1,
    )[0]!;
    const quantile = (q: number) => {
      const rank = Math.floor(n * q);
      let seen = 0;
      for (let b = 0; b < BINS; b++) {
        seen += histogram[b]!;
        if (seen > rank) {
          return (b + 0.5) / BINS;
        }
      }
      return 1;
    };
    const result: GpuFlipResult = {
      mean: sum / n,
      median: quantile(0.5),
      p95: quantile(0.95),
      max,
    };
    s.readback.unmap();
    if (withErrors) {
      await s.readbackErrors.mapAsync(GPUMapMode.READ);
      const errors = new Float32Array(
        s.readbackErrors.getMappedRange().slice(0),
      );
      s.readbackErrors.unmap();
      // Exact percentiles when the errors are read back anyway.
      const sorted = Float32Array.from(errors).sort();
      result.median = sorted[Math.floor(n / 2)]!;
      result.p95 = sorted[Math.floor(n * 0.95)]!;
      result.errors = errors;
    }
    return result;
  };

  return {
    flip(reference, test, width, height, ppd = DEFAULT_PPD, options = {}) {
      const next = queue.then(() =>
        run(reference, test, width, height, ppd, options.errors === true),
      );
      queue = next.catch(() => {});
      return next;
    },
    destroy() {
      sized?.destroy();
      uniforms.destroy();
      device.destroy();
    },
  };
}
