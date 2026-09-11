import {
  CustomProjection,
  Math as CesiumMath,
  Proj4Projection,
  Rectangle,
} from "../../index.js";

describe("Core/Rectangle.approximateProjectedExtents", function () {
  function createRadialProjection() {
    // Linear longitude/latitude → meters. Used as an analytical reference:
    // the projected width of a degree band must equal radians * R.
    return new CustomProjection({
      project: function (cartographic, result) {
        result = result || { x: 0, y: 0, z: 0 };
        result.x = cartographic.longitude * 6378137.0;
        result.y = cartographic.latitude * 6378137.0;
        result.z = cartographic.height;
        return result;
      },
      unproject: function (cartesian, result) {
        result = result || { longitude: 0, latitude: 0, height: 0 };
        result.longitude = cartesian.x / 6378137.0;
        result.latitude = cartesian.y / 6378137.0;
        result.height = cartesian.z;
        return result;
      },
    });
  }

  it("samples a non-wrapping rectangle correctly", function () {
    const projection = createRadialProjection();
    const rect = Rectangle.fromDegrees(-10, -5, 10, 5);

    const ext = Rectangle.approximateProjectedExtents(rect, projection);

    // 20° width = (20° in radians) * R
    const expectedWidth = ((20 * Math.PI) / 180) * 6378137.0;
    expect(ext.east - ext.west).toBeCloseTo(expectedWidth, -1);
  });

  it("walks an antimeridian-crossing rectangle in the correct direction", function () {
    // Regression guard: with the naive (west + (east - west) * f) sampler,
    // a rectangle [170°, -170°] (= 20° wide, crossing 180°) was sampled
    // as if it were the 340° band that runs the other way around.
    // Use LAEA centered on the antimeridian so the wrap rectangle sits
    // around the projection's natural origin.
    const projection = new Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=0 +lon_0=180 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs",
    });
    const wrap = Rectangle.fromDegrees(170, -10, -170, 10);

    const ext = Rectangle.approximateProjectedExtents(wrap, projection);

    // 20° at the equator on WGS84 ≈ 2,226 km. Anything close to the full
    // 40,000 km circumference would mean the sampler walked the long way.
    const width = ext.east - ext.west;
    expect(width).toBeLessThan(3_000_000);
    expect(width).toBeGreaterThan(1_500_000);
  });

  it("filters non-finite samples instead of poisoning the bounds", function () {
    // A projection that returns NaN above 60° latitude. The sampler must
    // ignore those points rather than letting NaN propagate into min/max.
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

    // Rectangle that includes both finite (around 50°) and NaN (above 60°) bands.
    const rect = Rectangle.fromDegrees(-10, 50, 10, 89);
    const ext = Rectangle.approximateProjectedExtents(rect, polarFail);

    expect(isFinite(ext.west)).toBe(true);
    expect(isFinite(ext.east)).toBe(true);
    expect(isFinite(ext.south)).toBe(true);
    expect(isFinite(ext.north)).toBe(true);
  });

  it("handles a zero-size (point) rectangle without diverging", function () {
    // Edge case: a degenerate rectangle where west === east and
    // south === north. The grid loop projects the same cartographic many
    // times; the result must be a finite zero-extent rectangle at that
    // projected point, not NaN or Infinity.
    const projection = new Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=52 +lon_0=10 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    });
    const point = new Rectangle(0.5, 0.3, 0.5, 0.3);

    const ext = Rectangle.approximateProjectedExtents(point, projection);
    expect(isFinite(ext.west)).toBe(true);
    expect(isFinite(ext.east)).toBe(true);
    expect(isFinite(ext.south)).toBe(true);
    expect(isFinite(ext.north)).toBe(true);
    expect(ext.west).toBeCloseTo(ext.east, 6);
    expect(ext.south).toBeCloseTo(ext.north, 6);
  });

  it("returns a zero-extent rectangle when every sample is non-finite", function () {
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

    const ext = Rectangle.approximateProjectedExtents(
      Rectangle.fromDegrees(-10, -10, 10, 10),
      allNaN,
    );
    expect(ext.west).toBe(0);
    expect(ext.east).toBe(0);
    expect(ext.south).toBe(0);
    expect(ext.north).toBe(0);
  });
});

describe("Core/Rectangle.approximateCartographicExtents", function () {
  it("recovers an antimeridian-crossing rectangle with east < west", function () {
    // Round-trip: project a wrap rectangle, then back-project the extents.
    // The recovered cartographic rectangle should be expressed with
    // east < west, marking the wrap.
    const projection = new Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=0 +lon_0=180 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs",
    });
    const wrap = Rectangle.fromDegrees(170, -10, -170, 10);
    const projected = Rectangle.approximateProjectedExtents(wrap, projection);

    const back = Rectangle.approximateCartographicExtents(
      projected,
      projection,
    );

    expect(back.east).toBeLessThan(back.west);
    expect(CesiumMath.toDegrees(back.west)).toBeCloseTo(170, 0);
    expect(CesiumMath.toDegrees(back.east)).toBeCloseTo(-170, 0);
  });

  it("does not falsely mark a non-wrapping rectangle as wrapping", function () {
    // A small, central rectangle should round-trip with east > west.
    const projection = new Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs",
    });
    const rect = Rectangle.fromDegrees(5, 47, 15, 57);
    const projected = Rectangle.approximateProjectedExtents(rect, projection);

    const back = Rectangle.approximateCartographicExtents(
      projected,
      projection,
    );

    expect(back.east).toBeGreaterThan(back.west);
  });

  it("returns a zero-extent rectangle when every unprojected sample is non-finite", function () {
    const allNaN = new CustomProjection({
      project: function (cartographic, result) {
        result = result || { x: 0, y: 0, z: 0 };
        return result;
      },
      unproject: function (cartesian, result) {
        result = result || { longitude: 0, latitude: 0, height: 0 };
        result.longitude = NaN;
        result.latitude = NaN;
        return result;
      },
    });

    const back = Rectangle.approximateCartographicExtents(
      new Rectangle(-1, -1, 1, 1),
      allNaN,
    );
    expect(back.west).toBe(0);
    expect(back.east).toBe(0);
  });
});
