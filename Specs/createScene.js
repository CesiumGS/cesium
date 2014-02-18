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
        options.webgl = clone(defaultValue(options.webgl, {}));
        options.webgl.antialias = defaultValue(options.webgl.antialias, false);
        var scene = new Scene(createCanvas(), options);

        // Add functions for test
        scene.renderForSpecs = function(time) {
            scene.initializeFrame();
            scene.render(time);
            return scene.context.readPixels();
        };

        return scene;
    }

    return createScene;
});