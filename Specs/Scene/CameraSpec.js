/*global defineSuite*/
defineSuite([
         'Scene/Camera',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Math',
         'Core/Matrix4'
     ], function(
         Camera,
         Cartesian3,
         Cartesian4,
         CesiumMath,
         Matrix4) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var camera;

    beforeEach(function() {
        camera = new Camera({
            getDrawingBufferWidth: function() {
                return 1024;
            },
            getDrawingBufferHeight: function() {
                return 768;
            }
        });
        camera.position = new Cartesian3();
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.frustum.near = 1.0;
        camera.frustum.far = 2.0;
        camera.frustum.fovy = (Math.PI) / 3;
        camera.frustum.aspectRatio = 1.0;
    });

    it('constructor throws an exception when there is no canvas', function() {
        expect(function() {
            return new Camera();
        }).toThrowDeveloperError();
    });

    it('get view matrix', function() {
        var viewMatrix = camera.viewMatrix;
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
        var expected = Matrix4.multiply(rotation, translation);
        expect(viewMatrix).toEqual(expected);
    });

    it('get inverse view matrix', function() {
        var expected = Matrix4.inverse(camera.viewMatrix);
        expect(expected).toEqualEpsilon(camera.inverseViewMatrix, CesiumMath.EPSILON15);
    });

    it('get inverse transform', function() {
        camera.transform = new Matrix4(5.0, 0.0, 0.0, 1.0, 0.0, 5.0, 0.0, 2.0, 0.0, 0.0, 5.0, 3.0, 0.0, 0.0, 0.0, 1.0);
        var expected = Matrix4.inverseTransformation(camera.transform);
        expect(expected).toEqual(camera.inverseTransform);
    });

    it('worldToCameraCoordinates throws without cartesian', function() {
        expect(function() {
            camera.worldToCameraCoordinates();
        }).toThrowDeveloperError();
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
        }).toThrowDeveloperError();
    });

    it('transforms from the cameras reference frame', function() {
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                       1.0, 0.0, 0.0, 0.0,
                                       0.0, 1.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0, 1.0);
        expect(camera.cameraToWorldCoordinates(Cartesian4.UNIT_Z)).toEqual(Cartesian4.UNIT_X);
    });

});
