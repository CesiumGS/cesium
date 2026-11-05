import { describe, expect, it } from "vitest";
import { mergeOrder } from "../src/gpu/GpuTimer.ts";

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
