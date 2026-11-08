// Global geoids (plan 4b Task 21): each country's geoid and height system
// against its publisher's own test values, from test/fixtures/frames/
// geoids.json (Task 9; R10: never PROJ's or pyproj's values). The grids
// come from the PROJ-data catalog, each verified before PROJ sees it, as the
// "grids" need (`loadCatalogGrids("geoids")`: the browser's /proj-grids/,
// with byte progress; Node's store grids/). EGM2008's 80.6 MB is opt-in
// (`optIn`): "Run all" shows its row as not run, with a button.
//
//  - A geographic case (GA, GSI, NGS and NGA publish latitude and longitude
//    -> N) pins PROJ's own operation from the compound CRS to its geographic
//    3D CRS that reads exactly the case's grids: H = 0 must land at h = N,
//    and h = N at H = 0.
//  - A projected case (OS's OSTN15 and OSGM15, NSGI's RD and NAP) is an
//    engineering frame on the loaded grids: the published design point must
//    land on the published position, and back.
//  - A case with `missingReference` compares nothing: it is shown with its
//    reason, never judged, so it is never a pass.
//
// The grids stay loaded in the run's PROJ, so a second run, or a case run
// after these, sees them. What keeps the catalog's results the same either
// way is that no other case's operation depends on them (bound-crss's
// registry check pins the gridless one; a data test runs the catalog in
// reverse and compares); these cases run last only as a second guard.
import {
  type AreaOfInterest,
  type CrsRef,
  crsDefinition,
  listOperations,
  resolveOperation,
} from "../../../../src/engineering/crs.ts";
import { EngineeringFrame } from "../../../../src/engineering/EngineeringFrame.ts";
import {
  type GridSource,
  type ProjApi,
  loadGrids,
} from "../../../../src/engineering/proj.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import fixture from "../../../../test/fixtures/frames/geoids.json";
import { cited } from "../references.ts";
import {
  type CatalogGridSet,
  GEOID,
  type ResultBase,
  type StressCase,
  type StressContext,
  type StressResult,
  fmt,
  powersOfTen,
} from "../runner.ts";
import {
  fingerprintOf,
  operationFingerprint,
  proj,
  stressCase,
} from "../shared.ts";

interface GeoidSource {
  readonly url: string;
  readonly retrieved: string;
  readonly publisher: string;
}

interface GeoidPoint {
  /** The publisher's point name, where it gives one. */
  readonly id?: string;
  /** Geographic: [latitude, longitude] (degrees); projected: [latitude, longitude, ellipsoidal height]. */
  readonly input: readonly number[];
  /** Geographic: [N] (m); projected: [easting, northing, height] in the CRS's units. */
  readonly expected: readonly number[];
}

export interface ReferencedGeoidCase {
  readonly id: string;
  readonly crs: CrsRef;
  /** Geographic cases: the geographic 3D CRS the published N is on. */
  readonly target?: CrsRef;
  readonly kind: "geographic" | "projected";
  readonly grids: readonly string[];
  readonly source: GeoidSource;
  /** The publisher's stated precision, metres. */
  readonly precision: number;
  readonly note?: string;
  readonly points: readonly GeoidPoint[];
}

export interface MissingGeoidCase {
  readonly id: string;
  readonly grids: readonly string[];
  readonly missingReference: string;
}

export type GeoidCase = ReferencedGeoidCase | MissingGeoidCase;

/** test/fixtures/frames/geoids.json. */
export interface GeoidsFixture {
  readonly cases: readonly GeoidCase[];
}

const GROUP = "global-geoids";

const CASES = (fixture as unknown as GeoidsFixture).cases;

/** EGM2008's grid: 80,585,622 bytes (the catalog's), so its case is opt-in. */
const EGM2008_GRID = "us_nga_egm08_25.tif";
const EGM2008_BYTES = 80_585_622;

/**
 * The catalog grids each set loads (`CatalogGridSet`): "geoids", every
 * referenced case's grids but EGM2008 and GEOID18 (about 19 MB; GEOID18
 * comes with the "geoid" need, as for every other California case);
 * "egm2008", its one grid.
 */
export const CATALOG_GRID_SETS: Readonly<
  Record<CatalogGridSet, readonly string[]>
> = {
  geoids: [
    ...new Set(
      CASES.flatMap((c) =>
        "missingReference" in c
          ? []
          : c.grids.filter((g) => g !== EGM2008_GRID && g !== GEOID),
      ),
    ),
  ],
  egm2008: [EGM2008_GRID],
};

