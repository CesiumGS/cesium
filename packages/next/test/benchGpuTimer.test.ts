import { describe, expect, it } from "vitest";
import { GpuTimer } from "../src/gpu/GpuTimer.ts";
import annotations from "../bench/suite/annotations.json";
import { detectAlerts } from "../bench/suite/changepoints.mjs";
import {
  GPU_TIMER,
  currentGpuTimer,
  currentGpuTimerSummary,
} from "../bench/suite/gpuTimer.mjs";
import { summarizeRun } from "../bench/suite/report.mjs";
import { checkBudgets } from "../bench/suite/scorecard.mjs";

/**
 * The GPU timer's change (version 2: overlapping passes counted once) is
 * marked in benchmark data: gpuP50 of another timer is never compared,
 * in summaries, alerts or budgets.
 */

interface Run {
  scene: string;
  scenario: string;
  config: string;
  rep: number;
  metrics: Record<string, unknown>;
}

const run = (
  config: string,
  gpuP50: number | undefined,
  gpuTimer?: number,
  rep = 0,
): Run => ({
  scene: "nyc",
  scenario: "cold-orbit",
  config,
  rep,
  metrics: {
    status: "ok",
    frameP50: 16.7,
    ...(gpuP50 === undefined ? {} : { gpuP50 }),
    ...(gpuTimer === undefined ? {} : { gpuTimer }),
  },
});

const results = (runs: Run[], baseline = runs[0]!.config) => ({
  date: "2026-11-08T01:00:00Z",
  commit: "c0ffee",
  baseline,
  environment: {},
  runs,
});

type Cell = {
  config: string;
  gpuTimer?: number;
  metrics: Record<string, { median: number }>;
};
const cells = (summary: unknown) =>
  (summary as { scenes: Cell[] }).scenes as Cell[];

describe("the GPU timer's version in benchmark results", () => {
  it("is the engine's timer version", () => {
    expect(GPU_TIMER).toBe(GpuTimer.version);
  });

  it("keeps an older timer's gpuP50 apart", () => {
    const r = results([
      run("2.0@4d5609385a", 36), // before versions: timer 1
      run("2.0", 11, 2),
      run("1.147.0", undefined),
    ]);
    const current = currentGpuTimer(r);
    expect(current.runs[0]!.metrics).toMatchObject({ gpuSummedP50: 36 });
    expect(current.runs[0]!.metrics.gpuP50).toBeUndefined();
    expect(current.runs[1]).toBe(r.runs[1]);
    expect(current.runs[2]).toBe(r.runs[2]);
    // Not mutated, and the same object when nothing moves.
    expect(r.runs[0]!.metrics.gpuP50).toBe(36);
    expect(currentGpuTimer(current)).toBe(current);
  });

  it("summarizes gpuP50 only from the current timer, and says which", () => {
    const summary = summarizeRun(
      results([run("2.0@4d5609385a", 36), run("2.0", 11, 2)]),
    );
    const [old, now] = cells(summary);
    expect(old!.metrics.gpuP50).toBeUndefined();
    expect(old!.gpuTimer).toBeUndefined();
    expect(old!.metrics.frameP50).toBeDefined();
    expect(now!.metrics.gpuP50!.median).toBe(11);
    expect(now!.gpuTimer).toBe(2);
  });

  it("drops gpuP50 from a summary stored before timer versions", () => {
    const stale = {
      scenes: [
        { config: "2.0", metrics: { gpuP50: { median: 36 }, frameP50: {} } },
      ],
    };
    const current = currentGpuTimerSummary(stale);
    expect(current.scenes[0]!.metrics).not.toHaveProperty("gpuP50");
    expect(current.scenes[0]!.metrics).toHaveProperty("frameP50");
    const fresh = summarizeRun(results([run("2.0", 11, 2)]));
    expect(currentGpuTimerSummary(fresh)).toBe(fresh);
  });

  it("raises no change-point alert where the timer changed", () => {
    // 8 runs summed (36 ms), then 8 counted once (11 ms): one series
    // would show a 70% "improvement".
    const summaries = Array.from({ length: 16 }, (_, i) => ({
      name: `run${i}.json`,
      date: `2026-11-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      commit: `c${i}`,
      hardware: "nvidia-lovelace",
      scenes: [
        {
          scene: "nyc",
          scenario: "cold-orbit",
          title: "NYC",
          config: "2.0",
          ...(i < 8 ? {} : { gpuTimer: 2 }),
          metrics: {
            gpuP50: {
              median: (i < 8 ? 36 : 11) + (i % 3) * 0.01,
              low: 0,
              high: 0,
              values: [],
            },
          },
        },
      ],
    }));
    expect(detectAlerts(summaries, ["gpuP50"])).toEqual([]);
    // The same step within one timer is an alert.
    const within = summaries.map((s) => ({
      ...s,
      scenes: s.scenes.map((c) => ({ ...c, gpuTimer: 2 })),
    }));
    expect(detectAlerts(within, ["gpuP50"]).map((a) => a.kind)).toEqual([
      "improvement",
    ]);
  });

  it("takes no budget ratio to a baseline of another timer", () => {
    const budget = {
      id: "gpu",
      metric: "gpuP50",
      setup: "2.0",
      maxRatio: 1.1,
      label: "GPU",
    };
    const mixed = results(
      [run("2.0@4d5609385a", 36, undefined), run("2.0", 11, 2)],
      "2.0@4d5609385a",
    );
    // Without the version, 11 / 36 would pass at 0.31.
    const [refused] = checkBudgets(mixed, [budget]);
    expect(refused!.scenes).toEqual([]);
    const same = results(
      [run("2.0@4d5609385a", 10, 2), run("2.0", 11, 2)],
      "2.0@4d5609385a",
    );
    const [taken] = checkBudgets(same, [budget]);
    expect(taken!.scenes.map((s: { value: number }) => s.value)).toEqual([1.1]);
  });

  it("is marked on the gpuP50 trend", () => {
    const note = annotations.annotations.find((a) =>
      a.short?.startsWith("GPU timer 2"),
    );
    expect(note).toMatchObject({ kind: "method", metrics: ["gpuP50"] });
  });
});
