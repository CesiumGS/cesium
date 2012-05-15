/*global define*/
define([
        '../Core/Spherical'
       ], function(
         Spherical) {
    "use strict";

    var doublesPerValue = 2;

    var UnitSphericalDataHandler = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapCzmlInterval : function(czmlInterval) {
            return czmlInterval.spherical || czmlInterval.unitSpherical;
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
            return new Spherical(data[0], data[1], 1.0);
        },

        createValueFromArray : function(data, startingIndex) {
            return new Spherical(data[startingIndex], data[startingIndex + 1], 1.0);
        },

        createValueFromInterpolationResult : function(result) {
            return new Spherical(result[0], result[1], 1.0);
        }
    };

    return UnitSphericalDataHandler;
});