/**
 * A `DataContext.loadCatalogGrids` from a PROJ and a grid source (Node's
 * data tests: the store's grids/). The browser's host adds byte progress.
 */
export const catalogGridsFrom =
  (proj: () => Promise<ProjApi>, source: () => Promise<GridSource>) =>
  async (set: CatalogGridSet): Promise<void> => {
    await loadGrids(await proj(), await source(), CATALOG_GRID_SETS[set]);
  };

const DEGREE = Math.PI / 180;
const A = EARTH.ellipsoid.maximumRadius;

/** Metres east and north between two longitude, latitude pairs (degrees), near enough at the millimetre level. */
function horizontalMetres(
  lon: number,
  lat: number,
  lon0: number,
  lat0: number,
): [number, number] {
  return [
    (lon - lon0) * DEGREE * A * Math.cos(lat0 * DEGREE),
    (lat - lat0) * DEGREE * A,
  ];
}

/**
 * The box around a case's points (degrees), no wider: PROJ keeps only the
 * operations whose area of use contains it (OS's Lizard point is 0.03°
 * inside OSTN15 and OSGM15's).
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

/**
 * The fixture's note on a case (how the values were read, and why they may
 * differ from PROJ's), as the page shows numbers: "1e-8" as "10⁻⁸".
 */
const noted = (c: ReferencedGeoidCase): string =>
  c.note === undefined
    ? ""
    : `. ${c.note.replace(/\d+(?:\.\d+)?e[-+]?\d+/g, (n) => powersOfTen(n))}`;

const sameGrids = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

const gridList = (grids: readonly string[]) => grids.join(" and ");

/** The worst deviation and where, as the cases collect them. */
interface Worst {
  value: number;
  at: string;
}
const worse = (w: Worst, value: number, at: string) => {
  if (!(Math.abs(value) <= Math.abs(w.value))) {
    w.value = value;
    w.at = at;
  }
};

/** Geographic: forward H = 0 to h = N, and inverse h = N to H = 0, at each published point. */
async function geographic(
  ctx: StressContext,
  c: ReferencedGeoidCase,
  base: ResultBase,
): Promise<StressResult> {
  const P = proj(ctx);
  const areaOfInterest = areaOf(c.points);
  // PROJ's own operation that reads exactly this case's grids: proj.db may
  // rank another grid first (JPGEO2024 ahead of GSIGEO2011 for JGD2011).
  const candidate = listOperations(P, c.crs, c.target!, {
    areaOfInterest,
  }).find((o) => !o.ballpark && sameGrids(o.gridsNeeded, c.grids));
  if (candidate === undefined) {
    return {
      ...base,
      pass: false,
      error: `PROJ lists no operation from ${crsDefinition(c.crs)} to ${crsDefinition(c.target!)} that reads ${gridList(c.grids)}`,
    };
  }
  const operation = resolveOperation(P, c.crs, crsDefinition(c.target!), {
    pipeline: candidate.pipeline,
  });
  const worst: Worst = { value: 0, at: "" };
  const forwards: Float64Array[] = [];
  for (const [i, { id, input, expected }] of c.points.entries()) {
    const [lat, lon] = input as [number, number];
    const n = expected[0]!;
    const at = id ?? `point ${i + 1} (${lat}°, ${lon}°)`;
    const forward = operation.forward([lon, lat, 0]);
    forwards.push(
      EARTH.ellipsoid.cartographicToCartesian(
        {
          longitude: forward[0]! * DEGREE,
          latitude: forward[1]! * DEGREE,
          height: forward[2]!,
        },
        new Float64Array(3),
      ),
    );
    const [east, north] = horizontalMetres(forward[0]!, forward[1]!, lon, lat);
    worse(worst, Math.hypot(east, north), `${at}, moved horizontally`);
    worse(worst, forward[2]! - n, `${at}, N`);
    worse(worst, operation.inverse([lon, lat, n])[2]!, `${at}, H back`);
  }
  return {
    ...base,
    pass: sameGrids(operation.grids, c.grids),
    value: worst.value,
    tolerance: c.precision,
    unit: "m",
    detail: `worst ${fmt(worst.value)} m (${worst.at}) over ${c.points.length} points, through ${operation.pipeline}${noted(c)}`,
    fingerprint: operationFingerprint(ctx, operation, forwards),
  };
}

