import { Ellipsoid, type Cartographic } from "../math/ellipsoid.ts";

/** Default ground spacing between samples, m. */
const DEFAULT_STEP = 30;
/** The most samples one call takes; a longer path coarsens its step. */
const MAX_SAMPLES = 20_000;

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
  /** Metres between samples actually used (0 for a zero-length path). */
  step: number;
  /**
   * The largest change in terrain height between adjacent samples, m: the
   * error `minClearance` can carry from sampling at `step`.
   */
  stepError: number;
}

const point = new Float64Array(3);
const geodetic: Cartographic = { longitude: 0, latitude: 0, height: 0 };

/**
 * Whether the straight segment `from`–`to` (Earth-fixed metres) clears the
 * terrain `sampleHeight` describes (ellipsoid height at longitude and latitude
 * in radians; `undefined` where unknown). The segment is a chord in Earth-fixed
 * space, so the earth's curvature enters through the ellipsoid: each sample's
 * height above the ellipsoid is compared with the terrain's.
 *
 * Samples fall every `step` metres (coarser only when that would take more
 * than 20,000, and then `clear` is never `true`), and the lowest one is
 * refined with finer samples either side. Features narrower than the step can
 * be missed. Endpoints are observers standing on or in the terrain, so they
 * are not tested for blocking, though unknown terrain under them counts as
 * unknown.
 *
 * For a page, pass the globe's `surfaceHeight`, not `sampleHeight`. It is the
 * height of the surface as drawn (the triangle the viewer sees) and what
 * clamped content stands on, so an observer placed on it is not buried. The
 * caller's `terrainAccuracy` must cover the drawn surface's offset from the
 * true terrain on coarse tiles, since `surfaceHeight` can lie hundreds of
 * metres below `sampleHeight`.
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
  const meters = options.terrainAccuracy;
  const accuracyOf = (note: string): TerrainLineOfSight["accuracy"] =>
    meters === undefined ? { note } : { meters, note };
  const length = Math.hypot(
    to[0]! - from[0]!,
    to[1]! - from[1]!,
    to[2]! - from[2]!,
  );
  const requested = options.step ?? DEFAULT_STEP;
  if (!Number.isFinite(length) || !Number.isFinite(requested)) {
    return {
      clear: undefined,
      unknownFraction: 1,
      accuracy: accuracyOf("endpoints or step are not finite; nothing sampled"),
      step: 0,
      stepError: 0,
    };
  }
  const baseStep = Math.max(requested, 1e-3);
  const n =
    length === 0 ? 0 : Math.min(MAX_SAMPLES, Math.ceil(length / baseStep));
  const coarsened = length > 0 && length / n > baseStep * (1 + 1e-9);
  const step = n === 0 ? 0 : length / n;

  /** Terrain height under the ray at fraction `t`, and the ray's height there. */
  const sampleAt = (
    t: number,
  ): { ground: number | undefined; height: number } => {
    for (let i = 0; i < 3; i++) {
      point[i] = from[i]! + (to[i]! - from[i]!) * t;
    }
    if (ellipsoid.cartesianToCartographic(point, geodetic) === undefined) {
      return { ground: undefined, height: NaN };
    }
    const ground = sampleHeight(geodetic.longitude, geodetic.latitude);
    return {
      ground:
        ground === undefined || !Number.isFinite(ground) ? undefined : ground,
      height: geodetic.height,
    };
  };

  let unknownCount = 0;
  let blockedT: number | undefined;
  let min: number | undefined;
  let minIndex = -1;
  let stepError = 0;
  let previousGround: number | undefined;
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    const { ground, height } = sampleAt(t);
    if (ground === undefined) {
      unknownCount++;
      previousGround = undefined;
      continue;
    }
    if (previousGround !== undefined) {
      stepError = Math.max(stepError, Math.abs(ground - previousGround));
    }
    previousGround = ground;
    if (i === 0 || i === n) {
      continue;
    }
    const c = height - ground;
    if (min === undefined || c < min) {
      min = c;
      minIndex = i;
    }
    if (c < 0 && blockedT === undefined) {
      blockedT = t;
    }
  }

  // Refine around the lowest sample with finer samples either side.
  if (minIndex >= 0 && blockedT === undefined) {
    let lo = (minIndex - 1) / n;
    let hi = (minIndex + 1) / n;
    for (let round = 0; round < 4 && (hi - lo) * length > 0.5; round++) {
      const parts = 8;
      let best = (lo + hi) / 2;
      let bestC = Infinity;
      for (let k = 1; k < parts; k++) {
        const tk = lo + ((hi - lo) * k) / parts;
        const { ground, height } = sampleAt(tk);
        if (ground !== undefined && height - ground < bestC) {
          bestC = height - ground;
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
      const w = (hi - lo) / parts;
      lo = Math.max(lo, best - w);
      hi = Math.min(hi, best + w);
    }
  }

  // Each sample stands for the half-intervals either side of it, so a single
  // unknown sample still counts; a zero-length path is all-or-nothing.
  const unknownFraction =
    n === 0 ? (unknownCount > 0 ? 1 : 0) : Math.min(1, unknownCount / (n + 1));
  let blockedAt: Float64Array | undefined;
  if (blockedT !== undefined) {
    blockedAt = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      blockedAt[i] = from[i]! + (to[i]! - from[i]!) * blockedT;
    }
  }
  const clear =
    blockedT !== undefined
      ? false
      : unknownCount > 0 || coarsened
        ? undefined
        : true;

  const notes = [
    meters === undefined
      ? "terrain accuracy not stated"
      : `terrain heights ±${meters} m (1σ)`,
    `sampled every ${step.toFixed(1)} m; minClearance can differ by up to ${stepError.toFixed(1)} m from sampling (the largest terrain change within one step); features narrower than the step can be missed`,
  ];
  if (coarsened) {
    notes.push(
      `path too long to sample at ${baseStep} m (limit ${MAX_SAMPLES} samples), so clearance is unknown`,
    );
  }
  if (unknownCount > 0) {
    notes.push(
      `terrain unknown over ${(unknownFraction * 100).toFixed(0)}% of the path${clear === undefined ? ", so clearance is unknown" : ""}`,
    );
  }
  const result: TerrainLineOfSight = {
    clear,
    unknownFraction,
    accuracy: accuracyOf(notes.join("; ")),
    step,
    stepError,
  };
  if (min !== undefined) {
    result.minClearance = min;
  }
  if (blockedAt) {
    result.blockedAt = blockedAt;
  }
  return result;
}
