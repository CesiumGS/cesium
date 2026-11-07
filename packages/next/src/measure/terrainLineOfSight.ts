import { castTerrainRay, type TerrainRayTarget } from "../globe/terrainRay.ts";

export interface TerrainLineOfSightOptions {
  /**
   * The terrain source's own vertical accuracy (e.g. from its
   * documentation): metres and the statistic they are (`"1σ"`, `"LE90"`),
   * added to the drawn tiles' geometric error. Unstated, the accuracy
   * covers the drawn mesh's error alone and the note says so.
   */
  sourceAccuracy?: { meters: number; statistic: string };
}

export interface TerrainLineOfSight {
  /**
   * `true` when the whole path is over known terrain and clears it by more
   * than the terrain's error (each tile's geometric error plus the
   * source's), leaving out the stretch at each end still within that error
   * of its observer's own ground; `false` when it meets the drawn terrain
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
  /** Share of the path's length over unknown terrain, 0 to 1. */
  unknownFraction: number;
  accuracy: { meters?: number; note: string };
}

/**
 * Whether the straight segment `from`–`to` (Earth-fixed metres) clears the
 * terrain as drawn (`target`: `Tileset3D.terrainRayTarget`, the globe's,
 * for the view the answer is shown in). It is an exact ray query against the
 * drawn triangles (`castTerrainRay`, plan §13.10): no sampling step, so a
 * ridge one cell wide is caught wherever it sits, and the earth's curvature
 * comes with the Earth-fixed triangles. Endpoints are observers standing on
 * or above the terrain: a hit within 1 mm of either end is their own ground.
 *
 * Place observers on `surfaceHeight` (the drawn surface), not
 * `sampleHeight`, and again as finer tiles load: an observer left below a
 * refined surface is blocked by the ground above it.
 *
 * The accuracy is the terrain's at the levels the path crossed: the largest
 * geometric error among them (the coarsest level's), plus the source's own
 * when given. The answer is exact for the drawn surface; the true terrain
 * may lie that far from it, so `clear` asks for that much room.
 */
export function terrainLineOfSight(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  target: TerrainRayTarget,
  options: TerrainLineOfSightOptions = {},
): TerrainLineOfSight {
  const source = options.sourceAccuracy;
  const ray = castTerrainRay(
    from,
    to,
    target,
    source ? { sourceAccuracy: source.meters } : {},
  );
  if (!ray) {
    return {
      clear: undefined,
      unknownFraction: 1,
      accuracy: { note: "endpoints are not finite; nothing traced" },
    };
  }
  const { length, known, unknown, band } = ray;
  const unknownLength = unknown.notDrawn + unknown.notRefined;
  const unknownFraction =
    length === 0
      ? known || !band
        ? 0
        : 1
      : Math.min(1, unknownLength / length);
  // Extension point (plan §13.10): buildings and BIM (3D Tiles) keep no CPU
  // triangles, so they are ray cast on the GPU (`World.castRays`, batched and
  // asynchronous). A caller that casts this segment there too would merge
  // its nearest hit with `ray.hit` here, nearest first. Until then this is
  // terrain only.
  const blocked = ray.hit !== undefined;
  const roomy = ray.margin !== undefined && ray.margin.meters > 0;
  const clear = blocked
    ? false
    : !band
      ? true // never enters the height band terrain can occupy
      : unknownLength > 0 || !known || !roomy
        ? undefined
        : true;

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
      `terrain unknown over ${percent(unknownFraction)}% of the path: ${why.join(", ")}${clear === undefined ? ", so clearance is unknown" : ""}`,
    );
  }
  const min = ray.minClearance?.meters;
  if (blocked) {
    if (min !== undefined && meters !== undefined && -min < meters) {
      notes.push(
        `the block (${round(-min)} m deep) is within the terrain's error, so the true terrain may not block`,
      );
    }
  } else if (ray.margin && !roomy) {
    notes.push(
      `away from the observers' own ground the path passes ${round(ray.margin.clearance)} m above the drawn terrain, within its ±${round(ray.margin.error)} m error, so the true terrain may block`,
    );
  }
  const note = notes.join("; ");
  const result: TerrainLineOfSight = {
    clear,
    unknownFraction,
    accuracy: meters === undefined ? { note } : { meters, note },
  };
  if (min !== undefined) {
    result.minClearance = min;
  }
  if (ray.hit) {
    result.blockedAt = ray.hit.point;
  }
  return result;
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
