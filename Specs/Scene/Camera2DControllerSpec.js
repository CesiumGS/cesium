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
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var position;
    var up;
    var dir;
    var right;
    var camera;
    var frustum;
    var ellipsoid;
    var projection;
    var controller;
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

    it('translate', function() {
        controller._translate({
            startPosition : new Cartesian2(0.0, 0.0),
            endPosition : new Cartesian2(1000.0, 1000.0)
        });
        expect(camera.position.equalsEpsilon(new Cartesian3(-3.9, 2.6, 0.0), CesiumMath.EPSILON2)).toEqual(true);
    });

    it('isDestroyed', function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});