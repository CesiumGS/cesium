/*global define*/
define([
        './defined',
        './DeveloperError'
    ], function(
        defined,
        DeveloperError) {
    "use strict";

    function merge(array, compare, start, middle, end) {
        var leftLength = middle - start + 1;
        var rightLength = end - middle;
        var left = new Array(leftLength);
        var right = new Array(rightLength);

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
            if (defined(leftElement) && (!defined(rightElement) || compare(leftElement, rightElement) <= 0)) {
                array[k] = leftElement;
                ++i;
            } else {
                array[k] = rightElement;
                ++j;
            }
        }
    }

    function sort(array, compare, start, end) {
        if (start >= end) {
            return;
        }

        var middle = Math.floor((start + end) * 0.5);
        sort(array, compare, start, middle);
        sort(array, compare, middle + 1, end);
        merge(array, compare, start, middle, end);
    }

    /**
     * An in-place, stable merge sort.
     *
     * @exports mergeSort
     *
     * @param {Array} array The array to sort.
     * @param {Function} comparator The function to use to compare the item to elements in the array.
     *        If the first parameter is less than the second parameter, the function should return a
     *        negative value.  If it is greater, the function should return a positive value.  If the
     *        items are equal, it should return 0.
     */
    var mergeSort = function(array, comparator) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required.');
        }
        if (!defined(comparator)) {
            throw new DeveloperError('comparator is required.');
        }
        //>>includeEnd('debug');

        sort(array, comparator, 0, array.length - 1);
    };

    return mergeSort;
});