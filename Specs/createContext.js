/*global define*/
define([
        'Core/clone',
        'Core/defaultValue',
        'Renderer/Context',
        'Specs/createCanvas'
    ], function(
        clone,
        defaultValue,
        Context,
        createCanvas) {
    "use strict";

    function createContext(options) {
        // clone options so we can change properties
        options = clone(defaultValue(options, {}));
        options.alpha = defaultValue(options.alpha, true);

        var canvas = createCanvas();
        var context = new Context(canvas, options);
        context.setValidateShaderProgram(true);
        context.setValidateFramebuffer(true);
        context.setLogShaderCompilation(true);
        context.setThrowOnWebGLError(true);
        return context;
    }

    return createContext;
});