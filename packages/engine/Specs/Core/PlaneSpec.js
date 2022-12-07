import {
  Cartesian3,
  Cartesian4,
  Matrix3,
  Matrix4,
  Plane,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

describe("Core/Plane", function () {
  it("constructs", function () {
    const normal = Cartesian3.UNIT_X;
    const distance = 1.0;
    const plane = new Plane(normal, distance);
    expect(plane.normal).toEqual(normal);
    expect(plane.distance).toEqual(distance);
  });

  it("constructor throws without a normal", function () {
    expect(function () {
      return new Plane(undefined, 0.0);
    }).toThrowDeveloperError();
  });

  it("constructor throws if normal is not normalized", function () {
    expect(function () {
      return new Plane(new Cartesian3(1.0, 2.0, 3.0), 0.0);
    }).toThrowDeveloperError();
  });

  it("constructor throws without a distance", function () {
    expect(function () {
      return new Plane(Cartesian3.UNIT_X, undefined);
    }).toThrowDeveloperError();
  });

  it("constructs from a point and a normal", function () {
    let normal = new Cartesian3(1.0, 2.0, 3.0);
    normal = Cartesian3.normalize(normal, normal);
    const point = new Cartesian3(4.0, 5.0, 6.0);
    const plane = Plane.fromPointNormal(point, normal);
    expect(plane.normal).toEqual(normal);
    expect(plane.distance).toEqual(-Cartesian3.dot(normal, point));
  });

  it("constructs from a point and a normal with result", function () {
    let normal = new Cartesian3(1.0, 2.0, 3.0);
    normal = Cartesian3.normalize(normal, normal);
    const point = new Cartesian3(4.0, 5.0, 6.0);

    const plane = new Plane(Cartesian3.UNIT_X, 0.0);
    Plane.fromPointNormal(point, normal, plane);

    expect(plane.normal).toEqual(normal);
    expect(plane.distance).toEqual(-Cartesian3.dot(normal, point));
  });

  it("constructs from a Cartesian4 without result", function () {
    const result = Plane.fromCartesian4(Cartesian4.UNIT_X);

    expect(result.normal).toEqual(Cartesian3.UNIT_X);
    expect(result.distance).toEqual(0.0);
  });

  it("constructs from a Cartesian4 with result", function () {
    const result = new Plane(Cartesian3.UNIT_X, 0.0);
    Plane.fromCartesian4(Cartesian4.UNIT_X, result);

    expect(result.normal).toEqual(Cartesian3.UNIT_X);
    expect(result.distance).toEqual(0.0);
  });

  it("fromPointNormal throws without a point", function () {
    expect(function () {
      return Plane.fromPointNormal(undefined, Cartesian3.UNIT_X);
    }).toThrowDeveloperError();
  });

  it("fromPointNormal throws without a normal", function () {
    expect(function () {
      return Plane.fromPointNormal(Cartesian3.UNIT_X, undefined);
    }).toThrowDeveloperError();
  });

  it("fromPointNormal throws if normal is not normalized", function () {
    expect(function () {
      return Plane.fromPointNormal(Cartesian3.ZERO, Cartesian3.ZERO);
    }).toThrowDeveloperError();
  });

  it("fromCartesian4 throws without coefficients", function () {
    expect(function () {
      return Plane.fromCartesian4(undefined);
    }).toThrowDeveloperError();
  });

  it("fromCartesian4 throws if normal is not normalized", function () {
    expect(function () {
      return Plane.fromCartesian4(new Cartesian4(1.0, 2.0, 3.0, 4.0));
    }).toThrowDeveloperError();
  });

  it("gets the distance to a point", function () {
    let normal = new Cartesian3(1.0, 2.0, 3.0);
    normal = Cartesian3.normalize(normal, normal);
    const plane = new Plane(normal, 12.34);
    const point = new Cartesian3(4.0, 5.0, 6.0);

    expect(Plane.getPointDistance(plane, point)).toEqual(
      Cartesian3.dot(plane.normal, point) + plane.distance
    );
  });

  it("getPointDistance throws without a plane", function () {
    const point = Cartesian3.ZERO;
    expect(function () {
      return Plane.getPointDistance(undefined, point);
    }).toThrowDeveloperError();
  });

  it("getPointDistance throws without a point", function () {
    const plane = new Plane(Cartesian3.UNIT_X, 0.0);
    expect(function () {
      return Plane.getPointDistance(plane, undefined);
    }).toThrowDeveloperError();
  });

  it("projects a point onto the plane", function () {
    let plane = new Plane(Cartesian3.UNIT_X, 0.0);
    const point = new Cartesian3(1.0, 1.0, 0.0);
    let result = Plane.projectPointOntoPlane(plane, point);
    expect(result).toEqual(new Cartesian3(0.0, 1.0, 0.0));

    plane = new Plane(Cartesian3.UNIT_Y, 0.0);
    result = Plane.projectPointOntoPlane(plane, point);
    expect(result).toEqual(new Cartesian3(1.0, 0.0, 0.0));
  });

  it("projectPointOntoPlane uses result parameter", function () {
    const plane = new Plane(Cartesian3.UNIT_X, 0.0);
    const point = new Cartesian3(1.0, 1.0, 0.0);
    const result = new Cartesian3();
    const returnedResult = Plane.projectPointOntoPlane(plane, point, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(new Cartesian3(0.0, 1.0, 0.0));
  });

  it("projectPointOntoPlane requires the plane and point parameters", function () {
    expect(function () {
      return Plane.projectPointOntoPlane(
        new Plane(Cartesian3.UNIT_X, 0),
        undefined
      );
    }).toThrowDeveloperError();

    expect(function () {
      return Plane.projectPointOntoPlane(undefined, new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("clone throws without a plane", function () {
    expect(function () {
      Plane.clone(undefined);
    }).toThrowDeveloperError();
  });

  it("clones a plane instance", function () {
    let normal = new Cartesian3(1.0, 2.0, 3.0);
    normal = Cartesian3.normalize(normal, normal);
    const distance = 4.0;
    const plane = new Plane(normal, distance);

    const result = Plane.clone(plane);
    expect(result.normal).toEqual(normal);
    expect(result.distance).toEqual(distance);
  });

  it("clones a plane instance into a result parameter", function () {
    let normal = new Cartesian3(1.0, 2.0, 3.0);
    normal = Cartesian3.normalize(normal, normal);
    const distance = 4.0;
    const plane = new Plane(normal, distance);

    const result = new Plane(Cartesian3.UNIT_X, 1.0);

    Plane.clone(plane, result);
    expect(result.normal).toEqual(normal);
    expect(result.distance).toEqual(distance);
  });

  it("equals returns true only if two planes are equal by normal and distance", function () {
    const left = new Plane(Cartesian3.UNIT_X, 0.0);
    const right = new Plane(Cartesian3.UNIT_Y, 1.0);

    expect(Plane.equals(left, right)).toBe(false);

    right.distance = 0.0;

    expect(Plane.equals(left, right)).toBe(false);

    right.normal = Cartesian3.UNIT_X;

    expect(Plane.equals(left, right)).toBe(true);

    right.distance = 1.0;

    expect(Plane.equals(left, right)).toBe(false);
  });

  it("equals throws developer error is left is undefined", function () {
    const plane = new Plane(Cartesian3.UNIT_X, 0.0);
    expect(function () {
      return Plane.equals(undefined, plane);
    }).toThrowDeveloperError();
  });

  it("equals throws developer error is right is undefined", function () {
    const plane = new Plane(Cartesian3.UNIT_X, 0.0);
    expect(function () {
      return Plane.equals(plane, undefined);
    }).toThrowDeveloperError();
  });

  it("transforms a plane according to a transform", function () {
    let normal = new Cartesian3(1.0, 2.0, 3.0);
    normal = Cartesian3.normalize(normal, normal);
    const plane = new Plane(normal, 12.34);

    let transform = Matrix4.fromUniformScale(2.0);
    transform = Matrix4.multiplyByMatrix3(
      transform,
      Matrix3.fromRotationY(Math.PI),
      transform
    );

    const transformedPlane = Plane.transform(plane, transform);
    expect(transformedPlane.distance).toEqual(plane.distance * 2.0);
    expect(transformedPlane.normal.x).toEqualEpsilon(
      -plane.normal.x,
      CesiumMath.EPSILON10
    );
    expect(transformedPlane.normal.y).toEqual(plane.normal.y);
    expect(transformedPlane.normal.z).toEqual(-plane.normal.z);
  });

  it("transforms a plane according to a non-uniform scale transform", function () {
    let normal = new Cartesian3(1.0, 0.0, 1.0);
    normal = Cartesian3.normalize(normal, normal);
    const plane = new Plane(normal, 0.0);
    const planeOrigin = new Cartesian3(0.0, 0.0, 0.0);
    const planePosition = new Cartesian3(1.0, 0.0, -1.0);
    const planeDiff = Cartesian3.subtract(
      planePosition,
      planeOrigin,
      new Cartesian3()
    );
    expect(Cartesian3.dot(planeDiff, plane.normal)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON16
    );

    const transform = Matrix4.fromScale(
      new Cartesian3(4.0, 1.0, 10.0),
      new Matrix4()
    );
    const transformPlane = Plane.transform(plane, transform);
    const transformPlaneDiff = Matrix4.multiplyByPointAsVector(
      transform,
      planeDiff,
      new Cartesian3()
    );
    expect(
      Cartesian3.dot(transformPlaneDiff, transformPlane.normal)
    ).toEqualEpsilon(0.0, CesiumMath.EPSILON16);
  });

  it("transform throws without a plane", function () {
    const transform = Matrix4.IDENTITY;
    expect(function () {
      return Plane.transform(undefined, transform);
    }).toThrowDeveloperError();
  });

  it("transform throws without a transform", function () {
    const plane = new Plane(Cartesian3.UNIT_X, 0.0);
    expect(function () {
      return Plane.transform(plane, undefined);
    }).toThrowDeveloperError();
  });
});
