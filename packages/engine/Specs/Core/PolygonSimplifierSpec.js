import {
  Cartesian2,
  Cartesian3,
  Ellipsoid,
  PolygonHierarchy,
  PolygonSimplifier,
} from "../../index.js";

describe("Core/PolygonSimplifier", function () {
  describe("simplify2D", function () {
    it("returns the same points when count is at or below minimum", function () {
      const points = [
        new Cartesian2(0, 0),
        new Cartesian2(1, 0),
        new Cartesian2(1, 1),
      ];
      const result = PolygonSimplifier.simplify2D(points, 0.1);
      expect(result.length).toEqual(3);
    });

    it("simplifies a line with collinear interior points", function () {
      // Straight line from (0,0) to (10,0) with collinear points
      const points = [];
      for (let i = 0; i <= 10; i++) {
        points.push(new Cartesian2(i, 0));
      }
      const result = PolygonSimplifier.simplify2D(points, 0.1, 2);
      // Should simplify to just the two endpoints
      expect(result.length).toEqual(2);
      expect(result[0]).toEqual(new Cartesian2(0, 0));
      expect(result[1]).toEqual(new Cartesian2(10, 0));
    });

    it("preserves sharp corners", function () {
      // L-shape with a sharp corner
      const points = [
        new Cartesian2(0, 0),
        new Cartesian2(5, 0),
        new Cartesian2(5, 5), // sharp corner
        new Cartesian2(10, 5),
      ];
      const result = PolygonSimplifier.simplify2D(points, 0.1, 2);
      expect(result.length).toEqual(4);
    });

    it("removes points close to line segments", function () {
      const points = [
        new Cartesian2(0, 0),
        new Cartesian2(1, 0.001), // nearly on the line
        new Cartesian2(2, -0.001), // nearly on the line
        new Cartesian2(3, 0.001), // nearly on the line
        new Cartesian2(4, 0),
      ];
      const result = PolygonSimplifier.simplify2D(points, 0.01, 2);
      expect(result.length).toEqual(2);
    });

    it("respects minimumPoints parameter", function () {
      const points = [];
      for (let i = 0; i <= 20; i++) {
        points.push(new Cartesian2(i, 0));
      }
      const result = PolygonSimplifier.simplify2D(points, 1.0, 5);
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it("returns cloned points", function () {
      const points = [
        new Cartesian2(0, 0),
        new Cartesian2(1, 0),
        new Cartesian2(1, 1),
      ];
      const result = PolygonSimplifier.simplify2D(points, 0.1);
      expect(result[0]).toEqual(points[0]);
      expect(result[0]).not.toBe(points[0]);
    });

    it("throws without points", function () {
      expect(function () {
        PolygonSimplifier.simplify2D(undefined, 0.1);
      }).toThrowDeveloperError();
    });

    it("throws without tolerance", function () {
      expect(function () {
        PolygonSimplifier.simplify2D([new Cartesian2(0, 0)], undefined);
      }).toThrowDeveloperError();
    });
  });

  describe("simplify3D", function () {
    it("returns the same points when count is at or below minimum", function () {
      const points = [
        new Cartesian3(0, 0, 0),
        new Cartesian3(1, 0, 0),
        new Cartesian3(1, 1, 0),
      ];
      const result = PolygonSimplifier.simplify3D(points, 0.1);
      expect(result.length).toEqual(3);
    });

    it("simplifies collinear 3D points", function () {
      const points = [];
      for (let i = 0; i <= 10; i++) {
        points.push(new Cartesian3(i * 100, 0, 0));
      }
      const result = PolygonSimplifier.simplify3D(points, 1.0, 2);
      expect(result.length).toEqual(2);
    });

    it("preserves 3D corners", function () {
      const points = [
        new Cartesian3(0, 0, 0),
        new Cartesian3(100, 0, 0),
        new Cartesian3(100, 100, 0),
        new Cartesian3(0, 100, 0),
      ];
      const result = PolygonSimplifier.simplify3D(points, 1.0);
      expect(result.length).toEqual(4);
    });

    it("returns cloned points", function () {
      const points = [
        new Cartesian3(0, 0, 0),
        new Cartesian3(1, 0, 0),
        new Cartesian3(1, 1, 0),
      ];
      const result = PolygonSimplifier.simplify3D(points, 0.1);
      expect(result[0]).not.toBe(points[0]);
      expect(result[0]).toEqual(points[0]);
    });

    it("throws without points", function () {
      expect(function () {
        PolygonSimplifier.simplify3D(undefined, 0.1);
      }).toThrowDeveloperError();
    });

    it("throws without tolerance", function () {
      expect(function () {
        PolygonSimplifier.simplify3D(
          [new Cartesian3(0, 0, 0)],
          undefined,
        );
      }).toThrowDeveloperError();
    });
  });

  describe("simplifyHierarchy", function () {
    it("simplifies outer ring of a PolygonHierarchy", function () {
      // Create a ring with many points along straight edges
      const positions = [];
      // Bottom edge
      for (let i = 0; i <= 10; i++) {
        positions.push(Cartesian3.fromDegrees(i * 0.001, 0));
      }
      // Right edge
      for (let i = 1; i <= 10; i++) {
        positions.push(Cartesian3.fromDegrees(0.01, i * 0.001));
      }
      // Top edge
      for (let i = 9; i >= 0; i--) {
        positions.push(Cartesian3.fromDegrees(i * 0.001, 0.01));
      }
      // Left edge
      for (let i = 9; i >= 1; i--) {
        positions.push(Cartesian3.fromDegrees(0, i * 0.001));
      }

      const hierarchy = new PolygonHierarchy(positions);
      const simplified = PolygonSimplifier.simplifyHierarchy(
        hierarchy,
        0.000001,
      );

      expect(simplified).toBeDefined();
      expect(simplified).toBeInstanceOf(PolygonHierarchy);
      // Should significantly reduce the number of positions
      expect(simplified.positions.length).toBeLessThan(positions.length);
      expect(simplified.positions.length).toBeGreaterThanOrEqual(3);
    });

    it("simplifies holes as well", function () {
      const outerPositions = [
        Cartesian3.fromDegrees(0, 0),
        Cartesian3.fromDegrees(0.01, 0),
        Cartesian3.fromDegrees(0.01, 0.01),
        Cartesian3.fromDegrees(0, 0.01),
      ];

      // Hole with many points
      const holePositions = [];
      for (let i = 0; i <= 5; i++) {
        holePositions.push(
          Cartesian3.fromDegrees(0.003 + i * 0.0008, 0.003),
        );
      }
      for (let i = 1; i <= 5; i++) {
        holePositions.push(
          Cartesian3.fromDegrees(0.007, 0.003 + i * 0.0008),
        );
      }
      for (let i = 4; i >= 0; i--) {
        holePositions.push(
          Cartesian3.fromDegrees(0.003 + i * 0.0008, 0.007),
        );
      }
      for (let i = 4; i >= 1; i--) {
        holePositions.push(
          Cartesian3.fromDegrees(0.003, 0.003 + i * 0.0008),
        );
      }

      const hierarchy = new PolygonHierarchy(outerPositions, [
        new PolygonHierarchy(holePositions),
      ]);

      const simplified = PolygonSimplifier.simplifyHierarchy(
        hierarchy,
        0.000001,
      );

      expect(simplified.positions.length).toEqual(4); // outer already minimal
      expect(simplified.holes.length).toEqual(1);
      expect(simplified.holes[0].positions.length).toBeLessThan(
        holePositions.length,
      );
      expect(simplified.holes[0].positions.length).toBeGreaterThanOrEqual(3);
    });

    it("removes holes that simplify to fewer than 3 points", function () {
      const outerPositions = [
        Cartesian3.fromDegrees(0, 0),
        Cartesian3.fromDegrees(1, 0),
        Cartesian3.fromDegrees(1, 1),
        Cartesian3.fromDegrees(0, 1),
      ];

      // Tiny "hole" with collinear points that collapse
      const holePositions = [
        Cartesian3.fromDegrees(0.5, 0.5),
        Cartesian3.fromDegrees(0.5, 0.5000001),
        Cartesian3.fromDegrees(0.5, 0.5000002),
        Cartesian3.fromDegrees(0.5, 0.5000003),
      ];

      const hierarchy = new PolygonHierarchy(outerPositions, [
        new PolygonHierarchy(holePositions),
      ]);

      const simplified = PolygonSimplifier.simplifyHierarchy(
        hierarchy,
        0.001, // Large tolerance to force collapse
      );

      // Hole should be removed since it degenerates
      expect(simplified.holes.length).toEqual(0);
    });

    it("accepts a custom ellipsoid", function () {
      const positions = [
        Cartesian3.fromDegrees(0, 0),
        Cartesian3.fromDegrees(0.01, 0),
        Cartesian3.fromDegrees(0.01, 0.01),
        Cartesian3.fromDegrees(0, 0.01),
      ];

      const hierarchy = new PolygonHierarchy(positions);
      const simplified = PolygonSimplifier.simplifyHierarchy(
        hierarchy,
        0.000001,
        { ellipsoid: Ellipsoid.WGS84 },
      );

      expect(simplified).toBeDefined();
    });

    it("throws without hierarchy", function () {
      expect(function () {
        PolygonSimplifier.simplifyHierarchy(undefined, 0.001);
      }).toThrowDeveloperError();
    });

    it("throws without tolerance", function () {
      expect(function () {
        PolygonSimplifier.simplifyHierarchy(
          new PolygonHierarchy([]),
          undefined,
        );
      }).toThrowDeveloperError();
    });
  });
});
