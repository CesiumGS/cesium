/*global define*/
define(['Core/Color'], function(Color) {
    "use strict";

    var ColorDataHandler = {

        doublesPerValue : 4,
        doublesPerInterpolationValue : 4,

        isSampled : function(czmlIntervalData) {
            return Array.isArray(czmlIntervalData) && czmlIntervalData.length > ColorDataHandler.doublesPerValue;
        },

        createValueFromArray : function(data, startingIndex) {
            return new Color(data[startingIndex], data[startingIndex + 1], data[startingIndex + 2], data[startingIndex + 3]);
        },

        createValue : function(data) {
            return new Color(data[0], data[1], data[2], data[3]);
        },

        getCzmlIntervalValue : function(czmlInterval) {
            return czmlInterval.rgba;
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * ColorDataHandler.doublesPerValue, destinationIndex = 0, stop = (lastIndex + 1) * ColorDataHandler.doublesPerValue;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        createValueFromInterpolationResult : function(result) {
            return new Color(result[0], result[1], result[2], result[3]);
        }
    };
    return ColorDataHandler;
});