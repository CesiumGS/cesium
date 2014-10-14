/*global define*/
define([
        'Core/clone',
        'Core/defaultValue',
        'Core/defined',
        'Core/queryToObject',
        'Scene/Scene',
        'Specs/createCanvas'
    ], function(
        clone,
        defaultValue,
        defined,
        queryToObject,
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

        var parameters = queryToObject(window.location.search.substring(1));
        if (defined(parameters.webglValidation)) {
            var context = scene.context;
            context.validateShaderProgram = true;
            context.validateFramebuffer = true;
            context.logShaderCompilation = true;
            context.throwOnWebGLError = true;
        }

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