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
    it('is at rest looking down', function() {
      var position = Cartesian3.clone(camera.position);

      fireEvent({
          alpha : 0,
          gamma: 0,
          beta: 0
      });

      expect(camera.position).toEqual(position);
      expect(camera.direction).toEqualEpsilon(new Cartesian3(0, 0, -1), CesiumMath.EPSILON14);
      expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON14);
      expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON14);
    });

    it('pitch to look north', function() {
      var position = Cartesian3.clone(camera.position);

      fireEvent({
          beta: 90
      });

      expect(camera.position).toEqual(position);
      expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON14);
      expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON14);
      expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON14);
    });

    it('yaw to look east', function() {
      var position = Cartesian3.clone(camera.position);

      fireEvent({
          gamma: -90
      });

      expect(camera.position).toEqual(position);
      expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON14);
      expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON14);
      expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON14);
    });

    it('roll to point east', function() {
      var position = Cartesian3.clone(camera.position);

      fireEvent({
          alpha: -90
      });

      expect(camera.position).toEqual(position);
      expect(camera.direction).toEqualEpsilon(new Cartesian3(0, 0, -1), CesiumMath.EPSILON14);
      expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON14);
      expect(camera.right).toEqualEpsilon(new Cartesian3(0, -1, 0), CesiumMath.EPSILON14);
    });

    it('is destroyed', function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});
