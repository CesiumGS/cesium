/*global define*/
define([
        './defined',
        './DeveloperError'
    ], function(
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Finds an item in a sorted array.
     *
     * @exports binarySearch
     *
     * @param {Array} array The sorted array to search.
     * @param {Object} itemToFind The item to find in the array.
     * @param {binarySearch~Comparator} comparator The function to use to compare the item to
     *        elements in the array.
     * @returns {Number} The index of <code>itemToFind</code> in the array, if it exists.  If <code>itemToFind</code>
     *        does not exist, the return value is a negative number which is the bitwise complement (~)
     *        of the index before which the itemToFind should be inserted in order to maintain the
     *        sorted order of the array.
     *
     * @example
     * // Create a comparator function to search through an array of numbers.
     * var comparator = function(a, b) {
     *     return a - b;
     * };
     * var numbers = [0, 2, 4, 6, 8];
     * var index = Cesium.binarySearch(numbers, 6, comparator); // 3
     */
    var binarySearch = function(array, itemToFind, comparator) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required.');
        }
        if (!defined(itemToFind)) {
            throw new DeveloperError('itemToFind is required.');
        }
        if (!defined(comparator)) {
            throw new DeveloperError('comparator is required.');
        }
        //>>includeEnd('debug');

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

    /**
     * A function used to compare two items while performing a binary search.
     * @callback binarySearch~Comparator
     *
     * @param {Object} a An item in the array.
     * @param {Object} b The item being searched for.
     * @returns {Number} Returns a negative value if <code>a</code> is less than <code>b</code>,
     *          a positive value if <code>a</code> is greater than <code>b</code>, or
     *          0 if <code>a</code> is equal to <code>b</code>.
     *
     * @example
     * function compareNumbers(a, b) {
     *     return a - b;
     * }
     */

    return binarySearch;
});