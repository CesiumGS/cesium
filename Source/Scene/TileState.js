/*global define*/
define(function() {
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

    return TileState;
});