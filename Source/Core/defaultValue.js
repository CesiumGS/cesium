/*global define*/
define(function() {
    "use strict";

    /**
     * Returns the first parameter if not undefined, otherwise the second parameter.
     * Useful for setting a default value for a parameter.
     *
     * @example
     * param = defaultValue(param, 'default');
     */
    function defaultValue(a, b) {
        if (typeof a !== 'undefined') {
            return a;
        }
        return b;
    }

    return defaultValue;
});