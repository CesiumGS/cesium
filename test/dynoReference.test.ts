// Reference images and the sweep view (CS-395): a sweep point's settled
// capture against its reference point's (bench/suite/reference.mjs), the
// noise floor from repeated reference captures, the summary's metrics,
// and the sweep view's model (bench/suite/views/sweepModel.ts). Images are
// tiny RGBA arrays the tests make; nothing is read from disk.
import { describe, expect, it } from "vitest";
import { compact, lineChart } from "../bench/suite/charts.mjs";
import type { Summary } from "../bench/suite/data.ts";
import {
  compareSweep,
  cropRect,
  differenceWords,
  linearLuminance,
  noiseFloor,
  percent,
  pixelDifference,
  referenceIndex,
  regionsOf,
  shotName,
  verdict,
  withinNoise,
  type Region,
  type Shot,
} from "../bench/suite/reference.mjs";
import { summarizeRun } from "../bench/suite/report.mjs";
import { readSweep, type SweepRecord } from "../bench/suite/settings.mjs";
import {
  ALL,
  arrange,
  defaultLayout,
  metricGroups,
  moveDimension,
  noiseSummary,
  pointVerdict,
  verdictNote,
  pointWords,
  sweepModelOf,
} from "../bench/suite/views/sweepModel.ts";

const W = 8;
const H = 4;

/** A W × H gray image (8-bit), with some pixels set to other grays. */
function image(base: number, changes: Array<[number, number, number]> = []) {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    px.set([base, base, base, 255], i * 4);
  }
  for (const [x, y, v] of changes) {
    px.set([v, v, v, 255], (y * W + x) * 4);
  }
  return px;
}

describe("pixel difference", () => {
  it("counts pixels whose linear luminance moves by more than 0.1", () => {
    // 128 → 200 is a change of about 0.36 in linear luminance; 128 → 133
    // about 0.01, under the threshold.
    expect(
      linearLuminance(200, 200, 200) - linearLuminance(128, 128, 128),
    ).toBeGreaterThan(0.1);
    expect(
      linearLuminance(133, 133, 133) - linearLuminance(128, 128, 128),
    ).toBeLessThan(0.1);
    const a = image(128);
    const b = image(128, [
      [0, 0, 200],
      [1, 0, 200],
      [7, 3, 200],
      [4, 2, 133],
    ]);
    const d = pixelDifference(a, b, W, H);
    expect(d.pixels).toBe(32);
    expect(d.share).toBe(3 / 32);
    expect(d.mean).toBeGreaterThan(0);
    expect(pixelDifference(a, a, W, H)).toEqual({
      share: 0,
      mean: 0,
      pixels: 32,
    });
  });

  it("measures a crop alone", () => {
    const a = image(128);
    const b = image(128, [
      [0, 0, 255],
      [6, 3, 255],
    ]);
    // The right half, bottom half: only (6, 3) is inside.
    const rect = cropRect([0.5, 0.5, 1, 1], W, H);
    expect(rect).toEqual({ x0: 4, y0: 2, x1: 8, y1: 4 });
    expect(pixelDifference(a, b, W, H, rect).share).toBe(1 / 8);
  });

  it("clamps a crop to the image and keeps at least one pixel", () => {
    expect(cropRect([-1, -1, 2, 2], W, H)).toEqual({
      x0: 0,
      y0: 0,
      x1: 8,
      y1: 4,
    });
    expect(cropRect([0.5, 0.5, 0.5, 0.5], W, H)).toEqual({
      x0: 4,
      y0: 2,
      x1: 5,
      y1: 3,
    });
    expect(() => pixelDifference(image(0), new Uint8Array(4), W, H)).toThrow(
      /expected 8×4/,
    );
  });

  it("names a scene's regions: the whole image, then its crops", () => {
    expect(regionsOf({ crop: { cliff: [0.32, 0.18, 0.7, 0.62] } })).toEqual([
      { name: "whole" },
      { name: "cliff", box: [0.32, 0.18, 0.7, 0.62] },
    ]);
    expect(regionsOf(undefined)).toEqual([{ name: "whole" }]);
  });
});

