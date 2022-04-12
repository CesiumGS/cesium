import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { PerspectiveOffCenterFrustum } from "../../Source/Cesium.js";

describe("Core/PerspectiveOffCenterFrustum", function () {
  let frustum, planes;

  beforeEach(function () {
    frustum = new PerspectiveOffCenterFrustum();
    frustum.right = 1.0;
    frustum.left = -frustum.right;
    frustum.top = 1.0;
    frustum.bottom = -frustum.top;
    frustum.near = 1.0;
    frustum.far = 2.0;
    planes = frustum.computeCullingVolume(
      new Cartesian3(),
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      Cartesian3.UNIT_Y
    ).planes;
  });

  it("constructs", function () {
    const options = {
      left: -1.0,
      right: 2.0,
      top: 5.0,
      bottom: -1.0,
      near: 3.0,
      far: 4.0,
    };
    const f = new PerspectiveOffCenterFrustum(options);
    expect(f.width).toEqual(options.width);
    expect(f.aspectRatio).toEqual(options.aspectRatio);
    expect(f.near).toEqual(options.near);
    expect(f.far).toEqual(options.far);
  });

  it("default constructs", function () {
    const f = new PerspectiveOffCenterFrustum();
    expect(f.left).toBeUndefined();
    expect(f.right).toBeUndefined();
    expect(f.top).toBeUndefined();
    expect(f.bottom).toBeUndefined();
    expect(f.near).toEqual(1.0);
    expect(f.far).toEqual(500000000.0);
  });

  it("out of range near plane throws an exception", function () {
    frustum.near = -1.0;
    expect(function () {
      return frustum.projectionMatrix;
    }).toThrowDeveloperError();
  });

  it("negative far plane throws an exception", function () {
    frustum.far = -1.0;
    expect(function () {
      return frustum.projectionMatrix;
    }).toThrowDeveloperError();
  });

  it("computeCullingVolume with no position throws an exception", function () {
    expect(function () {
      return frustum.computeCullingVolume();
    }).toThrowDeveloperError();
  });

  it("computeCullingVolume with no direction throws an exception", function () {
    expect(function () {
      return frustum.computeCullingVolume(new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("computeCullingVolume with no up throws an exception", function () {
    expect(function () {
      return frustum.computeCullingVolume(new Cartesian3(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("get frustum left plane", function () {
    const leftPlane = planes[0];
    const x = 1.0 / Math.sqrt(2.0);
    const expectedResult = new Cartesian4(x, 0.0, -x, 0.0);
    expect(leftPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON15);
  });

  it("get frustum right plane", function () {
    const rightPlane = planes[1];
    const x = 1.0 / Math.sqrt(2.0);
    const expectedResult = new Cartesian4(-x, 0.0, -x, 0.0);
    expect(rightPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON15);
  });

  it("get frustum bottom plane", function () {
    const bottomPlane = planes[2];
    const x = 1.0 / Math.sqrt(2.0);
    const expectedResult = new Cartesian4(0.0, x, -x, 0.0);
    expect(bottomPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON15);
  });

  it("get frustum top plane", function () {
    const topPlane = planes[3];
    const x = 1.0 / Math.sqrt(2.0);
    const expectedResult = new Cartesian4(0.0, -x, -x, 0.0);
    expect(topPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON15);
  });

  it("get frustum near plane", function () {
    const nearPlane = planes[4];
    const expectedResult = new Cartesian4(0.0, 0.0, -1.0, -1.0);
    expect(nearPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON15);
  });

  it("get frustum far plane", function () {
    const farPlane = planes[5];
    const expectedResult = new Cartesian4(0.0, 0.0, 1.0, 2.0);
    expect(farPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON15);
  });

  it("get perspective projection matrix", function () {
    const projectionMatrix = frustum.projectionMatrix;

    const top = frustum.top;
    const bottom = frustum.bottom;
    const right = frustum.right;
    const left = frustum.left;
    const near = frustum.near;
    const far = frustum.far;
    const expected = Matrix4.computePerspectiveOffCenter(
      left,
      right,
      bottom,
      top,
      near,
      far,
      new Matrix4()
    );

    expect(projectionMatrix).toEqualEpsilon(expected, CesiumMath.EPSILON6);
  });

  it("get infinite perspective matrix", function () {
    const top = frustum.top;
    const bottom = frustum.bottom;
    const right = frustum.right;
    const left = frustum.left;
    const near = frustum.near;

    const expected = Matrix4.computeInfinitePerspectiveOffCenter(
      left,
      right,
      bottom,
      top,
      near,
      new Matrix4()
    );
    expect(expected).toEqual(frustum.infiniteProjectionMatrix);
  });

  it("get pixel dimensions throws without canvas height", function () {
    expect(function () {
      return frustum.getPixelDimensions(
        1.0,
        undefined,
        1.0,
        1.0,
        new Cartesian2()
      );
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions throws without canvas width", function () {
    expect(function () {
      return frustum.getPixelDimensions(
        undefined,
        1.0,
        1.0,
        1.0,
        new Cartesian2()
      );
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions throws with canvas width less than or equal to zero", function () {
    expect(function () {
      return frustum.getPixelDimensions(0.0, 1.0, 1.0, 1.0, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions throws with canvas height less than or equal to zero", function () {
    expect(function () {
      return frustum.getPixelDimensions(1.0, 0.0, 1.0, 1.0, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions throws without pixel ratio", function () {
    expect(function () {
      return frustum.getPixelDimensions(
        1.0,
        1.0,
        1.0,
        undefined,
        new Cartesian2()
      );
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions throws with pixel ratio less than or equal to zero", function () {
    expect(function () {
      return frustum.getPixelDimensions(1.0, 1.0, 1.0, 0.0, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions", function () {
    const pixelSize = frustum.getPixelDimensions(
      1.0,
      1.0,
      1.0,
      1.0,
      new Cartesian2()
    );
    expect(pixelSize.x).toEqual(2.0);
    expect(pixelSize.y).toEqual(2.0);
  });

  it("get pixel dimensions with pixel ratio", function () {
    const pixelSize = frustum.getPixelDimensions(
      1.0,
      1.0,
      1.0,
      2.0,
      new Cartesian2()
    );
    expect(pixelSize.x).toEqual(4.0);
    expect(pixelSize.y).toEqual(4.0);
  });

  it("equals", function () {
    const frustum2 = new PerspectiveOffCenterFrustum();
    frustum2.right = 1.0;
    frustum2.left = -frustum.right;
    frustum2.top = 1.0;
    frustum2.bottom = -frustum.top;
    frustum2.near = 1.0;
    frustum2.far = 2.0;
    frustum2.position = new Cartesian3();
    frustum2.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
    frustum2.up = Cartesian3.UNIT_Y;

    expect(frustum).toEqual(frustum2);
  });

  it("equals epsilon", function () {
    const frustum2 = new PerspectiveOffCenterFrustum();
    frustum2.right = 1.0;
    frustum2.left = -frustum.right;
    frustum2.top = 1.0;
    frustum2.bottom = -frustum.top;
    frustum2.near = 1.0;
    frustum2.far = 2.0;
    expect(frustum.equalsEpsilon(frustum2, CesiumMath.EPSILON7)).toEqual(true);

    const frustum3 = new PerspectiveOffCenterFrustum();
    frustum3.right = 1.01;
    frustum3.left = -frustum.right;
    frustum3.top = 1.01;
    frustum3.bottom = -frustum.top;
    frustum3.near = 1.01;
    frustum3.far = 1.99;
    expect(frustum.equalsEpsilon(frustum3, CesiumMath.EPSILON1)).toEqual(true);

    const frustum4 = new PerspectiveOffCenterFrustum();
    frustum4.right = 1.1;
    frustum4.left = -frustum.right;
    frustum4.top = 1.0;
    frustum4.bottom = -frustum.top;
    frustum4.near = 1.0;
    frustum4.far = 2.0;
    expect(frustum.equalsEpsilon(frustum4, CesiumMath.EPSILON2)).toEqual(false);
  });

  it("equals undefined", function () {
    expect(frustum.equals()).toEqual(false);
  });

  it("throws with undefined frustum parameters", function () {
    const frustum = new PerspectiveOffCenterFrustum();
    expect(function () {
      return frustum.infiniteProjectionMatrix;
    }).toThrowDeveloperError();
  });

  it("clone", function () {
    const frustum2 = frustum.clone();
    expect(frustum).toEqual(frustum2);
  });

  it("clone with result parameter", function () {
    const result = new PerspectiveOffCenterFrustum();
    const frustum2 = frustum.clone(result);
    expect(frustum2).toBe(result);
    expect(frustum).toEqual(frustum2);
  });
});
