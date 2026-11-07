// Scale factor, elevation factor and grid convergence of an engineering frame
// (plan 4a R7).
//
// PROJ's `proj_factors`, on the projected CRS itself, gives the projection's
// scales, derivatives and meridian convergence at a longitude and latitude on
// the CRS's own datum. The scales are taken against the CRS's own ellipsoid
// even for EPSG's spherical-formula methods, which PROJ projects on a sphere
// (see SPHERICAL_METHODS); the method comes from PROJ's API, not from a PROJ
// string. The position is the inverse of the CRS's conversion at the point's
// projected coordinates, so k and the convergence belong to exactly the grid
// point the engineer gave. They are not evaluated at `frame.toGeodetic`'s
// position: that is on the target's datum (WGS84 for EPSG:4979) after the
// datum operation, a metre or two away, which would change k by about 1e-10
// (and the results would not match pyproj's Proj.get_factors at 1e-12).
import { crsDefinition, unbound } from "./crs.ts";
import type { EngineeringFrame } from "./EngineeringFrame.ts";
import type { PJ, ProjApi } from "./projApi.ts";

export interface GridFactors {
  /**
   * The projection's point scale k: its scale along the parallel against the
   * CRS's own ellipsoid (equal to the meridional scale for a conformal
   * projection, to ~1e-11).
   */
  readonly pointScale: number;
  /** The scale h along the meridian, against the CRS's own ellipsoid. */
  readonly meridionalScale: number;
  /** The areal scale s = h k sin θ′ (Tissot). */
  readonly arealScale: number;
  /** Tissot's maximum angular distortion ω, radians: 2 asin((a′ − b′)/(a′ + b′)), 0 for a conformal projection. */
  readonly angularDistortion: number;
  /** The angle θ′ between the projected meridian and parallel, radians (π/2 for a conformal projection). */
  readonly meridianParallelAngle: number;
  /** R / (R + h): R the geometric-mean radius sqrt(M N), h the ellipsoidal height. */
  readonly elevationFactor: number;
  /** k x elevationFactor: grid distance = ground distance x combinedFactor. */
  readonly combinedFactor: number;
  /** Radians, from true north to grid north, positive east (PROJ's meridian convergence). */
  readonly convergence: number;
}

interface Projection {
  /** The horizontal projected CRS, for proj_factors. */
  readonly crs: PJ;
  /** Its conversion, (lon, lat) degrees to (E, N) in the CRS's units. */
  readonly conversion: PJ;
  /** The CRS's ellipsoid: semi-major axis (m) and eccentricity squared. */
  readonly a: number;
  readonly e2: number;
  /**
   * Set when the CRS's conversion is one of EPSG's spherical-formula methods
   * applied to an ellipsoidal datum, which PROJ projects on a sphere: the
   * sphere's radius a_p (m), which PROJ's derivatives are divided by.
   */
  readonly sphere?: { readonly radius: number; readonly method: string };
}

/**
 * EPSG's spherical-formula methods (every "(Spherical)" method in proj.db,
 * and Pseudo-Mercator) by their EPSG codes, with the radius of the sphere
 * PROJ projects them on when the datum is an ellipsoid:
 *  - Popular Visualisation Pseudo-Mercator (1024): the datum's semi-major
 *    axis (IOGP 373-7-2 section 3.2.1.2);
 *  - Lambert Azimuthal Equal Area (Spherical) (1027; 9821, its deprecated
 *    twin) and Lambert Cylindrical Equal Area (Spherical) (9834): the
 *    authalic sphere's radius, R_A = a sqrt((1 - (1 - e2)/(2e) ln((1 - e)/
 *    (1 + e))) / 2) (sections 3.3.2.1, 3.2.6.1 and the implementation notes);
 *  - Equidistant Cylindrical (Spherical) (1029; 9823): the datum's
 *    semi-major axis. IOGP suggests the conformal sphere at the origin, but
 *    PROJ's eqc forces a sphere of radius a (EPSG:32662 and ESRI:54002's
 *    +proj=eqc +datum=WGS84 still have the sphere's 1/cos phi as their
 *    parallel scale).
 * PROJ's own scales for all of these are the sphere's, so h and k come from
 * the derivatives. checkSphere confirms each radius against PROJ's own
 * coordinates, so a radius PROJ does not use throws rather than misleads.
 *
 * Mercator (Spherical) (1026) is not among them: PROJ 9.7.1 writes it as
 * +proj=merc +R_C, on the conformal sphere at the latitude of origin, R_C =
 * a sqrt(1 - e2) / (1 - e2 sin^2 phi0), and gridFactors refuses it on an
 * ellipsoid (CONFORMAL_SPHERE_METHODS). Supporting it would be one more
 * radius here, R_C(phi0), with tests (a possible later change; plan 4b Task
 * 9). On a sphere PROJ's own scales are right. proj.db has no such CRS
 * today, and PROJ 9.7.1 can't build its deprecated twin, Mercator (1SP)
 * (Spherical) (9841), at all.
 */
