// Rational Bézier evaluation in float64 (overall plan §13.33), by de Casteljau
// in homogeneous coordinates. Derivatives come from the quotient rule on the
// homogeneous derivatives. Positions are metres.
import type { SurfaceSample } from "./evaluate.ts";

/**
 * One de Casteljau pass over `n + 1` points of `comps` components each, held
 * contiguously in `buffer` (which is overwritten). Writes the value at `t`
 * and the derivative with respect to `t`.
 */
function casteljau(
  buffer: Float64Array,
  n: number,
  comps: number,
  t: number,
  value: Float64Array,
  derivative: Float64Array,
): void {
  const s = 1 - t;
  for (let level = 1; level <= n; level++) {
    if (level === n) {
      for (let c = 0; c < comps; c++) {
        derivative[c] = n * (buffer[comps + c]! - buffer[c]!);
      }
    }
    for (let i = 0; i <= n - level; i++) {
      for (let c = 0; c < comps; c++) {
        buffer[i * comps + c] =
          s * buffer[i * comps + c]! + t * buffer[(i + 1) * comps + c]!;
      }
    }
  }
  if (n === 0) {
    derivative.fill(0);
  }
  for (let c = 0; c < comps; c++) {
    value[c] = buffer[c]!;
  }
}

/**
 * A rational Bézier patch at (s, t) in [0, 1]²: position, ∂s and ∂t, from
 * homogeneous control points (4 per point, u fastest). `first` is the index
 * of the patch's first point, in points. Derivatives are m per unit of the
 * patch's own parameters.
 */
export function evaluatePatch(
  points: Float64Array,
  first: number,
  degreeU: number,
  degreeV: number,
  s: number,
  t: number,
): SurfaceSample {
  const rowValue = new Float64Array((degreeV + 1) * 4);
  const rowDerivative = new Float64Array((degreeV + 1) * 4);
  const buffer = new Float64Array((Math.max(degreeU, degreeV) + 1) * 4);
  const value = new Float64Array(4);
  const derivative = new Float64Array(4);
  // Along u within each row of control points.
  for (let j = 0; j <= degreeV; j++) {
    const start = (first + j * (degreeU + 1)) * 4;
    for (let k = 0; k < (degreeU + 1) * 4; k++) {
      buffer[k] = points[start + k]!;
    }
    casteljau(buffer, degreeU, 4, s, value, derivative);
    rowValue.set(value, j * 4);
    rowDerivative.set(derivative, j * 4);
  }
  // Along v: the value and ∂t from the row values, ∂s from the row derivatives.
  const h = new Float64Array(4);
  const ht = new Float64Array(4);
  const hs = new Float64Array(4);
  buffer.set(rowValue.subarray(0, (degreeV + 1) * 4));
  casteljau(buffer, degreeV, 4, t, h, ht);
  buffer.set(rowDerivative.subarray(0, (degreeV + 1) * 4));
  casteljau(buffer, degreeV, 4, t, hs, derivative);

  const w = h[3]!;
  const position = new Float64Array(3);
  const du = new Float64Array(3);
  const dv = new Float64Array(3);
  for (let c = 0; c < 3; c++) {
    position[c] = h[c]! / w;
    du[c] = (hs[c]! - position[c]! * hs[3]!) / w;
    dv[c] = (ht[c]! - position[c]! * ht[3]!) / w;
  }
  return { position, du, dv };
}

/**
 * A rational Bézier curve segment at t in [0, 1]: position and derivative
 * (per unit t), from homogeneous control points with `dimension` + 1
 * components each. `first` is the index of the first point, in points.
 */
export function evaluateSegment(
  points: Float64Array,
  first: number,
  degree: number,
  dimension: 2 | 3,
  t: number,
): { readonly position: Float64Array; readonly derivative: Float64Array } {
  const comps = dimension + 1;
  const buffer = new Float64Array((degree + 1) * comps);
  for (let k = 0; k < buffer.length; k++) {
    buffer[k] = points[first * comps + k]!;
  }
  const h = new Float64Array(comps);
  const dh = new Float64Array(comps);
  casteljau(buffer, degree, comps, t, h, dh);
  const w = h[dimension]!;
  const position = new Float64Array(dimension);
  const derivative = new Float64Array(dimension);
  for (let c = 0; c < dimension; c++) {
    position[c] = h[c]! / w;
    derivative[c] = (dh[c]! - position[c]! * dh[dimension]!) / w;
  }
  return { position, derivative };
}
