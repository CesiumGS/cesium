import { describe, expect, it } from "vitest";
import { groupOf, groupPasses, untimedMs } from "../widgets/gpuGroups.ts";
import { gpuRow, RECORD_COLUMNS } from "../widgets/recorderRows.ts";
import { GpuTimer } from "../src/gpu/GpuTimer.ts";

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
    const cells = gpuRow(1, 2, 4, { a: 1 }, 5, 10).split(",");
    expect(cells).toHaveLength(RECORD_COLUMNS.length);
    const at = (c: (typeof RECORD_COLUMNS)[number]) =>
      cells[RECORD_COLUMNS.indexOf(c)];
    expect(at("gpu_span_ms")).toBe("5");
    expect(at("gpu_wall_ms")).toBe("10");
    expect(at("gpu_untimed_ms")).toBe("6");
    const bare = gpuRow(1, 2, 4, { a: 1 }).split(",");
    expect(bare[RECORD_COLUMNS.indexOf("gpu_wall_ms")]).toBe("");
    expect(bare[RECORD_COLUMNS.indexOf("gpu_untimed_ms")]).toBe("");
  });
});

describe("GpuTimer groups", () => {
  it("is a no-op without a timer for the device", () => {
    expect(GpuTimer.groupWrites({} as GPUDevice, "imagery")).toBeUndefined();
  });
});
