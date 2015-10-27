/*global defineSuite*/
defineSuite([
        'Scene/Sun',
        'Core/Cartesian3',
        'Core/Math',
        'Core/Matrix4',
        'Scene/SceneMode',
        'Specs/createCamera',
        'Specs/createCanvas',
        'Specs/createFrameState',
        'Specs/createScene'
    ], function(
        Sun,
        Cartesian3,
        CesiumMath,
        Matrix4,
        SceneMode,
        createCamera,
        createCanvas,
        createFrameState,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;

    beforeAll(function() {
        scene = createScene({
            canvas : createCanvas({
                width : 5,
                height : 5
            })
        });
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function viewSun(camera, uniformState) {
        var sunPosition = uniformState.sunPositionWC;
        camera.lookAt(sunPosition, Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition, new Cartesian3()), CesiumMath.SOLAR_RADIUS + 100.0, new Cartesian3()));
    }

    it('draws in 3D', function() {
        scene.sun = new Sun();
        scene.renderForSpecs();

        viewSun(scene.camera, scene.context.uniformState);
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 0]);
    });

    it('draws in Columbus view', function() {
        scene.sun = new Sun();

        scene.mode = SceneMode.COLUMBUS_VIEW;
        scene.renderForSpecs();

        viewSun(scene.camera, scene.context.uniformState);
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        var sun = new Sun();
        sun.show = false;

        var context = scene.context;
        var frameState = createFrameState(context, createCamera({
            near : 1.0,
            far : 1.0e10
        }));
        var us = context.uniformState;
        us.update(frameState);
        viewSun(frameState.camera, us);
        us.update(frameState);

        scene._frameState = frameState;
        var command = sun.update(scene);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('does not render in 2D', function() {
        var sun = new Sun();

        var context = scene.context;
        var frameState = createFrameState(context, createCamera({
            near : 1.0,
            far : 1.0e10
        }));
        frameState.mode = SceneMode.SCENE2D;
        var us = context.uniformState;
        us.update(frameState);
        viewSun(frameState.camera, us);
        us.update(frameState);
        scene._frameState = frameState;
        var command = sun.update(scene);
        expect(command).not.toBeDefined();

        sun.destroy();
    });

    it('does not render without a render pass', function() {
        var sun = new Sun();

        var context = scene.context;
        var frameState = createFrameState(context, createCamera({
            near : 1.0,
            far : 1.0e10
        }));
        frameState.passes.render = false;
        var us = context.uniformState;
        us.update(frameState);
        viewSun(frameState.camera, us);
        us.update(frameState);
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
        scene.renderForSpecs();

        viewSun(scene.camera, scene.context.uniformState);
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 0]);
    });

    it('isDestroyed', function() {
        var sun = new Sun();
        expect(sun.isDestroyed()).toEqual(false);
        sun.destroy();
        expect(sun.isDestroyed()).toEqual(true);
    });
}, 'WebGL');