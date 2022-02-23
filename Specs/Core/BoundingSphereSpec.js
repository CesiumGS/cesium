import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { EncodedCartesian3 } from "../../Source/Cesium.js";
import { GeographicProjection } from "../../Source/Cesium.js";
import { Intersect } from "../../Source/Cesium.js";
import { Interval } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { OrientedBoundingBox } from "../../Source/Cesium.js";
import { Plane } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/BoundingSphere", function () {
  const positionsRadius = 1.0;
  const positionsCenter = new Cartesian3(10000001.0, 0.0, 0.0);

  const center = new Cartesian3(10000000.0, 0.0, 0.0);

  function getPositions() {
    return [
      Cartesian3.add(center, new Cartesian3(1, 0, 0), new Cartesian3()),
      Cartesian3.add(center, new Cartesian3(2, 0, 0), new Cartesian3()),
      Cartesian3.add(center, new Cartesian3(0, 0, 0), new Cartesian3()),
      Cartesian3.add(center, new Cartesian3(1, 1, 0), new Cartesian3()),
      Cartesian3.add(center, new Cartesian3(1, -1, 0), new Cartesian3()),
      Cartesian3.add(center, new Cartesian3(1, 0, 1), new Cartesian3()),
      Cartesian3.add(center, new Cartesian3(1, 0, -1), new Cartesian3()),
    ];
  }

  function getPositionsAsFlatArray() {
    const positions = getPositions();
    const result = [];
    for (let i = 0; i < positions.length; ++i) {
      result.push(positions[i].x);
      result.push(positions[i].y);
      result.push(positions[i].z);
    }
    return result;
  }

  function getPositionsAsFlatArrayWithStride5() {
    const positions = getPositions();
    const result = [];
    for (let i = 0; i < positions.length; ++i) {
      result.push(positions[i].x);
      result.push(positions[i].y);
      result.push(positions[i].z);
      result.push(1.23);
      result.push(4.56);
    }
    return result;
  }

  function getPositionsAsEncodedFlatArray() {
    const positions = getPositions();
    const high = [];
    const low = [];
    for (let i = 0; i < positions.length; ++i) {
      const encoded = EncodedCartesian3.fromCartesian(positions[i]);
      high.push(encoded.high.x);
      high.push(encoded.high.y);
      high.push(encoded.high.z);
      low.push(encoded.low.x);
      low.push(encoded.low.y);
      low.push(encoded.low.z);
    }
    return {
      high: high,
      low: low,
    };
  }

  it("default constructing produces expected values", function () {
    const sphere = new BoundingSphere();
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("constructor sets expected values", function () {
    const expectedCenter = new Cartesian3(1.0, 2.0, 3.0);
    const expectedRadius = 1.0;
    const sphere = new BoundingSphere(expectedCenter, expectedRadius);
    expect(sphere.center).toEqual(expectedCenter);
    expect(sphere.radius).toEqual(expectedRadius);
  });

  it("clone without a result parameter", function () {
    const sphere = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0);
    const result = sphere.clone();
    expect(sphere).not.toBe(result);
    expect(sphere).toEqual(result);
  });

  it("clone with a result parameter", function () {
    const sphere = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0);
    const result = new BoundingSphere();
    const returnedResult = sphere.clone(result);
    expect(result).not.toBe(sphere);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(sphere);
  });

  it('clone works with "this" result parameter', function () {
    const expectedCenter = new Cartesian3(1.0, 2.0, 3.0);
    const expectedRadius = 1.0;
    const sphere = new BoundingSphere(expectedCenter, expectedRadius);
    const returnedResult = sphere.clone(sphere);
    expect(sphere).toBe(returnedResult);
    expect(sphere.center).toEqual(expectedCenter);
    expect(sphere.radius).toEqual(expectedRadius);
  });

  it("clone clones undefined", function () {
    expect(BoundingSphere.clone(undefined)).toBe(undefined);
  });

  it("equals", function () {
    const sphere = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0);
    expect(
      sphere.equals(new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0))
    ).toEqual(true);
    expect(
      sphere.equals(new BoundingSphere(new Cartesian3(5.0, 2.0, 3.0), 4.0))
    ).toEqual(false);
    expect(
      sphere.equals(new BoundingSphere(new Cartesian3(1.0, 6.0, 3.0), 4.0))
    ).toEqual(false);
    expect(
      sphere.equals(new BoundingSphere(new Cartesian3(1.0, 2.0, 7.0), 4.0))
    ).toEqual(false);
    expect(
      sphere.equals(new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 8.0))
    ).toEqual(false);
    expect(sphere.equals(undefined)).toEqual(false);
  });

  it("fromPoints without positions returns an empty sphere", function () {
    const sphere = BoundingSphere.fromPoints();
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromPoints works with one point", function () {
    const expectedCenter = new Cartesian3(1.0, 2.0, 3.0);
    const sphere = BoundingSphere.fromPoints([expectedCenter]);
    expect(sphere.center).toEqual(expectedCenter);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromPoints computes a center from points", function () {
    const sphere = BoundingSphere.fromPoints(getPositions());
    expect(sphere.center).toEqual(positionsCenter);
    expect(sphere.radius).toEqual(positionsRadius);
  });

  it("fromPoints contains all points (naive)", function () {
    const sphere = BoundingSphere.fromPoints(getPositions());
    const radius = sphere.radius;
    const center = sphere.center;

    const r = new Cartesian3(radius, radius, radius);
    const max = Cartesian3.add(r, center, new Cartesian3());
    const min = Cartesian3.subtract(center, r, new Cartesian3());

    const positions = getPositions();
    const numPositions = positions.length;
    for (let i = 0; i < numPositions; i++) {
      const currentPos = positions[i];
      expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
      expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
      expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
    }
  });

  it("fromPoints contains all points (ritter)", function () {
    const positions = getPositions();
    positions.push(
      new Cartesian3(1, 1, 1),
      new Cartesian3(2, 2, 2),
      new Cartesian3(3, 3, 3)
    );
    const sphere = BoundingSphere.fromPoints(positions);
    const radius = sphere.radius;
    const center = sphere.center;

    const r = new Cartesian3(radius, radius, radius);
    const max = Cartesian3.add(r, center, new Cartesian3());
    const min = Cartesian3.subtract(center, r, new Cartesian3());

    const numPositions = positions.length;
    for (let i = 0; i < numPositions; i++) {
      const currentPos = positions[i];
      expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
      expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
      expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
    }
  });

  it("fromVertices without positions returns an empty sphere", function () {
    const sphere = BoundingSphere.fromVertices();
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromVertices works with one point", function () {
    const expectedCenter = new Cartesian3(1.0, 2.0, 3.0);
    const sphere = BoundingSphere.fromVertices([
      expectedCenter.x,
      expectedCenter.y,
      expectedCenter.z,
    ]);
    expect(sphere.center).toEqual(expectedCenter);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromVertices computes a center from points", function () {
    const sphere = BoundingSphere.fromVertices(getPositionsAsFlatArray());
    expect(sphere.center).toEqual(positionsCenter);
    expect(sphere.radius).toEqual(positionsRadius);
  });

  it("fromVertices contains all points (naive)", function () {
    const sphere = BoundingSphere.fromVertices(getPositionsAsFlatArray());
    const radius = sphere.radius;
    const center = sphere.center;

    const r = new Cartesian3(radius, radius, radius);
    const max = Cartesian3.add(r, center, new Cartesian3());
    const min = Cartesian3.subtract(center, r, new Cartesian3());

    const positions = getPositions();
    const numPositions = positions.length;
    for (let i = 0; i < numPositions; i++) {
      const currentPos = positions[i];
      expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
      expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
      expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
    }
  });

  it("fromVertices contains all points (ritter)", function () {
    const positions = getPositionsAsFlatArray();
    positions.push(1, 1, 1, 2, 2, 2, 3, 3, 3);
    const sphere = BoundingSphere.fromVertices(positions);
    const radius = sphere.radius;
    const center = sphere.center;

    const r = new Cartesian3(radius, radius, radius);
    const max = Cartesian3.add(r, center, new Cartesian3());
    const min = Cartesian3.subtract(center, r, new Cartesian3());

    const numElements = positions.length;
    for (let i = 0; i < numElements; i += 3) {
      expect(positions[i] <= max.x && positions[i] >= min.x).toEqual(true);
      expect(positions[i + 1] <= max.y && positions[i + 1] >= min.y).toEqual(
        true
      );
      expect(positions[i + 2] <= max.z && positions[i + 2] >= min.z).toEqual(
        true
      );
    }
  });

  it("fromVertices works with a stride of 5", function () {
    const sphere = BoundingSphere.fromVertices(
      getPositionsAsFlatArrayWithStride5(),
      undefined,
      5
    );
    expect(sphere.center).toEqual(positionsCenter);
    expect(sphere.radius).toEqual(positionsRadius);
  });

  it("fromVertices works with defined center", function () {
    const center = new Cartesian3(1.0, 2.0, 3.0);
    const sphere = BoundingSphere.fromVertices(
      getPositionsAsFlatArrayWithStride5(),
      center,
      5
    );
    expect(sphere.center).toEqual(
      Cartesian3.add(positionsCenter, center, new Cartesian3())
    );
    expect(sphere.radius).toEqual(positionsRadius);
  });

  it("fromVertices requires a stride of at least 3", function () {
    function callWithStrideOf2() {
      BoundingSphere.fromVertices(getPositionsAsFlatArray(), undefined, 2);
    }
    expect(callWithStrideOf2).toThrowDeveloperError();
  });

  it("fromVertices fills result parameter if specified", function () {
    const center = new Cartesian3(1.0, 2.0, 3.0);
    const result = new BoundingSphere();
    const sphere = BoundingSphere.fromVertices(
      getPositionsAsFlatArrayWithStride5(),
      center,
      5,
      result
    );
    expect(sphere).toEqual(result);
    expect(result.center).toEqual(
      Cartesian3.add(positionsCenter, center, new Cartesian3())
    );
    expect(result.radius).toEqual(positionsRadius);
  });

  it("fromEncodedCartesianVertices without positions returns an empty sphere", function () {
    const sphere = BoundingSphere.fromEncodedCartesianVertices();
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromEncodedCartesianVertices without positions of different lengths returns an empty sphere", function () {
    const positions = getPositionsAsEncodedFlatArray();
    positions.low.length = positions.low.length - 1;
    const sphere = BoundingSphere.fromEncodedCartesianVertices(
      positions.high,
      positions.low
    );
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromEncodedCartesianVertices computes a center from points", function () {
    const positions = getPositionsAsEncodedFlatArray();
    const sphere = BoundingSphere.fromEncodedCartesianVertices(
      positions.high,
      positions.low
    );
    expect(sphere.center).toEqual(positionsCenter);
    expect(sphere.radius).toEqual(positionsRadius);
  });

  it("fromEncodedCartesianVertices contains all points (naive)", function () {
    let positions = getPositionsAsEncodedFlatArray();
    const sphere = BoundingSphere.fromEncodedCartesianVertices(
      positions.high,
      positions.low
    );
    const radius = sphere.radius;
    const center = sphere.center;

    const r = new Cartesian3(radius, radius, radius);
    const max = Cartesian3.add(r, center, new Cartesian3());
    const min = Cartesian3.subtract(center, r, new Cartesian3());

    positions = getPositions();
    const numPositions = positions.length;
    for (let i = 0; i < numPositions; i++) {
      const currentPos = positions[i];
      expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
      expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
      expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
    }
  });

  it("fromEncodedCartesianVertices contains all points (ritter)", function () {
    const positions = getPositionsAsEncodedFlatArray();
    const appendedPositions = [
      new Cartesian3(1, 1, 1),
      new Cartesian3(2, 2, 2),
      new Cartesian3(3, 3, 3),
    ];
    for (let j = 0; j < appendedPositions.length; ++j) {
      const encoded = EncodedCartesian3.fromCartesian(
        Cartesian3.add(appendedPositions[j], center, new Cartesian3())
      );
      positions.high.push(encoded.high.x);
      positions.high.push(encoded.high.y);
      positions.high.push(encoded.high.z);
      positions.low.push(encoded.low.x);
      positions.low.push(encoded.low.y);
      positions.low.push(encoded.low.z);
    }

    const sphere = BoundingSphere.fromEncodedCartesianVertices(
      positions.high,
      positions.low
    );
    const radius = sphere.radius;
    const sphereCenter = sphere.center;

    const r = new Cartesian3(radius, radius, radius);
    const max = Cartesian3.add(r, sphereCenter, new Cartesian3());
    const min = Cartesian3.subtract(sphereCenter, r, new Cartesian3());

    const numElements = positions.length;
    for (let i = 0; i < numElements; i += 3) {
      expect(positions[i] <= max.x && positions[i] >= min.x).toEqual(true);
      expect(positions[i + 1] <= max.y && positions[i + 1] >= min.y).toEqual(
        true
      );
      expect(positions[i + 2] <= max.z && positions[i + 2] >= min.z).toEqual(
        true
      );
    }
  });

  it("fromEncodedCartesianVertices fills result parameter if specified", function () {
    const positions = getPositionsAsEncodedFlatArray();
    const result = new BoundingSphere();
    const sphere = BoundingSphere.fromEncodedCartesianVertices(
      positions.high,
      positions.low,
      result
    );
    expect(sphere).toEqual(result);
    expect(result.center).toEqual(positionsCenter);
    expect(result.radius).toEqual(positionsRadius);
  });

  it("fromRectangle2D creates an empty sphere if no rectangle provided", function () {
    const sphere = BoundingSphere.fromRectangle2D();
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromRectangle2D", function () {
    const rectangle = Rectangle.MAX_VALUE;
    const projection = new GeographicProjection(Ellipsoid.UNIT_SPHERE);
    const expected = new BoundingSphere(
      Cartesian3.ZERO,
      Math.sqrt(
        rectangle.east * rectangle.east + rectangle.north * rectangle.north
      )
    );
    expect(BoundingSphere.fromRectangle2D(rectangle, projection)).toEqual(
      expected
    );
  });

  it("fromRectangle3D creates an empty sphere if no rectangle provided", function () {
    const sphere = BoundingSphere.fromRectangle3D();
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromRectangle3D", function () {
    const rectangle = Rectangle.MAX_VALUE;
    const ellipsoid = Ellipsoid.WGS84;
    const expected = new BoundingSphere(
      Cartesian3.ZERO,
      ellipsoid.maximumRadius
    );
    expect(BoundingSphere.fromRectangle3D(rectangle, ellipsoid)).toEqual(
      expected
    );
  });

  it("fromRectangle3D with height", function () {
    const rectangle = new Rectangle(0.1, -0.3, 0.2, -0.4);
    const height = 100000.0;
    const ellipsoid = Ellipsoid.WGS84;
    const points = Rectangle.subsample(rectangle, ellipsoid, height);
    const expected = BoundingSphere.fromPoints(points);
    expect(
      BoundingSphere.fromRectangle3D(rectangle, ellipsoid, height)
    ).toEqual(expected);
  });

  it("fromCornerPoints", function () {
    const sphere = BoundingSphere.fromCornerPoints(
      new Cartesian3(-1.0, -0.0, 0.0),
      new Cartesian3(1.0, 0.0, 0.0)
    );
    expect(sphere).toEqual(new BoundingSphere(Cartesian3.ZERO, 1.0));
  });

  it("fromCornerPoints with a result parameter", function () {
    const sphere = new BoundingSphere();
    const result = BoundingSphere.fromCornerPoints(
      new Cartesian3(0.0, -1.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      sphere
    );
    expect(result).toBe(sphere);
    expect(result).toEqual(new BoundingSphere(Cartesian3.ZERO, 1.0));
  });

  it("fromCornerPoints throws without corner", function () {
    expect(function () {
      BoundingSphere.fromCornerPoints();
    }).toThrowDeveloperError();
  });

  it("fromCornerPoints throws without oppositeCorner", function () {
    expect(function () {
      BoundingSphere.fromCornerPoints(Cartesian3.UNIT_X);
    }).toThrowDeveloperError();
  });

  it("fromEllipsoid", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const sphere = BoundingSphere.fromEllipsoid(ellipsoid);
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(ellipsoid.maximumRadius);
  });

  it("fromEllipsoid with a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const sphere = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0);
    const result = BoundingSphere.fromEllipsoid(ellipsoid, sphere);
    expect(result).toBe(sphere);
    expect(result).toEqual(
      new BoundingSphere(Cartesian3.ZERO, ellipsoid.maximumRadius)
    );
  });

  it("fromEllipsoid throws without ellipsoid", function () {
    expect(function () {
      BoundingSphere.fromEllipsoid();
    }).toThrowDeveloperError();
  });

  it("fromBoundingSpheres with undefined returns an empty sphere", function () {
    const sphere = BoundingSphere.fromBoundingSpheres();
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromBoundingSpheres with empty array returns an empty sphere", function () {
    const sphere = BoundingSphere.fromBoundingSpheres([]);
    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("fromBoundingSpheres works with 1 sphere", function () {
    const one = new BoundingSphere(new Cartesian3(1, 2, 3), 4);

    const sphere = BoundingSphere.fromBoundingSpheres([one]);
    expect(sphere).toEqual(one);
  });

  it("fromBoundingSpheres works with 2 spheres", function () {
    const one = new BoundingSphere(new Cartesian3(1, 2, 3), 4);
    const two = new BoundingSphere(new Cartesian3(5, 6, 7), 8);

    const sphere = BoundingSphere.fromBoundingSpheres([one, two]);
    expect(sphere).toEqual(
      BoundingSphere.union(one, two, new BoundingSphere())
    );
  });

  it("fromBoundingSpheres works with 3 spheres", function () {
    const one = new BoundingSphere(new Cartesian3(0, 0, 0), 1);
    const two = new BoundingSphere(new Cartesian3(0, 3, 0), 1);
    const three = new BoundingSphere(new Cartesian3(0, 0, 4), 1);

    const expected = new BoundingSphere(new Cartesian3(0.0, 1.5, 2.0), 3.5);
    const sphere = BoundingSphere.fromBoundingSpheres([one, two, three]);
    expect(sphere).toEqual(expected);
  });

  it("fromOrientedBoundingBox works with a result", function () {
    const box = OrientedBoundingBox.fromPoints(getPositions());
    const sphere = new BoundingSphere();
    BoundingSphere.fromOrientedBoundingBox(box, sphere);
    expect(sphere.center).toEqual(positionsCenter);
    expect(sphere.radius).toBeGreaterThan(1.5);
    expect(sphere.radius).toBeLessThan(2.0);
  });

  it("fromOrientedBoundingBox works without a result parameter", function () {
    const box = OrientedBoundingBox.fromPoints(getPositions());
    const sphere = BoundingSphere.fromOrientedBoundingBox(box);
    expect(sphere.center).toEqual(positionsCenter);
    expect(sphere.radius).toBeGreaterThan(1.5);
    expect(sphere.radius).toBeLessThan(2.0);
  });

  it("throws from fromOrientedBoundingBox with undefined orientedBoundingBox parameter", function () {
    expect(function () {
      BoundingSphere.fromOrientedBoundingBox(undefined);
    }).toThrowDeveloperError();
  });

  it("fromTransformation works with a result parameter", function () {
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, 0.4);
    const scale = new Cartesian3(1.0, 2.0, 3.0);
    const expectedRadius = 0.5 * Cartesian3.magnitude(scale);
    const transformation = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );

    const sphere = new BoundingSphere();
    const result = BoundingSphere.fromTransformation(transformation, sphere);

    expect(result.center).toEqual(translation);
    expect(result.radius).toEqualEpsilon(expectedRadius, CesiumMath.EPSILON14);
    expect(result).toBe(sphere);
  });

  it("fromTransformation works without a result parameter", function () {
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, 0.4);
    const scale = new Cartesian3(1.0, 2.0, 3.0);
    const expectedRadius = 0.5 * Cartesian3.magnitude(scale);
    const transformation = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );

    const sphere = BoundingSphere.fromTransformation(transformation);
    expect(sphere.center).toEqual(translation);
    expect(sphere.radius).toEqualEpsilon(expectedRadius, CesiumMath.EPSILON14);
  });

  it("fromTransformation works with a transformation that has zero scale", function () {
    const transformation = Matrix4.fromScale(Cartesian3.ZERO);

    const sphere = BoundingSphere.fromTransformation(transformation);

    expect(sphere.center).toEqual(Cartesian3.ZERO);
    expect(sphere.radius).toEqual(0.0);
  });

  it("throws from fromTransformation with undefined transformation parameter", function () {
    expect(function () {
      BoundingSphere.fromTransformation(undefined);
    }).toThrowDeveloperError();
  });

  it("intersectPlane with sphere on the positive side of a plane", function () {
    const sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
    const normal = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
    const position = Cartesian3.UNIT_X;
    const plane = new Plane(normal, -Cartesian3.dot(normal, position));
    expect(sphere.intersectPlane(plane)).toEqual(Intersect.INSIDE);
  });

  it("intersectPlane with sphere on the negative side of a plane", function () {
    const sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
    const normal = Cartesian3.UNIT_X;
    const position = Cartesian3.UNIT_X;
    const plane = new Plane(normal, -Cartesian3.dot(normal, position));
    expect(sphere.intersectPlane(plane)).toEqual(Intersect.OUTSIDE);
  });

  it("intersectPlane with sphere intersecting a plane", function () {
    const sphere = new BoundingSphere(Cartesian3.UNIT_X, 0.5);
    const normal = Cartesian3.UNIT_X;
    const position = Cartesian3.UNIT_X;
    const plane = new Plane(normal, -Cartesian3.dot(normal, position));
    expect(sphere.intersectPlane(plane)).toEqual(Intersect.INTERSECTING);
  });

  it("expands to contain another sphere", function () {
    const bs1 = new BoundingSphere(
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      1.0
    );
    const bs2 = new BoundingSphere(Cartesian3.UNIT_X, 1.0);
    const expected = new BoundingSphere(Cartesian3.ZERO, 2.0);
    expect(BoundingSphere.union(bs1, bs2)).toEqual(expected);
  });

  it("union left sphere encloses right", function () {
    const bs1 = new BoundingSphere(Cartesian3.ZERO, 3.0);
    const bs2 = new BoundingSphere(Cartesian3.UNIT_X, 1.0);
    const union = BoundingSphere.union(bs1, bs2);
    expect(union).toEqual(bs1);
  });

  it("union of co-located spheres, right sphere encloses left", function () {
    const bs1 = new BoundingSphere(Cartesian3.UNIT_X, 1.0);
    const bs2 = new BoundingSphere(Cartesian3.UNIT_X, 2.0);
    const union = BoundingSphere.union(bs1, bs2);
    expect(union).toEqual(bs2);
  });

  it("union result parameter is a tight fit", function () {
    const bs1 = new BoundingSphere(
      Cartesian3.multiplyByScalar(
        Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
        3.0,
        new Cartesian3()
      ),
      3.0
    );
    const bs2 = new BoundingSphere(Cartesian3.UNIT_X, 1.0);
    const expected = new BoundingSphere(
      Cartesian3.multiplyByScalar(
        Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
        2.0,
        new Cartesian3()
      ),
      4.0
    );
    BoundingSphere.union(bs1, bs2, bs1);
    expect(bs1).toEqual(expected);
  });

  it("expands to contain another point", function () {
    const bs = new BoundingSphere(
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      1.0
    );
    const point = Cartesian3.UNIT_X;
    const expected = new BoundingSphere(
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      2.0
    );
    expect(BoundingSphere.expand(bs, point)).toEqual(expected);
  });

  it("applies transform", function () {
    const bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
    const transform = Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0));
    const expected = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 1.0);
    expect(BoundingSphere.transform(bs, transform)).toEqual(expected);
  });

  it("applies scale transform", function () {
    const bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
    const transform = Matrix4.fromScale(new Cartesian3(1.0, 2.0, 3.0));
    const expected = new BoundingSphere(Cartesian3.ZERO, 3.0);
    expect(BoundingSphere.transform(bs, transform)).toEqual(expected);
  });

  it("applies transform without scale", function () {
    const bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
    const transform = Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0));
    const expected = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 1.0);
    expect(BoundingSphere.transformWithoutScale(bs, transform)).toEqual(
      expected
    );
  });

  it("transformWithoutScale ignores scale", function () {
    const bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
    const transform = Matrix4.fromScale(new Cartesian3(1.0, 2.0, 3.0));
    const expected = new BoundingSphere(Cartesian3.ZERO, 1.0);
    expect(BoundingSphere.transformWithoutScale(bs, transform)).toEqual(
      expected
    );
  });

  it("finds distances", function () {
    const bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
    const position = new Cartesian3(-2.0, 1.0, 0.0);
    const direction = Cartesian3.UNIT_X;
    const expected = new Interval(1.0, 3.0);
    expect(
      BoundingSphere.computePlaneDistances(bs, position, direction)
    ).toEqual(expected);
  });

  it("distance squared to point outside of sphere", function () {
    const bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
    const position = new Cartesian3(-2.0, 1.0, 0.0);
    const expected = 1.52786405;
    expect(BoundingSphere.distanceSquaredTo(bs, position)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON6
    );
  });

  it("distance squared to point inside sphere", function () {
    const bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
    const position = new Cartesian3(-0.5, 0.5, 0.0);
    expect(BoundingSphere.distanceSquaredTo(bs, position)).toEqual(0.0);
  });

  it("projectTo2D", function () {
    const positions = getPositions();
    const projection = new GeographicProjection();

    const positions2D = [];
    for (let i = 0; i < positions.length; ++i) {
      const position = positions[i];
      const cartographic = projection.ellipsoid.cartesianToCartographic(
        position
      );
      positions2D.push(projection.project(cartographic));
    }

    const boundingSphere3D = BoundingSphere.fromPoints(positions);
    const boundingSphere2D = BoundingSphere.projectTo2D(
      boundingSphere3D,
      projection
    );
    const actualSphere = BoundingSphere.fromPoints(positions2D);
    actualSphere.center = new Cartesian3(
      actualSphere.center.z,
      actualSphere.center.x,
      actualSphere.center.y
    );

    expect(boundingSphere2D.center).toEqualEpsilon(
      actualSphere.center,
      CesiumMath.EPSILON6
    );
    expect(boundingSphere2D.radius).toBeGreaterThan(actualSphere.radius);
  });

  it("projectTo2D with result parameter", function () {
    const positions = getPositions();
    const projection = new GeographicProjection();
    const sphere = new BoundingSphere();

    const positions2D = [];
    for (let i = 0; i < positions.length; ++i) {
      const position = positions[i];
      const cartographic = projection.ellipsoid.cartesianToCartographic(
        position
      );
      positions2D.push(projection.project(cartographic));
    }

    const boundingSphere3D = BoundingSphere.fromPoints(positions);
    const boundingSphere2D = BoundingSphere.projectTo2D(
      boundingSphere3D,
      projection,
      sphere
    );
    const actualSphere = BoundingSphere.fromPoints(positions2D);
    actualSphere.center = new Cartesian3(
      actualSphere.center.z,
      actualSphere.center.x,
      actualSphere.center.y
    );

    expect(boundingSphere2D).toBe(sphere);
    expect(boundingSphere2D.center).toEqualEpsilon(
      actualSphere.center,
      CesiumMath.EPSILON6
    );
    expect(boundingSphere2D.radius).toBeGreaterThan(actualSphere.radius);
  });

  it("can pack and unpack", function () {
    const array = [];
    const boundingSphere = new BoundingSphere();
    boundingSphere.center = new Cartesian3(1, 2, 3);
    boundingSphere.radius = 4;
    BoundingSphere.pack(boundingSphere, array);
    expect(array.length).toEqual(BoundingSphere.packedLength);
    expect(BoundingSphere.unpack(array)).toEqual(boundingSphere);
  });

  it("can pack and unpack with offset", function () {
    const packed = new Array(3);
    const offset = 3;
    const boundingSphere = new BoundingSphere();
    boundingSphere.center = new Cartesian3(1, 2, 3);
    boundingSphere.radius = 4;

    BoundingSphere.pack(boundingSphere, packed, offset);
    expect(packed.length).toEqual(offset + BoundingSphere.packedLength);

    const result = new BoundingSphere();
    const returnedResult = BoundingSphere.unpack(packed, offset, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(boundingSphere);
  });

  it("pack throws with undefined boundingSphere", function () {
    const array = [];
    expect(function () {
      BoundingSphere.pack(undefined, array);
    }).toThrowDeveloperError();
  });

  it("pack throws with undefined array", function () {
    const boundingSphere = new BoundingSphere();
    expect(function () {
      BoundingSphere.pack(boundingSphere, undefined);
    }).toThrowDeveloperError();
  });

  it("unpack throws with undefined array", function () {
    expect(function () {
      BoundingSphere.unpack(undefined);
    }).toThrowDeveloperError();
  });

  it("static projectTo2D throws without sphere", function () {
    expect(function () {
      BoundingSphere.projectTo2D();
    }).toThrowDeveloperError();
  });

  it("clone returns undefined with no parameter", function () {
    expect(BoundingSphere.clone()).toBeUndefined();
  });

  it("union throws with no left parameter", function () {
    const right = new BoundingSphere();
    expect(function () {
      BoundingSphere.union(undefined, right);
    }).toThrowDeveloperError();
  });

  it("union throws with no right parameter", function () {
    const left = new BoundingSphere();
    expect(function () {
      BoundingSphere.union(left, undefined);
    }).toThrowDeveloperError();
  });

  it("expand throws without a sphere", function () {
    const plane = new Cartesian3();
    expect(function () {
      BoundingSphere.expand(undefined, plane);
    }).toThrowDeveloperError();
  });

  it("expand throws without a point", function () {
    const sphere = new BoundingSphere();
    expect(function () {
      BoundingSphere.expand(sphere, undefined);
    }).toThrowDeveloperError();
  });

  it("intersectPlane throws without a sphere", function () {
    const plane = new Plane(Cartesian3.UNIT_X, 0.0);
    expect(function () {
      BoundingSphere.intersectPlane(undefined, plane);
    }).toThrowDeveloperError();
  });

  it("intersectPlane throws without a plane", function () {
    const sphere = new BoundingSphere();
    expect(function () {
      BoundingSphere.intersectPlane(sphere, undefined);
    }).toThrowDeveloperError();
  });

  it("transform throws without a sphere", function () {
    expect(function () {
      BoundingSphere.transform();
    }).toThrowDeveloperError();
  });

  it("transform throws without a transform", function () {
    const sphere = new BoundingSphere();
    expect(function () {
      BoundingSphere.transform(sphere);
    }).toThrowDeveloperError();
  });

  it("distanceSquaredTo throws without a sphere", function () {
    expect(function () {
      BoundingSphere.distanceSquaredTo();
    }).toThrowDeveloperError();
  });

  it("distanceSquaredTo throws without a cartesian", function () {
    expect(function () {
      BoundingSphere.distanceSquaredTo(new BoundingSphere());
    }).toThrowDeveloperError();
  });

  it("transformWithoutScale throws without a sphere", function () {
    expect(function () {
      BoundingSphere.transformWithoutScale();
    }).toThrowDeveloperError();
  });

  it("transformWithoutScale throws without a transform", function () {
    const sphere = new BoundingSphere();
    expect(function () {
      BoundingSphere.transformWithoutScale(sphere);
    }).toThrowDeveloperError();
  });

  it("computePlaneDistances throws without a sphere", function () {
    expect(function () {
      BoundingSphere.computePlaneDistances();
    }).toThrowDeveloperError();
  });

  it("computePlaneDistances throws without a position", function () {
    expect(function () {
      BoundingSphere.computePlaneDistances(new BoundingSphere());
    }).toThrowDeveloperError();
  });

  it("computePlaneDistances throws without a direction", function () {
    expect(function () {
      BoundingSphere.computePlaneDistances(
        new BoundingSphere(),
        new Cartesian3()
      );
    }).toThrowDeveloperError();
  });

  it("isOccluded throws without a sphere", function () {
    expect(function () {
      BoundingSphere.isOccluded();
    }).toThrowDeveloperError();
  });

  it("isOccluded throws without an occluder", function () {
    expect(function () {
      BoundingSphere.isOccluded(new BoundingSphere());
    }).toThrowDeveloperError();
  });

  function expectBoundingSphereToContainPoint(
    boundingSphere,
    point,
    projection
  ) {
    const pointInCartesian = projection.project(point);
    let distanceFromCenter = Cartesian3.magnitude(
      Cartesian3.subtract(
        pointInCartesian,
        boundingSphere.center,
        new Cartesian3()
      )
    );

    // The distanceFromCenter for corner points at the height extreme should equal the
    // bounding sphere's radius.  But due to rounding errors it can end up being
    // very slightly greater.  Pull in the distanceFromCenter slightly to
    // account for this possibility.
    distanceFromCenter -= CesiumMath.EPSILON9;

    expect(distanceFromCenter).toBeLessThanOrEqualTo(boundingSphere.radius);
  }

  it("fromRectangleWithHeights2D includes specified min and max heights", function () {
    const rectangle = new Rectangle(0.1, 0.5, 0.2, 0.6);
    const projection = new GeographicProjection();
    const minHeight = -327.0;
    const maxHeight = 2456.0;
    const boundingSphere = BoundingSphere.fromRectangleWithHeights2D(
      rectangle,
      projection,
      minHeight,
      maxHeight
    );

    // Test that the corners are inside the bounding sphere.
    let point = Rectangle.southwest(rectangle).clone();
    point.height = minHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = Rectangle.southwest(rectangle).clone();
    point.height = maxHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = Rectangle.northeast(rectangle).clone();
    point.height = minHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = Rectangle.northeast(rectangle).clone();
    point.height = maxHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = Rectangle.southeast(rectangle).clone();
    point.height = minHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = Rectangle.southeast(rectangle).clone();
    point.height = maxHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = Rectangle.northwest(rectangle).clone();
    point.height = minHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = Rectangle.northwest(rectangle).clone();
    point.height = maxHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    // Test that the center is inside the bounding sphere
    point = Rectangle.center(rectangle).clone();
    point.height = minHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = Rectangle.center(rectangle).clone();
    point.height = maxHeight;
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    // Test that the edge midpoints are inside the bounding sphere.
    point = new Cartographic(
      Rectangle.center(rectangle).longitude,
      rectangle.south,
      minHeight
    );
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = new Cartographic(
      Rectangle.center(rectangle).longitude,
      rectangle.south,
      maxHeight
    );
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = new Cartographic(
      Rectangle.center(rectangle).longitude,
      rectangle.north,
      minHeight
    );
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = new Cartographic(
      Rectangle.center(rectangle).longitude,
      rectangle.north,
      maxHeight
    );
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = new Cartographic(
      rectangle.west,
      Rectangle.center(rectangle).latitude,
      minHeight
    );
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = new Cartographic(
      rectangle.west,
      Rectangle.center(rectangle).latitude,
      maxHeight
    );
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = new Cartographic(
      rectangle.east,
      Rectangle.center(rectangle).latitude,
      minHeight
    );
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);

    point = new Cartographic(
      rectangle.east,
      Rectangle.center(rectangle).latitude,
      maxHeight
    );
    expectBoundingSphereToContainPoint(boundingSphere, point, projection);
  });

  it("computes the volume of a BoundingSphere", function () {
    const sphere = new BoundingSphere(new Cartesian3(), 1.0);
    const computedVolume = sphere.volume();
    const expectedVolume = (4.0 / 3.0) * CesiumMath.PI;
    expect(computedVolume).toEqualEpsilon(expectedVolume, CesiumMath.EPSILON6);
  });

  createPackableSpecs(
    BoundingSphere,
    new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0),
    [1.0, 2.0, 3.0, 4.0]
  );
});
