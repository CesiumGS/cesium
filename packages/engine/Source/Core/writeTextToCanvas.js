import Color from "./Color.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

function measureText(context2D, textString, font, stroke, fill) {
  const metrics = context2D.measureText(textString);
  const isSpace = !/\S/.test(textString);

  if (!isSpace) {
    const fontSize = document.defaultView
      .getComputedStyle(context2D.canvas)
      .getPropertyValue("font-size")
      .replace("px", "");
    const canvas = document.createElement("canvas");
    const padding = 100;
    const width = (metrics.width + padding) | 0;
    const height = 3 * fontSize;
    const baseline = height / 2;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.font = font;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width + 1, canvas.height + 1);

    if (stroke) {
      ctx.strokeStyle = "black";
      ctx.lineWidth = context2D.lineWidth;
      ctx.strokeText(textString, padding / 2, baseline);
    }

    if (fill) {
      ctx.fillStyle = "black";
      ctx.fillText(textString, padding / 2, baseline);
    }

    // Context image data has width * height * 4 elements, because
    // each pixel's R, G, B and A are consecutive values in the array.
    const pixelData = ctx.getImageData(0, 0, width, height).data;
    const length = pixelData.length;
    const width4 = width * 4;
    let i, j;

    let ascent, descent;
    // Find the number of rows (from the top) until the first non-white pixel
    for (i = 0; i < length; ++i) {
      if (pixelData[i] !== 255) {
        ascent = (i / width4) | 0;
        break;
      }
    }

    // Find the number of rows (from the bottom) until the first non-white pixel
    for (i = length - 1; i >= 0; --i) {
      if (pixelData[i] !== 255) {
        descent = (i / width4) | 0;
        break;
      }
    }

    let minx = -1;
    // For each column, for each row, check for first non-white pixel
    for (i = 0; i < width && minx === -1; ++i) {
      for (j = 0; j < height; ++j) {
        const pixelIndex = i * 4 + j * width4;
        if (
          pixelData[pixelIndex] !== 255 ||
          pixelData[pixelIndex + 1] !== 255 ||
          pixelData[pixelIndex + 2] !== 255 ||
          pixelData[pixelIndex + 3] !== 255
        ) {
          minx = i;
          break;
        }
      }
    }

    return {
      width: metrics.width,
      height: descent - ascent,
      ascent: baseline - ascent,
      descent: descent - baseline,
      minx: minx - padding / 2,
    };
  }

  return {
    width: metrics.width,
    height: 0,
    ascent: 0,
    descent: 0,
    minx: 0,
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

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const font = defaultValue(options.font, "10px sans-serif");
  const stroke = defaultValue(options.stroke, false);
  const fill = defaultValue(options.fill, true);
  const strokeWidth = defaultValue(options.strokeWidth, 1);
  const backgroundColor = defaultValue(
    options.backgroundColor,
    Color.TRANSPARENT,
  );
  const padding = defaultValue(options.padding, 0);
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

  const dimensions = measureText(context2D, text, font, stroke, fill);
  // Set canvas.dimensions to be accessed in LabelCollection
  canvas.dimensions = dimensions;

  document.body.removeChild(canvas);
  canvas.style.visibility = "";

  // Some characters, such as the letter j, have a non-zero starting position.
  // This value is used for kerning later, but we need to take it into account
  // now in order to draw the text completely on the canvas
  const x = -dimensions.minx;

  // Expand the width to include the starting position.
  const width = Math.ceil(dimensions.width) + x + doublePadding;

  // While the height of the letter is correct, we need to adjust
  // where we start drawing it so that letters like j and y properly dip
  // below the line.

  const height = dimensions.height + doublePadding;
  const baseline = height - dimensions.ascent + padding;
  const y = height - baseline + doublePadding;

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
    const strokeColor = defaultValue(options.strokeColor, Color.BLACK);
    context2D.strokeStyle = strokeColor.toCssColorString();
    context2D.strokeText(text, x + padding, y);
  }

  if (fill) {
    const fillColor = defaultValue(options.fillColor, Color.WHITE);
    context2D.fillStyle = fillColor.toCssColorString();
    context2D.fillText(text, x + padding, y);
  }

  return canvas;
}
export default writeTextToCanvas;
