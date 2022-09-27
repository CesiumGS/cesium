import {
  Cartesian3,
  Cartographic,
  Ellipsoid,
  GeographicProjection,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

describe("Core/GeographicProjection", function () {
  it("construct0", function () {
    const projection = new GeographicProjection();
    expect(projection.ellipsoid).toEqual(Ellipsoid.WGS84);
  });

  it("construct1", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const projection = new GeographicProjection(ellipsoid);
    expect(projection.ellipsoid).toEqual(ellipsoid);
  });

  it("project0", function () {
    const height = 10.0;
    const cartographic = new Cartographic(0.0, 0.0, height);
    const projection = new GeographicProjection();
    expect(projection.project(cartographic)).toEqual(
      new Cartesian3(0.0, 0.0, height)
    );
  });

  it("project1", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
    const expected = new Cartesian3(
      Math.PI * ellipsoid.radii.x,
      CesiumMath.PI_OVER_TWO * ellipsoid.radii.x,
      0.0
    );
    const projection = new GeographicProjection(ellipsoid);
    expect(projection.project(cartographic)).toEqual(expected);
  });

  it("project2", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const cartographic = new Cartographic(
      -Math.PI,
      CesiumMath.PI_OVER_TWO,
      0.0
    );
    const expected = new Cartesian3(-Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
    const projection = new GeographicProjection(ellipsoid);
    expect(projection.project(cartographic)).toEqual(expected);
  });

  it("project3", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
    const expected = new Cartesian3(
      Math.PI * ellipsoid.radii.x,
      CesiumMath.PI_OVER_TWO * ellipsoid.radii.x,
      0.0
    );
    const projection = new GeographicProjection(ellipsoid);
    const result = new Cartesian3(0.0, 0.0, 0.0);
    const returnValue = projection.project(cartographic, result);
    expect(result).toEqual(returnValue);
    expect(result).toEqual(expected);
  });

  it("unproject0", function () {
    const cartographic = new Cartographic(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.PI_OVER_FOUR,
      12.0
    );
    const projection = new GeographicProjection();
    const projected = projection.project(cartographic);
    expect(projection.unproject(projected)).toEqual(cartographic);
  });

  it("unproject1", function () {
    const cartographic = new Cartographic(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.PI_OVER_FOUR,
      12.0
    );
    const projection = new GeographicProjection();
    const projected = projection.project(cartographic);
    const result = new Cartographic(0.0, 0.0, 0.0);
    const returnValue = projection.unproject(projected, result);
    expect(result).toEqual(returnValue);
    expect(result).toEqual(cartographic);
  });

  it("project throws without cartesian", function () {
    const projection = new GeographicProjection();
    expect(function () {
      return projection.unproject();
    }).toThrowDeveloperError();
  });
});
