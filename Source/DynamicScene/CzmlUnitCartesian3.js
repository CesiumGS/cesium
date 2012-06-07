/*global define*/
define(['../Core/Cartesian3'],
function(Cartesian3) {
    "use strict";

    var doublesPerValue = 3;

    var CzmlUnitCartesian3 = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapInterval : function(czmlInterval) {
            return czmlInterval.unitCartesian;
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
            return new Cartesian3(unwrappedInterval[0], unwrappedInterval[1], unwrappedInterval[2], true);
        },

        createValueFromArray : function(array, startingIndex) {
            return new Cartesian3(array[startingIndex], array[startingIndex + 1], array[startingIndex + 2], true);
        },

        createValueFromInterpolationResult : function(array) {
            return new Cartesian3(array[0], array[1], array[2], true);
        },
    };

    return CzmlUnitCartesian3;
});