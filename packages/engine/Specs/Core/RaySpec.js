import { Cartesian3, Matrix4, Ray } from "../../index.js";

describe("Core/Ray", function () {
  it("default constructor create zero valued Ray", function () {
    const ray = new Ray();
    expect(ray.origin).toEqual(Cartesian3.ZERO);
    expect(ray.direction).toEqual(Cartesian3.ZERO);
  });

  it("constructor sets expected properties", function () {
    const origin = Cartesian3.UNIT_Y;
    const direction = Cartesian3.UNIT_X;
    const ray = new Ray(origin, direction);
    expect(ray.origin).toEqual(origin);
    expect(ray.direction).toEqual(direction);
  });

  it("constructor normalizes direction", function () {
    const origin = Cartesian3.UNIT_Y;
    const direction = Cartesian3.multiplyByScalar(
      Cartesian3.UNIT_X,
      18,
      new Cartesian3()
    );
    const ray = new Ray(origin, direction);
    expect(ray.origin).toEqual(origin);
    expect(ray.direction).toEqual(Cartesian3.UNIT_X);
  });

  it("clone without a result parameter", function () {
    const direction = Cartesian3.normalize(
      new Cartesian3(1, 2, 3),
      new Cartesian3()
    );
    const ray = new Ray(Cartesian3.UNIT_X, direction);
    const returnedResult = Ray.clone(ray);
    expect(ray).not.toBe(returnedResult);
    expect(ray.origin).not.toBe(returnedResult.origin);
    expect(ray.direction).not.toBe(returnedResult.direction);
    expect(ray).toEqual(returnedResult);
  });

  it("clone with a result parameter", function () {
    const direction = Cartesian3.normalize(
      new Cartesian3(1, 2, 3),
      new Cartesian3()
    );
    const ray = new Ray(Cartesian3.UNIT_X, direction);
    const result = new Ray();
    const returnedResult = Ray.clone(ray, result);
    expect(ray).not.toBe(result);
    expect(ray.origin).not.toBe(returnedResult.origin);
    expect(ray.direction).not.toBe(returnedResult.direction);
    expect(result).toBe(returnedResult);
    expect(ray).toEqual(result);
  });

  it("clone works with a result parameter that is an input parameter", function () {
    const direction = Cartesian3.normalize(
      new Cartesian3(1, 2, 3),
      new Cartesian3()
    );
    const ray = new Ray(Cartesian3.UNIT_X, direction);
    const returnedResult = Ray.clone(ray, ray);
    expect(ray).toBe(returnedResult);
  });

  it("clone returns undefined if ray is undefined", function () {
    expect(Ray.clone()).toBeUndefined();
  });

  it("getPoint along ray works without a result parameter", function () {
    const direction = Cartesian3.normalize(
      new Cartesian3(1, 2, 3),
      new Cartesian3()
    );
    const ray = new Ray(Cartesian3.UNIT_X, direction);
    for (let i = -10; i < 11; i++) {
      const expectedResult = Cartesian3.add(
        Cartesian3.multiplyByScalar(direction, i, new Cartesian3()),
        Cartesian3.UNIT_X,
        new Cartesian3()
      );
      const returnedResult = Ray.getPoint(ray, i);
      expect(returnedResult).toEqual(expectedResult);
    }
  });

  it("getPoint works with a result parameter", function () {
    const direction = Cartesian3.normalize(
      new Cartesian3(1, 2, 3),
      new Cartesian3()
    );
    const ray = new Ray(Cartesian3.UNIT_X, direction);
    const result = new Cartesian3();
    for (let i = -10; i < 11; i++) {
      const expectedResult = Cartesian3.add(
        Cartesian3.multiplyByScalar(direction, i, new Cartesian3()),
        Cartesian3.UNIT_X,
        new Cartesian3()
      );
      const returnedResult = Ray.getPoint(ray, i, result);
      expect(result).toBe(returnedResult);
      expect(returnedResult).toEqual(expectedResult);
    }
  });

  it("getPoint throws without a point", function () {
    const direction = Cartesian3.normalize(
      new Cartesian3(1, 2, 3),
      new Cartesian3()
    );
    const ray = new Ray(Cartesian3.UNIT_X, direction);
    expect(function () {
      Ray.getPoint(ray, undefined);
    }).toThrowDeveloperError();
  });

  it("transform throws without ray", function () {
    const transform = Matrix4.IDENTITY;
    expect(function () {
      Ray.transform(undefined, transform);
    }).toThrowDeveloperError();
  });

  it("transform throws without transform", function () {
    const ray = new Ray();
    expect(function () {
      Ray.transform(ray, undefined);
    }).toThrowDeveloperError();
  });

  it("transform works with zero values for ray", function () {
    const ray = new Ray();
    const transform = Matrix4.IDENTITY;
    const result = Ray.transform(ray, transform);
    expect(result.origin).toEqual(Cartesian3.ZERO);
    expect(result.direction).toEqual(Cartesian3.ZERO);
  });

  it("transform works with zero values for transform", function () {
    const ray = new Ray();
    ray.origin = new Cartesian3(-3, -2, -1);
    ray.direction = new Cartesian3(1, 2, 3);
    const transform = Matrix4.ZERO;
    const result = Ray.transform(ray, transform);
    expect(result.origin).toEqual(Cartesian3.ZERO);
    expect(result.direction).toEqual(Cartesian3.ZERO);
  });

  it("transform works with non-zero values", function () {
    const ray = new Ray();
    ray.origin = new Cartesian3(-3, -2, -1);
    ray.direction = new Cartesian3(1, 2, 3);
    const transform = Matrix4.fromUniformScale(2.0);
    const result = Ray.transform(ray, transform);
    expect(result.origin).toEqual(new Cartesian3(-6, -4, -2));
    expect(result.direction).toEqual(new Cartesian3(2, 4, 6));
  });

  it("transform works with result paramter", function () {
    const ray = new Ray();
    ray.origin = new Cartesian3(-3, -2, -1);
    ray.direction = new Cartesian3(1, 2, 3);
    const transform = Matrix4.fromUniformScale(2.0);

    const result = new Ray();
    const returned = Ray.transform(ray, transform, result);
    expect(returned).toBe(result);
    expect(result.origin).toEqual(new Cartesian3(-6, -4, -2));
    expect(result.direction).toEqual(new Cartesian3(2, 4, 6));
  });
});
