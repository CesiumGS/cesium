// The design globe's portfolio (plan 4b Task 12, the plan's call 19): each
// site's frame loads with the store's grids, its operation reads exactly the
// grids the site lists, its origin lands where the site says and round-trips,
// its model's footprint (Task 17b's ladder) is in its area of interest, and
// setup's `portfolio` grid set is the grids they all read.
//
// PROJ starts with no grids, and grids come from the store's `grids/`
// through a GridSource, as the browser gets them. A file of its own, so a
// PROJ of its own (Vitest's forks pool isolates each file). The cases share
// one PROJ: what one loads, the next one has. `npm run test:data` runs it,
// after `npm run setup -- --grids portfolio,tests`.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { GRID_SETS } from "../../scripts/gridSets.mjs";
import {
  CORRIDOR_ALIGNMENT,
  CORRIDOR_CRS,
  CORRIDOR_PIPELINE,
  corridorFrame,
} from "../../examples/design-globe/corridor.ts";
import {
  ION_SLOTS,
  PHOENIX_PIPELINE,
  PORTFOLIO,
  SITE_BUILDING,
  modelFootprint,
  type PortfolioSite,
} from "../../examples/design-globe/sites.ts";
import { Alignment } from "../../src/engineering/alignment.ts";
import {
  listOperations,
  type AreaOfInterest,
} from "../../src/engineering/crs.ts";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import {
  gridSource,
  loadProj,
  type GridSource,
} from "../../src/engineering/proj.ts";
import type { ProjApi } from "../../src/engineering/projApi.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
const grids = `${join(framesDataDirectory(), "grids")}/`;

let shared: Promise<{ P: ProjApi; source: GridSource }> | undefined;
const setup = () =>
  (shared ??= (async () => ({
    P: await loadProj({ base, grids: [] }),
    source: await gridSource({ base: grids }),
  }))());

const DEGREES = 180 / Math.PI;
const sorted = (names: readonly string[]) => [...names].sort();

/** Whether a geodetic position (radians) is inside an area (degrees). */
function inside(
  at: { longitude: number; latitude: number },
  area: AreaOfInterest,
): boolean {
  const lon = at.longitude * DEGREES;
  const lat = at.latitude * DEGREES;
  return (
    area.west <= lon &&
    lon <= area.east &&
    area.south <= lat &&
    lat <= area.north
  );
}

/** Metres between a design point and its round trip through body-fixed. */
function roundTripMetres(frame: EngineeringFrame, design: ArrayLike<number>) {
  const back = frame.fromBodyFixed(frame.toBodyFixed(design));
  const scale = frame.definition.site?.scale ?? 1;
  const horizontal = frame.units.metersPerUnit * scale;
  const vertical = frame.metersPerHeightUnit;
  return Math.max(
    Math.abs(back[0]! - design[0]!) * horizontal,
    Math.abs(back[1]! - design[1]!) * horizontal,
    Math.abs(back[2]! - design[2]!) * vertical,
  );
}

/** Loads a site's frame and checks its grids, its place and its round trip. */
async function checkSite(site: PortfolioSite): Promise<EngineeringFrame> {
  const { P, source } = await setup();
  const frame = await EngineeringFrame.load(site.frame, {
    proj: P,
    grids: source,
  });
  expect(sorted(frame.operation.grids)).toEqual(sorted(site.grids));
  expect(frame.operation.ballpark).toBe(false);
  expect(frame.gridCredits.length).toBeGreaterThan(0);
  const at = frame.toGeodetic(site.origin);
  expect(inside(at, site.frame.areaOfInterest!), "origin in its area").toBe(
    true,
  );
  expect(roundTripMetres(frame, site.origin)).toBeLessThan(1e-4);
  // The model's footprint's corners are in its area, and round-trip too.
  for (const corner of modelFootprint(site)) {
    expect(
      inside(frame.toGeodetic(corner), site.frame.areaOfInterest!),
      `${site.id}: corner ${corner.join(", ")} in its area`,
    ).toBe(true);
    expect(roundTripMetres(frame, corner)).toBeLessThan(1e-4);
  }
  return frame;
}

