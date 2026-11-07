// Measuring in design terms against real PROJ and the frames data store (plan
// 4a task 6). `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import {
  Alignment,
  type AlignmentDefinition,
} from "../../src/engineering/alignment.ts";
import {
  EngineeringFrame,
  designPoint,
  type SiteTransform,
} from "../../src/engineering/EngineeringFrame.ts";
import {
  formatPipeline,
  parsePipeline,
} from "../../src/engineering/pipeline.ts";
import { gridSource, loadProj } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { framePoint } from "../../src/frames/local.ts";
import { measure, measureSpan } from "../../src/measure/measure.ts";
import { EARTH, MOON } from "../../src/scene/Body.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

const dir = framesDataDirectory();
const base = `${join(dir, "proj")}/`;
const gridStore = `${join(dir, "grids")}/`;
const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
const leap = LeapSeconds.builtIn();
const frames = createFrames({
  leapSeconds: leap,
  eop: EarthOrientationParameters.fromCelestrakCsv(
    readFileSync(join(dir, "EOP-All.csv"), "utf8"),
  ),
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
} satisfies FrameData);
const instant = Instant.fromUtc(Date.UTC(2026, 2, 1), leap);

const US_FOOT = 0.3048006096012192;
const site: SiteTransform = {
  origin: [6_000_000, 2_100_000, 0],
  rotation: (12.5 * Math.PI) / 180,
  scale: 1.0000375,
};
// A tangent, a left arc and a tangent, with a grade, in site-grid coordinates.
const road: AlignmentDefinition = {
  name: "Road",
  start: [1000, 1000],
  startAzimuth: Math.PI / 2,
  startStation: 100,
  horizontal: [
    { kind: "line", length: 8000 },
    { kind: "arc", length: 3000, radius: 8000 },
    { kind: "line", length: 20000 },
  ],
  vertical: {
    startStation: 100,
    startElevation: 20,
    segments: [{ kind: "grade", length: 31000, grade: 0.01 }],
  },
};

async function frame(extra: { allowBallpark?: boolean } = {}) {
  return EngineeringFrame.create(
    {
      name: "CA3",
      body: EARTH,
      crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
      site,
      alignments: [road],
      ...extra,
    },
    await loadProj({ base }),
  );
}

