import {
  BoundingSphere,
  CustomProjection,
  Proj4Projection,
  Rectangle,
} from "../../index.js";

describe("Core/BoundingSphere.fromRectangleWithHeights2D non-cylindrical path", function () {
  it("walks an antimeridian-crossing rectangle in the correct direction", function () {
    // LAEA centered on the antimeridian — a 20° rectangle that wraps from
    // 170° to -170° sits around the projection origin and should give a
    // small bounding sphere, not one spanning the whole projection.
    const projection = new Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=0 +lon_0=180 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs",
    });
    const wrap = Rectangle.fromDegrees(170, -10, -170, 10);

    const sphere = BoundingSphere.fromRectangleWithHeights2D(
      wrap,
      projection,
      0.0,
      0.0,
    );

    // 20° at the equator on WGS84 ≈ 2,226 km diameter, so the bounding
    // sphere radius should be a few thousand km at most — definitely not
    // the ~20,000 km half-circumference the broken sampler would produce.
    expect(sphere.radius).toBeLessThan(3_000_000);
    expect(sphere.radius).toBeGreaterThan(1_000_000);
  });

  it("filters non-finite samples", function () {
    const polarFail = new CustomProjection({
      project: function (cartographic, result) {
        result = result || { x: 0, y: 0, z: 0 };
        if (Math.abs(cartographic.latitude) > (60 * Math.PI) / 180) {
          result.x = NaN;
          result.y = NaN;
        } else {
          result.x = cartographic.longitude * 6378137.0;
          result.y = cartographic.latitude * 6378137.0;
        }
        result.z = cartographic.height;
        return result;
      },
      unproject: function (cartesian, result) {
        result = result || { longitude: 0, latitude: 0, height: 0 };
        return result;
      },
    });

    const rect = Rectangle.fromDegrees(-10, 50, 10, 89);
    const sphere = BoundingSphere.fromRectangleWithHeights2D(
      rect,
      polarFail,
      0.0,
      0.0,
    );

    expect(isFinite(sphere.radius)).toBe(true);
    expect(isFinite(sphere.center.x)).toBe(true);
    expect(isFinite(sphere.center.y)).toBe(true);
    expect(isFinite(sphere.center.z)).toBe(true);
  });

  it("handles a zero-size (point) rectangle as a zero-radius sphere", function () {
    // Edge case mirroring Rectangle.approximateProjectedExtents: if the
    // input rectangle collapses to a single point, the grid sampler must
    // still produce a finite sphere (zero radius, centered on the point's
    // projected location) rather than NaN or Infinity.
    const projection = new Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=52 +lon_0=10 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    });
    const point = new Rectangle(0.5, 0.3, 0.5, 0.3);

    const sphere = BoundingSphere.fromRectangleWithHeights2D(
      point,
      projection,
      0.0,
      0.0,
    );
    expect(isFinite(sphere.center.x)).toBe(true);
    expect(isFinite(sphere.center.y)).toBe(true);
    expect(isFinite(sphere.center.z)).toBe(true);
    expect(isFinite(sphere.radius)).toBe(true);
    expect(sphere.radius).toBe(0);
  });

  it("returns a finite degenerate sphere when every sample is non-finite", function () {
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

    const sphere = BoundingSphere.fromRectangleWithHeights2D(
      Rectangle.fromDegrees(-10, -10, 10, 10),
      allNaN,
      0.0,
      0.0,
    );

    // Degenerate but non-NaN — culling code can survive a zero-radius sphere
    // at the origin, but breaks on NaN.
    expect(isFinite(sphere.radius)).toBe(true);
    expect(isFinite(sphere.center.x)).toBe(true);
    expect(isFinite(sphere.center.y)).toBe(true);
    expect(isFinite(sphere.center.z)).toBe(true);
  });
});
