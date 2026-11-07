import { Ellipsoid, type Cartographic } from "../math/ellipsoid.ts";

/** Default ground spacing between samples, m. */
const DEFAULT_STEP = 30;
/** The most samples one call takes; a longer path coarsens its step. */
const MAX_SAMPLES = 20_000;
/**
 * The steepest terrain gradient (rise over run) the stride skip allows for.
 * A sample `c` metres clear of the ground cannot be reached by terrain
 * climbing at this slope within `c / (SLOPE + |ray slope|)` metres, so the
 * stride may grow to that. 2 is 63 degrees, steeper than any terrain tile
 * resolves.
 */
const MAX_SLOPE = 2;

export interface TerrainLineOfSightOptions {
  /** Metres between samples. Default 30, the finest tile's ground spacing. */
  step?: number;
  /** Default WGS84. */
  ellipsoid?: Ellipsoid;
  /** 1σ error of the terrain heights, m, e.g. the loaded tile's geometric error. */
  terrainAccuracy?: number;
}

export interface TerrainLineOfSight {
  /**
   * `true` when every sample is known and above the terrain, `false` when a
   * known sample is below it, `undefined` when unknown spans could hide an
   * obstruction. Terrain that isn't loaded is never clear.
   */
  clear: boolean | undefined;
  /** The ray's lowest height above the terrain among known samples, m. */
  minClearance?: number;
  /** Earth-fixed position of the first sample below the terrain. */
  blockedAt?: Float64Array;
  /** Share of the path's length whose terrain height was unknown, 0 to 1. */
  unknownFraction: number;
  accuracy: { meters?: number; note: string };
  /** Heights asked of the sampler (a cost measure). */
  samples: number;
}

const lerpScratch = new Float64Array(3);
const geodetic: Cartographic = { longitude: 0, latitude: 0, height: 0 };

/**
 * Whether the straight segment `from`–`to` (Earth-fixed metres) clears the
 * terrain `sampleHeight` describes (ellipsoid height at longitude and latitude
 * in radians; `undefined` where unknown). The segment is a chord in Earth-fixed
 * space, so the earth's curvature enters through the ellipsoid: each sample's
 * height above the ellipsoid is compared with the terrain's.
 *
 * Samples fall every `step` metres, growing where the ray is far above the
 * ground (see `MAX_SLOPE`), and the lowest one is refined with finer samples
 * either side. Endpoints are observers standing on or in the terrain, so they
 * are not tested for blocking, though unknown terrain under them counts as
 * unknown.
 *
 * For a page, pass the globe's `surfaceHeight`, not `sampleHeight`. It is the
 * height of the surface as drawn (the triangle the viewer sees) and what
 * clamped content stands on, so an observer placed on it is not buried;
 * `sampleHeight` interpolates the tile's vertex heights, up to hundreds of
 * metres above the drawn surface on coarse tiles.
 *
 * This is CPU sampling along one ray. A GPU viewshed belongs to plan 5's
 * renderer items.
 */
