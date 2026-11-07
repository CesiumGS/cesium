// Vertical profile: a symmetric parabolic curve, arithmetic in the case.
import { Alignment } from "../../../../src/engineering/alignment.ts";
import { HAND_FORMULA } from "../references.ts";
import type { ResultBase, StressCase } from "../runner.ts";
import { stressCase } from "../shared.ts";

const verticalCurveCase = stressCase(
  "vertical-profile.parabola",
  "vertical-profile",
  "A symmetric vertical curve, PVI 10+00.00 at elevation 100.000, g1 = +3%, g2 = −2%, L = 400: elevations, the high point and K match the hand arithmetic within 10⁻⁹",
  [],
  async (_ctx, base) => {
    const pvi = 1000;
    const elevation = 100;
    const g1 = 0.03;
    const g2 = -0.02;
    const L = 400;
    const start = 500;
    const road = new Alignment({
      name: "Vertical curve",
      start: [0, 0],
      startAzimuth: Math.PI / 2,
      startStation: start,
      horizontal: [{ kind: "line", length: 1000 }],
      vertical: {
        startStation: start,
        startElevation: elevation - g1 * (pvi - start),
        segments: [
          { kind: "grade", length: pvi - L / 2 - start, grade: g1 },
          { kind: "parabola", length: L, startGrade: g1, endGrade: g2 },
          { kind: "grade", length: start + 1000 - (pvi + L / 2), grade: g2 },
        ],
      },
    });
    // By hand: BVC at 800 is 100 − 0.03·200 = 94.000; EVC at 1200 is
    // 100 − 0.02·200 = 96.000; within the curve y = 94 + g1·x + (g2 − g1)·x²/(2L)
    // x from the BVC: x = 50 → 95.34375, 100 → 96.375, 200 → 97.5, 300 → 97.375.
    const bvc = pvi - L / 2;
    const yBvc = elevation - (g1 * L) / 2;
    const hand = (x: number) => yBvc + g1 * x + ((g2 - g1) * x * x) / (2 * L);
    const points = [
      { station: bvc, y: 94 },
      { station: bvc + 50, y: 95.34375 },
      { station: bvc + 100, y: 96.375 },
      { station: bvc + 200, y: 97.5 },
      { station: bvc + 300, y: 97.375 },
      { station: pvi + L / 2, y: 96 },
    ];
    let worstElevation = 0;
    let arithmetic = 0;
    for (const p of points) {
      worstElevation = Math.max(
        worstElevation,
        Math.abs(road.elevationAt(p.station) - p.y),
      );
      // The written values against the formula: the arithmetic itself.
      arithmetic = Math.max(arithmetic, Math.abs(hand(p.station - bvc) - p.y));
    }
    // The high point: x = −g1·L/(g2 − g1) = 240 from the BVC, station
    // 10+40.00, elevation 94 + 7.2 − 3.6 = 97.6.
    const xHigh = (-g1 * L) / (g2 - g1);
    const high = bvc + xHigh;
    const yHigh = road.elevationAt(high);
    const isMaximum =
      road.elevationAt(high - 0.01) < yHigh &&
      road.elevationAt(high + 0.01) < yHigh;
    // K = L / |A|, A = g2 − g1 in percent: 400 / 5 = 80. From the profile, the
    // rate of change of grade r = (y(+h) − 2y + y(−h)) / h², and K = 1/(100 |r|).
    const step = 100;
    const r =
      (road.elevationAt(pvi + step) -
        2 * road.elevationAt(pvi) +
        road.elevationAt(pvi - step)) /
      (step * step);
    const K = 1 / (100 * Math.abs(r));
    const sub = (suffix: string, title: string): ResultBase => ({
      ...base,
      id: `${base.id}.${suffix}`,
      title,
    });
    return [
      {
        ...sub(
          "elevations",
          "Elevations at the BVC (8+00, 94.000), EVC (12+00, 96.000) and stations 8+50, 9+00, 10+00 and 11+00 (95.34375, 96.375, 97.5, 97.375) within 10⁻⁹",
        ),
        pass: arithmetic < 1e-12,
        value: worstElevation,
        tolerance: HAND_FORMULA,
        unit: "ft",
        detail: points
          .map((p) => `${p.station}: ${road.elevationAt(p.station)}`)
          .join("; "),
      },
      {
        ...sub(
          "high-point",
          "The high point at x = −g1·L/(g2 − g1) = 240 from the BVC (station 10+40.00, elevation 97.6) is a maximum: 0.01 either side is lower",
        ),
        pass: isMaximum && xHigh === 240,
        value: Math.abs(yHigh - 97.6),
        tolerance: HAND_FORMULA,
        unit: "ft",
        detail: `elevation ${yHigh} at ${high}; ${road.elevationAt(high - 0.01)} and ${road.elevationAt(high + 0.01)} at ±0.01`,
      },
      {
        ...sub(
          "k",
          "K = L/|g2 − g1| = 400/5 = 80 (length per percent of grade change), from the profile's rate of change of grade, within 10⁻⁹",
        ),
        pass: true,
        value: Math.abs(K - 80),
        tolerance: HAND_FORMULA,
        detail: `K ${K}`,
      },
    ];
  },
);

const gradeToGradeCase = stressCase(
  "vertical-profile.grade-to-grade",
  "vertical-profile",
  "Grade to grade with no curve: +3% to the PVI at 10+00.00 (elevation 100.000), then −2%: elevations at 7+50 (92.5), 10+00 (100) and 12+50 (95) within 10⁻⁹",
  [],
  async (_ctx, base) => {
    const road = new Alignment({
      name: "Grade to grade",
      start: [0, 0],
      startAzimuth: 0,
      startStation: 500,
      horizontal: [{ kind: "line", length: 1000 }],
      vertical: {
        startStation: 500,
        startElevation: 85,
        segments: [
          { kind: "grade", length: 500, grade: 0.03 },
          { kind: "grade", length: 500, grade: -0.02 },
        ],
      },
    });
    const expected = [
      [750, 92.5],
      [1000, 100],
      [1250, 95],
    ] as const;
    const worst = Math.max(
      ...expected.map(([s, y]) => Math.abs(road.elevationAt(s) - y)),
    );
    return [
      {
        ...base,
        pass: true,
        value: worst,
        tolerance: HAND_FORMULA,
        unit: "ft",
        detail: expected
          .map(([s]) => `${s}: ${road.elevationAt(s)}`)
          .join("; "),
      },
    ];
  },
);

export const verticalProfileCases: readonly StressCase[] = [
  verticalCurveCase,
  gradeToGradeCase,
];
