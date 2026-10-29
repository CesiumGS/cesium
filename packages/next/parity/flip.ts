/**
 * LDR-FLIP (Andersson et al., "FLIP: A Difference Evaluator for Alternating
 * Images", HPG 2020), following NVIDIA's reference implementation. The
 * spatial and feature filters are applied separably; the reference uses the
 * equivalent 2D kernels.
 *
 * Inputs are sRGB8 RGBA images. Output is a per-pixel error in [0, 1].
 */

export interface FlipResult {
  mean: number;
  median: number;
  p95: number;
  max: number;
  errors: Float32Array;
}

/** Pixels per degree for a 0.7 m wide 3840-pixel display viewed from 0.7 m. */
export const DEFAULT_PPD = ((0.7 * 3840) / 0.7) * (Math.PI / 180);

const QC = 0.7;
const QF = 0.5;
const PC = 0.4;
const PT = 0.95;

// Linear sRGB ↔ XYZ (D65), as in the reference implementation.
const RGB2XYZ = [
  0.41238656, 0.35759149, 0.18045049, 0.21263682, 0.71518298, 0.0721802,
  0.01933062, 0.11919716, 0.95037259,
] as const;
const XYZ2RGB = [
  3.24096994, -1.53738318, -0.49861076, -0.96924364, 1.8759675, 0.04155506,
  0.05563008, -0.20397696, 1.05697151,
] as const;
const WHITE = [
  RGB2XYZ[0] + RGB2XYZ[1] + RGB2XYZ[2],
  RGB2XYZ[3] + RGB2XYZ[4] + RGB2XYZ[5],
  RGB2XYZ[6] + RGB2XYZ[7] + RGB2XYZ[8],
] as const;

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB8 RGBA → three planar YCxCz channels. */
function toYCxCz(rgba: Uint8ClampedArray, count: number): Float32Array[] {
  const y = new Float32Array(count);
  const cx = new Float32Array(count);
  const cz = new Float32Array(count);
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = srgbToLinear(i / 255);
  }
  for (let i = 0; i < count; i++) {
    const r = lut[rgba[i * 4]!]!;
    const g = lut[rgba[i * 4 + 1]!]!;
    const b = lut[rgba[i * 4 + 2]!]!;
    const X = (RGB2XYZ[0] * r + RGB2XYZ[1] * g + RGB2XYZ[2] * b) / WHITE[0];
    const Y = (RGB2XYZ[3] * r + RGB2XYZ[4] * g + RGB2XYZ[5] * b) / WHITE[1];
    const Z = (RGB2XYZ[6] * r + RGB2XYZ[7] * g + RGB2XYZ[8] * b) / WHITE[2];
    y[i] = 116 * Y - 16;
    cx[i] = 500 * (X - Y);
    cz[i] = 200 * (Y - Z);
  }
  return [y, cx, cz];
}

/** Separable convolution with edge clamping. `kernel` has odd length. */
function convolve(
  src: Float32Array,
  width: number,
  height: number,
  kx: Float32Array,
  ky: Float32Array,
): Float32Array {
  const rx = (kx.length - 1) / 2;
  const ry = (ky.length - 1) / 2;
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -rx; k <= rx; k++) {
        const xx = Math.min(width - 1, Math.max(0, x + k));
        sum += kx[k + rx]! * src[row + xx]!;
      }
      tmp[row + x] = sum;
    }
  }
  const out = new Float32Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -ry; k <= ry; k++) {
        const yy = Math.min(height - 1, Math.max(0, y + k));
        sum += ky[k + ry]! * tmp[yy * width + x]!;
      }
      out[y * width + x] = sum;
    }
  }
  return out;
}

/** Contrast-sensitivity parameters per opponent channel: (a1, b1, a2, b2). */
const CSF = {
  A: [1, 0.0047, 0, 1e-5],
  RG: [1, 0.0053, 0, 1e-5],
  BY: [34.1, 0.04, 13.5, 0.025],
} as const;

/**
 * Applies the 2D CSF kernel a1·√(π/b1)·exp(−π²r²/b1) + a2·√(π/b2)·exp(−π²r²/b2),
 * normalized to sum 1, as a weighted sum of two separable Gaussians.
 */
