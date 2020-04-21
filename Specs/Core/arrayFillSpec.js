import { arrayFill } from "../../Source/Cesium.js";

describe("Core/arrayFill", function () {
  var array;

  beforeEach(function () {
    array = [0, 0, 0, 0];
  });

  it("will fill an entire array", function () {
    arrayFill(array, 1);
    expect(array).toEqual([1, 1, 1, 1]);
  });

  it("will fill a portion of an array", function () {
    arrayFill(array, 1, 1, 3);
    expect(array).toEqual([0, 1, 1, 0]);
  });

  it("will wrap around negative values", function () {
    arrayFill(array, 1, -2, -1);
    expect(array).toEqual([0, 0, 1, 0]);
  });

  it("will fill until end if no end is provided", function () {
    arrayFill(array, 1, 1);
    expect(array).toEqual([0, 1, 1, 1]);
  });

  it("will throw an error if no array is provided", function () {
    expect(function () {
      arrayFill(undefined, 1, 0, 1);
    }).toThrowDeveloperError("array is required.");
  });

  it("will throw an error if no array is provided", function () {
    expect(function () {
      arrayFill(array, undefined, 0, 1);
    }).toThrowDeveloperError("value is required.");
  });

  it("will throw an error if given an invalid start index", function () {
    expect(function () {
      arrayFill(array, 1, array, 1);
    }).toThrowDeveloperError("start must be a valid index.");
  });

  it("will throw an error if given an invalid end index", function () {
    expect(function () {
      arrayFill(array, 1, 1, array);
    }).toThrowDeveloperError("end must be a valid index.");
  });
});
