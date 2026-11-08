import { describe, expect, it } from "vitest";
import { mergeOrder, passTimes } from "../src/gpu/GpuTimer.ts";

describe("GPU pass order", () => {
  it("keeps a skipped pass in its place", () => {
    // shadows 0, cull 1, sky 2, opaque 3; a frame without the cull.
    expect(mergeOrder([0, 1, 2, 3], [0, 2, 3])).toEqual([0, 1, 2, 3]);
  });
  it("inserts a new pass after the one it followed", () => {
    expect(mergeOrder([0, 2, 3], [0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
    expect(mergeOrder([], [4, 5])).toEqual([4, 5]);
    expect(mergeOrder([2, 3], [9, 2, 3])).toEqual([9, 2, 3]);
  });
  it("doesn't reorder known passes", () => {
    expect(mergeOrder([0, 1, 2], [1, 0, 2])).toEqual([0, 1, 2]);
  });
});

describe("GPU pass times", () => {
  const times = (intervals: Array<[number, number]>) => {
    const own = new Float64Array(intervals.length);
    const total = passTimes(
      intervals.map(([b]) => b),
      intervals.map(([, e]) => e),
      intervals.length,
      own,
    );
    return { total, own: [...own] };
  };

  it("adds passes that don't overlap", () => {
    expect(
      times([
        [0, 1],
        [2, 3],
        [3, 5],
      ]),
    ).toEqual({ total: 4, own: [1, 1, 2] });
  });

  it("counts overlapping passes once (a tiler starts a pass before the last ends)", () => {
    // Measured on an M-series MacBook Air: the translucent passes begin
    // while the opaque pass's fragments run, so their intervals nearly
    // cover it. Summed they read 3 opaque passes more (task-18 report);
    // the GPU was busy 13.5.
    expect(
      times([
        [0, 10], // opaque
        [1, 12], // translucent-moments
        [1.5, 13], // translucent-color
        [1.5, 13.5], // translucent-composite
      ]),
    ).toEqual({ total: 13.5, own: [10, 2, 1, 0.5] });
  });

  it("gives a pass inside an earlier one no time of its own", () => {
    expect(
      times([
        [0, 10],
        [2, 3],
        [9, 11],
      ]),
    ).toEqual({ total: 11, own: [10, 0, 1] });
  });

  it("counts a later pass's time before an earlier one began", () => {
    expect(
      times([
        [5, 10],
        [0, 6],
      ]),
    ).toEqual({ total: 10, own: [5, 5] });
    expect(
      times([
        [2, 4],
        [6, 8],
        [0, 10],
      ]),
    ).toEqual({ total: 10, own: [2, 2, 6] });
  });

  it("ignores a pass whose end isn't after its begin", () => {
    expect(
      times([
        [0, 2],
        [5, 5],
        [7, 6],
      ]),
    ).toEqual({ total: 2, own: [2, 0, 0] });
  });
});
