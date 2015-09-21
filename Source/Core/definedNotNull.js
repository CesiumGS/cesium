/*global define*/
define(function() {
    "use strict";

    /**
     * @exports definedNotNull
     *
     * @param {Object} value The object.
     * @returns {Boolean} Returns true if the object is defined and not null, returns false otherwise.
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
