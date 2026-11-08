// Plan 4b Task 20: the design globe's check panel (examples/design-globe/
// checksView.ts): checks.ts's rows grouped by what the page shows, worded
// once, with what isn't shown said as such and never as a pass; the
// convergence compass's needles (compass.ts).
import { describe, expect, it } from "vitest";
import type { Answers } from "../examples/design-globe/answers.ts";
import type { ShownValues } from "../examples/design-globe/checks.ts";
import { amount, checksView } from "../examples/design-globe/checksView.ts";
import {
  compassNeedles,
  convergenceShort,
  convergenceText,
} from "../examples/design-globe/compass.ts";
import { behindEarth } from "../examples/design-globe/measureLabels.ts";

const MPU = 1200 / 3937;

/** What checkRows reads of answers.json: two pairs, the marker and the mark. */
function answers(): Answers {
  const point = (station: number, e: number) => ({
    station,
    offset: 0,
    design: [e, 2_110_000, 120] as const,
  });
  return {
    frame: { unitName: "US survey foot", metersPerUnit: MPU },
    points: [
      point(10_000, 6_080_000),
      point(20_000, 6_089_848.077530122),
      point(170_000, 6_160_821.67),
      point(30_000, 6_090_000),
      point(40_000, 6_091_000),
    ],
    pairs: [
      {
        id: "last-tangent",
        label: "10,000 ftUS on the last tangent",
        from: 0,
        to: 1,
        designDistance: 10_001.999800040241,
        horizontalDistance: 10_000.000000000253,
        trueDistance: 3_048.8484955078147,
      },
      {
        id: "curve",
        label: "Across the 5,000 ft curve",
        from: 3,
        to: 4,
        designDistance: 1000,
        horizontalDistance: 1000,
        trueDistance: 304.8,
      },
      {
        id: "end-to-end",
        label: "End to end",
        from: 0,
        to: 4,
        designDistance: 11_000,
        horizontalDistance: 11_000,
        trueDistance: 3352.8,
      },
    ],
    marker: {
      station: 170_000,
      point: 2,
      design: [6_160_821.67, 2_110_000, 120],
      separation: 30.586,
    },
    mark: {
      pid: "HS5109",
      name: "GOLD CREEK",
      publishedSpc: { easting: 6_146_924.9, northing: 2_075_186.11 },
      nearestDesign: [6_146_710.878865431, 2_074_732.9107658817, 910],
    },
  } as unknown as Answers;
}

/** What the page shows when settled rigid: the opener pair, the marker, the mark. */
function shown(over: Partial<ShownValues> = {}): ShownValues {
  const a = answers();
  return {
    points: new Map([
      [
        0,
        {
          design: Float64Array.from(a.points[0]!.design),
          station: 10_000,
          offset: 0,
          basis: "exact" as const,
        },
      ],
      [
        1,
        {
          design: Float64Array.from(a.points[1]!.design),
          station: 20_000,
          offset: 0,
          basis: "exact" as const,
        },
      ],
      [
        2,
        {
          design: Float64Array.from(a.marker.design),
          basis: "exact" as const,
        },
      ],
    ]),
    pairs: new Map([
      [
        "last-tangent",
        {
          designDistance: 10_001.999800040241,
          horizontalDistance: 10_000.000000000253,
          trueDistance: 3_048.848495508,
          basis: "exact" as const,
        },
      ],
    ]),
    marker: { separation: 30.586, mode: "rigid", basis: "exact" },
    mark: { easting: 6_146_924.898, northing: 2_075_186.105, offset: 501.188 },
    ...over,
  };
}

