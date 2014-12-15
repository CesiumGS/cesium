/*global define*/
define([
        '../ThirdParty/measureText',
        './Color',
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        measureText,
        Color,
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    var imageSmoothingEnabledName;

    /**
     * Writes the given text into a new canvas.  The canvas will be sized to fit the text.
     * If text is blank, returns undefined.
     *
     * @param {String} text The text to write.
     * @param {Object} [options] Object with the following properties:
     * @param {String} [options.font='10px sans-serif'] The CSS font to use.
     * @param {String} [options.textBaseline='bottom'] The baseline of the text.
     * @param {Boolean} [options.fill=true] Whether to fill the text.
     * @param {Boolean} [options.stroke=false] Whether to stroke the text.
     * @param {Color} [options.fillColor=Color.WHITE] The fill color.
     * @param {Color} [options.strokeColor=Color.BLACK] The stroke color.
     * @param {Color} [options.strokeWidth=1] The stroke width.
     * @returns {Canvas} A new canvas with the given text drawn into it.  The dimensions object
     *                   from measureText will also be added to the returned canvas. If text is
     *                   blank, returns undefined.
     */
    var writeTextToCanvas = function(text, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(text)) {
            throw new DeveloperError('text is required.');
        }
        //>>includeEnd('debug');
        if (text === '') {
            return undefined;
        }

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var font = defaultValue(options.font, '10px sans-serif');
        var stroke = defaultValue(options.stroke, false);
        var fill = defaultValue(options.fill, true);
        var strokeWidth = defaultValue(options.strokeWidth, 1);

        var canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        canvas.style.font = font;

        var context2D = canvas.getContext('2d');

        if (!defined(imageSmoothingEnabledName)) {
            if (defined(context2D.imageSmoothingEnabled)) {
                imageSmoothingEnabledName = 'imageSmoothingEnabled';
            } else if (defined(context2D.mozImageSmoothingEnabled)) {
                imageSmoothingEnabledName = 'mozImageSmoothingEnabled';
            } else if (defined(context2D.webkitImageSmoothingEnabled)) {
                imageSmoothingEnabledName = 'webkitImageSmoothingEnabled';
            } else if (defined(context2D.msImageSmoothingEnabled)) {
                imageSmoothingEnabledName = 'msImageSmoothingEnabled';
            }
        }

        context2D.font = font;
        context2D.lineJoin = 'round';
        context2D.lineWidth = strokeWidth;
        context2D[imageSmoothingEnabledName] = false;

        // textBaseline needs to be set before the measureText call. It won't work otherwise.
        // It's magic.
        context2D.textBaseline = defaultValue(options.textBaseline, 'bottom');

        // in order for measureText to calculate style, the canvas has to be
        // (temporarily) added to the DOM.
        canvas.style.visibility = 'hidden';
        document.body.appendChild(canvas);

        var dimensions = measureText(context2D, text, stroke, fill);
        dimensions.computedWidth = Math.max(dimensions.width, dimensions.bounds.maxx - dimensions.bounds.minx);
        canvas.dimensions = dimensions;

        document.body.removeChild(canvas);
        canvas.style.visibility = '';

        var baseline = dimensions.height - dimensions.ascent;
        canvas.width = dimensions.computedWidth;
        canvas.height = dimensions.height;
        var y = canvas.height - baseline;

        // Properties must be explicitly set again after changing width and height
        context2D.font = font;
        context2D.lineJoin = 'round';
        context2D.lineWidth = strokeWidth;
        context2D[imageSmoothingEnabledName] = false;

        if (stroke) {
            var strokeColor = defaultValue(options.strokeColor, Color.BLACK);
            context2D.strokeStyle = strokeColor.toCssColorString();
            context2D.strokeText(text, 0, y);
        }

        if (fill) {
            var fillColor = defaultValue(options.fillColor, Color.WHITE);
            context2D.fillStyle = fillColor.toCssColorString();
            context2D.fillText(text, 0, y);
        }

        return canvas;
    };

    return writeTextToCanvas;
});