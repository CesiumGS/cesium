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
import { loadProj } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { framePoint } from "../../src/frames/local.ts";
import { measure, measureSpan } from "../../src/measure/measure.ts";
import { EARTH } from "../../src/scene/Body.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

const dir = framesDataDirectory();
const base = `${join(dir, "proj")}/`;
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
    // PROJ offers only a ballpark operation for this pair (no vertical datum
    // operation is known for UTM 11N heights in ftUS here).
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
