/*global define*/
define([
        '../Core/Cartesian2'
       ], function(
         Cartesian2) {
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

        getValue : function(unwrappedInterval, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian2();
            }
            result.x = unwrappedInterval[0];
            result.y = unwrappedInterval[1];
            return result;
        },

        getValueFromArray : function(array, startingIndex, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian2();
            }
            result.x = array[startingIndex];
            result.y = array[startingIndex + 1];
            return result;
        },

        getValueFromInterpolationResult : function(array, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian2();
            }
            result.x = array[0];
            result.y = array[1];
            return result;
        }
    };

    return CzmlCartesian2;
});