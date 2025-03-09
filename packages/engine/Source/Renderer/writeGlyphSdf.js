import bitmapSDF from "bitmap-sdf";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import VerticalOrigin from "../Core/VerticalOrigin.js";
import SdfGlyphDimensions from "./SdfGlyphDimensions.js";
import SdfSettings from "./SdfSettings.js";

const defaultBackgroundFillStyle = Color.BLACK.toCssColorString();
const defaultFillStyle = Color.WHITE.toCssColorString();

/**
 * Write glyph SDF data.
 * @private
 * @param {string} character The letter or symbol.
 * @param {string} font The CSS font string.
 * @param {HTMLCanvasElement} [canvas] The canvas to render to.
 * @return {ImageData} An array of distance values as image data RGBA.
 */
function writeGlyphSdf(character, font, canvas) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("character", character);
  Check.typeOf.string("font", font);
  //>>includeEnd('debug');

  if (!defined(canvas)) {
    canvas = document.createElement("canvas");
  }

  const dimensions = SdfGlyphDimensions.measureGlyph(character, font, canvas);
  const { canvasWidth, canvasHeight, horizontalOffset } = dimensions;
  const verticalOffset = dimensions.getOffsetY(VerticalOrigin.TOP);

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context2d = canvas.getContext("2d", { willReadFrequently: true });
  context2d.font = font;

  // Draw background
  context2d.fillStyle = defaultBackgroundFillStyle;
  context2d.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw glyph
  context2d.fillStyle = defaultFillStyle;
  context2d.fillText(character, horizontalOffset, verticalOffset);

  const distances = bitmapSDF(canvas, {
    cutoff: SdfSettings.CUTOFF,
    radius: SdfSettings.RADIUS,
  });

  const imageData = context2d.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;
  for (let i = 0; i < canvasWidth; i++) {
    for (let j = 0; j < canvasHeight; j++) {
      const index = j * canvasWidth + i;
      const alpha = distances[index] * 255;
      data[index * 4 + 0] = alpha;
      data[index * 4 + 1] = alpha;
      data[index * 4 + 2] = alpha;
      // To avoid blending issues, don't pre-multiply the alpha value
      data[index * 4 + 3] = 255;
    }
  }
  return imageData;
}

export default writeGlyphSdf;
