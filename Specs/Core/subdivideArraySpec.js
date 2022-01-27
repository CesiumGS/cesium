import { subdivideArray } from "../../Source/Cesium.js";

describe("Core/subdivideArray", function () {
  it("Splits evenly divided arrays", function () {
    const values = [1, 2, 3, 4];
    const splitValues = subdivideArray(values, 4);
    expect(splitValues.length).toEqual(4);
    expect(splitValues[0]).toEqual([1]);
    expect(splitValues[1]).toEqual([2]);
    expect(splitValues[2]).toEqual([3]);
    expect(splitValues[3]).toEqual([4]);
  });

  it("Splits unevenly divided arrays", function () {
    const values = [1, 2, 3, 4, 5, 6];
    const splitValues = subdivideArray(values, 4);
    expect(splitValues.length).toEqual(4);
    expect(splitValues[0]).toEqual([1, 2]);
    expect(splitValues[1]).toEqual([3, 4]);
    expect(splitValues[2]).toEqual([5]);
    expect(splitValues[3]).toEqual([6]);
  });

  it("Works with empty arrays", function () {
    const splitValues = subdivideArray([], 4);
    expect(splitValues.length).toEqual(0);
  });

  it("Throws with undefined array", function () {
    expect(function () {
      subdivideArray(undefined, 8);
    }).toThrowDeveloperError();
  });

  it("Throws with invalid number of arrays", function () {
    expect(function () {
      subdivideArray([], -1);
    }).toThrowDeveloperError();
  });
});
