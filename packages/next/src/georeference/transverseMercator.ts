// Transverse Mercator on an ellipsoid of revolution, Karney's 6th-order
// Krüger series (the one PROJ's `etmerc` uses, accurate to nanometres within
// about 3900 km of the central meridian): a UTM zone or any central meridian.
// The node's points are geographic (longitude and latitude in degrees,
// ellipsoidal height in metres); its parent's are (easting, northing, the
// same height). Compose with `geocentricToGeographic` for body-fixed metres.
// The α series and `utmForm` are scene/warpForms.ts's (the spike's forms, in
// ECEF); the inverse is the β series and Newton on τ. The Jacobian is left to
// central differences (the graph's default): the IR's exact derivative is
// the compiler's.
import type { SmoothEdge } from "../transform/graph.ts";
import {
  defaultParams,
  edgeOf,
  type Named,
  type TransformDescriptor,
} from "../transforms/descriptor.ts";
import {
  transverseMercatorSeries,
  utmForm,
  type TransverseMercatorForm,
} from "../scene/warpForms.ts";
import { revolution, WGS84_RADII, type Radii } from "./ellipsoid.ts";

type K = "centralMeridian" | "scaleFactor" | "falseEasting" | "falseNorthing";

const RAD = Math.PI / 180;

/** Krüger's β series (Karney 2011, eq. 36) for third flattening n. */
function betaSeries(n: number): number[] {
  const n2 = n * n;
  const n3 = n2 * n;
  const n4 = n2 * n2;
  const n5 = n4 * n;
  const n6 = n3 * n3;
  return [
    n / 2 -
      (2 * n2) / 3 +
      (37 * n3) / 96 -
      n4 / 360 -
      (81 * n5) / 512 +
      (96199 * n6) / 604800,
    n2 / 48 +
      n3 / 15 -
      (437 * n4) / 1440 +
      (46 * n5) / 105 -
      (1118711 * n6) / 3870720,
    (17 * n3) / 480 - (37 * n4) / 840 - (209 * n5) / 4480 + (5569 * n6) / 90720,
    (4397 * n4) / 161280 - (11 * n5) / 504 - (830251 * n6) / 7257600,
    (4583 * n5) / 161280 - (108847 * n6) / 3991680,
    (20648693 * n6) / 638668800,
  ];
}

/** τ' = tan χ of τ = tan φ (Karney eq. 7–9). */
function taup(tau: number, e: number): number {
  const sigma = Math.sinh(e * Math.atanh((e * tau) / Math.hypot(1, tau)));
  return tau * Math.hypot(1, sigma) - sigma * Math.hypot(1, tau);
}

function sourceOf(
  e: number,
  aOver: number,
  a: number,
  alpha: number[],
): string {
  const lines = [
    "(p, params) => {",
    `  const lam = (p[0] - params.centralMeridian) * ${Math.PI / 180};`,
    `  const phi = p[1] * ${Math.PI / 180};`,
    "  const tau = Math.tan(phi);",
    `  const es = ${e} * Math.sin(phi);`,
    `  const sigma = Math.sinh(${e} * 0.5 * Math.log((1 + es) / (1 - es)));`,
    "  const taup = tau * Math.sqrt(1 + sigma * sigma) - sigma * Math.sqrt(1 + tau * tau);",
    "  const cl = Math.cos(lam);",
    "  const sl = Math.sin(lam);",
    "  const hyp = Math.hypot(taup, cl);",
    "  const xi0 = Math.atan2(taup, cl);",
    "  const sh = sl / hyp;",
    "  const eta0 = Math.log(sh + Math.sqrt(sh * sh + 1));",
    "  let xi = xi0;",
    "  let eta = eta0;",
  ];
  alpha.forEach((coefficient, i) => {
    const j2 = 2 * (i + 1);
    lines.push(
      `  xi = xi + ${coefficient} * Math.sin(${j2} * xi0) * Math.cosh(${j2} * eta0);`,
      `  eta = eta + ${coefficient} * Math.cos(${j2} * xi0) * Math.sinh(${j2} * eta0);`,
    );
  });
  lines.push(
    `  const ka = params.scaleFactor * ${a * aOver};`,
    "  return [params.falseEasting + ka * eta, params.falseNorthing + ka * xi, p[2]];",
    "}",
  );
  return lines.join("\n");
}

