/*global defineSuite*/
defineSuite([
        'Scene/SkyAtmosphere',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Renderer/ClearCommand',
        'Scene/SceneMode',
        'Specs/createScene'
    ], function(
        SkyAtmosphere,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        ClearCommand,
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

    it('draws sky with camera in atmosphere', function() {
        var s = new SkyAtmosphere();

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.render();

        var command = s.update(scene.frameState);
        expect(command).toBeDefined();
        command.execute(scene.context); // Not reliable enough across browsers to test pixels

        s.destroy();
    });

    it('draws sky with camera in space', function() {
        var s = new SkyAtmosphere();

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.render();

        var command = s.update(scene.frameState);
        expect(command).toBeDefined();
        command.execute(scene.context); // Not reliable enough across browsers to test pixels

        s.destroy();
    });

    it('draws sky with setDynamicAtmosphereColor set to true', function() {
        var s = new SkyAtmosphere();
        s.setDynamicAtmosphereColor(true);

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.render();

        var command = s.update(scene.frameState);
        expect(command).toBeDefined();
        expect(s._cameraAndRadiiAndDynamicAtmosphereColor.w).toBe(1);
        command.execute(scene.context); // Not reliable enough across browsers to test pixels

        s.destroy();
    });

    it('draws sky with setDynamicAtmosphereColor set to false', function() {
        var s = new SkyAtmosphere();
        s.setDynamicAtmosphereColor(false);

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.render();

        var command = s.update(scene.frameState);
        expect(command).toBeDefined();
        expect(s._cameraAndRadiiAndDynamicAtmosphereColor.w).toBe(0);
        command.execute(scene.context); // Not reliable enough across browsers to test pixels

        s.destroy();
    });

    it('draws sky with color correction active', function() {
        var oldSkyAtmosphere = scene.skyAtmosphere;
        var s = new SkyAtmosphere();

        scene.skyAtmosphere = s;
        scene._environmentState.isReadyForAtmosphere = true;

        scene.camera.setView({
            destination : Cartesian3.fromDegrees(-75.5847, 40.0397, 1000.0),
            orientation: {
                heading : -CesiumMath.PI_OVER_TWO,
                pitch : 0.2,
                roll : 0.0
            }
        });

        var color = scene.renderForSpecs();
        expect(color).not.toEqual([0, 0, 0, 255]);

        // Expect color correction to change the color output.
        s.hueShift = 0.5;
        var hueColor = scene.renderForSpecs();
        expect(hueColor).not.toEqual([0, 0, 0, 255]);
        expect(hueColor).not.toEqual(color);

        scene.skyAtmosphere = oldSkyAtmosphere;
    });

    it('does not render when show is false', function() {
        var s = new SkyAtmosphere();
        s.show = false;

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.render();

        var command = s.update(scene.frameState);
        expect(command).not.toBeDefined();
    });

    it('does not render in 2D', function() {
        var s = new SkyAtmosphere();

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.mode = SceneMode.SCENE2D;
        scene.render();

        var command = s.update(scene.frameState);
        expect(command).not.toBeDefined();
    });

    it('does not render without a color pass', function() {
        var s = new SkyAtmosphere();

        scene.frameState.passes.render = false;

        var command = s.update(scene.frameState);
        expect(command).not.toBeDefined();
    });

    it('gets ellipsoid', function() {
        var s = new SkyAtmosphere(Ellipsoid.UNIT_SPHERE);
        expect(s.ellipsoid).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    it('isDestroyed', function() {
        var s = new SkyAtmosphere();
        expect(s.isDestroyed()).toEqual(false);
        s.destroy();
        expect(s.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
