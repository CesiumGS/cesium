/*global define*/
define(['../Core/Cartesian2'], function(Cartesian2) {
    "use strict";

    var doublesPerValue = 2;

    var CzmlCartesian2 = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapInterval : function(czmlInterval) {
            return czmlInterval.cartesian2;
        },

        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        packValuesForInterpolation : function(sourceArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * doublesPerValue;
            var destinationIndex = 0;
            var stop = (lastIndex + 1) * doublesPerValue;

            while (sourceIndex < stop) {
                destinationArray[destinationIndex] = sourceArray[sourceIndex];
                sourceIndex++;
                destinationIndex++;
            }
        },

        createValue : function(unwrappedInterval) {
            return new Cartesian2(unwrappedInterval[0], unwrappedInterval[1]);
        },

        createValueFromArray : function(array, startingIndex) {
            return new Cartesian2(array[startingIndex], array[startingIndex + 1]);
        },

        createValueFromInterpolationResult : function(array) {
            return new Cartesian2(array[0], array[1]);
        }
    };

    return CzmlCartesian2;
});