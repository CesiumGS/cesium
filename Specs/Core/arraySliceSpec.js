import { arraySlice } from "../../Source/Cesium.js";
import { FeatureDetection } from "../../Source/Cesium.js";

describe("Core/arraySlice", function () {
  const array = [1, 2, 3, 4, 5];

  it("slices entire array", function () {
    const slice = arraySlice(array);
    expect(slice).toEqual(array);
  });

  it("slices from a start index", function () {
    const slice = arraySlice(array, 1);
    expect(slice).toEqual([2, 3, 4, 5]);
  });

  it("slices from with an end index", function () {
    const slice = arraySlice(array, undefined, 3);
    expect(slice).toEqual([1, 2, 3]);
  });

  it("slices with a start and end index", function () {
    const slice = arraySlice(array, 1, 3);
    expect(slice).toEqual([2, 3]);
  });

  it("slices typed arrays", function () {
    if (!FeatureDetection.supportsTypedArrays()) {
      return;
    }

    const array = new Uint8Array([1, 2, 3, 4, 5]);
    const slice = arraySlice(array);
    expect(slice).toEqual(array);
  });

  it("throws if begin is not a number", function () {
    expect(function () {
      return arraySlice(array, {});
    }).toThrowDeveloperError();
  });

  it("throws if end is not a number", function () {
    expect(function () {
      return arraySlice(array, undefined, {});
    }).toThrowDeveloperError();
  });
});
