// The stretch of a route at a point: the extreme singular values [σ_min,
// σ_max] of its Jacobian there (CESIUM2_WEBGPU_PLAN.md §13.26, second review
// flaw 6). A drawn distance is at least σ_min and at most σ_max times the
// true one, so a pixel's worth of drawn metres is at most 1/σ_min true
// metres: it is what divides a snap's or a pick's pixel tolerance. The same
// estimate `scene/warpBounds.ts` gives for a volume, kept here because the
// frames layer imports no scene module: the Jacobian composes through the
// route's steps (a rigid step's rotation, a warp's own Jacobian, an inverse
// step's inverse) and σ are the roots of the eigenvalues of JᵀJ.
import { warpForward, warpInverse, type Route } from "../camera/route.ts";
import { eigenSymmetric } from "./covariance.ts";

/** `a · b` for column-major 3 × 3. */
function multiply(a: ArrayLike<number>, b: ArrayLike<number>): Float64Array {
  const out = new Float64Array(9);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[k * 3 + r]! * b[c * 3 + k]!;
      }
      out[c * 3 + r] = sum;
    }
  }
  return out;
}

/** The inverse of a column-major 3 × 3, or undefined where it is singular. */
function invert(m: ArrayLike<number>): Float64Array | undefined {
  const [a, b, c, d, e, f, g, h, i] = Array.from(m);
  const determinant =
    a! * (e! * i! - f! * h!) -
    d! * (b! * i! - c! * h!) +
    g! * (b! * f! - c! * e!);
  if (!(Math.abs(determinant) > 0) || !Number.isFinite(determinant)) {
    return undefined;
  }
  const s = 1 / determinant;
  return Float64Array.of(
    (e! * i! - f! * h!) * s,
    (c! * h! - b! * i!) * s,
    (b! * f! - c! * e!) * s,
    (f! * g! - d! * i!) * s,
    (a! * i! - c! * g!) * s,
    (c! * d! - a! * f!) * s,
    (d! * h! - e! * g!) * s,
    (b! * g! - a! * h!) * s,
    (a! * e! - b! * d!) * s,
  );
}

/** `route`'s Jacobian at `p`, column-major 3 × 3; undefined where an inverse step's is singular. */
function jacobianAt(
  route: Route,
  p: ArrayLike<number>,
): Float64Array | undefined {
  let j: Float64Array = Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
  const at = new Float64Array([p[0]!, p[1]!, p[2]!]);
  const out = new Float64Array(3);
  const step = new Float64Array(9);
  for (const s of route.steps) {
    if (s.kind === "rigid") {
      const m = s.matrix;
      j = multiply(
        [m[0]!, m[1]!, m[2]!, m[4]!, m[5]!, m[6]!, m[8]!, m[9]!, m[10]!],
        j,
      );
      const x = at[0]!,
        y = at[1]!,
        z = at[2]!;
      at[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
      at[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
      at[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
    } else if (s.inverse) {
      // From the image back to the preimage, whose forward Jacobian is inverted.
      warpInverse(s.warp, at, out);
      warpForward(s.warp, out, new Float64Array(3), step);
      const inverse = invert(step);
      if (inverse === undefined) {
        return undefined;
      }
      j = multiply(inverse, j);
      at.set(out);
    } else {
      warpForward(s.warp, at.slice(), out, step);
      j = multiply(step, j);
      at.set(out);
    }
  }
  return j;
}

/**
 * [σ_min, σ_max] of `route`'s Jacobian at `p` and at six points `radius` m
 * (default 1) along the axes about it: the least and the most any of them
 * stretches. An estimate. [1, 1] for a rigid route. Exaggeration by k at
 * the surface gives about [1, k].
 */
export function routeStretch(
  route: Route,
  p: ArrayLike<number>,
  radius = 1,
): [number, number] {
  let low = Infinity;
  let high = 0;
  const samples: number[][] = [[p[0]!, p[1]!, p[2]!]];
  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [-1, 1]) {
      const q = [p[0]!, p[1]!, p[2]!];
      q[axis] = q[axis]! + sign * radius;
      samples.push(q);
    }
  }
  for (const q of samples) {
    const j = jacobianAt(route, q);
    if (j === undefined) {
      continue;
    }
    const jtj = new Float64Array(9);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          sum += j[r * 3 + k]! * j[c * 3 + k]!;
        }
        jtj[r * 3 + c] = sum;
      }
    }
    for (const value of eigenSymmetric(jtj).values) {
      const sigma = Math.sqrt(Math.max(0, value));
      low = Math.min(low, sigma);
      high = Math.max(high, sigma);
    }
  }
  return Number.isFinite(low) ? [low, high] : [1, 1];
}
