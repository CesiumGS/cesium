/**
 * Whether a classification affects terrain, 3D Tiles or both.
 *
 * @enum {number}
 */
const ClassificationType = {
  /**
   * Only terrain will be classified.
   *
   * @type {number}
   * @constant
   */
  TERRAIN: 0,
  /**
   * Only 3D Tiles will be classified.
   *
   * @type {number}
   * @constant
   */
  CESIUM_3D_TILE: 1,
  /**
   * Both terrain and 3D Tiles will be classified.
   *
   * @type {number}
   * @constant
   */
  BOTH: 2,
};

/**
 * @private
 */
ClassificationType.NUMBER_OF_CLASSIFICATION_TYPES = 3;

export default Object.freeze(ClassificationType);
