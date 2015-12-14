/*global defineSuite*/
defineSuite([
        'Scene/PerspectiveOffCenterFrustum',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/Math',
        'Core/Matrix4'
    ], function(
        PerspectiveOffCenterFrustum,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        CesiumMath,
        Matrix4) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var frustum, planes;

    beforeEach(function() {
        frustum = new PerspectiveOffCenterFrustum();
        frustum.right = 1.0;
        frustum.left = -frustum.right;
        frustum.top = 1.0;
        frustum.bottom = -frustum.top;
        frustum.near = 1.0;
        frustum.far = 2.0;
        planes = frustum.computeCullingVolume(new Cartesian3(), Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), Cartesian3.UNIT_Y).planes;
    });

    it('out of range near plane throws an exception', function() {
        frustum.near = -1.0;
        expect(function() {
            return frustum.projectionMatrix;
        }).toThrowDeveloperError();
    });

    it('negative far plane throws an exception', function() {
        frustum.far = -1.0;
        expect(function() {
            return frustum.projectionMatrix;
        }).toThrowDeveloperError();
    });

    it('computeCullingVolume with no position throws an exception', function() {
        expect(function() {
            return frustum.computeCullingVolume();
        }).toThrowDeveloperError();
    });

    it('computeCullingVolume with no direction throws an exception', function() {
        expect(function() {
            return frustum.computeCullingVolume(new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('computeCullingVolume with no up throws an exception', function() {
        expect(function() {
            return frustum.computeCullingVolume(new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('get frustum left plane', function() {
        var leftPlane = planes[0];
        var x = 1.0 / Math.sqrt(2.0);
        var expectedResult = new Cartesian4(x, 0.0, -x, 0.0);
        expect(leftPlane).toEqual(expectedResult);
    });

    it('get frustum right plane', function() {
        var rightPlane = planes[1];
        var x = 1.0 / Math.sqrt(2.0);
        var expectedResult = new Cartesian4(-x, 0.0, -x, 0.0);
        expect(rightPlane).toEqual(expectedResult);
    });

    it('get frustum bottom plane', function() {
        var bottomPlane = planes[2];
        var x = 1.0 / Math.sqrt(2.0);
        var expectedResult = new Cartesian4(0.0, x, -x, 0.0);
        expect(bottomPlane).toEqual(expectedResult);
    });

    it('get frustum top plane', function() {
        var topPlane = planes[3];
        var x = 1.0 / Math.sqrt(2.0);
        var expectedResult = new Cartesian4(0.0, -x, -x, 0.0);
        expect(topPlane).toEqual(expectedResult);
    });

    it('get frustum near plane', function() {
        var nearPlane = planes[4];
        var expectedResult = new Cartesian4(0.0, 0.0, -1.0, -1.0);
        expect(nearPlane).toEqual(expectedResult);
    });

    it('get frustum far plane', function() {
        var farPlane = planes[5];
        var expectedResult = new Cartesian4(0.0, 0.0, 1.0, 2.0);
        expect(farPlane).toEqual(expectedResult);
    });

    it('get perspective projection matrix', function() {
        var projectionMatrix = frustum.projectionMatrix;

        var top = frustum.top;
        var bottom = frustum.bottom;
        var right = frustum.right;
        var left = frustum.left;
        var near = frustum.near;
        var far = frustum.far;
        var expected = Matrix4.computePerspectiveOffCenter(left, right, bottom, top, near, far, new Matrix4());

        expect(projectionMatrix).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    });

    it('get infinite perspective matrix', function() {
        var top = frustum.top;
        var bottom = frustum.bottom;
        var right = frustum.right;
        var left = frustum.left;
        var near = frustum.near;

        var expected = Matrix4.computeInfinitePerspectiveOffCenter(left, right, bottom, top, near, new Matrix4());
        expect(expected).toEqual(frustum.infiniteProjectionMatrix);
    });

    it('get pixel size throws without canvas dimensions', function() {
        expect(function() {
            return frustum.getPixelSize();
        }).toThrowDeveloperError();
    });

    it('get pixel size throws without canvas width less than or equal to zero', function() {
        expect(function() {
            return frustum.getPixelSize(new Cartesian2(0.0, 1.0));
        }).toThrowDeveloperError();
    });

    it('get pixel size throws without canvas height less than or equal to zero', function() {
        expect(function() {
            return frustum.getPixelSize(new Cartesian2(1.0, 0.0));
        }).toThrowDeveloperError();
    });

    it('get pixel size', function() {
        var pixelSize = frustum.getPixelSize(new Cartesian2(1.0, 1.0));
        expect(pixelSize.x).toEqual(2.0);
        expect(pixelSize.y).toEqual(2.0);
    });

    it('get pixel dimensions throws without canvas height', function() {
        expect(function() {
            return frustum.getPixelDimensions(1.0, undefined, 1.0, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('get pixel dimensions throws without canvas width', function() {
        expect(function() {
            return frustum.getPixelDimensions(undefined, 1.0, 1.0, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('get pixel dimensions throws with canvas width less than or equal to zero', function() {
        expect(function() {
            return frustum.getPixelDimensions(0.0, 1.0, 1.0, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('get pixel dimensions throws with canvas height less than or equal to zero', function() {
        expect(function() {
            return frustum.getPixelDimensions(1.0, 0.0, 1.0, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('get pixel dimensions', function() {
        var pixelSize = frustum.getPixelDimensions(1.0, 1.0, 1.0, new Cartesian2());
        expect(pixelSize.x).toEqual(2.0);
        expect(pixelSize.y).toEqual(2.0);
    });

    it('equals', function() {
        var frustum2 = new PerspectiveOffCenterFrustum();
        frustum2.right = 1.0;
        frustum2.left = -frustum.right;
        frustum2.top = 1.0;
        frustum2.bottom = -frustum.top;
        frustum2.near = 1.0;
        frustum2.far = 2.0;
        frustum2.position = new Cartesian3();
        frustum2.direction =  Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        frustum2.up = Cartesian3.UNIT_Y;

        expect(frustum).toEqual(frustum2);
    });

    it('throws with undefined frustum parameters', function() {
        var frustum = new PerspectiveOffCenterFrustum();
        expect(function() {
            return frustum.infiniteProjectionMatrix;
        }).toThrowDeveloperError();
    });

    it('clone', function() {
        var frustum2 = frustum.clone();
        expect(frustum).toEqual(frustum2);
    });

    it('clone with result parameter', function() {
        var result = new PerspectiveOffCenterFrustum();
        var frustum2 = frustum.clone(result);
        expect(frustum2).toBe(result);
        expect(frustum).toEqual(frustum2);
    });
});