function csfFilter(
  src: Float32Array,
  width: number,
  height: number,
  params: readonly [number, number, number, number],
  ppd: number,
): Float32Array {
  const maxB = Math.max(...Object.values(CSF).flatMap((p) => [p[1], p[3]]));
  const radius = Math.ceil(3 * Math.sqrt(maxB / (2 * Math.PI * Math.PI)) * ppd);
  const [a1, b1, a2, b2] = params;
  const gaussian = (b: number) => {
    const k = new Float32Array(2 * radius + 1);
    for (let i = -radius; i <= radius; i++) {
      const x = i / ppd;
      k[i + radius] = Math.exp((-Math.PI * Math.PI * x * x) / b);
    }
    return k;
  };
  const sum = (k: Float32Array) => k.reduce((s, v) => s + v, 0);
  const g1 = gaussian(b1);
  const c1 = a1 * Math.sqrt(Math.PI / b1);
  const norm1 = c1 * sum(g1) ** 2;
  if (a2 === 0) {
    const f = convolve(src, width, height, g1, g1);
    const scale = c1 / norm1;
    return f.map((v) => v * scale);
  }
  const g2 = gaussian(b2);
  const c2 = a2 * Math.sqrt(Math.PI / b2);
  const norm = norm1 + c2 * sum(g2) ** 2;
  const f1 = convolve(src, width, height, g1, g1);
  const f2 = convolve(src, width, height, g2, g2);
  return f1.map((v, i) => (c1 * v + c2 * f2[i]!) / norm);
}

/** YCxCz → clamped linear RGB → Hunt-adjusted CIELAB, as L, a, b planes. */
function toHuntLab(
  y: Float32Array,
  cx: Float32Array,
  cz: Float32Array,
): [Float32Array, Float32Array, Float32Array] {
  const n = y.length;
  const L = new Float32Array(n);
  const A = new Float32Array(n);
  const B = new Float32Array(n);
  const out = new Float64Array(3);
  for (let i = 0; i < n; i++) {
    const fy = (y[i]! + 16) / 116;
    const X = (cx[i]! / 500 + fy) * WHITE[0];
    const Y = fy * WHITE[1];
    const Z = (fy - cz[i]! / 200) * WHITE[2];
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const r = clamp(XYZ2RGB[0] * X + XYZ2RGB[1] * Y + XYZ2RGB[2] * Z);
    const g = clamp(XYZ2RGB[3] * X + XYZ2RGB[4] * Y + XYZ2RGB[5] * Z);
    const b = clamp(XYZ2RGB[6] * X + XYZ2RGB[7] * Y + XYZ2RGB[8] * Z);
    huntLab(r, g, b, out);
    L[i] = out[0]!;
    A[i] = out[1]!;
    B[i] = out[2]!;
  }
  return [L, A, B];
}

function huntLab(r: number, g: number, b: number, out: Float64Array): void {
  const X = (RGB2XYZ[0] * r + RGB2XYZ[1] * g + RGB2XYZ[2] * b) / WHITE[0];
  const Y = (RGB2XYZ[3] * r + RGB2XYZ[4] * g + RGB2XYZ[5] * b) / WHITE[1];
  const Z = (RGB2XYZ[6] * r + RGB2XYZ[7] * g + RGB2XYZ[8] * b) / WHITE[2];
  const d = 6 / 29;
  const f = (t: number) =>
    t > d * d * d ? Math.cbrt(t) : t / (3 * d * d) + 4 / 29;
  const L = 116 * f(Y) - 16;
  out[0] = L;
  out[1] = 0.01 * L * 500 * (f(X) - f(Y));
  out[2] = 0.01 * L * 200 * (f(Y) - f(Z));
}

function hyab(
  l1: number,
  a1: number,
  b1: number,
  l2: number,
  a2: number,
  b2: number,
): number {
  return Math.abs(l1 - l2) + Math.hypot(a1 - a2, b1 - b2);
}

