import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  Matrix4,
  OrthographicFrustum,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";

describe("Core/OrthographicFrustum", function () {
  let frustum, planes;

  beforeEach(function () {
    frustum = new OrthographicFrustum();
    frustum.near = 1.0;
    frustum.far = 3.0;
    frustum.width = 2.0;
    frustum.aspectRatio = 1.0;
    planes = frustum.computeCullingVolume(
      new Cartesian3(),
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      Cartesian3.UNIT_Y
    ).planes;
  });

  it("constructs", function () {
    const options = {
      width: 1.0,
      aspectRatio: 2.0,
      near: 3.0,
      far: 4.0,
      xOffset: 5.0,
      yOffset: 6.0,
    };
    const f = new OrthographicFrustum(options);
    expect(f.width).toEqual(options.width);
    expect(f.aspectRatio).toEqual(options.aspectRatio);
    expect(f.near).toEqual(options.near);
    expect(f.far).toEqual(options.far);
  });

  it("default constructs", function () {
    const f = new OrthographicFrustum();
    expect(f.width).toBeUndefined();
    expect(f.aspectRatio).toBeUndefined();
    expect(f.near).toEqual(1.0);
    expect(f.far).toEqual(500000000.0);
  });

  it("undefined width causes an exception", function () {
    frustum.width = undefined;
    expect(function () {
      return frustum.projectionMatrix;
    }).toThrowDeveloperError();
  });

  it("undefined aspectRatio throws an exception", function () {
    frustum.aspectRatio = undefined;
    expect(function () {
      return frustum.projectionMatrix;
    }).toThrowDeveloperError();
  });

  it("out of range near plane throws an exception", function () {
    frustum.near = -1.0;
    expect(function () {
      return frustum.projectionMatrix;
    }).toThrowDeveloperError();

    frustum.far = 3.0;
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
    const expectedResult = new Cartesian4(1.0, 0.0, 0.0, 1.0);
    expect(leftPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
  });

  it("get frustum right plane", function () {
    const rightPlane = planes[1];
    const expectedResult = new Cartesian4(-1.0, 0.0, 0.0, 1.0);
    expect(rightPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
  });

  it("get frustum bottom plane", function () {
    const bottomPlane = planes[2];
    const expectedResult = new Cartesian4(0.0, 1.0, 0.0, 1.0);
    expect(bottomPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
  });

  it("get frustum top plane", function () {
    const topPlane = planes[3];
    const expectedResult = new Cartesian4(0.0, -1.0, 0.0, 1.0);
    expect(topPlane).toEqual(expectedResult, CesiumMath.EPSILON4);
  });

  it("get frustum near plane", function () {
    const nearPlane = planes[4];
    const expectedResult = new Cartesian4(0.0, 0.0, -1.0, -1.0);
    expect(nearPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
  });

  it("get frustum far plane", function () {
    const farPlane = planes[5];
    const expectedResult = new Cartesian4(0.0, 0.0, 1.0, 3.0);
    expect(farPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
  });

  it("get orthographic projection matrix", function () {
    frustum = frustum.offCenterFrustum;
    const expected = Matrix4.computeOrthographicOffCenter(
      frustum.left,
      frustum.right,
      frustum.bottom,
      frustum.top,
      frustum.near,
      frustum.far,
      new Matrix4()
    );
    const projectionMatrix = frustum.projectionMatrix;
    expect(projectionMatrix).toEqualEpsilon(expected, CesiumMath.EPSILON6);
  });

  it("get pixel dimensions throws without canvas height", function () {
    expect(function () {
      return frustum.getPixelDimensions(
        1.0,
        undefined,
        0.0,
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
        0.0,
        1.0,
        new Cartesian2()
      );
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions throws with canvas width less than or equal to zero", function () {
    expect(function () {
      return frustum.getPixelDimensions(0.0, 1.0, 0.0, 1.0, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions throws with canvas height less than or equal to zero", function () {
    expect(function () {
      return frustum.getPixelDimensions(1.0, 0.0, 0.0, 1.0, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions throws without pixel ratio", function () {
    expect(function () {
      return frustum.getPixelDimensions(
        1.0,
        1.0,
        0.0,
        undefined,
        new Cartesian2()
      );
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions throws with pixel ratio less than or equal to zero", function () {
    expect(function () {
      return frustum.getPixelDimensions(1.0, 1.0, 0.0, 0.0, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("get pixel dimensions", function () {
    const dimensions = new Cartesian2(1.0, 1.0);
    const pixelRatio = 1.0;
    const distance = 1.0;
    const pixelSize = frustum.getPixelDimensions(
      dimensions.x,
      dimensions.y,
      distance,
      pixelRatio,
      new Cartesian2()
    );
    const expected = frustum.offCenterFrustum.getPixelDimensions(
      dimensions.x,
      dimensions.y,
      distance,
      pixelRatio,
      new Cartesian2()
    );
    expect(pixelSize.x).toEqual(expected.x);
    expect(pixelSize.y).toEqual(expected.y);
  });

  it("get pixel dimensions with pixel ratio", function () {
    const dimensions = new Cartesian2(1.0, 1.0);
    const pixelRatio = 2.0;
    const distance = 1.0;
    const pixelSize = frustum.getPixelDimensions(
      dimensions.x,
      dimensions.y,
      distance,
      pixelRatio,
      new Cartesian2()
    );
    const expected = frustum.offCenterFrustum.getPixelDimensions(
      dimensions.x,
      dimensions.y,
      distance,
      pixelRatio,
      new Cartesian2()
    );
    expect(pixelSize.x).toEqual(expected.x);
    expect(pixelSize.y).toEqual(expected.y);
  });

  it("equals", function () {
    const frustum2 = new OrthographicFrustum();
    frustum2.near = 1.0;
    frustum2.far = 3.0;
    frustum2.width = 2.0;
    frustum2.aspectRatio = 1.0;
    expect(frustum.equals(frustum2)).toEqual(true);
  });

  it("equals epsilon", function () {
    const frustum2 = new OrthographicFrustum();
    frustum2.near = 1.0;
    frustum2.far = 3.0;
    frustum2.width = 2.0;
    frustum2.aspectRatio = 1.0;
    expect(frustum.equalsEpsilon(frustum2, CesiumMath.EPSILON7)).toEqual(true);

    const frustum3 = new OrthographicFrustum();
    frustum3.near = 1.01;
    frustum3.far = 3.01;
    frustum3.width = 2.01;
    frustum3.aspectRatio = 1.01;
    expect(frustum.equalsEpsilon(frustum3, CesiumMath.EPSILON1)).toEqual(true);

    const frustum4 = new OrthographicFrustum();
    frustum4.near = 1.0;
    frustum4.far = 3.0;
    frustum4.width = 2.0;
    frustum4.aspectRatio = 1.1;
    expect(frustum.equalsEpsilon(frustum4, CesiumMath.EPSILON2)).toEqual(false);
  });

  it("equals undefined", function () {
    expect(frustum.equals()).toEqual(false);
  });

  it("throws with undefined frustum parameters", function () {
    const frustum = new OrthographicFrustum();
    expect(function () {
      return frustum.projectionMatrix;
    }).toThrowDeveloperError();
  });

  it("clone", function () {
    const frustum2 = frustum.clone();
    expect(frustum).toEqual(frustum2);
  });

  it("clone with result parameter", function () {
    const result = new OrthographicFrustum();
    const frustum2 = frustum.clone(result);
    expect(frustum2).toBe(result);
    expect(frustum).toEqual(frustum2);
  });

  createPackableSpecs(
    OrthographicFrustum,
    new OrthographicFrustum({
      width: 1.0,
      aspectRatio: 2.0,
      near: 3.0,
      far: 4.0,
    }),
    [1.0, 2.0, 3.0, 4.0]
  );
});
