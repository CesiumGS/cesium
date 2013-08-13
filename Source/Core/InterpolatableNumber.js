/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    var InterpolatableNumber = {};

    InterpolatableNumber.length = 1;

    InterpolatableNumber.pack = function(array, startingIndex, value) {
        array[startingIndex++] = value;
        return startingIndex;
    };

    InterpolatableNumber.unpack = function(array, startingIndex, result) {
        return array[startingIndex];
    };

    return InterpolatableNumber;
});
