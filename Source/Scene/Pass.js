/*global define*/
define(function() {
    "use strict";

    /**
     * The render pass for a command.
     *
     * @private
     */
    var Pass = {
        OPAQUE : 0,
        TRANSLUCENT : 1,
        OVERLAY : 2
    };

    return Pass;
});