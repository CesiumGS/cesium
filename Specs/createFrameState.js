/*global define*/
define([
        'Core/defaultValue',
        'Core/GeographicProjection',
        'Core/JulianDate',
        'Scene/Camera',
        'Scene/CreditDisplay',
        'Scene/FrameState'
    ], function(
        defaultValue,
        GeographicProjection,
        JulianDate,
        Camera,
        CreditDisplay,
        FrameState) {
    "use strict";

    var createFrameState = function(context, camera, frameNumber, time) {
        // Mock frame-state for testing.
        var frameState = new FrameState(context, new CreditDisplay(document.createElement('div')));

        var projection = new GeographicProjection();
        frameState.mapProjection = projection;
        frameState.frameNumber = defaultValue(frameNumber, 1.0);
        frameState.time = defaultValue(time, JulianDate.fromDate(new Date('January 1, 2011 12:00:00 EST')));

        camera = defaultValue(camera, new Camera({
            drawingBufferWidth : 1,
            drawingBufferHeight : 1,
            mapProjection : projection
        }));
        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        frameState.passes.render = true;
        frameState.passes.pick = false;

        return frameState;
    };

    return createFrameState;
});