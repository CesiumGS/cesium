// The drawn distance (CESIUM2_WEBGPU_PLAN.md §13.26, the owner's answer 6): the
// one question that is about the drawing, in the view's render space, under a
// name that can't be mistaken for a true distance. What a vector style needs
// (dash lengths, label spacing, symbol density in what is on the screen).
// Everything else a measurement reports is true (`measure`, `drawnThrough`).
import { routeForward, type Route } from "../camera/route.ts";
import type { FrameKey } from "../camera/frameResolver.ts";
import { drawnThrough, type DrawnThrough } from "../frames/drawn.ts";
import type { AnchorHandle } from "../scene/world/types.ts";

/** What yields the route that draws an anchor's content: a `View`. */
export interface DrawnView {
  anchorRoute(anchor: AnchorHandle | undefined): Route | undefined;
}

/** The route of an anchor's content in `view`, or `route` itself. */
function routeOf(
  view: DrawnView | Route | undefined,
  anchor: AnchorHandle | undefined,
): Route | undefined {
  if (view === undefined) {
    return undefined;
  }
  return "steps" in view ? view : view.anchorRoute(anchor);
}

/** `drawnDistance`'s options. */
export interface DrawnDistanceOptions {
  /** The anchor the points' content hangs under (a pick's `anchor`); default the table's root. */
  readonly anchor?: AnchorHandle | undefined;
  /**
   * Metres the drawn path may stray from the routed curve, for
   * `pathLength`; default 1 mm. (The distance between the drawn ends is
   * exact.)
   */
  readonly pathTolerance?: number;
}

/**
 * A distance in what was drawn, in the view's render space (the route's
 * base), and named as one.
 */
export interface DrawnDistance {
  readonly space: "drawn";
  /** "drawn distance: …" — never a true distance; carries the warps' words. */
  readonly label: string;
  /** The straight line between where the two points are drawn, m. */
  readonly distance: number;
  /** The length of the true segment as drawn: a straight true segment draws as a curve, and its dashes and labels follow it. m. */
  readonly pathLength: number;
  /** The true points' straight distance, m, in their own frame: what a measurement reports. */
  readonly trueDistance: number;
  /** Where the points are drawn (the route's base), m. */
  readonly from: Float64Array;
  readonly to: Float64Array;
  /** The frame the drawn values are in. */
  readonly frame: FrameKey;
  readonly through: DrawnThrough;
}

/**
 * The drawn distance between two true points of an anchor's content, as the
 * view draws them: where each end is drawn (`routeForward`, float64) and
 * the length of the curve the true straight segment between them is drawn
 * as. It scales with a vertical exaggeration where the true distance does
 * not. For what a vector style needs (dash lengths, label spacing, symbol
 * density in what is on the screen), never for a measurement.
 *
 * `view` is the view that draws the content (`View.anchorRoute`), or the
 * route itself. Content drawn through no warp has the drawn distance equal to
 * the true one, in the anchor's coordinates (rigid placement).
 */
export function drawnDistance(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  view: DrawnView | Route | undefined,
  options: DrawnDistanceOptions = {},
): DrawnDistance {
  const route = routeOf(view, options.anchor);
  const trueDistance = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!);
  const from = route
    ? routeForward(route, a)
    : Float64Array.from([a[0]!, a[1]!, a[2]!]);
  const to = route
    ? routeForward(route, b)
    : Float64Array.from([b[0]!, b[1]!, b[2]!]);
  const distance = Math.hypot(
    to[0]! - from[0]!,
    to[1]! - from[1]!,
    to[2]! - from[2]!,
  );
  const through = drawnThrough(route, midpoint(a, b));
  let pathLength = distance;
  if (route && through.warped) {
    pathLength = routedLength(route, a, b, options.pathTolerance ?? 1e-3);
  }
  return {
    space: "drawn",
    label: `drawn distance${through.warped ? ` (${through.statement.replace("; values are true", "")})` : ""}: what is on the screen, not a true distance`,
    distance,
    pathLength,
    trueDistance,
    from,
    to,
    frame: route?.base ?? { name: "the view's render space" },
    through,
  };
}

function midpoint(a: ArrayLike<number>, b: ArrayLike<number>): number[] {
  return [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2, (a[2]! + b[2]!) / 2];
}

/**
 * The length of the route's image of the segment a→b: a polyline refined
 * until three interior points of each piece are within `tolerance` m of its
 * chord. The polyline is below the curve's length by about the squared
 * deviation over the piece's length.
 */
function routedLength(
  route: Route,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  tolerance: number,
): number {
  const p = new Float64Array(3);
  const at = (t: number) => {
    p[0] = a[0]! + t * (b[0]! - a[0]!);
    p[1] = a[1]! + t * (b[1]! - a[1]!);
    p[2] = a[2]! + t * (b[2]! - a[2]!);
    return routeForward(route, p);
  };
  const go = (
    t0: number,
    q0: Float64Array,
    t1: number,
    q1: Float64Array,
    depth: number,
  ): number => {
    const chord = Math.hypot(q1[0]! - q0[0]!, q1[1]! - q0[1]!, q1[2]! - q0[2]!);
    let worst = 0;
    const mid = [0.25, 0.5, 0.75].map((f) => {
      const q = at(t0 + f * (t1 - t0));
      worst = Math.max(worst, distanceToSegment(q, q0, q1));
      return q;
    });
    if (worst <= tolerance || depth >= 30) {
      // Through the three interior points: the polyline is the sum of its pieces.
      let sum = 0;
      let prev = q0;
      for (const q of [...mid, q1]) {
        sum += Math.hypot(q[0]! - prev[0]!, q[1]! - prev[1]!, q[2]! - prev[2]!);
        prev = q;
      }
      return Math.max(sum, chord);
    }
    const tm = (t0 + t1) / 2;
    const qm = mid[1]!;
    return go(t0, q0, tm, qm, depth + 1) + go(tm, qm, t1, q1, depth + 1);
  };
  return go(0, at(0), 1, at(1), 0);
}

/** The distance from `q` to the segment `a`→`b`. */
export function distanceToSegment(
  q: ArrayLike<number>,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): number {
  const ex = b[0]! - a[0]!,
    ey = b[1]! - a[1]!,
    ez = b[2]! - a[2]!;
  const length2 = ex * ex + ey * ey + ez * ez;
  const qx = q[0]! - a[0]!,
    qy = q[1]! - a[1]!,
    qz = q[2]! - a[2]!;
  const f =
    length2 > 0
      ? Math.min(1, Math.max(0, (qx * ex + qy * ey + qz * ez) / length2))
      : 0;
  return Math.hypot(qx - f * ex, qy - f * ey, qz - f * ez);
}
