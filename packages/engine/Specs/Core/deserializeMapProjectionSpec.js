import {
  GeographicProjection,
  WebMercatorProjection,
  Proj4Projection,
  Matrix4Projection,
  CustomProjection,
  Cartographic,
  Ellipsoid,
  Matrix4,
  MapProjectionType,
  Rectangle,
  deserializeMapProjection,
} from "../../index.js";

describe("Core/deserializeMapProjection", function () {
  it("deserializes GeographicProjection", function () {
    const original = new GeographicProjection();
    const serialized = original.serialize();
    const deserialized = deserializeMapProjection(serialized);

    expect(deserialized).toBeInstanceOf(GeographicProjection);
    expect(deserialized.isNormalCylindrical).toBe(true);
  });

  it("deserializes WebMercatorProjection", function () {
    const original = new WebMercatorProjection();
    const serialized = original.serialize();
    const deserialized = deserializeMapProjection(serialized);

    expect(deserialized).toBeInstanceOf(WebMercatorProjection);
    expect(deserialized.isNormalCylindrical).toBe(true);
  });

  it("deserializes Proj4Projection", function () {
    const original = new Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs",
    });
    const serialized = original.serialize();
    const deserialized = deserializeMapProjection(serialized);

    expect(deserialized).toBeInstanceOf(Proj4Projection);
    expect(deserialized.isNormalCylindrical).toBe(false);

    const c = Cartographic.fromDegrees(10, 52, 0);
    const p1 = original.project(c);
    const p2 = deserialized.project(c);
    expect(p1.x).toBeCloseTo(p2.x, 6);
    expect(p1.y).toBeCloseTo(p2.y, 6);
  });

  it("deserializes Matrix4Projection", function () {
    const original = new Matrix4Projection({
      matrix: Matrix4.fromUniformScale(2.0),
      degrees: true,
    });
    const serialized = original.serialize();
    const deserialized = deserializeMapProjection(serialized);

    expect(deserialized).toBeInstanceOf(Matrix4Projection);

    const c = Cartographic.fromDegrees(10, 20, 100);
    const p1 = original.project(c);
    const p2 = deserialized.project(c);
    expect(p1.x).toBeCloseTo(p2.x, 10);
    expect(p1.y).toBeCloseTo(p2.y, 10);
  });

  it("preserves ellipsoid through serialization", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const original = new GeographicProjection(ellipsoid);
    const serialized = original.serialize();
    const deserialized = deserializeMapProjection(serialized);

    expect(deserialized.ellipsoid.radii.x).toBeCloseTo(1.0, 10);
    expect(deserialized.ellipsoid.radii.y).toBeCloseTo(1.0, 10);
    expect(deserialized.ellipsoid.radii.z).toBeCloseTo(1.0, 10);
  });

  it("throws for unknown projection type", function () {
    expect(function () {
      deserializeMapProjection({
        mapProjectionType: 999,
        json: {},
      });
    }).toThrowDeveloperError();
  });

  it("round-trips a CustomProjection with self-contained functions", function () {
    const original = new CustomProjection({
      project: function (cartographic, result) {
        result = result || { x: 0, y: 0, z: 0 };
        result.x = cartographic.longitude * 100.0;
        result.y = cartographic.latitude * 100.0;
        result.z = cartographic.height;
        return result;
      },
      unproject: function (cartesian, result) {
        result = result || { longitude: 0, latitude: 0, height: 0 };
        result.longitude = cartesian.x / 100.0;
        result.latitude = cartesian.y / 100.0;
        result.height = cartesian.z;
        return result;
      },
    });

    const serialized = original.serialize();
    const deserialized = deserializeMapProjection(serialized);

    expect(deserialized).toBeInstanceOf(CustomProjection);

    const c = new Cartographic(0.5, 0.3, 100);
    const p1 = original.project(c);
    const p2 = deserialized.project(c);
    expect(p1.x).toBeCloseTo(p2.x, 10);
    expect(p1.y).toBeCloseTo(p2.y, 10);
  });

  it("preserves wgs84Bounds and projectedBounds on Proj4Projection", function () {
    const original = new Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs",
      wgs84Bounds: Rectangle.fromDegrees(-30, 30, 50, 75),
      projectedBounds: Rectangle.fromDegrees(0, 0, 1, 1),
    });

    const serialized = original.serialize();
    const deserialized = deserializeMapProjection(serialized);

    // Clamping behavior should still apply after the round-trip.
    const outside = Cartographic.fromDegrees(-170, -80, 0);
    const p1 = original.project(outside);
    const p2 = deserialized.project(outside);
    expect(p1.x).toBeCloseTo(p2.x, 6);
    expect(p1.y).toBeCloseTo(p2.y, 6);
  });

  it("rejects malformed CustomProjection source", function () {
    // A truncated/corrupted serialized payload must surface as a SyntaxError
    // at deserialize time rather than producing a projection that fails
    // unpredictably on first use.
    expect(function () {
      deserializeMapProjection({
        mapProjectionType: MapProjectionType.CUSTOM,
        json: {
          projectSource: "this is not javascript",
          unprojectSource: "function (c) { return c; }",
          ellipsoid: Ellipsoid.pack(Ellipsoid.WGS84, []),
        },
      });
    }).toThrowError(SyntaxError);
  });
});
