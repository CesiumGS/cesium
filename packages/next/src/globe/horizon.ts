/**
 * Horizon culling against the WGS84 ellipsoid, as 1.x `EllipsoidalOccluder`
 * (https://cesium.com/blog/2013/04/25/Horizon-culling/). Points are in
 * "scaled space", where the ellipsoid is the unit sphere. Tiles reaching
 * below the ellipsoid use a shrunk ellipsoid (radii + minimum height) for
 * both the occludee point and the visibility test.
 */
import type { Vec3 } from "../math/vec3.ts";

const RADII = [6378137.0, 6378137.0, 6356752.314245179] as const;
const MINIMUM_RADIUS = RADII[2];

/** Radii of the (possibly shrunk) occluding ellipsoid. */
function radiiFor(minimumHeight: number | undefined): readonly number[] {
  return minimumHeight !== undefined &&
    minimumHeight < 0 &&
    MINIMUM_RADIUS > -minimumHeight
    ? RADII.map((r) => r + minimumHeight)
    : RADII;
}

/**
 * The scaled-space point that is visible exactly when any of `positions`
 * may be, with the ellipsoid shrunk below sea level when `minimumHeight` is
 * negative (1.x computeHorizonCullingPointPossiblyUnderEllipsoid).
 * `positions` holds x, y, z triples. Undefined when no such point exists.
 */
export function horizonCullingPoint(
  directionToPoint: ArrayLike<number>,
  positions: ArrayLike<number>,
  minimumHeight: number | undefined,
): Vec3 | undefined {
  const radii = radiiFor(minimumHeight);
  let dx = directionToPoint[0]!;
  let dy = directionToPoint[1]!;
  let dz = directionToPoint[2]!;
  if (dx !== 0 || dy !== 0 || dz !== 0) {
    dx /= radii[0]!;
    dy /= radii[1]!;
    dz /= radii[2]!;
    const length = Math.hypot(dx, dy, dz);
    dx /= length;
    dy /= length;
    dz /= length;
  }
  let result = 0;
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const sx = positions[i]! / radii[0]!;
    const sy = positions[i + 1]! / radii[1]!;
    const sz = positions[i + 2]! / radii[2]!;
    let magnitudeSquared = sx * sx + sy * sy + sz * sz;
    let magnitude = Math.sqrt(magnitudeSquared);
    const ux = sx / magnitude;
    const uy = sy / magnitude;
    const uz = sz / magnitude;
    // Points below the ellipsoid count as on it.
    magnitudeSquared = Math.max(1, magnitudeSquared);
    magnitude = Math.max(1, magnitude);
    const cosAlpha = ux * dx + uy * dy + uz * dz;
    const sinAlpha = Math.hypot(
      uy * dz - uz * dy,
      uz * dx - ux * dz,
      ux * dy - uy * dx,
    );
    const cosBeta = 1 / magnitude;
    const sinBeta = Math.sqrt(magnitudeSquared - 1) * cosBeta;
    const candidate = 1 / (cosAlpha * cosBeta - sinAlpha * sinBeta);
    if (candidate < 0) {
      // Not all points face the same way.
      return undefined;
    }
    result = Math.max(result, candidate);
  }
  if (result <= 0 || !Number.isFinite(result)) {
    return undefined;
  }
  return Float64Array.of(dx * result, dy * result, dz * result);
}

/**
 * Whether a scaled-space occludee point can be seen from `camera` past the
 * ellipsoid's limb (1.x isScaledSpacePointVisiblePossiblyUnderEllipsoid).
 */
export function isScaledSpacePointVisible(
  camera: ArrayLike<number>,
  occludee: ArrayLike<number>,
  minimumHeight: number | undefined,
): boolean {
  const radii = radiiFor(minimumHeight);
  const cx = camera[0]! / radii[0]!;
  const cy = camera[1]! / radii[1]!;
  const cz = camera[2]! / radii[2]!;
  const vhMagnitudeSquared = cx * cx + cy * cy + cz * cz - 1;
  const tx = occludee[0]! - cx;
  const ty = occludee[1]! - cy;
  const tz = occludee[2]! - cz;
  const vtDotVc = -(tx * cx + ty * cy + tz * cz);
  const occluded =
    vhMagnitudeSquared < 0
      ? vtDotVc > 0
      : vtDotVc > vhMagnitudeSquared &&
        (vtDotVc * vtDotVc) / (tx * tx + ty * ty + tz * tz) >
          vhMagnitudeSquared;
  return !occluded;
}
