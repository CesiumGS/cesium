/*global define*/
define([
        'Core/Ellipsoid',
        'Core/EquidistantCylindricalProjection',
        'Scene/Camera',
        'Scene/SceneMode',
        'Scene/SceneState'
    ], function(
        Ellipsoid,
        EquidistantCylindricalProjection,
        Camera,
        SceneMode,
        SceneState) {
    "use strict";

    // Mock scene-state for testing.
    var sceneState = new SceneState();

    sceneState.mode = SceneMode.SCENE3D;
    sceneState.scene2D = {
        projection : new EquidistantCylindricalProjection(Ellipsoid.WGS84)
    };

    sceneState.camera = new Camera({
        clientHeight : 1,
        clientWidth : 1
    });

    return sceneState;
});