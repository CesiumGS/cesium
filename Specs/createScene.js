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

// TODO: expectRenderForSpecs that passes in time for ModelSpec.js and maybe others
// TODO: expectRenderForSpecs for picking
// TODO: update https://github.com/AnalyticalGraphicsInc/cesium/tree/master/Documentation/Contributors/TestingGuide with when/why to use these

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

        scene.expectRenderForSpecs = function(expectationCallbackOrExpectedRgba) {
            this.initializeFrame();
            this.render();
            var rgba = this.context.readPixels();

            // Most tests want to compare the rendered rgba to a known rgba, but some
            // only want to compare some rgba components or use a more complicated
            // expectation.  These cases are handled with a callback.
            if (expectationCallbackOrExpectedRgba instanceof Function) {
                return expectationCallbackOrExpectedRgba(rgba);
            }

            expect(rgba).toEqual(expectationCallbackOrExpectedRgba);
            return undefined;
        };

        scene.renderForSpecs = function(time) {
            this.initializeFrame();
            this.render(time);
            return this.context.readPixels();
        };

        scene.pickForSpecs = function() {
            return this.pick(new Cartesian2(0, 0));
        };

        scene.rethrowRenderErrors = defaultValue(options.rethrowRenderErrors, true);

        return scene;
    }

    return createScene;
});
