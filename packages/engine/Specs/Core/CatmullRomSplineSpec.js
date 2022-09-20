import {
  Cartesian3,
  CatmullRomSpline,
  HermiteSpline,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/CatmullRomSpline", function () {
  let points;
  let times;

  beforeEach(function () {
    points = [
      new Cartesian3(-1.0, -1.0, 0.0),
      new Cartesian3(-0.5, -0.125, 0.0),
      new Cartesian3(0.5, 0.125, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
    ];
    times = [0.0, 1.0, 2.0, 3.0];
  });

  it("constructor throws without points or times", function () {
    expect(function () {
      return new CatmullRomSpline();
    }).toThrowDeveloperError();
  });

  it("constructor throws when control points length is less than 2", function () {
    expect(function () {
      return new CatmullRomSpline({
        points: [Cartesian3.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws when times.length is not equal to points.length", function () {
    expect(function () {
      return new CatmullRomSpline({
        points: points,
        times: [0.0, 1.0],
      });
    }).toThrowDeveloperError();
  });

  it("sets start and end tangents", function () {
    const start = Cartesian3.subtract(points[1], points[0], new Cartesian3());
    const end = Cartesian3.subtract(
      points[points.length - 1],
      points[points.length - 2],
      new Cartesian3()
    );
    const crs = new CatmullRomSpline({
      points: points,
      times: times,
      firstTangent: start,
      lastTangent: end,
    });

    expect(start).toEqual(crs.firstTangent);
    expect(end).toEqual(crs.lastTangent);
  });

  it("computes start and end tangents", function () {
    const controlPoint0 = Cartesian3.clone(points[0]);
    const controlPoint1 = Cartesian3.clone(points[1]);
    const controlPoint2 = Cartesian3.clone(points[2]);

    let start = new Cartesian3();
    start = Cartesian3.multiplyByScalar(
      Cartesian3.subtract(
        Cartesian3.subtract(
          Cartesian3.multiplyByScalar(controlPoint1, 2.0, start),
          controlPoint2,
          start
        ),
        controlPoint0,
        start
      ),
      0.5,
      start
    );

    const controlPointn0 = Cartesian3.clone(points[points.length - 1]);
    const controlPointn1 = Cartesian3.clone(points[points.length - 2]);
    const controlPointn2 = Cartesian3.clone(points[points.length - 3]);

    let end = new Cartesian3();
    end = Cartesian3.multiplyByScalar(
      Cartesian3.add(
        Cartesian3.subtract(
          controlPointn0,
          Cartesian3.multiplyByScalar(controlPointn1, 2.0, end),
          end
        ),
        controlPointn2,
        end
      ),
      0.5,
      end
    );

    const crs = new CatmullRomSpline({
      points: points,
      times: times,
    });

    expect(start).toEqual(crs.firstTangent);
    expect(end).toEqual(crs.lastTangent);
  });

  it("evaluate throws without time", function () {
    const crs = new CatmullRomSpline({
      points: points,
      times: times,
    });

    expect(function () {
      crs.evaluate();
    }).toThrowDeveloperError();
  });

  it("evaluate throws when time is out of range", function () {
    const crs = new CatmullRomSpline({
      points: points,
      times: times,
    });

    expect(function () {
      crs.evaluate(times[0] - 1.0);
    }).toThrowDeveloperError();
  });

  it("check Catmull-Rom spline against a Hermite spline", function () {
    const crs = new CatmullRomSpline({
      points: points,
      times: times,
    });

    const tangents = [crs.firstTangent];
    for (let i = 1; i < points.length - 1; ++i) {
      tangents.push(
        Cartesian3.multiplyByScalar(
          Cartesian3.subtract(points[i + 1], points[i - 1], new Cartesian3()),
          0.5,
          new Cartesian3()
        )
      );
    }
    tangents.push(crs.lastTangent);

    const hs = HermiteSpline.createC1({
      points: points,
      tangents: tangents,
      times: times,
    });

    const granularity = 0.5;
    for (let j = times[0]; j <= times[points.length - 1]; j = j + granularity) {
      expect(hs.evaluate(j)).toEqualEpsilon(
        crs.evaluate(j),
        CesiumMath.EPSILON4
      );
    }
  });

  it("evaluate with result parameter", function () {
    const crs = new CatmullRomSpline({
      points: points,
      times: times,
    });
    const result = new Cartesian3();

    const point = crs.evaluate(times[0], result);
    expect(point).toBe(result);
    expect(result).toEqual(points[0]);
  });

  it("spline with 2 control points defaults to lerp", function () {
    points = points.slice(0, 2);
    times = times.slice(0, 2);

    const crs = new CatmullRomSpline({
      points: points,
      times: times,
    });

    const t = (times[0] + times[1]) * 0.5;
    expect(crs.evaluate(t)).toEqual(
      Cartesian3.lerp(points[0], points[1], t, new Cartesian3())
    );
  });

  it("spline with 2 control points defaults to lerp and result parameter", function () {
    points = points.slice(0, 2);
    times = times.slice(0, 2);

    const crs = new CatmullRomSpline({
      points: points,
      times: times,
    });

    const t = (times[0] + times[1]) * 0.5;
    const result = new Cartesian3();
    const actual = crs.evaluate(t, result);
    expect(actual).toBe(result);
    expect(actual).toEqual(
      Cartesian3.lerp(points[0], points[1], t, new Cartesian3())
    );
  });
});