describe("the noise floor", () => {
  it("is the largest difference between two captures of one reference", () => {
    const floor = noiseFloor([
      {
        regions: {
          whole: { share: 0.01, mean: 0.002, flip: 0.01, flipP95: 0.05 },
        },
      },
      {
        regions: {
          whole: { share: 0.03, mean: 0.001, flip: 0.02, flipP95: 0.04 },
        },
      },
    ]);
    expect(floor).toEqual({
      pairs: 2,
      regions: {
        whole: { share: 0.03, mean: 0.002, flip: 0.02, flipP95: 0.05 },
      },
    });
    expect(noiseFloor([])).toBeUndefined();
  });

  it("has no FLIP floor when no pair has a finite FLIP", () => {
    const floor = noiseFloor([
      { regions: { whole: { share: 0.01, mean: 0.002, flip: NaN } } },
      { regions: { whole: { share: 0.02, mean: 0.001 } } },
    ])!;
    expect(floor.regions.whole).toEqual({ share: 0.02, mean: 0.002 });
    expect(
      withinNoise({ share: 0, mean: 0, flip: 0 }, floor.regions.whole, "flip"),
    ).toBeUndefined();
  });

  it("says within noise, a share of pixels, or that there is no floor", () => {
    const floor = { share: 0.02, mean: 0.01 };
    expect(withinNoise({ share: 0.02, mean: 0 }, floor)).toBe(true);
    expect(withinNoise({ share: 0.041, mean: 0 }, floor)).toBe(false);
    expect(withinNoise({ share: 0.041, mean: 0 }, undefined)).toBeUndefined();
    const v = (within: boolean | undefined, more = {}) => ({
      within,
      pairs: 3,
      captures: 3,
      expected: 3,
      ...more,
    });
    expect(differenceWords({ share: 0.015, mean: 0 }, v(true))).toBe(
      "within noise (3 pairs)",
    );
    expect(
      differenceWords({ share: 0.015, mean: 0 }, v(true, { pooled: true })),
    ).toBe("within noise (3 pairs, pooled)");
    expect(differenceWords({ share: 0.041, mean: 0 }, v(false))).toBe(
      "4.1% of pixels",
    );
    expect(
      differenceWords(
        { share: 0.041, mean: 0 },
        v(undefined, { pairs: 0, captures: 1, expected: 1 }),
      ),
    ).toBe("4.1% of pixels (reference captured once)");
    expect(
      differenceWords(
        { share: 0.041, mean: 0 },
        v(undefined, { pairs: 0, captures: 1, expected: 3 }),
      ),
    ).toBe("4.1% of pixels (reference repeats failed: 1 of 3 captures)");
    expect(differenceWords(undefined, v(true), { reference: true })).toBe(
      "reference",
    );
    expect(
      differenceWords(undefined, undefined, { mismatch: "sizes differ" }),
    ).toBe("not compared (sizes differ)");
    expect(percent(0.0004)).toBe("under 0.1%");
    expect(percent(0.25)).toBe("25%");
  });
});

// A three-axis sweep: param.x × view.lodExponent × view.shadows, the
// reference at view.lodExponent 1, three captures of each reference point.
const AXES = [
  { id: "param.x", values: [4, 10] },
  { id: "view.lodExponent", values: [0.5, 1] },
  { id: "view.shadows", values: [true, false] },
];
const E = "2.0@test";
const configOf = (c: Record<string, unknown>) =>
  `${E}+param.x=${c["param.x"]}+lodExponent=${c["view.lodExponent"]}+shadows=${c["view.shadows"]}`;
function threeAxisSweep(reps = 3): SweepRecord {
  const points = [];
  for (const x of AXES[0]!.values) {
    for (const a of AXES[1]!.values) {
      for (const sh of AXES[2]!.values) {
        const coords = {
          "param.x": x,
          "view.lodExponent": a,
          "view.shadows": sh,
        };
        points.push({
          coords,
          configs: [configOf(coords)],
          ...(a === 1 ? { reference: true as const } : {}),
        });
      }
    }
  }
  return {
    axes: AXES,
    reference: { id: "view.lodExponent", value: 1, reps },
    engines: [E],
    points,
  };
}

/** A fake comparer: pixel difference of the shots' tiny images. */
const compare = async (test: unknown, ref: unknown, regions: Region[]) => ({
  regions: Object.fromEntries(
    regions.map((r) => {
      const d = pixelDifference(
        test as Uint8ClampedArray,
        ref as Uint8ClampedArray,
        W,
        H,
        cropRect(r.box, W, H),
      );
      return [r.name, { share: d.share, mean: d.mean, flip: d.mean }];
    }),
  ),
  heatmap: "aGVhdA==",
});

