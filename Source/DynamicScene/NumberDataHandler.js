/*global define*/
define(function() {
    "use strict";

    var doublesPerValue = 1;

    var NumberDataHandler = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapCzmlInterval : function(czmlInterval) {
            var result = czmlInterval.number;
            return typeof result === 'undefined' ? +czmlInterval : result;
        },

        isSampled : function(czmlIntervalValue) {
            return Array.isArray(czmlIntervalValue);
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex;
            var destinationIndex = 0;
            var stop = (lastIndex + 1);

            while (sourceIndex < stop) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
                sourceIndex++;
                destinationIndex++;
            }
        },

        createValue : function(data) {
            return data;
        },

        createValueFromArray : function(data, startingIndex) {
            return data[startingIndex];
        },

        createValueFromInterpolationResult : function(result) {
            return result[0];
        }
    };

    return NumberDataHandler;
});