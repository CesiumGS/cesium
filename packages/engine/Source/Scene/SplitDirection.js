/**
 * The direction to display a primitive or ImageryLayer relative to the {@link Scene#splitPosition}.
 *
 * @enum {Number}
 *
 * @see ImageryLayer#splitDirection
 * @see Cesium3DTileset#splitDirection
 */
const SplitDirection = {
  /**
   * Display the primitive or ImageryLayer to the left of the {@link Scene#splitPosition}.
   *
   * @type {Number}
   * @constant
   */
  LEFT: -1.0,

  /**
   *  Always display the primitive or ImageryLayer.
   *
   * @type {Number}
   * @constant
   */
  NONE: 0.0,

  /**
   * Display the primitive or ImageryLayer to the right of the {@link Scene#splitPosition}.
   *
   * @type {Number}
   * @constant
   */
  RIGHT: 1.0,
};
export default Object.freeze(SplitDirection);
