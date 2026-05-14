// @ts-check

/**
 * Defines how material properties are applied along a path.
 *
 * @enum {number}
 */
const PathMode = {
  /**
   * The material is applied to the entire path as a whole.
   * @type {number}
   * @constant
   */
  WHOLE: 0,

  /**
   * The material is applied in portions based on temporal position information,
   * using interval-based material properties.
   * @type {number}
   * @constant
   */
  PORTIONS: 1,
};

Object.freeze(PathMode);

export default PathMode;
