import { BoundingRectangle } from "../../Source/Cesium.js";
import { Cartesian2 } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicProjection } from "../../Source/Cesium.js";
import { Intersect } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/BoundingRectangle", function () {
  it("default constructor sets expected values", function () {
    const rectangle = new BoundingRectangle();
    expect(rectangle.x).toEqual(0.0);
    expect(rectangle.y).toEqual(0.0);
    expect(rectangle.width).toEqual(0.0);
    expect(rectangle.height).toEqual(0.0);
  });

  it("constructor sets expected parameters", function () {
    const rectangle = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    expect(rectangle.x).toEqual(1.0);
    expect(rectangle.y).toEqual(2.0);
    expect(rectangle.width).toEqual(3.0);
    expect(rectangle.height).toEqual(4.0);
  });

  it("clone without a result parameter", function () {
    const rectangle = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    const result = rectangle.clone();
    expect(rectangle).not.toBe(result);
    expect(rectangle).toEqual(result);
  });

  it("clone with a result parameter", function () {
    const rectangle = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    const result = new BoundingRectangle(6.0, 7.0, 8.0, 9.0);
    const returnedResult = rectangle.clone(result);
    expect(result).not.toBe(rectangle);
    expect(result).toEqual(rectangle);
    expect(result).toBe(returnedResult);
  });

  it('clone works with "this" result parameter', function () {
    const rectangle = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    const returnedResult = rectangle.clone(rectangle);
    expect(rectangle.x).toEqual(1.0);
    expect(rectangle.y).toEqual(2.0);
    expect(rectangle.width).toEqual(3.0);
    expect(rectangle.height).toEqual(4.0);
    expect(rectangle).toBe(returnedResult);
  });

  it("equals", function () {
    const rectangle = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    expect(rectangle.equals(new BoundingRectangle(1.0, 2.0, 3.0, 4.0))).toEqual(
      true
    );
    expect(rectangle.equals(new BoundingRectangle(5.0, 2.0, 3.0, 4.0))).toEqual(
      false
    );
    expect(rectangle.equals(new BoundingRectangle(1.0, 6.0, 3.0, 4.0))).toEqual(
      false
    );
    expect(rectangle.equals(new BoundingRectangle(1.0, 2.0, 7.0, 4.0))).toEqual(
      false
    );
    expect(rectangle.equals(new BoundingRectangle(1.0, 2.0, 3.0, 8.0))).toEqual(
      false
    );
    expect(rectangle.equals(undefined)).toEqual(false);
  });

  const positions = [
    new Cartesian2(3, -1),
    new Cartesian2(2, -2),
    new Cartesian2(1, -3),
    new Cartesian2(0, 0),
    new Cartesian2(-1, 1),
    new Cartesian2(-2, 2),
    new Cartesian2(-3, 3),
  ];

  it("create axis aligned bounding rectangle", function () {
    const rectangle = BoundingRectangle.fromPoints(positions);
    expect(rectangle.x).toEqual(-3);
    expect(rectangle.y).toEqual(-3);
    expect(rectangle.width).toEqual(6);
    expect(rectangle.height).toEqual(6);
  });

  it("fromPoints works with a result parameter", function () {
    const result = new BoundingRectangle();
    const rectangle = BoundingRectangle.fromPoints(positions, result);
    expect(rectangle).toBe(result);
    expect(rectangle.x).toEqual(-3);
    expect(rectangle.y).toEqual(-3);
    expect(rectangle.width).toEqual(6);
    expect(rectangle.height).toEqual(6);
  });

  it("fromPoints creates an empty rectangle with no positions", function () {
    const rectangle = BoundingRectangle.fromPoints();
    expect(rectangle.x).toEqual(0.0);
    expect(rectangle.y).toEqual(0.0);
    expect(rectangle.width).toEqual(0.0);
    expect(rectangle.height).toEqual(0.0);
  });

  it("fromRectangle creates an empty rectangle with no rectangle", function () {
    const rectangle = BoundingRectangle.fromRectangle();
    expect(rectangle.x).toEqual(0.0);
    expect(rectangle.y).toEqual(0.0);
    expect(rectangle.width).toEqual(0.0);
    expect(rectangle.height).toEqual(0.0);
  });

  it("create a bounding rectangle from a rectangle", function () {
    const rectangle = Rectangle.MAX_VALUE;
    const projection = new GeographicProjection(Ellipsoid.UNIT_SPHERE);
    const expected = new BoundingRectangle(
      rectangle.west,
      rectangle.south,
      rectangle.east - rectangle.west,
      rectangle.north - rectangle.south
    );
    expect(BoundingRectangle.fromRectangle(rectangle, projection)).toEqual(
      expected
    );
  });

  it("fromRectangle works with a result parameter", function () {
    const rectangle = Rectangle.MAX_VALUE;
    const expected = new BoundingRectangle(
      rectangle.west,
      rectangle.south,
      rectangle.east - rectangle.west,
      rectangle.north - rectangle.south
    );
    const projection = new GeographicProjection(Ellipsoid.UNIT_SPHERE);

    const result = new BoundingRectangle();
    const returnedResult = BoundingRectangle.fromRectangle(
      rectangle,
      projection,
      result
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqual(expected);
  });
  it("intersect works", function () {
    const rectangle1 = new BoundingRectangle(0, 0, 4, 4);
    const rectangle2 = new BoundingRectangle(2, 2, 4, 4);
    const rectangle3 = new BoundingRectangle(-6, 2, 4, 4);
    const rectangle4 = new BoundingRectangle(8, 2, 4, 4);
    const rectangle5 = new BoundingRectangle(2, -6, 4, 4);
    const rectangle6 = new BoundingRectangle(2, 8, 4, 4);
    expect(BoundingRectangle.intersect(rectangle1, rectangle2)).toEqual(
      Intersect.INTERSECTING
    );
    expect(BoundingRectangle.intersect(rectangle1, rectangle3)).toEqual(
      Intersect.OUTSIDE
    );
    expect(BoundingRectangle.intersect(rectangle1, rectangle4)).toEqual(
      Intersect.OUTSIDE
    );
    expect(BoundingRectangle.intersect(rectangle1, rectangle5)).toEqual(
      Intersect.OUTSIDE
    );
    expect(BoundingRectangle.intersect(rectangle1, rectangle6)).toEqual(
      Intersect.OUTSIDE
    );
  });

  it("union works without a result parameter", function () {
    const rectangle1 = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
    const rectangle2 = new BoundingRectangle(-2.0, 0.0, 1.0, 2.0);
    const expected = new BoundingRectangle(-2.0, 0.0, 5.0, 2.0);
    const returnedResult = BoundingRectangle.union(rectangle1, rectangle2);
    expect(returnedResult).toEqual(expected);
  });

  it("union works with a result parameter", function () {
    const rectangle1 = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
    const rectangle2 = new BoundingRectangle(-2.0, 0.0, 1.0, 2.0);
    const expected = new BoundingRectangle(-2.0, 0.0, 5.0, 2.0);
    const result = new BoundingRectangle(-1.0, -1.0, 10.0, 10.0);
    const returnedResult = BoundingRectangle.union(
      rectangle1,
      rectangle2,
      result
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqual(expected);
  });

  it("expand works if rectangle needs to grow right", function () {
    const rectangle = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
    const point = new Cartesian2(4.0, 0.0);
    const expected = new BoundingRectangle(2.0, 0.0, 2.0, 1.0);
    const result = BoundingRectangle.expand(rectangle, point);
    expect(result).toEqual(expected);
  });

  it("expand works if rectangle needs x to grow left", function () {
    const rectangle = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
    const point = new Cartesian2(0.0, 0.0);
    const expected = new BoundingRectangle(0.0, 0.0, 3.0, 1.0);
    const result = BoundingRectangle.expand(rectangle, point);
    expect(result).toEqual(expected);
  });

  it("expand works if rectangle needs to grow up", function () {
    const rectangle = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
    const point = new Cartesian2(2.0, 2.0);
    const expected = new BoundingRectangle(2.0, 0.0, 1.0, 2.0);
    const result = BoundingRectangle.expand(rectangle, point);
    expect(result).toEqual(expected);
  });

  it("expand works if rectangle needs x to grow down", function () {
    const rectangle = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
    const point = new Cartesian2(2.0, -1.0);
    const expected = new BoundingRectangle(2.0, -1.0, 1.0, 2.0);
    const result = BoundingRectangle.expand(rectangle, point);
    expect(result).toEqual(expected);
  });

  it("expand works if rectangle does not need to grow", function () {
    const rectangle = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
    const point = new Cartesian2(2.5, 0.6);
    const expected = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
    const result = BoundingRectangle.expand(rectangle, point);
    expect(result).toEqual(expected);
  });

  it("expand works with a result parameter", function () {
    const rectangle = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
    const point = new Cartesian2(2.0, -1.0);
    const expected = new BoundingRectangle(2.0, -1.0, 1.0, 2.0);
    const result = new BoundingRectangle();
    const returnedResult = BoundingRectangle.expand(rectangle, point, result);
    expect(returnedResult).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("clone returns undefined with no parameter", function () {
    expect(BoundingRectangle.clone()).toBeUndefined();
  });

  it("union throws with no left parameter", function () {
    const right = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    expect(function () {
      BoundingRectangle.union(undefined, right);
    }).toThrowDeveloperError();
  });

  it("union throws with no right parameter", function () {
    const left = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    expect(function () {
      BoundingRectangle.union(left, undefined);
    }).toThrowDeveloperError();
  });

  it("expand throws with no rectangle parameter", function () {
    const point = new Cartesian2();
    expect(function () {
      BoundingRectangle.expand(undefined, point);
    }).toThrowDeveloperError();
  });

  it("expand throws with no point parameter", function () {
    const rectangle = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    expect(function () {
      BoundingRectangle.expand(rectangle, undefined);
    }).toThrowDeveloperError();
  });

  it("intersect throws with no left parameter", function () {
    const right = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    expect(function () {
      BoundingRectangle.intersect(undefined, right);
    }).toThrowDeveloperError();
  });

  it("intersect  throws with no right parameter", function () {
    const left = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
    expect(function () {
      BoundingRectangle.intersect(left, undefined);
    }).toThrowDeveloperError();
  });

  createPackableSpecs(BoundingRectangle, new BoundingRectangle(1, 2, 3, 4), [
    1,
    2,
    3,
    4,
  ]);
});
