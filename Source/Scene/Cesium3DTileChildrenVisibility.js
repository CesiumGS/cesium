/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * @private
     */
    var Cesium3DTileChildrenVisibility = {
        NONE : 0,                         // No children visible
        VISIBLE : 1,                      // At least one child visible
        IN_REQUEST_VOLUME : 2,            // At least one child in viewer request volume
        VISIBLE_IN_REQUEST_VOLUME : 4,    // At least one child both visible and in viewer request volume
        VISIBLE_NOT_IN_REQUEST_VOLUME : 8 // At least one child visible but not in viewer request volume
    };

    return freezeObject(Cesium3DTileChildrenVisibility);
});
