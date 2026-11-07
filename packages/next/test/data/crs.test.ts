// CRS references and recorded PROJ operations (plan 4a task 2), against the
// frames data store and pyproj's fixture (test/fixtures/frames/proj.json,
// scripts/frameFixtures.py). `npm run test:data` runs it. PROJ here loads
// with the legacy default grids (GEOID18); the cases without any grid are in
// crsNoGrids.test.ts, a process of their own.
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import {
  crsDefinition,
  crsUnits,
  listOperations,
  MOON_GEOGRAPHIC_CRS,
  resolveOperation,
  type CrsRef,
  type OperationCandidate,
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
    ).toBe("EPSG:4326");
    expect(crsDefinition({ format: "wkt2", wkt2: "GEOGCRS[...]" })).toBe(
      "GEOGCRS[...]",
    );
  });

  it("records the Moon's geographic CRS code found in proj.db (R4)", async () => {
    const P = await loadProj({ base });
    expect(MOON_GEOGRAPHIC_CRS).toBe("IAU_2015:30100");
    expect(P.proj_get_name(P.proj_create(MOON_GEOGRAPHIC_CRS))).toBe(
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

  it("throws for a second base, naming the first, and still works", async () => {
    // PROJ_DATA names one directory per process, so a base loaded after
    // another would search the first one's (the old regression, when the
    // binding read PROJ_DATA at first use). Now the second throws. Its files
    // are good copies, so this is the base rule speaking, not a refusal.
    const P = await loadProj({ base });
    const other = mkdtempSync(join(tmpdir(), "proj-second-base-"));
    try {
      for (const name of ["proj_capi.node", "proj.db"]) {
        copyFileSync(join(base, name), join(other, name));
      }
      await expect(loadProj({ base: other, grids: [] })).rejects.toThrow(
        `PROJ: this process loaded PROJ from ${base.slice(0, -1)}; it can't also load ${other}`,
      );
      // The first base is unaffected, and still reads its geoid.
      expect(await loadProj({ base })).toBe(P);
      const op = resolveOperation(P, ref("EPSG:6420+6360"), "EPSG:4979");
      expect(op.grids).toContain(GEOID);
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
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

describe("operations that cannot be done", () => {
  it("throws outside the geoid's coverage or for non-finite input", async () => {
    const P = await loadProj({ base });
    const op = resolveOperation(P, ref("EPSG:6420+6360"), "EPSG:4979");
    expect(() => op.forward([0, 0, 0])).toThrow(RangeError);
    expect(() => op.forward([Number.NaN, 1, 1])).toThrow();
  });

  it("throws for a code PROJ does not have", async () => {
    const P = await loadProj({ base });
    expect(() =>
      resolveOperation(
        P,
        { format: "wkid", authority: "EPSG", wkid: 999999 },
        "EPSG:4979",
      ),
    ).toThrow(/could not create/);
  });

  it("throws for CRSs PROJ cannot relate, as a plain Error", async () => {
    const P = await loadProj({ base });
    expect(() =>
      resolveOperation(P, ref(MOON_GEOGRAPHIC_CRS), "EPSG:4979"),
    ).toThrow(
      /PROJ offers no usable operation from IAU_2015:30100 to EPSG:4979/,
    );
  });

  it("throws when PROJ lists no operations (stub)", () => {
    const stub = {
      proj_create: () => ({}),
      // Quiet while listing (crs.ts lowers the log level, then restores it).
      proj_log_level: () => 0,
      PJ_LOG_NONE: 0,
      proj_get_name: () => "x",
      proj_as_proj_string: () => "x",
      PJ_PROJ_5: 1,
      proj_create_operation_factory_context: () => ({}),
      proj_create_operations: () => ({ length: () => 0, get: () => ({}) }),
    } as unknown as ProjApi;
    expect(() => resolveOperation(stub, ref("EPSG:2227"), "EPSG:4979")).toThrow(
      /PROJ offers no usable operation from EPSG:2227 to EPSG:4979/,
    );
    const nullList = {
      ...stub,
      proj_create_operations: () => null,
    } as unknown as ProjApi;
    expect(() =>
      resolveOperation(nullList, ref("EPSG:2227"), "EPSG:4979"),
    ).toThrow(/PROJ offers no usable operation/);
  });
});

describe("coordinate epoch (a dynamic datum's time-dependent operation)", () => {
  // ITRF2014 to NAD83(2011): a Helmert with rates, no grids.
  const itrf = { format: "wkid", authority: "EPSG", wkid: 7789 } as const;
  const point = [-2700000, -4290000, 3860000];

  it("evaluates at the source's epoch; none gives a stable result", async () => {
    const P = await loadProj({ base });
    const at = (epoch?: number) =>
      resolveOperation(
        P,
        epoch === undefined ? itrf : { ...itrf, epoch },
        "EPSG:6318",
      ).forward(point);
    const metersBetween = (a: Float64Array, b: Float64Array) =>
      Math.hypot(
        (a[0]! - b[0]!) * 111_320 * Math.cos((a[1]! * Math.PI) / 180),
        (a[1]! - b[1]!) * 111_320,
        a[2]! - b[2]!,
      );
    const early = at(2010);
    const late = at(2030);
    expect(metersBetween(early, late)).toBeGreaterThan(0.01);
    // Without an epoch the rates do not apply, and the result repeats.
    expect(Array.from(at())).toEqual(Array.from(at()));
    expect(Array.from(at())).toEqual(Array.from(early));
  });

  it("round trips at the same epoch", async () => {
    const P = await loadProj({ base });
    const op = resolveOperation(P, { ...itrf, epoch: 2030 }, "EPSG:6318");
    const back = op.inverse(op.forward(point));
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(back[i]! - point[i]!)).toBeLessThan(1e-6);
    }
  });
});

describe("Operation candidates (listOperations)", () => {
  const geographic3d = ref("EPSG:4979");

  it("lists PROJ's candidates, and resolveOperation records the first its rule accepts", async () => {
    const P = await loadProj({ base });
    const candidates = listOperations(P, ref("EPSG:6420+6360"), geographic3d);
    expect(candidates.length).toBeGreaterThan(1);
    // The documented rule: the first instantiable, non-ballpark candidate
    // with all its grids and a PROJ string.
    const picked = candidates.find(
      (c) =>
        c.instantiable &&
        !c.ballpark &&
        c.missingGrids.length === 0 &&
        c.pipeline !== "",
    )!;
    const recorded = resolveOperation(P, ref("EPSG:6420+6360"), "EPSG:4979");
    expect(picked.pipeline).toBe(recorded.pipeline);
    expect(picked.accuracy).toBe(recorded.accuracy);
    expect(picked.gridsNeeded).toEqual(recorded.grids);
    expect(picked.gridsNeeded).toContain(GEOID);
    expect(picked.name).toMatch(/California zone 3/);
    // Its area of use is a degree box around California.
    const area = picked.areaOfUse!;
    expect(area.west).toBeLessThan(-120.5);
    expect(area.east).toBeGreaterThan(-120.5);
    expect(area.south).toBeLessThan(37);
    expect(area.north).toBeGreaterThan(37);
    // Candidates that read a grid the store lacks name it.
    const lacking = candidates.filter((c) => c.missingGrids.length > 0);
    expect(lacking.length).toBeGreaterThan(0);
    for (const c of lacking) {
      for (const grid of c.missingGrids) {
        expect(c.gridsNeeded).toContain(grid);
      }
    }
  });

  it("marks a ballpark candidate, with no accuracy", async () => {
    const P = await loadProj({ base });
    const candidates = listOperations(P, ref("EPSG:4230"), geographic3d);
    const ballpark = candidates.filter((c) => c.ballpark);
    expect(ballpark.length).toBeGreaterThan(0);
    for (const c of ballpark) {
      expect(c.name).toMatch(/ballpark/i);
      expect(c.accuracy).toBeUndefined();
    }
  });

  it("lists nothing for CRSs PROJ cannot relate, and throws for an unknown code", async () => {
    const P = await loadProj({ base });
    expect(listOperations(P, ref(MOON_GEOGRAPHIC_CRS), geographic3d)).toEqual(
      [],
    );
    expect(() =>
      listOperations(
        P,
        { format: "wkid", authority: "EPSG", wkid: 999999 },
        geographic3d,
      ),
    ).toThrow(/could not create/);
  });

  // A stub PROJ with one candidate, whose list and area calls can be made to fail.
  const stubProj = (
    operations: () => unknown,
    area: () => unknown = () => [-1, -2, 3, 4, "Somewhere"],
  ) =>
    ({
      proj_create: () => ({}),
      // Quiet while listing (crs.ts lowers the log level, then restores it).
      proj_log_level: () => 0,
      PJ_LOG_NONE: 0,
      proj_get_name: () => "Candidate",
      proj_as_proj_string: () => "+proj=noop",
      proj_normalize_for_visualization: (o: unknown) => o,
      PJ_PROJ_5: 1,
      proj_create_operation_factory_context: () => ({}),
      proj_create_operations: operations,
      proj_coordoperation_get_grid_used_count: () => 0,
      proj_coordoperation_get_accuracy: () => 1,
      proj_coordoperation_is_instantiable: () => true,
      proj_get_area_of_use: area,
    }) as unknown as ProjApi;
  const oneCandidate = () => ({ length: () => 1, get: () => ({}) });

  it("turns only the binding's empty-list answer into [], and rethrows a real failure", () => {
    expect(
      listOperations(
        stubProj(() => {
          throw new Error("Error getting list");
        }),
        ref("EPSG:2227"),
        geographic3d,
      ),
    ).toEqual([]);
    const failure = new Error("out of memory");
    let thrown: unknown;
    try {
      listOperations(
        stubProj(() => {
          throw failure;
        }),
        ref("EPSG:2227"),
        geographic3d,
      );
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error).message).toMatch(
      /could not list the operations from EPSG:2227 to EPSG:4979/,
    );
    expect((thrown as Error).cause).toBe(failure);
  });

  it("leaves out an area only when the binding says there is none", () => {
    const [plain] = listOperations(
      stubProj(oneCandidate),
      ref("EPSG:2227"),
      geographic3d,
    );
    expect(plain!.areaOfUse).toEqual({
      west: -1,
      south: -2,
      east: 3,
      north: 4,
    });
    const [none] = listOperations(
      stubProj(oneCandidate, () => {
        throw new Error("proj_get_area_of_use failed");
      }),
      ref("EPSG:2227"),
      geographic3d,
    );
    expect(none!.areaOfUse).toBeUndefined();
    expect(none!.accuracy).toBe(1);
    const failure = new Error("corrupt proj.db");
    expect(() =>
      listOperations(
        stubProj(oneCandidate, () => {
          throw failure;
        }),
        ref("EPSG:2227"),
        geographic3d,
      ),
    ).toThrow(/could not read an operation's area of use/);
  });

  it("gives plain data (structured-clone safe)", async () => {
    const P = await loadProj({ base });
    const candidates = listOperations(P, ref("EPSG:6420+6360"), geographic3d);
    expect(structuredClone(candidates)).toEqual(candidates);
  });
});

describe("an area of interest (ruling F8)", () => {
  const geographic3d = ref("EPSG:4979");
  // A North Sea point, 56°N 3°E, and a box around it.
  const northSea = { west: 2.9, south: 55.9, east: 3.1, north: 56.1 };
  const ed50 = ref("EPSG:4230");
  const accurate = (c: OperationCandidate) =>
    c.instantiable && !c.ballpark && c.missingGrids.length === 0;

  it("lists the ED50 transformations that cover the point, which PROJ's default drops", async () => {
    const P = await loadProj({ base });
    // Without one, every real ED50 to WGS 84 transformation covers only part
    // of ED50's area, so PROJ keeps only the ballpark.
    const all = listOperations(P, ed50, geographic3d);
    expect(all.filter(accurate)).toEqual([]);
    const near = listOperations(P, ed50, geographic3d, {
      areaOfInterest: northSea,
    });
    const usable = near.filter(accurate);
    expect(usable.length).toBeGreaterThanOrEqual(2);
    for (const c of usable) {
      expect(c.name).toMatch(/^ED50 to WGS 84 \(\d+\)$/);
      const area = c.areaOfUse!;
      expect(area.west).toBeLessThanOrEqual(northSea.west);
      expect(area.east).toBeGreaterThanOrEqual(northSea.east);
      expect(area.south).toBeLessThanOrEqual(northSea.south);
      expect(area.north).toBeGreaterThanOrEqual(northSea.north);
      expect(c.accuracy).toBeGreaterThan(0);
    }
  });

  it("lets resolveOperation take the first of those candidates its rule accepts", async () => {
    const P = await loadProj({ base });
    expect(() => resolveOperation(P, ed50, "EPSG:4979")).toThrow(
      /only a ballpark operation/,
    );
    const recorded = resolveOperation(P, ed50, "EPSG:4979", {
      areaOfInterest: northSea,
    });
    const picked = listOperations(P, ed50, geographic3d, {
      areaOfInterest: northSea,
    }).find((c) => accurate(c) && c.pipeline !== "")!;
    expect(recorded.pipeline).toBe(picked.pipeline);
    expect(recorded.accuracy).toBe(picked.accuracy);
    expect(recorded.ballpark).toBe(false);
    expect(recorded.pipeline).toMatch(/\+proj=helmert/);
  });

  it("refuses an area that is not a box of degrees", async () => {
    const P = await loadProj({ base });
    for (const areaOfInterest of [
      { west: 2.9, south: 56.1, east: 3.1, north: 55.9 },
      { west: 2.9, south: -91, east: 3.1, north: 55.9 },
      { west: Number.NaN, south: 55.9, east: 3.1, north: 56.1 },
      { west: 2.9, south: 55.9, east: 181, north: 56.1 },
    ]) {
      expect(() =>
        listOperations(P, ed50, geographic3d, { areaOfInterest }),
      ).toThrow(RangeError);
      expect(() =>
        resolveOperation(P, ed50, "EPSG:4979", { areaOfInterest }),
      ).toThrow(RangeError);
    }
  });

  it("reads a box across 180° (west greater than east) as across it", async () => {
    const P = await loadProj({ base });
    const fiji = ref("EPSG:4720");
    const accurate = (areaOfInterest: {
      west: number;
      south: number;
      east: number;
      north: number;
    }) =>
      listOperations(P, fiji, geographic3d, { areaOfInterest }).filter(
        (c) => !c.ballpark,
      );
    // Fiji 1986 to WGS 84 (1) spans 180°: its area's west exceeds its east.
    const inside = accurate({
      west: 179.5,
      south: -17.5,
      east: -179.5,
      north: -16.5,
    });
    expect(inside.length).toBeGreaterThan(0);
    for (const c of inside) {
      expect(c.areaOfUse!.west).toBeGreaterThan(c.areaOfUse!.east);
    }
    // The same 1°-wide box across 180° at 51°N, and a box west of Fiji's
    // area, leave only the ballpark: the box is read as 1° wide, not 359°.
    expect(
      accurate({ west: 179.5, south: 51, east: -179.5, north: 52 }),
    ).toEqual([]);
    expect(
      accurate({ west: 170, south: -17.5, east: 175, north: -16.5 }),
    ).toEqual([]);
  });

  it("reports a failing factory context or area setter as a listing failure, with its cause", () => {
    const failure = new Error("context failed");
    const stub = (overrides: Partial<Record<keyof ProjApi, unknown>>) =>
      ({
        proj_create: () => ({}),
        // Quiet while listing (crs.ts lowers the log level, then restores it).
        proj_log_level: () => 0,
        PJ_LOG_NONE: 0,
        proj_get_name: () => "CRS",
        proj_as_proj_string: () => "+proj=noop",
        PJ_PROJ_5: 1,
        proj_create_operation_factory_context: () => ({}),
        proj_operation_factory_context_set_area_of_interest: () => undefined,
        proj_create_operations: () => ({ length: () => 0, get: () => ({}) }),
        ...overrides,
      }) as unknown as ProjApi;
    const box = { west: 2.9, south: 55.9, east: 3.1, north: 56.1 };
    for (const broken of [
      stub({
        proj_create_operation_factory_context: () => {
          throw failure;
        },
      }),
      stub({
        proj_operation_factory_context_set_area_of_interest: () => {
          throw failure;
        },
      }),
    ]) {
      let thrown: unknown;
      try {
        listOperations(broken, ed50, geographic3d, { areaOfInterest: box });
      } catch (error) {
        thrown = error;
      }
      expect((thrown as Error).message).toMatch(
        /could not list the operations/,
      );
      expect((thrown as Error).cause).toBe(failure);
      expect(() =>
        resolveOperation(broken, ed50, "EPSG:4979", { areaOfInterest: box }),
      ).toThrow(/offers no usable operation/);
    }
  });
});
