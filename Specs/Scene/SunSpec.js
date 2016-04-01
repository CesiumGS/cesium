/*global defineSuite*/
defineSuite([
        'Scene/Sun',
        'Core/Cartesian3',
        'Core/Math',
        'Core/Matrix4',
        'Scene/SceneMode',
        'Specs/createScene'
    ], function(
        Sun,
        Cartesian3,
        CesiumMath,
        Matrix4,
        SceneMode,
        createScene) {
    'use strict';

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.mode = SceneMode.SCENE3D;
    });

    afterEach(function() {
        scene.sun = undefined;
    });

    function viewSun(camera, uniformState) {
        var sunPosition = uniformState.sunPositionWC;
        camera.lookAt(sunPosition, Cartesian3.multiplyByScalar(Cartesian3.normalize(sunPosition, new Cartesian3()), CesiumMath.SOLAR_RADIUS + 100.0, new Cartesian3()));
    }

    it('draws in 3D', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.sun = new Sun();
        scene.render();

        viewSun(scene.camera, scene.context.uniformState);
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
    });

    it('draws in Columbus view', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.mode = SceneMode.COLUMBUS_VIEW;
        scene.sun = new Sun();
        scene.render();

        viewSun(scene.camera, scene.context.uniformState);
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
    });

    it('does not render when show is false', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.sun = new Sun();
        scene.render();
        scene.sun.show = false;

        viewSun(scene.camera, scene.context.uniformState);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('does not render in 2D', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.mode = SceneMode.SCENE2D;
        scene.sun = new Sun();
        scene.render();

        viewSun(scene.camera, scene.context.uniformState);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('does not render without a render pass', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.frameState.passes.render = false;
        scene.sun = new Sun();
        scene.render();

        viewSun(scene.camera, scene.context.uniformState);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('can set glow factor', function() {
        var sun = scene.sun = new Sun();
        sun.glowFactor = 0.0;
        expect(sun.glowFactor).toEqual(0.0);
        sun.glowFactor = 2.0;
        expect(sun.glowFactor).toEqual(2.0);
    });

    it('draws without lens flare', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.sun = new Sun();
        scene.sun.glowFactor = 0.0;
        scene.renderForSpecs();

        viewSun(scene.camera, scene.context.uniformState);
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
    });

    it('isDestroyed', function() {
        var sun = new Sun();
        expect(sun.isDestroyed()).toEqual(false);
        sun.destroy();
        expect(sun.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
