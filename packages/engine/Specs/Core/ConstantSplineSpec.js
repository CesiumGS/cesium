import { Cartesian3, ConstantSpline, Quaternion } from "../../index.js";

describe("Core/ConstantSpline", function () {
  it("constructor throws without value", function () {
    expect(function () {
      return new ConstantSpline();
    }).toThrowDeveloperError();
  });

  it("constructor throws with invalid value type", function () {
    expect(function () {
      return new ConstantSpline({});
    }).toThrowDeveloperError();
  });

  it("value returns the input value", function () {
    const value = new Cartesian3(1.0, 2.0, 3.0);
    const spline = new ConstantSpline(value);

    expect(spline.value).toBe(value);
  });

  it("wrapTime returns constant value", function () {
    const spline = new ConstantSpline(10.0);

    expect(spline.wrapTime(-0.5)).toEqual(0.0);
    expect(spline.wrapTime(2.5)).toEqual(0.0);
  });

  it("clampTime returns constant value", function () {
    const spline = new ConstantSpline(10.0);

    expect(spline.clampTime(-0.5)).toEqual(0.0);
    expect(spline.clampTime(2.5)).toEqual(0.0);
  });

  it("wrapTime throws without a time", function () {
    const spline = new ConstantSpline(10.0);

    expect(function () {
      spline.wrapTime();
    }).toThrowDeveloperError();
  });

  it("clampTime throws without a time", function () {
    const spline = new ConstantSpline(10.0);

    expect(function () {
      spline.clampTime();
    }).toThrowDeveloperError();
  });

  it("findTimeInterval throws", function () {
    const spline = new ConstantSpline(10.0);

    expect(function () {
      spline.findTimeInterval(0.0);
    }).toThrowDeveloperError();
  });

  it("evaluate throws without time", function () {
    const spline = new ConstantSpline(10.0);

    expect(function () {
      spline.evaluate();
    }).toThrowDeveloperError();
  });

  it("evaluate returns number value", function () {
    const value = 10.0;
    const spline = new ConstantSpline(value);

    expect(spline.evaluate(0.0)).toEqual(value);
  });

  it("evaluate returns cartesian3 value", function () {
    const value = new Cartesian3(1.0, 2.0, 3.0);
    const spline = new ConstantSpline(value);

    const returnedValue = spline.evaluate(0.0);
    expect(value).toEqual(returnedValue);
  });

  it("evaluate returns cartesian3 value with result parameter", function () {
    const value = new Cartesian3(1.0, 2.0, 3.0);
    const spline = new ConstantSpline(value);

    const result = new Cartesian3();
    const returnedValue = spline.evaluate(0.0, result);
    expect(returnedValue).toBe(result);
    expect(value).toEqual(returnedValue);
  });

  it("evaluate returns quaternion value", function () {
    const value = new Quaternion(0.707, 0.0, 0.707, 1.0);
    const spline = new ConstantSpline(value);

    const returnedValue = spline.evaluate(0.0);
    expect(value).toEqual(returnedValue);
  });

  it("evaluate returns quaternion value with result parameter", function () {
    const value = new Quaternion(0.707, 0.0, 0.707, 1.0);
    const spline = new ConstantSpline(value);

    const result = new Quaternion();
    const returnedValue = spline.evaluate(0.0, result);
    expect(returnedValue).toBe(result);
    expect(value).toEqual(returnedValue);
  });
});