/**
 * The sweep's captures: the references repeat with one pixel of noise
 * between captures; at ×4 α 0.5 matches its reference but for that much
 * noise, at ×10 α 0.5 eight pixels change (a quarter of the image).
 */
function shotsOf(sweep: SweepRecord, reps: number) {
  const shots = [];
  for (const p of sweep.points) {
    const config = p.configs[0]!;
    const base = {
      scene: "vex-x10-zermatt",
      scenario: "cold-orbit",
      config,
      moment: "end",
    };
    if (p.reference) {
      for (let r = 0; r < reps; r++) {
        shots.push({
          ...base,
          repeat: r,
          png: image(128, r ? [[r, 0, 220]] : []),
        });
      }
    } else if (p.coords["param.x"] === 4) {
      shots.push({ ...base, repeat: 0, png: image(128, [[5, 1, 220]]) });
    } else {
      shots.push({
        ...base,
        repeat: 0,
        png: image(
          128,
          [0, 1, 2, 3, 4, 5, 6, 7].map(
            (x) => [x, 2, 230] as [number, number, number],
          ),
        ),
      });
    }
  }
  return shots;
}

const scenes = {
  "vex-x10-zermatt": { crop: { cliff: [0, 0.5, 1, 1] as number[] } },
};
const saved: string[] = [];
const io = {
  save: async (name: string) => {
    saved.push(name);
    return name;
  },
  image: (s: Shot) => `${shotName({ ...s, moment: s.moment ?? "end" })}.jpg`,
  encode: async () => "anBlZw==",
};

describe("comparing a sweep with its reference", () => {
  it("matches each point with the reference of the same other coordinates", () => {
    const sweep = threeAxisSweep();
    const at = referenceIndex(sweep);
    sweep.points.forEach((p, i) => {
      if (p.reference) {
        expect(at[i]).toBeUndefined();
        return;
      }
      const ref = sweep.points[at[i]!]!;
      expect(ref.reference).toBe(true);
      expect(ref.coords).toEqual({ ...p.coords, "view.lodExponent": 1 });
    });
  });

  it("matches a reference outside the grid by every coordinate", () => {
    const sweep: SweepRecord = {
      axes: [{ id: "view.lodExponent", values: [0.5, 1] }],
      reference: { id: "view.shadows", value: false, reps: 1, outside: true },
      engines: [E],
      points: [
        { coords: { "view.lodExponent": 0.5 }, configs: ["a"] },
        { coords: { "view.lodExponent": 1 }, configs: ["b"] },
        {
          coords: { "view.lodExponent": 0.5, "view.shadows": false },
          configs: ["c"],
          reference: true,
        },
        {
          coords: { "view.lodExponent": 1, "view.shadows": false },
          configs: ["d"],
          reference: true,
        },
      ],
    };
    expect(referenceIndex(sweep)).toEqual([2, 3, undefined, undefined]);
  });

  it("gives the noise floor, and a point within noise says so", async () => {
    const sweep = threeAxisSweep(3);
    const record = (await compareSweep({
      shots: shotsOf(sweep, 3),
      sweep,
      scenes,
      compare,
      ...io,
    }))!;
    // Four reference points, three captures each: three pairs each, a
    // floor each (not one pooled over all four).
    const [floor] = record.floors;
    expect(floor).toMatchObject({ references: 4, withFloor: 4, reps: 3 });
    expect(record.references).toHaveLength(4);
    for (const r of record.references!) {
      expect(r).toMatchObject({ captures: 3, expected: 3, pairs: 3 });
      expect(r.regions!.whole!.share).toBe(2 / 32);
    }
    // Two captures differ by at most two pixels of 32 (1 and 2 changed).
    expect(floor!.regionNames).toEqual(["whole", "cliff"]);
    expect(record.repeats).toHaveLength(8);
    const near = record.points.find(
      (p) =>
        p.config ===
        configOf({
          "param.x": 4,
          "view.lodExponent": 0.5,
          "view.shadows": true,
        }),
    )!;
    expect(near.against).toBe(
      configOf({ "param.x": 4, "view.lodExponent": 1, "view.shadows": true }),
    );
    expect(near.within).toEqual({ whole: true, cliff: true });
    expect(
      pointWords(record, "vex-x10-zermatt", "cold-orbit", near.config),
    ).toBe("within noise (3 pairs)");
    const far = record.points.find(
      (p) =>
        p.config ===
        configOf({
          "param.x": 10,
          "view.lodExponent": 0.5,
          "view.shadows": false,
        }),
    )!;
    expect(far.regions!.whole!.share).toBe(8 / 32);
    // The changed row lies in the crop (its bottom half): half its pixels.
    expect(far.regions!.cliff!.share).toBe(8 / 16);
    expect(far.within).toEqual({ whole: false, cliff: false });
    expect(
      pointWords(record, "vex-x10-zermatt", "cold-orbit", far.config),
    ).toBe("25% of pixels");
    expect(far.heatmap).toMatch(/\.ref\.flip\.png$/);
    expect(saved.some((n) => /\.r2\.jpg$/.test(n))).toBe(true);
  });

  it("can't call a point within noise without repeated references", async () => {
    const sweep = threeAxisSweep(1);
    const record = (await compareSweep({
      shots: shotsOf(sweep, 1),
      sweep,
      scenes,
      compare,
      ...io,
    }))!;
    expect(record.floors[0]).toMatchObject({ references: 4, withFloor: 0 });
    expect(record.references!.every((r) => !r.regions && r.pairs === 0)).toBe(
      true,
    );
    const near = record.points.find((p) => !p.reference)!;
    expect(near.within).toEqual({ whole: null, cliff: null });
    expect(
      pointWords(record, "vex-x10-zermatt", "cold-orbit", near.config),
    ).toBe("3.1% of pixels (reference captured once)");
  });

  it("is nothing for a sweep without a reference", async () => {
    const sweep = { ...threeAxisSweep(), reference: undefined };
    expect(
      await compareSweep({ shots: [], sweep, scenes, compare, ...io }),
    ).toBeUndefined();
  });
});

