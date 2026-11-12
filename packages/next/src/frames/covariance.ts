// 3×3 symmetric helpers for the accuracy composer (frames 5b, Task 4).
// Matrices are row-major `Float64Array(9)`, in m².
import { congruence } from "../transform/accuracy.ts";

/** `R C Rᵀ`, with `r` a row-major rotation, written to `out`: the covariance's congruence, as a route's J Σ Jᵀ. */
export function rotateCovariance(
  c: ArrayLike<number>,
  r: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  return congruence(r, c, out);
}

/** The eigenvalues (largest first) and eigenvectors of a symmetric 3×3. */
export interface Eigen {
  readonly values: Float64Array;
  /** Row-major: column `k` is the unit eigenvector of `values[k]`. */
  readonly vectors: Float64Array;
}

/**
 * The eigen-decomposition of the symmetric `c` by Jacobi rotations: at most
 * 50 sweeps, stopping when the off-diagonal is below 1e-15 of the diagonal.
 */
export function eigenSymmetric(c: ArrayLike<number>): Eigen {
  const a = Float64Array.from(c);
  const v = Float64Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  for (let sweep = 0; sweep < 50; sweep++) {
    const off = Math.abs(a[1]!) + Math.abs(a[2]!) + Math.abs(a[5]!);
    const diagonal = Math.abs(a[0]!) + Math.abs(a[4]!) + Math.abs(a[8]!);
    if (off <= 1e-15 * diagonal || off === 0) {
      break;
    }
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      const apq = a[p * 3 + q]!;
      if (apq === 0) {
        continue;
      }
      const theta = (a[q * 3 + q]! - a[p * 3 + p]!) / (2 * apq);
      const t =
        Math.sign(theta || 1) /
        (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const cs = 1 / Math.sqrt(t * t + 1);
      const sn = t * cs;
      for (let k = 0; k < 3; k++) {
        const akp = a[k * 3 + p]!;
        const akq = a[k * 3 + q]!;
        a[k * 3 + p] = cs * akp - sn * akq;
        a[k * 3 + q] = sn * akp + cs * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p * 3 + k]!;
        const aqk = a[q * 3 + k]!;
        a[p * 3 + k] = cs * apk - sn * aqk;
        a[q * 3 + k] = sn * apk + cs * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k * 3 + p]!;
        const vkq = v[k * 3 + q]!;
        v[k * 3 + p] = cs * vkp - sn * vkq;
        v[k * 3 + q] = sn * vkp + cs * vkq;
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => a[j * 3 + j]! - a[i * 3 + i]!);
  const values = Float64Array.from(order, (i) => a[i * 3 + i]!);
  const vectors = new Float64Array(9);
  order.forEach((from, to) => {
    for (let k = 0; k < 3; k++) {
      vectors[k * 3 + to] = v[k * 3 + from]!;
    }
  });
  return { values, vectors };
}

/** The symmetric square root of a positive semi-definite `c`, written to `out`. */
export function symmetricSqrt(
  c: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  const { values, vectors } = eigenSymmetric(c);
  out.fill(0);
  for (let k = 0; k < 3; k++) {
    const root = Math.sqrt(Math.max(values[k]!, 0));
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        out[i * 3 + j] =
          out[i * 3 + j]! + root * vectors[i * 3 + k]! * vectors[j * 3 + k]!;
      }
    }
  }
  return out;
}

export const trace = (c: ArrayLike<number>): number => c[0]! + c[4]! + c[8]!;
