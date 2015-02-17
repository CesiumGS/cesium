/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * The render pass for a command.
     *
     * @private
     */
    var Pass = {
        GLOBE : 0,
        OPAQUE : 1,
        TRANSLUCENT : 2,
        OVERLAY : 3,
        NUMBER_OF_PASSES : 4
    };

    return freezeObject(Pass);
});