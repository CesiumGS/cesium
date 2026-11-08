// PROJ as a coordinate service (plan 5a, Task 16): `EngineeringFrame.load`
// through `projCoordinateService` places every design point exactly where
// the `proj` option does, for the corridor's frame, the site-grid building's
// and each of the portfolio's seven, at 21 points each (`toEqual`: the same
// numbers, not close ones). The `proj` option builds a projCoordinateService
// itself, so the two are one path; this pins that they stay one.
//
// PROJ starts with no grids, and grids come from the store's `grids/`
// through a GridSource, as the browser gets them. A file of its own, so a
// PROJ of its own (Vitest's forks pool isolates each file). `npm run
// test:data` runs it, after `npm run setup -- --grids portfolio,tests`.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import {
  CORRIDOR_ALIGNMENT,
  corridorFrame,
} from "../../examples/design-globe/corridor.ts";
import { PORTFOLIO, SITE_BUILDING } from "../../examples/design-globe/sites.ts";
import { Alignment } from "../../src/engineering/alignment.ts";
import {
  EngineeringFrame,
  type EngineeringFrameDefinition,
} from "../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import {
  gridSource,
  loadProj,
  type GridSource,
} from "../../src/engineering/proj.ts";
import { projCoordinateService } from "../../src/engineering/projCoordinates.ts";
import type { ProjApi } from "../../src/engineering/projApi.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
const grids = `${join(framesDataDirectory(), "grids")}/`;

let shared: Promise<{ P: ProjApi; source: GridSource }> | undefined;
const setup = () =>
  (shared ??= (async () => ({
    P: await loadProj({ base, grids: [] }),
    source: await gridSource({ base: grids }),
  }))());

/** 21 design points along the corridor's alignment, end to end. */
function corridorPoints(): number[][] {
  const alignment = new Alignment(CORRIDOR_ALIGNMENT);
  const { startStation, endStation } = alignment;
  return Array.from({ length: 21 }, (_, i) => {
    const station = startStation + ((endStation - startStation) * i) / 20;
    const [e, n] = alignment.pointAt(station, i % 2 === 0 ? -41 : 41);
    return [e!, n!, alignment.elevationAt(station)];
  });
}

/** 21 design points about `origin`: a 7 by 3 grid, 500 units apart, heights varied. */
function gridPoints(origin: readonly number[]): number[][] {
  return Array.from({ length: 21 }, (_, i) => [
    origin[0]! + ((i % 7) - 3) * 500,
    origin[1]! + (Math.floor(i / 7) - 1) * 500,
    origin[2]! + (i - 10) * 3,
  ]);
}

const cases: [string, EngineeringFrameDefinition, number[][]][] = [
  ["the corridor", corridorFrame(), corridorPoints()],
  [
    "the site-grid building",
    SITE_BUILDING.frame,
    gridPoints(SITE_BUILDING.origin),
  ],
  ...PORTFOLIO.map(
    (site) =>
      [site.name, site.frame, gridPoints(site.origin)] as [
        string,
        EngineeringFrameDefinition,
        number[][],
      ],
  ),
];

describe("projCoordinateService", () => {
  for (const [what, definition, points] of cases) {
    it(`${what}: load through the service and through the proj option give identical toBodyFixed at 21 points`, async () => {
      const { P, source } = await setup();
      const viaService = await EngineeringFrame.load(definition, {
        coordinates: projCoordinateService({ proj: P, grids: source }),
      });
      const viaProj = await EngineeringFrame.load(definition, {
        proj: P,
        grids: source,
      });
      expect(points).toHaveLength(21);
      const a = points.map((d) => Array.from(viaService.toBodyFixed(d)));
      const b = points.map((d) => Array.from(viaProj.toBodyFixed(d)));
      expect(a).toEqual(b);
      expect(a.flat().every(Number.isFinite)).toBe(true);
      // And the rest of what the frame carries.
      const fixed = viaProj.toBodyFixed(points[10]!);
      expect(Array.from(viaService.fromBodyFixed(fixed))).toEqual(
        Array.from(viaProj.fromBodyFixed(fixed)),
      );
      expect(viaService.units).toEqual(viaProj.units);
      expect(viaService.gridCredits).toEqual(viaProj.gridCredits);
      expect(viaService.fallback).toEqual(viaProj.fallback);
      expect(viaService.operation.description).toBe(viaProj.operation.pipeline);
      expect(viaService.operation.accuracy).toBe(viaProj.operation.accuracy);
      expect(viaService.proj).toBe(P);
      expect(gridFactors(viaService, points[10]!)).toEqual(
        gridFactors(viaProj, points[10]!),
      );
    });
  }

  it("an aborted signal rejects with an AbortError naming the frame, before PROJ fetches anything", async () => {
    const { P, source } = await setup();
    const controller = new AbortController();
    controller.abort();
    const loading = EngineeringFrame.load(corridorFrame(), {
      proj: P,
      grids: source,
      signal: controller.signal,
    });
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
    await expect(loading).rejects.toThrow(/Highway corridor/);
  });

  it("a PROJ resolution failure rejects naming the frame", async () => {
    const { P, source } = await setup();
    await expect(
      EngineeringFrame.load(
        {
          ...corridorFrame(),
          name: "No such CRS",
          crs: { format: "wkid", authority: "EPSG", wkid: 1 },
          pipeline: undefined,
        } as EngineeringFrameDefinition,
        { coordinates: projCoordinateService({ proj: P, grids: source }) },
      ),
    ).rejects.toThrow(/EngineeringFrame "No such CRS"/);
  });
});
