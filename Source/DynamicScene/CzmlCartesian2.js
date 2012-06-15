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

        getValue : function(unwrappedInterval, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartesian2();
            }
            existingInstance.x = unwrappedInterval[0];
            existingInstance.y = unwrappedInterval[1];
            return existingInstance;
        },

        getValueFromArray : function(array, startingIndex, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartesian2();
            }
            existingInstance.x = array[startingIndex];
            existingInstance.y = array[startingIndex + 1];
            return existingInstance;
        },

        getValueFromInterpolationResult : function(array, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartesian2();
            }
            existingInstance.x = array[0];
            existingInstance.y = array[1];
            return existingInstance;
        }
    };

    return CzmlCartesian2;
});