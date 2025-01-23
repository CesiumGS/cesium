import {
  Cartesian3,
  Cartesian2,
  BoundingRectangle,
  PolylineVolumeGeometry,
  Ellipsoid,
  PolylineVolumeGeometryLibrary,
} from "../../index.js";

describe("Core/PolylineVolumeGeometryLibrary", () => {
  describe("computePositions", () => {
    // Tests the fix #12255
    it("should not throw error if positions are collinear after scaling to geodetic surface", () => {
      const positions = [
        new Cartesian3(1, 1, 1),
        new Cartesian3(2, 2, 2),
        new Cartesian3(3, 3, 3),
        new Cartesian3(4, 4, 4),
      ];

      const shape = [
        new Cartesian2(-0.15, -0.15),
        new Cartesian2(0.15, -0.15),
        new Cartesian2(0.15, 0.15),
        new Cartesian2(-0.15, 0.15),
      ];

      const ellipsoidStub = new Ellipsoid(
        6378137.0,
        6378137.0,
        6356752.3142451793,
      );
      // It's easier to stub the function than to predict the values to be collinear after calling the function
      ellipsoidStub.scaleToGeodeticSurface = function (cartesian, result) {
        return Cartesian3.clone(cartesian, result);
      };

      const boundingRectangle = new BoundingRectangle(-0.15, -0.15, 0.3, 0.3);
      const geometry = new PolylineVolumeGeometry({
        polylinePositions: positions,
        shapePositions: shape,
      });
      geometry._ellipsoid = ellipsoidStub;

      expect(() =>
        PolylineVolumeGeometryLibrary.computePositions(
          positions,
          shape,
          boundingRectangle,
          geometry,
          true,
        ),
      ).not.toThrowDeveloperError();
    });
  });
});