const SPHERICAL_METHODS: Readonly<
  Record<string, (a: number, e2: number) => number>
> = {
  "1024": (a) => a,
  "1029": (a) => a,
  "9823": (a) => a,
  "1027": authalicRadius,
  "9821": authalicRadius,
  "9834": authalicRadius,
};

/**
 * EPSG's spherical-formula methods that PROJ projects on the conformal sphere
 * at the latitude of origin when the datum is an ellipsoid, which gridFactors
 * doesn't support there (see SPHERICAL_METHODS).
 */
const CONFORMAL_SPHERE_METHODS: ReadonlySet<string> = new Set(["1026"]);

function authalicRadius(a: number, e2: number): number {
  const e = Math.sqrt(e2);
  return (
    a *
    Math.sqrt((1 - ((1 - e2) / (2 * e)) * Math.log((1 - e) / (1 + e))) * 0.5)
  );
}

const RADIANS_PER_DEGREE = Math.PI / 180;

/** Within this of a pole (radians), the spherical-formula path's derivatives are 0/0. */
const POLE = 1e-9;
/** How closely a_p must match the scale of PROJ's own coordinates (a central difference). */
const SPHERE_CHECK = 1e-6;

const projections = new WeakMap<EngineeringFrame, Projection>();

function projectionOf(frame: EngineeringFrame): Projection {
  const cached = projections.get(frame);
  if (cached !== undefined) {
    return cached;
  }
  const P: ProjApi = frame.proj;
  // A bound CRS's projection is its source CRS's; a compound CRS's horizontal
  // part is its first component (itself possibly bound).
  const crs = unbound(P, P.proj_create(crsDefinition(frame.definition.crs)));
  const horizontal =
    P.proj_get_type(crs) === P.PJ_TYPE_COMPOUND_CRS
      ? unbound(P, P.proj_crs_get_sub_crs(crs, 0))
      : crs;
  // The CRS's conversion, normalized for visualization: (lon, lat) in degrees
  // to (E, N) in the CRS's units, inverted to find a grid point's longitude
  // and latitude on the CRS's own datum. proj_factors takes the projected CRS
  // itself (PROJ applies its conversion), with radians.
  const conversion = P.proj_normalize_for_visualization(
    P.proj_crs_get_coordoperation(horizontal),
  );
  const ellipsoid = P.proj_ellipsoid_get_parameters(
    P.proj_get_ellipsoid(P.proj_crs_get_geodetic_crs(horizontal)),
  );
  const a = ellipsoid.semi_major_metre;
  const f =
    a === ellipsoid.semi_minor_metre ? 0 : (a - ellipsoid.semi_minor_metre) / a;
  const e2 = f * (2 - f);
  // The conversion's method, from PROJ's API (never from its PROJ string).
  const method = P.proj_coordoperation_get_method_info(
    P.proj_crs_get_coordoperation(horizontal),
  );
  if (
    method.method_auth_name === "EPSG" &&
    e2 > 0 &&
    CONFORMAL_SPHERE_METHODS.has(method.method_code)
  ) {
    throw new Error(
      `gridFactors: EPSG method ${method.method_code} (${method.method_name}) on an ellipsoid: PROJ projects it on the conformal sphere R_C(φ0); gridFactors supports this method only on a sphere`,
    );
  }
  const radiusOf =
    method.method_auth_name === "EPSG" && e2 > 0
      ? SPHERICAL_METHODS[method.method_code]
      : undefined;
  const result: Projection = {
    crs: horizontal,
    conversion,
    a,
    e2,
    ...(radiusOf && {
      sphere: {
        radius: radiusOf(a, e2),
        method: `${method.method_name} (EPSG ${method.method_code})`,
      },
    }),
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
  const { crs, conversion, a, e2, sphere } = projectionOf(frame);
  const projected = frame.projected(design);
  // Longitude and latitude, radians, on the CRS's own datum.
  const lp = P.proj_trans(
    conversion,
    P.PJ_INV,
    P.proj_coord(projected[0]!, projected[1]!, 0, 0),
  ).v;
  const lambda = lp[0]! * RADIANS_PER_DEGREE;
  const phi = lp[1]! * RADIANS_PER_DEGREE;
  if (!Number.isFinite(lambda) || !Number.isFinite(phi)) {
    throw new RangeError(
      `gridFactors: (${projected[0]}, ${projected[1]}) is outside the projection's domain`,
    );
  }
  const factors = P.proj_factors(crs, P.proj_coord(lambda, phi, 0, 0));
  const w = 1 - e2 * Math.sin(phi) ** 2;
  // sqrt(M N) = a sqrt(1 - e2) / (1 - e2 sin^2 phi).
  const R = (a * Math.sqrt(1 - e2)) / w;
  const height = frame.toGeodetic(design).height;
  const elevationFactor = R / (R + height);
  // The images K and H of the east and north unit vectors: their directions
  // from PROJ's derivatives, d(x, y)/d lambda and d(x, y)/d phi.
  //
  // PROJ's own scales are kept for every CRS but one kind: EPSG's
  // spherical-formula methods on an ellipsoidal datum (SPHERICAL_METHODS),
  // which PROJ projects on a sphere, so that its scales are the sphere's
  // (3857's parallel scale would be 1/cos phi, not the true a / (nu cos phi)
  // of IOGP 373-7-2 section 3.2.1.2). There the derivatives, which are of
  // coordinates divided by the sphere's radius a_p, are taken against the
  // CRS ellipsoid's radii of curvature nu = a / sqrt(w) and
  // rho = a (1 - e2) / w^(3/2):
  //   K = d(x, y)/d lambda * a_p / (nu cos phi),
  //   H = d(x, y)/d phi * a_p / rho,
  // and k = |K|, h = |H|. Elsewhere K and H are scaled to PROJ's own k and h
  // (analytic where PROJ has them, at a pole too, and matching pyproj's).
  let kx: number;
  let ky: number;
  let hx: number;
  let hy: number;
  if (sphere !== undefined) {
    if (Math.abs(Math.abs(phi) - Math.PI / 2) < POLE) {
      throw new RangeError(
        `gridFactors: (${projected[0]}, ${projected[1]}) is at a pole, where ${sphere.method}'s scales against the ellipsoid are not defined by its derivatives`,
      );
    }
    checkSphere(frame, conversion, lambda, phi, factors, sphere);
    const k = (sphere.radius * Math.sqrt(w)) / (a * Math.cos(phi));
    const h = (sphere.radius * w * Math.sqrt(w)) / (a * (1 - e2));
    kx = factors.dx_dlam * k;
    ky = factors.dy_dlam * k;
    hx = factors.dx_dphi * h;
    hy = factors.dy_dphi * h;
  } else {
    const lengthL = Math.hypot(factors.dx_dlam, factors.dy_dlam);
    const lengthP = Math.hypot(factors.dx_dphi, factors.dy_dphi);
    kx = (factors.dx_dlam / lengthL) * factors.parallel_scale;
    ky = (factors.dy_dlam / lengthL) * factors.parallel_scale;
    hx = (factors.dx_dphi / lengthP) * factors.meridional_scale;
    hy = (factors.dy_dphi / lengthP) * factors.meridional_scale;
  }
  // PROJ differentiates numerically, so a conformal projection's meridional and
  // parallel scales differ by ~1e-11 (neither is the exact k to better than
  // that). The parallel scale is the steadier across PROJ versions: it matches
  // pyproj's (PROJ 9.8.1) to 1e-13 where the meridional one differs by 1e-11.
  const pointScale =
    sphere === undefined ? factors.parallel_scale : Math.hypot(kx, ky);
  const meridionalScale =
    sphere === undefined ? factors.meridional_scale : Math.hypot(hx, hy);
  const arealScale =
    sphere === undefined ? factors.areal_scale : kx * hy - ky * hx;
  // Tissot's indicatrix from J = [K H]: theta' is the angle from K to H, and
  // J's singular values are a' = Q + R and b' = |Q - R| with
  // Q = |(kx + hy, ky - hx)| / 2 and R = |(kx - hy, ky + hx)| / 2, so
  // omega = 2 asin((a' - b')/(a' + b')) = 2 asin(min(Q, R) / max(Q, R)),
  // without the cancellation of sqrt(h^2 + k^2 - 2 s) (Snyder 1987, p. 24).
  // At a pole, where the derivatives give 0/0, PROJ's theta' stands.
  const Q = Math.hypot(kx + hy, ky - hx) / 2;
  const Rt = Math.hypot(kx - hy, ky + hx) / 2;
  const tissotFinite = Number.isFinite(Q) && Number.isFinite(Rt) && Q + Rt > 0;
  const meridianParallelAngle = tissotFinite
    ? Math.atan2(kx * hy - ky * hx, kx * hx + ky * hy)
    : factors.meridian_parallel_angle;
  // There, Snyder's a' ± b' = sqrt(h^2 + k^2 ± 2 s) from PROJ's h, k and s
  // (PROJ's own omega is not usable at a pole: it returns about pi).
  const sum = Math.sqrt(
    pointScale ** 2 + meridionalScale ** 2 + 2 * arealScale,
  );
  const difference = Math.sqrt(
    Math.max(0, pointScale ** 2 + meridionalScale ** 2 - 2 * arealScale),
  );
  const angularDistortion = tissotFinite
    ? 2 * Math.asin(Math.min(Q, Rt) / Math.max(Q, Rt))
    : 2 * Math.asin(difference / sum);
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
    meridionalScale,
    arealScale,
    angularDistortion,
    meridianParallelAngle,
    elevationFactor,
    combinedFactor: pointScale * elevationFactor,
    convergence: factors.meridian_convergence,
  };
}

