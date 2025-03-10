import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import VerticalOrigin from "../Core/VerticalOrigin.js";
import SdfSettings from "./SdfSettings.js";

/**
 * @typedef {Object} SdfPipeline.GlyphDimensions
 * Dimensions of the rendered glyph, used for proper alignment within a line of text.
 * Some dimensions will contain sub-pixel values for precise alignment at small font sizes and scales.
 * @private
 * @property {number} canvasWidth The width of the canvas used to render this glyph, in pixels
 * @property {number} canvasHeight The height of the canvas used to render this glyph, in pixels
 * @property {number} glyphAdvance The horizontal space to move forward in the rendered line of text after rendering this glyph, in pixels
 * @property {number} baseline The distance from the bottom of the canvas to the glyph baseline, in pixels
 * @property {number} paddingLeft The amount of padding to the left of the rendered glyph, in pixels
 * @property {number} paddingTop The amount of padding above the rendered glyph, in pixels
 * @property {number} paddingRight The amount of padding to the right the rendered glyph, in pixels
 * @property {number} paddingBottom The amount of padding below the rendered glyph, in pixels
 */

/**
 * Dimensions of the rendered glyph, used for proper alignment within a line of text.
 * Some dimensions will contain sub-pixel values for precise alignment at small font sizes and scales.
 * @private
 * @constructor
 * @alias SdfGlyphDimensions
 * @see {SdfGlyphDimensions#measureGlyph}
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} glyphAdvance
 * @param {number} glyphBearing
 * @param {number} baseline
 * @param {number} paddingLeft
 * @param {number} paddingTop
 * @param {number} paddingRight
 * @param {number} paddingBottom
 */
function SdfGlyphDimensions(
  canvasWidth,
  canvasHeight,
  glyphAdvance,
  glyphBearing,
  baseline,
  paddingLeft,
  paddingTop,
  paddingRight,
  paddingBottom,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("canvasWidth", canvasWidth);
  Check.typeOf.number("canvasHeight", canvasHeight);
  Check.typeOf.number("glyphAdvance", glyphAdvance);
  Check.typeOf.number("glyphBearing", glyphBearing);
  Check.typeOf.number("baseline", baseline);
  Check.typeOf.number("paddingLeft", paddingLeft);
  Check.typeOf.number("paddingTop", paddingTop);
  Check.typeOf.number("paddingRight", paddingRight);
  Check.typeOf.number("paddingBottom", paddingBottom);
  //>>includeEnd('debug');

  this._canvasWidth = canvasWidth;
  this._canvasHeight = canvasHeight;
  this._glyphAdvance = glyphAdvance;
  this._glyphBearing = glyphBearing;
  this._baseline = baseline;
  this._paddingLeft = paddingLeft;
  this._paddingTop = paddingTop;
  this._paddingRight = paddingRight;
  this._paddingBottom = paddingBottom;
}

Object.defineProperties(SdfGlyphDimensions.prototype, {
  /**
   * The width of the canvas containing the glyph, in pixels.
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  canvasWidth: {
    get: function () {
      return this._canvasWidth;
    },
  },
  /**
   * The height of the canvas containing the glyph, in pixels.
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  canvasHeight: {
    get: function () {
      return this._canvasHeight;
    },
  },
  /**
   * The difference, in sub-pixels, between the glyph's horizontal origin and the actual glyph bounds. Positive values indicate the glyph sits to the right of the origin; negative values indicate the glyph sits to the left of the origin.
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  glyphBearing: {
    get: function () {
      return this._glyphBearing;
    },
  },

  /**
   * The difference, in pixels, from the bottom of the glyph canvas to the glyph's baseline (verticalOrigin).
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  baseline: {
    get: function () {
      return this._baseline;
    },
  },

  /**
   * The distance, in sub-pixels, between the glyph's horizontal origin and the origin of the next glyph.
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  glyphAdvance: {
    get: function () {
      return this._glyphAdvance;
    },
  },
  /**
   * The difference, in sub-pixels, between the glyph baseline (vertical origin) and the top of the actual glyph bounds.
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  glyphAscent: {
    get: function () {
      return this._canvasHeight - this._baseline - this._paddingTop;
    },
  },
  /**
   * The difference, in sub-pixels, between the glyph baseline (vertical origin) and the bottom of the actual glyph bounds.
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  glyphDescent: {
    get: function () {
      return this._baseline - this._paddingBottom;
    },
  },
  /**
   * The actual height of the glyph in sub-pixels.
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  glyphHeight: {
    get: function () {
      return this._canvasHeight - this._paddingTop - this._paddingBottom;
    },
  },
  /**
   * The actual width of the glyph in sub-pixels.
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  glyphWidth: {
    get: function () {
      return this._canvasWidth - this._paddingLeft - this._paddingRight;
    },
  },
  /**
   * The distance, in pixels, from the left of the canvas to the glyph's horizontal origin.
   * @memberof SdfGlyphDimensions.prototype
   * @type {number}
   * @readonly
   * @private
   */
  horizontalOffset: {
    get: function () {
      return this._paddingLeft;
    },
  },
});

