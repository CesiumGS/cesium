// Scale factor and grid convergence against pyproj's Proj.get_factors (plan 4a
// task 4). `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import type { CrsRef } from "../../src/engineering/crs.ts";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import { loadProj, type ProjApi } from "../../src/engineering/proj.ts";
import { EARTH, MOON } from "../../src/scene/Body.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;

interface Row {
  xyz: number[];
  factors: {
    longitude: number;
    latitude: number;
    meridionalScale: number;
    parallelScale: number;
    arealScale: number;
    convergence: number;
  };
}
interface Case {
  name: string;
  source: string;
  rows: Row[];
}
const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/frames/proj.json", import.meta.url),
    "utf8",
  ),
) as { cases: Case[] };

function crsRef(definition: string): CrsRef {
  const [authority, codes] = definition.split(":") as [string, string];
  const [wkid, vcsWkid] = codes.split("+").map(Number) as [number, number?];
  return {
    format: "wkid",
    authority,
    wkid,
    ...(vcsWkid !== undefined && { vcsWkid }),
  };
}

// The geometric-mean radius sqrt(M N) = a sqrt(1 - e2) / (1 - e2 sin^2 phi).
function meanRadius(a: number, invFlattening: number, latitude: number) {
  const f = 1 / invFlattening;
  const e2 = f * (2 - f);
  return (a * Math.sqrt(1 - e2)) / (1 - e2 * Math.sin(latitude) ** 2);
}
const WGS84 = { a: 6378137, invF: 298.257223563 };
const GRS80 = { a: 6378137, invF: 298.257222101 };
const US_FOOT = 0.3048006096012192;

