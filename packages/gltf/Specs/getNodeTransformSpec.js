import { getNodeTransform } from "../index.js";

describe("getNodeTransform", function () {
  it("returns undefined when the node has no transform", function () {
    expect(getNodeTransform({})).toBeUndefined();
  });

  it("returns the matrix when the node has one", function () {
    const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 6, 7, 1];
    expect(getNodeTransform({ matrix })).toBe(matrix);
  });

  it("composes translation, rotation, and scale", function () {
    const transform = getNodeTransform({
      translation: [1, 2, 3],
      rotation: [0, 0, 0, 1],
      scale: [2, 3, 4],
    });
    expect(transform).toEqual([2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 1, 2, 3, 1]);
  });

  it("uses identity values for missing translation, rotation, and scale", function () {
    expect(getNodeTransform({ translation: [1, 2, 3] })).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1,
    ]);
    expect(getNodeTransform({ scale: [2, 3, 4] })).toEqual([
      2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1,
    ]);
  });
});
