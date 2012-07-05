/*global define*/
define(function() {
    "use strict";

    function createCanvas(width, height) {
        width = (typeof width === 'undefined') ? 1 : width;
        height = (typeof height === 'undefined') ? 1 : height;

        var canvas = document.createElement('canvas');
        canvas.id = 'glCanvas';
        canvas.setAttribute('width', width);
        canvas.setAttribute('clientWidth', width);
        canvas.setAttribute('height', height);
        canvas.setAttribute('clientHeight', height);
        canvas.innerHTML = 'To view this web page, upgrade your browser; it does not support the HTML5 canvas element.';
        document.body.appendChild(canvas);

        return canvas;
    }

    return createCanvas;
});