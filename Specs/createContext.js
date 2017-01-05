/*global define*/
define([
        'Core/clone',
        'Core/defaultValue',
        'Renderer/Context',
        'Specs/createCanvas',
        'Specs/createFrameState',
        'Specs/getWebGLStub'
    ], function(
        clone,
        defaultValue,
        Context,
        createCanvas,
        createFrameState,
        getWebGLStub) {
    'use strict';

    function createContext(options, canvasWidth, canvasHeight) {
        // clone options so we can change properties
        options = clone(defaultValue(options, {}));
        options.webgl = clone(defaultValue(options.webgl, {}));
        options.webgl.antialias = defaultValue(options.webgl.antialias, false);
        if (!!window.webglStub) {
            options.getWebGLStub = getWebGLStub;
        }

        var canvas = createCanvas(canvasWidth, canvasHeight);
        var context = new Context(canvas, options);

        if (!!window.webglValidation) {
            context.validateShaderProgram = true;
            context.validateFramebuffer = true;
            context.logShaderCompilation = true;
            context.throwOnWebGLError = true;
        }

        var us = context.uniformState;
        us.update(createFrameState(context));

        // Add function for test
        context.destroyForSpecs = function() {
            document.body.removeChild(context.canvas);
            return context.destroy();
        };

        return context;
    }

    return createContext;
});
