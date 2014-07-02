/*global define*/
define(['../Core/freezeObject'], function(freezeObject) {
    "use strict";

    /**
     * The render pass for a command.
     *
     * @private
     * @enum
     */
    var Pass = {
        OPAQUE : 0,
        TRANSLUCENT : 1,
        OVERLAY : 2
    };

    return freezeObject(Pass);
});