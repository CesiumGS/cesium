/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * @private
     * 
     * @exports Cesium3DTileOptimizationHint
     * 
     * Hint defining optimization support for a 3D tile
     */
    var Cesium3DTileOptimizationHint = {
        NOT_COMPUTED: -1,
        USE_OPTIMIZATION: 1,
        SKIP_OPTIMIZATION: 0
    };

    return freezeObject(Cesium3DTileOptimizationHint);
});