describe("measure in design terms", () => {
  it("gives CAD distances that relate to the true distance by the combined factor and site scale", async () => {
    const f = await frame();
    const a = designPoint(f, [2000, 1000, 25]);
    const b = designPoint(f, [12_000, 1000, 25]);
    const m = measure(a, b, instant, frames);
    const d = m.design!;
    expect(d.unitName).toMatch(/foot/i);
    expect(d.metersPerUnit).toBeCloseTo(US_FOOT, 15);
    expect(Math.abs(d.distance - 10_000)).toBeLessThan(1e-9);
    expect(Math.abs(d.horizontalDistance - 10_000)).toBeLessThan(1e-9);
    expect(Array.from(d.delta)).toEqual([10_000, 0, 0]);
    expect(d.siteScale).toBe(1.0000375);
    expect(d.combinedFactor.mean).toBeCloseTo(
      (d.combinedFactor.a + d.combinedFactor.b) / 2,
      15,
    );
    expect(d.combinedFactor.a).toBeGreaterThan(0.999);
    expect(d.combinedFactor.a).toBeLessThan(1.001);
    // The site's rotation is 12.5 degrees; convergence is the CRS's, finite.
    expect(Number.isFinite(d.convergence.a)).toBe(true);
    const predicted =
      (d.distance * d.siteScale * d.metersPerUnit) / d.combinedFactor.mean;
    const error = Math.abs(m.distance - predicted);
    console.log(
      `design ${d.distance} ftUS, true ${m.distance} m, predicted ${predicted} m, error ${error.toExponential(2)} m`,
    );
    expect(error).toBeLessThan(0.01);
    // The existing results still work for design points.
    expect(m.overBody).toBeDefined();
  });

  it("converts the vertical difference in horizontal units for the 3D distance", async () => {
    const f = await frame();
    const m = measure(
      designPoint(f, [2000, 1000, 0]),
      designPoint(f, [2000 + 300, 1000 + 400, 1200]),
      instant,
      frames,
    );
    expect(m.design!.horizontalDistance).toBeCloseTo(500, 9);
    // ftUS everywhere, so U needs no conversion: 3D = sqrt(500^2 + 1200^2).
    expect(m.design!.distance).toBeCloseTo(1300, 9);
  });

  it("gives alignment stations and offsets as the Alignment does", async () => {
    const f = await frame();
    const a = designPoint(f, [2000, 1030, 25]);
    const b = designPoint(f, [11_000, 1000 - 60, 25]);
    const m = measure(a, b, instant, frames, { alignment: "Road" });
    const alignment = new Alignment(road);
    const ea = alignment.stationOffset([2000, 1030]);
    const eb = alignment.stationOffset([11_000, 940]);
    expect(m.alignment!.name).toBe("Road");
    expect(m.alignment!.a.station).toBe(ea.station);
    expect(m.alignment!.a.offset).toBe(ea.offset);
    expect(m.alignment!.a.elevation).toBe(ea.elevation);
    expect(m.alignment!.b).toEqual(eb);
    expect(m.alignment!.a.station).toBeCloseTo(1100, 6);
    // Left of an east-bound line is north: negative offset to the right.
    expect(m.alignment!.a.offset).toBeCloseTo(-30, 6);
    expect(m.alignment!.a.elevation).toBeCloseTo(30, 6);
    expect(measure(a, b, instant, frames).alignment).toBeUndefined();
  });

  it("throws for an unknown alignment name, naming it, and beyond the alignment's ends", async () => {
    const f = await frame();
    const a = designPoint(f, [2000, 1000, 0]);
    const b = designPoint(f, [3000, 1000, 0]);
    expect(() => measure(a, b, instant, frames, { alignment: "Nope" })).toThrow(
      /Nope/,
    );
    const before = designPoint(f, [500, 1000, 0]);
    expect(() =>
      measure(before, b, instant, frames, { alignment: "Road" }),
    ).toThrow(/outside the alignment/);
    const span = measureSpan(before, b, instant, instant, 1, frames, {
      alignment: "Road",
    });
    expect(span[0]!.error).toMatch(/outside the alignment/);
  });

  it("adds a projection accuracy term per design end", async () => {
    const f = await frame();
    const m = measure(
      designPoint(f, [2000, 1000, 0]),
      designPoint(f, [3000, 1000, 0]),
      instant,
      frames,
    );
    const terms = m.accuracy.terms.filter((t) => t.source === "projection");
    expect(terms).toHaveLength(2);
    for (const t of terms) {
      expect(t.meters).toBe(f.operation.accuracy);
      expect(t.note).toContain("CA3");
      expect(t.note).toContain("us_noaa_g2018u0.tif");
    }
    expect(terms[0]!.note).toContain("End a");
    expect(terms[1]!.note).toContain("End b");
  });

  it("leaves meters undefined when the operation's accuracy is unknown (a pinned pipeline)", async () => {
    const P = await loadProj({ base });
    const known = await frame();
    expect(known.operation.accuracy).toBeDefined();
    const f = EngineeringFrame.create(
      {
        name: "pinned",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
        pipeline: known.operation.pipeline,
      },
      P,
    );
    expect(f.operation.accuracy).toBeUndefined();
    expect(f.operation.ballpark).toBe(false);
    const m = measure(
      designPoint(f, [6_561_666, 1_640_416, 0]),
      designPoint(f, [6_561_866, 1_640_416, 0]),
      instant,
      frames,
    );
    const terms = m.accuracy.terms.filter((t) => t.source === "projection");
    expect(terms).toHaveLength(2);
    for (const t of terms) {
      expect(t.meters).toBeUndefined();
      expect(t.note).toMatch(/accuracy is not known/);
      expect(t.note).not.toMatch(/ballpark/);
    }
    expect(m.accuracy.meters).toBeUndefined();
  });

  it("marks a real ballpark operation: undefined meters and a ballpark note", async () => {
    const P = await loadProj({ base });
    const crs = {
      format: "wkid",
      authority: "EPSG",
      wkid: 32611,
      vcsWkid: 6360,
    } as const;
    // PROJ offers only a ballpark operation for this pair: NAVD88's grids
    // (GEOID18 and earlier) are defined on NAD83 datums, not on WGS 84.
    expect(() =>
      EngineeringFrame.create({ name: "x", body: EARTH, crs }, P),
    ).toThrow(/only a ballpark/);
    const f = EngineeringFrame.create(
      { name: "ballpark", body: EARTH, crs, allowBallpark: true },
      P,
    );
    expect(f.operation.ballpark).toBe(true);
    const m = measure(
      designPoint(f, [500_000, 4_000_000, 0]),
      designPoint(f, [500_300, 4_000_400, 0]),
      instant,
      frames,
    );
    const terms = m.accuracy.terms.filter((t) => t.source === "projection");
    expect(terms).toHaveLength(2);
    for (const t of terms) {
      expect(t.meters).toBeUndefined();
      expect(t.note).toMatch(/ballpark/);
    }
    expect(m.accuracy.meters).toBeUndefined();
  });

  it("matches measuring the same body-fixed points directly", async () => {
    const f = await frame();
    const da = [2000, 1000, 25];
    const db = [9000, 3000, 40];
    const m = measure(designPoint(f, da), designPoint(f, db), instant, frames);
    const r = measure(
      framePoint(frames.itrf, f.toBodyFixed(da)),
      framePoint(frames.itrf, f.toBodyFixed(db)),
      instant,
      frames,
    );
    expect(Math.abs(m.distance - r.distance)).toBeLessThan(1e-9);
    expect(m.deltaFrame).toBe(r.deltaFrame);
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(m.delta[i]! - r.delta[i]!)).toBeLessThan(1e-9);
    }
    expect(
      Math.abs(m.signal!.downlink.range - r.signal!.downlink.range),
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(m.signal!.uplink.range - r.signal!.uplink.range),
    ).toBeLessThan(1e-9);
    expect(m.lineOfSight).toEqual(r.lineOfSight);
    expect(Math.abs(m.overBody!.distance - r.overBody!.distance)).toBeLessThan(
      1e-9,
    );
    const bodyTerms = (x: typeof m) =>
      x.accuracy.terms.filter((t) => t.source !== "projection");
    expect(bodyTerms(m)).toEqual(bodyTerms(r));
  });

  it("converts a differing vertical unit in the 3D distance (metre horizontal, ftUS vertical)", async () => {
    const P = await loadProj({ base });
    const f = EngineeringFrame.create(
      {
        name: "UTM11 + NAVD88 ftUS",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 32611, vcsWkid: 6360 },
        allowBallpark: true,
      },
      P,
    );
    expect(f.units.metersPerUnit).toBe(1);
    expect(f.metersPerHeightUnit).toBeCloseTo(US_FOOT, 15);
    const m = measure(
      designPoint(f, [500_000, 4_000_000, 0]),
      designPoint(f, [500_300, 4_000_400, 1000]),
      instant,
      frames,
    );
    const d = m.design!;
    const vertical = (1000 * f.metersPerHeightUnit) / f.units.metersPerUnit;
    expect(d.horizontalDistance).toBeCloseTo(500, 9);
    expect(Math.abs(d.distance - Math.hypot(300, 400, vertical))).toBeLessThan(
      1e-9,
    );
    // The naive value (feet taken as metres) is far off.
    expect(Math.abs(d.distance - Math.hypot(300, 400, 1000))).toBeGreaterThan(
      100,
    );
    expect(Array.from(d.delta)).toEqual([300, 400, 1000]);
  });

  it("measures a design point to a plain ITRF point without a design result", async () => {
    const f = await frame();
    const a = designPoint(f, [2000, 1000, 0]);
    const p = framePoint(frames.itrf, f.toBodyFixed([3000, 1000, 0]));
    const m = measure(a, p, instant, frames);
    expect(m.design).toBeUndefined();
    expect(m.alignment).toBeUndefined();
    expect(m.distance).toBeGreaterThan(0);
    // Only the design end carries a projection term.
    expect(
      m.accuracy.terms.filter((t) => t.source === "projection"),
    ).toHaveLength(1);
  });

  it("rejects a non-finite design coordinate", async () => {
    const f = await frame();
    expect(() =>
      measure(
        designPoint(f, [NaN, 0, 0]),
        designPoint(f, [0, 0, 0]),
        instant,
        frames,
      ),
    ).toThrow(/non-finite/);
  });
});

