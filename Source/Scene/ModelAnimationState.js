/*global define*/
define(['../Core/freezeObject'], function(freezeObject) {
    "use strict";

    /**
     * @private
     * @enum
     */
    return freezeObject({
        STOPPED : 0,
        ANIMATING : 1
    });
});