/**
 * Checks the sphere's radius a_p against the scale of PROJ's own
 * coordinates: |d(E, N)/d lambda| by a central difference of the projection
 * must be a_p times PROJ's normalized derivative. (PROJ computes R_A by a
 * series, about 1e-10 from the closed form, well inside this check.)
 */
function checkSphere(
  frame: EngineeringFrame,
  conversion: PJ,
  lambda: number,
  phi: number,
  factors: { readonly dx_dlam: number; readonly dy_dlam: number },
  sphere: NonNullable<Projection["sphere"]>,
): void {
  const P = frame.proj;
  const step = 1e-6;
  const at = (l: number) =>
    P.proj_trans(
      conversion,
      P.PJ_FWD,
      P.proj_coord(l / RADIANS_PER_DEGREE, phi / RADIANS_PER_DEGREE, 0, 0),
    ).v;
  const east = at(lambda + step);
  const west = at(lambda - step);
  const measured =
    (Math.hypot(east[0]! - west[0]!, east[1]! - west[1]!) / (2 * step)) *
    frame.units.metersPerUnit;
  const expected = Math.hypot(factors.dx_dlam, factors.dy_dlam) * sphere.radius;
  if (!(Math.abs(measured / expected - 1) <= SPHERE_CHECK)) {
    throw new Error(
      `gridFactors: ${sphere.method}: PROJ's coordinates have a sphere radius of ${measured / Math.hypot(factors.dx_dlam, factors.dy_dlam)} m, not the method's ${sphere.radius} m`,
    );
  }
}
