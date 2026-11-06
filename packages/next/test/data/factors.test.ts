// Scale factor and grid convergence against pyproj's Proj.get_factors (plan 4a
// task 4). `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import type { CrsRef } from "../../src/engineering/crs.ts";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import { loadProj } from "../../src/engineering/proj.ts";
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
      }
      console.log(
        `${testCase.name}: scale ${worstScale.toExponential(2)}, convergence ${worstConvergence.toExponential(2)} rad`,
      );
      // PROJ differentiates the projection numerically, with a step near 1e-5,
      // so one ulp of difference in the input longitude and latitude moves k
      // by ~1e-11. The Earth rows get bit-identical positions to pyproj's and
      // agree to 1e-12. The Moon's polar stereographic, within 2 degrees of a
      // pole, lands on a different ulp: its floor is 1e-10 (measured 6e-12).
      const scaleTolerance = body === MOON ? 1e-10 : 1e-12;
      expect(worstScale).toBeLessThan(scaleTolerance);
      expect(worstConvergence).toBeLessThan(1e-12);
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
    const at1000 = gridFactors(frame, [row.xyz[0]!, row.xyz[1]!, 1000]);
    const R = meanRadius(WGS84.a, WGS84.invF, row.factors.latitude);
    expect(Math.abs(at1000.elevationFactor - R / (R + 1000))).toBeLessThan(
      1e-12,
    );
    expect(at1000.combinedFactor).toBeCloseTo(
      at1000.pointScale * at1000.elevationFactor,
      14,
    );
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
