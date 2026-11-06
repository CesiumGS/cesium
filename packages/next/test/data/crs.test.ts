// CRS references and recorded PROJ operations (plan 4a task 2), against the
// frames data store and pyproj's fixture (test/fixtures/frames/proj.json,
// scripts/frameFixtures.py). `npm run test:data` runs it.
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import {
  crsDefinition,
  crsUnits,
  moonGeographic3d,
  resolveOperation,
  type CrsRef,
} from "../../src/engineering/crs.ts";
import { loadProj, type ProjApi } from "../../src/engineering/proj.ts";
import fixture from "../fixtures/frames/proj.json";

const base = `${join(framesDataDirectory(), "proj")}/`;
const GEOID = "us_noaa_g2018u0.tif";
// 1200/3937 m. PROJ stores the double one ulp above JavaScript's 1200 / 3937
// (0.30480060960121924 against 0.3048006096012192), so compare within 1e-16.
const US_SURVEY_FOOT = 1200 / 3937;

interface Case {
  name: string;
  source: string;
  target: string;
  metersPerUnit: number;
  metersPerVerticalUnit: number;
  pyprojPipeline: string;
  pyprojAccuracy: number;
  rows: { xyz: number[]; forward: number[]; inverse: number[] }[];
}
const cases = (fixture as { cases: Case[] }).cases;

const ref = (code: string): CrsRef => {
  const [authority, rest] = code.split(":") as [string, string];
  const [wkid, vcsWkid] = rest.split("+").map(Number) as [number, number?];
  return vcsWkid === undefined
    ? { format: "wkid", authority, wkid }
    : { format: "wkid", authority, wkid, vcsWkid };
};

// Metres between two geographic positions (degrees): the longitude difference
// is wrapped and scaled by cos(latitude), so a point at a pole compares by
// position, not by its arbitrary longitude; 111,320 m per degree is the
// upper bound at the Earth's equator (the Moon's degree is shorter).
const degreesToMeters = 111_320;
function geographicError(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dLon = Math.abs(a[0]! - b[0]!) % 360;
  if (dLon > 180) {
    dLon = 360 - dLon;
  }
  const east = dLon * Math.cos((b[1]! * Math.PI) / 180) * degreesToMeters;
  const north = Math.abs(a[1]! - b[1]!) * degreesToMeters;
  return Math.hypot(east, north);
}

// A copy of the module and proj.db without the geoid: a second base with its
// own PROJ_DATA. The native module loads twice from two different files.
const withoutGrids = mkdtempSync(join(tmpdir(), "proj-no-grids-"));
for (const name of ["proj_capi.node", "proj.db"]) {
  copyFileSync(join(base, name), join(withoutGrids, name));
}
afterAll(() => rmSync(withoutGrids, { recursive: true, force: true }));

describe("CRS references", () => {
  it("builds the definition PROJ accepts (R3)", () => {
    expect(ref("EPSG:2227")).toEqual({
      format: "wkid",
      authority: "EPSG",
      wkid: 2227,
    });
    expect(crsDefinition(ref("EPSG:2227"))).toBe("EPSG:2227");
    expect(crsDefinition(ref("EPSG:6420+6360"))).toBe("EPSG:6420+6360");
    expect(
      crsDefinition({
        format: "wkid",
        authority: "EPSG",
        wkid: 4326,
        epoch: 2020,
      }),
    ).toBe("EPSG:4326@2020");
    expect(crsDefinition({ format: "wkt2", wkt2: "GEOGCRS[...]" })).toBe(
      "GEOGCRS[...]",
    );
  });

  it("records the Moon's geographic CRS code found in proj.db (R4)", async () => {
    const P = await loadProj({ base });
    expect(moonGeographic3d).toBe("IAU_2015:30100");
    expect(P.proj_get_name(P.proj_create(moonGeographic3d))).toBe(
      "Moon (2015) - Sphere / Ocentric",
    );
  });
});

describe("recorded operations against pyproj (to 1e-6 m)", () => {
  for (const c of cases) {
    describe(c.name, () => {
      it("records the operation pyproj chose, with its grids", async () => {
        const P = await loadProj({ base });
        const op = resolveOperation(P, ref(c.source), c.target);
        const bare = (s: string) => s.replace(/\+/g, "").trim();
        expect(bare(op.pipeline)).toBe(bare(c.pyprojPipeline));
        expect(op.ballpark).toBe(false);
        expect(op.accuracy).toBe(
          c.pyprojAccuracy < 0 ? undefined : c.pyprojAccuracy,
        );
      });

      it("transforms forward and inverse like pyproj", async () => {
        const P = await loadProj({ base });
        const op = resolveOperation(P, ref(c.source), c.target);
        const unit = c.metersPerUnit;
        const vertical = c.metersPerVerticalUnit;
        for (const row of c.rows) {
          const forward = op.forward(row.xyz);
          expect(geographicError(forward, row.forward)).toBeLessThan(1e-6);
          expect(Math.abs(forward[2]! - row.forward[2]!)).toBeLessThan(1e-6);
          const inverse = op.inverse(row.forward);
          expect(Math.abs(inverse[0]! - row.inverse[0]!) * unit).toBeLessThan(
            1e-6,
          );
          expect(Math.abs(inverse[1]! - row.inverse[1]!) * unit).toBeLessThan(
            1e-6,
          );
          expect(
            Math.abs(inverse[2]! - row.inverse[2]!) * vertical,
          ).toBeLessThan(1e-6);
        }
      });
    });
  }

  it("writes into the caller's array and returns it", async () => {
    const P = await loadProj({ base });
    const op = resolveOperation(P, ref("EPSG:32611"), "EPSG:4979");
    const out = new Float64Array(3);
    expect(op.forward([500000, 0, 7], out)).toBe(out);
    expect(out[0]).toBeCloseTo(-117, 12);
    expect(out[2]).toBe(7);
  });
});

