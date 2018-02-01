define(function() {
    'use strict';

    /**
     * Creates a {@link createBillboardPointCallback~CanvasFunction} that will create a canvas with a point.
     *
     * @param {Number} centerAlpha The alpha of the center of the point. The value must be in the range [0.0, 1.0].
     * @param {String} cssColor The CSS color string.
     * @param {String} cssOutlineColor The CSS color of the point outline.
     * @param {Number} cssOutlineWidth The width of the outline in pixels.
     * @param {Number} pixelSize The size of the point in pixels.
     * @return {createBillboardPointCallback~CanvasFunction} The function that will return a canvas with the point drawn on it.
     *
     * @private
     */
    function createBillboardPointCallback(centerAlpha, cssColor, cssOutlineColor, cssOutlineWidth, pixelSize) {
        return function() {
            var canvas = document.createElement('canvas');

            var length = pixelSize + (2 * cssOutlineWidth);
            canvas.height = canvas.width = length;

            var context2D = canvas.getContext('2d');
            context2D.clearRect(0, 0, length, length);

            if (cssOutlineWidth !== 0) {
                context2D.beginPath();
                context2D.arc(length / 2, length / 2, length / 2, 0, 2 * Math.PI, true);
                context2D.closePath();
                context2D.fillStyle = cssOutlineColor;
                context2D.fill();
                // Punch a hole in the center if needed.
                if (centerAlpha < 1.0) {
                    context2D.save();
                    context2D.globalCompositeOperation = 'destination-out';
                    context2D.beginPath();
                    context2D.arc(length / 2, length / 2, pixelSize / 2, 0, 2 * Math.PI, true);
                    context2D.closePath();
                    context2D.fillStyle = 'black';
                    context2D.fill();
                    context2D.restore();
                }
            }

            context2D.beginPath();
            context2D.arc(length / 2, length / 2, pixelSize / 2, 0, 2 * Math.PI, true);
            context2D.closePath();
            context2D.fillStyle = cssColor;
            context2D.fill();

            return canvas;
        };
    }

    /**
     * A function that returns a canvas containing an image of a point.
     * @callback createBillboardPointCallback~CanvasFunction
     * @returns {HTMLCanvasElement} The result of the calculation.
     */

    return createBillboardPointCallback;
});