/** Projected: each published design point lands on its published position, and back. */
async function projected(
  ctx: StressContext,
  c: ReferencedGeoidCase,
  base: ResultBase,
): Promise<StressResult> {
  // The "grids" need loaded the case's grids, so the frame's best operation
  // reads them.
  const frame = EngineeringFrame.create(
    {
      name: c.id,
      body: EARTH,
      crs: c.crs,
      areaOfInterest: areaOf(c.points),
    },
    proj(ctx),
  );
  const metres = frame.units.metersPerUnit;
  const heightMetres = frame.metersPerHeightUnit;
  const worst: Worst = { value: 0, at: "" };
  for (const [i, { id, input, expected }] of c.points.entries()) {
    const [lat, lon, h] = input as [number, number, number];
    const at = id ?? `point ${i + 1}`;
    // Forward: the published design point lands on the published position.
    const geodetic = frame.toGeodetic(expected);
    const [east, north] = horizontalMetres(
      geodetic.longitude / DEGREE,
      geodetic.latitude / DEGREE,
      lon,
      lat,
    );
    // Inverse: the published position lands on the published design point.
    const design = frame.fromBodyFixed(
      EARTH.ellipsoid.cartographicToCartesian(
        { longitude: lon * DEGREE, latitude: lat * DEGREE, height: h },
        new Float64Array(3),
      ),
    );
    const deviations: [number, string][] = [
      [east, "forward east"],
      [north, "forward north"],
      [geodetic.height - h, "forward height"],
      [(design[0]! - expected[0]!) * metres, "inverse easting"],
      [(design[1]! - expected[1]!) * metres, "inverse northing"],
      [(design[2]! - expected[2]!) * heightMetres, "inverse height"],
    ];
    for (const [value, what] of deviations) {
      worse(worst, value, `${at}, ${what}`);
    }
  }
  const op = frame.operation;
  return {
    ...base,
    pass: !op.ballpark && sameGrids(op.grids, c.grids),
    value: worst.value,
    tolerance: c.precision,
    unit: "m",
    detail: `worst ${fmt(worst.value)} m (${worst.at}) over ${c.points.length} points, through ${op.pipeline}${noted(c)}`,
    fingerprint: fingerprintOf(
      ctx,
      frame,
      c.points.map((p) => p.expected),
    ),
  };
}

/** "published by NGA, retrieved from the Internet Archive" from the fixture's "NGA, through the Internet Archive". */
function credit(publisher: string): string {
  const [by, via] = publisher.split(", through ");
  return via === undefined
    ? `published by ${by}`
    : `published by ${by}, retrieved from ${via}`;
}

function referencedCase(c: ReferencedGeoidCase): StressCase {
  // The case's one citation, its results' source (F28): the publisher's
  // document, whose values are in geoids.json.
  cited(`geoid-${c.id}`);
  const count = c.points.length;
  const egm2008 = c.grids.includes(EGM2008_GRID);
  const made = stressCase(
    `${GROUP}.${c.id}`,
    GROUP,
    `${c.kind === "geographic" ? "Geoid heights" : "Coordinates"} ${credit(c.source.publisher)}, at ${count} point${count === 1 ? "" : "s"}, through ${gridList(c.grids)}: forward and inverse within ${fmt(c.precision)} m, the publisher's stated precision`,
    // EGM2008 needs only its own grid, and only once opted in (`optIn`);
    // GEOID18 is the "geoid" need's.
    egm2008
      ? ["proj"]
      : c.grids.includes(GEOID)
        ? ["proj", "geoid"]
        : ["proj", "grids"],
    async (ctx, base) => [
      c.kind === "geographic"
        ? await geographic(ctx, c, base)
        : await projected(ctx, c, base),
    ],
  );
  return egm2008
    ? { ...made, optIn: { need: "egm2008", bytes: EGM2008_BYTES } }
    : made;
}

function missingCase(c: MissingGeoidCase): StressCase {
  return stressCase(
    `${GROUP}.${c.id}`,
    GROUP,
    `${gridList(c.grids)}: no published reference, so nothing is compared (shown, not judged)`,
    [],
    async (_ctx, base) => [
      {
        ...base,
        pass: true,
        displayOnly: true,
        detail: `No published reference: ${c.missingReference}`,
        accuracyNote: "none stated: no published reference to compare with",
      },
    ],
  );
}

export const globalGeoidsCases: readonly StressCase[] = CASES.map((c) =>
  "missingReference" in c ? missingCase(c) : referencedCase(c),
);
