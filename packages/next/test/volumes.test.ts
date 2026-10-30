import { describe, expect, it } from "vitest";
import Cartesian3 from "cesium-oracle/Cartesian3.js";
import Ellipsoid from "cesium-oracle/Ellipsoid.js";
import Matrix3 from "cesium-oracle/Matrix3.js";
import OrientedBoundingBox from "cesium-oracle/OrientedBoundingBox.js";
import Plane from "cesium-oracle/Plane.js";
import Rectangle from "cesium-oracle/Rectangle.js";
import TileBoundingRegion from "cesium-engine-oracle/Scene/TileBoundingRegion.js";
import SceneMode from "cesium-engine-oracle/Scene/SceneMode.js";
import {
  INSIDE,
  INTERSECTING,
  OUTSIDE,
  obbDistanceSquaredTo,
  obbFromRectangle,
  obbIntersectPlane,
  regionDistance,
  regionFromJson,
} from "../src/streaming/volumes.ts";
import { Ellipsoid as NextEllipsoid } from "../src/math/ellipsoid.ts";

let seed = 12345;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lerp = (a: number, b: number) => a + (b - a) * random();

/** Regions exercising every branch: small, > π wide, north/south of the equator, spanning it. */
function regions(): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < 60; i++) {
    const kind = i % 5;
    const width =
      kind === 1
        ? lerp(Math.PI + 0.1, 2 * Math.PI)
        : lerp(1e-5, kind === 4 ? 0.5 : 0.05);
    const height = lerp(1e-5, 0.4);
    const west = lerp(-Math.PI, Math.PI);
    const south =
      kind === 2
        ? lerp(0.01, 1.0)
        : kind === 3
          ? lerp(-1.4, -0.45)
          : lerp(-0.2, 0.0);
    let east = west + width;
    if (east > Math.PI) {
      east -= 2 * Math.PI; // crosses the antimeridian
    }
    out.push([
      west,
      south,
      east,
      south + height,
      lerp(-100, 50),
      lerp(60, 600),
    ]);
  }
  return out;
}

const close = (a: number, b: number, scale: number) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(
    1e-9 * Math.max(1, Math.abs(scale)),
  );

describe("Legacy1x volumes vs CesiumJS 1.x", () => {
  it("OrientedBoundingBox.fromRectangle matches", () => {
    for (const r of regions()) {
      const ours = obbFromRectangle(r[0]!, r[1]!, r[2]!, r[3]!, r[4]!, r[5]!);
      const theirs = OrientedBoundingBox.fromRectangle(
        new Rectangle(r[0], r[1], r[2], r[3]),
        r[4],
        r[5],
        Ellipsoid.WGS84,
      );
      for (let k = 0; k < 3; k++) {
        close(ours.center[k]!, Cartesian3.pack(theirs.center, [])[k]!, 6.4e6);
      }
      for (let k = 0; k < 9; k++) {
        close(ours.halfAxes[k]!, theirs.halfAxes[k]!, 6.4e6);
      }
    }
  });

  it("region distance matches TileBoundingRegion.distanceToCamera", () => {
    const ellipsoid = NextEllipsoid.WGS84;
    for (const r of regions()) {
      const ours = regionFromJson(r);
      const theirs = new TileBoundingRegion({
        rectangle: new Rectangle(r[0], r[1], r[2], r[3]),
        minimumHeight: r[4],
        maximumHeight: r[5],
        ellipsoid: Ellipsoid.WGS84,
      });
      for (let j = 0; j < 8; j++) {
        // Cameras near and far, inside and outside the rectangle.
        const lon = r[0]! + lerp(-0.3, 0.3);
        const lat = (r[1]! + r[3]!) / 2 + lerp(-0.3, 0.3);
        const height = lerp(-50, j < 4 ? 2000 : 2e6);
        const carto = { longitude: lon, latitude: lat, height };
        const p = ellipsoid.cartographicToCartesian(carto, new Float64Array(3));
        const c = ellipsoid.cartesianToCartographic(p, {
          longitude: 0,
          latitude: 0,
          height: 0,
        })!;
        const frameState = {
          mode: SceneMode.SCENE3D,
          camera: {
            positionWC: new Cartesian3(p[0], p[1], p[2]),
            positionCartographic: c,
          },
        };
        const expected = theirs.distanceToCamera(frameState);
        close(regionDistance(ours, p, c), expected, expected);
      }
    }
  });

  it("OBB distance and plane classification match", () => {
    for (let i = 0; i < 200; i++) {
      const center = new Cartesian3(
        lerp(-1e6, 1e6),
        lerp(-1e6, 1e6),
        lerp(-1e6, 1e6),
      );
      const halfAxes = new Matrix3(
        ...Array.from({ length: 9 }, () => lerp(-500, 500)),
      );
      // Some degenerate boxes: zero out one or two axes.
      if (i % 7 === 0) {
        Matrix3.setColumn(halfAxes, 1, Cartesian3.ZERO, halfAxes);
      }
      if (i % 11 === 0) {
        Matrix3.setColumn(halfAxes, 2, Cartesian3.ZERO, halfAxes);
      }
      const theirs = new OrientedBoundingBox(center, halfAxes);
      const ours = {
        center: Float64Array.of(center.x, center.y, center.z),
        halfAxes: Float64Array.from(halfAxes),
      };
      const point = new Cartesian3(
        center.x + lerp(-2000, 2000),
        center.y + lerp(-2000, 2000),
        center.z + lerp(-2000, 2000),
      );
      const expected = OrientedBoundingBox.distanceSquaredTo(theirs, point);
      close(
        obbDistanceSquaredTo(ours, Float64Array.of(point.x, point.y, point.z)),
        expected,
        expected,
      );
      const normal = Cartesian3.normalize(
        new Cartesian3(lerp(-1, 1), lerp(-1, 1), lerp(-1, 1)),
        new Cartesian3(),
      );
      const distance = -Cartesian3.dot(normal, center) + lerp(-1500, 1500);
      const plane = new Plane(normal, distance);
      const map = { [-1]: OUTSIDE, [0]: INTERSECTING, [1]: INSIDE } as const;
      expect(
        obbIntersectPlane(ours, [normal.x, normal.y, normal.z], distance),
      ).toBe(
        map[OrientedBoundingBox.intersectPlane(theirs, plane) as -1 | 0 | 1],
      );
    }
  });
});
