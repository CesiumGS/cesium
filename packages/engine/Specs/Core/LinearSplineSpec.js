import { Cartesian3, LinearSpline } from "../../index.js";;

describe("Core/LinearSpline", function () {
  let times;

  let cartesianPoints;
  let numberPoints;

  beforeEach(function () {
    times = [0.0, 1.0, 2.0, 3.0];
    cartesianPoints = [
      new Cartesian3(-1.0, -1.0, 0.0),
      new Cartesian3(-0.5, -0.125, 0.0),
      new Cartesian3(0.5, 0.125, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
    ];

    numberPoints = [3.0, 5.0, 1.0, 10.0];
  });

  it("constructor throws without points or times", function () {
    expect(function () {
      return new LinearSpline();
    }).toThrowDeveloperError();
  });

  it("constructor throws when control points length is less than 2", function () {
    expect(function () {
      return new LinearSpline({
        points: [Cartesian3.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws when times.length is not equal to points.length", function () {
    expect(function () {
      return new LinearSpline({
        points: numberPoints,
        times: [0.0, 1.0],
      });
    }).toThrowDeveloperError();
  });

  it("evaluate throws without time", function () {
    const ls = new LinearSpline({
      points: numberPoints,
      times: times,
    });

    expect(function () {
      ls.evaluate();
    }).toThrowDeveloperError();
  });

  it("evaluate throws when time is out of range", function () {
    const ls = new LinearSpline({
      points: numberPoints,
      times: times,
    });

    expect(function () {
      ls.evaluate(times[0] - 1.0);
    }).toThrowDeveloperError();
  });

  it("evaluate returns number value", function () {
    const ls = new LinearSpline({
      points: numberPoints,
      times: times,
    });

    expect(ls.evaluate(times[0])).toEqual(numberPoints[0]);

    const time = (times[0] + times[1]) / 2.0;
    const t = (time - times[0]) / (times[1] - times[0]);
    const expected = (1.0 - t) * numberPoints[0] + t * numberPoints[1];
    expect(ls.evaluate(time)).toEqual(expected);
  });

  const scratchCartesian = new Cartesian3();

  it("evaluate returns cartesian3 value without result parameter", function () {
    const ls = new LinearSpline({
      points: cartesianPoints,
      times: times,
    });

    expect(ls.evaluate(times[0])).toEqual(cartesianPoints[0]);

    const time = (times[0] + times[1]) / 2.0;
    const t = (time - times[0]) / (times[1] - times[0]);
    const expected = Cartesian3.lerp(
      cartesianPoints[0],
      cartesianPoints[1],
      t,
      scratchCartesian
    );
    expect(ls.evaluate(time)).toEqual(expected);
  });

  it("evaluate returns cartesian3 value with result parameter", function () {
    const ls = new LinearSpline({
      points: cartesianPoints,
      times: times,
    });
    const result = new Cartesian3();

    const time = (times[0] + times[1]) / 2.0;
    const t = (time - times[0]) / (times[1] - times[0]);
    const point = ls.evaluate(time, result);
    const expected = Cartesian3.lerp(
      cartesianPoints[0],
      cartesianPoints[1],
      t,
      scratchCartesian
    );
    expect(point).toBe(result);
    expect(result).toEqual(expected);
  });
});
