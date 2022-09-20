import { Cartesian3, TridiagonalSystemSolver } from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/TridiagonalSystemSolver", function () {
  it("solve throws exception without lower diagonal", function () {
    expect(function () {
      TridiagonalSystemSolver.solve();
    }).toThrowDeveloperError();
  });

  it("solve throws exception without diagonal", function () {
    expect(function () {
      TridiagonalSystemSolver.solve([]);
    }).toThrowDeveloperError();
  });

  it("solve throws exception without upper diagonal", function () {
    expect(function () {
      TridiagonalSystemSolver.solve([], []);
    }).toThrowDeveloperError();
  });

  it("solve throws exception without rhs vector", function () {
    expect(function () {
      TridiagonalSystemSolver.solve([], [], []);
    }).toThrowDeveloperError();
  });

  it("solve throws exception when rhs vector length is not equal to diagonal length", function () {
    expect(function () {
      TridiagonalSystemSolver.solve([], [], [], [1]);
    }).toThrowDeveloperError();
  });

  it("solve throws exception when lower diagonal length is not equal to upper diagonal length", function () {
    expect(function () {
      TridiagonalSystemSolver.solve([1], [1], [], [1]);
    }).toThrowDeveloperError();
  });

  it("solve throws exception when lower/upper diagonal length is not one less than diagonal length", function () {
    expect(function () {
      TridiagonalSystemSolver.solve([1], [1], [1], [1]);
    }).toThrowDeveloperError();
  });

  it("solve three unknowns", function () {
    const l = [1.0, 1.0];
    const d = [-2.175, -2.15, -2.125];
    const u = [1.0, 1.0];
    const r = [
      new Cartesian3(-1.625),
      new Cartesian3(0.5),
      new Cartesian3(1.625),
    ];

    const expected = [
      new Cartesian3(0.552),
      new Cartesian3(-0.4244),
      new Cartesian3(-0.9644),
    ];
    const actual = TridiagonalSystemSolver.solve(l, d, u, r);

    expect(actual.length).toEqual(expected.length);
    expect(actual[0]).toEqualEpsilon(expected[0], CesiumMath.EPSILON4);
    expect(actual[1]).toEqualEpsilon(expected[1], CesiumMath.EPSILON4);
    expect(actual[2]).toEqualEpsilon(expected[2], CesiumMath.EPSILON4);
  });

  it("solve nine unknowns", function () {
    const l = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    const d = [
      -2.0304,
      -2.0288,
      -2.0272,
      -2.0256,
      -2.024,
      -2.0224,
      -2.0208,
      -2.0192,
      -2.0176,
    ];
    const u = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    const r = [
      new Cartesian3(-1.952),
      new Cartesian3(0.056),
      new Cartesian3(0.064),
      new Cartesian3(0.072),
      new Cartesian3(0.08),
      new Cartesian3(0.088),
      new Cartesian3(0.096),
      new Cartesian3(0.104),
      new Cartesian3(1.112),
    ];

    const expected = [
      new Cartesian3(1.3513),
      new Cartesian3(0.7918),
      new Cartesian3(0.311),
      new Cartesian3(-0.0974),
      new Cartesian3(-0.4362),
      new Cartesian3(-0.7055),
      new Cartesian3(-0.9025),
      new Cartesian3(-1.0224),
      new Cartesian3(-1.0579),
    ];
    const actual = TridiagonalSystemSolver.solve(l, d, u, r);

    expect(actual.length).toEqual(expected.length);
    expect(actual[0]).toEqualEpsilon(expected[0], CesiumMath.EPSILON4);
    expect(actual[1]).toEqualEpsilon(expected[1], CesiumMath.EPSILON4);
    expect(actual[2]).toEqualEpsilon(expected[2], CesiumMath.EPSILON4);
    expect(actual[3]).toEqualEpsilon(expected[3], CesiumMath.EPSILON4);
    expect(actual[4]).toEqualEpsilon(expected[4], CesiumMath.EPSILON4);
    expect(actual[5]).toEqualEpsilon(expected[5], CesiumMath.EPSILON4);
    expect(actual[6]).toEqualEpsilon(expected[6], CesiumMath.EPSILON4);
    expect(actual[7]).toEqualEpsilon(expected[7], CesiumMath.EPSILON4);
    expect(actual[8]).toEqualEpsilon(expected[8], CesiumMath.EPSILON4);
  });
});
