// The design globe's corridor as data (plan 4b Task 12): its alignment, its
// profile, its cross-section, the bridge and the station ticks, all in US
// survey feet.
import { describe, expect, it } from "vitest";
import {
  ANCHOR_STATION,
  BRIDGE,
  CORRIDOR_ALIGNMENT,
  CORRIDOR_CRS,
  CROSS_SECTION,
  STRUCTURES,
  TICKS,
  VIADUCTS,
  corridorFrame,
  sectionSurface,
} from "../examples/design-globe/corridor.ts";
import {
  Alignment,
  type HorizontalElement,
} from "../src/engineering/alignment.ts";
import { EARTH } from "../src/scene/Body.ts";

const alignment = new Alignment(CORRIDOR_ALIGNMENT);
const elements = CORRIDOR_ALIGNMENT.horizontal;

/** Each element's start and end station. */
const ranges = (() => {
  let station = CORRIDOR_ALIGNMENT.startStation;
  return elements.map((element) => {
    const from = station;
    station += element.length;
    return { element, from, to: station };
  });
})();

/** The curvature (1/R, signed) at an element's start and end. */
function curvatures(element: HorizontalElement): [number, number] {
  switch (element.kind) {
    case "line":
      return [0, 0];
    case "arc":
      return [1 / element.radius, 1 / element.radius];
    case "spiral":
      return [1 / element.startRadius, 1 / element.endRadius];
  }
}

describe("the corridor's alignment", () => {
  it("is 164,042 ftUS long and ends at station 174,042", () => {
    expect(alignment.name).toBe("Mainline");
    expect(alignment.startStation).toBe(10_000);
    expect(alignment.length).toBe(164_042);
    expect(alignment.endStation).toBe(174_042);
    expect(CORRIDOR_ALIGNMENT.start).toEqual([6_080_000, 2_110_000]);
    expect(CORRIDOR_ALIGNMENT.startAzimuth).toBeCloseTo(
      (100 * Math.PI) / 180,
      15,
    );
    expect(elements.map((e) => e.kind)).toEqual([
      "line",
      "spiral",
      "arc",
      "spiral",
      "line",
      "spiral",
      "arc",
      "spiral",
      "line",
      "spiral",
      "arc",
      "spiral",
      "line",
    ]);
  });

  it("has continuous curvature at every join (each spiral meets its neighbours' radii)", () => {
    for (let i = 1; i < elements.length; i++) {
      const [, before] = curvatures(elements[i - 1]!);
      const [after] = curvatures(elements[i]!);
      expect(after, `join ${i}`).toBe(before);
    }
    // Three curves: +5,000 (left), −3,000 (right), +8,000 (left).
    expect(
      elements.filter((e) => e.kind === "arc").map((e) => e.radius),
    ).toEqual([5_000, -3_000, 8_000]);
  });

  it("is continuous in position and azimuth at every join", () => {
    const delta = 1e-3;
    for (const { to: join } of ranges.slice(0, -1)) {
      const a = alignment.pointAt(join - delta);
      const b = alignment.pointAt(join + delta);
      // Over 2δ the chord equals the arc to well under 1e-9 at R ≥ 3,000.
      expect(
        Math.abs(Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!) - 2 * delta),
        `position at ${join}`,
      ).toBeLessThan(1e-7);
      // The azimuth turns at most 2δ/R = 6.7e-7 rad across the join.
      expect(
        Math.abs(
          alignment.azimuthAt(join + delta) - alignment.azimuthAt(join - delta),
        ),
        `azimuth at ${join}`,
      ).toBeLessThan(1e-6);
    }
  });

  it("puts the anchor at the middle of the alignment", () => {
    expect(ANCHOR_STATION).toBe(92_021);
    expect(ANCHOR_STATION).toBe(
      (alignment.startStation + alignment.endStation) / 2,
    );
  });
});

describe("the corridor's vertical profile", () => {
  const profile = CORRIDOR_ALIGNMENT.vertical!;

  it("runs from station 10,000, tied in to the ground at 316.71 ftUS, to the alignment's end", () => {
    expect(profile.startStation).toBe(10_000);
    expect(profile.startElevation).toBe(316.71);
    const length = profile.segments.reduce((sum, s) => sum + s.length, 0);
    expect(profile.startStation + length).toBe(alignment.endStation);
    expect(alignment.elevationAt(10_000)).toBeCloseTo(316.71, 9);
  });

  it("keeps its grades within 6% and its vertical curves at AASHTO's least K for 65 mph", () => {
    for (const s of profile.segments) {
      const grades =
        s.kind === "grade" ? [s.grade] : [s.startGrade, s.endGrade];
      for (const g of grades) {
        expect(Math.abs(g)).toBeLessThanOrEqual(0.06);
      }
      if (s.kind === "parabola") {
        // K: the curve's length per percent of grade change; crest 193, sag 157.
        const a = (s.endGrade - s.startGrade) * 100;
        const least = a < 0 ? 193 : 157;
        expect(s.length / Math.abs(a), `curve at ${s.length}`).toBeGreaterThan(
          least - 0.5,
        );
        expect(s.length).toBeGreaterThanOrEqual(200);
      }
    }
  });

  it("has continuous grades: each parabola joins its neighbours' grades", () => {
    const grades = profile.segments.map((s) =>
      s.kind === "grade" ? [s.grade, s.grade] : [s.startGrade, s.endGrade],
    );
    for (let i = 1; i < grades.length; i++) {
      expect(grades[i]![0], `segment ${i}`).toBe(grades[i - 1]![1]);
    }
  });
});

