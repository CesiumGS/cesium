/*global define*/
define(function() {
    "use strict";

    /**
     * Returns true if the object is defined, returns false otherwise.
     *
     * @exports defined
     *
     * @example
     * if (Cesium.defined(positions)) {
     *      doSomething();
     * } else {
     *      doSomethingElse();
     * }
     */
    var defined = function(value) {
        return value !== undefined;
    };

    return defined;
});
