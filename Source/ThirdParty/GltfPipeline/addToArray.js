define([], function() {
    'use strict';

    /**
     * Adds an element to an array and returns the element's index.
     *
     * @param {Array} array The array to add to.
     * @param {Object} element The element to add.
     *
     * @private
     */
    function addToArray(array, element) {
        array.push(element);
        return array.length - 1;
    }

    return addToArray;
});
