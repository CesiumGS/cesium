/*global define*/
define([
        '../Core/Spherical'
       ], function(
         Spherical) {
    "use strict";

    var doublesPerValue = 2;

    var CzmlUnitSpherical = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapInterval : function(czmlInterval) {
            return czmlInterval.spherical || czmlInterval.unitSpherical;
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
            return new Spherical(unwrappedInterval[0], unwrappedInterval[1], 1.0);
        },

        createValueFromArray : function(array, startingIndex) {
            return new Spherical(array[startingIndex], array[startingIndex + 1], 1.0);
        },

        createValueFromInterpolationResult : function(array) {
            return new Spherical(array[0], array[1], 1.0);
        }
    };

    return CzmlUnitSpherical;
});