describe("how a design point was obtained (plan 4b Task 8)", () => {
  it("adds a pick term of the pick's tolerance, and a snap term named for its kind", async () => {
    const f = await frame();
    const picked = designPoint(f, [2000, 1000, 0], {
      how: "pick",
      tolerance: 0.02,
    });
    expect(picked.obtained).toEqual({ how: "pick", tolerance: 0.02 });
    const typed = designPoint(f, [3000, 1000, 0]);
    expect(typed.obtained).toBeUndefined();
    const m = measure(picked, typed, instant, frames, { signal: false });
    const picks = m.accuracy.terms.filter((t) => t.source === "pick");
    expect(picks).toHaveLength(1);
    expect(picks[0]!.meters).toBe(0.02);
    expect(picks[0]!.note).toMatch(/^End a: .*picked/);

    const snapped = designPoint(f, [3000, 1000, 0], {
      how: "snap",
      tolerance: 0,
      kind: "segment",
    });
    const s = measure(picked, snapped, instant, frames, { signal: false });
    const terms = s.accuracy.terms.filter((t) => t.source === "pick");
    expect(terms.map((t) => t.meters)).toEqual([0.02, 0]);
    expect(terms[1]!.note).toMatch(/^End b: .*snapped to a segment/);
  });

  it("rejects a tolerance that is negative or not finite, and a kind on a pick", async () => {
    const f = await frame();
    for (const tolerance of [-0.01, NaN, Infinity]) {
      expect(() =>
        designPoint(f, [0, 0, 0], { how: "pick", tolerance }),
      ).toThrow(/tolerance/);
    }
    expect(() =>
      designPoint(f, [0, 0, 0], { how: "pick", tolerance: 0.1, kind: "arc" }),
    ).toThrow(/kind/);
    expect(() =>
      designPoint(f, [0, 0, 0], {
        how: "click" as "pick",
        tolerance: 0.1,
      }),
    ).toThrow(/how/);
  });

  it("measure rejects a literal design point whose tolerance isn't finite", async () => {
    const f = await frame();
    const bad = {
      engineeringFrame: f,
      design: Float64Array.of(2000, 1000, 0),
      obtained: { how: "pick", tolerance: NaN },
    } as const;
    expect(() =>
      measure(bad, designPoint(f, [3000, 1000, 0]), instant, frames),
    ).toThrow(/point a.*tolerance/);
  });
});

