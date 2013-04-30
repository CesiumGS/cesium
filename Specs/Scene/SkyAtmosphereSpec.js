/*global defineSuite*/
defineSuite([
         'Scene/SkyAtmosphere',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Renderer/ClearCommand',
         'Scene/SceneMode'
     ], function(
         SkyAtmosphere,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         Cartesian3,
         Ellipsoid,
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

    it('draws sky with camera in atmosphere', function() {
        var s = new SkyAtmosphere();

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var us = context.getUniformState();
        var radii = Ellipsoid.WGS84.getRadii();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(radii.x * 0.1, 0.0, radii.z * 1.005), new Cartesian3(0.0, 0.0, radii.z * 1.005), Cartesian3.UNIT_Z, 1.0, 20000000.0));
        us.update(frameState);

        var command = s.update(context, frameState);
        expect(command).toBeDefined();
        command.execute(context); // Not reliable enough across browsers to test pixels

        s.destroy();
    });

    it('draws sky with camera in space', function() {
        var s = new SkyAtmosphere();

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var us = context.getUniformState();
        var radii = Ellipsoid.WGS84.getRadii();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(radii.x * 0.5, 0.0, radii.z * 1.005), new Cartesian3(0.0, 0.0, radii.z * 1.005), Cartesian3.UNIT_Z, 1.0, 20000000.0));
        us.update(frameState);

        var command = s.update(context, frameState);
        expect(command).toBeDefined();
        command.execute(context); // Not reliable enough across browsers to test pixels

        s.destroy();
    });

    it('does not render when show is false', function() {
        var s = new SkyAtmosphere();
        s.show = false;

        var us = context.getUniformState();
        var radii = Ellipsoid.WGS84.getRadii();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(radii.x * 0.1, 0.0, radii.z * 1.005), new Cartesian3(0.0, 0.0, radii.z * 1.005), Cartesian3.UNIT_Z, 1.0, 20000000.0));
        us.update(frameState);

        var command = s.update(context, frameState);
        expect(command).not.toBeDefined();
    });

    it('does not render in 2D', function() {
        var s = new SkyAtmosphere();

        var us = context.getUniformState();
        var radii = Ellipsoid.WGS84.getRadii();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(radii.x * 0.1, 0.0, radii.z * 1.005), new Cartesian3(0.0, 0.0, radii.z * 1.005), Cartesian3.UNIT_Z, 1.0, 20000000.0));
        frameState.mode = SceneMode.SCENE2D;
        us.update(frameState);

        var command = s.update(context, frameState);
        expect(command).not.toBeDefined();
    });

    it('does not render without a color pass', function() {
        var s = new SkyAtmosphere();

        var us = context.getUniformState();
        var radii = Ellipsoid.WGS84.getRadii();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(radii.x * 0.1, 0.0, radii.z * 1.005), new Cartesian3(0.0, 0.0, radii.z * 1.005), Cartesian3.UNIT_Z, 1.0, 20000000.0));
        frameState.passes.color = false;
        us.update(frameState);

        var command = s.update(context, frameState);
        expect(command).not.toBeDefined();
    });

    it('gets ellipsoid', function() {
        var s = new SkyAtmosphere(Ellipsoid.UNIT_SPHERE);
        expect(s.getEllipsoid()).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    it('isDestroyed', function() {
        var s = new SkyAtmosphere();
        expect(s.isDestroyed()).toEqual(false);
        s.destroy();
        expect(s.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
