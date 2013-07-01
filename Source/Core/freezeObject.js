/*global define*/
define(function() {
    "use strict";

    /**
     * Freezes an object, using Object.freeze if available, otherwise returns
     * the object unchanged.  This function should be used in setup code to prevent
     * errors from completely halting JavaScript execution in legacy browsers.
     *
     * @private
     *
     * @exports freezeObject
     */
    var freezeObject = Object.freeze;
    if (typeof freezeObject === 'undefined') {
        freezeObject = function(o) {
            return o;
        };
    }

    return freezeObject;
});