// True values and what was drawn (docs/design/geometry-through-placement-review.md, placement
// increment 6; docs/design/transform-graph.md). A view may draw its content through a route that
// crosses a curvilinear edge: a vertical exaggeration over the content's frame, a
// reprojection. A pick, a snap or a measurement is about where the content
// is, in the content's own frame, which names itself; this module says what
// the view drew it through, so an answer can state "drawn ×10 vertically;
// values are true".
import {
  routeIsAffine,
  curvilinearScaleOf,
  type Route,
} from "../camera/route.ts";
import { routeStretch } from "./routeStretch.ts";

/** One curvilinear map a view drew content through. */
export interface DrawnCurvilinearMap {
  /** The curvilinear map's words ("vertical exaggeration × 10 of height above WGS84"). */
  readonly description: string;
  /** How much of it applies now (its live `scale`; 1 without one). */
  readonly scale: number;
  /** Heights are multiplied by this where the curvilinear map declares a height scale (`CurvilinearMap.heightScale`), at `scale`. */
  readonly heightFactor?: number;
}

/**
 * What a view drew some content through: said beside every pick, snap and
 * measurement whose values are true, so a reader can tell them from what
 * is on the screen.
 */
export interface DrawnThrough {
  /** Whether the content was drawn through any curvilinear map. */
  readonly curvilinear: boolean;
  /** The curvilinear maps, in the order the route crosses them. */
  readonly curvilinearMaps: readonly DrawnCurvilinearMap[];
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

/** What is said of content drawn through no curvilinear map. */
export const DRAWN_AS_IS = "drawn as it is; values are true";

/** The drawn statement of a route crossing no curvilinear map (or of no route). */
export const AFFINE_ONLY: DrawnThrough = Object.freeze({
  curvilinear: false,
  curvilinearMaps: Object.freeze([]) as readonly DrawnCurvilinearMap[],
  revision: 0,
  statement: DRAWN_AS_IS,
});

/**
 * What a route draws content through. Undefined, or an affine route, is
 * `AFFINE_ONLY`. With `at` (a point of the route's own frame) the statement
 * carries [σ_min, σ_max] there.
 */
export function drawnThrough(
  route: Route | undefined,
  at?: ArrayLike<number>,
): DrawnThrough {
  if (route === undefined || routeIsAffine(route)) {
    return AFFINE_ONLY;
  }
  const curvilinearMaps: DrawnCurvilinearMap[] = [];
  for (const step of route.steps) {
    if (step.kind !== "curvilinear") {
      continue;
    }
    const w = step.curvilinearMap;
    const scale = curvilinearScaleOf(w);
    // With a profile (a ceiling) heights are not multiplied by one number: the description says it.
    const k = w.heightScale?.profile ? undefined : w.heightScale?.factor;
    curvilinearMaps.push({
      description:
        w.description ??
        `a curvilinear map from ${w.from.name} to ${w.to.name}`,
      scale,
      ...(k !== undefined && { heightFactor: 1 + scale * (k - 1) }),
    });
  }
  const stretch = at !== undefined ? routeStretch(route, at) : undefined;
  return {
    curvilinear: true,
    curvilinearMaps,
    ...(stretch !== undefined && { stretch }),
    revision: route.revision,
    statement: `${curvilinearMaps.map(describe).join(", then ")}; values are true`,
  };
}

function describe(w: DrawnCurvilinearMap): string {
  if (w.heightFactor !== undefined) {
    return `drawn ×${trim(w.heightFactor)} vertically`;
  }
  return `drawn through ${w.description}${w.scale !== 1 ? ` at ${trim(w.scale)} of its strength` : ""}`;
}

function trim(x: number): string {
  return String(Number(x.toPrecision(4)));
}
