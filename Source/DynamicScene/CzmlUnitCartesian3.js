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

        getValue : function(unwrappedInterval, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian3();
            }
            result.x = unwrappedInterval[0];
            result.y = unwrappedInterval[1];
            result.z = unwrappedInterval[2];
            return result.normalize(result);
        },

        getValueFromArray : function(array, startingIndex, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian3();
            }
            result.x = array[startingIndex];
            result.y = array[startingIndex + 1];
            result.z = array[startingIndex + 2];
            return result.normalize(result);
        },

        getValueFromInterpolationResult : function(array, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian3();
            }
            result.x = array[0];
            result.y = array[1];
            result.z = array[2];
            return result.normalize(result);
        },
    };

    return CzmlUnitCartesian3;
});