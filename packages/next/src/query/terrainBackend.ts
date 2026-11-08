/**
 * The query interface's terrain engine for 5a (spec section 7.10): each
 * ray is traced exactly against the drawn terrain's CPU triangles
 * (`castTerrainRay`, plan §13.10), in the Earth-fixed coordinates of the
 * globe's anchor. A GPU ray-query engine replaces this backend, not the
 * callers (`queries.ts`).
 */
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import { castTerrainRay, type TerrainRayTarget } from "../globe/terrainRay.ts";
import type { AnchorHandle, World } from "../scene/World.ts";
import {
  createSpatialQueries,
  type QueryHost,
  type RayAnswer,
  type RayBackend,
  type RayQuery,
  type SpatialQueries,
  type TerrainQueryOptions,
  type UnknownSpan,
} from "./queries.ts";

/**
 * The answer for the segment `from`–`to` (metres, in the coordinates of
 * `target`'s tiles: Earth-fixed) against the terrain as drawn: blocked
 * where it meets a drawn triangle (a hit within 1 mm of either end is an
 * observer's own ground); clear when the whole segment is over drawn terrain
 * and clears it by more than the terrain's error (each tile's geometric
 * error plus the source's), leaving out each end's own ground; unknown
 * otherwise, with the spans not drawn ("notLoaded") or drawn only as a
 * coarse stand-in ("notRefined"), or where it passes within the error
 * ("withinError"). Above the terrain's height band it is clear by
 * construction.
 */
export function terrainRayAnswer(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  target: TerrainRayTarget,
  options: TerrainQueryOptions = {},
): RayAnswer {
  const source = options.sourceAccuracy;
  const ray = castTerrainRay(from, to, target, {
    ...(source ? { sourceAccuracy: source.meters } : {}),
    ...(options.groundRadius !== undefined
      ? { groundRadius: options.groundRadius }
      : {}),
  });
  if (!ray) {
    return {
      verdict: "unknown",
      unknown: [{ from: 0, to: 1, reason: "unsupported" }],
      accuracy: { note: "endpoints are not finite; nothing traced" },
    };
  }
  const { length, known, unknown, band } = ray;
  const unknownLength = unknown.notDrawn + unknown.notRefined;
  const spans: UnknownSpan[] =
    length === 0
      ? known || !band
        ? []
        : [
            {
              from: 0,
              to: 1,
              reason:
                ray.unknownSpans[0]?.reason === "not refined"
                  ? "notRefined"
                  : "notLoaded",
            },
          ]
      : ray.unknownSpans.map((s) => ({
          from: s.from,
          to: s.to,
          reason: s.reason === "not refined" ? "notRefined" : "notLoaded",
        }));
  // Extension point (plan §13.10): buildings and BIM (3D Tiles) keep no CPU
  // triangles; the draws target answers them (`drawBackend.ts`), and a
  // query naming both gets the nearer hit (`combineRayAnswers`).
  const blocked = ray.hit !== undefined;
  const roomy = ray.margin !== undefined && ray.margin.meters > 0;
  if (!blocked && band && known && !roomy) {
    // Within the terrain's error: at the deciding clearance, or over the
    // whole segment when none was measured beyond the ends' own ground.
    const at = ray.margin?.t;
    spans.push(
      at === undefined
        ? { from: 0, to: 1, reason: "withinError" }
        : { from: at, to: at, reason: "withinError" },
    );
    spans.sort((a, b) => a.from - b.from || a.to - b.to);
  }
  const verdict = blocked
    ? "blocked"
    : !band
      ? "clear" // never enters the height band terrain can occupy
      : unknownLength > 0 || !known || !roomy
        ? "unknown"
        : "clear";
  if (verdict === "unknown" && spans.length === 0) {
    // Nothing traced at all (a segment touching the height band at one
    // point): a span of no width, so the unknown share stays 0.
    spans.push({ from: 0, to: 0, reason: "notLoaded" });
  }

  const meters = known
    ? known.geometricError + (source ? source.meters : 0)
    : undefined;
  const notes: string[] = [];
  const ceiling = (target.maximumHeight ?? 9000) + 100;
  if (!band) {
    notes.push(
      `the path stays above ${ceiling} m, higher than any terrain: clear`,
    );
  } else if (known) {
    const levels =
      known.minLevel === known.maxLevel
        ? `level ${known.minLevel}`
        : `levels ${known.minLevel}–${known.maxLevel}`;
    notes.push(
      `exact against the drawn terrain triangles (${levels}); the drawn surface may lie up to ±${round(known.geometricError)} m from the source's heights (level ${known.minLevel}'s geometric error, the coarsest crossed)`,
    );
    notes.push(
      "that per-level error (level zero's, halving each level, as 1.x) is a heuristic, not a bound: quantized-mesh carries no per-tile error (a real bound is plan §13.16's)",
    );
    notes.push(
      source
        ? `plus the source's own ±${source.meters} m (${source.statistic})`
        : "the source's own accuracy is not stated",
    );
  } else {
    notes.push("no drawn terrain under the path");
  }
  if (band && ray.above > 0) {
    notes.push(
      `${percent(ray.above / length)}% of the path is above ${ceiling} m, clear there`,
    );
  }
  if (unknownLength > 0) {
    const unknownFraction = Math.min(1, unknownLength / length);
    const why: string[] = [];
    if (unknown.notDrawn > 0) {
      why.push(
        `${percent(unknown.notDrawn / length)}% not drawn (not loaded, or out of view)`,
      );
    }
    if (unknown.notRefined > 0) {
      why.push(
        `${percent(unknown.notRefined / length)}% not refined (a coarser tile stands in while finer ones load)`,
      );
    }
    notes.push(
      `terrain unknown over ${percent(unknownFraction)}% of the path: ${why.join(", ")}${verdict === "unknown" ? ", so clearance is unknown" : ""}`,
    );
  }
  const min = ray.minClearance;
  if (blocked) {
    if (min !== undefined && meters !== undefined && -min.meters < meters) {
      notes.push(
        `the block (${round(-min.meters)} m deep) is within the terrain's error, so the true terrain may not block`,
      );
    }
  } else if (ray.margin && !roomy) {
    notes.push(
      `away from the observers' own ground the path passes ${round(ray.margin.clearance)} m above the drawn terrain, within its ±${round(ray.margin.error)} m error, so the true terrain may block`,
    );
  }
  const note = notes.join("; ");
  const clearance =
    min || ray.margin
      ? {
          ...(min && { min: { meters: min.meters, t: min.t } }),
          ...(ray.margin && {
            margin: {
              meters: ray.margin.meters,
              clearance: ray.margin.clearance,
              error: ray.margin.error,
              t: ray.margin.t,
            },
          }),
        }
      : undefined;
  return {
    verdict,
    ...(ray.hit && {
      hit: { t: ray.hit.t, position: ray.hit.point },
    }),
    unknown: spans,
    accuracy: meters === undefined ? { note } : { meters, note },
    ...(clearance && { clearance }),
  };
}

