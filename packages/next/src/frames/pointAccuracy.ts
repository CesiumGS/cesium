// The first-order composer that carries a point's accuracy along a route
// through the frame tree, from each edge's stated `FrameAccuracy` (plan 4b,
// Task 7b: "the library composes; the app only declares"). Every figure is
// 1σ. Confidence levels, correlated terms and per-direction error ellipsoids
// are plan 5 (CESIUM2_WEBGPU_PLAN.md §13.14).
import type { Instant } from "../time/Instant.ts";
import type { Frame } from "./Frame.ts";
import { isUnstated } from "./frameAccuracy.ts";
import { convertPoint, framePoint, type FramePoint } from "./local.ts";

/**
 * One part of a point's accuracy, as a distance at the point (1σ, m). An
 * edge's part is what the edge states:
 *
 * - `meters`: the edge's position error, as it is.
 * - `angular`: its rotation error times the lever arm, the point's distance
 *   from that frame's origin.
 * - `exact`: exact by definition, 0 m.
 * - `unstated`: the edge states no accuracy, so the total is unbounded;
 *   it has no `meters`.
 *
 * A picked point (`createFramesPickInterpreter`) also has parts that are
 * no edge's:
 *
 * - `pick`: how the pick itself places the point: `part` `"footprint"`,
 *   one CSS pixel's footprint at the hit; `"depth"`, the rounding of the
 *   depth buffer's float32 depth at the hit.
 * - `content`: how far the content's placement draws its design from where
 *   it truly is (`DesignPlacement.displayError`; 0 m when reprojected).
 */
export type PointAccuracyTerm =
  | {
      /** The reference frame the point is tagged in. */
      readonly frame: string;
      readonly kind: "pick";
      readonly part: "footprint" | "depth";
      /** 1σ, m. */
      readonly meters: number;
      readonly note: string;
    }
  | {
      /** The placement's design reference frame (`DesignPlacement.frameName`). */
      readonly frame: string;
      readonly kind: "content";
      /** 1σ, m. */
      readonly meters: number;
      readonly note: string;
    }
  | {
      /** The frame whose edge (to its parent) it comes from. */
      readonly frame: string;
      readonly kind: "meters" | "exact";
      /** 1σ, m: what it moves the point by (0 for an exact edge). */
      readonly meters: number;
      /** The edge's own note. */
      readonly note: string;
    }
  | {
      readonly frame: string;
      readonly kind: "angular";
      readonly meters: number;
      /** The rotation error, rad (1σ). */
      readonly radians: number;
      /** The point's distance from the frame's origin, m. */
      readonly lever: number;
      readonly note: string;
    }
  | {
      readonly frame: string;
      readonly kind: "unstated";
      /** Not stated: why, in the edge's note. */
      readonly meters?: undefined;
      readonly note: string;
    };

/** What a point's position in another frame can claim (1σ). */
export interface PointAccuracy {
  /** The root sum square of the terms, m; `undefined` when an edge is not stated. */
  readonly meters: number | undefined;
  /**
   * One term per figure on each edge of the route, nearest the point first
   * (a picked point's `pick` and `content` terms before them).
   */
  readonly terms: readonly PointAccuracyTerm[];
  /** The first edge on the route whose accuracy is not stated: the total is then unbounded. */
  readonly unboundedBy?: string;
  /** How the terms combine, in words. */
  readonly combination: string;
}

const COMBINATION =
  "root-sum-square of independent 1σ terms; each rotation error times the point's distance from that frame's origin (an upper bound: the accuracy names no axis)";

/** `frame` and its ancestors, nearest first. */
function chainOf(frame: Frame): Frame[] {
  const out: Frame[] = [];
  for (let f: Frame | undefined = frame; f; f = f.parent) {
    out.push(f);
  }
  return out;
}

/**
 * The edges between `from` and `to`, each named by its child frame: up from
 * `from` to their nearest common ancestor, then down to `to`. Throws across
 * trees.
 */
function routeEdges(from: Frame, to: Frame): Frame[] {
  const up = chainOf(from);
  const down = chainOf(to);
  const meet = up.find((f) => down.includes(f));
  if (meet === undefined) {
    throw new Error(
      `pointAccuracy: no common ancestor of "${from.name}" and "${to.name}"`,
    );
  }
  return [
    ...up.slice(0, up.indexOf(meet)),
    ...down.slice(0, down.indexOf(meet)).reverse(),
  ];
}

/**
 * How accurately `point`'s position is known once it is carried into frame
 * `to`, to first order, from the accuracy each edge on the route states
 * (`Frame`'s `accuracy` option). Every figure is 1σ.
 *
 * - An edge's `meters` moves the point by that much.
 * - An edge's `radians` turns the point about that edge's own frame origin:
 *   it moves by `radians × lever`, where `lever` is the point's distance
 *   from that origin (an upper bound; the accuracy names no axis).
 * - An edge exact by definition adds nothing, and says so.
 * - The terms combine as a root sum square: they are taken as independent.
 * - An edge whose accuracy is not stated gives an `unstated` term, makes
 *   the total unbounded (`meters` undefined) and is named in `unboundedBy`;
 *   it is never dropped.
 *
 * The instant defaults to the point's own (as `convertPoint`). Positions
 * only; correlations, confidence levels and error ellipsoids are not
 * modelled.
 */
export function pointAccuracy(
  point: FramePoint,
  to: Frame,
  instant?: Instant,
): PointAccuracy {
  const at = instant ?? point.instant;
  if (!at) {
    throw new Error(
      "pointAccuracy: no instant, on the point or as an argument",
    );
  }
  const start = framePoint(point.frame, point.position, at);
  const terms: PointAccuracyTerm[] = [];
  let unboundedBy: string | undefined;
  for (const edge of routeEdges(point.frame, to)) {
    const a = edge.accuracy(at);
    const frame = edge.name;
    if (a.byDefinition === true) {
      terms.push({ frame, kind: "exact", meters: 0, note: a.note });
      continue;
    }
    if (isUnstated(a)) {
      terms.push({ frame, kind: "unstated", note: a.note });
      unboundedBy ??= frame;
      continue;
    }
    if (a.meters !== undefined) {
      terms.push({ frame, kind: "meters", meters: a.meters, note: a.note });
    }
    if (a.radians !== undefined) {
      const p = convertPoint(start, edge, at).position;
      const lever = Math.hypot(p[0]!, p[1]!, p[2]!);
      terms.push({
        frame,
        kind: "angular",
        meters: a.radians * lever,
        radians: a.radians,
        lever,
        note: a.note,
      });
    }
  }
  return {
    meters:
      unboundedBy === undefined
        ? Math.hypot(...terms.map((t) => t.meters ?? NaN))
        : undefined,
    terms,
    ...(unboundedBy !== undefined && { unboundedBy }),
    combination: COMBINATION,
  };
}

/** The term that adds the most, if any adds anything (ties: the first). */
export function dominantTerm(
  a: Pick<PointAccuracy, "terms">,
): PointAccuracyTerm | undefined {
  let best: PointAccuracyTerm | undefined;
  for (const t of a.terms) {
    if (t.kind !== "unstated" && t.meters > 0) {
      if (best === undefined || t.meters > (best.meters ?? 0)) {
        best = t;
      }
    }
  }
  return best;
}
