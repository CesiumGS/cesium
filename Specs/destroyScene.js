/*global define*/
define([
        'Specs/destroyCanvas'
    ], function(
        destroyCanvas) {
    "use strict";

    function destroyScene(scene) {
        if (scene && !scene.isDestroyed()) {
            var canvas = scene.getCanvas();
            scene = scene && !scene.isDestroyed() && scene.destroy();
            destroyCanvas(canvas);
        }
    }

    return destroyScene;
});