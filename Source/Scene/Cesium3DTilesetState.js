/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTilesetState = {
        UNLOADED : 0,   // Has never been requested
        LOADING : 1,    // Is waiting on a pending request
        READY : 2,      // Ready to render
        FAILED : 3      // Request failed
    };

    return freezeObject(Cesium3DTilesetState);
});
