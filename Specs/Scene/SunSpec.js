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

        var us = scene._context.uniformState;
        var camera = scene.camera;

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition), 1e8);
        camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        scene.initializeFrame();
        scene.render();
        expect(scene._context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('draws in Columbus view', function() {
        scene.sun = new Sun();

        scene.mode = SceneMode.COLUMBUS_VIEW;
        scene.initializeFrame();
        scene.render();

        var us = scene._context.uniformState;
        var camera = scene.camera;

        var sunPosition = us.sunPositionColumbusView;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition), 1e8);
        camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        scene.initializeFrame();
        scene.render();
        expect(scene._context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        var sun = new Sun();
        sun.show = false;

        var context = scene._context;

        var frameState = createFrameState(createCamera(context, undefined, undefined, undefined, 1.0, 1.0e10));
        var us = context.uniformState;
        us.update(context, frameState);

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition), 1e8);
        frameState.camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(context, frameState);

        var command = sun.update(context, frameState);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('does not render in 2D', function() {
        var sun = new Sun();

        var context = scene._context;

        var frameState = createFrameState(createCamera(context, undefined, undefined, undefined, 1.0, 1.0e10));
        frameState.mode = SceneMode.SCENE2D;
        var us = context.uniformState;
        us.update(context, frameState);

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition), 1e8);
        frameState.camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(context, frameState);
        scene._frameState = frameState;
        var command = sun.update(scene);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('does not render without a render pass', function() {
        var sun = new Sun();

        var context = scene._context;

        var frameState = createFrameState(createCamera(context, undefined, undefined, undefined, 1.0, 1.0e10));
        frameState.passes.render = false;
        var us = context.uniformState;
        us.update(context, frameState);

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition), 1e8);
        frameState.camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(context, frameState);
        scene._frameState = frameState;
        var command = sun.update(scene);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('can set glow factor', function() {
        var sun = scene.sun = new Sun();
        sun.glowFactor = 0.0;
        expect(sun.glowFactor).toEqual(0.0);
        sun.glowFactor = 2.0;
        expect(sun.glowFactor).toEqual(2.0);
    });

    it('draws without lens flare', function() {
        scene.sun = new Sun();
        scene.sun.glowFactor = 0.0;
        scene.initializeFrame();
        scene.render();

        var us = scene._context.uniformState;
        var camera = scene.camera;

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition), 1e8);
        camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        scene.initializeFrame();
        scene.render();
        expect(scene._context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('isDestroyed', function() {
        var sun = new Sun();
        expect(sun.isDestroyed()).toEqual(false);
        sun.destroy();
        expect(sun.isDestroyed()).toEqual(true);
    });
}, 'WebGL');