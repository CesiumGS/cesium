/*global define*/
define(['Core/Cartesian3'],
function(Cartesian3) {
    "use strict";

    var Cartesian3DataHandler = {

        doublesPerValue : 3,
        doublesPerInterpolationValue : 3,

        isSampled : function(czmlIntervalData) {
            return Array.isArray(czmlIntervalData) && czmlIntervalData.length > Cartesian3DataHandler.doublesPerValue;
        },

        createValueFromArray : function(data, startingIndex) {
            return new Cartesian3(data[startingIndex], data[startingIndex + 1], data[startingIndex + 2]);
        },

        createValue : function(data) {
            return new Cartesian3(data[0], data[1], data[2]);
        },

        getCzmlIntervalValue : function(czmlInterval) {
            return czmlInterval.cartesian;
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * Cartesian3DataHandler.doublesPerValue, destinationIndex = 0, stop = (lastIndex + 1) * Cartesian3DataHandler.doublesPerValue;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        createValueFromInterpolationResult : function(result) {
            return new Cartesian3(result[0], result[1], result[2]);
        }
    };
    return Cartesian3DataHandler;
});