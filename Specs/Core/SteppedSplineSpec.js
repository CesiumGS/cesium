import { Cartesian3 } from "../../Source/Cesium.js";
import { SteppedSpline } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";

describe("Core/SteppedSpline", function () {
  let times;

  let cartesianPoints;
  let numberPoints;
  let quaternionPoints;

  beforeEach(function () {
    times = [0.0, 1.0, 2.0, 3.0];
    cartesianPoints = [
      new Cartesian3(-1.0, -1.0, 0.0),
      new Cartesian3(-0.5, -0.125, 0.0),
      new Cartesian3(0.5, 0.125, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
    ];
    numberPoints = [10.0, -5.0, 8.0, 3.0];
    quaternionPoints = [
      new Quaternion(0.0, 0.0, 0.0, 0.0),
      new Quaternion(0.707, 0.0, 0.707, 0.0),
      new Quaternion(0.5, 0.5, 0.5, 0.5),
      new Quaternion(0.0, 0.0, 0.0, 1.0),
    ];
  });

  it("constructor throws without times or points", function () {
    expect(function () {
      return new SteppedSpline();
    }).toThrowDeveloperError();
  });

  it("constructor throws when control points length is less than 2", function () {
    expect(function () {
      return new SteppedSpline({
        points: [Cartesian3.ZERO],
        times: [0.0],
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws when times.length is not equal to points.length", function () {
    expect(function () {
      return new SteppedSpline({
        points: numberPoints,
        times: [0.0, 1.0],
      });
    }).toThrowDeveloperError();
  });

  it("evaluate throws without time", function () {
    const spline = new SteppedSpline({
      points: numberPoints,
      times: times,
    });

    expect(function () {
      spline.evaluate();
    }).toThrowDeveloperError();
  });

  it("evaluate throws when time is out of range", function () {
    const spline = new SteppedSpline({
      points: numberPoints,
      times: times,
    });

    expect(function () {
      spline.evaluate(times[0] - 1.0);
    }).toThrowDeveloperError();
  });

  it("evaluate returns cartesian3 value without result parameter", function () {
    const spline = new SteppedSpline({
      points: cartesianPoints,
      times: times,
    });

    let returnedValue = spline.evaluate(times[0]);
    expect(returnedValue).toEqual(cartesianPoints[0]);

    returnedValue = spline.evaluate(times[1]);
    expect(returnedValue).toEqual(cartesianPoints[1]);

    const time = (times[0] + times[1]) / 2.0;
    returnedValue = spline.evaluate(time);
    expect(returnedValue).toEqual(cartesianPoints[0]);
  });

  it("evaluate returns cartesian3 value with result parameter", function () {
    const spline = new SteppedSpline({
      points: cartesianPoints,
      times: times,
    });

    const result = new Cartesian3();

    const time = (times[1] + times[2]) / 2.0;
    const returnedValue = spline.evaluate(time, result);
    expect(returnedValue).toBe(result);
    expect(returnedValue).toEqual(cartesianPoints[1]);
  });

  it("evaluate returns quaternion value without result parameter", function () {
    const spline = new SteppedSpline({
      points: quaternionPoints,
      times: times,
    });

    let returnedValue = spline.evaluate(times[0]);
    expect(returnedValue).toEqual(quaternionPoints[0]);

    returnedValue = spline.evaluate(times[1]);
    expect(returnedValue).toEqual(quaternionPoints[1]);

    const time = (times[0] + times[1]) / 2.0;
    returnedValue = spline.evaluate(time);
    expect(returnedValue).toEqual(quaternionPoints[0]);
  });

  it("evaluate returns quaternion value with result parameter", function () {
    const spline = new SteppedSpline({
      points: quaternionPoints,
      times: times,
    });

    const result = new Quaternion();

    const time = (times[1] + times[2]) / 2.0;
    const returnedValue = spline.evaluate(time, result);
    expect(returnedValue).toBe(result);
    expect(returnedValue).toEqual(quaternionPoints[1]);
  });
});
