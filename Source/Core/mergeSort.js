/*global define*/
define([
        './defined',
        './DeveloperError'
    ], function(
        defined,
        DeveloperError) {
    "use strict";

    var leftScratchArray = [];
    var rightScratchArray = [];

    function merge(array, compare, userDefinedObject, start, middle, end) {
        var leftLength = middle - start + 1;
        var rightLength = end - middle;

        var left = leftScratchArray;
        var right = rightScratchArray;

        var i;
        var j;

        for (i = 0; i < leftLength; ++i) {
            left[i] = array[start + i];
        }

        for (j = 0; j < rightLength; ++j) {
            right[j] = array[middle + j + 1];
        }

        i = 0;
        j = 0;
        for (var k = start; k <= end; ++k) {
            var leftElement = left[i];
            var rightElement = right[j];
            if (i < leftLength && (j >= rightLength || compare(leftElement, rightElement, userDefinedObject) <= 0)) {
                array[k] = leftElement;
                ++i;
            } else if (j < rightLength) {
                array[k] = rightElement;
                ++j;
            }
        }
    }

    function sort(array, compare, userDefinedObject, start, end) {
        if (start >= end) {
            return;
        }

        var middle = Math.floor((start + end) * 0.5);
        sort(array, compare, userDefinedObject, start, middle);
        sort(array, compare, userDefinedObject, middle + 1, end);
        merge(array, compare, userDefinedObject, start, middle, end);
    }

    /**
     * A stable merge sort.
     *
     * @exports mergeSort
     *
     * @param {Array} array The array to sort.
     * @param {mergeSort~Comparator} comparator The function to use to compare elements in the array.
     * @param {Object} [userDefinedObject] An object to pass as the third parameter to <code>comparator</code>.
     *
     * @example
     * // Assume array contains BoundingSpheres in world coordinates.
     * // Sort them in ascending order of distance from the camera.
     * var position = camera.positionWC;
     * Cesium.mergeSort(array, function(a, b, position) {
     *     return Cesium.BoundingSphere.distanceSquaredTo(b, position) - Cesium.BoundingSphere.distanceSquaredTo(a, position);
     * }, position);
     */
    var mergeSort = function(array, comparator, userDefinedObject) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required.');
        }
        if (!defined(comparator)) {
            throw new DeveloperError('comparator is required.');
        }
        //>>includeEnd('debug');

        var length = array.length;
        var scratchLength = Math.ceil(length * 0.5);

        // preallocate space in scratch arrays
        leftScratchArray.length = scratchLength;
        rightScratchArray.length = scratchLength;

        sort(array, comparator, userDefinedObject, 0, length - 1);

        // trim scratch arrays
        leftScratchArray.length = 0;
        rightScratchArray.length = 0;
    };

    /**
     * A function used to compare two items while performing a merge sort.
     * @callback mergeSort~Comparator
     *
     * @param {Object} a An item in the array.
     * @param {Object} b An item in the array.
     * @param {Object} [userDefinedObject] An object that was passed to {@link mergeSort}.
     * @returns {Number} Returns a negative value if <code>a</code> is less than <code>b</code>,
     *          a positive value if <code>a</code> is greater than <code>b</code>, or
     *          0 if <code>a</code> is equal to <code>b</code>.
     *
     * @example
     * function compareNumbers(a, b, userDefinedObject) {
     *     return a - b;
     * }
     */

    return mergeSort;
});