/*global define*/
define([
        'Core/defined',
        'Specs/destroyCanvas'
    ], function(
        defined,
        destroyCanvas) {
    "use strict";

    function destroyScene(scene) {
        if (defined(scene) && !scene.isDestroyed()) {
            var canvas = scene.getCanvas();
            scene.destroy();
            destroyCanvas(canvas);
        }
    }

    return destroyScene;
});