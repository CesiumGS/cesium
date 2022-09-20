import {
  BoundingSphere,
  Cartesian3,
  Ellipsoid,
  EllipsoidalOccluder,
  IntersectionTests,
  Ray,
  Rectangle,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/EllipsoidalOccluder", function () {
  it("uses ellipsoid", function () {
    const ellipsoid = new Ellipsoid(2.0, 3.0, 4.0);
    const occluder = new EllipsoidalOccluder(ellipsoid);
    expect(occluder.ellipsoid).toEqual(ellipsoid);
  });

  it("throws if ellipsoid is not provided to constructor", function () {
    function createOccluderWithoutEllipsoid() {
      return new EllipsoidalOccluder(undefined, new Cartesian3(1.0, 2.0, 3.0));
    }
    expect(createOccluderWithoutEllipsoid).toThrowDeveloperError();
  });

  it("isPointVisible example works as claimed", function () {
    const cameraPosition = new Cartesian3(0, 0, 2.5);
    const ellipsoid = new Ellipsoid(1.0, 1.1, 0.9);
    const occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);
    const point = new Cartesian3(0, -3, -3);
    expect(occluder.isPointVisible(point)).toEqual(true);
  });

  it("isScaledSpacePointVisible example works as claimed", function () {
    const cameraPosition = new Cartesian3(0, 0, 2.5);
    const ellipsoid = new Ellipsoid(1.0, 1.1, 0.9);
    const occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);
    const point = new Cartesian3(0, -3, -3);
    const scaledSpacePoint = ellipsoid.transformPositionToScaledSpace(point);
    expect(occluder.isScaledSpacePointVisible(scaledSpacePoint)).toEqual(true);
  });

  it("isScaledSpacePointVisiblePossiblyUnderEllipsoid example works as claimed", function () {
    // Tests points that are halfway inside a unit sphere:
    // 1) on the diagonal
    // 2) on the +y-axis
    // The camera is on the +z-axis so it will be able to see the diagonal point but not the +y-axis point.

    const cameraPosition = new Cartesian3(0, 0, 1.0);
    const ellipsoid = new Ellipsoid(1.0, 1.0, 1.0);
    const occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);
    const height = -0.5;

    let direction = Cartesian3.normalize(
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3()
    );
    let point = Cartesian3.multiplyByScalar(direction, 0.5, new Cartesian3());
    let scaledSpacePoint = occluder.computeHorizonCullingPoint(point, [point]);
    let scaledSpacePointShrunk = occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
      point,
      [point],
      height
    );

    expect(occluder.isScaledSpacePointVisible(scaledSpacePoint)).toEqual(false);
    expect(
      occluder.isScaledSpacePointVisiblePossiblyUnderEllipsoid(
        scaledSpacePointShrunk,
        height
      )
    ).toEqual(true);

    direction = new Cartesian3(0.0, 1.0, 0.0);
    point = Cartesian3.multiplyByScalar(direction, 0.5, new Cartesian3());
    scaledSpacePoint = occluder.computeHorizonCullingPoint(point, [point]);
    scaledSpacePointShrunk = occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
      point,
      [point],
      height
    );

    expect(occluder.isScaledSpacePointVisible(scaledSpacePoint)).toEqual(false);
    expect(
      occluder.isScaledSpacePointVisiblePossiblyUnderEllipsoid(
        scaledSpacePointShrunk,
        height
      )
    ).toEqual(false);
  });

  it("reports not visible when point is directly behind ellipsoid", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const occluder = new EllipsoidalOccluder(ellipsoid);
    occluder.cameraPosition = new Cartesian3(7000000.0, 0.0, 0.0);

    const point = new Cartesian3(-7000000, 0.0, 0.0);
    expect(occluder.isPointVisible(point)).toEqual(false);
  });

  it("reports not visible when point is directly behind ellipsoid and camera is inside the ellispoid", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const occluder = new EllipsoidalOccluder(ellipsoid);
    occluder.cameraPosition = new Cartesian3(
      ellipsoid.minimumRadius - 100,
      0.0,
      0.0
    );

    const point = new Cartesian3(-7000000, 0.0, 0.0);
    expect(occluder.isPointVisible(point)).toEqual(false);
  });

  it("reports visible when point is in front of ellipsoid", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const occluder = new EllipsoidalOccluder(ellipsoid);
    occluder.cameraPosition = new Cartesian3(7000000.0, 0.0, 0.0);

    const point = new Cartesian3(6900000.0, 0.0, 0.0);
    expect(occluder.isPointVisible(point)).toEqual(true);
  });

  it("reports visible when point is in opposite direction from ellipsoid", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const occluder = new EllipsoidalOccluder(ellipsoid);
    occluder.cameraPosition = new Cartesian3(7000000.0, 0.0, 0.0);

    const point = new Cartesian3(7100000.0, 0.0, 0.0);
    expect(occluder.isPointVisible(point)).toEqual(true);
  });

  it("reports not visible when point is over horizon", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const occluder = new EllipsoidalOccluder(ellipsoid);
    occluder.cameraPosition = new Cartesian3(7000000.0, 0.0, 0.0);

    const point = new Cartesian3(4510635.0, 4510635.0, 0.0);
    expect(occluder.isPointVisible(point)).toEqual(false);
  });

  describe("computeHorizonCullingPoint", function () {
    it("requires directionToPoint and positions", function () {
      const ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
      const positions = [new Cartesian3(-12345.0, 12345.0, 12345.0)];
      const directionToPoint = BoundingSphere.fromPoints(positions).center;

      expect(function () {
        ellipsoidalOccluder.computeHorizonCullingPoint(undefined, positions);
      }).toThrowDeveloperError();

      expect(function () {
        ellipsoidalOccluder.computeHorizonCullingPoint(
          directionToPoint,
          undefined
        );
      }).toThrowDeveloperError();
    });

    it("returns point on ellipsoid when single position is on center line", function () {
      const ellipsoid = new Ellipsoid(12345.0, 4567.0, 8910.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
      const positions = [new Cartesian3(12345.0, 0.0, 0.0)];
      const directionToPoint = new Cartesian3(1.0, 0.0, 0.0);

      const result = ellipsoidalOccluder.computeHorizonCullingPoint(
        directionToPoint,
        positions
      );

      expect(result.x).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
      expect(result.y).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
      expect(result.z).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
    });

    it("returns undefined when horizon of single point is parallel to center line", function () {
      const ellipsoid = new Ellipsoid(12345.0, 4567.0, 8910.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
      const positions = [new Cartesian3(0.0, 4567.0, 0.0)];
      const directionToPoint = new Cartesian3(1.0, 0.0, 0.0);

      const result = ellipsoidalOccluder.computeHorizonCullingPoint(
        directionToPoint,
        positions
      );
      expect(result).toBeUndefined();
    });

    it("returns undefined when single point is in the opposite direction of the center line", function () {
      const ellipsoid = new Ellipsoid(12345.0, 4567.0, 8910.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
      const positions = [new Cartesian3(-14000.0, -1000.0, 0.0)];
      const directionToPoint = new Cartesian3(1.0, 0.0, 0.0);

      const result = ellipsoidalOccluder.computeHorizonCullingPoint(
        directionToPoint,
        positions
      );
      expect(result).toBeUndefined();
    });

    it("returns undefined when any point is in the opposite direction of the center line", function () {
      const ellipsoid = new Ellipsoid(1.0, 1.0, 1.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
      const positions = [
        new Cartesian3(2.0, 0.0, 0.0),
        new Cartesian3(-1.0, 0.0, 0.0),
      ];
      const directionToPoint = new Cartesian3(1.0, 0.0, 0.0);

      const result = ellipsoidalOccluder.computeHorizonCullingPoint(
        directionToPoint,
        positions
      );
      expect(result).toBeUndefined();
    });

    it("returns undefined when the direction is zero", function () {
      const ellipsoid = new Ellipsoid(1.0, 1.0, 1.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
      const positions = [new Cartesian3(1.0, 0.0, 0.0)];
      const directionToPoint = new Cartesian3(0.0, 0.0, 0.0);

      const result = ellipsoidalOccluder.computeHorizonCullingPoint(
        directionToPoint,
        positions
      );
      expect(result).toBeUndefined();
    });

    it("computes a point from a single position with a grazing altitude close to zero", function () {
      const ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

      const positions = [
        new Cartesian3(-12345.0, 12345.0, 12345.0),
        new Cartesian3(-12346.0, 12345.0, 12345.0),
      ];
      const boundingSphere = BoundingSphere.fromPoints(positions);

      const firstPositionArray = [positions[0]];
      const result = ellipsoidalOccluder.computeHorizonCullingPoint(
        boundingSphere.center,
        firstPositionArray
      );
      const unscaledResult = Cartesian3.multiplyComponents(
        result,
        ellipsoid.radii,
        new Cartesian3()
      );

      // The grazing altitude of the ray from the horizon culling point to the
      // position used to compute it should be very nearly zero.
      const direction = Cartesian3.normalize(
        Cartesian3.subtract(positions[0], unscaledResult, new Cartesian3()),
        new Cartesian3()
      );
      const nearest = IntersectionTests.grazingAltitudeLocation(
        new Ray(unscaledResult, direction),
        ellipsoid
      );
      const nearestCartographic = ellipsoid.cartesianToCartographic(nearest);
      expect(nearestCartographic.height).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON5
      );
    });

    it("computes a point from multiple positions with a grazing altitude close to zero for one of the positions and less than zero for the others", function () {
      const ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

      const positions = [
        new Cartesian3(-12345.0, 12345.0, 12345.0),
        new Cartesian3(-12346.0, 12345.0, 12345.0),
        new Cartesian3(-12446.0, 12445.0, 12445.0),
      ];
      const boundingSphere = BoundingSphere.fromPoints(positions);

      const result = ellipsoidalOccluder.computeHorizonCullingPoint(
        boundingSphere.center,
        positions
      );
      const unscaledResult = Cartesian3.multiplyComponents(
        result,
        ellipsoid.radii,
        new Cartesian3()
      );

      // The grazing altitude of the ray from the horizon culling point to the
      // position used to compute it should be very nearly zero.
      let foundOneNearZero = false;
      for (let i = 0; i < positions.length; ++i) {
        const direction = Cartesian3.normalize(
          Cartesian3.subtract(positions[i], unscaledResult, new Cartesian3()),
          new Cartesian3()
        );
        const nearest = IntersectionTests.grazingAltitudeLocation(
          new Ray(unscaledResult, direction),
          ellipsoid
        );
        const nearestCartographic = ellipsoid.cartesianToCartographic(nearest);
        if (Math.abs(nearestCartographic.height) < CesiumMath.EPSILON5) {
          foundOneNearZero = true;
        } else {
          expect(nearestCartographic.height).toBeLessThan(0.0);
        }
      }

      expect(foundOneNearZero).toBe(true);
    });

    it("computes a point under the ellipsoid with computeHorizonCullingPointPossiblyUnderEllipsoid", function () {
      const ellipsoid = new Ellipsoid(12345.0, 4567.0, 8910.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
      const positions = [new Cartesian3(12344.0, 0.0, 0.0)];
      const directionToPoint = new Cartesian3(1.0, 0.0, 0.0);

      const result = ellipsoidalOccluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
        directionToPoint,
        positions,
        -1.0
      );

      expect(result.x).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
      expect(result.y).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
      expect(result.z).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
    });
  });

  describe("computeHorizonCullingPointFromVertices", function () {
    it("requires directionToPoint, vertices, and stride", function () {
      const ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

      const positions = [
        new Cartesian3(-12345.0, 12345.0, 12345.0),
        new Cartesian3(-12346.0, 12345.0, 12345.0),
        new Cartesian3(-12446.0, 12445.0, 12445.0),
      ];
      const boundingSphere = BoundingSphere.fromPoints(positions);

      const vertices = [];
      for (let i = 0; i < positions.length; ++i) {
        const position = positions[i];
        vertices.push(position.x);
        vertices.push(position.y);
        vertices.push(position.z);
        vertices.push(1.0);
        vertices.push(2.0);
        vertices.push(3.0);
        vertices.push(4.0);
      }

      ellipsoidalOccluder.computeHorizonCullingPointFromVertices(
        boundingSphere.center,
        vertices,
        7
      );

      expect(function () {
        ellipsoidalOccluder.computeHorizonCullingPointFromVertices(
          undefined,
          vertices,
          7
        );
      }).toThrowDeveloperError();

      expect(function () {
        ellipsoidalOccluder.computeHorizonCullingPointFromVertices(
          boundingSphere.center,
          undefined,
          7
        );
      }).toThrowDeveloperError();

      expect(function () {
        ellipsoidalOccluder.computeHorizonCullingPointFromVertices(
          boundingSphere.center,
          vertices,
          undefined
        );
      }).toThrowDeveloperError();
    });

    it("produces same answers as computeHorizonCullingPoint", function () {
      const ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

      const positions = [
        new Cartesian3(-12345.0, 12345.0, 12345.0),
        new Cartesian3(-12346.0, 12345.0, 12345.0),
        new Cartesian3(-12446.0, 12445.0, 12445.0),
      ];
      const boundingSphere = BoundingSphere.fromPoints(positions);

      const center = new Cartesian3(-12000.0, 12000.0, 12000.0);

      const vertices = [];
      for (let i = 0; i < positions.length; ++i) {
        const position = positions[i];
        vertices.push(position.x - center.x);
        vertices.push(position.y - center.y);
        vertices.push(position.z - center.z);
        vertices.push(1.0);
        vertices.push(2.0);
        vertices.push(3.0);
        vertices.push(4.0);
      }

      const result1 = ellipsoidalOccluder.computeHorizonCullingPoint(
        boundingSphere.center,
        positions
      );
      const result2 = ellipsoidalOccluder.computeHorizonCullingPointFromVertices(
        boundingSphere.center,
        vertices,
        7,
        center
      );

      expect(result1.x).toEqualEpsilon(result2.x, CesiumMath.EPSILON14);
      expect(result1.y).toEqualEpsilon(result2.y, CesiumMath.EPSILON14);
      expect(result1.z).toEqualEpsilon(result2.z, CesiumMath.EPSILON14);
    });

    it("computes a point under the ellipsoid with computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid", function () {
      const ellipsoid = new Ellipsoid(12345.0, 4567.0, 8910.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
      const vertices = [12344.0, 0.0, 0.0];
      const directionToPoint = new Cartesian3(1.0, 0.0, 0.0);
      const center = Cartesian3.ZERO;

      const result = ellipsoidalOccluder.computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid(
        directionToPoint,
        vertices,
        3,
        center,
        -1.0
      );

      expect(result.x).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
      expect(result.y).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
      expect(result.z).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
    });
  });

  describe("computeHorizonCullingPointFromRectangle", function () {
    it("returns undefined for global rectangle", function () {
      const ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
      const rectangle = Rectangle.MAX_VALUE;
      const result = ellipsoidalOccluder.computeHorizonCullingPointFromRectangle(
        rectangle,
        ellipsoid
      );
      expect(result).toBeUndefined();
    });

    it("computes a point with a grazing altitude close to zero for one of the rectangle corners and less than or equal to zero for the others", function () {
      const ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
      const ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

      const rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
      const result = ellipsoidalOccluder.computeHorizonCullingPointFromRectangle(
        rectangle,
        ellipsoid
      );
      expect(result).toBeDefined();
      const unscaledResult = Cartesian3.multiplyComponents(
        result,
        ellipsoid.radii,
        new Cartesian3()
      );

      // The grazing altitude of the ray from the horizon culling point to the
      // position used to compute it should be very nearly zero.
      const positions = [
        ellipsoid.cartographicToCartesian(Rectangle.southwest(rectangle)),
        ellipsoid.cartographicToCartesian(Rectangle.southeast(rectangle)),
        ellipsoid.cartographicToCartesian(Rectangle.northwest(rectangle)),
        ellipsoid.cartographicToCartesian(Rectangle.northeast(rectangle)),
      ];

      let foundOneNearZero = false;
      for (let i = 0; i < positions.length; ++i) {
        const direction = Cartesian3.normalize(
          Cartesian3.subtract(positions[i], unscaledResult, new Cartesian3()),
          new Cartesian3()
        );
        const nearest = IntersectionTests.grazingAltitudeLocation(
          new Ray(unscaledResult, direction),
          ellipsoid
        );
        const nearestCartographic = ellipsoid.cartesianToCartographic(nearest);
        if (Math.abs(nearestCartographic.height) < CesiumMath.EPSILON5) {
          foundOneNearZero = true;
        } else {
          expect(nearestCartographic.height).toBeLessThanOrEqual(0.0);
        }
      }

      expect(foundOneNearZero).toBe(true);
    });
  });
});
