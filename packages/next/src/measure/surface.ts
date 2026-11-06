/** The distance over a body: Karney's geodesic between two points' geodetic footprints. */
import { Geodesic } from "geographiclib-geodesic";
import { cartographic, type Ellipsoid } from "../math/ellipsoid.ts";
import { vec3, type Vec3 } from "../math/vec3.ts";

const RADIANS = Math.PI / 180;

export interface SurfaceDistance {
  /** The geodesic's length between the two footprints on the ellipsoid, m. */
  distance: number;
  /** The height of b above the ellipsoid minus the height of a, m. */
  heightDifference: number;
  /** The forward azimuth at A's footprint, radians clockwise from north (GeographicLib's azi1). */
  azimuthA: number;
  /**
   * The forward azimuth at B's footprint, radians clockwise from north: the direction of
   * travel continuing past B (GeographicLib's azi2), not the bearing back to A.
   */
  azimuthB: number;
}

function toVec3(p: ArrayLike<number>): Vec3 {
  return vec3(p[0]!, p[1]!, p[2]!);
}

/**
 * The geodesic distance between the geodetic footprints of two body-fixed points (m), the
 * height difference b − a, and the azimuths at both ends. It uses Karney's algorithm on the
 * ellipsoid of revolution with the equatorial radius a and flattening (a − c)/a, so a sphere
 * (the Moon) has flattening 0. For coincident points the distance is 0 and the azimuths are
 * whatever GeographicLib returns.
 *
 * Throws if a point is at the body's center, where there is no footprint.
 */
export function surfaceDistance(
  ellipsoid: Ellipsoid,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): SurfaceDistance {
  const ga = ellipsoid.cartesianToCartographic(toVec3(a), cartographic());
  const gb = ellipsoid.cartesianToCartographic(toVec3(b), cartographic());
  if (ga === undefined || gb === undefined) {
    throw new Error(
      "surfaceDistance: a point is at the body's center, which has no geodetic footprint",
    );
  }
  const equatorial = ellipsoid.radii[0]!;
  const polar = ellipsoid.radii[2]!;
  const geodesic = new Geodesic.Geodesic(
    equatorial,
    (equatorial - polar) / equatorial,
  );
  const r = geodesic.Inverse(
    ga.latitude / RADIANS,
    ga.longitude / RADIANS,
    gb.latitude / RADIANS,
    gb.longitude / RADIANS,
  );
  return {
    distance: r.s12!,
    heightDifference: gb.height - ga.height,
    azimuthA: r.azi1! * RADIANS,
    azimuthB: r.azi2! * RADIANS,
  };
}
