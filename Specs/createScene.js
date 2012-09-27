/*global define*/
define([
        'Scene/Scene',
        'Specs/createCanvas'
    ], function(
        Scene,
        createCanvas) {
    "use strict";

    function createScene() {
        var canvas = createCanvas();
        var scene = new Scene(canvas);
        return scene;
    }

    return createScene;
});