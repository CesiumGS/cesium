/*global define*/
define(['Core/defined'], function(defined) {
    "use strict";

    return function(a, b) {
        // if either a or b have an equals method, call it.
        if (a !== null && defined(a) && typeof a.equals === 'function') {
            return a.equals(b);
        }

        if (b !== null && defined(b) && typeof b.equals === 'function') {
            return b.equals(a);
        }

        // fall back to default equality checks.
        return undefined;
    };
});