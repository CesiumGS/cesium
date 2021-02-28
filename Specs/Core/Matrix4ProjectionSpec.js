import { Matrix4Projection } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";

describe("Core/Matrix4Projection", function () {
  it("construct0", function () {
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });
    expect(projection.matrix).toEqual(Matrix4.IDENTITY);
    expect(projection.ellipsoid).toEqual(Ellipsoid.WGS84);
    expect(projection.degrees).toEqual(true);
  });

  it("construct1", function () {
    var ellipsoid = Ellipsoid.UNIT_SPHERE;
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      ellipsoid: ellipsoid,
    });
    expect(projection.matrix).toEqual(Matrix4.IDENTITY);
    expect(projection.ellipsoid).toEqual(Ellipsoid.UNIT_SPHERE);
    expect(projection.degrees).toEqual(true);
  });

  it("construct2", function () {
    var ellipsoid = Ellipsoid.UNIT_SPHERE;
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      ellipsoid: ellipsoid,
      degrees: false,
    });
    expect(projection.matrix).toEqual(Matrix4.IDENTITY);
    expect(projection.ellipsoid).toEqual(Ellipsoid.UNIT_SPHERE);
    expect(projection.degrees).toEqual(false);
  });

  it("project0", function () {
    var height = 10.0;
    var cartographic = new Cartographic(0.0, 0.0, height);
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });
    expect(projection.project(cartographic)).toEqual(
      new Cartesian3(0.0, 0.0, height)
    );
  });

  it("project1", function () {
    var cartographic = new Cartographic(
      CesiumMath.PI,
      CesiumMath.PI_OVER_TWO,
      0.0
    );
    var expected = new Cartesian3(180.0, 90.0, 0.0);
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });
    expect(projection.project(cartographic)).toEqual(expected);
  });

  it("project2", function () {
    var cartographic = new Cartographic(
      -CesiumMath.PI,
      CesiumMath.PI_OVER_TWO,
      0.0
    );
    var expected = new Cartesian3(-180.0, 90.0, 0.0);
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });
    expect(projection.project(cartographic)).toEqual(expected);
  });

  it("project3", function () {
    var cartographic = new Cartographic(
      CesiumMath.PI,
      CesiumMath.PI_OVER_TWO,
      0.0
    );
    var expected = new Cartesian3(CesiumMath.PI, CesiumMath.PI_OVER_TWO, 0.0);
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      degrees: false,
    });
    expect(projection.project(cartographic)).toEqual(expected);
  });

  it("project4", function () {
    var cartographic = new Cartographic(
      -CesiumMath.PI,
      CesiumMath.PI_OVER_TWO,
      0.0
    );
    var expected = new Cartesian3(-CesiumMath.PI, CesiumMath.PI_OVER_TWO, 0.0);
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      degrees: false,
    });
    expect(projection.project(cartographic)).toEqual(expected);
  });

  it("project with result parameter", function () {
    var cartographic = new Cartographic(
      CesiumMath.PI,
      CesiumMath.PI_OVER_TWO,
      0.0
    );
    var expected = new Cartesian3(CesiumMath.PI, CesiumMath.PI_OVER_TWO, 0.0);
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      degrees: false,
    });
    var result = new Cartesian3(0.0, 0.0, 0.0);
    var returnValue = projection.project(cartographic, result);
    expect(result).toBe(returnValue);
    expect(result).toEqual(expected);
  });

  it("unproject", function () {
    var cartographic = new Cartographic(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.PI_OVER_FOUR,
      12.0
    );
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });
    var projected = projection.project(cartographic);
    expect(projection.unproject(projected)).toEqual(cartographic);
  });

  it("unproject with result parameter", function () {
    var cartographic = new Cartographic(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.PI_OVER_FOUR,
      12.0
    );
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });
    var projected = projection.project(cartographic);
    var result = new Cartographic(0.0, 0.0, 0.0);
    var returnValue = projection.unproject(projected, result);
    expect(result).toBe(returnValue);
    expect(
      Cartographic.equalsEpsilon(result, cartographic, CesiumMath.EPSILON10)
    ).toBe(true);
  });

  it("project throws without cartographic", function () {
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });
    expect(function () {
      return projection.project();
    }).toThrowDeveloperError();
  });

  it("unproject throws without cartesian", function () {
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });
    expect(function () {
      return projection.unproject();
    }).toThrowDeveloperError();
  });

  it("serializes and deserializes", function () {
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      ellipsoid: Ellipsoid.UNIT_SPHERE,
      degrees: false,
    });
    var serialized = projection.serialize();

    return Matrix4Projection.deserialize(serialized).then(function (
      deserializedProjection
    ) {
      expect(projection.matrix).toEqual(deserializedProjection.matrix);
      expect(
        projection.ellipsoid.equals(deserializedProjection.ellipsoid)
      ).toBe(true);
      expect(projection.degrees).toEqual(deserializedProjection.degrees);
    });
  });
});
