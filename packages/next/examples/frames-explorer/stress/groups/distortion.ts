// Distortion: Web Mercator's scale, and a low-distortion projection against
// state plane.
import { EngineeringFrame } from "../../../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../../../src/engineering/factors.ts";
import { surfaceDistance } from "../../../../src/measure/surface.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import {
  ANGLE_PATH,
  citation,
  cited,
  DEGREE,
  ellipsoidOf,
  FACTOR_PATH,
  HAND_FORMULA,
  INVERSE_RESIDUAL,
  NUMERICAL_LATITUDE_DERIVATIVE,
  onEarth,
  printed,
  radii,
  sexagesimal,
} from "../references.ts";
import {
  type StressCase,
  type StressContext,
  type StressResult,
  fmt,
} from "../runner.ts";
import { EFFECT, epsg, fingerprintOf, proj, stressCase } from "../shared.ts";

const webMercatorFrame = (ctx: StressContext) =>
  EngineeringFrame.create(
    { name: "WGS 84 / Pseudo-Mercator", body: EARTH, crs: epsg(3857) },
    proj(ctx),
  );

const webMercatorScaleCase = stressCase(
  "distortion.web-mercator-scale",
  "distortion",
  "EPSG:3857's parallel scale from gridFactors at latitudes 0°, 45°, 60° and 70° against the hand formula k = sqrt(1 − e² sin² φ) / cos φ within 1e-9, and against IOGP 373-7-2's printed k at its example point",
  ["proj"],
  async (ctx, base) => {
    const frame = webMercatorFrame(ctx);
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    const results: StressResult[] = [];
    for (const latitude of [0, 45, 60, 70]) {
      const k = gridFactors(
        frame,
        frame.fromBodyFixed(onEarth(0, latitude)),
      ).pointScale;
      const phi = latitude * DEGREE;
      // IOGP 373-7-2 §3.2.1.2: k = a / (ν cos φ) = sqrt(1 − e² sin² φ) / cos φ.
      const hand = Math.sqrt(1 - wgs84.e2 * Math.sin(phi) ** 2) / Math.cos(phi);
      results.push({
        ...base,
        id: `${base.id}.k-${latitude}`,
        source: citation("epsg-ellipsoid-wgs84"),
        title: `EPSG:3857's parallel scale at ${latitude}° against sqrt(1 − e² sin² φ) / cos φ (WGS 84), within 1e-9`,
        pass: true,
        value: Math.abs(k - hand),
        tolerance: HAND_FORMULA,
        detail: `k ${k}, by hand ${hand}; the sphere's 1/cos φ is ${1 / Math.cos(phi)}`,
      });
    }
    const x = cited<{
      forward: { latitude: string; longitude: string };
      distortion: { h: string; k: string; omega: string };
    }>("iogp-pseudo-mercator");
    const lat = sexagesimal(x.forward.latitude);
    const atIogp = gridFactors(
      frame,
      frame.fromBodyFixed(
        onEarth(sexagesimal(x.forward.longitude).value, lat.value),
      ),
    );
    const kPrinted = printed(x.distortion.k);
    const hPrinted = printed(x.distortion.h);
    const omegaPrinted = sexagesimal(x.distortion.omega);
    results.push(
      {
        ...base,
        id: `${base.id}.k-iogp`,
        source: citation("iogp-pseudo-mercator"),
        title: `EPSG:3857's parallel scale at ${x.forward.latitude} against IOGP 373-7-2's printed k = ${x.distortion.k}, within half a unit of its last digit`,
        pass: true,
        value: Math.abs(atIogp.pointScale - kPrinted.value),
        tolerance: kPrinted.half + FACTOR_PATH,
        detail: `k ${atIogp.pointScale}`,
      },
      {
        ...base,
        id: `${base.id}.h-iogp`,
        source: citation("iogp-pseudo-mercator"),
        title: `EPSG:3857's meridional scale at ${x.forward.latitude} against IOGP 373-7-2's printed h = ${x.distortion.h}, within half a unit of its last digit`,
        pass: true,
        value: Math.abs(atIogp.meridionalScale - hPrinted.value),
        tolerance: hPrinted.half + NUMERICAL_LATITUDE_DERIVATIVE,
        detail: `h ${atIogp.meridionalScale}`,
      },
      {
        ...base,
        id: `${base.id}.omega-iogp`,
        source: citation("iogp-pseudo-mercator"),
        title: `EPSG:3857's maximum angular distortion at ${x.forward.latitude} against IOGP 373-7-2's printed ω = ${x.distortion.omega}, within half a unit of its last digit`,
        pass: true,
        value:
          Math.abs(atIogp.angularDistortion / DEGREE - omegaPrinted.value) *
          3600,
        tolerance: omegaPrinted.half * 3600 + ANGLE_PATH,
        unit: "″",
        detail: `ω ${fmt((atIogp.angularDistortion / DEGREE) * 3600, 8)}″`,
      },
    );
    return results;
  },
);

