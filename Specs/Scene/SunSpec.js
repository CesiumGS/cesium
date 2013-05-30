/*global defineSuite*/
defineSuite([
         'Scene/Sun',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/createScene',
         'Specs/destroyScene',
         'Core/Cartesian3',
         'Scene/SceneMode'
     ], function(
         Sun,
         createCamera,
         createFrameState,
         createScene,
         destroyScene,
         Cartesian3,
         SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('draws in 3D', function() {
        scene.sun = new Sun();
        scene.initializeFrame();
        scene.render();

        var us = scene.getContext().getUniformState();
        var camera = scene.getCamera();

        var sunPosition = us.getSunPositionWC();
        var cameraPosition = sunPosition.normalize().multiplyByScalar(1e8);
        camera.controller.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        scene.initializeFrame();
        scene.render();
        expect(scene.getContext().readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('draws in Columbus view', function() {
        scene.sun = new Sun();

        scene.mode = SceneMode.COLUMBUS_VIEW;
        scene.initializeFrame();
        scene.render();

        var us = scene.getContext().getUniformState();
        var camera = scene.getCamera();

        var sunPosition = us.getSunPositionColumbusView();
        var cameraPosition = sunPosition.normalize().multiplyByScalar(1e8);
        camera.controller.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        scene.initializeFrame();
        scene.render();
        expect(scene.getContext().readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        var sun = new Sun();
        sun.show = false;

        var context = scene.getContext();

        var frameState = createFrameState(createCamera(context, undefined, undefined, undefined, 1.0, 1.0e10));
        var us = context.getUniformState();
        us.update(frameState);

        var sunPosition = us.getSunPositionWC();
        var cameraPosition = sunPosition.normalize().multiplyByScalar(1e8);
        frameState.camera.controller.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(frameState);

        var command = sun.update(context, frameState);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('does not render in 2D', function() {
        var sun = new Sun();

        var context = scene.getContext();

        var frameState = createFrameState(createCamera(context, undefined, undefined, undefined, 1.0, 1.0e10));
        frameState.mode = SceneMode.SCENE2D;
        var us = context.getUniformState();
        us.update(frameState);

        var sunPosition = us.getSunPositionWC();
        var cameraPosition = sunPosition.normalize().multiplyByScalar(1e8);
        frameState.camera.controller.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(frameState);

        var command = sun.update(context, frameState);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('does not render without a color pass', function() {
        var sun = new Sun();

        var context = scene.getContext();

        var frameState = createFrameState(createCamera(context, undefined, undefined, undefined, 1.0, 1.0e10));
        frameState.passes.color = false;
        var us = context.getUniformState();
        us.update(frameState);

        var sunPosition = us.getSunPositionWC();
        var cameraPosition = sunPosition.normalize().multiplyByScalar(1e8);
        frameState.camera.controller.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(frameState);

        var command = sun.update(context, frameState);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('isDestroyed', function() {
        var sun = new Sun();
        expect(sun.isDestroyed()).toEqual(false);
        sun.destroy();
        expect(sun.isDestroyed()).toEqual(true);
    });
});