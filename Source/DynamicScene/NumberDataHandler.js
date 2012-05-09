/*global define*/
define(['./DynamicProperty',
        'Core/JulianDate',
        'Core/binarySearch',
        'Core/interpolateWithDegree',
        'Core/LinearApproximation'],
function(DynamicProperty,
        JulianDate,
        binarySearch,
        interpolateWithDegree,
        LinearApproximation) {
    "use strict";

    var NumberDataHandler = {

        doublesPerValue : 1,

        doublesPerInterpolationValue : 1,

        unwrapCzmlInterval : function(czmlInterval) {
            var result = czmlInterval.number;
            return typeof result === 'undefined' ? +czmlInterval : result;
        },

        isSampled : function(czmlIntervalValue) {
            return Array.isArray(czmlIntervalValue);
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex, destinationIndex = 0, stop = (lastIndex + 1);

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
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