describe("the structures", () => {
  it("run in order of station, apart, within the alignment", () => {
    let at = alignment.startStation;
    for (const s of STRUCTURES) {
      expect(
        s.fromStation,
        `${s.kind} at ${s.fromStation}`,
      ).toBeGreaterThanOrEqual(at);
      expect(s.toStation).toBeGreaterThan(s.fromStation);
      at = s.toStation;
    }
    expect(at).toBeLessThanOrEqual(alignment.endStation);
    expect(STRUCTURES.filter((s) => s.kind === "viaduct")).toHaveLength(19);
    expect(STRUCTURES.filter((s) => s.kind === "tunnel")).toHaveLength(19);
  });

  it("give each viaduct 4×4 piers at ±20 in equal spans of about 120 between its ends", () => {
    for (const v of VIADUCTS) {
      expect(v.deckThickness).toBe(1.5);
      expect([v.piers.width, v.piers.depth]).toEqual([4, 4]);
      expect(v.piers.offsets).toEqual([-20, 20]);
      const ends = [v.fromStation, ...v.piers.stations, v.toStation];
      const span = (v.toStation - v.fromStation) / (ends.length - 1);
      expect(Math.abs(span - 120)).toBeLessThan(60);
      ends.slice(1).forEach((station, i) => {
        expect(station - ends[i]!).toBeCloseTo(span, 9);
      });
      expect(v.piers.belowProfile % 5).toBe(0);
    }
  });

  it("measure across the viaduct on the long tangent (stations 37,000 to 67,000)", () => {
    const tangent = ranges.find(
      (r) => r.from <= BRIDGE.fromStation && BRIDGE.toStation <= r.to,
    );
    expect(tangent?.element.kind).toBe("line");
    expect([tangent?.from, tangent?.to]).toEqual([37_000, 67_000]);
    expect([BRIDGE.fromStation, BRIDGE.toStation]).toEqual([43_700, 47_800]);
  });
});

describe("the cross-section", () => {
  it("is symmetric about the centreline", () => {
    const { strips, barriers } = CROSS_SECTION;
    for (const strip of strips) {
      const mirror = strips.find(
        (s) => s.from === -strip.to && s.to === -strip.from,
      );
      expect(mirror, strip.name).toBeDefined();
      expect(mirror!.kind).toBe(strip.kind);
      expect(mirror!.crossSlope).toBe(strip.crossSlope);
    }
    for (const barrier of barriers) {
      const mirror = barriers.find((b) => b.offset === -barrier.offset);
      expect(mirror, barrier.name).toBeDefined();
      expect([mirror!.baseWidth, mirror!.topWidth, mirror!.height]).toEqual([
        barrier.baseWidth,
        barrier.topWidth,
        barrier.height,
      ]);
    }
    for (let offset = 0; offset <= 41; offset += 0.25) {
      expect(sectionSurface(-offset)).toBe(sectionSurface(offset));
    }
  });

  it("has the median barrier, inner shoulders, lanes, outer shoulders and outer barriers on the right", () => {
    const right = CROSS_SECTION.strips.filter((s) => s.from >= 0);
    expect(right.map((s) => [s.kind, s.from, s.to, s.crossSlope])).toEqual([
      ["shoulder", 1, 5, -0.04],
      ["lanes", 5, 29, -0.02],
      ["shoulder", 29, 39, -0.04],
    ]);
    const median = CROSS_SECTION.barriers.find((b) => b.offset === 0)!;
    expect([median.baseWidth, median.topWidth, median.height]).toEqual([
      2, 0.5, 2.67,
    ]);
    const outer = CROSS_SECTION.barriers.find((b) => b.offset === 40)!;
    expect(outer.offset - outer.baseWidth / 2).toBe(39);
    expect(outer.offset + outer.baseWidth / 2).toBe(41);
    expect(CROSS_SECTION.barriers).toHaveLength(3);
  });

  it("falls outward from the centreline by its cross slopes", () => {
    expect(sectionSurface(0)).toBe(0);
    expect(sectionSurface(1)).toBe(0);
    expect(sectionSurface(5)).toBeCloseTo(-0.16, 12);
    expect(sectionSurface(29)).toBeCloseTo(-0.64, 12);
    expect(sectionSurface(39)).toBeCloseTo(-1.04, 12);
    // The outer barrier stands level on the shoulder's edge.
    expect(sectionSurface(41)).toBe(sectionSurface(39));
    expect(() => sectionSurface(41.5)).toThrow(RangeError);
  });

  it("puts the station ticks on the outer shoulder", () => {
    expect(TICKS.interval).toBe(100);
    expect(TICKS.offsets).toEqual([-35, 35]);
    expect([TICKS.along, TICKS.across]).toEqual([0.5, 4]);
    const shoulder = CROSS_SECTION.strips.find(
      (s) => s.kind === "shoulder" && s.from === 29,
    )!;
    expect(35 - TICKS.across / 2).toBeGreaterThan(shoulder.from);
    expect(35 + TICKS.across / 2).toBeLessThan(shoulder.to);
  });
});

describe("corridorFrame", () => {
  it("is the Earth, EPSG:6420+6360 and the mainline, with an area of interest", () => {
    expect(CORRIDOR_CRS).toEqual({
      format: "wkid",
      authority: "EPSG",
      wkid: 6420,
      vcsWkid: 6360,
    });
    const frame = corridorFrame();
    expect(frame.body).toBe(EARTH);
    expect(frame.crs).toBe(CORRIDOR_CRS);
    expect(frame.alignments).toEqual([CORRIDOR_ALIGNMENT]);
    const area = frame.areaOfInterest!;
    expect(area.west).toBeLessThan(area.east);
    expect(area.south).toBeLessThan(area.north);
  });
});
