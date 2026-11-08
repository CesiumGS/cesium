// A geoid fallback whose own CRS can't resolve either (its model's grid
// isn't loaded) names the engineering frame, from `create` as from `load`
// (plan 5a, Task 16). A file of its own, so a PROJ of its own with no grids
// (Vitest's forks pool isolates each file; a PROJ in another file's process
// may have loaded EGM96). `npm run test:data` runs it.
import { join } from "node:path";
import { expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { loadedGrids, loadProj } from "../../src/engineering/proj.ts";
import { EARTH } from "../../src/scene/Body.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;

it("names the frame, from create and from load", async () => {
  const proj = await loadProj({ base, grids: [] });
  expect(loadedGrids(proj).size).toBe(0);
  // Jakarta: INAGEOID2020v1.gtx isn't in PROJ-data, and EGM96's grid isn't
  // loaded, so neither the CRS nor its EGM96 fallback resolves.
  const jakarta = {
    name: "Jakarta",
    body: EARTH,
    crs: { format: "wkid", authority: "EPSG", wkid: 9488, vcsWkid: 9471 },
    geoidFallback: "EGM96",
  } as const;
  const message =
    /^EngineeringFrame "Jakarta": the EGM96 fallback for EPSG:9488\+9471 \(.*\) can't be resolved either: .*us_nga_egm96_15\.tif/;
  expect(() => EngineeringFrame.create(jakarta, proj)).toThrow(message);
  await expect(EngineeringFrame.load(jakarta, { proj })).rejects.toThrow(
    message,
  );
});
