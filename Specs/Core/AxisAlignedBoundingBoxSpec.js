import { AxisAlignedBoundingBox } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Intersect } from "../../Source/Cesium.js";
import { Plane } from "../../Source/Cesium.js";

describe("Core/AxisAlignedBoundingBox", function () {
  var positions = [
    new Cartesian3(3, -1, -3),
    new Cartesian3(2, -2, -2),
    new Cartesian3(1, -3, -1),
    new Cartesian3(0, 0, 0),
    new Cartesian3(-1, 1, 1),
    new Cartesian3(-2, 2, 2),
    new Cartesian3(-3, 3, 3),
  ];

  var positionsMinimum = new Cartesian3(-3, -3, -3);
  var positionsMaximum = new Cartesian3(3, 3, 3);
  var positionsCenter = new Cartesian3(0, 0, 0);

  it("constructor sets expected default values", function () {
    var box = new AxisAlignedBoundingBox();
    expect(box.minimum).toEqual(Cartesian3.ZERO);
    expect(box.maximum).toEqual(Cartesian3.ZERO);
    expect(box.center).toEqual(Cartesian3.ZERO);
  });

  it("constructor sets expected parameter values", function () {
    var minimum = new Cartesian3(1, 2, 3);
    var maximum = new Cartesian3(4, 5, 6);
    var center = new Cartesian3(2.5, 3.5, 4.5);
    var box = new AxisAlignedBoundingBox(minimum, maximum, center);
    expect(box.minimum).toEqual(minimum);
    expect(box.maximum).toEqual(maximum);
    expect(box.center).toEqual(center);
  });

  it("constructor computes center if not supplied", function () {
    var minimum = new Cartesian3(1, 2, 3);
    var maximum = new Cartesian3(4, 5, 6);
    var expectedCenter = new Cartesian3(2.5, 3.5, 4.5);
    var box = new AxisAlignedBoundingBox(minimum, maximum);
    expect(box.minimum).toEqual(minimum);
    expect(box.maximum).toEqual(maximum);
    expect(box.center).toEqual(expectedCenter);
  });

  it("fromPoints constructs empty box with undefined positions", function () {
    var box = AxisAlignedBoundingBox.fromPoints(undefined);
    expect(box.minimum).toEqual(Cartesian3.ZERO);
    expect(box.maximum).toEqual(Cartesian3.ZERO);
    expect(box.center).toEqual(Cartesian3.ZERO);
  });

  it("fromPoints constructs empty box with empty positions", function () {
    var box = AxisAlignedBoundingBox.fromPoints([]);
    expect(box.minimum).toEqual(Cartesian3.ZERO);
    expect(box.maximum).toEqual(Cartesian3.ZERO);
    expect(box.center).toEqual(Cartesian3.ZERO);
  });

  it("fromPoints computes the correct values", function () {
    var box = AxisAlignedBoundingBox.fromPoints(positions);
    expect(box.minimum).toEqual(positionsMinimum);
    expect(box.maximum).toEqual(positionsMaximum);
    expect(box.center).toEqual(positionsCenter);
  });

  it("clone without a result parameter", function () {
    var box = new AxisAlignedBoundingBox(Cartesian3.UNIT_Y, Cartesian3.UNIT_X);
    var result = box.clone();
    expect(box).not.toBe(result);
    expect(box).toEqual(result);
  });

  it("clone without a result parameter with box of offset center", function () {
    var box = new AxisAlignedBoundingBox(
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Z
    );
    var result = box.clone();
    expect(box).not.toBe(result);
    expect(box).toEqual(result);
  });

  it("clone with a result parameter", function () {
    var box = new AxisAlignedBoundingBox(Cartesian3.UNIT_Y, Cartesian3.UNIT_X);
    var result = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_Z);
    var returnedResult = box.clone(result);
    expect(result).toBe(returnedResult);
    expect(box).not.toBe(result);
    expect(box).toEqual(result);
  });

  it('clone works with "this" result parameter', function () {
    var box = new AxisAlignedBoundingBox(Cartesian3.UNIT_Y, Cartesian3.UNIT_X);
    var returnedResult = box.clone(box);
    expect(box).toBe(returnedResult);
    expect(box.minimum).toEqual(Cartesian3.UNIT_Y);
    expect(box.maximum).toEqual(Cartesian3.UNIT_X);
  });

  it("equals works in all cases", function () {
    var box = new AxisAlignedBoundingBox(
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z
    );
    var bogie = new Cartesian3(2, 3, 4);
    expect(
      box.equals(
        new AxisAlignedBoundingBox(
          Cartesian3.UNIT_X,
          Cartesian3.UNIT_Y,
          Cartesian3.UNIT_Z
        )
      )
    ).toEqual(true);
    expect(
      box.equals(
        new AxisAlignedBoundingBox(bogie, Cartesian3.UNIT_Y, Cartesian3.UNIT_Y)
      )
    ).toEqual(false);
    expect(
      box.equals(
        new AxisAlignedBoundingBox(Cartesian3.UNIT_X, bogie, Cartesian3.UNIT_Z)
      )
    ).toEqual(false);
    expect(
      box.equals(
        new AxisAlignedBoundingBox(Cartesian3.UNIT_X, Cartesian3.UNIT_Y, bogie)
      )
    ).toEqual(false);
    expect(box.equals(undefined)).toEqual(false);
  });

  it("computes the bounding box for a single position", function () {
    var box = AxisAlignedBoundingBox.fromPoints([positions[0]]);
    expect(box.minimum).toEqual(positions[0]);
    expect(box.maximum).toEqual(positions[0]);
    expect(box.center).toEqual(positions[0]);
  });

  it("intersectPlane works with box on the positive side of a plane", function () {
    var box = new AxisAlignedBoundingBox(
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      Cartesian3.ZERO
    );
    var normal = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
    var position = Cartesian3.UNIT_X;
    var plane = new Plane(normal, -Cartesian3.dot(normal, position));
    expect(box.intersectPlane(plane)).toEqual(Intersect.INSIDE);
  });

  it("intersectPlane works with box on the negative side of a plane", function () {
    var box = new AxisAlignedBoundingBox(
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      Cartesian3.ZERO
    );
    var normal = Cartesian3.UNIT_X;
    var position = Cartesian3.UNIT_X;
    var plane = new Plane(normal, -Cartesian3.dot(normal, position));
    expect(box.intersectPlane(plane)).toEqual(Intersect.OUTSIDE);
  });

  it("intersectPlane works with box intersecting a plane", function () {
    var box = new AxisAlignedBoundingBox(
      Cartesian3.ZERO,
      Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, 2.0, new Cartesian3())
    );
    var normal = Cartesian3.UNIT_X;
    var position = Cartesian3.UNIT_X;
    var plane = new Plane(normal, -Cartesian3.dot(normal, position));
    expect(box.intersectPlane(plane)).toEqual(Intersect.INTERSECTING);
  });

  it("clone returns undefined with no parameter", function () {
    expect(AxisAlignedBoundingBox.clone()).toBeUndefined();
  });

  it("intersectPlane throws without a box", function () {
    var plane = new Plane(Cartesian3.UNIT_X, 0.0);
    expect(function () {
      AxisAlignedBoundingBox.intersectPlane(undefined, plane);
    }).toThrowDeveloperError();
  });

  it("intersectPlane throws without a plane", function () {
    var box = new AxisAlignedBoundingBox();
    expect(function () {
      AxisAlignedBoundingBox.intersectPlane(box, undefined);
    }).toThrowDeveloperError();
  });
});
