// gridFactors on a CRS whose conversion PROJ can't give (a geographic one:
// proj_crs_get_coordoperation returns an empty object). Before the fix
// proj_normalize_for_visualization dereferenced it and the worker died with
// SIGSEGV; now it throws. PROJ's coordinate service's factors
// (projGridFactors) are what gridFactors reads. A file of its own, so a crash
// would not hide other results. `npm run test:data` runs it.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { projGridFactors } from "../../src/engineering/factors.ts";
import { loadProj } from "../../src/engineering/proj.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;

describe("gridFactors on a CRS with no conversion", () => {
  it("throws a clear error instead of crashing PROJ", async () => {
    const proj = await loadProj({ base, grids: [] });
    const factors = projGridFactors(
      proj,
      { format: "wkid", authority: "EPSG", wkid: 4326 },
      1,
      () => 0,
    );
    expect(() => factors([0, 0, 0])).toThrow(
      /PROJ could not create the CRS's conversion to normalize it/,
    );
  });

  it("throws for a CRS PROJ can't create", async () => {
    const proj = await loadProj({ base, grids: [] });
    const factors = projGridFactors(
      proj,
      { format: "wkid", authority: "EPSG", wkid: 99999999 },
      1,
      () => 0,
    );
    expect(() => factors([0, 0, 0])).toThrow(/could not create/);
  });
});
