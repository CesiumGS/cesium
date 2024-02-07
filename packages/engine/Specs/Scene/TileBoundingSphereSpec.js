import {
  Cartesian3,
  Color,
  Intersect,
  Math as CesiumMath,
  Plane,
  Ray,
  TileBoundingSphere,
} from "../../index.js";

import createFrameState from "../../../../Specs/createFrameState.js";

describe("Scene/TileBoundingSphere", function () {
  const tileBoundingSphere = new TileBoundingSphere(
    new Cartesian3(0.0, 0.0, 0.0),
    1.0
  );
  const frameState = createFrameState();

  it("can be instantiated with center and radius", function () {
    const center = new Cartesian3(0.0, 0.0, 0.0);
    const radius = 1.0;
    const tbs = new TileBoundingSphere(center, radius);
    expect(tbs).toBeDefined();
    expect(tbs.boundingVolume).toBeDefined();
    expect(tbs.boundingSphere).toBeDefined();
    expect(tbs.center).toEqual(center);
    expect(tbs.radius).toEqual(radius);
  });

  it("createDebugVolume throws when color is undefined", function () {
    expect(function () {
      return tileBoundingSphere.createDebugVolume();
    }).toThrowDeveloperError();
  });

  it("can create a debug volume", function () {
    const debugVolume = tileBoundingSphere.createDebugVolume(Color.BLUE);
    expect(debugVolume).toBeDefined();
  });

  it("distanceToCamera throws when frameState is undefined", function () {
    expect(function () {
      return tileBoundingSphere.distanceToCamera();
    }).toThrowDeveloperError();
  });

  it("distance to camera is 0 when camera is inside bounding sphere", function () {
    frameState.camera.position = new Cartesian3(0.0, 0.0, 0.0);
    expect(tileBoundingSphere.distanceToCamera(frameState)).toEqual(0.0);
  });

  it("distance to camera is correct when camera is outside bounding region", function () {
    frameState.camera.position = new Cartesian3(0.0, 2.0, 0.0);
    expect(tileBoundingSphere.distanceToCamera(frameState)).toEqual(1.0);
  });

  it("intersectPlane throws when plane is undefined", function () {
    expect(function () {
      return tileBoundingSphere.intersectPlane();
    }).toThrowDeveloperError();
  });

  it("intersects plane", function () {
    const normal = new Cartesian3(0.0, 0.0, 1.0);
    const plane = new Plane(normal, CesiumMath.EPSILON6);
    expect(tileBoundingSphere.intersectPlane(plane)).toEqual(
      Intersect.INTERSECTING
    );
  });

  it("intersectRay throws when ray is undefined", function () {
    expect(function () {
      return tileBoundingSphere.intersectRay();
    }).toThrowDeveloperError();
  });

  it("intersectRay returns undefined if there is no intersection", function () {
    const ray = new Ray();
    ray.origin = new Cartesian3(0.0, 0.0, 2.0);
    ray.direction = new Cartesian3(0.0, 1.0, 0.0);

    expect(tileBoundingSphere.intersectRay(ray)).toBeUndefined();
  });

  it("intersectRay works with origin inside", function () {
    const ray = new Ray();
    ray.direction = new Cartesian3(0.0, 0.0, 1.0);

    const expected = new Cartesian3(0.0, 0.0, 1.0);
    expect(tileBoundingSphere.intersectRay(ray)).toEqual(expected);
  });

  it("intersectRay works with origin outside", function () {
    const ray = new Ray();
    ray.origin = new Cartesian3(0.0, 0.0, 2.0);
    ray.direction = new Cartesian3(0.0, 0.0, -1.0);

    const expected = new Cartesian3(0.0, 0.0, 1.0);
    expect(tileBoundingSphere.intersectRay(ray)).toEqual(expected);
  });

  it("intersectRay works with result parameter", function () {
    const ray = new Ray();
    ray.direction = new Cartesian3(0.0, 0.0, 1.0);
    const result = new Cartesian3();

    const expected = new Cartesian3(0.0, 0.0, 1.0);
    expect(tileBoundingSphere.intersectRay(ray, result)).toBe(result);
    expect(result).toEqual(expected);
  });
});
