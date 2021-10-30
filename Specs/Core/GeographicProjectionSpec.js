import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicProjection } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";

describe("Core/GeographicProjection", function () {
  it("construct0", function () {
    var projection = new GeographicProjection();
    expect(projection.ellipsoid).toEqual(Ellipsoid.WGS84);
  });

  it("construct1", function () {
    var ellipsoid = Ellipsoid.UNIT_SPHERE;
    var projection = new GeographicProjection(ellipsoid);
    expect(projection.ellipsoid).toEqual(ellipsoid);
  });

  it("project0", function () {
    var height = 10.0;
    var cartographic = new Cartographic(0.0, 0.0, height);
    var projection = new GeographicProjection();
    expect(projection.project(cartographic)).toEqual(
      new Cartesian3(0.0, 0.0, height)
    );
  });

  it("project1", function () {
    var ellipsoid = Ellipsoid.WGS84;
    var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
    var expected = new Cartesian3(
      Math.PI * ellipsoid.radii.x,
      CesiumMath.PI_OVER_TWO * ellipsoid.radii.x,
      0.0
    );
    var projection = new GeographicProjection(ellipsoid);
    expect(projection.project(cartographic)).toEqual(expected);
  });

  it("project2", function () {
    var ellipsoid = Ellipsoid.UNIT_SPHERE;
    var cartographic = new Cartographic(-Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
    var expected = new Cartesian3(-Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
    var projection = new GeographicProjection(ellipsoid);
    expect(projection.project(cartographic)).toEqual(expected);
  });

  it("project3", function () {
    var ellipsoid = Ellipsoid.WGS84;
    var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
    var expected = new Cartesian3(
      Math.PI * ellipsoid.radii.x,
      CesiumMath.PI_OVER_TWO * ellipsoid.radii.x,
      0.0
    );
    var projection = new GeographicProjection(ellipsoid);
    var result = new Cartesian3(0.0, 0.0, 0.0);
    var returnValue = projection.project(cartographic, result);
    expect(result).toEqual(returnValue);
    expect(result).toEqual(expected);
  });

  it("unproject0", function () {
    var cartographic = new Cartographic(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.PI_OVER_FOUR,
      12.0
    );
    var projection = new GeographicProjection();
    var projected = projection.project(cartographic);
    expect(projection.unproject(projected)).toEqual(cartographic);
  });

  it("unproject1", function () {
    var cartographic = new Cartographic(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.PI_OVER_FOUR,
      12.0
    );
    var projection = new GeographicProjection();
    var projected = projection.project(cartographic);
    var result = new Cartographic(0.0, 0.0, 0.0);
    var returnValue = projection.unproject(projected, result);
    expect(result).toEqual(returnValue);
    expect(result).toEqual(cartographic);
  });

  it("project throws without cartesian", function () {
    var projection = new GeographicProjection();
    expect(function () {
      return projection.unproject();
    }).toThrowDeveloperError();
  });
});
