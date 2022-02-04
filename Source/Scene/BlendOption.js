/**
 * Determines how opaque and translucent parts of billboards, points, and labels are blended with the scene.
 *
 * @enum {Number}
 */
const BlendOption = {
  /**
   * The billboards, points, or labels in the collection are completely opaque.
   * @type {Number}
   * @constant
   */
  OPAQUE: 0,

  /**
   * The billboards, points, or labels in the collection are completely translucent.
   * @type {Number}
   * @constant
   */
  TRANSLUCENT: 1,

  /**
   * The billboards, points, or labels in the collection are both opaque and translucent.
   * @type {Number}
   * @constant
   */
  OPAQUE_AND_TRANSLUCENT: 2,
};
export default Object.freeze(BlendOption);
