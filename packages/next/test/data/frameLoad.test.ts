// EngineeringFrame.load: lazy grids for frames, and the better candidates a
// frame records when it skips them for missing grids (plan 4b Task 6).
//
// PROJ starts with no grids (`grids: []`), and grids come from the store's
// `grids/` through a GridSource, as the browser gets them. A file of its own,
// so a PROJ of its own (Vitest's forks pool isolates each file; see
// gridLoad.test.ts). The cases run in order and share one PROJ: what one
// loads, the next one has. `npm run test:data` runs it, after
// `npm run setup -- --grids portfolio,tests`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import {
  listOperations,
  type AreaOfInterest,
  type CrsRef,
} from "../../src/engineering/crs.ts";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { GridCatalog } from "../../src/engineering/gridCatalog.ts";
import {
  gridSource,
  loadedGrids,
  loadGrids,
  loadProj,
  type GridSource,
} from "../../src/engineering/proj.ts";
import { EARTH } from "../../src/scene/Body.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
const grids = `${join(framesDataDirectory(), "grids")}/`;
const proj = () => loadProj({ base, grids: [] });
const store = () => gridSource({ base: grids });

const GEOID18 = "us_noaa_g2018u0.tif";
const OSTN15 = "uk_os_OSTN15_NTv2_OSGBtoETRS.tif";
const OSGM15 = "uk_os_OSGM15_GB.tif";
const CONUS = "us_noaa_conus.tif";
const CNHPGN = "us_noaa_cnhpgn.tif";
const RDTRANS = "nl_nsgi_rdtrans2018.tif";
const NLGEO = "nl_nsgi_nlgeo2018.tif";
const WGS84_3D: CrsRef = { format: "wkid", authority: "EPSG", wkid: 4979 };

// The plan-4a California frame's operation with GEOID18 loaded (recorded
// 2026-11-07 from the code before this task, in a PROJ with only GEOID18).
const CALIFORNIA_PIPELINE =
  "+proj=pipeline +step +proj=unitconvert +xy_in=us-ft +xy_out=m +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +step +proj=unitconvert +z_in=us-ft +z_out=m +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=unitconvert +xy_in=rad +xy_out=deg";
const CALIFORNIA_ACCURACY = 2.015;

const LONDON: AreaOfInterest = {
  west: -0.2,
  south: 51.4,
  east: 0.0,
  north: 51.6,
};
const BNG_ODN: CrsRef = {
  format: "wkid",
  authority: "EPSG",
  wkid: 27700,
  vcsWkid: 5701,
};
const LONDON_OPERATION =
  "Inverse of British National Grid + OSGB36 to ETRS89 (2) + Inverse of ETRS89 to ODN height (2) + ETRS89 to WGS 84 (1)";

// EPSG:26741, California CS27 zone I (plan 4a): PROJ's three accurate
// candidates, best first.
const CS27: CrsRef = { format: "wkid", authority: "EPSG", wkid: 26741 };
const CS27_NADCON_HPGN =
  "Inverse of California CS27 zone I + NAD27 to NAD83 (1) + NAD83 to WGS 84 (43)";
const CS27_NADCON = "Inverse of California CS27 zone I + NAD27 to WGS 84 (79)";
const CS27_HELMERT = "Inverse of California CS27 zone I + NAD27 to WGS 84 (6)";

/** The store's catalog without `left`: a GridSource whose catalog lacks a grid. */
function storeWithout(left: string): GridSource {
  const geojson = JSON.parse(
    readFileSync(join(grids, "files.geojson"), "utf8"),
  ) as { features: { properties: { name: string } }[] };
  geojson.features = geojson.features.filter((f) => f.properties.name !== left);
  return {
    base: grids,
    catalog: GridCatalog.parse(
      JSON.stringify(geojson),
      readFileSync(join(grids, "copyright_and_licenses.csv"), "utf8"),
    ),
  };
}

