// Country geoids and height systems against their publishers' own test values
// (plan 4b Task 9; the explorer's R10: never PROJ's or pyproj's), from
// test/fixtures/frames/geoids.json. Each case's source, retrieval date and
// precision are in the fixture, and the Task 9 report says how each was got.
//
//  - Geographic cases (GA, GSI, NGS publish latitude and longitude -> N):
//    loadGrids, then resolveOperation from the compound CRS to its own
//    geographic 3D CRS (`target`), pinned to PROJ's own operation that reads
//    the case's grids. EngineeringFrame refuses a geographic CRS.
//  - Projected cases (OS's OSTN15 and OSGM15, NSGI's RD and NAP):
//    EngineeringFrame.load, which fetches the best operation's grids.
//  - A case with `missingReference` compares nothing: it is skipped, with its
//    reason, never counted as a pass.
//
// PROJ starts with no grids, and grids come from the store's `grids/`
// through a GridSource, as the browser gets them. A file of its own, so a
// PROJ of its own; its cases share one PROJ. `npm run test:data` runs it,
// after `npm run setup -- --grids portfolio,tests` (a case whose grid isn't
// in the store skips, naming the setup command).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { GRID_SETS } from "../../scripts/gridSets.mjs";
import {
  crsDefinition,
  listOperations,
  resolveOperation,
  type AreaOfInterest,
  type CrsRef,
} from "../../src/engineering/crs.ts";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import {
  gridSource,
  loadGrids,
  loadProj,
  type GridSource,
} from "../../src/engineering/proj.ts";
import type { ProjApi } from "../../src/engineering/projApi.ts";
import { EARTH } from "../../src/scene/Body.ts";

interface Source {
  readonly url: string;
  readonly retrieved: string;
  readonly publisher: string;
}
interface GeoidPoint {
  /** The publisher's point name, where it gives one. */
  readonly id?: string;
  readonly input: readonly number[];
  readonly expected: readonly number[];
}
interface ReferencedCase {
  readonly id: string;
  readonly crs: CrsRef;
  /** Geographic cases: the geographic 3D CRS the published N is on. */
  readonly target?: CrsRef;
  readonly kind: "geographic" | "projected";
  readonly grids: readonly string[];
  readonly source: Source;
  /** Metres. */
  readonly precision: number;
  readonly note?: string;
  readonly points: readonly GeoidPoint[];
}
interface MissingCase {
  readonly id: string;
  readonly grids: readonly string[];
  readonly missingReference: string;
}
type GeoidCase = ReferencedCase | MissingCase;

const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/frames/geoids.json", import.meta.url),
    "utf8",
  ),
) as { cases: GeoidCase[] };

const base = `${join(framesDataDirectory(), "proj")}/`;
const grids = `${join(framesDataDirectory(), "grids")}/`;

let shared: Promise<{ P: ProjApi; source: GridSource }> | undefined;
const setup = () =>
  (shared ??= (async () => ({
    P: await loadProj({ base, grids: [] }),
    source: await gridSource({ base: grids }),
  }))());

const RADIANS_PER_DEGREE = Math.PI / 180;
const A = EARTH.ellipsoid.maximumRadius;

/** Metres east and north between two longitude, latitude pairs (degrees), near enough at the mm level. */
function horizontalMetres(
  lon: number,
  lat: number,
  lon0: number,
  lat0: number,
): [number, number] {
  return [
    (lon - lon0) * RADIANS_PER_DEGREE * A * Math.cos(lat0 * RADIANS_PER_DEGREE),
    (lat - lat0) * RADIANS_PER_DEGREE * A,
  ];
}

/**
 * The box around a case's points (degrees), no wider: PROJ keeps only the
 * operations whose area of use contains it, and OS's Lizard point (TP02) is
 * 0.03° inside OSTN15 and OSGM15's.
 */
