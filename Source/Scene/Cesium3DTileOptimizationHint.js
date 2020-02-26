import freezeObject from '../Core/freezeObject.js';

    /**
     * Hint defining optimization support for a 3D tile
     *
     * @exports Cesium3DTileOptimizationHint
     *
     * @private
     */
    var Cesium3DTileOptimizationHint = {
        NOT_COMPUTED: -1,
        USE_OPTIMIZATION: 1,
        SKIP_OPTIMIZATION: 0
    };
export default freezeObject(Cesium3DTileOptimizationHint);