describe("the projection term's note (amended R9)", () => {
  const CS27 = { format: "wkid", authority: "EPSG", wkid: 26741 } as const;

  it("names the better candidates PROJ skipped for missing grids, with their accuracies and grids", async () => {
    const f = EngineeringFrame.create(
      { name: "CS27", body: EARTH, crs: CS27 },
      await loadProj({ base }),
    );
    expect(f.operation.accuracy).toBe(7);
    expect(f.operation.betterCandidates.map((c) => c.accuracy)).toEqual([
      2.15, 5,
    ]);
    const m = measure(
      designPoint(f, [1_900_000, 600_000, 0]),
      designPoint(f, [1_901_000, 600_000, 0]),
      instant,
      frames,
      { signal: false },
    );
    const terms = m.accuracy.terms.filter((t) => t.source === "projection");
    expect(terms).toHaveLength(2);
    for (const t of terms) {
      expect(t.meters).toBe(7);
      expect(t.note).toMatch(
        /^End [ab]: engineering frame "CS27": PROJ operation \(no grids\)/,
      );
    }
    // Compact (fix 1): the accuracies and the grids, each grid once, no
    // operation names, and only on the first end of the shared frame.
    expect(terms[0]!.note).toContain(
      "PROJ lists 2 operations with a stated ±2.15 m and ±5 m that need us_noaa_cnhpgn.tif, us_noaa_conus.tif, not loaded",
    );
    expect(terms[0]!.note).not.toContain("NAD27 to WGS 84 (79)");
    expect(terms[1]!.note).not.toContain("PROJ lists");
    expect(terms[1]!.note).toMatch(/as end a/);
  });

  it("names a pinned pipeline's optional grid that isn't loaded", async () => {
    const P = await loadProj({ base });
    const known = await frame();
    const steps = parsePipeline(known.operation.pipeline).steps;
    const geoid = steps.findIndex((s) => s.operation === "vgridshift");
    const pinned = {
      steps: [
        ...steps.slice(0, geoid + 1),
        {
          operation: "vgridshift",
          params: { grids: "@not_a_loaded_grid.tif,@null", multiplier: "1" },
        },
        ...steps.slice(geoid + 1),
      ],
    };
    const f = EngineeringFrame.create(
      {
        name: "pinned, optional",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
        pipeline: pinned,
      },
      P,
    );
    expect(f.operation.pipeline).toBe(formatPipeline(pinned));
    expect(f.operation.optionalGrids).toEqual(["not_a_loaded_grid.tif"]);
    const m = measure(
      designPoint(f, [6_561_666, 1_640_416, 0]),
      designPoint(f, [6_561_866, 1_640_416, 0]),
      instant,
      frames,
      { signal: false },
    );
    const terms = m.accuracy.terms.filter((t) => t.source === "projection");
    expect(terms).toHaveLength(2);
    expect(terms[0]!.note).toMatch(/optional grid.*not_a_loaded_grid\.tif/);
    expect(terms[1]!.note).toMatch(/as end a/);
    // GEOID18, loaded and required, is not named as missing.
    expect(terms[0]!.note).not.toMatch(/optional grid[^;]*us_noaa_g2018u0/);
  });

  it("doesn't name a pinned pipeline's optional grid that is loaded", async () => {
    const P = await loadProj({ base });
    const known = await frame();
    const steps = parsePipeline(known.operation.pipeline).steps;
    // GEOID18 written optional: loaded, so the operation runs with it.
    const pinned = {
      steps: steps.map((s) =>
        s.operation === "vgridshift"
          ? { ...s, params: { ...s.params, grids: "@us_noaa_g2018u0.tif" } }
          : s,
      ),
    };
    const f = EngineeringFrame.create(
      {
        name: "pinned, optional loaded",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
        pipeline: pinned,
      },
      P,
    );
    expect(f.operation.optionalGrids).toEqual(["us_noaa_g2018u0.tif"]);
    expect(f.operation.missingOptionalGrids).toEqual([]);
    const m = measure(
      designPoint(f, [6_561_666, 1_640_416, 0]),
      designPoint(f, [6_561_866, 1_640_416, 0]),
      instant,
      frames,
      { signal: false },
    );
    for (const t of m.accuracy.terms.filter((x) => x.source === "projection")) {
      expect(t.note).not.toMatch(/optional grid/);
    }
  });
});

