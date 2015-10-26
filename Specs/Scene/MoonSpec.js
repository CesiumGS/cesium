/*global defineSuite*/
defineSuite([
        'Scene/Moon',
        'Core/Cartesian3',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Simon1994PlanetaryPositions',
        'Core/Transforms',
        'Specs/createCamera',
        'Specs/createFrameState',
        'Specs/createScene'
    ], function(
        Moon,
        Cartesian3,
        defined,
        Ellipsoid,
        Matrix3,
        Matrix4,
        Simon1994PlanetaryPositions,
        Transforms,
        createCamera,
        createFrameState,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function lookAtMoon(camera, date) {
        var icrfToFixed = new Matrix3();
        if (!defined(Transforms.computeIcrfToFixedMatrix(date, icrfToFixed))) {
            Transforms.computeTemeToPseudoFixedMatrix(date, icrfToFixed);
        }

        var moonPosition = Simon1994PlanetaryPositions.computeMoonPositionInEarthInertialFrame(date);
        Matrix3.multiplyByVector(icrfToFixed, moonPosition, moonPosition);

        var radius = Ellipsoid.MOON.maximumRadius;
        var offset = Cartesian3.multiplyByScalar(Cartesian3.normalize(moonPosition, new Cartesian3()), radius + 100.0, new Cartesian3());

        camera.lookAt(moonPosition, offset);
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
        scene.renderForSpecs();

        var date = scene.frameState.time;
        var camera = scene.camera;
        lookAtMoon(camera, date);

        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        var moon = new Moon();
        moon.show = false;

        var context = scene.context;
        var frameState = createFrameState(context, createCamera({
            near : 1.0,
            far : 1.0e10
        }));
        var us = context.uniformState;
        us.update(frameState);

        lookAtMoon(scene.camera, frameState.time);

        us.update(frameState);

        moon.update(frameState);
        expect(frameState.commandList.length).toEqual(0);

        moon.destroy();
    });

    it('isDestroyed', function() {
        var moon = new Moon();
        expect(moon.isDestroyed()).toEqual(false);
        moon.destroy();
        expect(moon.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
