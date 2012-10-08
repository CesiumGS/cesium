/*global define*/
define([
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Scene/Camera',
        'Scene/SceneMode',
        'Scene/FrameState'
    ], function(
        Ellipsoid,
        GeographicProjection,
        Camera,
        SceneMode,
        FrameState) {
    "use strict";

    var createFrameState = function() {
        // Mock frame-state for testing.
        var frameState = new FrameState();

        frameState.mode = SceneMode.SCENE3D;
        frameState.scene2D = {
            projection : new GeographicProjection(Ellipsoid.WGS84)
        };

        var camera = new Camera({
            clientHeight : 1,
            clientWidth : 1
        });
        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        frameState.passes.color = true;
        frameState.passes.pick = false;

        return frameState;
    };

    return createFrameState;
});