export function terrainLineOfSight(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  sampleHeight: (longitude: number, latitude: number) => number | undefined,
  options: TerrainLineOfSightOptions = {},
): TerrainLineOfSight {
  const ellipsoid = options.ellipsoid ?? Ellipsoid.WGS84;
  const length = Math.hypot(
    to[0]! - from[0]!,
    to[1]! - from[1]!,
    to[2]! - from[2]!,
  );
  const baseStep = Math.max(options.step ?? DEFAULT_STEP, 1e-3);
  const step = Math.max(baseStep, length / MAX_SAMPLES);
  const coarsened = step > baseStep;

  let samples = 0;
  /** Clearance of the ray at fraction `t` (undefined when unknown); fills `lerpScratch`. */
  const clearanceAt = (t: number): number | undefined => {
    samples++;
    for (let i = 0; i < 3; i++) {
      lerpScratch[i] = from[i]! + (to[i]! - from[i]!) * t;
    }
    if (
      ellipsoid.cartesianToCartographic(lerpScratch, geodetic) === undefined
    ) {
      return undefined;
    }
    const ground = sampleHeight(geodetic.longitude, geodetic.latitude);
    return ground === undefined || !Number.isFinite(ground)
      ? undefined
      : geodetic.height - ground;
  };

  // The first pass: fractions, and the clearance (or undefined) at each.
  const ts: number[] = [];
  const clearances: (number | undefined)[] = [];
  let t = 0;
  let previous: number | undefined;
  let previousT = 0;
  for (;;) {
    const c = clearanceAt(t);
    ts.push(t);
    clearances.push(c);
    if (t >= 1 || length === 0) {
      break;
    }
    let next = step;
    if (c !== undefined && c > 0 && previous !== undefined) {
      // Slope of the ray's clearance so far bounds how fast it can close.
      const rate =
        Math.abs(c - previous) / (Math.max(t - previousT, 1e-12) * length);
      next = Math.max(step, c / (MAX_SLOPE + rate));
    } else if (c !== undefined && c > 0) {
      next = Math.max(step, c / (MAX_SLOPE + 1));
    }
    previous = c;
    previousT = t;
    t = Math.min(1, t + next / length);
  }

  // Each sample stands for the half-intervals either side of it.
  let unknownLength = 0;
  let blockedT: number | undefined;
  let min: number | undefined;
  let minIndex = -1;
  const last = ts.length - 1;
  for (let i = 0; i <= last; i++) {
    const c = clearances[i];
    if (c === undefined) {
      const lo = i === 0 ? 0 : (ts[i - 1]! + ts[i]!) / 2;
      const hi = i === last ? 1 : (ts[i]! + ts[i + 1]!) / 2;
      unknownLength += (hi - lo) * length;
      continue;
    }
    if (i === 0 || i === last) {
      continue;
    }
    if (min === undefined || c < min) {
      min = c;
      minIndex = i;
    }
    if (c < 0 && blockedT === undefined) {
      blockedT = ts[i];
    }
  }

  // Refine around the lowest sample with finer samples either side.
  if (minIndex >= 0 && blockedT === undefined && last > 1) {
    let lo = ts[minIndex - 1]!;
    let hi = ts[minIndex + 1]!;
    for (let round = 0; round < 4 && (hi - lo) * length > 0.5; round++) {
      const n = 8;
      let best = (lo + hi) / 2;
      let bestC = Infinity;
      for (let k = 1; k < n; k++) {
        const tk = lo + ((hi - lo) * k) / n;
        const c = clearanceAt(tk);
        if (c !== undefined && c < bestC) {
          bestC = c;
          best = tk;
        }
      }
      if (bestC < min!) {
        min = bestC;
      }
      if (bestC < 0) {
        blockedT = best;
        break;
      }
      const w = (hi - lo) / n;
      lo = Math.max(lo, best - w);
      hi = Math.min(hi, best + w);
    }
  }

  const unknownFraction =
    length === 0 ? 0 : Math.min(1, unknownLength / length);
  let blockedAt: Float64Array | undefined;
  if (blockedT !== undefined) {
    blockedAt = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      blockedAt[i] = from[i]! + (to[i]! - from[i]!) * blockedT;
    }
  }
  const clear =
    blockedT !== undefined ? false : unknownFraction > 0 ? undefined : true;

  const meters = options.terrainAccuracy;
  const parts = [
    meters === undefined
      ? "terrain accuracy not stated"
      : `terrain heights ±${meters} m`,
    `sampled every ${Math.round(step)} m${coarsened ? " (coarsened for a long path)" : ""}, lowest point refined`,
  ];
  if (unknownFraction > 0) {
    parts.push(
      `terrain unknown over ${(unknownFraction * 100).toFixed(0)}% of the path${clear === undefined ? ", so clearance is unknown" : ""}`,
    );
  }
  const result: TerrainLineOfSight = {
    clear,
    unknownFraction,
    accuracy: { note: parts.join("; ") },
    samples,
  };
  if (meters !== undefined) {
    result.accuracy.meters = meters;
  }
  if (min !== undefined) {
    result.minClearance = min;
  }
  if (blockedAt) {
    result.blockedAt = blockedAt;
  }
  return result;
}
