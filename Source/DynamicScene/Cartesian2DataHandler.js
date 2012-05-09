/*global define*/
define(['../Core/Cartesian2'], function(Cartesian2) {
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
            var sourceIndex = firstIndex * doublesPerValue;
            var destinationIndex = 0;
            var stop = (lastIndex + 1) * doublesPerValue;

            while (sourceIndex < stop) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
                sourceIndex++;
                destinationIndex++;
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