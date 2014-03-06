/*global defineSuite*/
defineSuite([
         'Scene/Moon',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/createScene',
         'Specs/destroyScene',
         'Core/Cartesian3',
         'Core/defined',
         'Core/Ellipsoid',
         'Core/Matrix3',
         'Core/Simon1994PlanetaryPositions',
         'Core/Transforms',
         'Scene/SceneMode'
     ], function(
         Moon,
         createCamera,
         createFrameState,
         createScene,
         destroyScene,
         Cartesian3,
         defined,
         Ellipsoid,
         Matrix3,
         Simon1994PlanetaryPositions,
         Transforms,
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

    function lookAtMoon(camera, date) {
        var icrfToFixed = new Matrix3();
        if (!defined(Transforms.computeIcrfToFixedMatrix(date, icrfToFixed))) {
            Transforms.computeTemeToPseudoFixedMatrix(date, icrfToFixed);
        }

        var moonPosition = Simon1994PlanetaryPositions.ComputeMoonPositionInEarthInertialFrame(date);
        Matrix3.multiplyByVector(icrfToFixed, moonPosition, moonPosition);
        var cameraPosition = Cartesian3.multiplyByScalar(Cartesian3.normalize(moonPosition), 1e7);

        camera.lookAt(moonPosition, cameraPosition, Cartesian3.UNIT_Z);
    }

    it('default constructs the moon', function() {
        var moon = new Moon();
        expect(moon.show).toEqual(true);
        expect(moon.textureUrl).toContain('Assets/Textures/moonSmall.jpg');
        expect(moon.ellipsoid).toBe(Ellipsoid.MOON);
        expect(moon.onlySunLighting).toEqual(true);
    });

    it('draws in 3D', function() {
        scene.moon = new Moon();
        scene.initializeFrame();
        scene.render();

        var date = scene.frameState.time;
        var camera = scene.camera;
        lookAtMoon(camera, date);

        scene.initializeFrame();
        scene.render();
        expect(scene.context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        var moon = new Moon();
        moon.show = false;

        var context = scene.context;

        var frameState = createFrameState(createCamera(context, undefined, undefined, undefined, 1.0, 1.0e10));
        var us = context.getUniformState();
        us.update(context, frameState);

        lookAtMoon(scene.camera, frameState.time);

        us.update(context, frameState);

        var commandList = [];
        moon.update(context, frameState, commandList);
        expect(commandList.length).toEqual(0);

        moon.destroy();
    });

    it('isDestroyed', function() {
        var moon = new Moon();
        expect(moon.isDestroyed()).toEqual(false);
        moon.destroy();
        expect(moon.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
