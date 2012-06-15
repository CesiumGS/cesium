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

        createValue : function(unwrappedInterval, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartesian3();
            }
            existingInstance.x = unwrappedInterval[0];
            existingInstance.y = unwrappedInterval[1];
            existingInstance.z = unwrappedInterval[2];
            return Cartesian3.normalize(existingInstance);
        },

        createValueFromArray : function(array, startingIndex, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartesian3();
            }
            existingInstance.x = array[startingIndex];
            existingInstance.y = array[startingIndex + 1];
            existingInstance.z = array[startingIndex + 2];
            return Cartesian3.normalize(existingInstance);
        },

        createValueFromInterpolationResult : function(array, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartesian3();
            }
            existingInstance.x = array[0];
            existingInstance.y = array[1];
            existingInstance.z = array[2];
            return Cartesian3.normalize(existingInstance);
        },
    };

    return CzmlUnitCartesian3;
});