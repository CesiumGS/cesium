import measureText from '../ThirdParty/measureText.js';
import Color from './Color.js';
import defaultValue from './defaultValue.js';
import defined from './defined.js';
import DeveloperError from './DeveloperError.js';

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
     * @param {Number} [options.strokeWidth=1] The stroke width.
     * @param {Color} [options.backgroundColor=Color.TRANSPARENT] The background color of the canvas.
     * @param {Number} [options.padding=0] The pixel size of the padding to add around the text.
     * @returns {Canvas} A new canvas with the given text drawn into it.  The dimensions object
     *                   from measureText will also be added to the returned canvas. If text is
     *                   blank, returns undefined.
     * @exports writeTextToCanvas
     */
    function writeTextToCanvas(text, options) {
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
        var backgroundColor = defaultValue(options.backgroundColor, Color.TRANSPARENT);
        var padding = defaultValue(options.padding, 0);
        var doublePadding = padding * 2.0;

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
        canvas.dimensions = dimensions;

        document.body.removeChild(canvas);
        canvas.style.visibility = '';

        //Some characters, such as the letter j, have a non-zero starting position.
        //This value is used for kerning later, but we need to take it into account
        //now in order to draw the text completely on the canvas
        var x = -dimensions.bounds.minx;

        //Expand the width to include the starting position.
        var width = Math.ceil(dimensions.width) + x + doublePadding;

        //While the height of the letter is correct, we need to adjust
        //where we start drawing it so that letters like j and y properly dip
        //below the line.

        var height = dimensions.height + doublePadding;
        var baseline = height - dimensions.ascent + padding;
        var y = height - baseline + doublePadding;

        canvas.width = width;
        canvas.height = height;

        // Properties must be explicitly set again after changing width and height
        context2D.font = font;
        context2D.lineJoin = 'round';
        context2D.lineWidth = strokeWidth;
        context2D[imageSmoothingEnabledName] = false;

        // Draw background
        if (backgroundColor !== Color.TRANSPARENT) {
            context2D.fillStyle = backgroundColor.toCssColorString();
            context2D.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (stroke) {
            var strokeColor = defaultValue(options.strokeColor, Color.BLACK);
            context2D.strokeStyle = strokeColor.toCssColorString();
            context2D.strokeText(text, x + padding, y);
        }

        if (fill) {
            var fillColor = defaultValue(options.fillColor, Color.WHITE);
            context2D.fillStyle = fillColor.toCssColorString();
            context2D.fillText(text, x + padding, y);
        }

        return canvas;
    }
export default writeTextToCanvas;
