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
        // Commands are executed in order by pass up to the translucent pass.
        // Translucent geometry needs special handling (sorting/OIT). The compute pass
        // is executed first and the overlay pass is executed last. Both are not sorted
        // by frustum.
        COMPUTE : 0,
        GLOBE : 1,
        GROUND : 2,
        OPAQUE : 3,
        TRANSLUCENT : 4,
        OVERLAY : 5,
        NUMBER_OF_PASSES : 6
    };

    return freezeObject(Pass);
});