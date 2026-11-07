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
