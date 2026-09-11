import {
  Cartesian2,
  CustomProjection,
  GeographicProjection,
  WebMercatorProjection,
  MapProjection,
  Matrix4,
  Matrix4Projection,
} from "../../index.js";

describe("Core/MapProjection", function () {
  describe("isNormalCylindrical", function () {
    it("GeographicProjection returns true", function () {
      const projection = new GeographicProjection();
      expect(projection.isNormalCylindrical).toBe(true);
    });

    it("WebMercatorProjection returns true", function () {
      const projection = new WebMercatorProjection();
      expect(projection.isNormalCylindrical).toBe(true);
    });

    it("Matrix4Projection returns false", function () {
      const projection = new Matrix4Projection({
        matrix: Matrix4.IDENTITY,
      });
      expect(projection.isNormalCylindrical).toBe(false);
    });
  });

  describe("serialize", function () {
    it("GeographicProjection serializes", function () {
      const projection = new GeographicProjection();
      const serialized = projection.serialize();
      expect(serialized.mapProjectionType).toBe(0);
      expect(serialized.json).toBeDefined();
      expect(serialized.json.ellipsoid).toBeDefined();
    });

    it("WebMercatorProjection serializes", function () {
      const projection = new WebMercatorProjection();
      const serialized = projection.serialize();
      expect(serialized.mapProjectionType).toBe(1);
      expect(serialized.json).toBeDefined();
    });
  });

  describe("approximateMaximumCoordinate", function () {
    it("returns positive values for GeographicProjection", function () {
      const projection = new GeographicProjection();
      const result = MapProjection.approximateMaximumCoordinate(projection);
      expect(result.x).toBeGreaterThan(0);
      expect(result.y).toBeGreaterThan(0);
    });

    it("returns positive values for WebMercatorProjection", function () {
      const projection = new WebMercatorProjection();
      const result = MapProjection.approximateMaximumCoordinate(projection);
      expect(result.x).toBeGreaterThan(0);
      expect(result.y).toBeGreaterThan(0);
    });

    it("returns positive values for Matrix4Projection", function () {
      const projection = new Matrix4Projection({
        matrix: Matrix4.IDENTITY,
        degrees: true,
      });
      const result = MapProjection.approximateMaximumCoordinate(projection);
      expect(result.x).toBeGreaterThan(0);
      expect(result.y).toBeGreaterThan(0);
    });

    it("uses result parameter", function () {
      const projection = new GeographicProjection();
      const result = new Cartesian2();
      const returned = MapProjection.approximateMaximumCoordinate(
        projection,
        result,
      );
      expect(returned).toBe(result);
      expect(result.x).toBeGreaterThan(0);
    });

    it("geographic max coord matches PI * radius", function () {
      const projection = new GeographicProjection();
      const result = MapProjection.approximateMaximumCoordinate(projection);
      const expected = Math.PI * projection.ellipsoid.maximumRadius;
      expect(result.x).toBeCloseTo(expected, 0);
    });

    it("skips non-finite samples for projections singular at a pole", function () {
      // A projection that returns NaN for any input must not poison the
      // accumulator — the function should fall back to a finite default
      // rather than propagate NaN to SCENE2D frustum bounds.
      const allNaN = new CustomProjection({
        project: function (cartographic, result) {
          result = result || { x: 0, y: 0, z: 0 };
          result.x = NaN;
          result.y = NaN;
          result.z = 0;
          return result;
        },
        unproject: function (cartesian, result) {
          result = result || { longitude: 0, latitude: 0, height: 0 };
          return result;
        },
      });

      const result = MapProjection.approximateMaximumCoordinate(allNaN);
      expect(isFinite(result.x)).toBe(true);
      expect(isFinite(result.y)).toBe(true);
      expect(result.x).toBeGreaterThan(0);
      expect(result.y).toBeGreaterThan(0);
    });

    it("caps runaway samples at 4 * maximumRadius", function () {
      // Stereographic and similar projections grow to 1e14 m near the
      // antipodal singularity. Those values are finite (so isFinite() does
      // not reject them) but would make the SCENE2D frustum absurdly large.
      // The implementation caps each accepted sample at 4 * R.
      const huge = new CustomProjection({
        project: function (cartographic, result) {
          result = result || { x: 0, y: 0, z: 0 };
          result.x = 1e20;
          result.y = 1e20;
          result.z = 0;
          return result;
        },
        unproject: function (cartesian, result) {
          result = result || { longitude: 0, latitude: 0, height: 0 };
          return result;
        },
      });

      const result = MapProjection.approximateMaximumCoordinate(huge);
      const cap = huge.ellipsoid.maximumRadius * 4.0;
      expect(result.x).toBeLessThanOrEqual(cap);
      expect(result.y).toBeLessThanOrEqual(cap);
    });

    it("returns a non-zero fallback when every sample is rejected", function () {
      // If the cap rejects every sample (here: huge values exceed 4*R),
      // the implementation falls back to 2 * R rather than returning zero.
      const huge = new CustomProjection({
        project: function (cartographic, result) {
          result = result || { x: 0, y: 0, z: 0 };
          result.x = 1e20;
          result.y = 1e20;
          result.z = 0;
          return result;
        },
        unproject: function (cartesian, result) {
          result = result || { longitude: 0, latitude: 0, height: 0 };
          return result;
        },
      });

      const result = MapProjection.approximateMaximumCoordinate(huge);
      const expected = huge.ellipsoid.maximumRadius * 2.0;
      expect(result.x).toBeCloseTo(expected, -2);
      expect(result.y).toBeCloseTo(expected, -2);
    });
  });
});
