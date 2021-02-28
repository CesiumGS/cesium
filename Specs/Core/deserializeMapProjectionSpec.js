import { deserializeMapProjection } from "../../Source/Cesium.js";
import { CustomProjection } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicProjection } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Matrix4Projection } from "../../Source/Cesium.js";
import { Proj4Projection } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { WebMercatorProjection } from "../../Source/Cesium.js";

describe("Core/deserializeMapProjection", function () {
  it("deserializes to GeographicProjection", function () {
    var projection = new GeographicProjection(Ellipsoid.UNIT_SPHERE);
    var serialized = projection.serialize();

    return deserializeMapProjection(serialized).then(function (
      deserializedProjection
    ) {
      expect(deserializedProjection instanceof GeographicProjection).toBe(true);
      expect(
        projection.ellipsoid.equals(deserializedProjection.ellipsoid)
      ).toBe(true);
    });
  });

  it("deserializes to WebMercatorProjection", function () {
    var projection = new WebMercatorProjection(Ellipsoid.UNIT_SPHERE);
    var serialized = projection.serialize();

    return deserializeMapProjection(serialized).then(function (
      deserializedProjection
    ) {
      expect(deserializedProjection instanceof WebMercatorProjection).toBe(
        true
      );
      expect(
        projection.ellipsoid.equals(deserializedProjection.ellipsoid)
      ).toBe(true);
    });
  });

  it("deserializes to CustomProjection", function () {
    var projection = new CustomProjection(
      "Data/UserGeographic.js",
      Ellipsoid.UNIT_SPHERE
    );
    var serialized = projection.serialize();

    return deserializeMapProjection(serialized).then(function (
      deserializedProjection
    ) {
      expect(deserializedProjection instanceof CustomProjection).toBe(true);
      expect(
        projection.ellipsoid.equals(deserializedProjection.ellipsoid)
      ).toBe(true);
      expect(projection.url).toEqual(deserializedProjection.url);
    });
  });

  it("deserializes to Proj4Projection", function () {
    var wkt =
      "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs";
    var wgs84Bounds = Rectangle.fromDegrees(-180, -90, 0, 90);
    var projectedBounds = new Rectangle(-1000.0, -1000.0, 1000.0, 1000.0);
    var projection = new Proj4Projection({
      wellKnownText: wkt,
      heightScale: 0.5,
      ellipsoid: Ellipsoid.UNIT_SPHERE,
      wgs84Bounds: wgs84Bounds,
      projectedBounds: projectedBounds,
    });
    var serialized = projection.serialize();

    return deserializeMapProjection(serialized).then(function (
      deserializedProjection
    ) {
      expect(deserializedProjection instanceof Proj4Projection).toBe(true);
      expect(
        Ellipsoid.UNIT_SPHERE.equals(deserializedProjection.ellipsoid)
      ).toBe(true);
      expect(deserializedProjection.wellKnownText).toEqual(wkt);
      expect(deserializedProjection.heightScale).toEqual(0.5);
      expect(wgs84Bounds.equals(deserializedProjection.wgs84Bounds)).toBe(true);
      expect(
        projectedBounds.equals(deserializedProjection.projectedBounds)
      ).toBe(true);
    });
  });

  it("deserializes to Matrix4Projection", function () {
    var projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      ellipsoid: Ellipsoid.UNIT_SPHERE,
      degrees: false,
    });

    var serialized = projection.serialize();

    return deserializeMapProjection(serialized).then(function (
      deserializedProjection
    ) {
      expect(deserializedProjection instanceof Matrix4Projection).toBe(true);
      expect(
        Ellipsoid.UNIT_SPHERE.equals(deserializedProjection.ellipsoid)
      ).toBe(true);
      expect(deserializedProjection.matrix).toEqual(Matrix4.IDENTITY);
      expect(deserializedProjection.degrees).toEqual(false);
    });
  });

  it("throws an error for unrecognized serializations", function () {
    return deserializeMapProjection({})
      .then(function () {
        fail("should not resolve");
      })
      .otherwise(function (error) {
        expect(error).toBeDefined();
      });
  });
});