describe("no regression: the plan-4a California frame", () => {
  // First in the file: only GEOID18 is loaded, as in the explorer.
  it("with GEOID18 loaded, create records the same pipeline and accuracy, and no credits", async () => {
    const P = await proj();
    await loadGrids(P, await store(), [GEOID18]);
    const frame = EngineeringFrame.create(
      {
        name: "CA3",
        body: EARTH,
        crs: {
          format: "wkid",
          authority: "EPSG",
          wkid: 6420,
          vcsWkid: 6360,
        },
        site: {
          origin: [6_000_000, 2_100_000, 0],
          rotation: (12.5 * Math.PI) / 180,
          scale: 1.0000375,
        },
      },
      P,
    );
    expect(frame.operation.pipeline).toBe(CALIFORNIA_PIPELINE);
    expect(frame.operation.accuracy).toBe(CALIFORNIA_ACCURACY);
    expect(frame.operation.grids).toEqual([GEOID18]);
    expect(frame.gridCredits).toEqual([]);
  });
});

describe("London: EPSG:27700+5701 with an area of interest", () => {
  it("load fetches OSTN15 and OSGM15 and records PROJ's best operation, with its credits", async () => {
    const P = await proj();
    expect(loadedGrids(P).has(OSTN15)).toBe(false);
    expect(loadedGrids(P).has(OSGM15)).toBe(false);
    const best = listOperations(P, BNG_ODN, WGS84_3D, {
      areaOfInterest: LONDON,
    }).find((c) => c.name === LONDON_OPERATION);
    expect(best?.accuracy).toBe(1.038);

    const frame = await EngineeringFrame.load(
      { name: "London", body: EARTH, crs: BNG_ODN, areaOfInterest: LONDON },
      { proj: P, grids: await store() },
    );
    expect(loadedGrids(P).has(OSTN15)).toBe(true);
    expect(loadedGrids(P).has(OSGM15)).toBe(true);
    expect(frame.operation.grids).toEqual(
      expect.arrayContaining([OSTN15, OSGM15]),
    );
    expect(frame.operation.accuracy).toBe(best!.accuracy);
    expect(frame.operation.pipeline).toBe(best!.pipeline);
    expect(frame.operation.betterCandidates).toEqual([]);
    // One credit for the two grids: both are Ordnance Survey's.
    expect(frame.gridCredits).toEqual([
      "Ordnance Survey (BSD-2-Clause), via PROJ-data 1.25.0",
    ]);
    // The design point at the area's centre lands in London.
    const at = frame.toGeodetic([530_000, 180_000, 10]);
    expect((at.longitude * 180) / Math.PI).toBeCloseTo(-0.13, 1);
    expect((at.latitude * 180) / Math.PI).toBeCloseTo(51.5, 1);
  });
});