function areaOf(points: readonly GeoidPoint[]): AreaOfInterest {
  const lat = points.map((p) => p.input[0]!);
  const lon = points.map((p) => p.input[1]!);
  return {
    west: Math.min(...lon),
    south: Math.min(...lat),
    east: Math.max(...lon),
    north: Math.max(...lat),
  };
}

/** Why a case can't run: a grid not in the store, and the setup that fetches it. */
function absentGrid(names: readonly string[]): string | undefined {
  const absent = names.find((name) => !existsSync(join(grids, name)));
  if (absent === undefined) {
    return undefined;
  }
  const set =
    (Object.keys(GRID_SETS) as (keyof typeof GRID_SETS)[]).find(
      (key) =>
        GRID_SETS[key] !== "*" &&
        (GRID_SETS[key] as readonly string[]).includes(absent),
    ) ?? "all";
  return `${absent} not in the store; run npm run setup -- --grids ${set}`;
}

const sameGrids = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

async function geographic(c: ReferencedCase): Promise<void> {
  const { P, source } = await setup();
  await loadGrids(P, source, c.grids);
  const target = c.target!;
  const areaOfInterest = areaOf(c.points);
  // PROJ's own operation that reads exactly this case's grids: proj.db may
  // rank another grid first (JPGEO2024 ahead of GSIGEO2011 for JGD2011).
  const candidate = listOperations(P, c.crs, target, { areaOfInterest }).find(
    (o) => !o.ballpark && sameGrids(o.gridsNeeded, c.grids),
  );
  expect(
    candidate,
    `${c.id}: PROJ's operation reading ${c.grids.join(", ")}`,
  ).toBeDefined();
  expect(candidate?.pipeline).not.toBe("");
  const operation = resolveOperation(P, c.crs, crsDefinition(target), {
    pipeline: candidate!.pipeline,
  });
  expect(sameGrids(operation.grids, c.grids)).toBe(true);
  let worst = 0;
  for (const [i, { input, expected }] of c.points.entries()) {
    const [lat, lon] = input as [number, number];
    const n = expected[0]!;
    const at = `${c.id} point ${i} (${lat}, ${lon})`;
    // Forward: H = 0 lands at h = N, with latitude and longitude unchanged.
    const forward = operation.forward([lon, lat, 0]);
    const [east, north] = horizontalMetres(forward[0]!, forward[1]!, lon, lat);
    expect(Math.hypot(east, north), `${at}: forward moved`).toBeLessThan(
      c.precision,
    );
    expect(Math.abs(forward[2]! - n), `${at}: forward h`).toBeLessThanOrEqual(
      c.precision,
    );
    // Inverse: h = N is on the geoid, H = 0.
    const inverse = operation.inverse([lon, lat, n]);
    expect(Math.abs(inverse[2]!), `${at}: inverse H`).toBeLessThanOrEqual(
      c.precision,
    );
    worst = Math.max(worst, Math.abs(forward[2]! - n), Math.abs(inverse[2]!));
  }
  console.log(
    `${c.id}: worst ${worst.toExponential(2)} m within ${c.precision} m (${c.points.length} points)`,
  );
}

