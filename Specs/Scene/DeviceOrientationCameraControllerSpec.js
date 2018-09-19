defineSuite([
        'Scene/DeviceOrientationCameraController',
        'Core/Cartesian3',
        'Core/Math',
        'Specs/createCamera',
        'Specs/createCanvas',
        'Specs/DomEventSimulator'
    ], function(
        DeviceOrientationCameraController,
        Cartesian3,
        CesiumMath,
        createCamera,
        createCanvas,
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
        document.body.removeChild(canvas);
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

    function fireDeviceOrientationEvent(options) {
        if ('ondeviceorientationabsolute' in window) {
            DomEventSimulator.fireDeviceOrientation(window, options);
        } else {
            DomEventSimulator.fireDeviceOrientationAbsolute(window, options);
        }

        controller.update();
    }

    it('throws without scene', function() {
        expect(function() {
            return new DeviceOrientationCameraController();
        }).toThrowDeveloperError();
    });

    it('Device lying flat on a horizontal surface with the top of the screen pointing North', function() {
        var position = Cartesian3.clone(camera.position);
        fireDeviceOrientationEvent({
            alpha : 0.0,
            beta : 0.0,
            gamma : 0.0,
            absolute : true
        });

        expect(camera.position).toEqual(position);
        expect(camera.heading).toEqual(CesiumMath.toRadians(180.0));
        expect(camera.pitch).toEqual(CesiumMath.toRadians(-90.0));
        expect(camera.roll).toEqual(0.0);
    });

    it('Device lying flat on a horizontal surface with the top of the screen pointing West', function() {
        var position = Cartesian3.clone(camera.position);
        fireDeviceOrientationEvent({
            alpha : 90.0,
            beta : 0.0,
            gamma : 0.0,
            absolute : true
        });

        expect(camera.position).toEqual(position);
        expect(camera.heading).toEqual(CesiumMath.toRadians(90.0));
        expect(camera.pitch).toEqual(CesiumMath.toRadians(-90.0));
        expect(camera.roll).toEqual(0.0);
    });


    it('Device lying flat on a horizontal surface with the top of the screen pointing South', function() {
        var position = Cartesian3.clone(camera.position);
        fireDeviceOrientationEvent({
            alpha : 180.0,
            beta : 0.0,
            gamma : 0.0,
            absolute : true
        });

        expect(camera.position).toEqual(position);
        expect(camera.heading).toEqual(CesiumMath.toRadians(360.0));
        expect(camera.pitch).toEqual(CesiumMath.toRadians(-90.0));
        expect(camera.roll).toEqual(0.0);
    });

    it('Device lying flat on a horizontal surface with the top of the screen pointing East', function() {
        var position = Cartesian3.clone(camera.position);
        fireDeviceOrientationEvent({
            alpha : 270.0,
            beta : 0.0,
            gamma : 0.0,
            absolute : true
        });

        expect(camera.position).toEqual(position);
        expect(camera.heading).toEqual(CesiumMath.toRadians(270.0));
        expect(camera.pitch).toEqual(CesiumMath.toRadians(-90.0));
        expect(camera.roll).toEqual(0.0);
    });

    it('Device in a vertical plane and the top of the screen pointing upwards and backside of device pointing North', function() {
        var position = Cartesian3.clone(camera.position);
        fireDeviceOrientationEvent({
            alpha : 0.0,
            beta : 90.0,
            gamma : 0.0,
            absolute : true
        });

        expect(camera.position).toEqual(position);
        expect(camera.heading).toEqual(CesiumMath.toRadians(180.0));
        expect(camera.pitch).toEqual(0.0);
        expect(camera.roll).toEqual(CesiumMath.toRadians(360.0)); //don't know why Cesium is returning 360° instead of 0° here
    });

    it('Device in a vertical plane and the top of the screen pointing downwards and backside of device pointing North', function() {
        var position = Cartesian3.clone(camera.position);
        fireDeviceOrientationEvent({
            alpha : 0.0,
            beta : -90.0,
            gamma : 0.0,
            absolute : true
        });

        expect(camera.position).toEqual(position);
        expect(camera.heading).toEqual(CesiumMath.toRadians(180.0));
        expect(camera.pitch).toEqual(CesiumMath.toRadians(-180.0));
        expect(camera.roll).toEqual(0.0);
    });

    it('Device lying backward flat on a horizontal surface with the top of the screen pointing North', function() {
        var position = Cartesian3.clone(camera.position);
        fireDeviceOrientationEvent({
            alpha : 0.0,
            beta : -180.0,
            gamma : 0.0,
            absolute : true
        });

        expect(camera.position).toEqual(position);
        expect(camera.heading).toEqual(CesiumMath.toRadians(180.0));
        expect(camera.pitch).toEqual(CesiumMath.toRadians(90.0));
        expect(camera.roll).toEqual(0.0);
    });

    it('is destroyed', function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});
