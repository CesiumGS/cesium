import {
  BoundingSphere,
  Cartesian3,
  Ellipsoid,
  Occluder,
  Rectangle,
  Visibility,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/Occluder", function () {
  it("throws an exception during construction (1 of 3)", function () {
    expect(function () {
      return new Occluder();
    }).toThrowDeveloperError();
  });

  it("throws an exception during construction (2 of 3)", function () {
    expect(function () {
      return new Occluder(new BoundingSphere(new Cartesian3(0, 0, 0)));
    }).toThrowDeveloperError();
  });

  it("throws an exception during construction (3 of 3)", function () {
    expect(function () {
      return new Occluder(new Cartesian3(0, 0, 0));
    }).toThrowDeveloperError();
  });

  it("can entirely eclipse a smaller occludee", function () {
    const giantSphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
    const littleSphere = new BoundingSphere(new Cartesian3(0, 0, -2.75), 0.25);
    const cameraPosition = Cartesian3.ZERO;
    const occluder = new Occluder(giantSphere, cameraPosition);
    expect(occluder.isBoundingSphereVisible(littleSphere)).toEqual(false);
    expect(occluder.computeVisibility(littleSphere)).toEqual(Visibility.NONE);
  });

  it("can have a fully visible occludee", function () {
    const bigSphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
    const littleSphere = new BoundingSphere(new Cartesian3(0, 0, -2.75), 0.25);
    const cameraPosition = Cartesian3.ZERO;
    const occluder = new Occluder(littleSphere, cameraPosition);
    expect(occluder.radius).toBeLessThan(bigSphere.radius);
    expect(occluder.isBoundingSphereVisible(bigSphere)).toEqual(true);
    expect(occluder.computeVisibility(bigSphere)).toEqual(Visibility.FULL);
  });

  it("blocks the occludee when both are aligned and the same size", function () {
    const sphere1 = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
    const sphere2 = new BoundingSphere(new Cartesian3(0, 0, -2.5), 0.5);
    const cameraPosition = Cartesian3.ZERO;
    const occluder = new Occluder(sphere1, cameraPosition);
    expect(occluder.isBoundingSphereVisible(sphere2)).toEqual(false);
    expect(occluder.computeVisibility(sphere2)).toEqual(Visibility.NONE);
  });

  it("can have a fully visible occludee", function () {
    const sphere1 = new BoundingSphere(new Cartesian3(-1.25, 0, -1.5), 0.5);
    const sphere2 = new BoundingSphere(new Cartesian3(1.25, 0, -1.5), 0.5);
    const cameraPosition = Cartesian3.ZERO;
    const occluder = new Occluder(sphere1, cameraPosition);
    expect(occluder.computeVisibility(sphere2)).toEqual(Visibility.FULL);
  });

  it("can partially block an occludee without intersecting", function () {
    const cameraPosition = Cartesian3.ZERO;
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -2), 1);
    const occluder = new Occluder(occluderBS, cameraPosition);
    const occludeeBS = new BoundingSphere(new Cartesian3(0.5, 0.5, -3), 1);
    expect(occluder.computeVisibility(occludeeBS)).toEqual(Visibility.PARTIAL);
  });

  it("can partially block an occludee when it intersects laterally", function () {
    const cameraPosition = Cartesian3.ZERO;
    const occluderBS = new BoundingSphere(new Cartesian3(-0.5, 0, -1), 1);
    const occluder = new Occluder(occluderBS, cameraPosition);
    const occludeeBS = new BoundingSphere(new Cartesian3(0.5, 0, -1), 1);
    expect(occluder.computeVisibility(occludeeBS)).toEqual(Visibility.PARTIAL);
  });

  it("can partially block an occludee when it intersects vertically", function () {
    const cameraPosition = Cartesian3.ZERO;
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -2), 1);
    const occluder = new Occluder(occluderBS, cameraPosition);
    const occludeeBS = new BoundingSphere(new Cartesian3(0, 0.5, -2.5), 1);
    expect(occluder.computeVisibility(occludeeBS)).toEqual(Visibility.PARTIAL);
  });

  it("reports full visibility when occludee is larger than occluder", function () {
    const littleSphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
    const bigSphere = new BoundingSphere(new Cartesian3(0, 0, -3), 1);
    const cameraPosition = Cartesian3.ZERO;
    const occluder = new Occluder(littleSphere, cameraPosition);
    expect(occluder.computeVisibility(bigSphere)).toEqual(Visibility.FULL);
  });

  it("computeVisibility throws without a bounding sphere", function () {
    const sphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
    const cameraPosition = Cartesian3.ZERO;
    const occluder = new Occluder(sphere, cameraPosition);

    expect(function () {
      occluder.computeVisibility();
    }).toThrowDeveloperError();
  });

  it("can throw errors during computeOccludeePoint (1 of 5)", function () {
    expect(function () {
      Occluder.computeOccludeePoint();
    }).toThrowDeveloperError();
  });

  it("can throw errors during computeOccludeePoint (2 of 5)", function () {
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -5), 1);
    const occludeePosition = new Cartesian3(0, 0, -5);
    const positions = [];

    expect(function () {
      Occluder.computeOccludeePoint(occluderBS, occludeePosition, positions);
    }).toThrowDeveloperError();
  });

  it("can throw errors during computeOccludeePoint (3 of 5)", function () {
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -5), 1);
    const positions = [];

    expect(function () {
      Occluder.computeOccludeePoint(
        occluderBS,
        new Cartesian3(0, 0, -3),
        positions
      );
    }).toThrowDeveloperError();
  });

  it("can throw errors during computeOccludeePoint (4 of 5)", function () {
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -5), 1);

    expect(function () {
      Occluder.computeOccludeePoint(occluderBS, new Cartesian3(0, 0, -3));
    }).toThrowDeveloperError();
  });

  it("can throw errors during computeOccludeePoint (5 of 5)", function () {
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -5), 1);

    expect(function () {
      Occluder.computeOccludeePoint(
        occluderBS,
        new Cartesian3(0, 0, -5),
        new Cartesian3(0, 0, -3)
      );
    }).toThrowDeveloperError();
  });

  it("can compute an occludee point", function () {
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
    const positions = [
      new Cartesian3(-1.085, 0, -6.221),
      new Cartesian3(1.085, 0, -6.221),
    ];
    const tileOccluderSphere = BoundingSphere.fromPoints(positions);
    const occludeePosition = tileOccluderSphere.center;
    const result = Occluder.computeOccludeePoint(
      occluderBS,
      occludeePosition,
      positions
    );
    expect(result).toEqualEpsilon(
      new Cartesian3(0, 0, -5),
      CesiumMath.EPSILON1
    );
  });

  it("can compute a rotation vector (major axis = 0)", function () {
    const cameraPosition = Cartesian3.ZERO;
    const occluderBS = new BoundingSphere(new Cartesian3(5, 0, 0), 2);
    const occluder = new Occluder(occluderBS, cameraPosition);
    const occludeeBS = new BoundingSphere(new Cartesian3(8, 0, 0), 1);
    const occludee = new Occluder(occludeeBS, cameraPosition);

    const occluderPosition = occluder.position;
    const occludeePosition = occludee.position;
    const occluderPlaneNormal = Cartesian3.normalize(
      Cartesian3.subtract(occludeePosition, occluderPosition, new Cartesian3()),
      new Cartesian3()
    );
    const occluderPlaneD = -Cartesian3.dot(
      occluderPlaneNormal,
      occluderPosition
    );

    const tempVec0 = Cartesian3.abs(
      Cartesian3.clone(occluderPlaneNormal),
      new Cartesian3()
    );
    let majorAxis = tempVec0.x > tempVec0.y ? 0 : 1;
    if (
      (majorAxis === 0 && tempVec0.z > tempVec0.x) ||
      (majorAxis === 1 && tempVec0.z > tempVec0.y)
    ) {
      majorAxis = 2;
    }
    expect(majorAxis).toEqual(0);
    const aRotationVector = Occluder._anyRotationVector(
      occluderPosition,
      occluderPlaneNormal,
      occluderPlaneD
    );
    expect(aRotationVector).toBeTruthy();
  });

  it("can compute a rotation vector (major axis = 1)", function () {
    const cameraPosition = Cartesian3.ZERO;
    const occluderBS = new BoundingSphere(new Cartesian3(5, 0, 0), 2);
    const occluder = new Occluder(occluderBS, cameraPosition);
    const occludeeBS = new BoundingSphere(new Cartesian3(7, 2, 0), 1);
    const occludee = new Occluder(occludeeBS, cameraPosition);

    const occluderPosition = occluder.position;
    const occludeePosition = occludee.position;
    const occluderPlaneNormal = Cartesian3.normalize(
      Cartesian3.subtract(occludeePosition, occluderPosition, new Cartesian3()),
      new Cartesian3()
    );
    const occluderPlaneD = -Cartesian3.dot(
      occluderPlaneNormal,
      occluderPosition
    );

    const tempVec0 = Cartesian3.abs(
      Cartesian3.clone(occluderPlaneNormal),
      new Cartesian3()
    );
    let majorAxis = tempVec0.x > tempVec0.y ? 0 : 1;
    if (
      (majorAxis === 0 && tempVec0.z > tempVec0.x) ||
      (majorAxis === 1 && tempVec0.z > tempVec0.y)
    ) {
      majorAxis = 2;
    }
    expect(majorAxis).toEqual(1);
    const aRotationVector = Occluder._anyRotationVector(
      occluderPosition,
      occluderPlaneNormal,
      occluderPlaneD
    );
    expect(aRotationVector).toBeTruthy();
  });

  it("can compute a rotation vector (major axis = 2)", function () {
    const cameraPosition = Cartesian3.ZERO;
    const occluderBS = new BoundingSphere(new Cartesian3(5, 0, 0), 2);
    const occluder = new Occluder(occluderBS, cameraPosition);
    const occludeeBS = new BoundingSphere(new Cartesian3(6, 0, 2), 1);
    const occludee = new Occluder(occludeeBS, cameraPosition);

    const occluderPosition = occluder.position;
    const occludeePosition = occludee.position;
    const occluderPlaneNormal = Cartesian3.normalize(
      Cartesian3.subtract(occludeePosition, occluderPosition, new Cartesian3()),
      new Cartesian3()
    );
    const occluderPlaneD = -Cartesian3.dot(
      occluderPlaneNormal,
      occluderPosition
    );

    const tempVec0 = Cartesian3.abs(
      Cartesian3.clone(occluderPlaneNormal),
      new Cartesian3()
    );
    let majorAxis = tempVec0.x > tempVec0.y ? 0 : 1;
    if (
      (majorAxis === 0 && tempVec0.z > tempVec0.x) ||
      (majorAxis === 1 && tempVec0.z > tempVec0.y)
    ) {
      majorAxis = 2;
    }
    expect(majorAxis).toEqual(2);
    const aRotationVector = Occluder._anyRotationVector(
      occluderPosition,
      occluderPlaneNormal,
      occluderPlaneD
    );
    expect(aRotationVector).toBeTruthy();
  });

  it("can  have an invisible occludee point", function () {
    const cameraPosition = new Cartesian3(0, 0, -8);
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
    const occluder = new Occluder(occluderBS, cameraPosition);
    const positions = [
      new Cartesian3(-0.25, 0, -5.3),
      new Cartesian3(0.25, 0, -5.3),
    ];
    const tileOccluderSphere = BoundingSphere.fromPoints(positions);
    const occludeePosition = tileOccluderSphere.center;
    const result = Occluder.computeOccludeePoint(
      occluderBS,
      occludeePosition,
      positions
    );

    const bs = new BoundingSphere(result, 0.0);

    expect(occluder.isBoundingSphereVisible(bs)).toEqual(false);
    expect(occluder.computeVisibility(bs)).toEqual(Visibility.NONE);
  });

  it("can have a visible occludee point", function () {
    const cameraPosition = new Cartesian3(3, 0, -8);
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
    const occluder = new Occluder(occluderBS, cameraPosition);
    const positions = [
      new Cartesian3(-0.25, 0, -5.3),
      new Cartesian3(0.25, 0, -5.3),
    ];
    const tileOccluderSphere = BoundingSphere.fromPoints(positions);
    const occludeePosition = tileOccluderSphere.center;
    const result = Occluder.computeOccludeePoint(
      occluderBS,
      occludeePosition,
      positions
    );
    expect(
      occluder.isBoundingSphereVisible(new BoundingSphere(result, 0.0))
    ).toEqual(true);
  });

  it("compute occludee point from rectangle throws without a rectangle", function () {
    expect(function () {
      return Occluder.computeOccludeePointFromRectangle();
    }).toThrowDeveloperError();
  });

  it("compute invalid occludee point from rectangle", function () {
    const rectangle = Rectangle.MAX_VALUE;
    expect(Occluder.computeOccludeePointFromRectangle(rectangle)).toEqual(
      undefined
    );
  });

  it("compute valid occludee point from rectangle", function () {
    const edge = Math.PI / 32.0;
    const rectangle = new Rectangle(-edge, -edge, edge, edge);
    const ellipsoid = Ellipsoid.WGS84;
    const positions = Rectangle.subsample(rectangle, ellipsoid);
    const bs = BoundingSphere.fromPoints(positions);
    const point = Occluder.computeOccludeePoint(
      new BoundingSphere(Cartesian3.ZERO, ellipsoid.minimumRadius),
      bs.center,
      positions
    );
    const actual = Occluder.computeOccludeePointFromRectangle(rectangle);
    expect(actual).toEqual(point);
  });

  it("fromBoundingSphere throws without a bounding sphere", function () {
    expect(function () {
      Occluder.fromBoundingSphere();
    }).toThrowDeveloperError();
  });

  it("fromBoundingSphere throws without camera position", function () {
    expect(function () {
      Occluder.fromBoundingSphere(new BoundingSphere());
    }).toThrowDeveloperError();
  });

  it("fromBoundingSphere without result parameter", function () {
    const cameraPosition = new Cartesian3(3, 0, -8);
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
    const occluder0 = new Occluder(occluderBS, cameraPosition);
    const occluder1 = Occluder.fromBoundingSphere(occluderBS, cameraPosition);

    expect(occluder1.position).toEqual(occluder0.position);
    expect(occluder1.radius).toEqual(occluder0.radius);
  });

  it("fromBoundingSphere with result parameter", function () {
    const cameraPosition = new Cartesian3(3, 0, -8);
    const occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
    const occluder0 = new Occluder(occluderBS, cameraPosition);
    const result = new Occluder(occluderBS, Cartesian3.ZERO);
    const occluder1 = Occluder.fromBoundingSphere(
      occluderBS,
      cameraPosition,
      result
    );

    expect(occluder1).toBe(result);
    expect(occluder1.position).toEqual(occluder0.position);
    expect(occluder1.radius).toEqual(occluder0.radius);
  });
});
