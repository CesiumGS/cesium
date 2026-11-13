// What the declared bounds of the georeference built-ins share
// (`TransformDescriptor.bound`): the ellipsoid's radii of curvature, and the
// local metric of geographic coordinates at a point (a `Region`'s radius there
// is in east, north and up metres). Every bound here is sound over its
// region and not tight: it is what selection pads a tile's drawn volume by.
import type { Radii } from "./ellipsoid.ts";

export const RAD = Math.PI / 180;

/** The smallest and largest principal radius of curvature of the surface of an ellipsoid with these semi-axes: c²/a and a²/c, for the shortest c and longest a. */
export function curvatureRadii(radii: Radii): { min: number; max: number } {
  const lo = Math.min(radii[0], radii[1], radii[2]);
  const hi = Math.max(radii[0], radii[1], radii[2]);
  return { min: (lo * lo) / hi, max: (hi * hi) / lo };
}

/** The meridian and prime-vertical radii of curvature at geodetic latitude `phi` (radians) on an ellipsoid of revolution. */
export function principalRadii(
  a: number,
  e2: number,
  phi: number,
): { meridian: number; primeVertical: number } {
  const s = Math.sin(phi);
  const w = 1 - e2 * s * s;
  return {
    meridian: (a * (1 - e2)) / (w * Math.sqrt(w)),
    primeVertical: a / Math.sqrt(w),
  };
}

/**
 * The local metric at geographic (latitude `lat` degrees, height `h`): the
 * metres per radian of longitude (`east`, the distance from the axis) and of
 * latitude (`north`), and the largest the meridian radius gets within
 * `reach` metres of north (`meridianMax`, by its monotonicity in |φ|).
 */
export function localMetric(
  a: number,
  e2: number,
  lat: number,
  h: number,
  reach: number,
): {
  east: number;
  north: number;
  /** The angle (radians) `reach` metres north span. */
  dphi: number;
  meridianMax: number;
  /** Radius of the parallel through the centre, the surface's (N cos φ). */
  parallel: number;
} {
  const phi = lat * RAD;
  const { meridian, primeVertical } = principalRadii(a, e2, phi);
  const north = meridian + h;
  const dphi = reach / north;
  const lo = Math.max(0, Math.abs(phi) - dphi);
  const hi = Math.min(Math.PI / 2, Math.abs(phi) + dphi);
  const meridianMax = Math.max(
    principalRadii(a, e2, lo).meridian,
    principalRadii(a, e2, hi).meridian,
  );
  return {
    east: (primeVertical + h) * Math.cos(phi),
    north,
    dphi,
    meridianMax,
    parallel: primeVertical * Math.cos(phi),
  };
}

/** The largest |value| of a·b over a in [a0, a1], b in [b0, b1] (a bilinear form's extremes are at the corners). */
export function largestProduct(
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  return Math.max(
    Math.abs(a[0] * b[0]),
    Math.abs(a[0] * b[1]),
    Math.abs(a[1] * b[0]),
    Math.abs(a[1] * b[1]),
  );
}
