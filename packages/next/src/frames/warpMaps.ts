// The scale-aware maps an application calls on a warp or a route (plan §13.26;
// the "Vertical exaggeration" example's gaps): where a point goes through a
// warp's edge, and what point went through it, each warp at its live `scale`
// (a slider's one float). A warp's own `inverse` is the inverse at scale 1,
// and a route is the engine's own (`View.anchorRoute`, `CorePick.route`, a
// resolver's `route`), so these are the way to ask at the scale in force.
import {
  routeForward as carryForward,
  routeInverse as carryInverse,
  warpForward as bendForward,
  warpInverse as bendInverse,
  type Route as CoreRoute,
  type Warp as CoreWarp,
  type WarpScale as CoreWarpScale,
} from "../camera/route.ts";

/** A non-rigid edge of the frame graph: a map from one frame to another (see `WarpSpec`, `warpFrame`). */
export type Warp = CoreWarp;

/** The path from a content frame to a base: rigid steps and warp steps in order. */
export type Route = CoreRoute;

/** A number read live that moves a warp's strength (a `PlacementParameter` is one). */
export type WarpScale = CoreWarpScale;

/**
 * `p` carried by the warp at its scale now: `p + s·(forward(p) − p)` (the
 * warp itself at 1, the identity at 0). With `jacobian` (9 numbers),
 * ∂out/∂p likewise, column-major. `p` may be `out`.
 */
export function warpForward(
  warp: Warp,
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  return bendForward(warp, p, out, jacobian);
}

/**
 * `q` in the warp's `to` back to its `from`, at the scale now: the warp's
 * own `inverse` at scale 1, else Newton on `warpForward` and its Jacobian, to
 * `tolerance` metres (default 1e-9, 32 iterations). Throws when it doesn't
 * converge. A warp's own `inverse` is at scale 1 whatever its `scale` says:
 * use this for the point that was drawn at the scale in force.
 */
export function warpInverse(
  warp: Warp,
  q: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
  options: { tolerance?: number; iterations?: number } = {},
): Float64Array {
  return bendInverse(warp, q, out, options);
}

/** A point of `route.frame` carried to `route.base`, in float64, each warp at its scale now. */
export function routeForward(
  route: Route,
  p: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  return carryForward(route, p, out);
}

/**
 * A point of `route.base` carried back to `route.frame`, in float64: each
 * step undone, last first, each warp at its scale now. For a pick's true
 * point, give the route the pick carries (`CorePick.route`, scales as they
 * were when it was drawn), not the view's now.
 */
export function routeInverse(
  route: Route,
  q: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  return carryInverse(route, q, out);
}
