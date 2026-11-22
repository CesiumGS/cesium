import { describe, expect, it } from "vitest";
import {
  pickFlag,
  pickModeForKey,
  pickModeOf,
  selectionFor,
} from "../examples/csg/pickMode.ts";

describe("CSG selection filter", () => {
  it("defaults to Face and reads the link's flags", () => {
    expect(pickModeOf(new Set())).toBe("face");
    expect(pickModeOf(new Set(["part"]))).toBe("part");
    expect(pickModeOf(new Set(["wire", "body"]))).toBe("body");
    expect(pickFlag("face")).toEqual([]);
    expect(pickFlag("part")).toEqual(["part"]);
  });

  it("chooses a mode by key", () => {
    expect(pickModeForKey("p")).toBe("face");
    expect(pickModeForKey("v")).toBe("part");
    expect(pickModeForKey("B")).toBe("body");
    expect(pickModeForKey("x")).toBeUndefined();
  });

  it("selects the leaf of a face or part, and the root for the body", () => {
    const pick = { leaf: 4, root: 1 };
    expect(selectionFor("face", pick, [7], false)).toEqual([4]);
    expect(selectionFor("part", pick, [7], false)).toEqual([4]);
    expect(selectionFor("body", pick, [7], false)).toEqual([1]);
    expect(
      selectionFor("part", { leaf: undefined, root: 1 }, [7], false),
    ).toEqual([]);
  });

  it("adds to and takes from the selection when additive", () => {
    const pick = { leaf: 4, root: 1 };
    expect(selectionFor("part", pick, [7], true)).toEqual([7, 4]);
    expect(selectionFor("part", pick, [7, 4], true)).toEqual([7]);
  });
});
