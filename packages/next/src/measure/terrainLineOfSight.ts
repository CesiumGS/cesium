import type { SpatialQueries } from "../query/queries.ts";
import type { View } from "../scene/View.ts";
import type { AnchorHandle } from "../scene/world/types.ts";

export interface TerrainLineOfSightOptions {
  /**
   * The terrain source's own vertical accuracy (e.g. from its
   * documentation): metres and the statistic they are (`"1σ"`, `"LE90"`),
   * added to the drawn tiles' geometric error. Unstated, the accuracy
   * covers the drawn mesh's error alone and the note says so.
   */
  sourceAccuracy?: { meters: number; statistic: string };
  /**
   * How far from each end (horizontal m) the path counts as over its
   * observer's own ground, where the terrain's error doesn't count against
   * it (default 30, about a source's posting). Never beyond the drawn
   * triangle the observer stands over.
   */
  groundRadius?: number;
}

export interface TerrainLineOfSight {
  /**
   * `true` when the whole path is over known terrain and clears it by more
   * than the terrain's error (each tile's geometric error plus the
   * source's), leaving out each end's own ground (the drawn triangle it
   * stands over, at most `groundRadius`); `false` when it meets the drawn terrain
   * (even if other spans are unknown); `undefined` otherwise: unknown spans
   * could hide an obstruction, or the true terrain could block within its
   * error. Terrain that isn't drawn, or is drawn only as a coarse stand-in
   * while finer tiles load, is never clear. Above the terrain's height band
   * the path is clear by construction.
   */
  clear: boolean | undefined;
  /**
   * The segment's lowest height above the drawn terrain over its known
   * spans, m, ends included (an observer standing on the ground gives 0).
   */
  minClearance?: number;
  /** Earth-fixed position where the segment first meets the terrain. */
  blockedAt?: Float64Array;
  /**
   * The deciding clearance, away from each end's own ground (the drawn
   * triangle it stands over, at most `groundRadius`): the lowest clearance
   * there less the terrain's error under it. `meters` > 0 is room to spare
   * (clear); ≤ 0 is inside the error (may block). `clearance` and `error`
   * are its parts, m; `at` is where it is (Earth-fixed), `t` the fraction
   * of the way from `from` to `to`. Undefined when no known span lies
   * outside the ends' own ground.
   */
  margin?: {
    meters: number;
    clearance: number;
    error: number;
    t: number;
    at: Float64Array;
  };
  /** Share of the path's length over unknown terrain, 0 to 1. */
  unknownFraction: number;
  accuracy: { meters?: number; note: string };
}

/**
 * Whether the straight segment `from`–`to` (metres, Earth-fixed under the
 * Earth's anchor: pass it, `options.anchor`) clears the terrain as drawn, answered through the query
 * interface (`queries`: `Engine.queries`, or `terrainQueries` over a
 * terrain the caller built) for the view the answer is shown in
 * (`options.view`). Today's engine is an exact ray query against the drawn
 * triangles (plan §13.10): no sampling step, so a ridge one cell wide is
 * caught wherever it sits, and the earth's curvature comes with the
 * Earth-fixed triangles. Endpoints are observers standing on or above the
 * terrain: a hit within 1 mm of either end is their own ground.
 *
 * Place observers on `surfaceHeight` (the drawn surface), not
 * `sampleHeight`, and again as finer tiles load: an observer left below a
 * refined surface is blocked by the ground above it.
 *
 * The accuracy is the terrain's at the levels the path crossed: the largest
 * geometric error among them (the coarsest level's), plus the source's own
 * when given. The answer is exact for the drawn surface; the true terrain
 * may lie that far from it, so `clear` asks for that much room.
 *
 * Asynchronous (plan 5a's call 39): a GPU engine answers a tick or more
 * later. Terrain only; buildings and BIM are the query's `"draws"` target.
 */
export async function terrainLineOfSight(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  queries: SpatialQueries,
  options: TerrainLineOfSightOptions & {
    /**
     * The anchor whose coordinates `from` and `to` are in. On
     * `Engine.queries` pass the globe's (`globe.anchor`, the Earth's): it
     * has no default, and without one the rays are in the transform
     * table's root, where no globe is, so every answer is "unknown"
     * (`"unsupported"`). `terrainQueries` ignores it.
     */
    anchor?: AnchorHandle;
    /** Only the terrain this view draws (default: any view's). */
    view?: View;
    /** The scene time, UTC seconds since 1970 (default 0; the Earth-fixed terrain doesn't move with it). */
    seconds?: number;
    signal?: AbortSignal;
  } = {},
): Promise<TerrainLineOfSight> {
  const { sourceAccuracy, groundRadius, anchor, view, seconds, signal } =
    options;
  const answer = await queries.castRays(
    {
      anchor,
      seconds: seconds ?? 0,
      rays: [{ from, to }],
      targets: ["terrain"],
      ...(view && { view }),
      terrain: {
        ...(sourceAccuracy && { sourceAccuracy }),
        ...(groundRadius !== undefined && { groundRadius }),
      },
    },
    signal ? { signal } : {},
  );
  const ray = answer.rays[0]!;
  let unknown = 0;
  for (const span of ray.unknown) {
    if (span.reason !== "withinError") {
      unknown += span.to - span.from;
    }
  }
  const result: TerrainLineOfSight = {
    clear:
      ray.verdict === "clear"
        ? true
        : ray.verdict === "blocked"
          ? false
          : undefined,
    unknownFraction: Math.min(1, unknown),
    accuracy:
      ray.accuracy.meters === undefined
        ? { note: ray.accuracy.note }
        : { meters: ray.accuracy.meters, note: ray.accuracy.note },
  };
  const min = ray.clearance?.min;
  if (min !== undefined) {
    result.minClearance = min.meters;
  }
  if (ray.hit) {
    result.blockedAt = ray.hit.position;
  }
  const margin = ray.clearance?.margin;
  if (margin) {
    const { meters, clearance, error, t } = margin;
    const at = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      at[i] = from[i]! + t * (to[i]! - from[i]!);
    }
    result.margin = { meters, clearance, error, t, at };
  }
  return result;
}
