/*global define*/
define([
        'Core/defaultValue',
        'Core/RuntimeError'
    ], function(
        defaultValue,
        RuntimeError) {
    "use strict";

    function createCanvas(width, height) {
        width = defaultValue(width, 1);
        height = defaultValue(height, 1);

        var canvas = document.createElement('canvas');
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        canvas.innerHTML = 'To view this web page, upgrade your browser; it does not support the HTML5 canvas element.';
        document.body.appendChild(canvas);

        if ((canvas.width !== canvas.clientWidth) || (canvas.height !== canvas.clientHeight)) {
            throw new RuntimeError('Canvas width and height do not match client width and height.  Perhaps the browser is not at 100% zoom?');
        }

        return canvas;
    }

    return createCanvas;
});