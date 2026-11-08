// Global geoids (plan 4b Task 21): each country's geoid and height system
// against its publisher's own test values, from test/fixtures/frames/
// geoids.json (Task 9; R10: never PROJ's or pyproj's values). The grids
// come from the PROJ-data catalog (`loadGridSource`: the browser's
// /proj-grids/, Node's store grids/), each verified before PROJ sees it.
//
//  - A geographic case (GA, GSI, NGS and NGA publish latitude and longitude
//    -> N) pins PROJ's own operation from the compound CRS to its geographic
//    3D CRS that reads exactly the case's grids: H = 0 must land at h = N,
//    and h = N at H = 0.
//  - A projected case (OS's OSTN15 and OSGM15, NSGI's RD and NAP) is an
//    engineering frame (`EngineeringFrame.load`, which loads the best
//    operation's grids): the published design point must land on the
//    published position, and back.
//  - A case with `missingReference` compares nothing: it is shown with its
//    reason, never judged, so it is never a pass.
//
// The grids stay loaded in the run's PROJ, so these cases run last
// (tests.ts). A case whose PROJ choice could change with them pins its
// operation (bound-crss's registry check).
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
  loadGrids,
} from "../../../../src/engineering/proj.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import fixture from "../../../../test/fixtures/frames/geoids.json";
import { cited } from "../references.ts";
import {
  type ResultBase,
  type StressCase,
  type StressContext,
  type StressResult,
  fmt,
  messageOf,
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
  source: GridSource,
  base: ResultBase,
): Promise<StressResult> {
  const P = proj(ctx);
  await loadGrids(P, source, c.grids);
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
  source: GridSource,
  base: ResultBase,
): Promise<StressResult> {
  const frame = await EngineeringFrame.load(
    {
      name: c.id,
      body: EARTH,
      crs: c.crs,
      areaOfInterest: areaOf(c.points),
    },
    { proj: proj(ctx), grids: source },
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

function referencedCase(c: ReferencedGeoidCase): StressCase {
  // The case's one citation, its results' source (F28): the publisher's
  // document, whose values are in geoids.json.
  cited(`geoid-${c.id}`);
  const count = c.points.length;
  return stressCase(
    `${GROUP}.${c.id}`,
    GROUP,
    `${c.source.publisher}'s published ${c.kind === "geographic" ? "geoid heights" : "coordinates"} at ${count} point${count === 1 ? "" : "s"}, through ${gridList(c.grids)}: forward and inverse within ${fmt(c.precision)} m, the publisher's stated precision`,
    ["proj"],
    async (ctx, base) => {
      let source: GridSource;
      try {
        if (ctx.loadGridSource === undefined) {
          throw new Error("this run has no PROJ-data catalog");
        }
        source = await ctx.loadGridSource();
        // The grids, verified against the catalog; a projected case's frame
        // loads them again, which is then a no-op.
        await loadGrids(proj(ctx), source, c.grids);
      } catch (error) {
        return [
          {
            ...base,
            pass: false,
            missing: ["proj"],
            detail: `Needs ${gridList(c.grids)} from the PROJ-data catalog, which did not load (${messageOf(error)}). Run \`npm run setup -- --grids portfolio,tests\` and restart the dev server.`,
          },
        ];
      }
      return [
        c.kind === "geographic"
          ? await geographic(ctx, c, source, base)
          : await projected(ctx, c, source, base),
      ];
    },
  );
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