/** A run's results with the three-axis sweep and its reference record. */
async function sweepRun() {
  const sweep = threeAxisSweep(3);
  const reference = await compareSweep({
    shots: shotsOf(sweep, 3),
    sweep,
    scenes,
    compare,
    ...io,
  });
  const runs = sweep.points.flatMap((p) =>
    [0, 1].map((rep) => ({
      scene: "vex-x10-zermatt",
      sceneTitle: "Vertical exaggeration ×10, Zermatt close",
      group: "D",
      scenario: "cold-orbit",
      config: p.configs[0]!,
      engine: "2.0",
      rep,
      metrics: {
        status: "ok",
        // ×10 at α 1 runs away: not settled at the cap.
        settled: !(
          p.coords["param.x"] === 10 && p.coords["view.lodExponent"] === 1
        ),
        dev: {
          "tiles.terrain":
            100 *
            Number(p.coords["param.x"]) *
            Number(p.coords["view.lodExponent"]),
        },
      },
    })),
  );
  return {
    date: "2026-11-22T12:00:00Z",
    commit: "0123456789",
    environment: {},
    sweep,
    reference,
    runs,
  };
}

describe("the summary", () => {
  it("records each point's difference from its reference as metrics", async () => {
    const s = summarizeRun(await sweepRun()) as unknown as Summary;
    const cell = (c: Record<string, unknown>) =>
      s.scenes.find((x) => x.config === configOf(c))!;
    const far = cell({
      "param.x": 10,
      "view.lodExponent": 0.5,
      "view.shadows": false,
    });
    expect(far.metrics.pixelDiffShare!.median).toBe(0.25);
    expect(far.metrics["pixelDiffShare.cliff"]!.median).toBe(0.5);
    expect(far.metrics.flipRef!.median).toBeGreaterThan(0);
    const ref = cell({
      "param.x": 10,
      "view.lodExponent": 1,
      "view.shadows": false,
    });
    expect(ref.metrics.pixelDiffShare!.median).toBe(0);
    expect(ref.metrics["pixelDiffShare.cliff"]!.median).toBe(0);
  });
});

