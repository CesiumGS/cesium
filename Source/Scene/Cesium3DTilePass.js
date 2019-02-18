define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * The pass in which a 3D Tileset is updated.
     *
     * @private
     */
    var Cesium3DTilePass = {
        RENDER : 0,
        PICK : 1,
        SHADOW : 2,
        PREFETCH : 3,
        MOST_DETAILED_PREFETCH : 4,
        MOST_DETAILED_PICK : 5,
        NUMBER_OF_PASSES : 6
    };

    return freezeObject(Cesium3DTilePass);
});
