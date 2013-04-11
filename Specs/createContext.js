/*global define*/
define([
        'Renderer/Context',
        'Specs/createCanvas'
    ], function(
        Context,
        createCanvas) {
    "use strict";

    function createContext(options) {
        options = (typeof options !== 'undefined') ? options : {};
        options.alpha = (typeof options.alpha !== 'undefined') ? options.alpha : true;

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