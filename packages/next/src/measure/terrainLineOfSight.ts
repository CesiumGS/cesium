import { castTerrainRay, type TerrainRayTarget } from "../globe/terrainRay.ts";

export interface TerrainLineOfSightOptions {
  /**
   * The terrain source's own vertical accuracy, m (e.g. from its
   * documentation), added to the drawn tiles' geometric error. Unstated, the
   * accuracy covers the drawn mesh's error alone and the note says so.
   */
  sourceAccuracy?: number;
}

export interface TerrainLineOfSight {
  /**
   * `true` when the whole path is over known terrain and above it, `false`
   * when it meets the drawn terrain (even if other spans are unknown),
   * `undefined` when unknown spans could hide an obstruction. Terrain that
   * isn't drawn, or is drawn only as a coarse stand-in while finer tiles
   * load, is never clear.
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
 * may lie that far from it.
 */
export function terrainLineOfSight(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  target: TerrainRayTarget,
  options: TerrainLineOfSightOptions = {},
): TerrainLineOfSight {
  const ray = castTerrainRay(from, to, target);
  if (!ray) {
    return {
      clear: undefined,
      unknownFraction: 1,
      accuracy: { note: "endpoints are not finite; nothing traced" },
    };
  }
  const { length, known, unknown } = ray;
  const unknownLength = unknown.notDrawn + unknown.notRefined;
  const unknownFraction =
    length === 0 ? (known ? 0 : 1) : Math.min(1, unknownLength / length);
  // Extension point (plan §13.10): buildings and BIM (3D Tiles) keep no CPU
  // triangles, so they are ray cast on the GPU (`World.castRays`, batched and
  // asynchronous). A caller that casts this segment there too would merge
  // its nearest hit with `ray.hit` here, nearest first. Until then this is
  // terrain only.
  const blocked = ray.hit !== undefined;
  const clear = blocked
    ? false
    : unknownLength > 0 || !known
      ? undefined
      : true;

  const source = options.sourceAccuracy;
  const meters = known
    ? known.geometricError + (source !== undefined ? source : 0)
    : undefined;
  const notes: string[] = [];
  if (known) {
    const levels =
      known.minLevel === known.maxLevel
        ? `level ${known.minLevel}`
        : `levels ${known.minLevel}–${known.maxLevel}`;
    notes.push(
      `exact against the drawn terrain triangles (${levels}); the drawn surface may lie up to ±${round(known.geometricError)} m from the source's heights (level ${known.minLevel}'s geometric error, the coarsest crossed)`,
    );
    notes.push(
      source !== undefined
        ? `plus the source's own ±${source} m`
        : "the source's own accuracy is not stated",
    );
  } else {
    notes.push("no drawn terrain under the path");
  }
  if (unknownLength > 0) {
    const pct = (x: number) => ((x / length) * 100).toFixed(0);
    const why: string[] = [];
    if (unknown.notDrawn > 0) {
      why.push(
        `${pct(unknown.notDrawn)}% not drawn (not loaded, or out of view)`,
      );
    }
    if (unknown.notRefined > 0) {
      why.push(
        `${pct(unknown.notRefined)}% not refined (a coarser tile stands in while finer ones load)`,
      );
    }
    notes.push(
      `terrain unknown over ${(unknownFraction * 100).toFixed(0)}% of the path: ${why.join(", ")}${clear === undefined ? ", so clearance is unknown" : ""}`,
    );
  }
  const min = ray.minClearance?.meters;
  if (min !== undefined && meters !== undefined && Math.abs(min) < meters) {
    notes.push(
      clear === false
        ? `the block (${round(-min)} m deep) is within the terrain's error, so the true terrain may not block`
        : `the lowest clearance, ${round(min)} m, is within the terrain's error, so the true terrain may block`,
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
  return x >= 10 ? x.toFixed(0) : x.toFixed(1);
}
