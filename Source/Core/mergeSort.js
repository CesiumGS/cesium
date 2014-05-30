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
     * @param {Function} comparator The function to use to compare the item to elements in the array.
     *        If the first parameter is less than the second parameter, the function should return a
     *        negative value.  If it is greater, the function should return a positive value.  If the
     *        items are equal, it should return 0.
     * @param {Object} [userDefinedObject] An object to pass as the third parameter to comparator.
     *
     * @example
     * // Sort an array of numbers in increasing order
     * var array = // Array of bounding spheres in world coordinates
     * var position = camera.positionWC;
     * mergeSort(array, function(a, b, position) {
     *     return BoundingSphere.distanceSquaredTo(b.sphere, position) - BounsingSphere.distanceSquaredTo(a.sphere, position);
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

    return mergeSort;
});