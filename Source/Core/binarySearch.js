/*global define*/
define(['./DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * Finds an item in a sorted array.
     *
     * @exports binarySearch
     *
     * @param {Array} array The sorted array to search.
     * @param {Object} itemToFind The item to find in the array.
     *
     * @param {Function} comparator The function to use to compare the item to elements in the array.
     *        The first parameter passed to the comparator function is an item in the array, the
     *        second is <code>itemToFind</code>.  If the array item is less than <code>itemToFind</code>,
     *        the function should return a negative value.  If it is greater, the function should return
     *        a positive value.  If the items are equal, it should return 0.
     *
     * @return {Number} The index of <code>itemToFind</code> in the array, if it exists.  If <code>itemToFind</code>
     *        does not exist, the return value is a negative number which is the bitwise complement (~)
     *        of the index before which the itemToFind should be inserted in order to maintain the
     *        sorted order of the array.
     *
     * @exception {DeveloperError} <code>array</code> is required.
     * @exception {DeveloperError} <code>toFind</code> is required.
     * @exception {DeveloperError} <code>comparator</code> is required.
     *
     * @example
     * // Create a comparator function to search through an array of numbers.
     * var comparator = function (a, b) {
     *     return a - b;
     * };
     * var numbers = [0, 2, 4, 6, 8];
     * var index = binarySearch(numbers, 6, comparator); // 3
     */
    var binarySearch = function(array, itemToFind, comparator) {
        if (typeof array === 'undefined') {
            throw new DeveloperError('array is required.');
        }
        if (typeof itemToFind === 'undefined') {
            throw new DeveloperError('itemToFind is required.');
        }
        if (typeof comparator === 'undefined') {
            throw new DeveloperError('comparator is required.');
        }

        var low = 0;
        var high = array.length - 1;
        var i;
        var comparison;

        while (low <= high) {
            i = ~~((low + high) / 2);
            comparison = comparator(array[i], itemToFind);
            if (comparison < 0) {
                low = i + 1;
                continue;
            }
            if (comparison > 0) {
                high = i - 1;
                continue;
            }
            return i;
        }
        return ~(high + 1);
    };

    return binarySearch;
});