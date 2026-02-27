import {
  Cartesian3,
  Ellipsoid,
  PolygonBoundaryExtractor,
  PolygonHierarchy,
} from "../../index.js";

describe("Core/PolygonBoundaryExtractor", function () {
  // Helper: create a flat quad (two triangles) on the surface at a given location
  function createFlatQuad(center, sizeRadians) {
    const lon = center.longitude;
    const lat = center.latitude;
    const half = sizeRadians / 2;

    const positions = [
      Cartesian3.fromRadians(lon - half, lat - half, 0),
      Cartesian3.fromRadians(lon + half, lat - half, 0),
      Cartesian3.fromRadians(lon + half, lat + half, 0),
      Cartesian3.fromRadians(lon - half, lat + half, 0),
    ];

    // Two triangles: 0-1-2 and 0-2-3
    const indices = [0, 1, 2, 0, 2, 3];

    return { positions, indices };
  }

  // Helper: create an L-shaped mesh (3 quads forming an L)
  function createLShape(lon, lat, size) {
    const s = size;
    const positions = [
      // Bottom-left quad
      Cartesian3.fromRadians(lon, lat, 0), // 0
      Cartesian3.fromRadians(lon + s, lat, 0), // 1
      Cartesian3.fromRadians(lon + s, lat + s, 0), // 2
      Cartesian3.fromRadians(lon, lat + s, 0), // 3
      // Bottom-right quad (extends right)
      Cartesian3.fromRadians(lon + 2 * s, lat, 0), // 4
      Cartesian3.fromRadians(lon + 2 * s, lat + s, 0), // 5
      // Top-left quad (extends up)
      Cartesian3.fromRadians(lon, lat + 2 * s, 0), // 6
      Cartesian3.fromRadians(lon + s, lat + 2 * s, 0), // 7
    ];

    const indices = [
      // Bottom-left quad
      0, 1, 2, 0, 2, 3,
      // Bottom-right quad
      1, 4, 5, 1, 5, 2,
      // Top-left quad
      3, 2, 7, 3, 7, 6,
    ];

    return { positions, indices };
  }

  describe("fromTriangleMesh", function () {
    it("extracts boundary from a simple quad", function () {
      const { positions, indices } = createFlatQuad(
        { longitude: 0, latitude: 0 },
        0.001,
      );

      const hierarchy = PolygonBoundaryExtractor.fromTriangleMesh(
        positions,
        indices,
      );

      expect(hierarchy).toBeDefined();
      expect(hierarchy).toBeInstanceOf(PolygonHierarchy);
      expect(hierarchy.positions.length).toEqual(4);
    });

    it("extracts boundary from an L-shaped mesh", function () {
      const { positions, indices } = createLShape(0.1, 0.1, 0.001);

      const hierarchy = PolygonBoundaryExtractor.fromTriangleMesh(
        positions,
        indices,
      );

      expect(hierarchy).toBeDefined();
      // An L shape has 8 boundary vertices (concave polygon)
      expect(hierarchy.positions.length).toBeGreaterThanOrEqual(6);
    });

    it("returns undefined for empty positions", function () {
      const hierarchy = PolygonBoundaryExtractor.fromTriangleMesh([], []);
      expect(hierarchy).toBeUndefined();
    });

    it("returns undefined for empty indices", function () {
      const positions = [
        Cartesian3.fromRadians(0, 0, 0),
        Cartesian3.fromRadians(0.01, 0, 0),
        Cartesian3.fromRadians(0.01, 0.01, 0),
      ];
      const hierarchy = PolygonBoundaryExtractor.fromTriangleMesh(
        positions,
        [],
      );
      expect(hierarchy).toBeUndefined();
    });

    it("skips degenerate (vertical) triangles", function () {
      // Three points stacked vertically — projects to a line in 2D
      const positions = [
        Cartesian3.fromRadians(0, 0, 0),
        Cartesian3.fromRadians(0, 0, 100),
        Cartesian3.fromRadians(0, 0, 200),
      ];
      const indices = [0, 1, 2];

      const hierarchy = PolygonBoundaryExtractor.fromTriangleMesh(
        positions,
        indices,
      );
      expect(hierarchy).toBeUndefined();
    });

    it("accepts a custom ellipsoid", function () {
      const { positions, indices } = createFlatQuad(
        { longitude: 0, latitude: 0 },
        0.001,
      );

      const hierarchy = PolygonBoundaryExtractor.fromTriangleMesh(
        positions,
        indices,
        { ellipsoid: Ellipsoid.WGS84 },
      );

      expect(hierarchy).toBeDefined();
      expect(hierarchy.positions.length).toEqual(4);
    });

    it("throws without positions", function () {
      expect(function () {
        PolygonBoundaryExtractor.fromTriangleMesh(undefined, [0, 1, 2]);
      }).toThrowDeveloperError();
    });

    it("throws without indices", function () {
      expect(function () {
        PolygonBoundaryExtractor.fromTriangleMesh(
          [Cartesian3.fromRadians(0, 0, 0)],
          undefined,
        );
      }).toThrowDeveloperError();
    });
  });

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

  describe("fromTriangleMeshByFeature", function () {
    it("extracts boundaries grouped by feature ID", function () {
      // Two quads side by side, each with a different feature ID
      const positions = [
        // Quad A
        Cartesian3.fromRadians(0, 0, 0), // 0
        Cartesian3.fromRadians(0.001, 0, 0), // 1
        Cartesian3.fromRadians(0.001, 0.001, 0), // 2
        Cartesian3.fromRadians(0, 0.001, 0), // 3
        // Quad B
        Cartesian3.fromRadians(0.002, 0, 0), // 4
        Cartesian3.fromRadians(0.003, 0, 0), // 5
        Cartesian3.fromRadians(0.003, 0.001, 0), // 6
        Cartesian3.fromRadians(0.002, 0.001, 0), // 7
      ];
      const indices = [
        // Quad A triangles
        0, 1, 2, 0, 2, 3,
        // Quad B triangles
        4, 5, 6, 4, 6, 7,
      ];
      const featureIds = [0, 0, 0, 0, 1, 1, 1, 1];

      const result = PolygonBoundaryExtractor.fromTriangleMeshByFeature(
        positions,
        indices,
        featureIds,
      );

      expect(result).toBeDefined();
      expect(result.size).toEqual(2);
      expect(result.has(0)).toBe(true);
      expect(result.has(1)).toBe(true);

      const feature0 = result.get(0);
      expect(feature0).toBeInstanceOf(PolygonHierarchy);
      expect(feature0.positions.length).toEqual(4);

      const feature1 = result.get(1);
      expect(feature1).toBeInstanceOf(PolygonHierarchy);
      expect(feature1.positions.length).toEqual(4);
    });

    it("throws without required parameters", function () {
      expect(function () {
        PolygonBoundaryExtractor.fromTriangleMeshByFeature(
          undefined,
          [],
          [],
        );
      }).toThrowDeveloperError();

      expect(function () {
        PolygonBoundaryExtractor.fromTriangleMeshByFeature(
          [],
          undefined,
          [],
        );
      }).toThrowDeveloperError();

      expect(function () {
        PolygonBoundaryExtractor.fromTriangleMeshByFeature(
          [],
          [],
          undefined,
        );
      }).toThrowDeveloperError();
    });
  });
});
