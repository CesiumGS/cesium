/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTileRefine = {
        ADD : 0,      // Render this tile and its children (if tile doesn't meet SSE)
        REPLACE : 1   // Render this tile or its children (if tile doesn't meet SSE)
    };

    return freezeObject(Cesium3DTileRefine);
});