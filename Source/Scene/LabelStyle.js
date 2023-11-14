/**
 * Describes how to draw a label.
 *
 * @enum {Number}
 *
 * @see Label#style
 */
const LabelStyle = {
  /**
   * Fill the text of the label, but do not outline.
   *
   * @type {Number}
   * @constant
   */
  FILL: 0,

  /**
   * Outline the text of the label, but do not fill.
   *
   * @type {Number}
   * @constant
   */
  OUTLINE: 1,

  /**
   * Fill and outline the text of the label.
   *
   * @type {Number}
   * @constant
   */
  FILL_AND_OUTLINE: 2,
};
export default Object.freeze(LabelStyle);
