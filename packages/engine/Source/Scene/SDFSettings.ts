/**
 * Settings for the generation of signed distance field glyphs
 *
 * @private
 */
const SDFSettings = {
  /**
   * The font size in pixels
   *
   * @type {number}
   * @constant
   */
  FONT_SIZE: 48.0,

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
export default Object.freeze(SDFSettings);
