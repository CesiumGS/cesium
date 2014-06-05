/*global defineSuite*/
defineSuite([
        'Scene/Sun',
        'Core/Cartesian3',
        'Scene/SceneMode',
        'Specs/createCamera',
        'Specs/createFrameState',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        Sun,
        Cartesian3,
        SceneMode,
        createCamera,
        createFrameState,
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

    it('draws in 3D', function() {
        scene.sun = new Sun();
        scene.initializeFrame();
        scene.render();

        var us = scene.context.uniformState;
        var camera = scene.camera;

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition, new Cartesian3()), 1e8, new Cartesian3());
        camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        scene.initializeFrame();
        scene.render();
        expect(scene.context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('draws in Columbus view', function() {
        scene.sun = new Sun();

        scene.mode = SceneMode.COLUMBUS_VIEW;
        scene.initializeFrame();
        scene.render();

        var us = scene.context.uniformState;
        var camera = scene.camera;

        var sunPosition = us.sunPositionColumbusView;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition, new Cartesian3()), 1e8, new Cartesian3());
        camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        scene.initializeFrame();
        scene.render();
        expect(scene.context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        var sun = new Sun();
        sun.show = false;

        var frameState = createFrameState(createCamera({
            near : 1.0,
            far : 1.0e10
        }));
        var context = scene.context;
        var us = context.uniformState;
        us.update(context, frameState);

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition, new Cartesian3()), 1e8, new Cartesian3());
        frameState.camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(context, frameState);

        var command = sun.update(context, frameState);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('does not render in 2D', function() {
        var sun = new Sun();

        var frameState = createFrameState(createCamera({
            near : 1.0,
            far : 1.0e10
        }));
        frameState.mode = SceneMode.SCENE2D;
        var context = scene.context;
        var us = context.uniformState;
        us.update(context, frameState);

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition, new Cartesian3()), 1e8, new Cartesian3());
        frameState.camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        us.update(context, frameState);
        scene._frameState = frameState;
        var command = sun.update(scene);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('does not render without a render pass', function() {
        var sun = new Sun();

        var frameState = createFrameState(createCamera({
            near : 1.0,
            far : 1.0e10
        }));
        frameState.passes.render = false;
        var context = scene.context;
        var us = context.uniformState;
        us.update(context, frameState);

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition, new Cartesian3()), 1e8, new Cartesian3());
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

        var us = scene.context.uniformState;
        var camera = scene.camera;

        var sunPosition = us.sunPositionWC;
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition, new Cartesian3()), 1e8, new Cartesian3());
        camera.lookAt(sunPosition, cameraPosition, Cartesian3.UNIT_Z);

        scene.initializeFrame();
        scene.render();
        expect(scene.context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('isDestroyed', function() {
        var sun = new Sun();
        expect(sun.isDestroyed()).toEqual(false);
        sun.destroy();
        expect(sun.isDestroyed()).toEqual(true);
    });
}, 'WebGL');