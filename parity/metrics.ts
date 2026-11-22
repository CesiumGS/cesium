/**
 * Image comparison for the L2 parity level. Until NVIDIA FLIP is integrated
 * this uses CIE76 ΔE in CIELAB: mean, 95th percentile, and the share of
 * pixels above the just-noticeable difference (ΔE > 2.3).
 */

export interface ImageMetrics {
  meanDeltaE: number;
  p95DeltaE: number;
  /** Fraction of pixels with ΔE above 2.3. */
  noticeable: number;
  heatmap: ImageData;
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function toLab(r: number, g: number, b: number, out: Float64Array): void {
  const lr = srgbToLinear(r),
    lg = srgbToLinear(g),
    lb = srgbToLinear(b);
  // sRGB → XYZ (D65), normalized by the white point.
  const x = (0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047;
  const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  const z = (0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883;
  const f = (t: number) =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
  const fx = f(x),
    fy = f(y),
    fz = f(z);
  out[0] = 116 * fy - 16;
  out[1] = 500 * (fx - fy);
  out[2] = 200 * (fy - fz);
}

export function compareImages(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
  width: number,
  height: number,
): ImageMetrics {
  const count = width * height;
  const deltas = new Float64Array(count);
  const labA = new Float64Array(3),
    labB = new Float64Array(3);
  const heat = new ImageData(width, height);
  let sum = 0;
  let noticeable = 0;
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    toLab(a[o]!, a[o + 1]!, a[o + 2]!, labA);
    toLab(b[o]!, b[o + 1]!, b[o + 2]!, labB);
    const d = Math.hypot(
      labA[0]! - labB[0]!,
      labA[1]! - labB[1]!,
      labA[2]! - labB[2]!,
    );
    deltas[i] = d;
    sum += d;
    if (d > 2.3) {
      noticeable++;
    }
    // Heatmap: black (identical) → red (ΔE ≥ 20).
    const t = Math.min(d / 20, 1);
    heat.data[o] = 255 * t;
    heat.data[o + 1] = 40 * (1 - t);
    heat.data[o + 2] = 40 * (1 - t);
    heat.data[o + 3] = 255;
  }
  deltas.sort();
  return {
    meanDeltaE: sum / count,
    p95DeltaE: deltas[Math.floor(count * 0.95)]!,
    noticeable: noticeable / count,
    heatmap: heat,
  };
}
