// @ts-check

/**
 * Hint defining optimization support for a 3D tile
 *
 * @enum {number}
 *
 * @private
 */
const Cesium3DTileOptimizationHint = {
  NOT_COMPUTED: -1,
  USE_OPTIMIZATION: 1,
  SKIP_OPTIMIZATION: 0,
};

Object.freeze(Cesium3DTileOptimizationHint);

export default Cesium3DTileOptimizationHint;
