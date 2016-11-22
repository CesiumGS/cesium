/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * @private
     *
     * Additive refinement renders the entire cut of the tree.  Replacement refine renders just the front.
     */
    var Cesium3DTileRefine = {
        ADD : 0,      // Render this tile and, if it doesn't meet the SSE, refine to its children
        REPLACE : 1   // Render this tile or, if it doesn't meet the SSE, refine to its children
    };

    return freezeObject(Cesium3DTileRefine);
});