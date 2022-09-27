import {
  Cartesian2,
  Cartesian3,
  Ellipsoid,
  EllipsoidTangentPlane,
} from "../../index.js";

describe("Core/EllipsoidTangentPlane", function () {
  it("constructor defaults to WGS84", function () {
    const origin = new Cartesian3(Ellipsoid.WGS84.radii.x, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin);
    expect(tangentPlane.ellipsoid).toBe(Ellipsoid.WGS84);
    expect(tangentPlane.origin).toEqual(origin);
  });

  it("constructor sets expected values", function () {
    const tangentPlane = new EllipsoidTangentPlane(
      Cartesian3.UNIT_X,
      Ellipsoid.UNIT_SPHERE
    );
    expect(tangentPlane.ellipsoid).toBe(Ellipsoid.UNIT_SPHERE);
    expect(tangentPlane.origin).toEqual(Cartesian3.UNIT_X);
  });

  it("fromPoints sets expected values", function () {
    const points = [
      new Cartesian3(2.0, 0.0, 0.0),
      new Cartesian3(0.0, 0.0, 0.0),
    ];
    const tangentPlane = EllipsoidTangentPlane.fromPoints(
      points,
      Ellipsoid.UNIT_SPHERE
    );
    expect(tangentPlane.ellipsoid).toBe(Ellipsoid.UNIT_SPHERE);
    expect(tangentPlane.origin).toEqual(Cartesian3.UNIT_X);
  });

  it("projectPointOntoPlane returns undefined for unsolvable projections", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);
    const positions = new Cartesian3(0.0, 0.0, 1.0);
    const returnedResult = tangentPlane.projectPointOntoPlane(positions);
    expect(returnedResult).toBeUndefined();
  });

  it("projectPointOntoPlane works without a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = new Cartesian3(1.0, 0.0, 1.0);
    const expectedResult = new Cartesian2(0.0, 1.0);
    const returnedResult = tangentPlane.projectPointOntoPlane(positions);
    expect(returnedResult).toEqual(expectedResult);
  });

  it("projectPointOntoPlane works with a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = new Cartesian3(1.0, 0.0, 1.0);
    const expectedResult = new Cartesian2(0.0, 1.0);
    const result = new Cartesian2();
    const returnedResult = tangentPlane.projectPointOntoPlane(
      positions,
      result
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqual(expectedResult);
  });

  it("projectPointsOntoPlane works without a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = [
      new Cartesian3(1.0, 0.0, 1.0),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
    ];
    const expectedResults = [
      new Cartesian2(0.0, 1.0),
      new Cartesian2(0.0, 0.0),
      new Cartesian2(1.0, 0.0),
    ];
    const returnedResults = tangentPlane.projectPointsOntoPlane(positions);
    expect(returnedResults).toEqual(expectedResults);
  });

  it("projectPointsOntoPlane works with a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = [
      new Cartesian3(1.0, 0.0, 1.0),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
    ];
    const expectedResults = [
      new Cartesian2(0.0, 1.0),
      new Cartesian2(0.0, 0.0),
      new Cartesian2(1.0, 0.0),
    ];

    const index0 = new Cartesian2();
    const result = [index0];
    const returnedResults = tangentPlane.projectPointsOntoPlane(
      positions,
      result
    );
    expect(result).toBe(returnedResults);
    expect(result[0]).toBe(index0);
    expect(returnedResults).toEqual(expectedResults);
  });

  it("projectPointsOntoPlane works when some points cannot be projected", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = [
      new Cartesian3(1.0, 0.0, 1.0),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 0.0, 1.0),
      new Cartesian3(1.0, 1.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
    ];
    const expectedResults = [
      new Cartesian2(0.0, 1.0),
      new Cartesian2(0.0, 0.0),
      new Cartesian2(1.0, 0.0),
    ];
    const returnedResults = tangentPlane.projectPointsOntoPlane(positions);
    expect(returnedResults).toEqual(expectedResults);
  });

  it("projectPointOntoEllipsoid works without a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const position = new Cartesian3(2.0, 2.0, 0.0);
    const expectedResult = new Cartesian3(1.0 / 3.0, 2.0 / 3.0, 2.0 / 3.0);
    const returnedResult = tangentPlane.projectPointOntoEllipsoid(position);
    expect(returnedResult).toEqual(expectedResult);
  });

  it("projectPointOntoEllipsoid works with a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const position = new Cartesian3(2.0, -2.0, 0.0);
    const expectedResult = new Cartesian3(1.0 / 3.0, 2.0 / 3.0, -2.0 / 3.0);
    const result = new Cartesian3();
    const returnedResult = tangentPlane.projectPointOntoEllipsoid(
      position,
      result
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqual(expectedResult);
  });

  it("projectPointsOntoEllipsoid works without a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = [
      new Cartesian3(2.0, -2.0, 0.0),
      new Cartesian3(2.0, 2.0, 0.0),
    ];
    const expectedResults = [
      new Cartesian3(1.0 / 3.0, 2.0 / 3.0, -2.0 / 3.0),
      new Cartesian3(1.0 / 3.0, 2.0 / 3.0, 2.0 / 3.0),
    ];
    const returnedResults = tangentPlane.projectPointsOntoEllipsoid(positions);
    expect(returnedResults).toEqual(expectedResults);
  });

  it("projectPointsOntoEllipsoid works with a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = [
      new Cartesian3(2.0, -2.0, 0.0),
      new Cartesian3(2.0, 2.0, 0.0),
    ];
    const expectedResults = [
      new Cartesian3(1.0 / 3.0, 2.0 / 3.0, -2.0 / 3.0),
      new Cartesian3(1.0 / 3.0, 2.0 / 3.0, 2.0 / 3.0),
    ];
    const index0 = new Cartesian3();
    const result = [index0];
    const returnedResults = tangentPlane.projectPointsOntoEllipsoid(
      positions,
      result
    );
    expect(result).toBe(returnedResults);
    expect(result[0]).toBe(index0);
    expect(returnedResults).toEqual(expectedResults);
  });

  it("projectPointToNearestOnPlane works without a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = new Cartesian3(1.0, 0.0, 1.0);
    const expectedResult = new Cartesian2(0.0, 1.0);
    const returnedResult = tangentPlane.projectPointToNearestOnPlane(positions);
    expect(returnedResult).toEqual(expectedResult);
  });

  it("projectPointToNearestOnPlane works projecting from various distances", function () {
    const ellipsoid = Ellipsoid.ZERO;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    expect(
      tangentPlane.projectPointToNearestOnPlane(new Cartesian3(2.0, 0.0, 0.0))
    ).toEqual(new Cartesian2(0.0, 0.0));
    expect(
      tangentPlane.projectPointToNearestOnPlane(new Cartesian3(1.0, 0.0, 0.0))
    ).toEqual(new Cartesian2(0.0, 0.0));
    expect(
      tangentPlane.projectPointToNearestOnPlane(new Cartesian3(0.0, 0.0, 0.0))
    ).toEqual(new Cartesian2(0.0, 0.0));
    expect(
      tangentPlane.projectPointToNearestOnPlane(new Cartesian3(-1.0, 0.0, 0.0))
    ).toEqual(new Cartesian2(0.0, 0.0));
  });

  it("projectPointToNearestOnPlane works with a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = new Cartesian3(1.0, 0.0, 1.0);
    const expectedResult = new Cartesian2(0.0, 1.0);
    const result = new Cartesian2();
    const returnedResult = tangentPlane.projectPointToNearestOnPlane(
      positions,
      result
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqual(expectedResult);
  });

  it("projectPointsToNearestOnPlane works without a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = [
      new Cartesian3(1.0, 0.0, 1.0),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
    ];
    const expectedResults = [
      new Cartesian2(0.0, 1.0),
      new Cartesian2(0.0, 0.0),
      new Cartesian2(1.0, 0.0),
    ];
    const returnedResults = tangentPlane.projectPointsToNearestOnPlane(
      positions
    );
    expect(returnedResults).toEqual(expectedResults);
  });

  it("projectPointsToNearestOnPlane works with a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

    const positions = [
      new Cartesian3(1.0, 0.0, 1.0),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
    ];
    const expectedResults = [
      new Cartesian2(0.0, 1.0),
      new Cartesian2(0.0, 0.0),
      new Cartesian2(1.0, 0.0),
    ];

    const index0 = new Cartesian2();
    const result = [index0];
    const returnedResults = tangentPlane.projectPointsToNearestOnPlane(
      positions,
      result
    );
    expect(result).toBe(returnedResults);
    expect(result[0]).toBe(index0);
    expect(returnedResults).toEqual(expectedResults);
  });

  it("constructor throws without origin", function () {
    expect(function () {
      return new EllipsoidTangentPlane(undefined, Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("constructor throws if origin is at the center of the ellipsoid", function () {
    expect(function () {
      return new EllipsoidTangentPlane(Cartesian3.ZERO, Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("fromPoints throws without cartesians", function () {
    expect(function () {
      return EllipsoidTangentPlane.fromPoints(undefined, Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("projectPointOntoPlane throws without cartesian", function () {
    const tangentPlane = new EllipsoidTangentPlane(
      Cartesian3.UNIT_X,
      Ellipsoid.UNIT_SPHERE
    );
    expect(function () {
      return tangentPlane.projectPointOntoPlane(undefined);
    }).toThrowDeveloperError();
  });

  it("projectPointsOntoPlane throws without cartesians", function () {
    const tangentPlane = new EllipsoidTangentPlane(
      Cartesian3.UNIT_X,
      Ellipsoid.UNIT_SPHERE
    );
    expect(function () {
      return tangentPlane.projectPointsOntoPlane(undefined);
    }).toThrowDeveloperError();
  });

  it("projectPointToNearestOnPlane throws without cartesian", function () {
    const tangentPlane = new EllipsoidTangentPlane(
      Cartesian3.UNIT_X,
      Ellipsoid.UNIT_SPHERE
    );
    expect(function () {
      return tangentPlane.projectPointToNearestOnPlane(undefined);
    }).toThrowDeveloperError();
  });

  it("projectPointsToNearestOnPlane throws without cartesians", function () {
    const tangentPlane = new EllipsoidTangentPlane(
      Cartesian3.UNIT_X,
      Ellipsoid.UNIT_SPHERE
    );
    expect(function () {
      return tangentPlane.projectPointsToNearestOnPlane(undefined);
    }).toThrowDeveloperError();
  });

  it("projectPointsOntoEllipsoid throws without cartesians", function () {
    const tangentPlane = new EllipsoidTangentPlane(
      Cartesian3.UNIT_X,
      Ellipsoid.UNIT_SPHERE
    );
    expect(function () {
      return tangentPlane.projectPointsOntoEllipsoid(undefined);
    }).toThrowDeveloperError();
  });

  it("projectPointsOntoEllipsoid works with an arbitrary ellipsoid using fromPoints", function () {
    const points = Cartesian3.fromDegreesArray([
      -72.0,
      40.0,
      -68.0,
      35.0,
      -75.0,
      30.0,
      -70.0,
      30.0,
      -68.0,
      40.0,
    ]);

    const tangentPlane = EllipsoidTangentPlane.fromPoints(
      points,
      Ellipsoid.WGS84
    );
    const points2D = tangentPlane.projectPointsOntoPlane(points);
    const positionsBack = tangentPlane.projectPointsOntoEllipsoid(points2D);

    expect(positionsBack[0].x).toBeCloseTo(points[0].x);
    expect(positionsBack[0].y).toBeCloseTo(points[0].y);
    expect(positionsBack[0].z).toBeCloseTo(points[0].z);
  });
});
