/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var TileState = {
        START : 0,
        LOADING : 1,
        READY : 2,
        UPSAMPLED_ONLY : 3
    };

    return freezeObject(TileState);
});