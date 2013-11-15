/*global define*/
define([
        'Core/clone',
        'Core/defaultValue',
        'Scene/Scene',
        'Specs/createCanvas'
    ], function(
        clone,
        defaultValue,
        Scene,
        createCanvas) {
    "use strict";

    function createScene(options) {
        options = clone(defaultValue(options, {}));
        options.antialias = defaultValue(options.antialias, false);
        return new Scene(createCanvas(), options);
    }

    return createScene;
});