/*global define*/
define(['Renderer/Context'], function(Context) {
    "use strict";

    function createContext() {
        var canvas = document.createElement('canvas');
        canvas.id = 'glCanvas';
        canvas.setAttribute('width', '1');
        canvas.setAttribute('clientWidth', '1');
        canvas.setAttribute('height', '1');
        canvas.setAttribute('clientHeight', '1');
        canvas.innerHTML = 'To view this web page, upgrade your browser; it does not support the HTML5 canvas element.';
        document.body.appendChild(canvas);

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