describe("EPSG:26741 (plan 4a's case), NADCON not loaded", () => {
  it("create records the 2.15 m and 5 m candidates it skipped, with their grids", async () => {
    const P = await proj();
    expect(loadedGrids(P).has(CONUS)).toBe(false);
    const frame = EngineeringFrame.create(
      { name: "CS27", body: EARTH, crs: CS27 },
      P,
    );
    expect(frame.operation.accuracy).toBe(7);
    expect(frame.operation.grids).toEqual([]);
    expect(frame.operation.betterCandidates).toEqual([
      {
        name: CS27_NADCON_HPGN,
        accuracy: 2.15,
        missingGrids: [CNHPGN, CONUS],
      },
      { name: CS27_NADCON, accuracy: 5, missingGrids: [CONUS] },
    ]);
    expect(frame.gridCredits).toEqual([]);
  });

  it("load with a catalog that lacks one of the best candidate's grids fetches nothing for it, and takes the next", async () => {
    const P = await proj();
    const frame = await EngineeringFrame.load(
      { name: "CS27", body: EARTH, crs: CS27 },
      { proj: P, grids: storeWithout(CNHPGN) },
    );
    expect(loadedGrids(P).has(CNHPGN)).toBe(false);
    expect(loadedGrids(P).has(CONUS)).toBe(true);
    // PROJ had looked for CONUS before it was loaded: the frame still takes it.
    expect(frame.operation.accuracy).toBe(5);
    expect(frame.operation.grids).toEqual([CONUS]);
    expect(frame.operation.betterCandidates).toEqual([
      {
        name: CS27_NADCON_HPGN,
        accuracy: 2.15,
        missingGrids: [CNHPGN],
      },
    ]);
    expect(frame.gridCredits).toEqual([
      "US National Oceanographic and Atmospheric Administration (NOAA) (Public domain), via PROJ-data 1.25.0",
    ]);
  });

  it("load with the store's catalog fetches the rest, and records the best operation", async () => {
    const P = await proj();
    const frame = await EngineeringFrame.load(
      { name: "CS27", body: EARTH, crs: CS27 },
      { proj: P, grids: await store() },
    );
    expect(loadedGrids(P).has(CNHPGN)).toBe(true);
    expect(frame.operation.accuracy).toBe(2.15);
    expect(frame.operation.grids).toEqual([CNHPGN, CONUS]);
    expect(frame.operation.betterCandidates).toEqual([]);
    // Better than the Helmert it took before: NADCON moves the point by metres.
    const helmert = listOperations(P, CS27, WGS84_3D).find(
      (c) => c.name === CS27_HELMERT,
    );
    expect(helmert?.accuracy).toBe(7);
    // create, now that the grids are loaded, takes the same operation.
    const again = EngineeringFrame.create(
      { name: "CS27", body: EARTH, crs: CS27 },
      P,
    );
    expect(again.operation.pipeline).toBe(frame.operation.pipeline);
    expect(again.gridCredits).toEqual([]);
  });
});

describe("a pinned pipeline", () => {
  it("load fetches the grids it names, and records no better candidates", async () => {
    const P = await proj();
    const rdNap: CrsRef = {
      format: "wkid",
      authority: "EPSG",
      wkid: 28992,
      vcsWkid: 5709,
    };
    const [best] = listOperations(P, rdNap, WGS84_3D).filter(
      (c) => !c.ballpark,
    );
    expect(best?.gridsNeeded).toEqual(expect.arrayContaining([RDTRANS, NLGEO]));
    expect(loadedGrids(P).has(RDTRANS)).toBe(false);
    const frame = await EngineeringFrame.load(
      { name: "RD", body: EARTH, crs: rdNap, pipeline: best!.pipeline },
      { proj: P, grids: await store() },
    );
    expect(loadedGrids(P).has(RDTRANS)).toBe(true);
    expect(loadedGrids(P).has(NLGEO)).toBe(true);
    expect(frame.operation.pipeline).toBe(best!.pipeline);
    expect(frame.operation.betterCandidates).toEqual([]);
    expect(frame.gridCredits).toEqual([
      "Nederlandse Samenwerking Geodetische Infrastructuur (NSGI) (CC-BY-4.0), via PROJ-data 1.25.0",
    ]);
  });
});

describe("load's other cases", () => {
  it("without a GridSource is create, with no credits", async () => {
    const P = await proj();
    const frame = await EngineeringFrame.load(
      { name: "CS27", body: EARTH, crs: CS27 },
      { proj: P },
    );
    // CONUS and HPGN are loaded by now (above).
    expect(frame.operation.accuracy).toBe(2.15);
    expect(frame.gridCredits).toEqual([]);
  });

  it("rejects a definition create refuses, before fetching anything", async () => {
    const P = await proj();
    const before = [...loadedGrids(P)];
    await expect(
      EngineeringFrame.load(
        {
          name: "geographic",
          body: EARTH,
          crs: { format: "wkid", authority: "EPSG", wkid: 4326 },
        },
        { proj: P, grids: await store() },
      ),
    ).rejects.toThrow(/needs a projected CRS/);
    expect([...loadedGrids(P)]).toEqual(before);
  });
});
