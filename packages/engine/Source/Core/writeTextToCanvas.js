import Color from "./Color.js";
import Frozen from "./Frozen.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Computes dimensions for text, based on current canvas state.
 *
 * Rounds metrics, excluding width, to whole pixels. This is purely to minimize
 * rendering differences with migration to in-browser measureText(), and may be
 * revised in the future. See: github.com/CesiumGS/cesium/pull/13081
 */
function measureText(context2D, textString) {
  const metrics = context2D.measureText(textString);
  const isSpace = !/\S/.test(textString);

  if (isSpace) {
    return {
      width: metrics.width,
      height: 0,
      ascent: 0,
      descent: 0,
      minx: 0,
    };
  }

  // Baseline alignment requires `height = ascent + descent`. Rounding (if any)
  // must be done before summing, or glyph pairs like "ij" may be misaligned.
  const ascent = Math.round(metrics.actualBoundingBoxAscent);
  const descent = Math.round(metrics.actualBoundingBoxDescent);

  // Characters like "_" may have height <0.5 at some sizes, don't round to zero.
  const height = Math.max(ascent + descent, 1);

  return {
    width: metrics.width,
    height,
    ascent,
    descent,
    minx: -Math.round(metrics.actualBoundingBoxLeft),
  };
}

let imageSmoothingEnabledName;

/**
 * Writes the given text into a new canvas.  The canvas will be sized to fit the text.
 * If text is blank, returns undefined.
 *
 * @param {string} text The text to write.
 * @param {object} [options] Object with the following properties:
 * @param {string} [options.font='10px sans-serif'] The CSS font to use.
 * @param {boolean} [options.fill=true] Whether to fill the text.
 * @param {boolean} [options.stroke=false] Whether to stroke the text.
 * @param {Color} [options.fillColor=Color.WHITE] The fill color.
 * @param {Color} [options.strokeColor=Color.BLACK] The stroke color.
 * @param {number} [options.strokeWidth=1] The stroke width.
 * @param {Color} [options.backgroundColor=Color.TRANSPARENT] The background color of the canvas.
 * @param {number} [options.padding=0] The pixel size of the padding to add around the text.
 * @returns {HTMLCanvasElement|undefined} A new canvas with the given text drawn into it.  The dimensions object
 *                   from measureText will also be added to the returned canvas. If text is
 *                   blank, returns undefined.
 * @function writeTextToCanvas
 */
function writeTextToCanvas(text, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(text)) {
    throw new DeveloperError("text is required.");
  }
  //>>includeEnd('debug');
  if (text === "") {
    return undefined;
  }

  options = options ?? Frozen.EMPTY_OBJECT;
  const font = options.font ?? "10px sans-serif";
  const stroke = options.stroke ?? false;
  const fill = options.fill ?? true;
  const strokeWidth = options.strokeWidth ?? 1;
  const backgroundColor = options.backgroundColor ?? Color.TRANSPARENT;
  const padding = options.padding ?? 0;
  const doublePadding = padding * 2.0;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  canvas.style.font = font;
  // Since multiple read-back operations are expected for labels, use the willReadFrequently option – See https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently
  const context2D = canvas.getContext("2d", { willReadFrequently: true });

  if (!defined(imageSmoothingEnabledName)) {
    if (defined(context2D.imageSmoothingEnabled)) {
      imageSmoothingEnabledName = "imageSmoothingEnabled";
    } else if (defined(context2D.mozImageSmoothingEnabled)) {
      imageSmoothingEnabledName = "mozImageSmoothingEnabled";
    } else if (defined(context2D.webkitImageSmoothingEnabled)) {
      imageSmoothingEnabledName = "webkitImageSmoothingEnabled";
    } else if (defined(context2D.msImageSmoothingEnabled)) {
      imageSmoothingEnabledName = "msImageSmoothingEnabled";
    }
  }

  context2D.font = font;
  context2D.lineJoin = "round";
  context2D.lineWidth = strokeWidth;
  context2D[imageSmoothingEnabledName] = false;

  // in order for measureText to calculate style, the canvas has to be
  // (temporarily) added to the DOM.
  canvas.style.visibility = "hidden";
  document.body.appendChild(canvas);

  const dimensions = measureText(context2D, text);

  // Set canvas.dimensions to be accessed in LabelCollection. LabelCollection
  // hard-codes strokeWidth=0, so dimensions should not include stroke padding.
  canvas.dimensions = dimensions;

  document.body.removeChild(canvas);
  canvas.style.visibility = "";

  // measureText does not account for stroke width, added here. LabelCollection
  // calls writeTextToCanvas with hard-coded strokeWidth=0, so stroke padding
  // matters only when calling `writeTextToCanvas` directly.
  const isSpace = !/\S/.test(text);
  const strokePadding = stroke && !isSpace ? Math.ceil(strokeWidth / 2) : 0;
  const doubleStrokePadding = strokePadding * 2;

  // Some characters, such as the letter j, have a non-zero starting position.
  // This value is used for kerning later, but we need to take it into account
  // now in order to draw the text completely on the canvas
  const x = -dimensions.minx + strokePadding;

  // Expand the width to include the starting position.
  const width = Math.ceil(dimensions.width) + x + doublePadding + strokePadding;

  // While the height of the letter is correct, we need to adjust
  // where we start drawing it so that letters like j and y properly dip
  // below the line.

  const height = dimensions.height + doublePadding + doubleStrokePadding;
  const y = dimensions.ascent + padding + strokePadding;

  canvas.width = width;
  canvas.height = height;

  // Properties must be explicitly set again after changing width and height
  context2D.font = font;
  context2D.lineJoin = "round";
  context2D.lineWidth = strokeWidth;
  context2D[imageSmoothingEnabledName] = false;

  // Draw background
  if (backgroundColor !== Color.TRANSPARENT) {
    context2D.fillStyle = backgroundColor.toCssColorString();
    context2D.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (stroke) {
    const strokeColor = options.strokeColor ?? Color.BLACK;
    context2D.strokeStyle = strokeColor.toCssColorString();
    context2D.strokeText(text, x + padding, y);
  }

  if (fill) {
    const fillColor = options.fillColor ?? Color.WHITE;
    context2D.fillStyle = fillColor.toCssColorString();
    context2D.fillText(text, x + padding, y);
  }

  return canvas;
}
export default writeTextToCanvas;
