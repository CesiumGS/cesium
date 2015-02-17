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
        GROUND : 1,
        OPAQUE : 2,
        TRANSLUCENT : 3,
        OVERLAY : 4
    };

    return freezeObject(Pass);
});