describe("design globe checks view", () => {
  it("waits for the answers, saying what it waits for", () => {
    const v = checksView(undefined, undefined);
    expect(v.state).toBe("waiting");
    expect(v.summary).toMatch(/answers\.json/);
    expect(v.groups).toEqual([]);
  });

  it("groups the rows by what the page shows, the marker and pair first, the datasheet after", () => {
    const v = checksView(answers(), shown());
    expect(v.state).toBe("ready");
    expect(v.groups.map((g) => g.id)).toEqual([
      "marker",
      "pair:last-tangent",
      "mark",
      "pair:curve",
      // It shares an end with the shown pair, but isn't shown itself.
      "pair:end-to-end",
    ]);
    const pair = v.groups[1]!;
    // Its three distances, then its two ends' five values each.
    expect(pair.rows).toHaveLength(13);
    expect(pair.title).toBe("10,000 ftUS on the last tangent");
    // Its rows don't repeat the group's title.
    expect(pair.rows[0]!.label).toBe("Design distance (3D)");
    expect(pair.rows[3]!.label).toMatch(/^Sta\. 100\+00\.000/);
    expect(v.groups[0]!.rows[0]!.label).toBe("Drawn to true, rigid");
    const mark = v.groups[2]!;
    expect(mark.rows.every((r) => r.kind === "published")).toBe(true);
    expect(mark.rows[0]!.kindText).toBe("NGS datasheet");
    expect(pair.rows[0]!.kindText).toBe("Exact answer");
  });

  it("counts passes and says what isn't shown as not shown, never as a pass", () => {
    const v = checksView(answers(), shown());
    expect(v.tone).toBe("pass");
    // The unshown pairs: three rows each, and the marker point's station and offset.
    expect(v.counts.notShown).toBe(8);
    expect(v.counts.failed).toBe(0);
    const curve = v.groups.find((g) => g.id === "pair:curve")!;
    expect(curve.rows.every((r) => r.status === "not-shown")).toBe(true);
    expect(curve.rows.every((r) => r.statusText === "Not shown")).toBe(true);
    expect(curve.measurable).toBe("curve");
    expect(v.summary).toMatch(/^\d+ values checked, all within tolerance/);
    expect(v.summary).toMatch(/8 answers not shown on the page now/);
  });

  it("words a row's numbers once: shown against expected, the difference within the tolerance", () => {
    const v = checksView(answers(), shown());
    const easting = v.groups
      .find((g) => g.id === "mark")!
      .rows.find((r) => r.id === "mark.easting")!;
    expect(easting.values).toBe(
      "6,146,924.898 shown; NGS publishes 6,146,924.900 ftUS",
    );
    expect(easting.difference).toMatch(
      /^0\.002 ftUS apart, within 0\.0066 ftUS \(the datasheet's precision\)$/,
    );
    const design = v.groups[1]!.rows[0]!;
    expect(design.difference).toMatch(/within 0\.000001 ftUS \(exact\)$/);
  });

  it("writes small amounts without e-notation: SI prefixes for metres, decimals otherwise", () => {
    expect(amount(3.5e-9, "m")).toBe("3.5 nm");
    expect(amount(3e-7, "m")).toBe("0.3 µm");
    expect(amount(-0.0066, "m")).toBe("0.0066 m");
    expect(amount(1e-6, "ftUS")).toBe("0.000001 ftUS");
    expect(amount(2.3e-10, "ftUS")).toBe("under 0.000001 ftUS");
    expect(amount(0, "ftUS")).toBe("0 ftUS");
    expect(amount(1.25, "m")).toBe("1.250 m");
  });

  it("puts a failure first in the summary and the tone", () => {
    const v = checksView(
      answers(),
      shown({
        mark: {
          easting: 6_146_925.2,
          northing: 2_075_186.105,
          offset: 501.188,
        },
      }),
    );
    expect(v.tone).toBe("fail");
    expect(v.counts.failed).toBe(1);
    expect(v.summary).toMatch(/^1 of \d+ failed/);
    expect(v.summary).toMatch(/zone 3 easting/);
  });

  it("says the viewer's own measurement has no answer to check, not that it passed", () => {
    const off = Float64Array.from([6_100_000.5, 2_110_000.25, 121]);
    const v = checksView(answers(), shown(), { a: off, b: off });
    expect(v.user).toMatch(/not answer points/);
    expect(v.user).toMatch(/not shown/);
    // Its ends are the answers' unshown pair: checked under it.
    const a = answers();
    const linked = checksView(answers(), shown(), {
      a: Float64Array.from(a.points[3]!.design),
      b: Float64Array.from(a.points[4]!.design),
    });
    expect(linked.user).toMatch(/Across the 5,000 ft curve/);
    expect(checksView(answers(), shown()).user).toBeUndefined();
    // On another site: the answers' points are the corridor's.
    const london = checksView(answers(), shown(), {
      a: Float64Array.from(a.points[3]!.design),
      b: Float64Array.from(a.points[4]!.design),
      site: "london",
    });
    expect(london.user).toMatch(/corridor's/);
    expect(london.user).toMatch(/not shown/);
  });

  it("refuses nothing quietly: a failure in a pair's end shows in that pair's group", () => {
    const s = shown();
    s.points.set(0, {
      ...s.points.get(0)!,
      station: 10_000.01,
    });
    const v = checksView(answers(), s);
    const pair = v.groups.find((g) => g.id === "pair:last-tangent")!;
    expect(pair.failed).toBe(1);
    expect(pair.rows.find((r) => r.status === "fail")!.label).toMatch(
      /station/,
    );
  });
});

describe("design globe convergence compass", () => {
  it("points each needle along its projected direction, screen y down", () => {
    const n = compassNeedles([100, 100], [100, 60], [110, 60]);
    expect(n).toBeDefined();
    // True north straight up the screen: 0°; grid north to its right.
    expect(n!.trueNorth).toBeCloseTo(0, 9);
    expect(n!.gridNorth).toBeCloseTo((Math.atan2(10, 40) * 180) / Math.PI, 9);
  });

  it("draws nothing where north is end-on to the view", () => {
    expect(compassNeedles([100, 100], [100.2, 100], [100, 100.3])).toBe(
      undefined,
    );
  });

  it("says the convergence in words, east or west, and as an angle", () => {
    const west = convergenceText(-0.01532);
    expect(west).toMatch(/^Grid north is 0\.878° west of true north/);
    expect(west).toMatch(/0°52′/);
    expect(convergenceText(0.002)).toMatch(/east of true north/);
    // The compass's own label, short.
    expect(convergenceShort(-0.0148)).toBe("Grid north 0.848° W");
    expect(convergenceShort(0.002)).toBe("Grid north 0.115° E");
  });
});

describe("design globe labels: what the Earth hides (Task 20 fix 1, page I1)", () => {
  const R = 6_370_000;
  const at = (lat: number, lon: number, h: number) => {
    const r = R + h;
    return [
      r * Math.cos(lat) * Math.cos(lon),
      r * Math.cos(lat) * Math.sin(lon),
      r * Math.sin(lat),
    ];
  };
  it("sees a point above the camera's height nearby (the tour's lifted shots)", () => {
    const cam = at(0.66, -2.13, 110);
    const up = at(0.66, -2.13 + 1e-5, 140);
    expect(behindEarth(cam, up)).toBe(false);
  });
  it("sees a point at the same height 30 km off", () => {
    expect(
      behindEarth(at(0.66, -2.13, 150), at(0.66, -2.13 + 0.006, 150)),
    ).toBe(false);
  });
  it("hides a point beyond the horizon", () => {
    expect(behindEarth(at(0.66, -2.13, 150), at(0.66, -2.13 + 0.1, 150))).toBe(
      true,
    );
    expect(behindEarth(at(0, 0, 150), at(0, Math.PI, 150))).toBe(true);
  });
});
