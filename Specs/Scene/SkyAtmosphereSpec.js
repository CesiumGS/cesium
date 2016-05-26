/*global defineSuite*/
defineSuite([
        'Scene/SkyAtmosphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Ellipsoid',
        'Renderer/ClearCommand',
        'Scene/SceneMode',
        'Specs/createScene'
    ], function(
        SkyAtmosphere,
        Cartesian3,
        Color,
        Ellipsoid,
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
        var s = new SkyAtmosphere({ellipsoid: Ellipsoid.UNIT_SPHERE});
        expect(s.ellipsoid).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    it('gets color', function() {
        var s = new SkyAtmosphere({color: new Color(10,0,0)});
        expect(s.color).toEqual(new Color(10,0,0));
    });

    it('isDestroyed', function() {
        var s = new SkyAtmosphere();
        expect(s.isDestroyed()).toEqual(false);
        s.destroy();
        expect(s.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
