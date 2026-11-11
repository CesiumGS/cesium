// The nearest point of a rational Bézier curve segment to a point, in 2D (a
// face's pcurves) or 3D (an edge's curve), for the b-rep adapter (overall plan
// §13.33). A line is projected in closed form; a curve is sampled, and each
// dip of the samples is bracketed and bisected on the derivative of the
// squared distance.
import { evaluateSegment } from "./bezier.ts";
import type { BezierCurves } from "./form.ts";

/** A point of a curve segment near another point, with its parameter in [0, 1]. */
export interface CurvePoint {
  readonly tau: number;
  readonly position: Float64Array;
  /** The segment's derivative there, per unit tau. */
  readonly tangent: Float64Array;
  readonly distance: number;
  /** Whether it was a closed form (a line), not Newton's bisection. */
  readonly closedForm: boolean;
}

/** Samples per segment before refining. */
const SAMPLES = 16;

/** The nearest point of `segment` of `curves` (of `dimension` 2 or 3) to `p`. */
export function nearestOnCurve(
  curves: BezierCurves,
  dimension: 2 | 3,
  segment: number,
  p: ArrayLike<number>,
): CurvePoint {
  const first = curves.first[segment]!;
  const degree = curves.degree[segment]!;
  const stride = dimension + 1;
  const at = (tau: number) =>
    evaluateSegment(curves.points, first, degree, dimension, tau);
  const separation = (position: ArrayLike<number>): number => {
    let sum = 0;
    for (let k = 0; k < dimension; k++) {
      sum += (position[k]! - p[k]!) ** 2;
    }
    return Math.sqrt(sum);
  };
  const point = (tau: number, closedForm: boolean): CurvePoint => {
    const { position, derivative } = at(tau);
    return {
      tau,
      position,
      tangent: derivative,
      distance: separation(position),
      closedForm,
    };
  };
  if (degree === 1) {
    const h = curves.points;
    const w0 = h[first * stride + dimension]!;
    const w1 = h[(first + 1) * stride + dimension]!;
    let length2 = 0;
    let along = 0;
    for (let k = 0; k < dimension; k++) {
      const a = h[first * stride + k]! / w0;
      const ab = h[(first + 1) * stride + k]! / w1 - a;
      length2 += ab * ab;
      along += (p[k]! - a) * ab;
    }
    along = length2 > 0 ? Math.min(1, Math.max(0, along / length2)) : 0;
    // The line's parameter follows the weights.
    return point((along * w0) / (along * w0 + (1 - along) * w1), true);
  }
  const gradient = (tau: number): number => {
    const { position, derivative } = at(tau);
    let sum = 0;
    for (let k = 0; k < dimension; k++) {
      sum += (position[k]! - p[k]!) * derivative[k]!;
    }
    return sum;
  };
  const taus = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
  const d = taus.map((tau) => separation(at(tau).position));
  let best: CurvePoint | undefined;
  for (let i = 0; i <= SAMPLES; i++) {
    if ((i > 0 && d[i]! > d[i - 1]!) || (i < SAMPLES && d[i]! > d[i + 1]!)) {
      continue;
    }
    let lo = taus[Math.max(i - 1, 0)]!;
    let hi = taus[Math.min(i + 1, SAMPLES)]!;
    let tau: number;
    if (gradient(lo) >= 0) {
      tau = lo;
    } else if (gradient(hi) <= 0) {
      tau = hi;
    } else {
      for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2;
        if (gradient(mid) < 0) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      tau = (lo + hi) / 2;
    }
    const found = point(tau, false);
    if (!best || found.distance < best.distance) {
      best = found;
    }
    // The sample itself, where the bracket's own dip is no better.
    if (d[i]! < best.distance) {
      best = point(taus[i]!, false);
    }
  }
  return best ?? point(0, false);
}
