/**
 * Represents the position relative to the terrain.
 *
 * @enum {Number}
 */
var HeightReference = {
  /**
   * The position is absolute.
   * @type {Number}
   * @constant
   */
  NONE: 0,

  /**
   * The position is clamped to the terrain.
   * @type {Number}
   * @constant
   */
  CLAMP_TO_GROUND: 1,

  /**
   * The position height is the height above the terrain.
   * @type {Number}
   * @constant
   */
  RELATIVE_TO_GROUND: 2,
};
export default Object.freeze(HeightReference);
