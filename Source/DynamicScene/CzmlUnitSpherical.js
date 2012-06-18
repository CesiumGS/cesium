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
            return czmlInterval.unitSpherical;
        },

        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        getValue : function(unwrappedInterval, spherical) {
            if (typeof spherical === 'undefined') {
                spherical = new Spherical();
            }
            spherical.clock = unwrappedInterval[0];
            spherical.cone = unwrappedInterval[1];
            spherical.magnitude = 1.0;
            return spherical;
        },

        getValueFromArray : function(array, startingIndex, spherical) {
            if (typeof spherical === 'undefined') {
                spherical = new Spherical();
            }
            spherical.clock = array[startingIndex];
            spherical.cone = array[startingIndex + 1];
            spherical.magnitude = 1.0;
            return spherical;
        },

        getValueFromInterpolationResult : function(array, spherical) {
            if (typeof spherical === 'undefined') {
                spherical = new Spherical();
            }
            spherical.clock = array[0];
            spherical.cone = array[1];
            spherical.magnitude = 1.0;
            return spherical;
        },
    };

    return CzmlUnitSpherical;
});