describe("the sweep view's model", () => {
  async function model() {
    const results = await sweepRun();
    const s = {
      ...(summarizeRun(results) as object),
      name: "run.json",
    } as unknown as Summary;
    return { s, m: sweepModelOf(s)!, record: results.reference! };
  }

  it("reads a three-axis sweep as small multiples", async () => {
    const { s, m } = await model();
    expect(m.dims.map((d) => d.id)).toEqual(AXES.map((a) => a.id));
    expect(m.dims[0]!.label).toBe("exaggeration factor");
    expect(m.dims[2]!.names).toEqual(["on", "off"]);
    // The reference axis along x, then lines and panels.
    const layout = defaultLayout(m);
    expect(layout).toEqual({
      x: "view.lodExponent",
      lines: "param.x",
      panels: "view.shadows",
      held: {},
    });
    const panels = arrange(s, m, layout, "tiles.terrain", ALL);
    expect(panels.map((p) => p.name)).toEqual(["on", "off"]);
    expect(panels[0]!.lines.map((l) => l.name)).toEqual(["4", "10"]);
    const ten = panels[1]!.lines[1]!;
    expect(ten.points.map((p) => p?.value)).toEqual([500, 1000]);
    // ×10 at α 1 didn't settle: drawn hollow.
    expect(ten.points.map((p) => p?.settled)).toEqual([true, false]);
    expect(ten.points[1]!.reference).toBe(true);
  });

  it("moves an axis between x, lines and panels, and holds the rest", async () => {
    const { m } = await model();
    const layout = defaultLayout(m);
    const swapped = moveDimension(m, layout, "x", "view.shadows");
    expect(swapped).toEqual({
      x: "view.shadows",
      lines: "param.x",
      panels: "view.lodExponent",
      held: {},
    });
    const held = moveDimension(m, layout, "panels", undefined);
    expect(held).toEqual({
      x: "view.lodExponent",
      lines: "param.x",
      held: { "view.shadows": true },
    });
  });

  it("draws each point's own floor on image metrics, and offers them first", async () => {
    const { s, m, record } = await model();
    const near = configOf({
      "param.x": 4,
      "view.lodExponent": 0.5,
      "view.shadows": true,
    });
    expect(pointVerdict(record, s, near, "pixelDiffShare", ALL)).toMatchObject({
      floor: 2 / 32,
      judged: 1,
      within: 1,
      pairs: [3],
    });
    expect(pointVerdict(record, s, near, "tiles.terrain", ALL)).toBeUndefined();
    const groups = metricGroups(s, m);
    expect(groups[0]!.id).toBe("image");
    expect(groups[0]!.keys).toContain("pixelDiffShare.cliff");
  });

  it("puts each crop's pixels before its FLIP, and leaves out flipEnd beside reference images", async () => {
    const { s, m } = await model();
    // flipEnd is against the run's baseline configuration: in a sweep, one
    // of its own points, so the reference metrics replace it.
    s.scenes[0]!.metrics.flipEnd = {
      median: 0.1,
      low: 0.1,
      high: 0.1,
      values: [0.1],
    };
    const keys = metricGroups(s, m)[0]!.keys;
    expect(keys.filter((k) => k.endsWith(".cliff"))).toEqual([
      "pixelDiffShare.cliff",
      "flipRef.cliff",
    ]);
    expect(keys).not.toContain("flipEnd");
  });

  it("states the answer: how many points are within noise, and which aren't", async () => {
    const { s, m, record } = await model();
    const answer = noiseSummary(record, s, m, ALL)!;
    expect(answer).toMatchObject({ pooled: false, noFloor: [] });
    const [whole, cliff] = answer.regions;
    // ×4 matches its reference but for noise; ×10 changes a row of pixels.
    expect(whole).toMatchObject({
      region: "whole",
      compared: 4,
      within: 2,
      pairs: [3, 3],
    });
    expect(whole!.beyond.map((b) => b.words)).toEqual([
      "25% of pixels",
      "25% of pixels",
    ]);
    expect(whole!.beyond.every((b) => b.config.includes("param.x=10"))).toBe(
      true,
    );
    expect(cliff).toMatchObject({ region: "cliff", compared: 4, within: 2 });
    expect(cliff!.beyond[0]!.words).toBe("50% of pixels");
    expect(noiseSummary(undefined, s, m, ALL)).toBeUndefined();
  });

  it("says there is no noise floor when references ran once", async () => {
    const sweep = threeAxisSweep(1);
    const record = (await compareSweep({
      shots: shotsOf(sweep, 1),
      sweep,
      scenes,
      compare,
      ...io,
    }))!;
    const { s, m } = await model();
    const answer = noiseSummary(record, s, m, ALL)!;
    expect(answer.noFloor).toEqual([
      {
        scene: "vex-x10-zermatt",
        scenario: "cold-orbit",
        why: "reference captured once",
      },
    ]);
    expect(answer.regions[0]!.within).toBe(0);
  });

  it("reads an old one-axis sweep record", () => {
    const s = {
      name: "old.json",
      configs: ["2.0+sse=8", "2.0+sse=16"],
      scenes: [],
      sweep: readSweep({
        param: "engine.maximumScreenSpaceError",
        values: [8, 16],
        engines: ["2.0"],
        points: [
          { value: 8, configs: ["2.0+sse=8"] },
          { value: 16, configs: ["2.0+sse=16"] },
        ],
      }),
    } as unknown as Summary;
    const m = sweepModelOf(s)!;
    expect(m.dims.map((d) => d.id)).toEqual(["engine.maximumScreenSpaceError"]);
    expect(defaultLayout(m)).toEqual({
      x: "engine.maximumScreenSpaceError",
      held: {},
    });
  });
});

