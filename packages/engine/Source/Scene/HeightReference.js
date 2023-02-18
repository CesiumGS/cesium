/**
 * Represents the position relative to the terrain.
 *
 * @enum {number}
 */
const HeightReference = {
  /**
   * The position is absolute.
   * @type {number}
   * @constant
   */
  NONE: 0,

  /**
   * The position is clamped to the terrain.
   * @type {number}
   * @constant
   */
  CLAMP_TO_GROUND: 1,

  /**
   * The position height is the height above the terrain.
   * @type {number}
   * @constant
   */
  RELATIVE_TO_GROUND: 2,
};
export default Object.freeze(HeightReference);
