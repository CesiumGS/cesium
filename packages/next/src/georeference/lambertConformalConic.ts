// Lambert conformal conic with two standard parallels (EPSG 9802), on an
// ellipsoid of revolution. The node's points are geographic (longitude and
// latitude in degrees, ellipsoidal height in metres); its parent's are
// (easting, northing, the same height). With m(φ) = cos φ / √(1 - e² sin² φ)
// and t(φ) = tan(π/4 - φ/2) / ((1 - e sin φ) / (1 + e sin φ))^(e/2):
//   n = (ln m₁ - ln m₂) / (ln t₁ - ln t₂),  F = m₁ / (n t₁ⁿ),  r = a F tⁿ,
//   θ = n (λ - λ₀),  E = E₀ + r sin θ,  N = N₀ + r_F - r cos θ.
// With equal parallels it is the one-parallel form (n = sin φ₁). The
// Jacobian is closed-form (d ln t / dφ = -(1 - e²) / (cos φ (1 - e² sin² φ)));
// the inverse is exact (the latitude by fixed-point iteration).
import type { SmoothEdge } from "../transform/graph.ts";
import {
  edgeOf,
  type Named,
  type TransformDescriptor,
} from "../transforms/descriptor.ts";
import { revolution, WGS84_RADII, type Radii } from "./ellipsoid.ts";

type K = "lon0" | "lat0" | "lat1" | "lat2" | "falseEasting" | "falseNorthing";

const RAD = Math.PI / 180;

function sourceOf(a: number, e2: number): string {
  const e = Math.sqrt(e2);
  const t = (name: string, phi: string) => [
    `  const s${name} = Math.sin(${phi});`,
    `  const t${name} = Math.tan(${Math.PI / 4} - ${phi} / 2) / Math.pow((1 - ${e} * s${name}) / (1 + ${e} * s${name}), ${e / 2});`,
  ];
  return [
    "(p, params) => {",
    `  const phi1 = params.lat1 * ${RAD};`,
    `  const phi2 = params.lat2 * ${RAD};`,
    `  const phiF = params.lat0 * ${RAD};`,
    `  const phi = p[1] * ${RAD};`,
    ...t("1", "phi1"),
    ...t("2", "phi2"),
    ...t("F", "phiF"),
    ...t("P", "phi"),
    `  const m1 = Math.cos(phi1) / Math.sqrt(1 - ${e2} * s1 * s1);`,
    `  const m2 = Math.cos(phi2) / Math.sqrt(1 - ${e2} * s2 * s2);`,
    "  const den = Math.log(t1) - Math.log(t2);",
    "  const same = Math.abs(den) < 1e-14;",
    "  const n = same ? s1 : (Math.log(m1) - Math.log(m2)) / (same ? 1 : den);",
    `  const aF = ${a} * m1 / (n * Math.pow(t1, n));`,
    "  const r = aF * Math.pow(tP, n);",
    "  const rF = aF * Math.pow(tF, n);",
    `  const theta = n * (p[0] - params.lon0) * ${RAD};`,
    "  return [params.falseEasting + r * Math.sin(theta), params.falseNorthing + rF - r * Math.cos(theta), p[2]];",
    "}",
  ].join("\n");
}

export function lambertConformalConicDescriptor(
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  const { a, e2 } = revolution(radii, "lambertConformalConic");
  const e = Math.sqrt(e2);
  const m = (phi: number) =>
    Math.cos(phi) / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const t = (phi: number) => {
    const s = e * Math.sin(phi);
    return Math.tan(Math.PI / 4 - phi / 2) / ((1 - s) / (1 + s)) ** (e / 2);
  };
  /** n, a F and r_F for the parallels and origin latitude. */
  const constants = (v: Named<K>) => {
    const phi1 = v.lat1 * RAD;
    const phi2 = v.lat2 * RAD;
    const den = Math.log(t(phi1)) - Math.log(t(phi2));
    const n =
      Math.abs(den) < 1e-14
        ? Math.sin(phi1)
        : (Math.log(m(phi1)) - Math.log(m(phi2))) / den;
    const aF = (a * m(phi1)) / (n * t(phi1) ** n);
    return { n, aF, rF: aF * t(v.lat0 * RAD) ** n };
  };
  return {
    id: "lambertConformalConic",
    params: {
      lon0: {
        default: 0,
        min: -180,
        max: 180,
        description: "the origin's longitude, degrees",
      },
      lat0: {
        default: 0,
        min: -90,
        max: 90,
        description: "the origin's latitude, degrees",
      },
      lat1: {
        default: 30,
        min: -89.9,
        max: 89.9,
        description: "the first standard parallel, degrees",
      },
      lat2: {
        default: 60,
        min: -89.9,
        max: 89.9,
        description: "the second standard parallel, degrees",
      },
      falseEasting: { default: 0, description: "m" },
      falseNorthing: { default: 0, description: "m" },
    },
    forward(p, params, out, jacobian) {
      const v = params as Named<K>;
      const lon = p[0]!;
      const phi = p[1]! * RAD;
      const h = p[2]!;
      const { n, aF, rF } = constants(v);
      const tp = t(phi);
      const r = aF * tp ** n;
      const theta = n * (lon - v.lon0) * RAD;
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);
      out[0] = v.falseEasting + r * sin;
      out[1] = v.falseNorthing + rF - r * cos;
      out[2] = h;
      if (jacobian) {
        const s = Math.sin(phi);
        const dlnt = (-(1 - e2) / (Math.cos(phi) * (1 - e2 * s * s))) * RAD;
        const dr = r * n * dlnt;
        jacobian.fill(0);
        jacobian[0] = r * cos * n * RAD;
        jacobian[1] = r * sin * n * RAD;
        jacobian[3] = sin * dr;
        jacobian[4] = -cos * dr;
        jacobian[8] = 1;
      }
    },
    inverse(q, params, out) {
      const v = params as Named<K>;
      const { n, aF, rF } = constants(v);
      const side = Math.sign(n);
      const x = q[0]! - v.falseEasting;
      const y = rF - (q[1]! - v.falseNorthing);
      const r = side * Math.hypot(x, y);
      const theta = Math.atan2(side * x, side * y);
      const tp = (r / aF) ** (1 / n);
      let phi = Math.PI / 2 - 2 * Math.atan(tp);
      for (let i = 0; i < 30; i++) {
        const s = e * Math.sin(phi);
        const next =
          Math.PI / 2 - 2 * Math.atan(tp * ((1 - s) / (1 + s)) ** (e / 2));
        const done = Math.abs(next - phi) < 1e-15;
        phi = next;
        if (done) {
          break;
        }
      }
      out[0] = v.lon0 + theta / n / RAD;
      out[1] = phi / RAD;
      out[2] = q[2]!;
    },
    separable: ["falseEasting", "falseNorthing"],
    source: sourceOf(a, e2),
  };
}

/** Lambert conformal conic (2SP) with parallels `lat1` and `lat2` and origin (`lon0`, `lat0`), degrees. */
export function lambertConformalConic(options: {
  lon0: number;
  lat0: number;
  lat1: number;
  lat2: number;
  falseEasting?: number;
  falseNorthing?: number;
  radii?: Radii;
}): SmoothEdge {
  return edgeOf(lambertConformalConicDescriptor(options.radii), {
    lon0: options.lon0,
    lat0: options.lat0,
    lat1: options.lat1,
    lat2: options.lat2,
    ...(options.falseEasting !== undefined && {
      falseEasting: options.falseEasting,
    }),
    ...(options.falseNorthing !== undefined && {
      falseNorthing: options.falseNorthing,
    }),
  });
}
