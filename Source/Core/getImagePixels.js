/*global define*/
define(function() {
    "use strict";

    var context2DsByWidthAndHeight = {};

    /**
     * Extract a pixel array from a loaded image.  Draws the image
     * into a canvas so it can read the pixels back.
     *
     * @exports getImagePixels
     *
     * @param {Image} image The image to extract pixels from.
     *
     * @returns {CanvasPixelArray} The pixels of the image.
     */
    var getImagePixels = function(image, width, height) {
        if (typeof width === 'undefined') {
            width = image.width;
        }
        if (typeof height === 'undefined') {
            height = image.height;
        }

        var context2DsByHeight = context2DsByWidthAndHeight[width];
        if (typeof context2DsByHeight === 'undefined') {
            context2DsByHeight = {};
            context2DsByWidthAndHeight[width] = context2DsByHeight;
        }

        var context2d = context2DsByHeight[height];
        if (typeof context2d === 'undefined') {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            context2d = canvas.getContext('2d');
            context2d.globalCompositeOperation = 'copy';
            context2DsByHeight[height] = context2d;
        }

        context2d.drawImage(image, 0, 0, width, height);
        return context2d.getImageData(0, 0, width, height).data;
    };

    return getImagePixels;
});