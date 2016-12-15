/*global define*/
define([
        'Core/Cartesian2',
        'Core/clone',
        'Core/defaultValue',
        'Core/defined',
        'Scene/Scene',
        'Specs/createCanvas',
        'Specs/destroyCanvas'
    ], function(
        Cartesian2,
        clone,
        defaultValue,
        defined,
        Scene,
        createCanvas,
        destroyCanvas) {
    'use strict';

// TODO: Pass in stub context from Spec directory so it's not included in release builds
// TODO: Search for all calls to renderForSpecs.  Replace original renderForSpecs with version that doesn't readPixels.
// TODO: merge into 3d-tiles branch
// TODO: tech blog post?
// TODO: Test with WebGL 2 now or later?
// TODO: Update https://github.com/AnalyticalGraphicsInc/cesium/tree/master/Documentation/Contributors/TestingGuide with when/why to use these
//    * index.html and command line:  npm run test-webgl-stub

    function createScene(options) {
        options = defaultValue(options, {});

        // save the canvas so we don't try to clone an HTMLCanvasElement
        var canvas = defined(options.canvas) ? options.canvas : createCanvas();
        options.canvas = undefined;

        options = clone(options, true);

        options.canvas = canvas;
        options.contextOptions = defaultValue(options.contextOptions, {});

        var contextOptions = options.contextOptions;
        contextOptions.webgl = defaultValue(contextOptions.webgl, {});
        contextOptions.webgl.antialias = defaultValue(contextOptions.webgl.antialias, false);
        contextOptions.webgl.stencil = defaultValue(contextOptions.webgl.stencil, true);
        contextOptions.webglStub = !!window.webglStub;

        var scene = new Scene(options);

        if (window.webglValidation) {
            var context = scene.context;
            context.validateShaderProgram = true;
            context.validateFramebuffer = true;
            context.logShaderCompilation = true;
            context.throwOnWebGLError = true;
        }

        // Add functions for test
        scene.destroyForSpecs = function() {
            var canvas = this.canvas;
            this.destroy();
            destroyCanvas(canvas);
        };

        scene.renderForSpecs = function(time) {
            this.initializeFrame();
            this.render(time);
            return this.context.readPixels();
        };

        scene.rethrowRenderErrors = defaultValue(options.rethrowRenderErrors, true);

        return scene;
    }

    return createScene;
});