async function projected(c: ReferencedCase): Promise<void> {
  const { P, source } = await setup();
  const frame = await EngineeringFrame.load(
    {
      name: c.id,
      body: EARTH,
      crs: c.crs,
      areaOfInterest: areaOf(c.points),
    },
    { proj: P, grids: source },
  );
  expect(frame.operation.ballpark).toBe(false);
  expect(
    sameGrids(frame.operation.grids, c.grids),
    `${c.id} reads ${frame.operation.grids.join(", ")}`,
  ).toBe(true);
  const metres = frame.units.metersPerUnit;
  const heightMetres = frame.metersPerHeightUnit;
  let worst = 0;
  for (const { id, input, expected } of c.points) {
    const [lat, lon, h] = input as [number, number, number];
    const at = `${c.id} ${id ?? ""}`;
    // Forward: the published design point lands on the published position.
    const geodetic = frame.toGeodetic(expected);
    const [east, north] = horizontalMetres(
      geodetic.longitude / RADIANS_PER_DEGREE,
      geodetic.latitude / RADIANS_PER_DEGREE,
      lon,
      lat,
    );
    const forward = [east, north, geodetic.height - h];
    // Inverse: the published position lands on the published design point.
    const design = frame.fromBodyFixed(
      EARTH.ellipsoid.cartographicToCartesian(
        {
          longitude: lon * RADIANS_PER_DEGREE,
          latitude: lat * RADIANS_PER_DEGREE,
          height: h,
        },
        new Float64Array(3),
      ),
    );
    const inverse = [
      (design[0]! - expected[0]!) * metres,
      (design[1]! - expected[1]!) * metres,
      (design[2]! - expected[2]!) * heightMetres,
    ];
    for (const [axis, value] of ["E", "N", "H"].entries()) {
      expect(
        Math.abs(forward[axis]!),
        `${at}: forward ${value}`,
      ).toBeLessThanOrEqual(c.precision);
      expect(
        Math.abs(inverse[axis]!),
        `${at}: inverse ${value}`,
      ).toBeLessThanOrEqual(c.precision);
    }
    worst = Math.max(worst, ...forward.map(Math.abs), ...inverse.map(Math.abs));
  }
  console.log(
    `${c.id}: worst ${worst.toExponential(2)} m within ${c.precision} m (${c.points.length} points)`,
  );
}

describe("geoids against their publishers' test values", () => {
  it("the fixture's referenced cases each state a source, date and precision", () => {
    for (const c of fixture.cases) {
      if ("missingReference" in c) {
        expect(c.missingReference.length, c.id).toBeGreaterThan(0);
        continue;
      }
      expect(c.source.url, c.id).toMatch(/^https:\/\//);
      expect(c.source.retrieved, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.source.publisher.length, c.id).toBeGreaterThan(0);
      expect(c.precision, c.id).toBeGreaterThan(0);
      expect(c.points.length, c.id).toBeGreaterThan(0);
      expect(c.kind === "geographic", c.id).toBe(c.target !== undefined);
    }
  });

  for (const c of fixture.cases) {
    if ("missingReference" in c) {
      it.skip(`${c.id}: no published reference: ${c.missingReference}`, () => {});
      continue;
    }
    const absent = absentGrid(c.grids);
    if (absent !== undefined) {
      it.skip(`${c.id}: ${absent}`, () => {});
      continue;
    }
    it(`${c.id} (${c.source.publisher}): forward and inverse within ${c.precision} m`, () =>
      c.kind === "geographic" ? geographic(c) : projected(c));
  }
});

// The portfolio's Japanese grid (Task 9's call): for JGD2011 (vertical)
// height proj.db 9.7.1 ranks JPGEO2024 (0.03 m) ahead of GSIGEO2011 (no
// stated accuracy), so EngineeringFrame.load fetches JPGEO2024, and
// GRID_SETS.portfolio holds it.
describe("Japan: JGD2011 (vertical) height", () => {
  const JPGEO2024 = "jp_gsi_jpgeo2024.tif";
  const TOKYO: CrsRef = {
    format: "wkid",
    authority: "EPSG",
    wkid: 6677,
    vcsWkid: 6695,
  };
  it.skipIf(absentGrid([JPGEO2024]) !== undefined)(
    "load fetches JPGEO2024 for Japan Plane Rectangular CS IX + JGD2011 (vertical), the portfolio's grid",
    async () => {
      const { P, source } = await setup();
      expect(GRID_SETS.portfolio).toContain(JPGEO2024);
      const frame = await EngineeringFrame.load(
        {
          name: "Tokyo",
          body: EARTH,
          crs: TOKYO,
          areaOfInterest: {
            west: 139.6,
            south: 35.6,
            east: 139.9,
            north: 35.8,
          },
        },
        { proj: P, grids: source },
      );
      expect(frame.operation.grids).toEqual([JPGEO2024]);
      expect(frame.operation.accuracy).toBe(1.03);
    },
  );
});
