/*global defineSuite*/
defineSuite([
         'Scene/PerspectiveFrustum',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Matrix4',
         'Core/Math'
     ], function(
         PerspectiveFrustum,
         Cartesian3,
         Cartesian4,
         Matrix4,
         CesiumMath) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    var frustum, planes;

    beforeEach(function() {
        frustum = new PerspectiveFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.fovy = (Math.PI) / 3;
        frustum.aspectRatio = 1.0;

        planes = frustum.getPlanes(new Cartesian3(), Cartesian3.UNIT_Z.negate(), Cartesian3.UNIT_Y);
    });

    it('out of range fov causes an exception', function() {
        frustum.fovy = -1.0;
        expect(function() {
            frustum.getProjectionMatrix();
        }).toThrow();

        frustum.fovy = CesiumMath.TWO_PI;
        expect(function() {
            frustum.getProjectionMatrix();
        }).toThrow();
    });

    it('negative aspect ratio throws an exception', function() {
        frustum.aspectRatio = -1.0;
        expect(function() {
            frustum.getProjectionMatrix();
        }).toThrow();
    });

    it('out of range near plane throws an exception', function() {
        frustum.near = -1.0;
        expect(function() {
            frustum.getProjectionMatrix();
        }).toThrow();

        frustum.far = 3.0;
        expect(function() {
            frustum.getProjectionMatrix();
        }).toThrow();
    });

    it('negative far plane throws an exception', function() {
        frustum.far = -1.0;
        expect(function() {
            frustum.getProjectionMatrix();
        }).toThrow();
    });

    it('getPlanes with no position throws an exception', function() {
        expect(function() {
            frustum.getPlanes();
        }).toThrow();
    });

    it('getPlanes with no direction throws an exception', function() {
        expect(function() {
            frustum.getPlanes(new Cartesian3());
        }).toThrow();
    });

    it('getPlanes with no up throws an exception', function() {
        expect(function() {
            frustum.getPlanes(new Cartesian3(), new Cartesian3());
        }).toThrow();
    });

    it('get frustum left plane', function() {
        var leftPlane = planes[0];
        var expectedResult = new Cartesian4(Math.sqrt(3) / 2, 0, -0.5, 0);
        expect(leftPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum right plane', function() {
        var rightPlane = planes[1];
        var expectedResult = new Cartesian4(-Math.sqrt(3) / 2, 0, -0.5, 0);
        expect(rightPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum bottom plane', function() {
        var bottomPlane = planes[2];
        var expectedResult = new Cartesian4(0, Math.sqrt(3) / 2, -0.5, 0);
        expect(bottomPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum top plane', function() {
        var topPlane = planes[3];
        var expectedResult = new Cartesian4(0, -Math.sqrt(3) / 2, -0.5, 0);
        expect(topPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum near plane', function() {
        var nearPlane = planes[4];
        var expectedResult = new Cartesian4(0, 0, -1, -1);
        expect(nearPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum far plane', function() {
        var farPlane = planes[5];
        var expectedResult = new Cartesian4(0, 0, 1, 2);
        expect(farPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get perspective projection matrix', function() {
        var projectionMatrix = frustum.getProjectionMatrix();
        var expected = Matrix4.createPerspectiveFieldOfView(frustum.fovy, frustum.aspectRatio, frustum.near, frustum.far);
        expect(projectionMatrix.equalsEpsilon(expected, CesiumMath.EPSILON6)).toEqual(true);
    });

    it('get infinite perspective matrix', function() {
        var top = frustum.near * Math.tan(0.5 * frustum.fovy);
        var bottom = -top;
        var right = frustum.aspectRatio * top;
        var left = -right;
        var near = frustum.near;

        var expected = Matrix4.createInfinitePerspectiveOffCenter(left, right, bottom, top, near);
        expect(expected.equals(frustum.getInfiniteProjectionMatrix())).toEqual(true);
    });

    it('equals', function() {
        var frustum2 = new PerspectiveFrustum();
        frustum2.near = 1.0;
        frustum2.far = 2.0;
        frustum2.fovy = (Math.PI) / 3;
        frustum2.aspectRatio = 1.0;
        expect(frustum.equals(frustum2)).toEqual(true);
    });

    it('destroys', function() {
        expect(frustum.isDestroyed()).toEqual(false);
        frustum.destroy();
        expect(frustum.isDestroyed()).toEqual(true);
    });

    it('throws with null frustum parameters', function() {
        var frustum = new PerspectiveFrustum();
        expect(function() {
            return frustum.getInfiniteProjectionMatrix();
        }).toThrow();
    });
});
