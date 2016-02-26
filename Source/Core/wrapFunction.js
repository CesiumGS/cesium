/*global define*/
define([
        './DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * Wraps a function on the provided objects with another function called in the
     * object's context so that the new function is always called immediately
     * before the old one.
     *
     * @private
     */
    function wrapFunction(obj, oldFunction, newFunction) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof oldFunction !== 'function') {
            throw new DeveloperError("oldFunction is required to be a function.");
        }

        if (typeof newFunction !== 'function') {
            throw new DeveloperError("oldFunction is required to be a function.");
        }
        //>>includeEnd('debug');

        return function() {
            newFunction.apply(obj, arguments);
            oldFunction.apply(obj, arguments);
        };
    }

    return wrapFunction;
});
