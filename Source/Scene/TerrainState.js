/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var TerrainState = {
        FAILED : 0,
        UNLOADED : 1,
        RECEIVING : 2,
        RECEIVED : 3,
        TRANSFORMING : 4,
        TRANSFORMED : 5,
        UPSAMPLING : 6,
        READY : 7
    };

    return freezeObject(TerrainState);
});