describe("the Earth: geoid fallbacks and coarser operations", () => {
  // Jakarta: EPSG:9488+9471, whose grid (INAGEOID2020v1.gtx) PROJ-data lacks
  // (Task 7).
  const JAKARTA = {
    format: "wkid",
    authority: "EPSG",
    wkid: 9488,
    vcsWkid: 9471,
  } as const;
  const jakarta = async (fallbackSigma?: number) =>
    EngineeringFrame.load(
      {
        name: "Jakarta",
        body: EARTH,
        crs: JAKARTA,
        geoidFallback: "EGM96",
        ...(fallbackSigma !== undefined && { fallbackSigma }),
      },
      {
        proj: await loadProj({ base }),
        grids: await gridSource({ base: gridStore }),
      },
    );
  const ends = [
    [704_000, 9_313_000, 5],
    [705_000, 9_313_500, 8],
  ];

  it("adds a geoidFallback term per end, not known without fallbackSigma, so the statement is not bounded", async () => {
    const f = await jakarta();
    expect(f.fallback?.model).toBe("EGM96");
    // PROJ states an accuracy for the fallback CRS's own operation.
    expect(f.operation.accuracy).toBeDefined();
    const m = measure(
      designPoint(f, ends[0]!),
      designPoint(f, ends[1]!),
      instant,
      frames,
      { signal: false },
    );
    const fallbacks = m.accuracy.terms.filter(
      (t) => t.source === "geoidFallback",
    );
    expect(fallbacks).toHaveLength(2);
    for (const t of fallbacks) {
      expect(t.meters).toBeUndefined();
      expect(t.note).toMatch(/EGM96/);
      expect(t.note).toMatch(/EPSG:9471/);
      expect(t.note).toMatch(/INAGEOID2020v1\.gtx/);
    }
    expect(m.accuracy.meters).toBeUndefined();
    // The projection term says its figure is the fallback's operation alone.
    const projection = m.accuracy.terms.filter(
      (t) => t.source === "projection",
    );
    for (const t of projection) {
      expect(t.meters).toBe(f.operation.accuracy);
    }
    // Said once per measurement: end b shares end a's frame.
    expect(projection[0]!.note).toMatch(/EGM96 fallback/);
    expect(projection[1]!.note).toMatch(/the rest as end a/);
    // One warning for the frame, not one per end.
    const codes = m.accuracy.warningCodes ?? [];
    expect(codes.filter((c) => c === "geoid-fallback")).toHaveLength(1);
    const warning = m.accuracy.warnings[codes.indexOf("geoid-fallback")]!;
    expect(warning).toMatch(/Jakarta/);
    expect(warning).toMatch(/EGM96/);
    expect(warning).toMatch(/not bounded/);
  });

  it("states fallbackSigma as the geoidFallback term, so the statement is bounded", async () => {
    const f = await jakarta(0.5);
    const m = measure(
      designPoint(f, ends[0]!),
      designPoint(f, ends[1]!),
      instant,
      frames,
      { signal: false },
    );
    const fallbacks = m.accuracy.terms.filter(
      (t) => t.source === "geoidFallback",
    );
    expect(fallbacks.map((t) => t.meters)).toEqual([0.5, 0.5]);
    expect(m.accuracy.meters).toBeDefined();
    expect(m.accuracy.meters!).toBeGreaterThan(0.5);
    const codes = m.accuracy.warningCodes ?? [];
    const warning = m.accuracy.warnings[codes.indexOf("geoid-fallback")]!;
    expect(warning).toMatch(/0\.5 m/);
  });

  it("warns coarser-operation for a frame with better candidates, naming their grids, once per frame", async () => {
    const f = EngineeringFrame.create(
      {
        name: "CS27",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 26741 },
      },
      await loadProj({ base }),
    );
    const m = measure(
      designPoint(f, [1_900_000, 600_000, 0]),
      designPoint(f, [1_901_000, 600_000, 0]),
      instant,
      frames,
      { signal: false },
    );
    const codes = m.accuracy.warningCodes ?? [];
    expect(codes.filter((c) => c === "coarser-operation")).toHaveLength(1);
    expect(codes).toHaveLength(m.accuracy.warnings.length);
    const warning = m.accuracy.warnings[codes.indexOf("coarser-operation")]!;
    expect(warning).toBe(
      'Engineering frame "CS27": PROJ lists 2 operations with a stated ±2.15 m and ±5 m that need us_noaa_cnhpgn.tif, us_noaa_conus.tif, not loaded; this frame\'s operation states ±7 m.',
    );
    // A fact, not advice (fix 1).
    expect(warning).not.toMatch(/load those/i);
    // No e-notation in a warning the page may show.
    expect(warning).not.toMatch(/\de[-+]?\d/);
    // PROJ's names for them are in the warning's detail.
    const detail = m.accuracy.warningDetails?.["coarser-operation"];
    expect(detail).toContain(
      '"Inverse of California CS27 zone I + NAD27 to NAD83 (1) + NAD83 to WGS 84 (43)" (±2.15 m)',
    );
    expect(detail).toContain(
      '"Inverse of California CS27 zone I + NAD27 to WGS 84 (79)" (±5 m)',
    );

    // A frame without better candidates doesn't warn.
    const london = EngineeringFrame.create(
      {
        name: "UTM 10N",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 32610 },
      },
      await loadProj({ base }),
    );
    expect(london.operation.betterCandidates).toEqual([]);
    const plain = measure(
      designPoint(london, [500_000, 4_000_000, 0]),
      designPoint(london, [500_100, 4_000_000, 0]),
      instant,
      frames,
      { signal: false },
    );
    expect(plain.accuracy.warningCodes ?? []).not.toContain(
      "coarser-operation",
    );
  });

  it("warns once per frame: two frames with better candidates give two warnings", async () => {
    const P = await loadProj({ base });
    const cs27 = (name: string) =>
      EngineeringFrame.create(
        {
          name,
          body: EARTH,
          crs: { format: "wkid", authority: "EPSG", wkid: 26741 },
        },
        P,
      );
    const one = cs27("CS27 one");
    const two = cs27("CS27 two");
    const m = measure(
      designPoint(one, [1_900_000, 600_000, 0]),
      designPoint(two, [1_901_000, 600_000, 0]),
      instant,
      frames,
      { signal: false },
    );
    const codes = m.accuracy.warningCodes ?? [];
    const coarser = m.accuracy.warnings.filter(
      (_, i) => codes[i] === "coarser-operation",
    );
    expect(coarser).toHaveLength(2);
    expect(coarser[0]).toMatch(/"CS27 one"/);
    expect(coarser[1]).toMatch(/"CS27 two"/);
    // Different frames: each end's note is in full.
    const projection = m.accuracy.terms.filter(
      (t) => t.source === "projection",
    );
    expect(projection[1]!.note).toMatch(/PROJ lists 2 operations/);
    const detail = m.accuracy.warningDetails?.["coarser-operation"] ?? "";
    expect(detail).toMatch(/"CS27 one".*"CS27 two"/);
  });

  it("warns coarser-operation for the plan-4a California frame (NADCON5 candidates, Task 6)", async () => {
    const f = await frame();
    expect(f.operation.betterCandidates.length).toBeGreaterThan(0);
    const m = measure(
      designPoint(f, [2000, 1000, 0]),
      designPoint(f, [3000, 1000, 0]),
      instant,
      frames,
      { signal: false },
    );
    const codes = m.accuracy.warningCodes ?? [];
    const warning = m.accuracy.warnings[codes.indexOf("coarser-operation")]!;
    // Under fix 1's rule both NADCON5 candidates still count: PROJ states
    // ±1.14 m for each, smaller than GEOID18's ±2.015 m. Their grids, once.
    expect(warning).toBe(
      'Engineering frame "CA3": PROJ lists 2 operations with a stated ±1.14 m each that need us_noaa_g1999u05.tif, us_noaa_nadcon5_nad83_2007_nad83_2011_conus.tif, us_noaa_nadcon5_nad83_fbn_nad83_2007_conus.tif, us_noaa_nadcon5_nad83_harn_nad83_fbn_conus.tif, us_noaa_geoid03_conus.tif, not loaded; this frame\'s operation states ±2.015 m.',
    );
    const projection = m.accuracy.terms.filter(
      (t) => t.source === "projection",
    );
    expect(projection[0]!.note.length).toBeLessThan(400);
    expect(projection[1]!.note.length).toBeLessThan(120);
    // The statement is still bounded: the operation used states its accuracy.
    expect(m.accuracy.meters).toBeDefined();
  });
});

