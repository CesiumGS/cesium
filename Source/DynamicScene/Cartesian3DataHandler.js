/*global define*/
define(['Core/Cartesian3'],
function(Cartesian3) {
    "use strict";

    var doublesPerValue = 3;

    var Cartesian3DataHandler = {

        doublesPerValue : doublesPerValue,

        doublesPerInterpolationValue : doublesPerValue,

        unwrapCzmlInterval : function(czmlInterval) {
            return czmlInterval.cartesian;
        },

        isSampled : function(czmlIntervalValue) {
            return Array.isArray(czmlIntervalValue) && czmlIntervalValue.length > doublesPerValue;
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * doublesPerValue, destinationIndex = 0, stop = (lastIndex + 1) * doublesPerValue;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        createValue : function(data) {
            return new Cartesian3(data[0], data[1], data[2]);
        },

        createValueFromArray : function(data, startingIndex) {
            return new Cartesian3(data[startingIndex], data[startingIndex + 1], data[startingIndex + 2]);
        },

        createValueFromInterpolationResult : function(result) {
            return new Cartesian3(result[0], result[1], result[2]);
        }
    };

    return Cartesian3DataHandler;
});