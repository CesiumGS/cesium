/**
 * Whether a classification affects terrain, 3D Tiles or both.
 *
 * @enum {Number}
 */
const ClassificationType = {
  /**
   * Only terrain will be classified.
   *
   * @type {Number}
   * @constant
   */
  TERRAIN: 0,
  /**
   * Only 3D Tiles will be classified.
   *
   * @type {Number}
   * @constant
   */
  CESIUM_3D_TILE: 1,
  /**
   * Both terrain and 3D Tiles will be classified.
   *
   * @type {Number}
   * @constant
   */
  BOTH: 2,
};

/**
 * @private
 */
ClassificationType.NUMBER_OF_CLASSIFICATION_TYPES = 3;

export default Object.freeze(ClassificationType);
