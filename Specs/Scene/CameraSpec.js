/*global defineSuite*/
defineSuite([
         'Scene/Camera',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/EquidistantCylindricalProjection',
         'Core/Extent',
         'Core/Math',
         'Core/Matrix4',
         'Scene/OrthographicFrustum',
         'Scene/PerspectiveFrustum'
     ], function(
         Camera,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         EquidistantCylindricalProjection,
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
        var right = dir.cross(up);
        var rotation = new Matrix4(right.x, right.y, right.z, 0.0,
                                      up.x,    up.y,    up.z, 0.0,
                                    -dir.x,  -dir.y,  -dir.z, 0.0,
                                       0.0,     0.0,     0.0, 1.0);
        var translation = new Matrix4(1.0, 0.0, 0.0, -position.x,
                                      0.0, 1.0, 0.0, -position.y,
                                      0.0, 0.0, 1.0, -position.z,
                                      0.0, 0.0, 0.0,         1.0);
        var expected = rotation.multiply(translation);
        expect(viewMatrix.equals(expected)).toEqual(true);
    });

    it('get inverse view matrix', function() {
        var expected = camera.getViewMatrix().inverse();
        expect(expected).toEqual(camera.getInverseViewMatrix());
    });

    it('get inverse transform', function() {
        camera.transform = new Matrix4(5.0, 0.0, 0.0, 1.0, 0.0, 5.0, 0.0, 2.0, 0.0, 0.0, 5.0, 3.0, 0.0, 0.0, 0.0, 1.0);
        var expected = camera.transform.inverseTransformation();
        expect(expected.equals(camera.getInverseTransform())).toEqual(true);
    });

    it('get pick ray throws without a position', function() {
        expect(function () {
            camera.getPickRay();
        }).toThrow();
    });

    it('get pick ray perspective', function() {
        camera.frustum.fovy = CesiumMath.PI_OVER_TWO;

        var windowCoord = new Cartesian2(canvas.clientWidth, 0.0);
        var ray = camera.getPickRay(windowCoord);

        var expectedDirection = new Cartesian3(1.0, 1.0, -1.0).normalize();
        expect(ray.origin.equals(camera.position)).toEqual(true);
        expect(ray.direction.equalsEpsilon(expectedDirection, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('get pick ray orthographic', function() {
        var frustum = new OrthographicFrustum();
        frustum.left = -10.0;
        frustum.right = 10.0;
        frustum.bottom = -10.0;
        frustum.top = 10.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        var windowCoord = new Cartesian2((3.0 / 5.0) * canvas.clientWidth, (1.0 - (3.0 / 5.0)) * canvas.clientHeight);
        var ray = camera.getPickRay(windowCoord);

        var cameraPosition = camera.position;
        var expectedPosition = new Cartesian3(cameraPosition.x + 2.0, cameraPosition.y + 2, cameraPosition.z);
        expect(ray.origin.equalsEpsilon(expectedPosition, CesiumMath.EPSILON14)).toEqual(true);
        expect(ray.direction.equals(camera.direction)).toEqual(true);
    });

    it('isDestroyed', function() {
        expect(camera.isDestroyed()).toEqual(false);
        camera.destroy();
        expect(camera.isDestroyed()).toEqual(true);
    });

});
