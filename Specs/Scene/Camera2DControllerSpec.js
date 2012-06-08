/*global defineSuite*/
defineSuite([
         'Scene/Camera2DController',
         'Scene/Camera',
         'Scene/OrthographicFrustum',
         'Core/Cartographic2',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Math',
         'Core/Transforms'
     ], function(
         Camera2DController,
         Camera,
         OrthographicFrustum,
         Cartographic2,
         Cartesian2,
         Cartesian3,
         Ellipsoid,
         CesiumMath,
         Transforms) {
    "use strict";
    /*global document,describe,it,expect,beforeEach,afterEach*/

    var position;
    var up;
    var dir;
    var right;
    var camera;
    var frustum;
    var moverate;
    var zoomrate;
    var ellipsoid;
    var controller;
    var controller2;

    beforeEach(function() {
        ellipsoid = Ellipsoid.WGS84;
        camera = new Camera(document);

        moverate = 3.0;
        zoomrate = 1.0;
        position = new Cartesian3();
        up = Cartesian3.UNIT_Y;
        dir = Cartesian3.UNIT_Z.negate();
        right = dir.cross(up);

        frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;

        camera = new Camera(document);
        camera.position = position;
        camera.up = up;
        camera.direction = dir;
        camera.right = right;
        camera.frustum = frustum;

        controller = new Camera2DController(document, camera, ellipsoid);
    });

    afterEach(function() {
        controller = controller && !controller.isDestroyed() && controller.destroy();
        controller2 = controller2 && !controller2.isDestroyed() && controller2.destroy();
    });

    it('setReferenceFrame', function() {
        var transform = Transforms.eastNorthUpToFixedFrame(ellipsoid.cartographicDegreesToCartesian(new Cartographic2(-75.0, 40.0)));
        controller.setReferenceFrame(transform, ellipsoid);
        expect(controller.getEllipsoid()).toBe(ellipsoid);
        expect(controller._camera.transform).toBe(transform);
    });

    it('setEllipsoid', function() {
        controller.setEllipsoid(Ellipsoid.UNIT_SPHERE);
        expect(controller.getEllipsoid().equals(Ellipsoid.UNIT_SPHERE)).toEqual(true);
    });

    it('moveUp', function() {
        controller.moveUp(moverate);
        expect(camera.position.equalsEpsilon(new Cartesian3(0.0, moverate, 0.0), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('moveDown', function() {
        controller.moveDown(moverate);
        expect(camera.position.equalsEpsilon(new Cartesian3(0.0, -moverate, 0.0), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('moveRight', function() {
        controller.moveRight(moverate);
        expect(camera.position.equalsEpsilon(new Cartesian3(moverate, 0.0, 0.0), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('moveLeft', function() {
        controller.moveLeft(moverate);
        expect(camera.position.equalsEpsilon(new Cartesian3(-moverate, 0.0, 0.0), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('translate', function() {
        controller._translate({
            startPosition : new Cartesian2(0.0, 0.0),
            endPosition : new Cartesian2(10.0, 10.0)
        });
        expect(camera.position.equalsEpsilon(new Cartesian3(100000.0, 100000.0, 0.0))).toEqual(true);
    });

    it('zoom', function() {
        var offset = 0.5 * Math.max(camera.frustum.right - camera.frustum.left, camera.frustum.top - camera.frustum.bottom);
        var ratio = frustum.top / frustum.right;
        controller._zoom({
            startPosition : new Cartesian2(0.0, 0.0),
            endPosition : new Cartesian2(0.0, 1.0)
        });
        expect(frustum.right).toEqualEpsilon(controller._zoomRate + offset, CesiumMath.EPSILON10);
        expect(frustum.left).toEqual(-(controller._zoomRate + offset), CesiumMath.EPSILON10);
        expect(frustum.top).toEqual(ratio * (controller._zoomRate + offset), CesiumMath.EPSILON10);
        expect(frustum.bottom).toEqual(-ratio * (controller._zoomRate + offset), CesiumMath.EPSILON10);
    });

    it('zoomOut', function() {
        controller.zoomOut(zoomrate);
        expect(frustum.right).toEqualEpsilon(3.0, CesiumMath.EPSILON10);
        expect(frustum.left).toEqual(-3.0, CesiumMath.EPSILON10);
        expect(frustum.top).toEqual(1.5, CesiumMath.EPSILON10);
        expect(frustum.bottom).toEqual(-1.5, CesiumMath.EPSILON10);
    });

    it('zoomIn', function() {
        controller.zoomIn(zoomrate);
        expect(frustum.right).toEqualEpsilon(1.0, CesiumMath.EPSILON10);
        expect(frustum.left).toEqual(-1.0, CesiumMath.EPSILON10);
        expect(frustum.top).toEqual(0.5, CesiumMath.EPSILON10);
        expect(frustum.bottom).toEqual(-0.5, CesiumMath.EPSILON10);
    });

    it('zoomIn throws with null OrthogrphicFrustum properties', function() {
        var camera = new Camera(document);
        camera.frustum = new OrthographicFrustum();
        controller2 = new Camera2DController(document, camera, ellipsoid);
        expect(function () {
            controller2.zoomIn(moverate);
        }).toThrow();
    });

    it('isDestroyed', function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});