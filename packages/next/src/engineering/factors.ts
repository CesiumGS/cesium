// Scale factor, elevation factor and grid convergence of an engineering frame
// (plan 4a R7).
//
// PROJ's `proj_factors` gives the projection's point scale k and meridian
// convergence at a longitude and latitude on the CRS's own ellipsoid. The
// projection is built from the projected CRS's PROJ string (its conversion and
// ellipsoid, with the unit of the axes), and the position is the inverse
// projection of the point's projected coordinates, so k and the convergence
// belong to exactly the grid point the engineer gave. They are not evaluated at
// `frame.toGeodetic`'s position: that is on the target's datum (WGS84 for
// EPSG:4979) after the datum operation, a metre or two away, which would change
// k by about 1e-10 (and the results would not match pyproj's Proj.get_factors
// at 1e-12).
import { crsDefinition } from "./crs.ts";
import type { EngineeringFrame } from "./EngineeringFrame.ts";
import type { PJ, ProjApi } from "./projApi.ts";

export interface GridFactors {
  /** The projection's point scale k (PROJ's parallel scale; equal to the meridional one for a conformal projection, to ~1e-11). */
  readonly pointScale: number;
  /** R / (R + h): R the geometric-mean radius sqrt(M N), h the ellipsoidal height. */
  readonly elevationFactor: number;
  /** k x elevationFactor: grid distance = ground distance x combinedFactor. */
  readonly combinedFactor: number;
  /** Radians, from true north to grid north, positive east (PROJ's meridian convergence). */
  readonly convergence: number;
}

interface Projection {
  readonly projection: PJ;
  /** The CRS's ellipsoid: semi-major axis (m) and eccentricity squared. */
  readonly a: number;
  readonly e2: number;
}

const projections = new WeakMap<EngineeringFrame, Projection>();

function projectionOf(frame: EngineeringFrame): Projection {
  const cached = projections.get(frame);
  if (cached !== undefined) {
    return cached;
  }
  const P: ProjApi = frame.proj;
  const crs = P.proj_create(crsDefinition(frame.definition.crs));
  // A compound CRS's horizontal part is its first component.
  const horizontal =
    P.proj_get_type(crs) === P.PJ_TYPE_COMPOUND_CRS
      ? P.proj_crs_get_sub_crs(crs, 0)
      : crs;
  const string = P.proj_as_proj_string(horizontal, P.PJ_PROJ_5);
  if (string === null) {
    throw new Error(
      "gridFactors: PROJ has no projection string for this CRS (a CRS given as WKT2 that PROJ cannot express as a PROJ string is not supported)",
    );
  }
  // "+type=crs" makes PROJ build a CRS object, not the projection itself.
  const projection = P.proj_create(
    string.replace(/\s\+type=crs/, "").replace(/\s\+no_defs/, ""),
  );
  const ellipsoid = P.proj_ellipsoid_get_parameters(
    P.proj_get_ellipsoid(P.proj_crs_get_geodetic_crs(horizontal)),
  );
  const f =
    ellipsoid.semi_major_metre === ellipsoid.semi_minor_metre
      ? 0
      : (ellipsoid.semi_major_metre - ellipsoid.semi_minor_metre) /
        ellipsoid.semi_major_metre;
  const result = {
    projection,
    a: ellipsoid.semi_major_metre,
    e2: f * (2 - f),
  };
  projections.set(frame, result);
  return result;
}

/**
 * The scale and convergence of the frame's projection at a design point, and
 * the elevation factor for its ellipsoidal height. A site scale factor does not
 * enter: the site transform's `scale` is reported separately by callers.
 *
 * The height h of the elevation factor is the ellipsoidal height on the
 * target datum (WGS84 through EPSG:4979), as `frame.toGeodetic` gives it. For
 * NAD83 it differs from the height on the CRS's own datum by about 1-2 m,
 * which moves the elevation factor by about 1e-7: negligible for CAD practice.
 * Throws a RangeError where PROJ has no valid scale (a singular point).
 */
export function gridFactors(
  frame: EngineeringFrame,
  design: ArrayLike<number>,
): GridFactors {
  const P = frame.proj;
  const { projection, a, e2 } = projectionOf(frame);
  const projected = frame.projected(design);
  // Longitude and latitude, radians, on the CRS's own datum.
  const lp = P.proj_trans(
    projection,
    P.PJ_INV,
    P.proj_coord(projected[0]!, projected[1]!, 0, 0),
  ).v;
  const lambda = lp[0]!;
  const phi = lp[1]!;
  if (!Number.isFinite(lambda) || !Number.isFinite(phi)) {
    throw new RangeError(
      `gridFactors: (${projected[0]}, ${projected[1]}) is outside the projection's domain`,
    );
  }
  const factors = P.proj_factors(projection, P.proj_coord(lambda, phi, 0, 0));
  // sqrt(M N) = a sqrt(1 - e2) / (1 - e2 sin^2 phi).
  const R = (a * Math.sqrt(1 - e2)) / (1 - e2 * Math.sin(phi) ** 2);
  const h = frame.toGeodetic(design).height;
  const elevationFactor = R / (R + h);
  // PROJ differentiates numerically, so a conformal projection's meridional and
  // parallel scales differ by ~1e-11 (neither is the exact k to better than
  // that). The parallel scale is the steadier across PROJ versions: it matches
  // pyproj's (PROJ 9.8.1) to 1e-13 where the meridional one differs by 1e-11.
  const pointScale = factors.parallel_scale;
  // PROJ returns zeros (or non-finite values) at a singular point, such as a
  // pole of a Mercator-type projection, instead of failing.
  if (
    !(Number.isFinite(pointScale) && pointScale > 0) ||
    !Number.isFinite(factors.meridian_convergence)
  ) {
    throw new RangeError(
      `gridFactors: PROJ has no scale factor at (${projected[0]}, ${projected[1]}) (scale ${pointScale}, convergence ${factors.meridian_convergence}): a singular point of the projection`,
    );
  }
  return {
    pointScale,
    elevationFactor,
    combinedFactor: pointScale * elevationFactor,
    convergence: factors.meridian_convergence,
  };
}
