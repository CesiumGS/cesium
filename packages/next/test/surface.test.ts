// The distance over a body: Karney's geodesic (geographiclib-geodesic) against Python's
// geographiclib, in test/fixtures/frames/geodesic.json (scripts/frameFixtures.py geodesic).
import { describe, expect, it } from "vitest";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";
import { surfaceDistance } from "../src/measure/surface.ts";
import { vec3 } from "../src/math/vec3.ts";
import fixture from "./fixtures/frames/geodesic.json";

const deg = Math.PI / 180;

interface Point {
  lonDeg: number;
  latDeg: number;
  height: number;
  cartesian: number[];
}
interface Row {
  kind: string;
  a: Point;
  b: Point;
  distance: number;
  azimuth1Deg: number;
  azimuth2Deg: number;
}

/** The smallest angle between two azimuths, radians (they wrap at ±π). */
function angleError(x: number, y: number): number {
  const d = Math.abs(x - y) % (2 * Math.PI);
  return Math.min(d, 2 * Math.PI - d);
}

const moon = new Ellipsoid(
  fixture.moonRadius,
  fixture.moonRadius,
  fixture.moonRadius,
);

describe("surfaceDistance", () => {
  const cases: [string, Ellipsoid, Row[]][] = [
    ["WGS84", Ellipsoid.WGS84, fixture.wgs84 as Row[]],
    ["the Moon's sphere", moon, fixture.moon as Row[]],
  ];
  for (const [name, ellipsoid, rows] of cases) {
    it(`matches geographiclib on ${name} (${rows.length} pairs)`, () => {
      let worstDistance = 0;
      let worstAzimuth = 0;
      for (const row of rows) {
        const r = surfaceDistance(ellipsoid, row.a.cartesian, row.b.cartesian);
        const distanceError = Math.abs(r.distance - row.distance);
        worstDistance = Math.max(worstDistance, distanceError);
        expect(distanceError, `${row.kind} distance`).toBeLessThan(1e-6);
        if (row.kind !== "coincident") {
          // A coincident pair's azimuths are whatever GeographicLib returns.
          const e1 = angleError(r.azimuthA, row.azimuth1Deg * deg);
          const e2 = angleError(r.azimuthB, row.azimuth2Deg * deg);
          worstAzimuth = Math.max(worstAzimuth, e1, e2);
          expect(e1, `${row.kind} azimuth A`).toBeLessThan(1e-9);
          expect(e2, `${row.kind} azimuth B`).toBeLessThan(1e-9);
        }
        expect(r.heightDifference).toBeCloseTo(row.b.height - row.a.height, 6);
      }
      console.log(
        `${name}: worst distance error ${worstDistance} m, worst azimuth error ${worstAzimuth} rad`,
      );
    });
  }

  it("gives the height difference b - a for points above the ellipsoid", () => {
    const a = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(10, 20, 100),
      vec3(),
    );
    const b = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(11, 21, 350),
      vec3(),
    );
    const r = surfaceDistance(Ellipsoid.WGS84, a, b);
    expect(r.heightDifference).toBeCloseTo(250, 6);
    expect(surfaceDistance(Ellipsoid.WGS84, b, a).heightDifference).toBeCloseTo(
      -250,
      6,
    );
  });

  it("measures over the footprints, not the straight line", () => {
    // 100 m up changes the chord, not the geodesic between the footprints.
    const low = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(0, 0, 0),
      vec3(),
    );
    const flat = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(1, 0, 0),
      vec3(),
    );
    const high = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(1, 0, 350),
      vec3(),
    );
    expect(surfaceDistance(Ellipsoid.WGS84, low, high).distance).toBeCloseTo(
      surfaceDistance(Ellipsoid.WGS84, low, flat).distance,
      6,
    );
  });

  it("returns a 0 distance for a point and itself", () => {
    const p = [1_000_000, 2_000_000, 3_000_000];
    const r = surfaceDistance(Ellipsoid.WGS84, p, p);
    expect(r.distance).toBe(0);
    expect(r.heightDifference).toBe(0);
    expect(Number.isNaN(r.azimuthA)).toBe(false);
  });

  it("throws for a point at the body's center, which has no footprint", () => {
    expect(() =>
      surfaceDistance(Ellipsoid.WGS84, [0, 0, 0], [6378137, 0, 0]),
    ).toThrow(/center/);
  });
});
