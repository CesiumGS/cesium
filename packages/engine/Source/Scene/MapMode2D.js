// @ts-check

/**
 * Describes how the map will operate in 2D.
 *
 * @enum {number}
 */
const MapMode2D = {
  /**
   * The 2D map can be rotated about the z axis.
   *
   * @type {number}
   * @constant
   */
  ROTATE: 0,

  /**
   * The 2D map can be scrolled infinitely in the horizontal direction.
   *
   * @type {number}
   * @constant
   */
  INFINITE_SCROLL: 1,
};

Object.freeze(MapMode2D);

export default MapMode2D;
