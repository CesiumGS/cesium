import { Cartesian3 } from "../../Source/Cesium.js";
import { HermiteSpline } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";

describe("Core/HermiteSpline", function () {
  var points;
  var times;

  beforeEach(function () {
    points = [
      new Cartesian3(-1.0, -1.0, 0.0),
      new Cartesian3(-0.5, -0.125, 0.0),
      new Cartesian3(0.5, 0.125, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
    ];
    times = [0.0, 1.0, 2.0, 3.0];
  });

  it("constructor throws without points, times or tangents", function () {
    expect(function () {
      return new HermiteSpline();
    }).toThrowDeveloperError();
  });

  it("constructor throws when control points length is less than 2", function () {
    expect(function () {
      return new HermiteSpline({
        points: [Cartesian3.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws when times.length is not equal to points.length", function () {
    expect(function () {
      return new HermiteSpline({
        points: points,
        times: [0.0, 1.0],
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws when inTangents or outTangents length is not equal to points.length - 1", function () {
    expect(function () {
      return new HermiteSpline({
        points: points,
        times: times,
        inTangents: [Cartesian3.ZERO],
        outTangents: [Cartesian3.UNIT_X],
      });
    }).toThrowDeveloperError();
  });

  // returns a function for a hermite curve between points p and q
  // with tangents pT and qT respectively on the interval [0, 1]
  function createHermiteBasis(p, pT, q, qT) {
    return function (u) {
      var a = 2.0 * u * u * u - 3.0 * u * u + 1.0;
      var b = -2.0 * u * u * u + 3.0 * u * u;
      var c = u * u * u - 2.0 * u * u + u;
      var d = u * u * u - u * u;

      var p0 = Cartesian3.multiplyByScalar(p, a, new Cartesian3());
      var p1 = Cartesian3.multiplyByScalar(q, b, new Cartesian3());
      var p2 = Cartesian3.multiplyByScalar(pT, c, new Cartesian3());
      var p3 = Cartesian3.multiplyByScalar(qT, d, new Cartesian3());

      return Cartesian3.add(
        Cartesian3.add(Cartesian3.add(p0, p1, p0), p2, p0),
        p3,
        p0
      );
    };
  }

  it("create spline", function () {
    var hs = new HermiteSpline({
      times: [0.0, 1.0, 3.0, 4.5, 6.0],
      points: [
        new Cartesian3(1235398.0, -4810983.0, 4146266.0),
        new Cartesian3(1372574.0, -5345182.0, 4606657.0),
        new Cartesian3(-757983.0, -5542796.0, 4514323.0),
        new Cartesian3(-2821260.0, -5248423.0, 4021290.0),
        new Cartesian3(-2539788.0, -4724797.0, 3620093.0),
      ],
      outTangents: [
        new Cartesian3(1125196, -161816, 270551),
        new Cartesian3(-996690.5, -365906.5, 184028.5),
        new Cartesian3(-2096917, 48379.5, -292683.5),
        new Cartesian3(-890902.5, 408999.5, -447115),
      ],
      inTangents: [
        new Cartesian3(-1993381, -731813, 368057),
        new Cartesian3(-4193834, 96759, -585367),
        new Cartesian3(-1781805, 817999, -894230),
        new Cartesian3(1165345, 112641, 47281),
      ],
    });

    var p0 = hs.points[0];
    var p1 = hs.points[1];
    var pT0 = hs.outTangents[0];
    var pT1 = hs.inTangents[0];
    var interpolate = createHermiteBasis(p0, pT0, p1, pT1);

    var granularity = 0.1;
    for (var i = 0.0; i < 1.0; i = i + granularity) {
      expect(hs.evaluate(i)).toEqualEpsilon(
        interpolate(i),
        CesiumMath.EPSILON3
      );
    }
  });

  it("createC1 throws without points", function () {
    expect(function () {
      return HermiteSpline.createC1();
    }).toThrowDeveloperError();
  });

  it("createC1 throws when control points length is less than 2", function () {
    expect(function () {
      return HermiteSpline.createC1({
        points: [Cartesian3.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("createC1 throws without times", function () {
    expect(function () {
      return HermiteSpline.createC1({
        points: points,
      });
    }).toThrowDeveloperError();
  });

  it("createC1 throws when times.length is not equal to points.length", function () {
    expect(function () {
      return HermiteSpline.createC1({
        points: points,
        times: [0.0, 1.0],
      });
    }).toThrowDeveloperError();
  });

  it("createC1 throws without tangents", function () {
    expect(function () {
      return HermiteSpline.createC1({
        points: points,
        times: times,
      });
    }).toThrowDeveloperError();
  });

  it("createC1 throws when tangents.length is not equal to times.length", function () {
    expect(function () {
      return HermiteSpline.createC1({
        points: points,
        times: times,
        tangents: [Cartesian3.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("C1 spline", function () {
    var times = [0.0, 1.0, 3.0, 4.5, 6.0];
    var points = [
      new Cartesian3(1235398.0, -4810983.0, 4146266.0),
      new Cartesian3(1372574.0, -5345182.0, 4606657.0),
      new Cartesian3(-757983.0, -5542796.0, 4514323.0),
      new Cartesian3(-2821260.0, -5248423.0, 4021290.0),
      new Cartesian3(-2539788.0, -4724797.0, 3620093.0),
    ];

    var tangents = new Array(points.length);
    tangents[0] = new Cartesian3(1125196, -161816, 270551);
    for (var i = 1; i < tangents.length - 1; ++i) {
      tangents[i] = Cartesian3.multiplyByScalar(
        Cartesian3.subtract(points[i + 1], points[i - 1], new Cartesian3()),
        0.5,
        new Cartesian3()
      );
    }
    tangents[tangents.length - 1] = new Cartesian3(1165345, 112641, 47281);

    var interpolate = createHermiteBasis(
      points[0],
      tangents[0],
      points[1],
      tangents[1]
    );
    var hs = HermiteSpline.createC1({
      times: times,
      points: points,
      tangents: tangents,
    });

    var granularity = 0.1;
    for (var j = times[0]; j < times[1]; j = j + granularity) {
      expect(hs.evaluate(j)).toEqualEpsilon(
        interpolate(j),
        CesiumMath.EPSILON3
      );
    }
  });

  it("createNaturalCubic throws without points", function () {
    expect(function () {
      return HermiteSpline.createNaturalCubic();
    }).toThrowDeveloperError();
  });

  it("createNaturalCubic throws when control points length is less than 2", function () {
    expect(function () {
      return HermiteSpline.createNaturalCubic({
        points: [Cartesian3.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("createNaturalCubic throws without times", function () {
    expect(function () {
      return HermiteSpline.createNaturalCubic({
        points: points,
      });
    }).toThrowDeveloperError();
  });

  it("createNaturalCubic throws when times.length is not equal to points.length", function () {
    expect(function () {
      return HermiteSpline.createNaturalCubic({
        points: points,
        times: [0.0, 1.0],
      });
    }).toThrowDeveloperError();
  });

  it("natural cubic spline", function () {
    points = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, CesiumMath.PI_OVER_TWO),
      new Cartesian3(-1.0, 0.0, Math.PI),
      new Cartesian3(0.0, -1.0, CesiumMath.THREE_PI_OVER_TWO),
    ];

    var p0Tangent = new Cartesian3(-0.87, 1.53, 1.57);
    var p1Tangent = new Cartesian3(-1.27, -0.07, 1.57);

    var interpolate = createHermiteBasis(
      points[0],
      p0Tangent,
      points[1],
      p1Tangent
    );
    var hs = HermiteSpline.createNaturalCubic({
      points: points,
      times: times,
    });

    var granularity = 0.1;
    for (var i = times[0]; i < times[1]; i = i + granularity) {
      expect(hs.evaluate(i)).toEqualEpsilon(
        interpolate(i),
        CesiumMath.EPSILON3
      );
    }
  });

  it("createClampedCubic throws without points", function () {
    expect(function () {
      return HermiteSpline.createClampedCubic();
    }).toThrowDeveloperError();
  });

  it("createClampedCubic throws when control points length is less than 2", function () {
    expect(function () {
      return HermiteSpline.createClampedCubic({
        points: [Cartesian3.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("createClampedCubic throws without times", function () {
    expect(function () {
      return HermiteSpline.createClampedCubic({
        points: points,
      });
    }).toThrowDeveloperError();
  });

  it("createClampedCubic throws when times.length is not equal to points.length", function () {
    expect(function () {
      return HermiteSpline.createClampedCubic({
        points: points,
        times: [0.0, 1.0],
      });
    }).toThrowDeveloperError();
  });

  it("createClampedCubic throws without firstTangent", function () {
    expect(function () {
      return HermiteSpline.createClampedCubic({
        points: points,
        times: times,
      });
    }).toThrowDeveloperError();
  });

  it("createClampedCubic throws without lastTangent", function () {
    expect(function () {
      return HermiteSpline.createClampedCubic({
        points: points,
        times: times,
        firstTangent: Cartesian3.ZERO,
      });
    }).toThrowDeveloperError();
  });

  it("clamped cubic spline", function () {
    points = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, CesiumMath.PI_OVER_TWO),
      new Cartesian3(-1.0, 0.0, Math.PI),
      new Cartesian3(0.0, -1.0, CesiumMath.THREE_PI_OVER_TWO),
    ];

    var firstTangent = new Cartesian3(0.0, 1.0, 0.0);
    var lastTangent = new Cartesian3(1.0, 0.0, 0.0);

    var p0Tangent = firstTangent;
    var p1Tangent = new Cartesian3(-1.53, 0.13, 1.88);

    var interpolate = createHermiteBasis(
      points[0],
      p0Tangent,
      points[1],
      p1Tangent
    );
    var hs = HermiteSpline.createClampedCubic({
      points: points,
      times: times,
      firstTangent: firstTangent,
      lastTangent: lastTangent,
    });

    var granularity = 0.1;
    for (var i = points[0].time; i < points[1].time; i = i + granularity) {
      expect(hs.evaluate(i)).toEqualEpsilon(
        interpolate(i),
        CesiumMath.EPSILON3
      );
    }
  });

  it("evaluate fails with undefined time", function () {
    var hs = HermiteSpline.createNaturalCubic({
      points: points,
      times: times,
    });
    expect(function () {
      hs.evaluate();
    }).toThrowDeveloperError();
  });

  it("evaluate fails with time out of range", function () {
    var hs = HermiteSpline.createNaturalCubic({
      points: points,
      times: times,
    });
    expect(function () {
      hs.evaluate(times[0] - 1.0);
    }).toThrowDeveloperError();
  });

  it("evaluate with result parameter", function () {
    var hs = HermiteSpline.createNaturalCubic({
      points: points,
      times: times,
    });
    var result = new Cartesian3();
    var point = hs.evaluate(times[0], result);
    expect(point).toBe(result);
    expect(result).toEqual(points[0]);
  });

  it("createNaturalCubic with 2 control points defaults to lerp", function () {
    points = points.slice(0, 2);
    times = times.slice(0, 2);

    var hs = HermiteSpline.createNaturalCubic({
      points: points,
      times: times,
    });

    var t = (times[0] + times[1]) * 0.5;
    expect(hs.evaluate(t)).toEqual(
      Cartesian3.lerp(points[0], points[1], t, new Cartesian3())
    );
  });

  it("createClampedCubic with 2 control points defaults to lerp", function () {
    points = points.slice(0, 2);
    times = times.slice(0, 2);

    var hs = HermiteSpline.createNaturalCubic({
      points: points,
      times: times,
    });

    var t = (times[0] + times[1]) * 0.5;
    expect(hs.evaluate(t)).toEqual(
      Cartesian3.lerp(points[0], points[1], t, new Cartesian3())
    );
  });
});
