/*global defineSuite*/
defineSuite([
         'Scene/Camera2DController',
         'Scene/Camera',
         'Scene/OrthographicFrustum',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/EquidistantCylindricalProjection',
         'Core/MercatorProjection',
         'Core/Math',
         'Core/Transforms'
     ], function(
         Camera2DController,
         Camera,
         OrthographicFrustum,
         Cartesian2,
         Cartesian3,
         Ellipsoid,
         EquidistantCylindricalProjection,
         MercatorProjection,
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
    var projection;
    var controller;
    var controller2;
    var canvas;

    var FakeCanvas = function() {
        this.addEventListener = function() {};
        this.removeEventListener = function() {};

        this.clientWidth = 1024;
        this.clientHeight = 768;
    };

    beforeEach(function() {
        canvas = new FakeCanvas();
        ellipsoid = Ellipsoid.WGS84;

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

        camera = new Camera(canvas);
        camera.position = position;
        camera.up = up;
        camera.direction = dir;
        camera.right = right;
        camera.frustum = frustum;

        projection = new EquidistantCylindricalProjection(ellipsoid);

        controller = new Camera2DController(canvas, camera, projection);
    });

    afterEach(function() {
        controller = controller && !controller.isDestroyed() && controller.destroy();
        controller2 = controller2 && !controller2.isDestroyed() && controller2.destroy();
    });

    it('constructor throws without a canvas', function() {
        expect(function() {
            return new Camera2DController();
        }).toThrow();
    });

    it('constructor throws without a camera', function() {
        expect(function() {
            return new Camera2DController(canvas);
        }).toThrow();
    });

    it('constructor throws without a projection', function() {
        expect(function() {
            return new Camera2DController(canvas, camera);
        }).toThrow();
    });

    it('setProjection throws without a projection', function() {
        expect(function() {
            controller.setProjection();
        }).toThrow();
    });

    it('setProjection', function() {
        var mercator = new MercatorProjection(ellipsoid);
        controller.setProjection(mercator);
        expect(controller.getProjection()).toEqual(mercator);
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
            endPosition : new Cartesian2(1000.0, 1000.0)
        });
        expect(camera.position.equalsEpsilon(new Cartesian3(-3.9, 2.6, 0.0), CesiumMath.EPSILON2)).toEqual(true);
    });

    it('zoom', function() {
        var offset = 0.5 * Math.max(camera.frustum.right - camera.frustum.left, camera.frustum.top - camera.frustum.bottom);
        var ratio = frustum.top / frustum.right;
        controller._zoom({
            startPosition : new Cartesian2(0.0, 0.0),
            endPosition : new Cartesian2(0.0, 1.0)
        });
        expect(frustum.right).toEqualEpsilon(offset, CesiumMath.EPSILON1);
        expect(frustum.left).toEqualEpsilon(-offset, CesiumMath.EPSILON1);
        expect(frustum.top).toEqualEpsilon(ratio * offset, CesiumMath.EPSILON1);
        expect(frustum.bottom).toEqualEpsilon(-ratio * offset, CesiumMath.EPSILON1);
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
        controller2 = new Camera2DController(document, camera, projection);
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