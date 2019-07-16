define([], function() {
    'use strict';

    function addToArray(array, element) {
        array.push(element);
        return array.length - 1;
    }
    return addToArray;
});
