/*global define*/
define(['./defined',
        './DeveloperError'
    ], function(
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Subdivides an array into a number of smaller, equal sized arrays.
     *
     * @exports subdivideArray
     *
     * @param {Array} array The array to divide.
     * @param {Number} numberOfArrays The number of arrays to divide the provided array into.
     */
    var subdivideArray = function(array, numberOfArrays) {
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }

        if (!defined(numberOfArrays)) {
            throw new DeveloperError('numberOfArrays is required');
        }

        var result = [];
        var len = array.length;
        var i = 0;
        while (i < len) {
            var size = Math.ceil((len - i) / numberOfArrays--);
            result.push(array.slice(i, i + size));
            i += size;
        }
        return result;
    };

    return subdivideArray;
});
