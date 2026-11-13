// Geographic and geocentric coordinates of an ellipsoid of revolution, the two
// directions as nodes. `geographicToGeocentric`: (longitude, latitude in
// degrees, height in metres) to body-fixed (x, y, z) metres, closed form:
//   N = a / √(1 - e² sin² φ),
//   (x, y, z) = ((N + h) cos φ cos λ, (N + h) cos φ sin λ, (N (1 - e²) + h) sin φ).
// `geocentricToGeographic`: the other way, by the foot of the point on the
// ellipsoid (Newton, as in ellipsoid.ts), valid away from the centre. The
// Jacobians are closed form (the second is the first's inverse at the
// result), and each node's inverse is the other's function.
import type { SmoothEdge } from "../transform/graph.ts";
import { edgeOf, type TransformDescriptor } from "../transforms/descriptor.ts";
import {
  footSource,
  heightFrame,
  invert3,
  locate,
  revolution,
  WGS84_RADII,
  type Radii,
} from "./ellipsoid.ts";
import { curvatureRadii, localMetric, RAD as DEG } from "./regionBounds.ts";

const RAD = Math.PI / 180;

/** Geographic to geocentric (and J, column-major), the shared closed form. */
function toGeocentric(
  a: number,
  e2: number,
  lon: number,
  lat: number,
  h: number,
  out: Float64Array,
  jacobian?: Float64Array,
): void {
  const lam = lon * RAD;
  const phi = lat * RAD;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const w = 1 - e2 * s * s;
  const nn = a / Math.sqrt(w);
  const cl = Math.cos(lam);
  const sl = Math.sin(lam);
  out[0] = (nn + h) * c * cl;
  out[1] = (nn + h) * c * sl;
  out[2] = (nn * (1 - e2) + h) * s;
  if (jacobian) {
    const dn = (nn * e2 * s * c) / w;
    jacobian[0] = -(nn + h) * c * sl * RAD;
    jacobian[1] = (nn + h) * c * cl * RAD;
    jacobian[2] = 0;
    jacobian[3] = (dn * c - (nn + h) * s) * cl * RAD;
    jacobian[4] = (dn * c - (nn + h) * s) * sl * RAD;
    jacobian[5] = (dn * (1 - e2) * s + (nn * (1 - e2) + h) * c) * RAD;
    jacobian[6] = c * cl;
    jacobian[7] = c * sl;
    jacobian[8] = s;
  }
}

export function geographicToGeocentricDescriptor(
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  const { a, e2 } = revolution(radii, "geographicToGeocentric");
  const frame = heightFrame();
  return {
    id: "geographicToGeocentric",
    params: {},
    forward(p, _params, out, jacobian) {
      toGeocentric(a, e2, p[0]!, p[1]!, p[2]!, out, jacobian);
    },
    inverse(q, _params, out) {
      const x = q[0]!;
      const y = q[1]!;
      locate(radii, q, frame, false);
      const { n } = frame;
      out[0] = Math.atan2(y, x) / RAD;
      out[1] = Math.atan2(n[2]!, Math.hypot(n[0]!, n[1]!)) / RAD;
      out[2] = frame.h;
    },
    bound(region) {
      // The columns for east, north and up at the centre are orthogonal: the
      // distance from the axis over the centre's, the meridian radius and
      // height over the centre's, and 1.
      const c = region.center;
      const r = region.radius;
      const m = localMetric(a, e2, c[1]!, c[2]!, r);
      if (!(m.east > 0)) {
        return { lipschitz: Infinity };
      }
      const east = 1 + (r + curvatureRadii(radii).max * m.dphi) / m.east;
      const north = (m.meridianMax + c[2]! + r) / m.north;
      return { lipschitz: Math.max(east, north, 1) };
    },
    separable: [],
    source: `(p, params) => {
  const lam = p[0] * ${RAD};
  const phi = p[1] * ${RAD};
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const nn = ${a} / Math.sqrt(1 - ${e2} * s * s);
  return [
    (nn + p[2]) * c * Math.cos(lam),
    (nn + p[2]) * c * Math.sin(lam),
    (nn * ${1 - e2} + p[2]) * s,
  ];
}`,
  };
}

export function geocentricToGeographicDescriptor(
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  const { a, e2 } = revolution(radii, "geocentricToGeographic");
  const frame = heightFrame();
  const geo = new Float64Array(3);
  const ecef = new Float64Array(3);
  const forwardJ = new Float64Array(9);
  return {
    id: "geocentricToGeographic",
    params: {},
    forward(p, _params, out, jacobian) {
      const x = p[0]!;
      const y = p[1]!;
      locate(radii, p, frame, false);
      const { n } = frame;
      geo[0] = Math.atan2(y, x) / RAD;
      geo[1] = Math.atan2(n[2]!, Math.hypot(n[0]!, n[1]!)) / RAD;
      geo[2] = frame.h;
      out[0] = geo[0];
      out[1] = geo[1];
      out[2] = geo[2];
      if (jacobian) {
        toGeocentric(a, e2, geo[0], geo[1], geo[2], ecef, forwardJ);
        invert3(forwardJ, jacobian);
      }
    },
    inverse(q, _params, out) {
      toGeocentric(a, e2, q[0]!, q[1]!, q[2]!, out);
    },
    bound(region) {
      // Longitude, latitude and height in the metric at the output's centre:
      // the rows of J are orthogonal, of norm (distance from the axis at the
      // centre) / (at the point), (M + h at the centre) / (at the point),
      // and 1.
      const x = region.center[0]!;
      const y = region.center[1]!;
      const r = region.radius;
      try {
        locate(radii, region.center, frame, false);
      } catch {
        return { lipschitz: Infinity };
      }
      const { n, h } = frame;
      const lat = Math.atan2(n[2]!, Math.hypot(n[0]!, n[1]!)) / DEG;
      const m = localMetric(a, e2, lat, h, r);
      const axis = Math.hypot(x, y);
      const lowest = curvatureRadii(radii).min + h - r;
      if (!(axis > r && lowest > 0)) {
        return { lipschitz: Infinity };
      }
      return { lipschitz: Math.max(axis / (axis - r), m.north / lowest, 1) };
    },
    separable: [],
    source: [
      "(p, params) => {",
      ...footSource(radii),
      `  return [Math.atan2(ny, nx) * ${1 / RAD}, Math.atan2(nz, Math.hypot(nx, ny)) * ${1 / RAD}, h];`,
      "}",
    ].join("\n"),
  };
}

/** Longitude, latitude (degrees) and height to body-fixed metres on the ellipsoid of `radii` (default WGS84). */
export function geographicToGeocentric(
  options: { radii?: Radii } = {},
): SmoothEdge {
  return edgeOf(geographicToGeocentricDescriptor(options.radii));
}

/** Body-fixed metres to longitude, latitude (degrees) and height on the ellipsoid of `radii` (default WGS84). */
export function geocentricToGeographic(
  options: { radii?: Radii } = {},
): SmoothEdge {
  return edgeOf(geocentricToGeographicDescriptor(options.radii));
}
