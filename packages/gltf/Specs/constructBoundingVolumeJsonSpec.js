import { DeveloperError } from "@cesium/core";
import { constructBoundingVolumeJson } from "../index.js";

describe("constructBoundingVolumeJson", function () {
  const shapes = [
    { type: "box", box: { size: [2.0, 4.0, 6.0] } },
    { type: "sphere", sphere: { radius: 1.0 } },
  ];

  it("converts the box size to half axes centered at the origin", function () {
    const result = constructBoundingVolumeJson({ shape: 0 }, shapes);
    expect(result).toEqual({
      box: [0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3],
    });
  });

  it("applies the translation to the box center", function () {
    const result = constructBoundingVolumeJson(
      { shape: 0, translation: [10, 20, 30] },
      shapes,
    );
    expect(result.box).toEqual([10, 20, 30, 1, 0, 0, 0, 2, 0, 0, 0, 3]);
  });

  it("applies the scale to the half axes", function () {
    const result = constructBoundingVolumeJson(
      { shape: 0, scale: [2, 3, 4] },
      shapes,
    );
    expect(result.box).toEqual([0, 0, 0, 2, 0, 0, 0, 6, 0, 0, 0, 12]);
  });

  it("applies the rotation to the half axes", function () {
    const halfSqrt2 = Math.SQRT1_2;
    const result = constructBoundingVolumeJson(
      { shape: 0, rotation: [0, 0, halfSqrt2, halfSqrt2] },
      shapes,
    );
    // A 90 degree rotation about z maps the x axis to y and the y axis to -x.
    const expected = [0, 0, 0, 0, 1, 0, -2, 0, 0, 0, 0, 3];
    expect(result.box.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expect(result.box[i]).toBeCloseTo(expected[i], 10);
    }
  });

  it("does not modify the translation of the input", function () {
    const translation = [1, 2, 3];
    constructBoundingVolumeJson({ shape: 0, translation }, shapes);
    expect(translation).toEqual([1, 2, 3]);
  });

  it("throws for shapes other than box", function () {
    expect(function () {
      constructBoundingVolumeJson({ shape: 1 }, shapes);
    }).toThrowError(DeveloperError);
  });
});
