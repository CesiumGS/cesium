/*global define*/
define(['Core/Cartesian2'], function(Cartesian2) {
    "use strict";

    var Cartesian2DataHandler = {

        doublesPerValue : 2,
        doublesPerInterpolationValue : 2,

        isSampled : function(czmlIntervalData) {
            return Array.isArray(czmlIntervalData) && czmlIntervalData.length > Cartesian2DataHandler.doublesPerValue;
        },

        createValueFromArray : function(data, startingIndex) {
            return new Cartesian2(data[startingIndex], data[startingIndex + 1]);
        },

        createValue : function(data) {
            return new Cartesian2(data[0], data[1]);
        },

        getCzmlIntervalValue : function(czmlInterval) {
            return czmlInterval.cartesian;
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * Cartesian2DataHandler.doublesPerValue, destinationIndex = 0, stop = (lastIndex + 1) * Cartesian2DataHandler.doublesPerValue;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        createValueFromInterpolationResult : function(result) {
            return new Cartesian2(result[0], result[1]);
        }
    };

    return Cartesian2DataHandler;
});