describe("the portfolio (call 19)", () => {
  it("is seven sites with unique ids, each on its own CRS", () => {
    expect(PORTFOLIO.map((s) => s.id)).toEqual([
      "london",
      "sydney",
      "tokyo",
      "amsterdam",
      "nairobi",
      "phoenix",
      "jakarta",
    ]);
    expect(
      PORTFOLIO.map((s) =>
        s.frame.crs.format === "wkid"
          ? `${s.frame.crs.wkid}+${s.frame.crs.vcsWkid}`
          : "wkt2",
      ),
    ).toEqual([
      "27700+5701",
      "7856+5711",
      "6677+6695",
      "28992+5709",
      "32737+5773",
      "6405+8228",
      "9488+9471",
    ]);
  });

  for (const site of PORTFOLIO) {
    it(`${site.name}: loads with the store's grids, reads exactly ${site.grids.join(", ")}, and its origin round-trips within 1e-4 m`, async () => {
      const frame = await checkSite(site);
      if (site.id === "jakarta") {
        // INAGEOID2020v1.gtx isn't in PROJ-data: design heights are EGM96's.
        expect(frame.fallback?.model).toBe("EGM96");
        expect(frame.fallback?.replacedVertical).toBe(9471);
        expect(frame.fallback?.missingGrids).toEqual(["INAGEOID2020v1.gtx"]);
      } else {
        expect(frame.fallback).toBeUndefined();
        // The best candidate won: none better was skipped.
        expect(frame.operation.betterCandidates).toEqual([]);
      }
    });
  }

  it("Tokyo's origin is (−7,000 E, −35,500 N) in normalized order, near Tokyo Station", async () => {
    const tokyo = PORTFOLIO.find((s) => s.id === "tokyo")!;
    expect(tokyo.origin.slice(0, 2)).toEqual([-7_000, -35_500]);
    const { P, source } = await setup();
    const frame = await EngineeringFrame.load(tokyo.frame, {
      proj: P,
      grids: source,
    });
    const at = frame.toGeodetic(tokyo.origin);
    expect(at.longitude * DEGREES).toBeCloseTo(139.76, 1);
    expect(at.latitude * DEGREES).toBeCloseTo(35.68, 1);
  });
});

describe("the site-grid building", () => {
  it("is on a site grid of the corridor's CRS, 2,000 E and 1,500 N of the alignment's start", () => {
    const site = SITE_BUILDING.frame.site!;
    const [e0, n0] = CORRIDOR_ALIGNMENT.start;
    expect(SITE_BUILDING.frame.crs).toBe(CORRIDOR_CRS);
    expect(site.origin).toEqual([e0 + 2_000, n0 + 1_500, 0]);
    expect(site.rotation).toBeCloseTo((12.5 * Math.PI) / 180, 15);
    expect(site.scale).toBe(1.0000375);
    expect(SITE_BUILDING.model).toEqual({
      kind: "building",
      width: 200,
      depth: 120,
      stories: 3,
      storyHeight: 13,
    });
  });

  it("loads with the store's grids, reads exactly its grids, and its origin round-trips within 1e-4 m", async () => {
    await checkSite(SITE_BUILDING);
  });
});

describe("the corridor's frame", () => {
  it("loads, reads the building's grids (the same CRS), and the whole route lies in its area of interest", async () => {
    const { P, source } = await setup();
    const frame = await EngineeringFrame.load(corridorFrame(), {
      proj: P,
      grids: source,
    });
    expect(sorted(frame.operation.grids)).toEqual(sorted(SITE_BUILDING.grids));
    // NAVD88 through GEOID18, pinned: not PROJ's GEOID99 or GEOID03 choice.
    expect(frame.operation.grids).toEqual(["us_noaa_g2018u0.tif"]);
    expect(frame.operation.pipeline).toBe(CORRIDOR_PIPELINE);
    expect(frame.operation.betterCandidates).toEqual([]);
    const alignment = new Alignment(CORRIDOR_ALIGNMENT);
    const area = corridorFrame().areaOfInterest!;
    for (
      let station = alignment.startStation;
      station <= alignment.endStation;
      station += 2_000
    ) {
      for (const offset of [-41, 41]) {
        const [e, n] = alignment.pointAt(station, offset);
        const design = [e!, n!, alignment.elevationAt(station)];
        expect(inside(frame.toGeodetic(design), area), `${station}`).toBe(true);
      }
    }
    const end = alignment.pointAt(alignment.endStation);
    expect(inside(frame.toGeodetic([end[0]!, end[1]!, 1_000]), area)).toBe(
      true,
    );
  });
});