const webMercatorLineCase = stressCase(
  "distortion.web-mercator-line",
  "distortion",
  "A 100 km east–west line at 60° measured on the EPSG:3857 grid against its true (geodesic) length: the overstatement matches a·∆λ − N cos φ ∆λ within 2%",
  ["proj"],
  async (ctx, base) => {
    const frame = webMercatorFrame(ctx);
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    // A line east along the 60th parallel whose true length is about 100 km.
    const r60 = radii(wgs84.a, wgs84.e2, 60);
    const dLambda = 100_000 / (r60.N * Math.cos(60 * DEGREE)); // radians
    const a = onEarth(0, 60);
    const b = onEarth(dLambda / DEGREE, 60);
    const da = frame.fromBodyFixed(a);
    const db = frame.fromBodyFixed(b);
    const grid = Math.abs(db[0]! - da[0]!) * frame.units.metersPerUnit;
    const truth = surfaceDistance(EARTH.ellipsoid, a, b).distance;
    const effect = grid - truth;
    // By hand: the grid length is a·∆λ (E = a λ), the true one the parallel's
    // arc N cos φ ∆λ (a geodesic is shorter by about 3 m in 100 km).
    const handEffect =
      wgs84.a * dLambda - r60.N * Math.cos(60 * DEGREE) * dLambda;
    return [
      {
        ...base,
        pass: true,
        value: Math.abs(effect / handEffect - 1),
        tolerance: EFFECT,
        detail: `grid ${fmt(grid / 1000, 7)} km, true ${fmt(truth / 1000, 7)} km; by hand ${fmt(handEffect / 1000, 7)} km too long`,
        effect: {
          value: effect / 1000,
          unit: "km",
          label:
            "how much longer a 100 km line at 60° is on the Web Mercator grid",
        },
      },
    ];
  },
);

interface OcrsHandbook {
  readonly designTarget: { readonly text: string };
  readonly portlandZone: {
    readonly standardParallelAndGridOrigin: string;
    readonly centralMeridian: string;
    readonly scale: string;
  };
  readonly portlandTestPoints: {
    readonly points: readonly {
      readonly name: string;
      readonly latitude: string;
      readonly longitude: string;
      readonly northing: string;
      readonly easting: string;
    }[];
  };
}

/** The OCRS Portland zone (m) and Oregon North (SPCS 83, m), NAD83(2011): EPSG registry codes. */
const OCRS_PORTLAND = 6854;

const OREGON_NORTH = 6558;

/**
 * The point scale of a Lambert Conformal Conic projection, by hand from
 * Snyder (1987) eqs. (14-15), (15-9), (15-8) and (15-6): k = k0 m1 t^n /
 * (m t1^n), with n = sin φ1 for one standard parallel (scaled by k0).
 */
function lambertScale(
  e2: number,
  phi1: number,
  phi2: number,
  k0: number,
  phi: number,
): number {
  const e = Math.sqrt(e2);
  const m = (p: number) => Math.cos(p) / Math.sqrt(1 - e2 * Math.sin(p) ** 2);
  const t = (p: number) =>
    Math.tan(Math.PI / 4 - p / 2) /
    ((1 - e * Math.sin(p)) / (1 + e * Math.sin(p))) ** (e / 2);
  const n =
    phi1 === phi2
      ? Math.sin(phi1)
      : (Math.log(m(phi1)) - Math.log(m(phi2))) /
        (Math.log(t(phi1)) - Math.log(t(phi2)));
  return (k0 * m(phi1) * t(phi) ** n) / (m(phi) * t(phi1) ** n);
}

