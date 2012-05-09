/*global define*/
define(['Core/Cartesian2'],
function(Cartesian2) {
    "use strict";

    var doublesPerValue = 2;

    var Cartesian2DataHandler = {

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
            return new Cartesian2(data[0], data[1]);
        },

        createValueFromArray : function(data, startingIndex) {
            return new Cartesian2(data[startingIndex], data[startingIndex + 1]);
        },

        createValueFromInterpolationResult : function(result) {
            return new Cartesian2(result[0], result[1]);
        }
    };

    return Cartesian2DataHandler;
});