describe("the sweep view's charts", () => {
  it("labels close ticks of small values apart", () => {
    // FLIP and luminance differences are small: two decimals made
    // 0.005 and 0.01 both read "0.01".
    expect([0, 0.005, 0.01, 0.015].map(compact)).toEqual([
      "0",
      "0.005",
      "0.01",
      "0.015",
    ]);
    expect([0.0001, 0.0002, 0.25, 0.5, 1.5, 12, 2500].map(compact)).toEqual([
      "0.0001",
      "0.0002",
      "0.25",
      "0.5",
      "1.5",
      "12",
      "2.5K",
    ]);
  });

  it("draws unsettled points hollow, the noise band, and no built-in twin", () => {
    const html = lineChart({
      title: "Pixels changed",
      unit: "%",
      xNames: ["0.5", "1"],
      series: [
        {
          label: "×10",
          color: "var(--series-1)",
          points: [
            [0, 25],
            [1, 0],
          ],
          hollow: [1],
        },
      ],
      hbands: [{ y0: 0, y1: 6.25, label: "Noise floor: up to 6.3%" }],
      yMax: 30,
      twin: false,
      legend: false,
    });
    expect(html).toContain("<title>×10: not settled</title>");
    expect(html).toContain("Noise floor: up to 6.3%");
    expect(html).not.toContain('class="twin"');
    expect(
      lineChart({
        title: "t",
        series: [{ label: "a", color: "c", points: [[0, 1]] }],
      }),
    ).toContain('class="twin"');
  });
});

// One axis (error exponent 0.5 against the reference 1) by shadows, on
// any engines and scenes, with each reference point's captures and each
// point's change set by hand: a pixel changed per entry.
type Noise = Record<string, number>;
function oneAxisSweep(engines: string[], reps = 3): SweepRecord {
  const points = [];
  for (const a of [0.5, 1]) {
    for (const sh of [true, false]) {
      points.push({
        coords: { "view.lodExponent": a, "view.shadows": sh },
        configs: engines.map((e) => `${e}+lodExponent=${a}+shadows=${sh}`),
        ...(a === 1 ? { reference: true as const } : {}),
      });
    }
  }
  return {
    axes: [
      { id: "view.lodExponent", values: [0.5, 1] },
      { id: "view.shadows", values: [true, false] },
    ],
    reference: { id: "view.lodExponent", value: 1, reps },
    engines,
    points,
  };
}
/** `n` pixels of row `y` set to 230 (each a change above the threshold). */
const row = (n: number, y = 1): Array<[number, number, number]> =>
  [...Array(n).keys()].map((x) => [x, y, 230]);

/**
 * Shots: each reference config's repeats differ by `noise[config]` pixels
 * (repeat r changes r × that many, so the largest pair is 2 × noise with
 * 3 captures); each compared point changes `change[config]` pixels.
 */
function shotsFor(
  sweep: SweepRecord,
  sceneIds: string[],
  noise: Noise,
  change: Noise,
  reps = 3,
) {
  const shots = [];
  for (const scene of sceneIds) {
    for (const p of sweep.points) {
      for (const config of p.configs) {
        const base = { scene, scenario: "cold-orbit", config, moment: "end" };
        if (p.reference) {
          const n = noise[`${scene}|${config}`] ?? noise[config] ?? 0;
          for (let r = 0; r < reps; r++) {
            shots.push({ ...base, repeat: r, png: image(128, row(r * n, 0)) });
          }
        } else {
          const n = change[`${scene}|${config}`] ?? change[config] ?? 0;
          shots.push({ ...base, repeat: 0, png: image(128, row(n)) });
        }
      }
    }
  }
  return shots;
}

