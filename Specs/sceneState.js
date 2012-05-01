/*global define*/
define([
        'Core/Ellipsoid',
        'Core/EquidistantCylindricalProjection',
        'Scene/SceneMode'
    ], function(
        Ellipsoid,
        EquidistantCylindricalProjection,
        SceneMode) {
    "use strict";

    // Mock scene-state for testing.
    var sceneState = {
        mode : SceneMode.SCENE3D,
        scene2D : {
            projection : new EquidistantCylindricalProjection(Ellipsoid.getWgs84())
        }
    };

    return sceneState;
});