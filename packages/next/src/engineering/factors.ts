// Scale factor, elevation factor and grid convergence of an engineering frame
// (plan 4a R7).
//
// PROJ's `proj_factors` gives the projection's scales, derivatives and
// meridian convergence at a longitude and latitude on the CRS's own datum;
// the scales are taken against the CRS's own ellipsoid even where PROJ
// projects on another (EPSG:3857's sphere; see gridFactors). The
// projection is built from the projected CRS's PROJ string (its conversion and
// ellipsoid, with the unit of the axes), and the position is the inverse
// projection of the point's projected coordinates, so k and the convergence
// belong to exactly the grid point the engineer gave. They are not evaluated at
// `frame.toGeodetic`'s position: that is on the target's datum (WGS84 for
// EPSG:4979) after the datum operation, a metre or two away, which would change
// k by about 1e-10 (and the results would not match pyproj's Proj.get_factors
// at 1e-12).
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
  readonly projection: PJ;
  /** The CRS's ellipsoid: semi-major axis (m) and eccentricity squared. */
  readonly a: number;
  readonly e2: number;
  /** The semi-major axis (m) of the ellipsoid PROJ projects with, which its derivatives are divided by. */
  readonly projectionA: number;
  /** Whether PROJ projects on the CRS's own ellipsoid, so that its own scales are the CRS's. */
  readonly sameEllipsoid: boolean;
}

/** The ellipsoid a PROJ string projects with: its ellipsoid parameters, as a geographic CRS (PROJ's default is GRS80). */
const ELLIPSOID_TOKEN = /\+(?:ellps|a|b|R|rf|f|es|e)=\S+/g;

function parameters(P: ProjApi, ellipsoid: PJ) {
  const e = P.proj_ellipsoid_get_parameters(ellipsoid);
  const f =
    e.semi_major_metre === e.semi_minor_metre
      ? 0
      : (e.semi_major_metre - e.semi_minor_metre) / e.semi_major_metre;
  return { a: e.semi_major_metre, e2: f * (2 - f) };
}

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
  const own = parameters(
    P,
    P.proj_get_ellipsoid(P.proj_crs_get_geodetic_crs(horizontal)),
  );
  const tokens = string.match(ELLIPSOID_TOKEN) ?? ["+ellps=GRS80"];
  const projected = parameters(
    P,
    P.proj_get_ellipsoid(
      P.proj_crs_get_geodetic_crs(
        P.proj_create(`+proj=longlat ${tokens.join(" ")} +type=crs`),
      ),
    ),
  );
  const result = {
    projection,
    a: own.a,
    e2: own.e2,
    projectionA: projected.a,
    sameEllipsoid:
      Math.abs(projected.a - own.a) <= 1e-6 &&
      Math.abs(projected.e2 - own.e2) <= 1e-15,
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
  const { projection, a, e2, projectionA, sameEllipsoid } = projectionOf(frame);
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
  const w = 1 - e2 * Math.sin(phi) ** 2;
  // sqrt(M N) = a sqrt(1 - e2) / (1 - e2 sin^2 phi).
  const R = (a * Math.sqrt(1 - e2)) / w;
  const height = frame.toGeodetic(design).height;
  const elevationFactor = R / (R + height);
  // The scales against the CRS's own ellipsoid. PROJ takes its scales against
  // the ellipsoid it projects with, which is not always the CRS's: it writes
  // EPSG:3857 as a spherical +proj=merc on a = b = 6378137, whose parallel
  // scale is 1/cos phi, while the CRS's latitudes are WGS 84's and its true
  // scale is a / (nu cos phi) (IOGP 373-7-2 section 3.2.1.2). So the images of
  // the east and north unit vectors come from PROJ's derivatives, which are
  // of coordinates divided by the projection's semi-major axis a_p, against
  // the CRS ellipsoid's radii of curvature nu = a / sqrt(w) and
  // rho = a (1 - e2) / w^(3/2):
  //   K = d(x, y)/d lambda * a_p / (nu cos phi),
  //   H = d(x, y)/d phi * a_p / rho,
  // with k = |K| and h = |H|. On the CRS's own ellipsoid this is PROJ's own
  // formula (they agree to ~1e-16), and PROJ's values are kept there: they are
  // analytic where PROJ has them, at a pole too, and match pyproj's.
  const ratio = projectionA / a;
  const kx = (factors.dx_dlam * ratio * Math.sqrt(w)) / Math.cos(phi);
  const ky = (factors.dy_dlam * ratio * Math.sqrt(w)) / Math.cos(phi);
  const hx = (factors.dx_dphi * ratio * w * Math.sqrt(w)) / (1 - e2);
  const hy = (factors.dy_dphi * ratio * w * Math.sqrt(w)) / (1 - e2);
  // PROJ differentiates numerically, so a conformal projection's meridional and
  // parallel scales differ by ~1e-11 (neither is the exact k to better than
  // that). The parallel scale is the steadier across PROJ versions: it matches
  // pyproj's (PROJ 9.8.1) to 1e-13 where the meridional one differs by 1e-11.
  const pointScale = sameEllipsoid
    ? factors.parallel_scale
    : Math.hypot(kx, ky);
  const meridionalScale = sameEllipsoid
    ? factors.meridional_scale
    : Math.hypot(hx, hy);
  const arealScale = sameEllipsoid ? factors.areal_scale : kx * hy - ky * hx;
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
