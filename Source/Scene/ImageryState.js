/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var ImageryState = {
        UNLOADED : 0,
        TRANSITIONING : 1,
        RECEIVED : 2,
        TEXTURE_LOADED : 3,
        READY : 4,
        FAILED : 5,
        INVALID : 6,
        PLACEHOLDER : 7
    };

    return freezeObject(ImageryState);
});