describe("the geoid (Review Focus 1)", () => {
  it("records GEOID18 as a grid of the NAVD88 operation", async () => {
    const P = await loadProj({ base });
    const op = resolveOperation(P, ref("EPSG:6420+6360"), "EPSG:4979");
    expect(op.grids).toContain(GEOID);
    expect(op.pipeline).toContain(GEOID);
    expect(op.accuracy).toBeCloseTo(2.015, 6);
  });

  describe("when it is not installed", () => {
    let P: ProjApi;
    const loadWithout = async () =>
      (P = await loadProj({ base: withoutGrids }));

    it("throws, naming the grid, never choosing PROJ's coarser operation", async () => {
      await loadWithout();
      expect(() =>
        resolveOperation(P, ref("EPSG:6420+6360"), "EPSG:4979"),
      ).toThrow(/us_noaa_g2018u0\.tif/);
    });

    it("also refuses to fall back to a ballpark operation by default", async () => {
      await loadWithout();
      expect(() =>
        resolveOperation(P, ref("EPSG:6420+6360"), "EPSG:4979", {
          allowBallpark: false,
        }),
      ).toThrow(/us_noaa_g2018u0/);
    });

    it("takes the ballpark operation only when asked, with no accuracy", async () => {
      await loadWithout();
      const op = resolveOperation(P, ref("EPSG:6420+6360"), "EPSG:4979", {
        allowBallpark: true,
      });
      expect(op.ballpark).toBe(true);
      expect(op.accuracy).toBeUndefined();
      expect(op.grids).toEqual([]);
      // Heights are not corrected: the ballpark leaves NAVD88 as it is.
      const out = op.forward([6889750, 1640416.667, 328.083333333]);
      expect(out[2]).toBeCloseTo(100, 4);
    });

    it("still resolves a pair that needs no grid", async () => {
      await loadWithout();
      const op = resolveOperation(P, ref("EPSG:32611"), "EPSG:4979");
      expect(op.ballpark).toBe(false);
    });

    it("throws when a pinned pipeline's grid is missing, not an identity", async () => {
      await loadWithout();
      const pipeline = `+proj=pipeline +step +proj=vgridshift +grids=${GEOID} +multiplier=1`;
      expect(() =>
        resolveOperation(P, ref("EPSG:6420+6360"), "EPSG:4979", { pipeline }),
      ).toThrow(/us_noaa_g2018u0/);
    });
  });

  it("uses a pinned pipeline as given", async () => {
    const P = await loadProj({ base });
    const pipeline =
      "+proj=pipeline +step +inv +proj=utm +zone=11 +ellps=WGS84 +step +proj=unitconvert +xy_in=rad +xy_out=deg";
    const op = resolveOperation(P, ref("EPSG:32611"), "EPSG:4979", {
      pipeline,
    });
    expect(op.pipeline).toBe(pipeline);
    expect(op.forward([500000, 0, 0])[0]).toBeCloseTo(-117, 12);
  });
});

describe("units come from the CRS (R5, Review Focus 2)", () => {
  it("reads the US survey foot and the international foot", async () => {
    const P = await loadProj({ base });
    const us = crsUnits(P, ref("EPSG:2227"));
    expect(Math.abs(us.metersPerUnit - US_SURVEY_FOOT)).toBeLessThan(1e-16);
    expect(us.horizontalUnitName).toBe("US survey foot");
    expect(us.verticalUnitName).toBeUndefined();
    expect(crsUnits(P, ref("EPSG:2223")).metersPerUnit).toBe(0.3048);
    expect(crsUnits(P, ref("EPSG:32611")).metersPerUnit).toBe(1);
  });

  it("reads a compound CRS's vertical axis separately", async () => {
    const P = await loadProj({ base });
    const units = crsUnits(P, ref("EPSG:6420+6360"));
    expect(Math.abs(units.metersPerUnit - US_SURVEY_FOOT)).toBeLessThan(1e-16);
    expect(units.verticalUnitName).toBe("US survey foot");
    expect(
      Math.abs(units.metersPerVerticalUnit! - US_SURVEY_FOOT),
    ).toBeLessThan(1e-16);
  });

  it("reads units from a WKT2 definition too", async () => {
    const P = await loadProj({ base });
    const wkt2 = P.proj_as_wkt(P.proj_create("EPSG:2223"), P.PJ_WKT2_2019);
    expect(crsUnits(P, { format: "wkt2", wkt2 }).metersPerUnit).toBe(0.3048);
  });
});
