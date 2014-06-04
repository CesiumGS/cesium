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
        options = clone(defaultValue(options, {}), true);

        options.canvas = defaultValue(options.canvas, createCanvas());
        options.contextOptions = defaultValue(options.contextOptions, {});

        var contextOptions = options.contextOptions;
        contextOptions.webgl = defaultValue(contextOptions.webgl, {});
        contextOptions.webgl.antialias = defaultValue(contextOptions.webgl.antialias, false);

        var scene = new Scene(options);

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