describe("grid factors against pyproj Proj.get_factors", () => {
  for (const testCase of fixture.cases) {
    it(`${testCase.name}: point scale and convergence`, async () => {
      const P = await loadProj({ base });
      const body = testCase.source.startsWith("IAU_2015") ? MOON : EARTH;
      const frame = EngineeringFrame.create(
        {
          name: testCase.name,
          body,
          crs: crsRef(testCase.source),
        },
        P,
      );
      let worstScale = 0;
      let worstConvergence = 0;
      let worstMeridional = 0;
      let worstAreal = 0;
      let worstAngle = 0;
      for (const row of testCase.rows) {
        const result = gridFactors(frame, row.xyz);
        worstScale = Math.max(
          worstScale,
          Math.abs(result.pointScale - row.factors.parallelScale),
        );
        worstConvergence = Math.max(
          worstConvergence,
          Math.abs(result.convergence - row.factors.convergence),
        );
        expect(result.combinedFactor).toBeCloseTo(
          result.pointScale * result.elevationFactor,
          14,
        );
        worstMeridional = Math.max(
          worstMeridional,
          Math.abs(result.meridionalScale - row.factors.meridionalScale),
        );
        worstAreal = Math.max(
          worstAreal,
          Math.abs(result.arealScale - row.factors.arealScale),
        );
        // Conformal: the Tissot ellipse is a circle, its axes at right angles.
        // At a pole the meridian and parallel are undefined, so not there.
        if (Math.abs(row.factors.latitude) < 90) {
          worstAngle = Math.max(
            worstAngle,
            result.angularDistortion,
            Math.abs(result.meridianParallelAngle - Math.PI / 2),
          );
        }
      }
      console.log(
        `${testCase.name}: scale ${worstScale.toExponential(2)}, meridional ${worstMeridional.toExponential(2)}, areal ${worstAreal.toExponential(2)}, convergence ${worstConvergence.toExponential(2)} rad, conformality ${worstAngle.toExponential(2)} rad`,
      );
      // PROJ differentiates the projection numerically, with a step near 1e-5,
      // so one ulp of difference in the input longitude and latitude moves k
      // by ~1e-11. The Earth rows get bit-identical positions to pyproj's and
      // agree to 1e-12. The Moon's polar stereographic, within 2 degrees of a
      // pole, lands on a different ulp: its floor is 1e-10 (measured 6e-12).
      const scaleTolerance = body === MOON ? 1e-10 : 1e-12;
      expect(worstScale).toBeLessThan(scaleTolerance);
      // The meridional scale is the less steady across PROJ versions (9.7.1
      // here, 9.8.1 in pyproj): measured 1.1e-11 on California zone 3.
      expect(worstMeridional).toBeLessThan(1e-10);
      expect(worstAreal).toBeLessThan(1e-10);
      expect(worstConvergence).toBeLessThan(1e-12);
      // PROJ's derivatives are numerical (step ~1e-5): a conformal map's
      // two scales agree only to ~1e-11, which bounds the angles.
      expect(worstAngle).toBeLessThan(1e-9);
    });
  }

  const utm = fixture.cases.find((c) => c.source === "EPSG:32611")!;
  const utmFrame = async () =>
    EngineeringFrame.create(
      { name: "UTM 11N", body: EARTH, crs: crsRef("EPSG:32611") },
      await loadProj({ base }),
    );

  it("the elevation factor is 1 at h = 0 and R / (R + h) at 1,000 m", async () => {
    const frame = await utmFrame();
    const row = utm.rows[0]!;
    const at0 = gridFactors(frame, [row.xyz[0]!, row.xyz[1]!, 0]);
    expect(Math.abs(at0.elevationFactor - 1)).toBeLessThan(1e-12);
    // At a mid-latitude point (N = 4,000,000 m, near 36 degrees) where sin
    // phi is not 0: a latitude or radians/degrees error in R shows.
    const design = [500000, 4_000_000, 1000];
    const result = gridFactors(frame, design);
    const phi = frame.toGeodetic(design).latitude;
    expect(phi).toBeGreaterThan(0.6);
    const R = meanRadius(WGS84.a, WGS84.invF, phi);
    expect(Math.abs(result.elevationFactor - R / (R + 1000))).toBeLessThan(
      1e-12,
    );
    // Had R used degrees, the factor would differ far beyond the tolerance.
    const wrong = meanRadius(WGS84.a, WGS84.invF, (phi * 180) / Math.PI);
    expect(Math.abs(R / (R + 1000) - wrong / (wrong + 1000))).toBeGreaterThan(
      1e-9,
    );
    expect(result.combinedFactor).toBeCloseTo(
      result.pointScale * result.elevationFactor,
      14,
    );
  });

  it("the elevation factor on the ftUS frame takes the height from design feet", async () => {
    const ca = fixture.cases[0]!;
    const frame = EngineeringFrame.create(
      { name: "CA3", body: EARTH, crs: crsRef(ca.source) },
      await loadProj({ base }),
    );
    const row = ca.rows[7]!; // 50 km north-east of the origin, about 37.5 degrees
    const design = [row.xyz[0]!, row.xyz[1]!, 3280.84];
    const geodetic = frame.toGeodetic(design);
    const R = meanRadius(
      GRS80.a,
      GRS80.invF,
      row.factors.latitude * (Math.PI / 180),
    );
    const result = gridFactors(frame, design);
    // h is metres above the ellipsoid: design feet converted by PROJ, plus
    // the geoid separation (about -33 m here).
    expect(
      Math.abs(result.elevationFactor - R / (R + geodetic.height)),
    ).toBeLessThan(1e-12);
    const low = gridFactors(frame, [design[0]!, design[1]!, 0]);
    const h0 = frame.toGeodetic([design[0]!, design[1]!, 0]).height;
    expect(geodetic.height - h0).toBeCloseTo(3280.84 * US_FOOT, 6);
    expect(Math.abs(low.elevationFactor - R / (R + h0))).toBeLessThan(1e-12);
    const wrong = meanRadius(GRS80.a, GRS80.invF, row.factors.latitude);
    expect(
      Math.abs(R / (R + geodetic.height) - wrong / (wrong + geodetic.height)),
    ).toBeGreaterThan(1e-9);
  });

  it("the scale 100 km off the central meridian differs by more than 1e-4", async () => {
    const frame = await utmFrame();
    const centre = gridFactors(frame, [500000, 4_000_000, 0]);
    const off = gridFactors(frame, [600000, 4_000_000, 0]);
    expect(centre.pointScale).toBeCloseTo(0.9996, 9);
    expect(off.pointScale - centre.pointScale).toBeGreaterThan(1e-4);
    // Convergence is 0 on the central meridian and well off zero 100 km east.
    expect(Math.abs(centre.convergence)).toBeLessThan(1e-12);
    expect(Math.abs(off.convergence)).toBeGreaterThan(1e-3);
  });
});

