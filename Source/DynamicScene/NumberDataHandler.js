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

        isSampled : function(czmlIntervalData) {
            return Array.isArray(czmlIntervalData);
        },

        createValueFromArray : function(data, startingIndex) {
            return data[startingIndex];
        },

        createValue : function(data) {
            if (Array.isArray(data)) {
                return data[0];
            }
            return data;
        },

        getCzmlIntervalValue : function(czmlInterval) {
            var result = czmlInterval.number;
            return typeof result === 'undefined' ? +czmlInterval : result;
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * NumberDataHandler.doublesPerValue, destinationIndex = 0, stop = (lastIndex + 1) * NumberDataHandler.doublesPerValue;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        createValueFromInterpolationResult : function(result) {
            return result[0];
        }
    };

    return NumberDataHandler;
});