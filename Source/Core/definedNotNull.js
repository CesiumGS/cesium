/*global define*/
define(function() {
    "use strict";

    /**
     * Returns true if the object is defined and not null, returns false otherwise.
     *
     * @exports definedNotNull
     *
     * @example
     * if (Cesium.definedNotNull(positions)) {
     *      doSomething();
     * } else {
     *      doSomethingElse();
     * }
     */
    var definedNotNull = function(value) {
        return value !== undefined && value !== null;
    };

    return definedNotNull;
});
