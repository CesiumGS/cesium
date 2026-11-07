// Frame tree: round trips and compositions over eight frames, five instants.
import { type Frame, frameTransform } from "../../../../src/frames/Frame.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import { bodyFrameCase } from "./body-frames.ts";
import { jointChainCase } from "./joint-chain.ts";
import {
  ROTATION,
  apply,
  compositionTolerance,
  distance,
  norm,
  random,
  rotationDifference,
  stressCase,
  translationOf,
  utc,
} from "../shared.ts";

const TREE_INSTANTS = [
  "2026-01-15T00:00:00",
  "2026-03-20T12:00:00",
  "2026-06-21T06:00:00",
  "2026-09-22T18:00:00",
  "2026-12-21T03:00:00",
];

const frameTreeCase = stressCase(
  "frame-tree.compositions",
  "frame-tree",
  "Seeded points through A → B → A, and A → C → B against A → B, over every pair of ITRF, GCRF, EARTH_ICRF, EME2000, HCRS, MOON_ICRF, MOON_ME and MOON_PA at five instants in 2026: within 1 mm per 1e9 m and 1e-12 in rotation",
  ["frames"],
  async (ctx, base) => {
    const f = ctx.frames;
    const tree: Frame[] = [
      f.itrf,
      f.gcrf,
      f.earthIcrf,
      f.eme2000,
      f.hcrs,
      f.moonIcrf,
      f.moonMe,
      f.moonPa,
    ];
    const n = tree.length;
    const instants = TREE_INSTANTS.map((iso) => utc(ctx, iso));
    // matrices[t][i * n + j] maps frame i to frame j.
    const matrices = instants.map((t) => {
      const out: Float64Array[] = [];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          out.push(frameTransform(tree[i]!, tree[j]!, t));
        }
      }
      return out;
    });
    const results: StressResult[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const next = random(1 + i * n + j);
        let ratio = -1;
        let worstValue = 0;
        let worstTolerance = 0;
        let worstRotation = 0;
        let samples = 0;
        const consider = (deviation: number, tolerance: number) => {
          samples++;
          if (deviation / tolerance > ratio) {
            ratio = deviation / tolerance;
            worstValue = deviation;
            worstTolerance = tolerance;
          }
        };
        for (const M of matrices) {
          const m = (a: number, b: number) => M[a * n + b]!;
          for (let k = 0; k < 4; k++) {
            // 1 m to 1e9 m in a random direction.
            const r = 10 ** (9 * next());
            const z = 2 * next() - 1;
            const phi = 2 * Math.PI * next();
            const s = Math.sqrt(1 - z * z);
            const p = Float64Array.of(
              r * s * Math.cos(phi),
              r * s * Math.sin(phi),
              r * z,
            );
            for (const [a, b] of [
              [i, j],
              [j, i],
            ] as const) {
              const there = apply(m(a, b), p);
              const back = apply(m(b, a), there);
              consider(
                distance(back, p),
                compositionTolerance(
                  [translationOf(m(a, b)), translationOf(m(b, a))],
                  [norm(p), norm(there)],
                ),
              );
              worstRotation = Math.max(
                worstRotation,
                rotationDifference(m(b, a), m(a, b), "identity"),
              );
            }
            const direct = apply(m(i, j), p);
            for (let c = 0; c < n; c++) {
              if (c === i || c === j) {
                continue;
              }
              const step = apply(m(i, c), p);
              const via = apply(m(c, j), step);
              consider(
                distance(via, direct),
                compositionTolerance(
                  [
                    translationOf(m(i, j)),
                    translationOf(m(i, c)),
                    translationOf(m(c, j)),
                  ],
                  [norm(p), norm(step)],
                ),
              );
              worstRotation = Math.max(
                worstRotation,
                rotationDifference(m(c, j), m(i, c), m(i, j)),
              );
            }
          }
        }
        const a = tree[i]!.name;
        const b = tree[j]!.name;
        results.push({
          ...base,
          id: `${base.id}.${a}-${b}`.toLowerCase().replaceAll("_", "-"),
          title: `${a} and ${b}: round trips, and compositions through the six other frames, agree within 1 mm per 1e9 m and 1e-12 in rotation`,
          pass: worstRotation <= ROTATION,
          value: worstValue,
          tolerance: worstTolerance,
          unit: "m",
          detail: `${samples} samples; the worst against its own tolerance shown; rotation ${fmt(worstRotation)} (limit ${ROTATION})`,
        });
      }
    }
    return results;
  },
);

export const frameTreeCases: readonly StressCase[] = [
  frameTreeCase,
  bodyFrameCase,
  jointChainCase,
];
