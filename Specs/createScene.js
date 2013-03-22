/*global define*/
define([
        'Scene/Scene',
        'Specs/createCanvas'
    ], function(
        Scene,
        createCanvas) {
    "use strict";

    function createScene() {
        return new Scene(createCanvas());
    }

    return createScene;
});