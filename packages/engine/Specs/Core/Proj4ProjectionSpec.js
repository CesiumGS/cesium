import {
  Cartographic,
  Ellipsoid,
  Proj4Projection,
  Rectangle,
  deserializeMapProjection,
  MapProjectionType,
} from "../../index.js";

describe("Core/Proj4Projection", function () {
  const lambertWKT =
    "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs";

  it("constructs with sourceProjection", function () {
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
    });

    expect(projection.isNormalCylindrical).toBe(false);
    expect(projection.sourceProjection).toBe(lambertWKT);
    expect(projection.ellipsoid).toBeDefined();
  });

  it("throws without sourceProjection", function () {
    expect(function () {
      return new Proj4Projection({});
    }).toThrowDeveloperError();
  });

  it("throws without options", function () {
    expect(function () {
      return new Proj4Projection();
    }).toThrowDeveloperError();
  });

  it("projects and unprojects", function () {
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
    });

    const cartographic = Cartographic.fromDegrees(10, 52, 100);
    const projected = projection.project(cartographic);

    expect(projected.x).toBeCloseTo(4321000, -1);
    expect(projected.y).toBeCloseTo(3210000, -1);
    expect(projected.z).toBeCloseTo(100, 0);

    const unprojected = projection.unproject(projected);
    expect(unprojected.longitude).toBeCloseTo(cartographic.longitude, 10);
    expect(unprojected.latitude).toBeCloseTo(cartographic.latitude, 10);
    expect(unprojected.height).toBeCloseTo(100, 0);
  });

  it("projects to correct Lambert LAEA values", function () {
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
    });

    // Paris
    const paris = Cartographic.fromDegrees(2.35, 48.86, 0);
    const projected = projection.project(paris);
    // EPSG:3035 known value for Paris is approximately (3760650, 2889878)
    expect(projected.x).toBeCloseTo(3760650, -2);
    expect(projected.y).toBeCloseTo(2889878, -2);
  });

  it("round-trips multiple points", function () {
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
    });

    const points = [
      Cartographic.fromDegrees(0, 0, 0),
      Cartographic.fromDegrees(-5, 45, 500),
      Cartographic.fromDegrees(30, 60, 0),
      Cartographic.fromDegrees(10, 52, 0),
    ];

    for (const point of points) {
      const projected = projection.project(point);
      const unprojected = projection.unproject(projected);
      expect(unprojected.longitude).toBeCloseTo(point.longitude, 8);
      expect(unprojected.latitude).toBeCloseTo(point.latitude, 8);
      expect(unprojected.height).toBeCloseTo(point.height, 0);
    }
  });

  it("clamps to wgs84Bounds", function () {
    const projection = new Proj4Projection({
      sourceProjection:
        "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 +a=6378273 +b=6356889.449 +units=m +no_defs",
      wgs84Bounds: Rectangle.fromDegrees(-180, 30, 180, 90),
    });

    // Point at north pole should project to center
    const pole = Cartographic.fromDegrees(0, 90, 0);
    const projected = projection.project(pole);
    expect(projected.x).toBeCloseTo(0, 0);
    expect(projected.y).toBeCloseTo(0, 0);
  });

  it("applies heightScale", function () {
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
      heightScale: 2.0,
    });

    const cartographic = Cartographic.fromDegrees(10, 52, 100);
    const projected = projection.project(cartographic);
    expect(projected.z).toBeCloseTo(200, 0);

    const unprojected = projection.unproject(projected);
    expect(unprojected.height).toBeCloseTo(100, 0);
  });

  it("returns non-finite components on non-finite input coordinates", function () {
    // proj4 itself throws on NaN/Infinity inputs, but Cesium chains
    // sometimes re-project a cartographic recovered from a previous unproject
    // that left it non-finite. Match GeographicProjection's behavior
    // (Math.cos(NaN) = NaN, no throw) so callers don't need to pre-check.
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
    });

    const nan = projection.project(new Cartographic(NaN, NaN, 0));
    expect(isFinite(nan.x)).toBe(false);
    expect(isFinite(nan.y)).toBe(false);

    const inf = projection.project(new Cartographic(Infinity, 0, 0));
    expect(isFinite(inf.x)).toBe(false);
    expect(isFinite(inf.y)).toBe(false);
  });

  it("returns sentinel coordinates at projection antipode", function () {
    // LAEA centered on (52, 10) is singular at its antipode (-52, -170).
    // proj4 returns null components there; we want to confirm the call does
    // not throw — callers (e.g. approximateMaximumCoordinate) rely on
    // isFinite() to filter the result.
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
    });

    const antipode = Cartographic.fromDegrees(-170, -52, 0);
    const result = projection.project(antipode);
    expect(result).toBeDefined();
    // Either non-finite or capped; the exact sentinel is a proj4 detail.
    expect(isFinite(result.x) && isFinite(result.y)).toBe(false);
  });

  it("returns sentinel coordinates when unprojecting outside valid area", function () {
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
    });

    const result = projection.unproject({ x: 1e15, y: 1e15, z: 0 });
    expect(result).toBeDefined();
    expect(isFinite(result.longitude) && isFinite(result.latitude)).toBe(false);
  });

  it("returns non-finite components when unprojecting non-finite cartesian", function () {
    // Mirror of project's NaN-safe behavior: chains that re-feed a NaN
    // cartesian (camera updates after a degenerate previous frame) must
    // not throw inside proj4.
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
    });

    const fromNaN = projection.unproject({ x: NaN, y: NaN, z: 0 });
    expect(isFinite(fromNaN.longitude)).toBe(false);
    expect(isFinite(fromNaN.latitude)).toBe(false);

    const fromInf = projection.unproject({ x: Infinity, y: 0, z: 0 });
    expect(isFinite(fromInf.longitude)).toBe(false);
    expect(isFinite(fromInf.latitude)).toBe(false);
  });

  it("clamps coordinates outside wgs84Bounds before projecting", function () {
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
      wgs84Bounds: Rectangle.fromDegrees(-30, 30, 50, 75),
    });

    // Far outside the bounds — should be clamped to the corner
    const outside = Cartographic.fromDegrees(-170, -80, 0);
    const corner = Cartographic.fromDegrees(-30, 30, 0);
    const projectedOutside = projection.project(outside);
    const projectedCorner = projection.project(corner);

    expect(projectedOutside.x).toBeCloseTo(projectedCorner.x, 6);
    expect(projectedOutside.y).toBeCloseTo(projectedCorner.y, 6);
  });

  it("round-trips across the antimeridian", function () {
    // Use a projection well-defined globally (Equal Earth) so we can
    // probe both sides of the antimeridian.
    const projection = new Proj4Projection({
      sourceProjection: "+proj=eqearth +datum=WGS84 +units=m +no_defs",
    });

    const points = [
      Cartographic.fromDegrees(179.9, 0, 0),
      Cartographic.fromDegrees(-179.9, 0, 0),
      Cartographic.fromDegrees(180, 0, 0),
      Cartographic.fromDegrees(-180, 0, 0),
    ];

    for (const point of points) {
      const projected = projection.project(point);
      const unprojected = projection.unproject(projected);
      // Antimeridian wraps: longitude may come back as ±π. Compare wrapped.
      const dLon = Math.abs(unprojected.longitude - point.longitude);
      const wrapped = Math.min(dLon, Math.abs(dLon - 2.0 * Math.PI));
      expect(wrapped).toBeLessThan(1e-6);
      expect(unprojected.latitude).toBeCloseTo(point.latitude, 8);
    }
  });

  it("round-trips at the equator and prime meridian", function () {
    const projection = new Proj4Projection({
      sourceProjection: "+proj=robin +datum=WGS84 +units=m +no_defs",
    });

    const origin = Cartographic.fromDegrees(0, 0, 0);
    const projected = projection.project(origin);
    const unprojected = projection.unproject(projected);

    expect(unprojected.longitude).toBeCloseTo(0, 10);
    expect(unprojected.latitude).toBeCloseTo(0, 10);
  });

  it("rejects a zero heightScale at construction", function () {
    // heightScale is the divisor in unproject — zero would propagate NaN
    // heights into the camera and terrain pipeline. Reject up front.
    expect(function () {
      return new Proj4Projection({
        sourceProjection: lambertWKT,
        heightScale: 0,
      });
    }).toThrowDeveloperError();
  });

  it("rejects a non-finite heightScale at construction", function () {
    expect(function () {
      return new Proj4Projection({
        sourceProjection: lambertWKT,
        heightScale: NaN,
      });
    }).toThrowDeveloperError();

    expect(function () {
      return new Proj4Projection({
        sourceProjection: lambertWKT,
        heightScale: Infinity,
      });
    }).toThrowDeveloperError();
  });

  it("accepts a negative heightScale", function () {
    // Negative is unusual but mathematically well-defined (mirrors the
    // height axis). Don't reject — only zero and non-finite cause silent
    // NaN propagation.
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
      heightScale: -1.0,
    });
    const projected = projection.project(Cartographic.fromDegrees(10, 52, 100));
    expect(projected.z).toBe(-100);
    const unprojected = projection.unproject(projected);
    expect(unprojected.height).toBeCloseTo(100, 6);
  });

  it("documents the wgs84Bounds clamp behavior for antimeridian-crossing ranges", function () {
    // Regression guard for a known limitation. wgs84Bounds with east < west
    // describes an antimeridian-crossing valid area (Pacific projections,
    // EPSG:5041, etc.). The current implementation feeds the bounds straight
    // into CesiumMath.clamp(value, west, east), which has no wrap-around
    // awareness. CesiumMath.clamp returns `value < min ? min : value > max
    // ? max : value`, so with min=170 and max=-170:
    //   - clamp(0, 170, -170) returns 170 (value < min branch)
    //   - clamp(170, 170, -170) returns -170 (value > max branch, since 170 > -170)
    // Both inputs sit "outside" the inverted range and snap to opposite
    // edges. This test pins that quirky behavior so a future fix to
    // wrap-aware clamping is detected as a deliberate change rather than
    // sneaking in.
    const projection = new Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=0 +lon_0=180 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs",
      wgs84Bounds: Rectangle.fromDegrees(170, -10, -170, 10),
    });

    // Input lon=0 hits the `value < min` branch and gets clamped to 170°.
    // Input lon=170 itself trips the `value > max` branch (170 > -170) and
    // gets clamped to -170°. So the two end up on opposite sides of the
    // projection center and project to opposite x signs.
    const fromZero = projection.project(Cartographic.fromDegrees(0, 0, 0));
    const fromWestEdge = projection.project(
      Cartographic.fromDegrees(170, 0, 0),
    );
    expect(fromZero.x).toBeCloseTo(-1111782.5, -1);
    expect(fromWestEdge.x).toBeCloseTo(1111782.5, -1);
    expect(fromZero.x).not.toBe(fromWestEdge.x);
  });

  it("uses a result instance when provided", function () {
    const projection = new Proj4Projection({ sourceProjection: lambertWKT });
    const cartographic = Cartographic.fromDegrees(10, 52, 50);

    const projectResult = { x: 0, y: 0, z: 0 };
    const projected = projection.project(cartographic, projectResult);
    expect(projected).toBe(projectResult);

    const unprojectResult = new Cartographic();
    const unprojected = projection.unproject(projected, unprojectResult);
    expect(unprojected).toBe(unprojectResult);
  });

  describe("shaderUniforms", function () {
    it("matches the projection's declared parameters for Lambert Europe", function () {
      const projection = new Proj4Projection({
        sourceProjection: lambertWKT,
      });
      const u = projection.shaderUniforms;

      // 10°, 52° in radians
      expect(u.lon0).toBeCloseTo((10 * Math.PI) / 180, 10);
      expect(u.lat0).toBeCloseTo((52 * Math.PI) / 180, 10);
      expect(u.falseEasting).toBe(4321000);
      expect(u.falseNorthing).toBe(3210000);
      // GRS80 semi-major axis
      expect(u.semiMajorAxis).toBeCloseTo(6378137, 6);
      // GRS80 eccentricity squared
      expect(u.e2).toBeCloseTo(0.00669438, 6);
    });

    it("uses the projection's declared ellipsoid, not the configured one", function () {
      // Regression guard: a previous WKT-regex implementation only knew
      // GRS80 and WGS84 by name. Any other ellps (here Clarke 1880 IGN
      // for Lambert 93) silently fell back to the configured ellipsoid
      // (WGS84 by default), making the GPU shader disagree with proj4.
      const lambert93 = new Proj4Projection({
        sourceProjection:
          "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=clrk80ign +units=m",
      });
      const u = lambert93.shaderUniforms;

      // Clarke 1880 IGN: a = 6378249.2 (NOT WGS84's 6378137)
      expect(u.semiMajorAxis).toBeCloseTo(6378249.2, 1);
      expect(u.lon0).toBeCloseTo((3 * Math.PI) / 180, 10);
      expect(u.lat0).toBeCloseTo((46.5 * Math.PI) / 180, 10);
    });

    it("defaults missing parameters to zero for global projections", function () {
      // Robinson has no central meridian/latitude — proj4 leaves long0/lat0
      // undefined. We must default them to 0 rather than propagate undefined
      // (which becomes NaN in the shader).
      const projection = new Proj4Projection({
        sourceProjection: "+proj=robin +datum=WGS84 +units=m +no_defs",
      });
      const u = projection.shaderUniforms;

      expect(u.lon0).toBe(0);
      expect(u.lat0).toBe(0);
      expect(u.sinLat0).toBe(0);
      expect(u.cosLat0).toBe(1);
      expect(isFinite(u.semiMajorAxis)).toBe(true);
    });

    it("produces finite uniforms for the spherical case (e = 0)", function () {
      // A sphere-based projection has e = 0; the LAEA q-function has a
      // 1/(2e) term that diverges in that limit. The uniforms must stay
      // finite for the GPU.
      const projection = new Proj4Projection({
        sourceProjection:
          "+proj=laea +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs",
      });
      const u = projection.shaderUniforms;

      expect(u.e).toBe(0);
      expect(u.e2).toBe(0);
      expect(isFinite(u.qp)).toBe(true);
      expect(isFinite(u.D)).toBe(true);
      expect(isFinite(u.Rq)).toBe(true);
    });
  });

  it("preserves a non-default ellipsoid through serialization", function () {
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
      ellipsoid: Ellipsoid.UNIT_SPHERE,
    });

    const serialized = projection.serialize();
    const deserialized = deserializeMapProjection(serialized);

    expect(deserialized.ellipsoid.radii.x).toBeCloseTo(1.0, 10);
    expect(deserialized.ellipsoid.radii.y).toBeCloseTo(1.0, 10);
    expect(deserialized.ellipsoid.radii.z).toBeCloseTo(1.0, 10);
  });

  it("serializes and deserializes", function () {
    const projection = new Proj4Projection({
      sourceProjection: lambertWKT,
      heightScale: 1.5,
      wgs84Bounds: Rectangle.fromDegrees(-180, -90, 180, 90),
    });

    const serialized = projection.serialize();
    expect(serialized.mapProjectionType).toBe(MapProjectionType.PROJ4);
    expect(serialized.json.sourceProjection).toBe(lambertWKT);
    expect(serialized.json.heightScale).toBe(1.5);
    expect(serialized.json.wgs84Bounds).toBeDefined();

    const deserialized = deserializeMapProjection(serialized);
    expect(deserialized).toBeInstanceOf(Proj4Projection);
    expect(deserialized.isNormalCylindrical).toBe(false);

    // Verify projection math matches
    const cartographic = Cartographic.fromDegrees(10, 50, 0);
    const p1 = projection.project(cartographic);
    const p2 = deserialized.project(cartographic);
    expect(p1.x).toBeCloseTo(p2.x, 6);
    expect(p1.y).toBeCloseTo(p2.y, 6);
  });
});
