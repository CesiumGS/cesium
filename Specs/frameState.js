/*global define*/
define([
        'Core/Ellipsoid',
        'Core/EquidistantCylindricalProjection',
        'Scene/Camera',
        'Scene/SceneMode',
        'Scene/FrameState'
    ], function(
        Ellipsoid,
        EquidistantCylindricalProjection,
        Camera,
        SceneMode,
        FrameState) {
    "use strict";

    // Mock frame-state for testing.
    var frameState = new FrameState();

    frameState.mode = SceneMode.SCENE3D;
    frameState.scene2D = {
        projection : new EquidistantCylindricalProjection(Ellipsoid.WGS84)
    };

    frameState.camera = new Camera({
        clientHeight : 1,
        clientWidth : 1
    });

    return frameState;
});