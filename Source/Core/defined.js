/*global define*/
define(function() {
    "use strict";

    /**
     * Returns the first parameter if not undefined, otherwise the second parameter.
     * Useful for setting a default value for a parameter.
     *
     * @exports defined
     *
     * @example
     * if (defined(positions)) {
     *      doSomething();
     * } else {
     *      doSomethingElse();
     * }
     */
    var defined = function(value) {
        return typeof value !== 'undefined';
    };

    return defined;
});
