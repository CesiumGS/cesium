/*global define*/
define([
        'Renderer/Context',
        'Specs/createCanvas'
    ], function(
        Context,
        createCanvas) {
    "use strict";

    function createContext() {
        var canvas = createCanvas();
        var context = new Context(canvas, {
            alpha : true
        });
        context.setValidateShaderProgram(true);
        context.setValidateFramebuffer(true);
        context.setLogShaderCompilation(true);
        context.setThrowOnWebGLError(true);
        return context;
    }

    return createContext;
});