/**
 * Determines how opaque and translucent parts of billboards, points, and labels are blended with the scene.
 *
 * @enum {number}
 */
const BlendOption = {
  /**
   * The billboards, points, or labels in the collection are completely opaque.
   * @type {number}
   * @constant
   */
  OPAQUE: 0,

  /**
   * The billboards, points, or labels in the collection are completely translucent.
   * @type {number}
   * @constant
   */
  TRANSLUCENT: 1,

  /**
   * The billboards, points, or labels in the collection are both opaque and translucent.
   * @type {number}
   * @constant
   */
  OPAQUE_AND_TRANSLUCENT: 2,
};
export default Object.freeze(BlendOption);
