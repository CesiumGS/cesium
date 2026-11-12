import { smooth, type SmoothEdge } from "../../src/transform/graph.ts";
import {
  transverseMercatorDescriptor,
  utm,
} from "../../src/georeference/index.ts";
import { transverseMercatorSeries } from "../../src/scene/warpForms.ts";
import { WGS84_RADII } from "../../src/georeference/ellipsoid.ts";

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

/** The unprojection as restricted-JS text: Karney's β series, then Newton on τ, unrolled. */
function inverseSource(): string {
  const [a, , b] = WGS84_RADII;
  const e2 = 1 - (b * b) / (a * a);
  const e = Math.sqrt(e2);
  const f = 1 - b / a;
  const n = f / (2 - f);
  const series = transverseMercatorSeries(n);
  const beta = betaSeries(n);
  const e2m = 1 - e2;
  const lines = [
    "(p, params) => {",
    `  const ka = params.scaleFactor * ${a * series.a};`,
    "  const xi = (p[1] - params.falseNorthing) / ka;",
    "  const eta = (p[0] - params.falseEasting) / ka;",
    "  let xip = xi;",
    "  let etap = eta;",
  ];
  beta.forEach((coefficient, i) => {
    const j2 = 2 * (i + 1);
    lines.push(
      `  xip = xip - ${coefficient} * Math.sin(${j2} * xi) * Math.cosh(${j2} * eta);`,
      `  etap = etap - ${coefficient} * Math.cos(${j2} * xi) * Math.sinh(${j2} * eta);`,
    );
  });
  lines.push(
    "  const sh = Math.sinh(etap);",
    "  const target = Math.sin(xip) / Math.sqrt(sh * sh + Math.cos(xip) * Math.cos(xip));",
    `  let tau = target / ${e2m};`,
  );
  for (let k = 0; k < 5; k++) {
    lines.push(
      `  const es${k} = ${e} * tau / Math.sqrt(1 + tau * tau);`,
      `  const sg${k} = Math.sinh(${e} * 0.5 * Math.log((1 + es${k}) / (1 - es${k})));`,
      `  const tp${k} = tau * Math.sqrt(1 + sg${k} * sg${k}) - sg${k} * Math.sqrt(1 + tau * tau);`,
      `  tau = tau + ((target - tp${k}) * (1 + ${e2m} * tau * tau)) / (${e2m} * Math.sqrt(1 + tau * tau) * Math.sqrt(1 + tp${k} * tp${k}));`,
    );
  }
  lines.push(
    `  return [params.centralMeridian + Math.atan2(sh, Math.cos(xip)) * ${180 / Math.PI}, Math.atan(tau) * ${180 / Math.PI}, p[2]];`,
    "}",
  );
  return lines.join("\n");
}

/**
 * A UTM zone run from its grid to geographic: the node authored in easting,
 * northing and height, its parent longitude, latitude (degrees) and height.
 * The built-in `utm` is written geographic to projected, with an inverse in
 * TypeScript but none as IR source; this edge carries the inverse's source (the
 * same series the built-in's inverse sums) so a route through it compiles.
 */
export function utmToGeographic(options: {
  zone: number;
  hemisphere?: "north" | "south";
}): SmoothEdge {
  const tm = utm(options);
  const descriptor = transverseMercatorDescriptor();
  return smooth({
    id: `UTM ${options.zone}${options.hemisphere === "south" ? "S" : "N"}, grid to geographic`,
    params: tm.spec.params,
    forward: (p, params, out) => descriptor.inverse!(p, params, out),
    inverse: (q, params, out) => descriptor.forward(q, params, out),
    source: inverseSource(),
  });
}
