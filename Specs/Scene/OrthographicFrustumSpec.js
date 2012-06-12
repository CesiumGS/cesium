/*global defineSuite*/
defineSuite([
         'Scene/OrthographicFrustum',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Matrix4',
         'Core/Math'
     ], function(
         OrthographicFrustum,
         Cartesian3,
         Cartesian4,
         Matrix4,
         CesiumMath) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    var frustum, planes;

    beforeEach(function() {
        frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 3.0;
        frustum.right = 1.0;
        frustum.left = -1.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;

        planes = frustum.getPlanes(new Cartesian3(), Cartesian3.UNIT_Z.negate(), Cartesian3.UNIT_Y);
    });

    it('left greater than right causes an exception', function() {
        frustum.left = frustum.right + 1.0;
        expect(function() {
            frustum.getProjectionMatrix();
        }).toThrow();
    });

    it('bottom greater than top throws an exception', function() {
        frustum.bottom = frustum.top + 1.0;
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
        var expectedResult = new Cartesian4(1.0, 0.0, 0.0, 1.0);
        expect(leftPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum right plane', function() {
        var rightPlane = planes[1];
        var expectedResult = new Cartesian4(-1.0, 0.0, 0.0, 1.0);
        expect(rightPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum bottom plane', function() {
        var bottomPlane = planes[2];
        var expectedResult = new Cartesian4(0.0, 1.0, 0.0, 1.0);
        expect(bottomPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum top plane', function() {
        var topPlane = planes[3];
        var expectedResult = new Cartesian4(0.0, -1.0, 0.0, 1.0);
        expect(topPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum near plane', function() {
        var nearPlane = planes[4];
        var expectedResult = new Cartesian4(0.0, 0.0, -1.0, -1.0);
        expect(nearPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get frustum far plane', function() {
        var farPlane = planes[5];
        var expectedResult = new Cartesian4(0.0, 0.0, 1.0, 3.0);
        expect(farPlane.equalsEpsilon(expectedResult, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('get orthographic projection matrix', function() {
        var projectionMatrix = frustum.getProjectionMatrix();
        var expected = Matrix4.createOrthographicOffCenter(frustum.left, frustum.right, frustum.top, frustum.bottm, frustum.near, frustum.far);
        expect(projectionMatrix.equalsEpsilon(expected, CesiumMath.EPSILON6)).toEqual(true);
    });

    it('clone', function() {
        var clone = frustum.clone();
        expect(clone.equals(frustum)).toEqual(true);
    });

    it('destroys', function() {
        expect(frustum.isDestroyed()).toEqual(false);
        frustum.destroy();
        expect(frustum.isDestroyed()).toEqual(true);
    });

    it('throws with null plane(s)', function() {
        var frustum = new OrthographicFrustum();
        expect(function() {
            frustum.getProjectionMatrix();
        }).toThrow();
    });
});
