// True values and what was drawn (CESIUM2_WEBGPU_PLAN.md §13.26, placement
// increment 6; §13.37). A view may draw its content through a route that
// crosses a smooth edge: a vertical exaggeration over the content's frame, a
// reprojection. A pick, a snap or a measurement is about where the content
// is, in the content's own frame, which names itself; this module says what
// the view drew it through, so an answer can state "drawn ×10 vertically;
// values are true".
import { routeIsRigid, warpScaleOf, type Route } from "../camera/route.ts";
import { routeStretch } from "./routeStretch.ts";

/** One warp a view drew content through. */
export interface DrawnWarp {
  /** The warp's words ("vertical exaggeration × 10 of height above WGS84"). */
  readonly description: string;
  /** How much of it applies now (its live `scale`; 1 without one). */
  readonly scale: number;
  /** Heights are multiplied by this where the warp declares a height scale (`Warp.heightScale`), at `scale`. */
  readonly heightFactor?: number;
}

/**
 * What a view drew some content through: said beside every pick, snap and
 * measurement whose values are true, so a reader can tell them from what
 * is on the screen.
 */
export interface DrawnThrough {
  /** Whether the content was drawn through any warp. */
  readonly warped: boolean;
  /** The warps, in the order the route crosses them. */
  readonly warps: readonly DrawnWarp[];
  /**
   * [σ_min, σ_max] of the route's Jacobian where asked (`drawnThrough`'s
   * `at`): drawn distances over true ones, at least and at most. An
   * estimate (`routeStretch`).
   */
  readonly stretch?: readonly [number, number];
  /** The route's revision when this was said: a change is a new statement. */
  readonly revision: number;
  /** In words: "drawn ×10 vertically; values are true". */
  readonly statement: string;
}

/** What is said of content drawn through no warp. */
export const DRAWN_AS_IS = "drawn as it is; values are true";

/** The drawn statement of a route crossing no warp (or of no route). */
export const UNWARPED: DrawnThrough = Object.freeze({
  warped: false,
  warps: Object.freeze([]) as readonly DrawnWarp[],
  revision: 0,
  statement: DRAWN_AS_IS,
});

/**
 * What a route draws content through. Undefined, or a rigid route, is
 * `UNWARPED`. With `at` (a point of the route's own frame) the statement
 * carries [σ_min, σ_max] there.
 */
export function drawnThrough(
  route: Route | undefined,
  at?: ArrayLike<number>,
): DrawnThrough {
  if (route === undefined || routeIsRigid(route)) {
    return UNWARPED;
  }
  const warps: DrawnWarp[] = [];
  for (const step of route.steps) {
    if (step.kind !== "warp") {
      continue;
    }
    const w = step.warp;
    const scale = warpScaleOf(w);
    const k = w.heightScale?.factor;
    warps.push({
      description:
        w.description ?? `a warp from ${w.from.name} to ${w.to.name}`,
      scale,
      ...(k !== undefined && { heightFactor: 1 + scale * (k - 1) }),
    });
  }
  const stretch = at !== undefined ? routeStretch(route, at) : undefined;
  return {
    warped: true,
    warps,
    ...(stretch !== undefined && { stretch }),
    revision: route.revision,
    statement: `${warps.map(describe).join(", then ")}; values are true`,
  };
}

function describe(w: DrawnWarp): string {
  if (w.heightFactor !== undefined) {
    return `drawn ×${trim(w.heightFactor)} vertically`;
  }
  return `drawn through ${w.description}${w.scale !== 1 ? ` at ${trim(w.scale)} of its strength` : ""}`;
}

function trim(x: number): string {
  return String(Number(x.toPrecision(4)));
}