/** First-derivative (edge) or second-derivative (point) Gaussian, normalized. */
function detectionKernels(
  ppd: number,
  type: "edge" | "point",
): [Float32Array, Float32Array] {
  const sd = 0.5 * 0.082 * ppd;
  const radius = Math.ceil(3 * sd);
  const f = new Float32Array(2 * radius + 1);
  const h = new Float32Array(2 * radius + 1);
  for (let i = -radius; i <= radius; i++) {
    const g = Math.exp(-(i * i) / (2 * sd * sd));
    h[i + radius] = g;
    f[i + radius] = type === "edge" ? -i * g : ((i * i) / (sd * sd) - 1) * g;
  }
  // The reference normalizes the 2D kernel so positive weights sum to 1 and
  // negative weights to −1; for a separable f(x)·h(y) with h > 0 that is f's
  // own positive/negative sums times Σh.
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
  return [
    f.map((v) => (v > 0 ? v / positive : v / negative)),
    h.map((v) => v / hs),
  ];
}

function featureMagnitudes(
  yNorm: Float32Array,
  width: number,
  height: number,
  kernels: [Float32Array, Float32Array],
): Float32Array {
  const [f, h] = kernels;
  const dx = convolve(yNorm, width, height, f, h);
  const dy = convolve(yNorm, width, height, h, f);
  return dx.map((v, i) => Math.hypot(v, dy[i]!));
}

export function flip(
  reference: Uint8ClampedArray,
  test: Uint8ClampedArray,
  width: number,
  height: number,
  ppd = DEFAULT_PPD,
): FlipResult {
  const n = width * height;
  const ref = toYCxCz(reference, n);
  const tst = toYCxCz(test, n);

  // Color pipeline.
  const channels = [CSF.A, CSF.RG, CSF.BY] as const;
  const refF = ref.map((c, k) =>
    csfFilter(c, width, height, channels[k]!, ppd),
  );
  const tstF = tst.map((c, k) =>
    csfFilter(c, width, height, channels[k]!, ppd),
  );
  const [rL, rA, rB] = toHuntLab(refF[0]!, refF[1]!, refF[2]!);
  const [tL, tA, tB] = toHuntLab(tstF[0]!, tstF[1]!, tstF[2]!);
  const green = new Float64Array(3);
  const blue = new Float64Array(3);
  huntLab(0, 1, 0, green);
  huntLab(0, 0, 1, blue);
  const cmax =
    hyab(green[0]!, green[1]!, green[2]!, blue[0]!, blue[1]!, blue[2]!) ** QC;
  const pccmax = PC * cmax;

  // Feature pipeline on the normalized achromatic channel.
  const yRef = ref[0]!.map((v) => (v + 16) / 116);
  const yTst = tst[0]!.map((v) => (v + 16) / 116);
  const edges = detectionKernels(ppd, "edge");
  const points = detectionKernels(ppd, "point");
  const eRef = featureMagnitudes(yRef, width, height, edges);
  const eTst = featureMagnitudes(yTst, width, height, edges);
  const pRef = featureMagnitudes(yRef, width, height, points);
  const pTst = featureMagnitudes(yTst, width, height, points);

  const errors = new Float32Array(n);
  let sum = 0;
  let max = 0;
  for (let i = 0; i < n; i++) {
    const e = hyab(rL[i]!, rA[i]!, rB[i]!, tL[i]!, tA[i]!, tB[i]!) ** QC;
    const deltaC =
      e < pccmax
        ? (PT / pccmax) * e
        : PT + ((e - pccmax) / (cmax - pccmax)) * (1 - PT);
    const feature = Math.max(
      Math.abs(eRef[i]! - eTst[i]!),
      Math.abs(pRef[i]! - pTst[i]!),
    );
    const deltaF = (feature / Math.SQRT2) ** QF;
    const value = deltaC ** (1 - deltaF);
    errors[i] = value;
    sum += value;
    max = Math.max(max, value);
  }
  const sorted = Float32Array.from(errors).sort();
  return {
    mean: sum / n,
    median: sorted[Math.floor(n / 2)]!,
    p95: sorted[Math.floor(n * 0.95)]!,
    max,
    errors,
  };
}
