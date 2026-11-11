// A pick as a true point (CESIUM2_WEBGPU_PLAN.md §13.26, placement increment
// 6). A core pick carries the depth's position, which is where the content is
// drawn; under a warp that differs from where it is. When the pick variant
// resolved a domain point the content's own point is `CorePick.truePosition`
// and nothing is inverted. When it didn't (a billboard, a point, the bare
// ellipsoid, a face with no b-rep) the drawn position goes back through the
// route's inverse, and the answer says it is provisional and by how much the
// inverse missed.
import {
  routeForward,
  routeInverse,
  routeIsRigid,
  type Route,
} from "../camera/route.ts";
import type { FrameKey } from "../camera/frameResolver.ts";
import type { CorePick } from "../scene/pick.ts";
import { drawnThrough, type DrawnThrough } from "./drawn.ts";

/** How a pick's true point was found. */
export type TruthHow =
  /** The content's own point at the hit's domain point (`CorePick.truePosition`). */
  | "domain"
  /** The drawn position carried back through the route's inverse: provisional. */
  | "inverse"
  /** The depth's position, where nothing bends the content: drawn is true. */
  | "depth"
  /** The depth's position, where the route could not be inverted: it is the drawn point, not a true one. */
  | "drawn";

/** A pick's true point, with what the view drew it through. */
export interface TruePick {
  /** The point, in the hit anchor's coordinates (`frame`), m. */
  readonly position: Float64Array;
  /** The frame it is in: the hit anchor, else the render root. */
  readonly frame: FrameKey;
  readonly how: TruthHow;
  /** Whether the point is an estimate (`how` is `inverse` or `drawn`). */
  readonly provisional: boolean;
  /** What the view drew the content through; absent when through no warp. */
  readonly drawn?: DrawnThrough;
  /** Where it is drawn (render space), m, when through a warp. */
  readonly drawnPosition?: Float64Array;
  /** The route that draws the hit anchor's content, when it crosses a warp: the pick's own (`CorePick.route`, each scale as it was when drawn), else the view's now. */
  readonly route?: Route;
  /** Render space ← the anchor, when the view gave it (a route's affine part). */
  readonly placement?: Float64Array;
  /** The size of one CSS pixel at the hit in what is drawn, m. */
  readonly footprint: number;
  /**
   * The size of one CSS pixel at the hit in true metres, at most:
   * `footprint` over σ_min of the route (the second review's flaw 6: a
   * pixel's worth of drawn metres is at most 1/σ_min of true ones). Equal to
   * `footprint` where nothing is drawn through a warp.
   */
  readonly trueFootprint: number;
  /**
   * Worst case, m: how far `position` may be from where the content is,
   * beyond the pixel: the domain point's own bound (`CorePick.accuracy`), or
   * the inverse's residual (the drawn position the inverse maps back to,
   * against the one read). 0 where nothing is said.
   */
  readonly bound: number;
  /** In words, how it was found and what it can claim. */
  readonly note: string;
}

/** `view`'s methods a pick reads its route with; a `View` has them, a fake may not. */
interface RouteView {
  anchorRoute?(anchor: CorePick["anchor"]): Route | undefined;
  anchorPlacement?(anchor: CorePick["anchor"]): Float64Array | undefined;
}

/** The warped route that draws the hit's content: the one kept with the pick, else the view's own now. */
function warpedRoute(pick: CorePick): Route | undefined {
  if (pick.route !== undefined) {
    return pick.route;
  }
  const view = pick.view as unknown as RouteView;
  const route = view.anchorRoute?.(pick.anchor);
  return route !== undefined && !routeIsRigid(route) ? route : undefined;
}

/** One CSS pixel's footprint at the hit, m, in what is drawn. */
export function pixelFootprint(pick: CorePick): number {
  const c = pick.camera;
  const p = pick.anchorPosition;
  const distance = Math.hypot(
    p[0]! - c.position[0]!,
    p[1]! - c.position[1]!,
    p[2]! - c.position[2]!,
  );
  return (distance * 2 * Math.tan(c.fovy / 2)) / c.height;
}

/**
 * `pick` as a true point: its domain point where the pick variant resolved
 * one (exact, nothing inverted), else the route's inverse of the drawn
 * position, else (no warp) the depth's position, which is the content's to
 * the pixel. The footprint of a pixel is converted to true metres by the
 * route's σ_min.
 */
export function truePick(pick: CorePick): TruePick {
  const route = warpedRoute(pick);
  const footprint = pixelFootprint(pick);
  const frame = pick.truePosition?.frame ?? pick.anchor ?? pick.root;
  let position: Float64Array;
  let how: TruthHow;
  let bound = 0;
  let note: string;
  if (pick.truePosition !== undefined) {
    position = Float64Array.from(pick.truePosition.position);
    how = "domain";
    bound = pick.accuracy?.meters ?? 0;
    note = `the content's own point at the hit's domain point (${pick.accuracy?.exact ? "exact" : "on the content's triangle or face"}), never inverted`;
  } else if (route !== undefined) {
    try {
      position = routeInverse(route, pick.position);
      const back = routeForward(route, position);
      bound = Math.hypot(
        back[0]! - pick.position[0]!,
        back[1]! - pick.position[1]!,
        back[2]! - pick.position[2]!,
      );
      how = "inverse";
      note = `the drawn position carried back through the route's inverse (no domain point was resolved): provisional; the inverse's residual is the bound`;
    } catch {
      position = Float64Array.from(pick.anchorPosition);
      how = "drawn";
      note =
        "the drawn position: the route could not be inverted here, so this is where the content is drawn, not where it is";
    }
  } else {
    position = Float64Array.from(pick.anchorPosition);
    how = "depth";
    note = "the depth's position: nothing bends the content, so drawn is true";
  }
  const through =
    route !== undefined ? drawnThrough(route, position) : undefined;
  const sigmaMin = through?.stretch?.[0];
  const trueFootprint =
    sigmaMin !== undefined && sigmaMin > 0 ? footprint / sigmaMin : footprint;
  const view = pick.view as unknown as RouteView;
  const placement = route && view.anchorPlacement?.(pick.anchor);
  return {
    position,
    frame,
    how,
    provisional: how === "inverse" || how === "drawn",
    ...(through !== undefined && { drawn: through }),
    ...(route !== undefined && {
      route,
      drawnPosition: Float64Array.from(pick.position),
    }),
    ...(placement && { placement }),
    footprint,
    trueFootprint,
    bound,
    note,
  };
}
