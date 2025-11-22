import { CorridorGeometryLibrary, Ellipsoid } from "../../index.js";

describe("Core/CorridorGeometryLibrary", () => {
  describe("computePositions", () => {
    it("should not compute corners for collinear points", () => {
      const options = {
        positions: [
          { x: 1, y: 1, z: 1 },
          { x: 2, y: 2, z: 2 },
          { x: 3, y: 3, z: 3 },
          { x: 4, y: 4, z: 4 },
        ],
        width: 0.15,
        ellipsoid: Ellipsoid.WGS84,
      };

      // The fact it doesn't throw an error also verifies the fix #12255
      const result = CorridorGeometryLibrary.computePositions(options);
      expect(result.corners.length).toEqual(0);
    });

    it("should compute corners for non-collinear points", () => {
      const options = {
        positions: [
          { x: 0, y: 0, z: 1 },
          { x: 1, y: 0, z: 2 },
          { x: 1, y: 1, z: 3 },
          { x: 0, y: 1, z: 4 },
        ],
        width: 0.15,
        ellipsoid: Ellipsoid.WGS84,
      };

      const result = CorridorGeometryLibrary.computePositions(options);
      expect(result.corners.length).toEqual(2);
    });
  });
});
