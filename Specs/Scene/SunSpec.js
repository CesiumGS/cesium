/*global defineSuite*/
defineSuite([
         'Scene/Sun',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Core/Cartesian3',
         'Renderer/ClearCommand',
         'Scene/SceneMode'
     ], function(
         Sun,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         Cartesian3,
         ClearCommand,
         SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('draws in 3D', function() {
        var sun = new Sun();

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var frameState = createFrameState(createCamera(context, undefined, undefined, undefined, 1.0, 1.0e10));
        var us = context.getUniformState();
        us.update(frameState);

        var sunPosition = us.getSunPositionWC();
        var cameraPosition = sunPosition.normalize().multiplyByScalar(1e8);
        frameState.camera.controller.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(frameState);

        var command = sun.update(context, frameState);
        expect(command).toBeDefined();
        command.execute(context);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        sun.destroy();
    });

    it('draws in Columbus view', function() {
        var sun = new Sun();

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var frameState = createFrameState(createCamera(context, undefined, undefined, undefined, 1.0, 1.0e10));
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var us = context.getUniformState();
        us.update(frameState);

        var sunPosition = us.getSunPosition2D();
        var cameraPosition = sunPosition.normalize().multiplyByScalar(1e8);
        frameState.camera.controller.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(frameState);

        var command = sun.update(context, frameState);
        expect(command).toBeDefined();
        command.execute(context);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        sun.destroy();
    });

    it('does not render when show is false', function() {
        var sun = new Sun();
        sun.show = false;

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