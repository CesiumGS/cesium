/*global define*/
define(['Core/defined'], function(defined) {
    "use strict";

    return function(a, b) {
        // if either a or b have an equals method, call it.
        if (a !== null && defined(a)) {
            if (typeof a.equals === 'function') {
                return a.equals(b);
            } else if (typeof a.__proto__.constructor.equals === 'function') {
                return a.__proto__.constructor.equals(a, b);
            }
        }

        if (b !== null && defined(b)) {
            if (typeof b.equals === 'function') {
                return b.equals(a);
            } else if (typeof b.__proto__.constructor.equals === 'function') {
                return b.__proto__.constructor.equals(b, a);
            }
        }

        // fall back to default equality checks.
        return undefined;
    };
});
