/*global define*/
define([
        'Scene/Scene',
        'Specs/createCanvas'
    ], function(
        Scene,
        createCanvas) {
    "use strict";

    function createScene(options) {
        return new Scene(createCanvas(), options);
    }

    return createScene;
});