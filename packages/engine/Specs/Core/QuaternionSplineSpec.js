import { Cartesian3, Quaternion, QuaternionSpline } from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

describe("Core/QuaternionSpline", function () {
  let points;
  let times;

  beforeEach(function () {
    points = [
      Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR),
      Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR),
      Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -CesiumMath.PI_OVER_FOUR),
      Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, CesiumMath.PI_OVER_FOUR),
    ];
    times = [0.0, 1.0, 2.0, 3.0];
  });

  it("constructor throws without points or times", function () {
    expect(function () {
      return new QuaternionSpline();
    }).toThrowDeveloperError();
  });

  it("constructor throws when control points length is less than 2", function () {
    expect(function () {
      return new QuaternionSpline({
        points: [Quaternion.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws when times.length is not equal to points.length", function () {
    expect(function () {
      return new QuaternionSpline({
        points: points,
        times: [0.0, 1.0],
      });
    }).toThrowDeveloperError();
  });

  it("evaluate throws without time", function () {
    const qs = new QuaternionSpline({
      points: points,
      times: times,
    });

    expect(function () {
      qs.evaluate();
    }).toThrowDeveloperError();
  });

  it("evaluate throws when time is out of range", function () {
    const qs = new QuaternionSpline({
      points: points,
      times: times,
    });

    expect(function () {
      qs.evaluate(times[0] - 1.0);
    }).toThrowDeveloperError();
  });

  it("evaluate without result parameter", function () {
    const qs = new QuaternionSpline({
      points: points,
      times: times,
    });

    expect(qs.evaluate(times[0])).toEqual(points[0]);

    const time = (times[2] + times[1]) * 0.5;
    const t = (time - times[1]) / (times[2] - times[1]);

    const actual = qs.evaluate(time);
    const expected = Quaternion.slerp(
      points[1],
      points[2],
      t,
      new Quaternion()
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
  });

  it("evaluate with result parameter", function () {
    const qs = new QuaternionSpline({
      points: points,
      times: times,
    });
    const result = new Quaternion();

    const point = qs.evaluate(times[0], result);
    expect(point).toBe(result);
    expect(result).toEqual(points[0]);
  });

  it("spline with 2 control points defaults to slerp", function () {
    points = points.slice(0, 2);
    times = times.slice(0, 2);

    const qs = new QuaternionSpline({
      points: points,
      times: times,
    });

    const t = (times[0] + times[1]) * 0.5;
    const actual = qs.evaluate(t);
    const expected = Quaternion.slerp(
      points[0],
      points[1],
      t,
      new Quaternion()
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
  });

  it("spline with 2 control points defaults to slerp and result parameter", function () {
    points = points.slice(0, 2);
    times = times.slice(0, 2);

    const qs = new QuaternionSpline({
      points: points,
      times: times,
    });

    const t = (times[0] + times[1]) * 0.5;
    const result = new Cartesian3();
    const actual = qs.evaluate(t, result);
    const expected = Quaternion.slerp(
      points[0],
      points[1],
      t,
      new Quaternion()
    );
    expect(actual).toBe(result);
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
  });
});
