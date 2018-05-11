define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

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

    return freezeObject(Cesium3DTileOptimizationHint);
});