export function transverseMercatorDescriptor(
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  const { a, b, e2 } = revolution(radii, "transverseMercator");
  const e = Math.sqrt(e2);
  const f = 1 - b / a;
  const n = f / (2 - f);
  const series = transverseMercatorSeries(n);
  const beta = betaSeries(n);
  const e2m = 1 - e2;
  return {
    id: "transverseMercator",
    params: {
      centralMeridian: {
        default: 0,
        min: -180,
        max: 180,
        description: "the central meridian, degrees",
      },
      scaleFactor: {
        default: 0.9996,
        min: 1e-6,
        description: "the scale on the central meridian",
      },
      falseEasting: { default: 500000, description: "m" },
      falseNorthing: { default: 0, description: "m" },
    },
    forward(p, params, out) {
      const v = params as Named<K>;
      const lon = p[0]!;
      const lat = p[1]!;
      const h = p[2]!;
      const lam = (lon - v.centralMeridian) * RAD;
      const phi = lat * RAD;
      const tp = taup(Math.tan(phi), e);
      const cl = Math.cos(lam);
      const xi0 = Math.atan2(tp, cl);
      const eta0 = Math.asinh(Math.sin(lam) / Math.hypot(tp, cl));
      let xi = xi0;
      let eta = eta0;
      for (let j = 1; j <= 6; j++) {
        xi +=
          series.alpha[j - 1]! *
          Math.sin(2 * j * xi0) *
          Math.cosh(2 * j * eta0);
        eta +=
          series.alpha[j - 1]! *
          Math.cos(2 * j * xi0) *
          Math.sinh(2 * j * eta0);
      }
      const ka = v.scaleFactor * a * series.a;
      out[0] = v.falseEasting + ka * eta;
      out[1] = v.falseNorthing + ka * xi;
      out[2] = h;
    },
    inverse(q, params, out) {
      const v = params as Named<K>;
      const ka = v.scaleFactor * a * series.a;
      const xi = (q[1]! - v.falseNorthing) / ka;
      const eta = (q[0]! - v.falseEasting) / ka;
      const h = q[2]!;
      let xip = xi;
      let etap = eta;
      for (let j = 1; j <= 6; j++) {
        xip -= beta[j - 1]! * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
        etap -= beta[j - 1]! * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
      }
      const target = Math.sin(xip) / Math.hypot(Math.sinh(etap), Math.cos(xip));
      let tau = target / e2m;
      for (let i = 0; i < 8; i++) {
        const tpa = taup(tau, e);
        const dtau =
          ((target - tpa) * (1 + e2m * tau * tau)) /
          (e2m * Math.hypot(1, tau) * Math.hypot(1, tpa));
        tau += dtau;
        if (Math.abs(dtau) < 1e-15 * Math.max(1, Math.abs(tau))) {
          break;
        }
      }
      out[0] =
        v.centralMeridian + Math.atan2(Math.sinh(etap), Math.cos(xip)) / RAD;
      out[1] = Math.atan(tau) / RAD;
      out[2] = h;
    },
    separable: ["scaleFactor", "falseEasting", "falseNorthing"],
    source: sourceOf(e, series.a, a, series.alpha),
  };
}

/**
 * Transverse Mercator about `centralMeridian` degrees (UTM's scale and false
 * easting by default); `latitudeOfOrigin` (degrees, default 0) puts the
 * false northing there instead of at the equator.
 */
export function transverseMercator(options: {
  centralMeridian: number;
  latitudeOfOrigin?: number;
  scaleFactor?: number;
  falseEasting?: number;
  falseNorthing?: number;
  radii?: Radii;
}): SmoothEdge {
  const descriptor = transverseMercatorDescriptor(options.radii);
  const values = {
    centralMeridian: options.centralMeridian,
    ...(options.scaleFactor !== undefined && {
      scaleFactor: options.scaleFactor,
    }),
    ...(options.falseEasting !== undefined && {
      falseEasting: options.falseEasting,
    }),
    falseNorthing: options.falseNorthing ?? 0,
  };
  if (options.latitudeOfOrigin) {
    const params = {
      ...defaultParams(descriptor),
      ...values,
      falseNorthing: 0,
    };
    const origin = new Float64Array(3);
    descriptor.forward(
      [options.centralMeridian, options.latitudeOfOrigin, 0],
      params,
      origin,
    );
    values.falseNorthing -= origin[1]!;
  }
  return edgeOf(descriptor, values);
}

/** UTM zone 1 to 60, north or south. */
export function utm(options: {
  zone: number;
  hemisphere?: "north" | "south";
  radii?: Radii;
}): SmoothEdge {
  const form: TransverseMercatorForm = utmForm(
    options.zone,
    options.hemisphere,
    options.radii,
  );
  return transverseMercator({
    centralMeridian: form.centralMeridian,
    scaleFactor: form.scaleFactor!,
    falseEasting: form.falseEasting!,
    falseNorthing: form.falseNorthing!,
    ...(options.radii !== undefined && { radii: options.radii }),
  });
}
