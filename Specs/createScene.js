/*global define*/
define([
        'Core/Cartesian2',
        'Core/clone',
        'Core/defaultValue',
        'Core/defined',
        'Core/defineProperties',
        'Scene/Scene',
        'Specs/createCanvas',
        'Specs/destroyCanvas'
    ], function(
        Cartesian2,
        clone,
        defaultValue,
        defined,
        defineProperties,
        Scene,
        createCanvas,
        destroyCanvas) {
    'use strict';

// TODO: ass in stub context from Spec directory so it's not included in release builds
// TODO: use custom matcher
// TODO: test with WebGL 2 now or later?
// TODO: update https://github.com/AnalyticalGraphicsInc/cesium/tree/master/Documentation/Contributors/TestingGuide with when/why to use these
//    * index.html and command line:  npm run test-webgl-stub

    function createScene(options) {
        options = defaultValue(options, {});

        // save the canvas so we don't try to clone an HTMLCanvasElement
        var canvas = defined(options.canvas) ? options.canvas : createCanvas();
        options.canvas = undefined;

        options = clone(options, true);

        options.canvas = canvas;
        options.contextOptions = defaultValue(options.contextOptions, {});

        var webglStub = !!window.webglStub;

        var contextOptions = options.contextOptions;
        contextOptions.webgl = defaultValue(contextOptions.webgl, {});
        contextOptions.webgl.antialias = defaultValue(contextOptions.webgl.antialias, false);
        contextOptions.webglStub = webglStub;

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

        scene.pickForSpecs = function() {
            return this.pick(new Cartesian2(0, 0));
        };

        scene.expectRender = function(time) {
            scene.initializeFrame();
            scene.render(time);
            return new ExpectRenderStub(scene.context.readPixels(), webglStub);
        };

        scene.expectPick = function(callback) {
            var result = this.pick(new Cartesian2(0, 0));
            return new ExpectPickStub(result, webglStub)
        };

        scene.rethrowRenderErrors = defaultValue(options.rethrowRenderErrors, true);

        return scene;
    }

    ///////////////////////////////////////////////////////////////////////////

    function ExpectRenderStub(actualRgba, skipExpectation) {
        this._actualRgba = actualRgba;
        this._skipExpectation = skipExpectation;
        this._not = undefined;
    }

    defineProperties(ExpectRenderStub.prototype, {
        not : {
            get : function() {
                if (!defined(this._not)) {
                    this._not = new NotExpectRenderStub(this._actualRgba, this._skipExpectation);
                }

                return this._not;
            }
        }
    });

    ExpectRenderStub.prototype.toEqual = function(expectedRgba) {
        expectRenderForSpecs(this._actualRgba, expectedRgba, true, this._skipExpectation);
    };

    ExpectRenderStub.prototype.toCall = function(expectationCallback) {
        expectRenderForSpecs(this._actualRgba, expectationCallback, true, this._skipExpectation);
    };

    function NotExpectRenderStub(actualRgba, skipExpectation) {
        this._actualRgba = actualRgba;
        this._skipExpectation = skipExpectation;
    }

    NotExpectRenderStub.prototype.toEqual = function(rgba) {
        expectRenderForSpecs(this._actualRgba, rgba, false, this._skipExpectation);
    };

    function expectRenderForSpecs(actualRgba, expectationCallbackOrExpectedRgba, expectEqual, skipExpectation) {
        // When the WebGL stub is used, all WebGL function calls are noops so
        // the expectation is not verified.  This allows running all the WebGL
        // tests, to exercise as much Cesium code as possible, even if the system
        // doesn't have a WebGL implementation or a reliable one.
        if (!skipExpectation) {
            // Most tests want to compare the rendered rgba to a known rgba, but some
            // only want to compare some rgba components or use a more complicated
            // expectation.  These cases are handled with a callback.
            if (expectationCallbackOrExpectedRgba instanceof Function) {
                return expectationCallbackOrExpectedRgba(actualRgba);
            }

            if (expectEqual) {
                expect(actualRgba).toEqual(expectationCallbackOrExpectedRgba);
            } else {
                expect(actualRgba).not.toEqual(expectationCallbackOrExpectedRgba);
            }
        } else {
            // To avoid Jasmine's spec has no expectations error
            expect(true).toEqual(true);
        }

        return undefined;
    }

    function ExpectPickStub(result, skipExpectation) {
        this._result = result;
        this._skipExpectation = skipExpectation;
    }

    ExpectPickStub.prototype.toCall = function(callback) {
        if (!this._skipExpectation) {
            return callback(this._result);
        }

        // To avoid Jasmine's spec has no expectations error
        expect(true).toEqual(true);

        return undefined;
    };

    ///////////////////////////////////////////////////////////////////////////

    return createScene;
});
