/**
 * Settings for the generation of signed distance field glyphs
 *
 * @private
 */
const SdfSettings = {
  /**
   * The minimum ratio of font size to SDF glyph font size
   *
   * @type {number}
   * @constant
   */
  FONT_SIZE_RATIO: 1.5,

  /**
   * Whitespace padding around glyphs.
   *
   * @type {number}
   * @constant
   */
  PADDING: 10.0,

  /**
   * How many pixels around the glyph shape to use for encoding distance
   *
   * @type {number}
   * @constant
   */
  RADIUS: 8.0,

  /**
   * How much of the radius (relative) is used for the inside part the glyph.
   *
   * @type {number}
   * @constant
   */
  CUTOFF: 0.25,
};

export default Object.freeze(SdfSettings);
