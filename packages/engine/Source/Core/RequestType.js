/**
 * An enum identifying the type of request. Used for finer grained logging and priority sorting.
 *
 * @enum {number}
 */
const RequestType = {
  /**
   * Terrain request.
   *
   * @type {number}
   * @constant
   */
  TERRAIN: 0,

  /**
   * Imagery request.
   *
   * @type {number}
   * @constant
   */
  IMAGERY: 1,

  /**
   * 3D Tiles request.
   *
   * @type {number}
   * @constant
   */
  TILES3D: 2,

  /**
   * Other request.
   *
   * @type {number}
   * @constant
   */
  OTHER: 3,
};
export default Object.freeze(RequestType);
