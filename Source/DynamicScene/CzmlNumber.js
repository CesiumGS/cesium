/*global define*/
define(function() {
    "use strict";

    var doublesPerValue = 1;

    var CzmlNumber = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.number;
            return typeof result === 'undefined' ? +czmlInterval : result;
        },

        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval);
        },

        packValuesForInterpolation : function(sourceArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex;
            var destinationIndex = 0;
            var stop = (lastIndex + 1);

            while (sourceIndex < stop) {
                destinationArray[destinationIndex] = sourceArray[sourceIndex];
                sourceIndex++;
                destinationIndex++;
            }
        },

        createValue : function(unwrappedInterval) {
            return unwrappedInterval;
        },

        createValueFromArray : function(array, startingIndex) {
            return array[startingIndex];
        },

        createValueFromInterpolationResult : function(array) {
            return array[0];
        }
    };

    return CzmlNumber;
});