/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Color',
        '../ThirdParty/measureText'
    ], function(
        defaultValue,
        DeveloperError,
        Color,
        measureText) {
    "use strict";

    var EMPTY_OBJECT = {};

    /**
     * Writes the given text into a new canvas.  The canvas will be sized to fit the text.
     * If text is blank, returns undefined.
     *
     * @param {String} text The text to write.
     * @param {String} [description.font='10px sans-serif'] The CSS font to use.
     * @param {String} [description.textBaseline='bottom'] The baseline of the text.
     * @param {Boolean} [description.fill=true] Whether to fill the text.
     * @param {Boolean} [description.stroke=false] Whether to stroke the text.
     * @param {Color} [description.fillColor=Color.WHITE] The fill color.
     * @param {Color} [description.strokeColor=Color.BLACK] The stroke color.
     * @param {Color} [description.strokeWidth=1] The stroke width.
     *
     * @returns {Canvas} A new canvas with the given text drawn into it.  The dimensions object
     *                   from measureText will also be added to the returned canvas. If text is
     *                   blank, returns undefined.
     */
    var writeTextToCanvas = function(text, description) {
        if (typeof text === 'undefined') {
            throw new DeveloperError('text is required.');
        }

        if (text === '') {
            return undefined;
        }

        description = defaultValue(description, EMPTY_OBJECT);
        var font = defaultValue(description.font, '10px sans-serif');

        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        canvas.style.font = font;

        var context2D = canvas.getContext('2d');
        context2D.font = font;

        // textBaseline needs to be set before the measureText call. It won't work otherwise.
        // It's magic.
        context2D.textBaseline = defaultValue(description.textBaseline, 'bottom');

        // in order for measureText to calculate style, the canvas has to be
        // (temporarily) added to the DOM.
        canvas.style.visibility = 'hidden';
        document.body.appendChild(canvas);

        var stroke = defaultValue(description.stroke, false);
        var fill = defaultValue(description.fill, true);
        var strokeWidth = defaultValue(description.strokeWidth, 1) * 2;

        context2D.lineWidth = strokeWidth;
        var dimensions = measureText(context2D, text, stroke, fill);
        canvas.dimensions = dimensions;

        document.body.removeChild(canvas);
        canvas.style.visibility = undefined;

        var baseline = dimensions.height - dimensions.ascent;
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        var y = canvas.height - baseline;

        // font must be explicitly set again after changing width and height
        context2D.font = font;

        if (stroke) {
            var strokeColor = defaultValue(description.strokeColor, Color.BLACK);
            context2D.strokeStyle = strokeColor.toCssColorString();
            context2D.lineWidth = strokeWidth;
            context2D.strokeText(text, 0, y);
        }

        if (fill) {
            var fillColor = defaultValue(description.fillColor, Color.WHITE);
            context2D.fillStyle = fillColor.toCssColorString();
            context2D.fillText(text, 0, y);
        }


        return canvas;
    };

    return writeTextToCanvas;
});