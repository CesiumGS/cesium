/*global defineSuite*/
defineSuite([
         'Scene/Camera',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/GeographicProjection',
         'Core/Extent',
         'Core/Math',
         'Core/Matrix4',
         'Scene/OrthographicFrustum',
         'Scene/PerspectiveFrustum'
     ], function(
         Camera,
         Cartesian2,
         Cartesian3,
         Cartesian4,
         Cartographic,
         Ellipsoid,
         GeographicProjection,
         Extent,
         CesiumMath,
         Matrix4,
         OrthographicFrustum,
         PerspectiveFrustum) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var camera;
    var canvas = {
        clientWidth : 1024,
        clientHeight : 768
    };

    beforeEach(function() {
        camera = new Camera(canvas);
        camera.position = new Cartesian3();
        camera.up = Cartesian3.UNIT_Y;
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.frustum.near = 1.0;
        camera.frustum.far = 2.0;
        camera.frustum.fovy = (Math.PI) / 3;
        camera.frustum.aspectRatio = 1.0;
    });

    it('constructor throws an exception when there is no canvas', function() {
        expect(function() {
            return new Camera();
        }).toThrow();
    });

    it('get view matrix', function() {
        var viewMatrix = camera.getViewMatrix();
        var position = camera.position;
        var up = camera.up;
        var dir = camera.direction;
        var right = camera.right;
        var rotation = new Matrix4(right.x, right.y, right.z, 0.0,
                                      up.x,    up.y,    up.z, 0.0,
                                    -dir.x,  -dir.y,  -dir.z, 0.0,
                                       0.0,     0.0,     0.0, 1.0);
        var translation = new Matrix4(1.0, 0.0, 0.0, -position.x,
                                      0.0, 1.0, 0.0, -position.y,
                                      0.0, 0.0, 1.0, -position.z,
                                      0.0, 0.0, 0.0,         1.0);
        var expected = rotation.multiply(translation);
        expect(viewMatrix).toEqual(expected);
    });

    it('get inverse view matrix', function() {
        var expected = camera.getViewMatrix().inverse();
        expect(expected).toEqualEpsilon(camera.getInverseViewMatrix(), CesiumMath.EPSILON15);
    });

    it('get inverse transform', function() {
        camera.transform = new Matrix4(5.0, 0.0, 0.0, 1.0, 0.0, 5.0, 0.0, 2.0, 0.0, 0.0, 5.0, 3.0, 0.0, 0.0, 0.0, 1.0);
        var expected = camera.transform.inverseTransformation();
        expect(expected).toEqual(camera.getInverseTransform());
    });

    it('worldToCameraCoordinates throws without cartesian', function() {
        expect(function() {
            camera.worldToCameraCoordinates();
        }).toThrow();
    });

    it('transforms to the cameras reference frame', function() {
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                       1.0, 0.0, 0.0, 0.0,
                                       0.0, 1.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0, 1.0);
        expect(camera.worldToCameraCoordinates(Cartesian4.UNIT_X)).toEqual(Cartesian4.UNIT_Z);
    });

    it('cameraToWorldCoordinates throws without cartesian', function() {
        expect(function() {
            camera.cameraToWorldCoordinates();
        }).toThrow();
    });

    it('transforms from the cameras reference frame', function() {
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                       1.0, 0.0, 0.0, 0.0,
                                       0.0, 1.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0, 1.0);
        expect(camera.cameraToWorldCoordinates(Cartesian4.UNIT_Z)).toEqual(Cartesian4.UNIT_X);
    });

});
