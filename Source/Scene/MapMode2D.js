/**
 * Describes how the map will operate in 2D.
 *
 * @enum {Number}
 */
var MapMode2D = {
  /**
   * The 2D map can be rotated about the z axis.
   *
   * @type {Number}
   * @constant
   */
  ROTATE: 0,

  /**
   * The 2D map can be scrolled infinitely in the horizontal direction.
   *
   * @type {Number}
   * @constant
   */
  INFINITE_SCROLL: 1,
};
export default Object.freeze(MapMode2D);