/**
 * Where a query's rays meet the terrain: the target to trace, or why
 * there is none (the ray answers "unknown", `"unsupported"`, saying so).
 */
export type TerrainTargetFor = (query: RayQuery) => TerrainRayTarget | string;

/** The terrain backend: each ray of each query traced on the CPU. */
export function terrainBackend(targetFor: TerrainTargetFor): RayBackend {
  return {
    answer: (queries) =>
      queries.map((query) => {
        const target = targetFor(query);
        return query.rays.map((ray) =>
          typeof target === "string"
            ? {
                verdict: "unknown",
                unknown: [{ from: 0, to: 1, reason: "unsupported" }],
                accuracy: { note: target },
              }
            : terrainRayAnswer(ray.from, ray.to, target, query.terrain),
        );
      }),
  };
}

/**
 * The globe a query's rays meet in `world` under `anchor` (a shown one
 * first), as drawn in the views of `viewMask`, or why there is none.
 */
export function globeTarget(
  tilesets: readonly Tileset3D[],
  world: World,
  anchor: AnchorHandle | undefined,
  viewMask: number,
): TerrainRayTarget | string {
  const globes = tilesets.filter(
    (t) => t.world === world && t.terrain && t.anchor === anchor,
  );
  const globe = globes.find((t) => t.show) ?? globes[0];
  if (!globe) {
    return anchor === undefined
      ? "no globe under the transform table's root (Earth-fixed rays name the Earth's anchor): terrain not traced"
      : `no globe under ${anchor.name}: terrain not traced`;
  }
  return (
    globe.terrainRayTarget(viewMask) ??
    `the globe under ${anchor!.name} keeps no triangles for rays: terrain not traced`
  );
}

/**
 * The query interface over one terrain target the caller built (a test
 * hill, a synthetic tile), whatever the query's anchor: for checks run
 * away from an engine. Without a `host` it never loads (every answer
 * final, revision 0) and has no ticks (a standing query is answered once).
 */
export function terrainQueries(
  target: TerrainRayTarget,
  host: Partial<QueryHost> = {},
): SpatialQueries {
  return createSpatialQueries(
    { terrain: terrainBackend(() => target) },
    {
      revision: () => 0,
      loading: () => false,
      onTick: () => () => {},
      ...host,
    },
  );
}

function round(x: number): string {
  return Math.abs(x) >= 10 ? x.toFixed(0) : x.toFixed(1);
}

/** A share as a whole percent that is never 0 or 100 unless it is. */
function percent(fraction: number): string {
  const p = fraction * 100;
  if (p <= 0 || p >= 100) {
    return p <= 0 ? "0" : "100";
  }
  return String(Math.min(99, Math.max(1, Math.round(p))));
}