/** A summary of those shots' run, every config settled. */
async function runOf(
  sweep: SweepRecord,
  sceneIds: string[],
  noise: Noise,
  change: Noise,
) {
  const reference = await compareSweep({
    shots: shotsFor(sweep, sceneIds, noise, change),
    sweep,
    scenes: {},
    compare,
    ...io,
  });
  const runs = sceneIds.flatMap((scene) =>
    sweep.points.flatMap((p) =>
      p.configs.map((config) => ({
        scene,
        sceneTitle: scene,
        group: "D",
        scenario: "cold-orbit",
        config,
        engine: "2.0",
        rep: 0,
        metrics: { status: "ok", settled: true, dev: {} },
      })),
    ),
  );
  const s = {
    ...(summarizeRun({
      date: "2026-11-23T12:00:00Z",
      commit: "0123456789",
      environment: {},
      sweep,
      reference,
      runs,
    }) as object),
    name: "run.json",
  } as unknown as Summary;
  return { s, m: sweepModelOf(s)!, record: reference! };
}

describe("each point against its own reference's floor", () => {
  const A = "2.0@a";
  const B = "2.0@b";
  const cfg = (e: string, a: number, sh: boolean) =>
    `${e}+lodExponent=${a}+shadows=${sh}`;
  // Engine A's reference with shadows on is quiet (no noise); every other
  // reference is noisy (4 pixels between two captures). Every compared
  // point changes 2 pixels from its reference.
  const noise = {
    [cfg(A, 1, true)]: 0,
    [cfg(A, 1, false)]: 2,
    [cfg(B, 1, true)]: 2,
    [cfg(B, 1, false)]: 2,
  };
  const change = Object.fromEntries(
    [A, B].flatMap((e) => [true, false].map((sh) => [cfg(e, 0.5, sh), 2])),
  );

  it("judges a point beside a quiet reference by the quiet floor, per engine", async () => {
    const sweep = oneAxisSweep([A, B]);
    const { s, record } = await runOf(sweep, ["s1"], noise, change);
    const byConfig = (c: string) => record.points.find((p) => p.config === c)!;
    // Each reference config has its own floor, its own pairs.
    expect(
      record.references!.map((r) => [r.config, r.regions!.whole!.share]),
    ).toEqual([
      [cfg(A, 1, true), 0],
      [cfg(B, 1, true), 4 / 32],
      [cfg(A, 1, false), 4 / 32],
      [cfg(B, 1, false), 4 / 32],
    ]);
    // Beside A's quiet reference, 2 pixels are beyond noise...
    const quiet = byConfig(cfg(A, 0.5, true));
    expect(quiet.within!.whole).toBe(false);
    expect(verdict(record, quiet).within).toBe(false);
    expect(pointWords(record, "s1", "cold-orbit", quiet.config)).toBe(
      "6.3% of pixels",
    );
    // ...and the same change beside B's noisy reference (same coordinates,
    // other engine) is within it.
    const noisy = byConfig(cfg(B, 0.5, true));
    expect(noisy.within!.whole).toBe(true);
    expect(pointWords(record, "s1", "cold-orbit", noisy.config)).toBe(
      "within noise (3 pairs)",
    );
    // The table and the chart read the same verdict and floor.
    const v = pointVerdict(record, s, quiet.config, "pixelDiffShare", "s1")!;
    expect(v).toMatchObject({ judged: 1, within: 0, floor: 0 });
    expect(verdictNote(v)).toBeUndefined();
    expect(
      verdictNote(
        pointVerdict(record, s, noisy.config, "pixelDiffShare", "s1"),
      ),
    ).toBe("within noise (3 pairs)");
  });

  it("judges each metric by its own field's floor", async () => {
    // Repeats identical (every floor 0); the point dims 4 pixels by a
    // change under the luminance threshold: no pixel counts as changed,
    // but the mean change is above its floor of 0.
    const sweep = oneAxisSweep([A], 3);
    const shots = shotsFor(sweep, ["s1"], {}, {}).map((x) =>
      x.config === cfg(A, 0.5, true)
        ? {
            ...x,
            png: image(
              128,
              [0, 1, 2, 3].map((i) => [i, 0, 133] as [number, number, number]),
            ),
          }
        : x,
    );
    const record = (await compareSweep({
      shots,
      sweep,
      scenes: {},
      compare,
      ...io,
    }))!;
    const p = record.points.find((x) => x.config === cfg(A, 0.5, true))!;
    expect(verdict(record, p, "whole", "share").within).toBe(true);
    expect(verdict(record, p, "whole", "mean").within).toBe(false);
  });

  it("says the same thing in the table, the band and the answer across scenes", async () => {
    // One engine; in s1 the point changes 1 pixel against a floor of 2,
    // in s2 8 pixels against the same floor.
    const sweep = oneAxisSweep([A]);
    const point = cfg(A, 0.5, true);
    const { s, m, record } = await runOf(
      sweep,
      ["s1", "s2"],
      { [cfg(A, 1, true)]: 1, [cfg(A, 1, false)]: 1 },
      { [`s1|${point}`]: 1, [`s2|${point}`]: 8 },
    );
    // Every scene: counted, no band (each scene has its own floors).
    const all = pointVerdict(record, s, point, "pixelDiffShare", ALL)!;
    expect(all).toMatchObject({ scenes: 2, judged: 2, within: 1 });
    expect(all.floor).toBeUndefined();
    expect(verdictNote(all)).toBe("within noise in 1 of 2 scenes");
    // One scene at a time: the note and the band.
    const one = pointVerdict(record, s, point, "pixelDiffShare", "s1")!;
    expect(verdictNote(one)).toBe("within noise (3 pairs)");
    expect(one.floor).toBe(2 / 32);
    const two = pointVerdict(record, s, point, "pixelDiffShare", "s2")!;
    expect(verdictNote(two)).toBeUndefined();
    expect(two.floor).toBe(2 / 32);
    // The answer counts the same way: within in s1, not in s2.
    const answer = noiseSummary(record, s, m, ALL)!;
    const whole = answer.regions.find((r) => r.region === "whole")!;
    const mine = (scene: string) =>
      whole.beyond.some((b) => b.config === point && b.scene === scene);
    expect(mine("s1")).toBe(false);
    expect(mine("s2")).toBe(true);
    expect(whole.beyond.find((b) => b.config === point)!.words).toBe(
      "25% of pixels",
    );
  });

  it("reads a record from before per-reference floors as pooled", () => {
    const record = {
      moment: "end",
      threshold: 0.1,
      reference: { id: "view.lodExponent", value: 1, reps: 3 },
      floors: [
        {
          scene: "s1",
          scenario: "cold-orbit",
          reps: 3,
          pairs: 12,
          regionNames: ["whole"],
          regions: { whole: { share: 0.1, mean: 0.1 } },
        },
      ],
      points: [
        {
          scene: "s1",
          scenario: "cold-orbit",
          config: "p",
          image: "p.jpg",
          against: "r",
          regions: { whole: { share: 0.05, mean: 0 } },
        },
      ],
      repeats: [],
    };
    const v = verdict(record, record.points[0]);
    expect(v).toMatchObject({ within: true, pooled: true, pairs: 12 });
    expect(pointWords(record, "s1", "cold-orbit", "p")).toBe(
      "within noise (12 pairs, pooled)",
    );
  });

  it("doesn't compare images of different sizes", async () => {
    const sweep = oneAxisSweep([A], 2);
    const point = cfg(A, 0.5, true);
    const shots = shotsFor(sweep, ["s1"], {}, {}, 2).map((x) =>
      x.config === point ? { ...x, png: new Uint8ClampedArray(4 * 4 * 4) } : x,
    );
    const sized = async (test: unknown, ref: unknown, regions: Region[]) =>
      (test as Uint8ClampedArray).length !== (ref as Uint8ClampedArray).length
        ? { mismatch: "sizes differ: 4×4 against 8×4" }
        : compare(test, ref, regions);
    const record = (await compareSweep({
      shots,
      sweep,
      scenes: {},
      compare: sized,
      ...io,
    }))!;
    const p = record.points.find((x) => x.config === point)!;
    expect(p.mismatch).toBe("sizes differ: 4×4 against 8×4");
    expect(p.regions).toBeUndefined();
    expect(pointWords(record, "s1", "cold-orbit", point)).toBe(
      "not compared (sizes differ: 4×4 against 8×4)",
    );
  });
});