describe("the pinned GEOID18 pipelines", () => {
  const WGS84_3D = { format: "wkid", authority: "EPSG", wkid: 4979 } as const;
  const GEOID18 = "us_noaa_g2018u0.tif";
  const phoenix = PORTFOLIO.find((s) => s.id === "phoenix")!;
  const cases = [
    ["the corridor", corridorFrame(), CORRIDOR_PIPELINE, 2.015],
    ["the site-grid building", SITE_BUILDING.frame, CORRIDOR_PIPELINE, 2.015],
    ["Phoenix", phoenix.frame, PHOENIX_PIPELINE, 2.015],
  ] as const;
  for (const [what, frame, pinned, accuracy] of cases) {
    it(`${what}: pins PROJ's own GEOID18 operation within its area, which PROJ ranks behind a superseded geoid`, async () => {
      expect(frame.pipeline).toBe(pinned);
      const { P } = await setup();
      const candidates = listOperations(P, frame.crs, WGS84_3D, {
        areaOfInterest: frame.areaOfInterest!,
      }).filter((c) => !c.ballpark);
      const geoid18 = candidates.find((c) => c.gridsNeeded.includes(GEOID18));
      expect(geoid18?.pipeline).toBe(pinned);
      expect(geoid18?.accuracy).toBe(accuracy);
      // PROJ's first candidate reads GEOID99 instead.
      expect(candidates[0]!.gridsNeeded.some((g) => /g1999u0/.test(g))).toBe(
        true,
      );
      // The pin matches that candidate, so the frame keeps PROJ's stated
      // accuracy for it, and names it.
      const loaded = await EngineeringFrame.load(frame, {
        proj: P,
        grids: (await setup()).source,
      });
      expect(loaded.operation.accuracy).toBe(accuracy);
      expect(loaded.operation.matchedCandidate).toBe(geoid18!.name);
    });
  }

  it("a hand-edited pin that matches no candidate states no accuracy", async () => {
    const { P, source } = await setup();
    // Equivalent in effect (a no-op step), but not one of PROJ's strings.
    const edited = CORRIDOR_PIPELINE.replace(
      " +step +proj=unitconvert +xy_in=rad",
      " +step +proj=noop +step +proj=unitconvert +xy_in=rad",
    );
    expect(edited).not.toBe(CORRIDOR_PIPELINE);
    const frame = await EngineeringFrame.load(
      { ...corridorFrame(), pipeline: edited },
      { proj: P, grids: source },
    );
    expect(frame.operation.pipeline).toBe(edited);
    expect(frame.operation.accuracy).toBeUndefined();
    expect(frame.operation.matchedCandidate).toBeUndefined();
  });
});

describe("setup's portfolio grid set", () => {
  it("is exactly the grids the portfolio, the building and the corridor read", () => {
    const read = new Set([
      ...PORTFOLIO.flatMap((s) => s.grids),
      ...SITE_BUILDING.grids,
    ]);
    expect(sorted(GRID_SETS.portfolio as readonly string[])).toEqual(
      sorted([...read]),
    );
  });
});

describe("the ion slots", () => {
  it("are two empty slots, waiting on their frames (held item 2)", () => {
    expect(ION_SLOTS).toEqual([
      { label: "Metrostation (share key)" },
      { label: "Your long iModel" },
    ]);
  });
});
