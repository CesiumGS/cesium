/*global define*/
define(function() {
    "use strict";

    var doublesPerValue = 1;

    var CzmlNumber = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.number;
            return typeof result === 'undefined' ? +czmlInterval : result;
        },

        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval);
        },

        getValue : function(unwrappedInterval) {
            return unwrappedInterval;
        },

        getValueFromArray : function(array, startingIndex) {
            return array[startingIndex];
        },

        getValueFromInterpolationResult : function(array) {
            return array[0];
        }
    };

    return CzmlNumber;
});