/*global define*/
define([
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/defaultValue',
        'Core/JulianDate',
        'Scene/Camera',
        'Scene/SceneMode',
        'Scene/FrameState'
    ], function(
        Ellipsoid,
        GeographicProjection,
        defaultValue,
        JulianDate,
        Camera,
        SceneMode,
        FrameState) {
    "use strict";

    var createFrameState = function(camera, frameNumber, time) {
        // Mock frame-state for testing.
        var frameState = new FrameState();

        frameState.mode = SceneMode.SCENE3D;
        frameState.morphTime = 1.0;
        frameState.scene2D = {
            projection : new GeographicProjection(Ellipsoid.WGS84)
        };

        frameState.frameNumber = defaultValue(frameNumber, 1.0);
        frameState.time = defaultValue(time, JulianDate.fromDate(new Date('January 1, 2011 12:00:00 EST')));

        camera = defaultValue(camera, new Camera({
            clientHeight : 1,
            clientWidth : 1
        }));
        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);
        frameState.canvasDimensions.x = 1.0;
        frameState.canvasDimensions.y = 1.0;

        frameState.passes.color = true;
        frameState.passes.overlay = true;
        frameState.passes.pick = false;

        return frameState;
    };

    return createFrameState;
});