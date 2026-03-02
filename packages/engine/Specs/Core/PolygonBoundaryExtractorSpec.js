import {
  Cartesian3,
  Ellipsoid,
  PolygonBoundaryExtractor,
  PolygonHierarchy,
} from "../../index.js";

describe("Core/PolygonBoundaryExtractor", function () {
  describe("convexHullFromPositions", function () {
    it("computes convex hull for a set of positions", function () {
      const positions = [
        Cartesian3.fromRadians(0, 0, 0),
        Cartesian3.fromRadians(0.001, 0, 0),
        Cartesian3.fromRadians(0.001, 0.001, 0),
        Cartesian3.fromRadians(0, 0.001, 0),
        Cartesian3.fromRadians(0.0005, 0.0005, 0), // interior
      ];

      const hierarchy =
        PolygonBoundaryExtractor.convexHullFromPositions(positions);

      expect(hierarchy).toBeDefined();
      expect(hierarchy).toBeInstanceOf(PolygonHierarchy);
      expect(hierarchy.positions.length).toEqual(4);
      expect(hierarchy.holes.length).toEqual(0);
    });

    it("accepts a custom ellipsoid", function () {
      const positions = [
        Cartesian3.fromRadians(0, 0, 0),
        Cartesian3.fromRadians(0.001, 0, 0),
        Cartesian3.fromRadians(0.0005, 0.001, 0),
      ];

      const hierarchy =
        PolygonBoundaryExtractor.convexHullFromPositions(positions, {
          ellipsoid: Ellipsoid.WGS84,
        });

      expect(hierarchy).toBeDefined();
      expect(hierarchy.positions.length).toEqual(3);
    });

    it("throws without positions", function () {
      expect(function () {
        PolygonBoundaryExtractor.convexHullFromPositions(undefined);
      }).toThrowDeveloperError();
    });

    it("throws with fewer than 3 positions", function () {
      expect(function () {
        PolygonBoundaryExtractor.convexHullFromPositions([
          Cartesian3.fromRadians(0, 0, 0),
          Cartesian3.fromRadians(0.01, 0, 0),
        ]);
      }).toThrowDeveloperError();
    });
  });
});