describe("the Moon (plan 4a's carried-forward item)", () => {
  const south = { format: "wkid", authority: "IAU_2015", wkid: 30135 } as const;
  const moonFrames = async () => {
    const P = await loadProj({ base });
    return {
      polar: EngineeringFrame.create(
        { name: "Moon south", body: MOON, crs: south },
        P,
      ),
      site: EngineeringFrame.create(
        {
          name: "Moon south site",
          body: MOON,
          crs: south,
          site: { origin: [0, 0, 0], rotation: Math.PI / 6, scale: 1 },
        },
        P,
      ),
    };
  };

  it("measures between design points in two Moon frames: no design result, the body-fixed distance, a projection term per end", async () => {
    const { polar, site } = await moonFrames();
    const da = [12_000, -8_000, 50];
    const db = [3_000, 4_000, -20];
    const a = designPoint(polar, da);
    const b = designPoint(site, db);
    const m = measure(a, b, instant, frames);
    expect(m.design).toBeUndefined();
    const pa = polar.toBodyFixed(da);
    const pb = site.toBodyFixed(db);
    const direct = Math.hypot(
      pa[0]! - pb[0]!,
      pa[1]! - pb[1]!,
      pa[2]! - pb[2]!,
    );
    expect(Math.abs(m.distance - direct)).toBeLessThan(1e-9);
    const projection = m.accuracy.terms.filter(
      (t) => t.source === "projection",
    );
    expect(projection).toHaveLength(2);
    expect(projection[0]!.note).toMatch(/^End a: .*Moon south"/);
    expect(projection[1]!.note).toMatch(/^End b: .*Moon south site"/);
    expect(m.overBody?.body).toBe(MOON);

    const quiet = measure(a, b, instant, frames, { signal: false });
    expect(quiet.signal).toBeUndefined();
    expect(quiet.lineOfSight).toBeUndefined();
  });

  it("gives the design distance in one Moon frame", async () => {
    const { site } = await moonFrames();
    const da = [12_000, -8_000, 50];
    const db = [3_000, 4_000, -20];
    const m = measure(
      designPoint(site, da),
      designPoint(site, db),
      instant,
      frames,
      { signal: false },
    );
    const expected = Math.hypot(
      db[0]! - da[0]!,
      db[1]! - da[1]!,
      db[2]! - da[2]!,
    );
    expect(Math.abs(m.design!.distance - expected)).toBeLessThan(1e-9);
    expect(m.design!.siteScale).toBe(1);
    // Two quantities: the stereographic grid is not true length (its scale
    // at the pole is 1, rising away from it), so the body-fixed distance differs.
    expect(Math.abs(m.distance - m.design!.distance)).toBeGreaterThan(1e-6);
  });
});
