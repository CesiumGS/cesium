import { describe, expect, it } from "vitest";
import {
  align,
  gpuWindow,
  groupOf,
  groupPasses,
  untimedMs,
} from "../packages/next/widgets/gpuGroups.ts";
import {
  gpuRow,
  RECORD_COLUMNS,
} from "../packages/next/widgets/recorderRows.ts";
import { GpuTimer } from "../packages/next/src/gpu/GpuTimer.ts";

describe("GPU groups", () => {
  it("files labels under their group, unknown ones under Other", () => {
    expect(groupOf("opaque")).toBe("Scene");
    expect(groupOf("translucent-sort")).toBe("Scene");
    expect(groupOf("stars")).toBe("Lighting & sky");
    expect(groupOf("imagery")).toBe("Imagery");
    expect(groupOf("glare.sprites")).toBe("Post & output");
    expect(groupOf("pick")).toBe("Picks & misc");
    expect(groupOf("bloom")).toBe("Other");
  });

  it("sums groups, orders their passes and drops empty ones", () => {
    const groups = groupPasses([
      ["output", 0.5],
      ["opaque", 2],
      ["shadows", 3],
      ["imagery", 1],
    ]);
    expect(groups.map((g) => g.name)).toEqual([
      "Scene",
      "Imagery",
      "Post & output",
    ]);
    expect(groups[0]!.ms).toBe(5);
    expect(groups[0]!.passes.map(([n]) => n)).toEqual(["shadows", "opaque"]);
  });

  it("computes the untimed share, never below zero", () => {
    expect(untimedMs(10, 4)).toBe(6);
    expect(untimedMs(3, 4)).toBe(0);
    expect(untimedMs(undefined, 4)).toBeNaN();
    expect(untimedMs(Number.NaN, 4)).toBeNaN();
    expect(untimedMs(5, Number.NaN)).toBeNaN();
  });
});

describe("GPU recorder row", () => {
  it("carries span, wall and untimed, and stays as wide as the header", () => {
    const cells = gpuRow(1, 2, 4, { a: 1 }, 5, 30, 10).split(",");
    expect(cells).toHaveLength(RECORD_COLUMNS.length);
    const at = (c: (typeof RECORD_COLUMNS)[number]) =>
      cells[RECORD_COLUMNS.indexOf(c)];
    expect(at("gpu_span_ms")).toBe("5");
    expect(at("gpu_wall_ms")).toBe("30");
    expect(at("gpu_interval_ms")).toBe("10");
    expect(at("gpu_untimed_ms")).toBe("6");
    const bare = gpuRow(1, 2, 4, { a: 1 }).split(",");
    expect(bare[RECORD_COLUMNS.indexOf("gpu_interval_ms")]).toBe("");
    expect(bare[RECORD_COLUMNS.indexOf("gpu_untimed_ms")]).toBe("");
  });
});

describe("GpuTimer groups", () => {
  it("is a no-op without a timer for the device", () => {
    expect(GpuTimer.groupWrites({} as GPUDevice, "imagery")).toBeUndefined();
  });
});

describe("the GPU window the inspector charts", () => {
  it("right-aligns a short history, zero before it and for NaN or negative samples", () => {
    expect(align([1, Number.NaN, -2, 3], 6)).toEqual([0, 0, 1, 0, 0, 3]);
    expect(align([1, 2, 3, 4], 2)).toEqual([3, 4]);
  });

  it("sums passes into groups in run order, keeps idle ones, and stacks untimed on top", () => {
    const passes = new Map<string, number[]>([
      ["opaque", [10, 20]],
      ["shadows", [5, 5]],
      ["star-cull", [0.01, 0.02]],
      ["imagery", [2]],
    ]);
    const win = gpuWindow(passes, ["shadows", "opaque"], [1, 3], 2);
    expect(win.groups.map((g) => g.name)).toEqual([
      "Scene",
      "Lighting & sky",
      "Imagery",
    ]);
    const scene = win.groups[0]!;
    expect(scene.passes.map((p) => p.name)).toEqual(["shadows", "opaque"]);
    expect(scene.series).toEqual([15, 25]);
    expect(scene.mean).toBe(20);
    const sky = win.groups[1]!;
    expect(sky.passes.map((p) => p.name)).toEqual(["star-cull"]);
    // Imagery arrived in the newest sample only.
    expect(win.groups[2]!.series).toEqual([0, 2]);
    expect(win.total[0]).toBeCloseTo(15 + 0.01 + 0 + 1);
    expect(win.total[1]).toBeCloseTo(25 + 0.02 + 2 + 3);
    expect(win.totalMean).toBeCloseTo((win.total[0]! + win.total[1]!) / 2);
  });
});
