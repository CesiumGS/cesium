// The scale-aware maps an application calls on a curvilinear map or a route (docs/design/geometry-through-placement-review.md;
// the "Vertical exaggeration" example's gaps): where a point goes through a
// curvilinear map's edge, and what point went through it, each curvilinear map at its live `scale`
// (a slider's one float). A curvilinear map's own `inverse` is the inverse at scale 1,
// and a route is the engine's own (`View.anchorRoute`, `CorePick.route`, a
// resolver's `route`), so these are the way to ask at the scale in force.
import {
  routeForward as carryForward,
  routeInverse as carryInverse,
  curvilinearForward as bendForward,
  curvilinearInverse as bendInverse,
  type Route as CoreRoute,
  type CurvilinearMap as CoreCurvilinearMap,
  type CurvilinearScale as CoreCurvilinearScale,
} from "../camera/route.ts";

/** A curvilinear edge of the frame tree: a map from a frame's own coordinates to its parent's (see `CurvilinearFrameSpec`, `curvilinearFrame`). */
export type CurvilinearMap = CoreCurvilinearMap;

/** The path from a content frame to a base: affine steps and curvilinear steps in order. */
export type Route = CoreRoute;

/** A number read live that moves a curvilinear map's strength (a `PlacementParameter` is one). */
export type CurvilinearScale = CoreCurvilinearScale;

/**
 * `p` carried by the curvilinear map at its scale now: `p + s·(forward(p) − p)` (the
 * curvilinear map itself at 1, the identity at 0). With `jacobian` (9 numbers),
 * ∂out/∂p likewise, column-major. `p` may be `out`.
 */
export function curvilinearForward(
  curvilinearMap: CurvilinearMap,
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  return bendForward(curvilinearMap, p, out, jacobian);
}

/**
 * `q` in the curvilinear map's `to` back to its `from`, at the scale now: the curvilinear map's
 * own `inverse` at scale 1, else Newton on `curvilinearForward` and its Jacobian, to
 * `tolerance` meters (default 1e-9, 32 iterations). Throws when it doesn't
 * converge. A curvilinear map's own `inverse` is at scale 1 whatever its `scale` says:
 * use this for the point that was drawn at the scale in force.
 */
export function curvilinearInverse(
  curvilinearMap: CurvilinearMap,
  q: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
  options: { tolerance?: number; iterations?: number } = {},
): Float64Array {
  return bendInverse(curvilinearMap, q, out, options);
}

/** A point of `route.frame` carried to `route.base`, in float64, each curvilinear map at its scale now. */
export function routeForward(
  route: Route,
  p: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  return carryForward(route, p, out);
}

/**
 * A point of `route.base` carried back to `route.frame`, in float64: each
 * step undone, last first, each curvilinear map at its scale now. For a pick's true
 * point, give the route the pick carries (`CorePick.route`, scales as they
 * were when it was drawn), not the view's now. An affine step may scale
 * unevenly or shear and is inverted as a general affine matrix; a singular one
 * (a zero scale) throws.
 */
export function routeInverse(
  route: Route,
  q: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  return carryInverse(route, q, out);
}
