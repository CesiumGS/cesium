import { HeadingPitchRange } from "../../Source/Cesium.js";

describe("Core/HeadingPitchRange", function () {
  it("construct with default values", function () {
    const hpr = new HeadingPitchRange();
    expect(hpr.heading).toEqual(0.0);
    expect(hpr.pitch).toEqual(0.0);
    expect(hpr.range).toEqual(0.0);
  });

  it("construct with all values", function () {
    const hpr = new HeadingPitchRange(1.0, 2.0, 3.0);
    expect(hpr.heading).toEqual(1.0);
    expect(hpr.pitch).toEqual(2.0);
    expect(hpr.range).toEqual(3.0);
  });

  it("clone with a result parameter", function () {
    const hpr = new HeadingPitchRange(1.0, 2.0, 3.0);
    const result = new HeadingPitchRange();
    const returnedResult = HeadingPitchRange.clone(hpr, result);
    expect(hpr).not.toBe(result);
    expect(result).toBe(returnedResult);
    expect(hpr).toEqual(result);
  });

  it("clone works with a result parameter that is an input parameter", function () {
    const hpr = new HeadingPitchRange(1.0, 2.0, 3.0);
    const returnedResult = HeadingPitchRange.clone(hpr, hpr);
    expect(hpr).toBe(returnedResult);
  });
});
