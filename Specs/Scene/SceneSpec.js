/*global defineSuite*/
defineSuite([
         'Scene/Scene',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/GeographicProjection',
         'Core/Math',
         'Scene/OrthographicFrustum',
         'Scene/SceneMode',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         Scene,
         Cartesian2,
         Cartesian3,
         Ellipsoid,
         GeographicProjection,
         CesiumMath,
         OrthographicFrustum,
         SceneMode,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('get canvas', function() {
        expect(scene.getCanvas()).toBeDefined();
    });

    it('get context', function() {
        expect(scene.getContext()).toBeDefined();
    });

    it('get primitives', function() {
        expect(scene.getPrimitives()).toBeDefined();
    });

    it('get camera', function() {
        expect(scene.getCamera()).toBeDefined();
    });

    it('get uniform state', function() {
        expect(scene.getUniformState()).toBeDefined();
    });

    it('get animations', function() {
        expect(scene.getAnimations()).toBeDefined();
    });

    it('pickEllipsoid throws without a point', function() {
        expect(function() {
            scene.pickEllipsoid();
        }).toThrow();
    });

    it('pick ellipsoid 0', function() {
        var canvas = scene.getCanvas();
        canvas.width = 1024;
        canvas.height = 768;

        scene.mode = SceneMode.SCENE3D;
        var camera = scene.getCamera();
        var ellipsoid = Ellipsoid.WGS84;

        var point = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        var actual = scene.pickEllipsoid(point, ellipsoid);
        var expected = camera.pickEllipsoid(point, ellipsoid);
        expect(actual.equals(expected));
    });

    it('pick ellipsoid 1', function() {
        var canvas = scene.getCanvas();
        canvas.width = 1024;
        canvas.height = 768;

        var ellipsoid = Ellipsoid.WGS84;
        scene.mode = SceneMode.COLUMBUS_VIEW;
        scene.scene2D.projection = new GeographicProjection(ellipsoid);
        var camera = scene.getCamera();

        var point = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        var actual = scene.pickEllipsoid(point, ellipsoid);
        var expected = camera.pickMapColumbusView(point, scene.scene2D.projection);
        expect(actual.equals(expected));
    });

    it('pick ellipsoid 2', function() {
        var canvas = scene.getCanvas();
        canvas.width = 1024;
        canvas.height = 768;

        var camera = scene.getCamera();
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.getMaximumRadius();

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        camera.direction = camera.position.negate().normalize();
        camera.up = Cartesian3.UNIT_Y;

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        scene.mode = SceneMode.SCENE2D;
        scene.scene2D.projection = projection;

        var point = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        var actual = scene.pickEllipsoid(point, ellipsoid);
        var expected = camera.pickMap2D(point, projection);
        expect(actual.equals(expected));
    });

    it('isDestroyed', function() {
        var s = createScene();
        expect(s.isDestroyed()).toEqual(false);
        destroyScene(s);
        expect(s.isDestroyed()).toEqual(true);
    });
});