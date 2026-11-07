// Recorded PROJ operations when the geoid isn't loaded (Review Focus 1 of plan
// 4a): PROJ loads from the store with `grids: []`, so GEOID18, though it sits
// in the store's proj/ beside proj.db, is not where this PROJ looks. A file of
// its own, so a process of its own (Vitest's forks pool isolates each file;
// see gridLoad.test.ts), apart from crs.test.ts, which loads the geoid.
// `npm run test:data` runs it.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { resolveOperation, type CrsRef } from "../../src/engineering/crs.ts";
import { loadedGrids, loadProj } from "../../src/engineering/proj.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
const GEOID = "us_noaa_g2018u0.tif";
const NAVD88: CrsRef = {
  format: "wkid",
  authority: "EPSG",
  wkid: 6420,
  vcsWkid: 6360,
};

const load = () => loadProj({ base, grids: [] });

describe("the geoid, when it is not loaded", () => {
  it("is not among the loaded grids", async () => {
    expect(loadedGrids(await load()).has(GEOID)).toBe(false);
  });

  it("throws, naming the grid, never choosing PROJ's coarser operation", async () => {
    const P = await load();
    expect(() => resolveOperation(P, NAVD88, "EPSG:4979")).toThrow(
      /us_noaa_g2018u0\.tif/,
    );
  });

  it("also refuses to fall back to a ballpark operation by default", async () => {
    const P = await load();
    expect(() =>
      resolveOperation(P, NAVD88, "EPSG:4979", { allowBallpark: false }),
    ).toThrow(/us_noaa_g2018u0/);
  });

  it("takes the ballpark operation only when asked, with no accuracy", async () => {
    const P = await load();
    const op = resolveOperation(P, NAVD88, "EPSG:4979", {
      allowBallpark: true,
    });
    expect(op.ballpark).toBe(true);
    expect(op.accuracy).toBeUndefined();
    expect(op.grids).toEqual([]);
    // Heights are not corrected: the ballpark leaves NAVD88 as it is.
    const out = op.forward([6889750, 1640416.667, 328.083333333]);
    expect(out[2]).toBeCloseTo(100, 4);
  });

  it("with allowBallpark, lists every accurate candidate it skipped as better, whatever its geoid: a ballpark has none to keep", async () => {
    const P = await load();
    const op = resolveOperation(P, NAVD88, "EPSG:4979", {
      allowBallpark: true,
    });
    expect(op.ballpark).toBe(true);
    const better = op.betterCandidates;
    // PROJ's three best: NADCON5 with GEOID99 or GEOID03 (1.14 m), and GEOID18.
    expect(better.slice(0, 3).map((c) => c.accuracy)).toEqual([
      1.14, 1.14, 2.015,
    ]);
    const geoids = better.map((c) =>
      c.missingGrids.find((g) => /g1999|geoid03|g2018|geoid09/.test(g)),
    );
    expect(geoids.slice(0, 3)).toEqual([
      "us_noaa_g1999u05.tif",
      "us_noaa_geoid03_conus.tif",
      GEOID,
    ]);
    expect(new Set(geoids).size).toBeGreaterThan(3);
    expect(better.every((c) => !/^Ballpark|\+ Ballpark/.test(c.name))).toBe(
      true,
    );
  });

  it("still resolves a pair that needs no grid", async () => {
    const P = await load();
    const op = resolveOperation(
      P,
      { format: "wkid", authority: "EPSG", wkid: 32611 },
      "EPSG:4979",
    );
    expect(op.ballpark).toBe(false);
  });

  it("throws when a pinned pipeline's grid is missing, not an identity", async () => {
    const P = await load();
    const pipeline = `+proj=pipeline +step +proj=vgridshift +grids=${GEOID} +multiplier=1`;
    expect(() =>
      resolveOperation(P, NAVD88, "EPSG:4979", { pipeline }),
    ).toThrow(/us_noaa_g2018u0/);
  });
});
