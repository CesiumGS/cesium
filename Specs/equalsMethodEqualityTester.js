/*global define*/
define(function() {
    "use strict";

    return function(a, b) {
        // if either a or b have an equals method, call it.
        if (a !== null && typeof a !== 'undefined' && typeof a.equals === 'function') {
            return a.equals(b);
        }

        if (b !== null && typeof b !== 'undefined' && typeof b.equals === 'function') {
            return b.equals(a);
        }

        // fall back to default equality checks.
        return undefined;
    };
});