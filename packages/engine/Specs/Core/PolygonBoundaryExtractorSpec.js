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

      const result =
        PolygonBoundaryExtractor.convexHullFromPositions(positions);

      expect(result).toBeDefined();
      expect(result.hierarchy).toBeInstanceOf(PolygonHierarchy);
      expect(result.hierarchy.positions.length).toEqual(4);
      expect(result.hierarchy.holes.length).toEqual(0);
      expect(result.minHeight).toEqual(0);
      expect(result.maxHeight).toEqual(0);
    });

    it("accepts a custom ellipsoid", function () {
      const positions = [
        Cartesian3.fromRadians(0, 0, 0),
        Cartesian3.fromRadians(0.001, 0, 0),
        Cartesian3.fromRadians(0.0005, 0.001, 0),
      ];

      const result = PolygonBoundaryExtractor.convexHullFromPositions(
        positions,
        {
          ellipsoid: Ellipsoid.WGS84,
        },
      );

      expect(result).toBeDefined();
      expect(result.hierarchy.positions.length).toEqual(3);
    });

    it("throws without positions", function () {
      expect(function () {
        PolygonBoundaryExtractor.convexHullFromPositions(undefined);
      }).toThrowDeveloperError();
    });

    it("returns correct minHeight and maxHeight", function () {
      const positions = [
        Cartesian3.fromRadians(0, 0, 10),
        Cartesian3.fromRadians(0.001, 0, 50),
        Cartesian3.fromRadians(0.001, 0.001, 30),
        Cartesian3.fromRadians(0, 0.001, 5),
      ];

      const result =
        PolygonBoundaryExtractor.convexHullFromPositions(positions);

      expect(result).toBeDefined();
      expect(result.minHeight).toEqualEpsilon(5, 0.01);
      expect(result.maxHeight).toEqualEpsilon(50, 0.01);
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
