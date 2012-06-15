/*global define*/
define(['../Core/Cartesian3',
        '../Core/Ellipsoid'],
function(Cartesian3, Ellipsoid) {
    "use strict";

    var doublesPerValue = 3;
    var wgs84 = Ellipsoid.WGS84;

    var CzmlCartesian3 = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapInterval : function(czmlInterval) {
            return czmlInterval.cartesian;
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
            return existingInstance;
        },

        createValueFromArray : function(array, startingIndex, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartesian3();
            }
            existingInstance.x = array[startingIndex];
            existingInstance.y = array[startingIndex + 1];
            existingInstance.z = array[startingIndex + 2];
            return existingInstance;
        },

        createValueFromInterpolationResult : function(array, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartesian3();
            }
            existingInstance.x = array[0];
            existingInstance.y = array[1];
            existingInstance.z = array[2];
            return existingInstance;
        },

        convertToCartographic3 : function(cartesian3) {
            return wgs84.toCartographic3(cartesian3);
        },

        convertToCartesian3 : function(cartesian3) {
            return cartesian3;
        }
    };

    return CzmlCartesian3;
});