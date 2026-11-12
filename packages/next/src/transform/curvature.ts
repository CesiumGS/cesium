// The curvature of a route and the chord error it implies (plan 2026-11-12,
// task 5, tessellation). A straight edge of length L inside a region where
// the route's second derivative is at most M₂ is drawn as a curve that
// leaves the straight edge between its ends' images by at most M₂L²/8 (the
// chord error of interpolating a curve of that acceleration). The tessellator
// picks, per triangle, the subdivision n that brings M₂(L/n)²/8 under the
// view's tolerance in metres.
//
// M₂ is read from the route's Jacobian by central differences, not from the
// Hessian programs: at Earth scale the AD Hessian of a height function (its
// unrolled foot-point iteration) cancels terms of 1e13, leaving noise of
// 1e-3 where the curvature is 1e-6, and the interval Hessian is wider still
// (`taylorBounds`); the closed-form Jacobians of the built-ins are accurate
// to rounding, so their difference over a step of metres is too. It is an
// estimate, from the points given: sample the draw's box (corners, edge
// midpoints, face centres, centre) as the drawn bounds do. Where the
// route's J jumps (a kink) the difference over a step across it reads the
// jump, so use a step smaller than the kink's band.
import type { Route } from "./route.ts";

/**
 * ‖D²F‖ of `route` at `p`: the Frobenius norm of the tensor of second
 * derivatives T[i][a][b] = ∂J[i][a]/∂x_b by central differences of the
 * route's Jacobian over `step` (default 1 m), which bounds ‖D²F[u, u]‖ for a
 * unit u.
 */
export function curvatureAt(
  route: Route,
  p: ArrayLike<number>,
  step = 1,
): number {
  const plus = new Float64Array(9);
  const minus = new Float64Array(9);
  let sum = 0;
  for (let b = 0; b < 3; b++) {
    const q = [p[0]!, p[1]!, p[2]!];
    q[b] = p[b]! + step;
    route.jacobian(q, plus);
    q[b] = p[b]! - step;
    route.jacobian(q, minus);
    for (let k = 0; k < 9; k++) {
      const d = (plus[k]! - minus[k]!) / (2 * step);
      sum += d * d;
    }
  }
  return Math.sqrt(sum);
}

/**
 * M₂ over a set of sample points (flat, n × 3), the largest `curvatureAt`:
 * an estimate of the route's second-derivative bound over the region they
 * sample.
 */
export function curvatureOver(
  route: Route,
  points: ArrayLike<number>,
  step = 1,
): number {
  let worst = 0;
  for (let i = 0; i + 2 < points.length; i += 3) {
    worst = Math.max(
      worst,
      curvatureAt(route, [points[i]!, points[i + 1]!, points[i + 2]!], step),
    );
  }
  return worst;
}

/** The chord error of a straight edge of length `length` under a route of second-derivative bound `curvature`: M₂L²/8. */
export function chordError(curvature: number, length: number): number {
  return (curvature * length * length) / 8;
}

/**
 * The uniform subdivision a triangle whose longest edge is `length` needs:
 * the smallest n, 1 to `max`, with M₂(L/n)²/8 within `tolerance` (the same
 * units as the route's output).
 */
export function subdivisionFor(
  curvature: number,
  length: number,
  tolerance: number,
  max = 64,
): number {
  if (!(tolerance > 0)) {
    throw new RangeError("subdivisionFor: the tolerance is positive");
  }
  const n = Math.ceil(Math.sqrt(chordError(curvature, length) / tolerance));
  return Math.min(Math.max(n, 1), max);
}
