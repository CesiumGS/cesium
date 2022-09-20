import {
  Cartesian3,
  HermiteSpline,
  Spline,
  Quaternion,
} from "../../index.js";;

describe("Core/Spline", function () {
  it("contructor throws", function () {
    expect(function () {
      return new Spline();
    }).toThrowDeveloperError();
  });

  it("wraps time that is out-of-bounds", function () {
    const spline = HermiteSpline.createNaturalCubic({
      points: [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
      times: [0.0, 1.0, 2.0],
    });

    expect(spline.wrapTime(-0.5)).toEqual(1.5);
    expect(spline.wrapTime(2.5)).toEqual(0.5);
  });

  it("clamps time that is out-of-bounds", function () {
    const spline = HermiteSpline.createNaturalCubic({
      points: [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
      times: [0.0, 1.0, 2.0],
    });

    expect(spline.clampTime(-0.5)).toEqual(0.0);
    expect(spline.clampTime(2.5)).toEqual(2.0);
  });

  it("wrapTime throws without a time", function () {
    const spline = HermiteSpline.createNaturalCubic({
      points: [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
      times: [0.0, 1.0, 2.0],
    });

    expect(function () {
      spline.wrapTime();
    }).toThrowDeveloperError();
  });

  it("clampTime throws without a time", function () {
    const spline = HermiteSpline.createNaturalCubic({
      points: [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
      times: [0.0, 1.0, 2.0],
    });

    expect(function () {
      spline.clampTime();
    }).toThrowDeveloperError();
  });

  it("findTimeInterval throws without a time", function () {
    const spline = HermiteSpline.createNaturalCubic({
      points: [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
      times: [0.0, 1.0, 2.0],
    });

    expect(function () {
      spline.findTimeInterval();
    }).toThrowDeveloperError();
  });

  it("findTimeInterval throws when time is out of range", function () {
    const spline = HermiteSpline.createNaturalCubic({
      points: [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
      times: [0.0, 1.0, 2.0],
    });

    expect(function () {
      spline.findTimeInterval(4.0);
    }).toThrowDeveloperError();
  });

  it("findTimeInterval", function () {
    const spline = HermiteSpline.createNaturalCubic({
      points: [
        Cartesian3.ZERO,
        Cartesian3.UNIT_X,
        Cartesian3.UNIT_Y,
        Cartesian3.UNIT_Z,
      ],
      times: [0.0, 1.0, 2.0, 4.0],
    });
    const times = spline.times;

    expect(spline.findTimeInterval(times[0])).toEqual(0);

    // jump forward
    expect(spline.findTimeInterval(times[1])).toEqual(1);

    // jump backward
    expect(spline.findTimeInterval(times[0], 1)).toEqual(0);

    // jump far forward
    expect(spline.findTimeInterval(times[times.length - 2], 0)).toEqual(
      times.length - 2
    );

    // jump far back
    expect(spline.findTimeInterval(times[0], times.length - 1)).toEqual(0);
  });

  it("getPointType throws for invalid point type", function () {
    expect(function () {
      Spline.getPointType({});
    }).toThrowDeveloperError();
  });

  it("getPointType", function () {
    expect(Spline.getPointType(1.0)).toEqual(Number);
    expect(Spline.getPointType(new Cartesian3())).not.toThrowDeveloperError();
    expect(Spline.getPointType(new Quaternion())).not.toThrowDeveloperError();
  });
});
