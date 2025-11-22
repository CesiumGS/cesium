/**
 * The direction to display a primitive or ImageryLayer relative to the {@link Scene#splitPosition}.
 *
 * @enum {number}
 *
 * @see ImageryLayer#splitDirection
 * @see Cesium3DTileset#splitDirection
 */
const SplitDirection = {
  /**
   * Display the primitive or ImageryLayer to the left of the {@link Scene#splitPosition}.
   *
   * @type {number}
   * @constant
   */
  LEFT: -1.0,

  /**
   *  Always display the primitive or ImageryLayer.
   *
   * @type {number}
   * @constant
   */
  NONE: 0.0,

  /**
   * Display the primitive or ImageryLayer to the right of the {@link Scene#splitPosition}.
   *
   * @type {number}
   * @constant
   */
  RIGHT: 1.0,
};
export default Object.freeze(SplitDirection);
