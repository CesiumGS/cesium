/*global define,performance*/
define(['./defined'
    ], function(
        defined) {
    "use strict";

    /**
     * Tests an object to see if it is an array.
     * @exports isArray
     *
     * @param {Object} value The value to test.
     * @returns {Boolean} true if the value is an array, false otherwise.
     */
    var isArray;

    if (defined(Array.isArray)) {
        isArray = Array.isArray;
    } else {
        isArray = function(value) {
            return Object.prototype.toString.call(value) === '[object Array]';
        };
    }

    return isArray;
});