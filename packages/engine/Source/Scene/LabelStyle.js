/**
 * Describes how to draw a label.
 *
 * @enum {number}
 *
 * @see Label#style
 */
const LabelStyle = {
  /**
   * Fill the text of the label, but do not outline.
   *
   * @type {number}
   * @constant
   */
  FILL: 0,

  /**
   * Outline the text of the label, but do not fill.
   *
   * @type {number}
   * @constant
   */
  OUTLINE: 1,

  /**
   * Fill and outline the text of the label.
   *
   * @type {number}
   * @constant
   */
  FILL_AND_OUTLINE: 2,
};
export default Object.freeze(LabelStyle);
