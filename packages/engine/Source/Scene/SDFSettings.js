/**
 * Settings for the generation of signed distance field glyphs
 *
 * @private
 */
const SDFSettings = {
  /**
   * The font size in pixels
   *
   * @type {Number}
   * @constant
   */
  FONT_SIZE: 48.0,

  /**
   * Whitespace padding around glyphs.
   *
   * @type {Number}
   * @constant
   */
  PADDING: 10.0,

  /**
   * How many pixels around the glyph shape to use for encoding distance
   *
   * @type {Number}
   * @constant
   */
  RADIUS: 8.0,

  /**
   * How much of the radius (relative) is used for the inside part the glyph.
   *
   * @type {Number}
   * @constant
   */
  CUTOFF: 0.25,
};
export default Object.freeze(SDFSettings);
