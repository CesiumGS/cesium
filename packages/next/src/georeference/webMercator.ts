// Web Mercator (EPSG 3857, the spherical "pseudo" Mercator) on a sphere of
// the ellipsoid's semi-major axis a: geographic (longitude and latitude in
// degrees, height in metres) to (easting, northing, the same height),
//   E = a λ,  N = a asinh(tan φ).
// Closed-form Jacobian and inverse; valid for |φ| < 90°, in practice the
// ±85.0511° the web tiles cover.
import type { SmoothEdge } from "../transform/graph.ts";
import { edgeOf, type TransformDescriptor } from "../transforms/descriptor.ts";
import { checkRadii, WGS84_RADII, type Radii } from "./ellipsoid.ts";

const RAD = Math.PI / 180;

export function webMercatorDescriptor(
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  checkRadii(radii, "webMercator");
  const a = radii[0];
  return {
    id: "webMercator",
    params: {},
    forward(p, _params, out, jacobian) {
      const lon = p[0]!;
      const phi = p[1]! * RAD;
      const h = p[2]!;
      out[0] = a * lon * RAD;
      out[1] = a * Math.asinh(Math.tan(phi));
      out[2] = h;
      if (jacobian) {
        jacobian.fill(0);
        jacobian[0] = a * RAD;
        jacobian[4] = (a * RAD) / Math.cos(phi);
        jacobian[8] = 1;
      }
    },
    inverse(q, _params, out) {
      out[0] = q[0]! / a / RAD;
      out[1] = Math.atan(Math.sinh(q[1]! / a)) / RAD;
      out[2] = q[2]!;
    },
    separable: [],
    source: `(p, params) => {
  const t = Math.tan(p[1] * ${RAD});
  return [${a} * p[0] * ${RAD}, ${a} * Math.log(t + Math.sqrt(t * t + 1)), p[2]];
}`,
  };
}

/** Web Mercator on a sphere of the ellipsoid's semi-major axis (default WGS84's). */
export function webMercator(options: { radii?: Radii } = {}): SmoothEdge {
  return edgeOf(webMercatorDescriptor(options.radii));
}

/**
 * Web Mercator the other way: a node authored in (easting, northing, height),
 * its parent's points longitude and latitude (degrees) and the same height:
 * `E / a`, `atan(sinh(N / a))`. Closed-form Jacobian; the inverse is the
 * projection.
 */
export function webMercatorToGeographicDescriptor(
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  checkRadii(radii, "webMercatorToGeographic");
  const a = radii[0];
  return {
    id: "webMercatorToGeographic",
    params: {},
    forward(q, _params, out, jacobian) {
      out[0] = q[0]! / a / RAD;
      out[1] = Math.atan(Math.sinh(q[1]! / a)) / RAD;
      out[2] = q[2]!;
      if (jacobian) {
        jacobian.fill(0);
        jacobian[0] = 1 / (a * RAD);
        jacobian[4] = 1 / (a * RAD * Math.cosh(q[1]! / a));
        jacobian[8] = 1;
      }
    },
    inverse(p, _params, out) {
      out[0] = a * p[0]! * RAD;
      out[1] = a * Math.asinh(Math.tan(p[1]! * RAD));
      out[2] = p[2]!;
    },
    separable: [],
    source: `(p, params) => [p[0] * ${1 / (a * RAD)}, Math.atan(Math.sinh(p[1] / ${a})) * ${1 / RAD}, p[2]]`,
  };
}

/** The unprojection of `webMercator`: projected (easting, northing, height) to longitude, latitude (degrees) and height. */
export function webMercatorToGeographic(
  options: { radii?: Radii } = {},
): SmoothEdge {
  return edgeOf(webMercatorToGeographicDescriptor(options.radii));
}
