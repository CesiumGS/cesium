/**
 * The refinement approach for a tile.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification#refinement|Refinement}
 * in the 3D Tiles spec.
 * </p>
 *
 * @enum {number}
 *
 * @private
 */
const Cesium3DTileRefine = {
  /**
   * Render this tile and, if it doesn't meet the screen space error, also refine to its children.
   *
   * @type {number}
   * @constant
   */
  ADD: 0,

  /**
   * Render this tile or, if it doesn't meet the screen space error, refine to its descendants instead.
   *
   * @type {number}
   * @constant
   */
  REPLACE: 1,
};
export default Object.freeze(Cesium3DTileRefine);