/**
 * Get the vertcal offset needed to align the glyph with its local origin,
 * @private
 * @param {VerticalOrigin} origin The vertical origin,
 * @return {number} The offset from the specified origin, in CSS pixels.
 */
SdfGlyphDimensions.prototype.getOffsetY = function (origin) {
  switch (origin) {
    case VerticalOrigin.TOP:
      return this._canvasHeight - this._baseline;
    case VerticalOrigin.CENTER:
      return this._canvasHeight / 2.0 - this._baseline;
    default: // bottom and baseline
      return -this._baseline;
  }
};

/**
 * Cached dimensions for a specific character and font.
 * @type Map<string, SdfGlyphDimensions>
 * @private
 */
SdfGlyphDimensions._glyphDimensionsCache = new Map();

/**
 * Empties the existing glyph cache.
 * @private
 */
SdfGlyphDimensions.clearCache = function () {
  SdfGlyphDimensions._glyphDimensionsCache.clear();
};

/**
 * Computes the dimension of a single glyph as rendered with the specified font. Results are cached by character and font.
 * @see {@link http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#text-styles|HTML canvas 2D context text styles}
 * @private
 * @param {string} character A single letter or grapheme. Some letters are represented by two unicode characters.
 * @param {string} font Font, specified using the same syntax as the CSS 'font' property.
 * @param {HTMLCanvasElement} [canvas] Canvas used to access a 2D context. If not supplied, a new canvas is created.
 * @returns {SdfGlyphDimensions} The dimensions of the rendered character.
 */
SdfGlyphDimensions.measureGlyph = function (character, font, canvas) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("character", character);
  Check.typeOf.string("font", font);
  //>>includeEnd('debug');

  const key = `${character} ${font}`;
  const glyphDimensionsCache = SdfGlyphDimensions._glyphDimensionsCache;
  let dimensions = glyphDimensionsCache.get(key);
  if (defined(dimensions)) {
    return dimensions;
  }

  if (!defined(canvas)) {
    canvas = document.createElement("canvas");
  }

  // In order for measureText to calculate style, the canvas has to be
  // (temporarily) added to the DOM.
  const previousVisibility = canvas.style.visibility;
  canvas.style.visibility = "hidden";
  document.body.appendChild(canvas);

  const context2d = canvas.getContext("2d", { willReadFrequently: true });
  context2d.font = font;
  context2d.textAlign = "left";

  const padding = SdfSettings.PADDING;
  const {
    width,
    actualBoundingBoxRight,
    actualBoundingBoxLeft,
    actualBoundingBoxAscent,
    actualBoundingBoxDescent,
  } = context2d.measureText(character);

  const glyphTotalWidth = actualBoundingBoxRight - actualBoundingBoxLeft;

  // The horizontal origin for fillText should align to a pixel boundary
  const paddingLeft = padding - Math.floor(actualBoundingBoxLeft);

  // Some characters have a non-zero starting position, and we'll need to
  // account for this when determining the spacing between glyphs
  const glyphBearing =
    Math.floor(actualBoundingBoxLeft) - actualBoundingBoxLeft;

  // The baseline defines the vertical origin for fillText, and should align to a pixel boundary
  const baseline = padding + Math.ceil(actualBoundingBoxDescent);

  // Canvas dimensions need to be rounded up to the nearest integer
  const canvasWidth = paddingLeft + Math.ceil(glyphTotalWidth) + padding;
  const canvasHeight = baseline + Math.ceil(actualBoundingBoxAscent) + padding;

  // The remaining dimensions should take factor in the sub-pixel measurements so we can account for the error in 3D screenspace
  const paddingRight = canvasWidth - paddingLeft - glyphTotalWidth;
  const paddingBottom = baseline - actualBoundingBoxDescent;
  const paddingTop = canvasHeight - baseline - actualBoundingBoxAscent;
  const glyphAdvance = width;

  dimensions = new SdfGlyphDimensions(
    canvasWidth,
    canvasHeight,
    glyphAdvance,
    glyphBearing,
    baseline,
    paddingLeft,
    paddingTop,
    paddingRight,
    paddingBottom,
  );

  glyphDimensionsCache.set(key, dimensions);

  document.body.removeChild(canvas);
  canvas.style.visibility = previousVisibility;

  return dimensions;
};

export default SdfGlyphDimensions;