const lowDistortionCase = stressCase(
  "distortion.low-distortion",
  "distortion",
  "The Oregon Coordinate Reference System's Portland zone (EPSG:6854): the handbook's test points to five decimals, and at a point in the zone at its design height its distortion is within the handbook's ±10 ppm target and smaller than Oregon North state plane's",
  ["proj"],
  async (ctx, base) => {
    const P = proj(ctx);
    const hb = cited<OcrsHandbook>("ocrs-handbook");
    const ldp = EngineeringFrame.create(
      { name: "OCRS Portland zone", body: EARTH, crs: epsg(OCRS_PORTLAND) },
      P,
    );
    const spc = EngineeringFrame.create(
      { name: "Oregon North", body: EARTH, crs: epsg(OREGON_NORTH) },
      P,
    );
    const results: StressResult[] = [];
    // The handbook's software check: "your grid coordinates should match these
    // results exactly to five decimal places" (the inputs are exact).
    let worst = 0;
    let half = 0;
    const lines: string[] = [];
    const designs: Float64Array[] = [];
    for (const p of hb.portlandTestPoints.points) {
      const design = ldp.fromBodyFixed(
        onEarth(
          sexagesimal(p.longitude, -1).value,
          sexagesimal(p.latitude).value,
        ),
      );
      designs.push(design);
      const n = printed(p.northing);
      const e = printed(p.easting);
      half = Math.max(half, n.half, e.half);
      worst = Math.max(
        worst,
        Math.abs(design[1]! - n.value),
        Math.abs(design[0]! - e.value),
      );
      lines.push(
        `${p.name} N ${design[1]!.toFixed(6)} E ${design[0]!.toFixed(6)}`,
      );
    }
    results.push({
      ...base,
      id: `${base.id}.test-points`,
      source: citation("ocrs-handbook"),
      title:
        "The OCRS handbook's Portland zone test points (Appendix A): northings and easting to five decimal places",
      pass: true,
      value: worst,
      tolerance: half + INVERSE_RESIDUAL,
      unit: "m",
      detail: lines.join("; "),
      fingerprint: fingerprintOf(ctx, ldp, designs),
    });

    // Portland1, at the zone's design height h0 = (k0 − 1) RG (handbook step 3).
    const grs80 = ellipsoidOf("epsg-ellipsoid-grs80");
    const point = hb.portlandTestPoints.points[0]!;
    const lat = sexagesimal(point.latitude).value;
    const lon = sexagesimal(point.longitude, -1).value;
    const rg = radii(grs80.a, grs80.e2, lat).gaussian;
    const k0 = printed(hb.portlandZone.scale).value;
    const h0 = (k0 - 1) * rg;
    const target = printed(
      /±(\d+) ppm/.exec(hb.designTarget.text)?.[1] ?? "NaN",
    ).value;
    const flatOf = (frame: EngineeringFrame) =>
      frame.fromBodyFixed(onEarth(lon, lat, h0));
    const distortionOf = (frame: EngineeringFrame) =>
      (gridFactors(frame, flatOf(frame)).combinedFactor - 1) * 1e6;
    const ldpPpm = distortionOf(ldp);
    const spcPpm = distortionOf(spc);
    // By hand (handbook step 4): δ = k RG / (RG + h) − 1, with k from Snyder.
    const phi = lat * DEGREE;
    const ldpPhi =
      sexagesimal(hb.portlandZone.standardParallelAndGridOrigin).value * DEGREE;
    const elevation = rg / (rg + h0);
    const handLdp =
      (lambertScale(grs80.e2, ldpPhi, ldpPhi, k0, phi) * elevation - 1) * 1e6;
    const on = cited<{
      parameters: readonly (readonly [string, string, string])[];
    }>("epsg-oregon-north");
    // EPSG's sexagesimal DMS: 46.0 is 46°00', 44.2 is 44°20'.
    const dms = (name: string) => {
      const v = printed(
        on.parameters.find((q) => q[0] === name)?.[1] ?? "NaN",
      ).value;
      const d = Math.trunc(v);
      return (d + Math.round((v - d) * 100) / 60) * DEGREE;
    };
    const handSpc =
      (lambertScale(
        grs80.e2,
        dms("Latitude of 1st standard parallel"),
        dms("Latitude of 2nd standard parallel"),
        1,
        phi,
      ) *
        elevation -
        1) *
      1e6;
    results.push({
      ...base,
      id: `${base.id}.portland`,
      source: citation("ocrs-handbook"),
      title: `OCRS Portland zone at ${point.name}, at the design height h0 = (k0 − 1)·RG: distortion within the handbook's ±${target} ppm target, matching δ = k·RG/(RG + h) − 1 by hand within 2%`,
      pass: Math.abs(ldpPpm) <= target,
      value: Math.abs(ldpPpm / handLdp - 1),
      tolerance: EFFECT,
      detail: `h0 ${fmt(h0, 5)} m; ${fmt(ldpPpm, 6)} ppm, by hand ${fmt(handLdp, 6)} ppm; target ±${target} ppm`,
      effect: {
        value: ldpPpm,
        unit: "ppm",
        label: "grid against ground in the OCRS Portland zone",
      },
      fingerprint: fingerprintOf(ctx, ldp, [flatOf(ldp)]),
    });
    results.push({
      ...base,
      id: `${base.id}.state-plane`,
      source: citation("epsg-oregon-north"),
      title: `Oregon North state plane (EPSG:6558) at the same point and height: its distortion, larger than the low-distortion zone's, matches δ by hand within 2%`,
      pass: Math.abs(ldpPpm) < Math.abs(spcPpm),
      value: Math.abs(spcPpm / handSpc - 1),
      tolerance: EFFECT,
      detail: `${fmt(spcPpm, 6)} ppm, by hand ${fmt(handSpc, 6)} ppm; the OCRS zone's ${fmt(ldpPpm, 6)} ppm`,
      effect: {
        value: spcPpm,
        unit: "ppm",
        label: "grid against ground on Oregon North state plane",
      },
      fingerprint: fingerprintOf(ctx, spc, [flatOf(spc)]),
    });
    return results;
  },
);

export const distortionCases: readonly StressCase[] = [
  webMercatorScaleCase,
  webMercatorLineCase,
  lowDistortionCase,
];
