/*global defineSuite*/
defineSuite([
        'Scene/DeviceOrientationCameraController',
        'Core/Cartesian3',
        'Core/Math',
        'Specs/createCamera',
        'Specs/createCanvas',
        'Specs/destroyCanvas',
        'Specs/DomEventSimulator'
    ], function(
        DeviceOrientationCameraController,
        Cartesian3,
        CesiumMath,
        createCamera,
        createCanvas,
        destroyCanvas,
        DomEventSimulator) {
    'use strict';

    var scene;
    var canvas;
    var camera;
    var controller;

    function MockScene(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;
    }

    beforeAll(function() {
        canvas = createCanvas();
    });

    afterAll(function() {
        destroyCanvas(canvas);
    });

    beforeEach(function() {
        camera = createCamera({
            canvas : canvas,
            offset : new Cartesian3(-1.0, 0.0, 0.0)
        });
        scene = new MockScene(canvas, camera);
        controller = new DeviceOrientationCameraController(scene);
    });

    afterEach(function() {
        controller = controller && !controller.isDestroyed() && controller.destroy();
    });

    function fireEvent(options) {
        // set default orientation
        DomEventSimulator.fireDeviceOrientation(window);
        controller.update();
        // update delta orientation
        DomEventSimulator.fireDeviceOrientation(window, options);
        controller.update();
    }

    it('throws without scene', function() {
        expect(function() {
            return new DeviceOrientationCameraController();
        }).toThrowDeveloperError();
    });

    it('rotates for alpha', function() {
        var position = Cartesian3.clone(camera.position);
        var up = Cartesian3.clone(camera.up);

        fireEvent({
            alpha : 90.0
        });

        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON14);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON14);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON14);
    });

    it('rotates for beta', function() {
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);

        fireEvent({
            beta : 90.0
        });

        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON14);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON14);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON14);
    });

    it('rotates for gamma', function() {
        var position = Cartesian3.clone(camera.position);
        var right = Cartesian3.clone(camera.right);

        fireEvent({
            gamma : 90.0
        });

        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON14);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON14);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON14);
    });

    it('is destroyed', function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});