import { Cartographic } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { EllipsoidGeodesic } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";

describe("Core/EllipsoidGeodesic", function () {
  it("throws without start", function () {
    expect(function () {
      const elGeo = new EllipsoidGeodesic();
      return elGeo.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("throws without end", function () {
    expect(function () {
      const elGeo = new EllipsoidGeodesic(new Cartographic(Math.PI, Math.PI));
      return elGeo.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("throws without unique position", function () {
    expect(function () {
      const elGeo = new EllipsoidGeodesic(
        new Cartographic(Math.PI, Math.PI),
        new Cartographic(0, Math.PI)
      );
      return elGeo.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("setEndPoints throws without start", function () {
    expect(function () {
      const elGeo = new EllipsoidGeodesic();
      elGeo.setEndPoints();
    }).toThrowDeveloperError();
  });

  it("setEndPoints throws without end", function () {
    expect(function () {
      const start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
      const elGeo = new EllipsoidGeodesic();
      elGeo.setEndPoints(start);
      return elGeo.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("getSurfaceDistance throws if start or end never defined", function () {
    expect(function () {
      const elGeo = new EllipsoidGeodesic();
      return elGeo.surfaceDistance;
    }).toThrowDeveloperError();
  });

  it("getStartHeading throws if start or end never defined", function () {
    expect(function () {
      const elGeo = new EllipsoidGeodesic();
      return elGeo.startHeading;
    }).toThrowDeveloperError();
  });

  it("getEndHeading throws if start or end never defined", function () {
    expect(function () {
      const elGeo = new EllipsoidGeodesic();
      return elGeo.endHeading;
    }).toThrowDeveloperError();
  });

  it("works with two points", function () {
    const fifteenDegrees = Math.PI / 12;
    const start = new Cartographic(fifteenDegrees, fifteenDegrees);
    const thirtyDegrees = Math.PI / 6;
    const end = new Cartographic(thirtyDegrees, thirtyDegrees);

    const geodesic = new EllipsoidGeodesic(start, end);
    expect(start).toEqual(geodesic.start);
    expect(end).toEqual(geodesic.end);
  });

  it("sets end points", function () {
    const start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
    const end = new Cartographic(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.PI_OVER_TWO
    );
    const geodesic = new EllipsoidGeodesic();
    geodesic.setEndPoints(start, end);
    expect(start).toEqual(geodesic.start);
    expect(end).toEqual(geodesic.end);
  });

  it("gets start heading", function () {
    const ellipsoid = new Ellipsoid(6, 6, 3);
    const start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
    const end = new Cartographic(Math.PI, 0);

    const geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
    expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      geodesic.startHeading,
      CesiumMath.EPSILON11
    );
  });

  it("gets end heading", function () {
    const ellipsoid = new Ellipsoid(6, 6, 3);
    const start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
    const end = new Cartographic(Math.PI, 0);

    const geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
    expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      geodesic.endHeading,
      CesiumMath.EPSILON11
    );
  });

  it("computes distance at equator", function () {
    const ellipsoid = new Ellipsoid(6, 6, 3);
    const start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
    const end = new Cartographic(Math.PI, 0);

    const geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
    expect(CesiumMath.PI_OVER_TWO * 6).toEqualEpsilon(
      geodesic.surfaceDistance,
      CesiumMath.EPSILON11
    );
  });

  it("computes distance very close to equator", function () {
    // See https://github.com/CesiumGS/cesium/issues/9248

    const ellipsoid = new Ellipsoid(6, 6, 3);

    const start = new Cartographic(-CesiumMath.EPSILON10, CesiumMath.EPSILON10);

    const end = new Cartographic(+CesiumMath.EPSILON10, CesiumMath.EPSILON10);

    const geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
    expect(geodesic.surfaceDistance).not.toBeNaN();
  });

  it("computes distance at meridian", function () {
    const ellipsoid = new Ellipsoid(6, 6, 6);
    const fifteenDegrees = Math.PI / 12;
    const start = new Cartographic(CesiumMath.PI_OVER_TWO, fifteenDegrees);
    const fortyfiveDegrees = Math.PI / 4;
    const end = new Cartographic(CesiumMath.PI_OVER_TWO, fortyfiveDegrees);

    const geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
    const thirtyDegrees = Math.PI / 6;
    expect(thirtyDegrees * 6).toEqualEpsilon(
      geodesic.surfaceDistance,
      CesiumMath.EPSILON11
    );
  });

  it("computes distance at pole", function () {
    const ellipsoid = new Ellipsoid(6, 6, 6);
    const seventyfiveDegrees = (Math.PI / 12) * 5;
    const fortyfiveDegrees = Math.PI / 4;
    const start = new Cartographic(0, -fortyfiveDegrees);
    const end = new Cartographic(Math.PI, -seventyfiveDegrees);

    const geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
    const sixtyDegrees = Math.PI / 3;
    expect(sixtyDegrees * 6).toEqualEpsilon(
      geodesic.surfaceDistance,
      CesiumMath.EPSILON11
    );
  });

  it("interpolates start and end points", function () {
    const fifteenDegrees = Math.PI / 12;
    const start = new Cartographic(fifteenDegrees, fifteenDegrees);
    const thirtyDegrees = Math.PI / 6;
    const end = new Cartographic(thirtyDegrees, thirtyDegrees);

    const geodesic = new EllipsoidGeodesic(start, end);
    const distance = geodesic.surfaceDistance;

    const first = geodesic.interpolateUsingSurfaceDistance(0.0);
    const last = geodesic.interpolateUsingSurfaceDistance(distance);

    expect(start.longitude).toEqualEpsilon(
      first.longitude,
      CesiumMath.EPSILON13
    );
    expect(start.latitude).toEqualEpsilon(first.latitude, CesiumMath.EPSILON13);
    expect(end.longitude).toEqualEpsilon(last.longitude, CesiumMath.EPSILON13);
    expect(end.latitude).toEqualEpsilon(last.latitude, CesiumMath.EPSILON13);
  });

  it("interpolates midpoint", function () {
    const fifteenDegrees = Math.PI / 12;
    const start = new Cartographic(fifteenDegrees, 0);
    const fortyfiveDegrees = Math.PI / 4;
    const end = new Cartographic(fortyfiveDegrees, 0);
    const thirtyDegrees = Math.PI / 6;
    const expectedMid = new Cartographic(thirtyDegrees, 0);

    const geodesic = new EllipsoidGeodesic(start, end);
    const distance = Ellipsoid.WGS84.radii.x * fifteenDegrees;

    const midpoint = geodesic.interpolateUsingSurfaceDistance(distance);

    expect(expectedMid.longitude).toEqualEpsilon(
      midpoint.longitude,
      CesiumMath.EPSILON13
    );
    expect(expectedMid.latitude).toEqualEpsilon(
      midpoint.latitude,
      CesiumMath.EPSILON13
    );
  });

  it("interpolates start and end points using fraction", function () {
    const fifteenDegrees = Math.PI / 12;
    const start = new Cartographic(fifteenDegrees, fifteenDegrees);
    const thirtyDegrees = Math.PI / 6;
    const end = new Cartographic(thirtyDegrees, thirtyDegrees);

    const geodesic = new EllipsoidGeodesic(start, end);

    const first = geodesic.interpolateUsingFraction(0);
    const last = geodesic.interpolateUsingFraction(1);

    expect(start.longitude).toEqualEpsilon(
      first.longitude,
      CesiumMath.EPSILON13
    );
    expect(start.latitude).toEqualEpsilon(first.latitude, CesiumMath.EPSILON13);
    expect(end.longitude).toEqualEpsilon(last.longitude, CesiumMath.EPSILON13);
    expect(end.latitude).toEqualEpsilon(last.latitude, CesiumMath.EPSILON13);
  });

  it("interpolates midpoint using fraction", function () {
    const fifteenDegrees = Math.PI / 12;
    const start = new Cartographic(fifteenDegrees, 0);
    const fortyfiveDegrees = Math.PI / 4;
    const end = new Cartographic(fortyfiveDegrees, 0);
    const thirtyDegrees = Math.PI / 6;
    const expectedMid = new Cartographic(thirtyDegrees, 0);

    const geodesic = new EllipsoidGeodesic(start, end);

    const midpoint = geodesic.interpolateUsingFraction(0.5);

    expect(expectedMid.longitude).toEqualEpsilon(
      midpoint.longitude,
      CesiumMath.EPSILON12
    );
    expect(expectedMid.latitude).toEqualEpsilon(
      midpoint.latitude,
      CesiumMath.EPSILON12
    );
  });

  it("interpolates midpoint fraction using result parameter", function () {
    const fifteenDegrees = Math.PI / 12;
    const start = new Cartographic(fifteenDegrees, 0);
    const fortyfiveDegrees = Math.PI / 4;
    const end = new Cartographic(fortyfiveDegrees, 0);
    const thirtyDegrees = Math.PI / 6;
    const expectedMid = new Cartographic(thirtyDegrees, 0);

    const geodesic = new EllipsoidGeodesic(start, end);
    const result = new Cartographic();
    const midpoint = geodesic.interpolateUsingFraction(0.5, result);
    expect(result).toBe(midpoint);

    expect(expectedMid.longitude).toEqualEpsilon(
      result.longitude,
      CesiumMath.EPSILON12
    );
    expect(expectedMid.latitude).toEqualEpsilon(
      result.latitude,
      CesiumMath.EPSILON12
    );
  });

  it("interpolates midpoint using result parameter", function () {
    const fifteenDegrees = Math.PI / 12;
    const start = new Cartographic(fifteenDegrees, 0);
    const fortyfiveDegrees = Math.PI / 4;
    const end = new Cartographic(fortyfiveDegrees, 0);
    const thirtyDegrees = Math.PI / 6;
    const expectedMid = new Cartographic(thirtyDegrees, 0);

    const geodesic = new EllipsoidGeodesic(start, end);
    const distance = Ellipsoid.WGS84.radii.x * fifteenDegrees;

    const result = new Cartographic();
    const midpoint = geodesic.interpolateUsingSurfaceDistance(distance, result);

    expect(result).toBe(midpoint);

    expect(expectedMid.longitude).toEqualEpsilon(
      result.longitude,
      CesiumMath.EPSILON13
    );
    expect(expectedMid.latitude).toEqualEpsilon(
      result.latitude,
      CesiumMath.EPSILON13
    );
  });
});