// Web Mercator (EPSG:3857): PROJ writes its CRS as a spherical +proj=merc on
// a = b = 6378137, but its coordinates are WGS 84 latitudes and longitudes,
// so the scales must be taken against the WGS 84 ellipsoid (IOGP 373-7-2
// section 3.2.1.2: h = a / (rho cos phi), k = a / (nu cos phi)).
describe("grid factors against the CRS's own ellipsoid", () => {
  it.each(["EPSG:3857", "ESRI:102100"])(
    "%s: h and k are the ellipsoid's, not the sphere's 1/cos phi",
    async (code) => {
      const P = await loadProj({ base });
      const frame = EngineeringFrame.create(
        { name: "Web Mercator", body: EARTH, crs: crsRef(code) },
        P,
      );
      const f = 1 / WGS84.invF;
      const e2 = f * (2 - f);
      for (const latitude of [0, 45, 60, 70]) {
        const phi = (latitude * Math.PI) / 180;
        const fixed = EARTH.ellipsoid.cartographicToCartesian(
          { longitude: 0.3, latitude: phi, height: 0 },
          new Float64Array(3),
        );
        const result = gridFactors(frame, frame.fromBodyFixed(fixed));
        const w = 1 - e2 * Math.sin(phi) ** 2;
        const k = Math.sqrt(w) / Math.cos(phi);
        const h = (w * Math.sqrt(w)) / ((1 - e2) * Math.cos(phi));
        const omega = 2 * Math.asin(Math.abs(h - k) / (h + k));
        // PROJ's numerical longitude derivative (measured 1e-12 at 0°).
        expect(
          Math.abs(result.pointScale - k),
          `k at ${latitude}`,
        ).toBeLessThan(1e-11);
        // The latitude derivative is PROJ's numerical one: at 60° its
        // dy/dphi is 2.000000000224 for 2 (measured 2.2e-10 in h).
        expect(
          Math.abs(result.meridionalScale - h),
          `h at ${latitude}`,
        ).toBeLessThan(1e-9);
        expect(Math.abs(result.angularDistortion - omega)).toBeLessThan(1e-9);
        expect(
          Math.abs(result.meridianParallelAngle - Math.PI / 2),
        ).toBeLessThan(1e-9);
        expect(Math.abs(result.convergence)).toBeLessThan(1e-12);
        // The sphere's scale, which this guards against, is far away above 0°.
        if (latitude > 0) {
          expect(
            Math.abs(result.pointScale - 1 / Math.cos(phi)),
          ).toBeGreaterThan(1e-3);
        }
      }
    },
  );

  // PROJ's own factors, from the CRS's PROJ string, at a design point's
  // longitude and latitude on the CRS's own datum.
  const projOwn = (P: ProjApi, code: string, design: ArrayLike<number>) => {
    const string = P.proj_as_proj_string(P.proj_create(code), P.PJ_PROJ_5)!;
    const projection = P.proj_create(
      string.replace(/\s\+type=crs/, "").replace(/\s\+no_defs/, ""),
    );
    const lp = P.proj_trans(
      projection,
      P.PJ_INV,
      P.proj_coord(design[0]!, design[1]!, 0, 0),
    ).v;
    return P.proj_factors(projection, P.proj_coord(lp[0]!, lp[1]!, 0, 0));
  };

  it("EPSG:26711 (NAD27, Clarke 1866): PROJ's own scale, to 1e-12", async () => {
    const P = await loadProj({ base });
    const frame = EngineeringFrame.create(
      {
        name: "NAD27 / UTM 11N",
        body: EARTH,
        crs: crsRef("EPSG:26711"),
        allowBallpark: true,
      },
      P,
    );
    for (const design of [
      [500000, 4_000_000, 0],
      [650000, 3_800_000, 0],
    ]) {
      const own = projOwn(P, "EPSG:26711", design);
      const result = gridFactors(frame, design);
      expect(Math.abs(result.pointScale - own.parallel_scale)).toBeLessThan(
        1e-12,
      );
      expect(
        Math.abs(result.meridionalScale - own.meridional_scale),
      ).toBeLessThan(1e-12);
    }
  });

  it.each(["EPSG:32661", "EPSG:5041", "EPSG:3413"])(
    "%s at the north pole: PROJ's own scale (the projection's k there)",
    async (code) => {
      const P = await loadProj({ base });
      const frame = EngineeringFrame.create(
        { name: code, body: EARTH, crs: crsRef(code) },
        P,
      );
      const pole = frame.fromBodyFixed(
        EARTH.ellipsoid.cartographicToCartesian(
          { longitude: 0, latitude: Math.PI / 2, height: 0 },
          new Float64Array(3),
        ),
      );
      const own = projOwn(P, code, pole);
      const result = gridFactors(frame, pole);
      expect(Math.abs(result.pointScale - own.parallel_scale)).toBeLessThan(
        1e-12,
      );
      // UPS's k0 = 0.994; 3413's standard parallel at 70°N gives 0.970.
      expect(result.pointScale).toBeGreaterThan(0.96);
      expect(result.pointScale).toBeLessThan(1);
    },
  );

  it("a WGS 84 UTM zone keeps PROJ's own values, unchanged", async () => {
    const P = await loadProj({ base });
    const frame = EngineeringFrame.create(
      { name: "UTM 11N", body: EARTH, crs: crsRef("EPSG:32611") },
      P,
    );
    for (const design of [
      [500000, 4_000_000, 0],
      [600000, 4_500_000, 0],
    ]) {
      const own = projOwn(P, "EPSG:32611", design);
      const result = gridFactors(frame, design);
      expect(result.pointScale).toBe(own.parallel_scale);
      expect(result.meridionalScale).toBe(own.meridional_scale);
      expect(result.arealScale).toBe(own.areal_scale);
      expect(result.convergence).toBe(own.meridian_convergence);
    }
  });

  // The EASE-Grid CRSs on WGS 84 apply EPSG's spherical formulas on the
  // authalic sphere (IOGP 373-7-2 3.2.6.1 and 3.3.2.1) to WGS 84 latitudes:
  // R_A = a sqrt((1 - (1 - e2)/(2e) ln((1 - e)/(1 + e))) / 2).
  const fW = 1 / WGS84.invF;
  const e2W = fW * (2 - fW);
  const eW = Math.sqrt(e2W);
  const RA =
    WGS84.a *
    Math.sqrt(
      (1 - ((1 - e2W) / (2 * eW)) * Math.log((1 - eW) / (1 + eW))) * 0.5,
    );
  const nu = (phi: number) => WGS84.a / Math.sqrt(1 - e2W * Math.sin(phi) ** 2);
  const rho = (phi: number) =>
    (WGS84.a * (1 - e2W)) / (1 - e2W * Math.sin(phi) ** 2) ** 1.5;

  it.each([
    {
      code: "EPSG:3975",
      // Lambert Cylindrical Equal Area (Spherical), standard parallel 30°:
      // E = R λ cos φ1, N = R sin φ / cos φ1.
      k: (phi: number) =>
        (RA * Math.cos(Math.PI / 6)) / (nu(phi) * Math.cos(phi)),
      h: (phi: number) =>
        (RA * Math.cos(phi)) / (Math.cos(Math.PI / 6) * rho(phi)),
    },
    {
      code: "EPSG:3973",
      // Lambert Azimuthal Equal Area (Spherical), north polar: the radius on
      // the map is 2R sin(π/4 − φ/2).
      k: (phi: number) =>
        (2 * RA * Math.sin(Math.PI / 4 - phi / 2)) / (nu(phi) * Math.cos(phi)),
      h: (phi: number) => (RA * Math.cos(Math.PI / 4 - phi / 2)) / rho(phi),
    },
  ])(
    "$code: h and k against the WGS 84 ellipsoid on the authalic sphere's formulas",
    async ({ code, k, h }) => {
      const P = await loadProj({ base });
      const frame = EngineeringFrame.create(
        { name: code, body: EARTH, crs: crsRef(code) },
        P,
      );
      for (const latitude of [10, 45, 70]) {
        const phi = (latitude * Math.PI) / 180;
        const design = frame.fromBodyFixed(
          EARTH.ellipsoid.cartographicToCartesian(
            { longitude: 0.4, latitude: phi, height: 0 },
            new Float64Array(3),
          ),
        );
        const result = gridFactors(frame, design);
        // PROJ's longitude derivative is numerical too: exact for the
        // cylinder's E = R λ cos φ1, 3.2e-11 measured for the azimuthal.
        expect(
          Math.abs(result.pointScale - k(phi)),
          `k at ${latitude}`,
        ).toBeLessThan(1e-10);
        // PROJ's numerical latitude derivative, as for 3857.
        expect(
          Math.abs(result.meridionalScale - h(phi)),
          `h at ${latitude}`,
        ).toBeLessThan(1e-9);
      }
    },
  );

  // Equidistant Cylindrical (Spherical) on WGS 84: E = a (λ − λ0) cos φ1 and
  // N = a φ on WGS 84 latitudes (PROJ's eqc forces the sphere of radius a),
  // so k = a cos φ1 / (ν cos φ) and h = a / ρ: at φ1 = 0 these are
  // sqrt(w) / cos φ and w^1.5 / (1 − e²).
  it.each([
    { code: "EPSG:32662", phi1: 0 },
    { code: "ESRI:54002", phi1: 60 },
    { code: "ESRI:102421", phi1: 22.94791772 },
  ])(
    "$code (Equidistant Cylindrical (Spherical), φ1 $phi1°): h and k against the WGS 84 ellipsoid",
    async ({ code, phi1 }) => {
      const P = await loadProj({ base });
      const frame = EngineeringFrame.create(
        { name: code, body: EARTH, crs: crsRef(code) },
        P,
      );
      const cos1 = Math.cos((phi1 * Math.PI) / 180);
      for (const latitude of [10, 45, 60]) {
        const phi = (latitude * Math.PI) / 180;
        const design = frame.fromBodyFixed(
          EARTH.ellipsoid.cartographicToCartesian(
            { longitude: 0.2, latitude: phi, height: 0 },
            new Float64Array(3),
          ),
        );
        const result = gridFactors(frame, design);
        const k = (WGS84.a * cos1) / (nu(phi) * Math.cos(phi));
        const h = WGS84.a / rho(phi);
        expect(
          Math.abs(result.pointScale - k),
          `k at ${latitude}`,
        ).toBeLessThan(1e-10);
        expect(
          Math.abs(result.meridionalScale - h),
          `h at ${latitude}`,
        ).toBeLessThan(1e-10);
      }
    },
  );

  it("the spherical-formula path refuses a pole, where the derivatives are 0/0", async () => {
    const P = await loadProj({ base });
    const frame = EngineeringFrame.create(
      { name: "EASE-Grid North", body: EARTH, crs: crsRef("EPSG:3973") },
      P,
    );
    expect(() => gridFactors(frame, [0, 0, 0])).toThrow(/pole/);
  });
});
