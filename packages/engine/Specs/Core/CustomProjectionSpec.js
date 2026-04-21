import {
  Cartographic,
  CustomProjection,
  Ellipsoid,
  MapProjectionType,
  deserializeMapProjection,
} from "../../index.js";

describe("Core/CustomProjection", function () {
  // Functions must be self-contained — no external references.
  // Use plain objects for result instead of Cesium classes.
  function createSimpleProjection() {
    return new CustomProjection({
      project: function (cartographic, result) {
        result = result || { x: 0, y: 0, z: 0 };
        result.x = cartographic.longitude * 6378137;
        result.y = cartographic.latitude * 6378137;
        result.z = cartographic.height;
        return result;
      },
      unproject: function (cartesian, result) {
        result = result || { longitude: 0, latitude: 0, height: 0 };
        result.longitude = cartesian.x / 6378137;
        result.latitude = cartesian.y / 6378137;
        result.height = cartesian.z;
        return result;
      },
    });
  }

  it("constructs with project and unproject functions", function () {
    const projection = createSimpleProjection();
    expect(projection.isNormalCylindrical).toBe(false);
    expect(projection.ellipsoid).toBeDefined();
  });

  it("throws without options", function () {
    expect(function () {
      return new CustomProjection();
    }).toThrowDeveloperError();
  });

  it("throws without project function", function () {
    expect(function () {
      return new CustomProjection({
        unproject: function () {},
      });
    }).toThrowDeveloperError();
  });

  it("throws without unproject function", function () {
    expect(function () {
      return new CustomProjection({
        project: function () {},
      });
    }).toThrowDeveloperError();
  });

  it("projects and unprojects", function () {
    const projection = createSimpleProjection();
    const cartographic = new Cartographic(0.5, 0.3, 100);
    const projected = projection.project(cartographic);

    expect(projected.x).toBeCloseTo(0.5 * 6378137, 0);
    expect(projected.y).toBeCloseTo(0.3 * 6378137, 0);
    expect(projected.z).toBeCloseTo(100, 0);

    const unprojected = projection.unproject(projected);
    expect(unprojected.longitude).toBeCloseTo(0.5, 10);
    expect(unprojected.latitude).toBeCloseTo(0.3, 10);
    expect(unprojected.height).toBeCloseTo(100, 0);
  });

  it("unproject throws without cartesian", function () {
    const projection = createSimpleProjection();
    expect(function () {
      return projection.unproject();
    }).toThrowDeveloperError();
  });

  it("propagates errors thrown by the user-supplied project function", function () {
    const projection = new CustomProjection({
      project: function () {
        throw new Error("project failed");
      },
      unproject: function (cartesian, result) {
        result = result || { longitude: 0, latitude: 0, height: 0 };
        return result;
      },
    });

    expect(function () {
      projection.project(new Cartographic(0, 0, 0));
    }).toThrowError(/project failed/);
  });

  it("returns NaN inputs to the user-supplied function unchanged", function () {
    // The class doesn't pre-validate input — confirms that responsibility
    // sits with the user function. This test would change if we ever add
    // a NaN guard in CustomProjection.project / unproject.
    const projection = createSimpleProjection();

    const result = projection.project(new Cartographic(NaN, 0, 0));
    expect(isNaN(result.x)).toBe(true);
    expect(result.y).toBe(0);
  });

  it("uses a provided result instance for project and unproject", function () {
    const projection = createSimpleProjection();

    const projectResult = { x: 0, y: 0, z: 0 };
    const projected = projection.project(
      new Cartographic(0.5, 0.3, 100),
      projectResult,
    );
    expect(projected).toBe(projectResult);

    const unprojectResult = { longitude: 0, latitude: 0, height: 0 };
    const unprojected = projection.unproject(projected, unprojectResult);
    expect(unprojected).toBe(unprojectResult);
  });

  it("defaults ellipsoid to Ellipsoid.default", function () {
    // Regression guard against the production bug we hit when ellipsoid
    // defaulted to WGS84 instead of Ellipsoid.default — produced a ~20 km
    // GeoJSON/glb offset because GeometryPipeline.projectTo2D mixed datums.
    const projection = createSimpleProjection();
    expect(projection.ellipsoid).toBe(Ellipsoid.default);
  });

  it("preserves a non-default ellipsoid through serialization", function () {
    const projection = new CustomProjection({
      project: function (cartographic, result) {
        result = result || { x: 0, y: 0, z: 0 };
        result.x = cartographic.longitude;
        result.y = cartographic.latitude;
        result.z = cartographic.height;
        return result;
      },
      unproject: function (cartesian, result) {
        result = result || { longitude: 0, latitude: 0, height: 0 };
        result.longitude = cartesian.x;
        result.latitude = cartesian.y;
        result.height = cartesian.z;
        return result;
      },
      ellipsoid: Ellipsoid.UNIT_SPHERE,
    });

    const serialized = projection.serialize();
    const deserialized = deserializeMapProjection(serialized);
    expect(deserialized.ellipsoid.radii.x).toBeCloseTo(1.0, 10);
  });

  it("rejects malformed function source on deserialization", function () {
    // A corrupted serialized payload (e.g. truncated worker message) must not
    // pass silently — `new Function(...)` will surface a SyntaxError.
    expect(function () {
      deserializeMapProjection({
        mapProjectionType: MapProjectionType.CUSTOM,
        json: {
          projectSource: "this is not valid javascript",
          unprojectSource: "function (c) { return c; }",
          ellipsoid: Ellipsoid.pack(Ellipsoid.WGS84, []),
        },
      });
    }).toThrowError(SyntaxError);
  });

  it("serializes and deserializes self-contained functions", function () {
    const projection = createSimpleProjection();
    const serialized = projection.serialize();

    expect(serialized.mapProjectionType).toBe(MapProjectionType.CUSTOM);
    expect(serialized.json.projectSource).toBeDefined();
    expect(serialized.json.unprojectSource).toBeDefined();
    expect(typeof serialized.json.projectSource).toBe("string");

    const deserialized = deserializeMapProjection(serialized);
    expect(deserialized).toBeInstanceOf(CustomProjection);
    expect(deserialized.isNormalCylindrical).toBe(false);

    // Verify the deserialized projection produces the same results
    const cartographic = new Cartographic(0.5, 0.3, 100);
    const p1 = projection.project(cartographic);
    const p2 = deserialized.project(cartographic);
    expect(p1.x).toBeCloseTo(p2.x, 6);
    expect(p1.y).toBeCloseTo(p2.y, 6);
    expect(p1.z).toBeCloseTo(p2.z, 6);
  });
});
