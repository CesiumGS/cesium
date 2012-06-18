/*global define*/
define(['../Core/Cartographic3',
        '../Core/Math'],
function(Cartographic3,
         CesiumMath) {
    "use strict";

    var doublesPerValue = 3;

    var CzmlCartographic3 = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapInterval : function(czmlInterval) {
            var cartographic = czmlInterval.cartographicRadians;
            if (typeof cartographic === 'undefined') {
                var cartographicDegrees = czmlInterval.cartographicDegrees;
                if (typeof cartographicDegrees !== 'undefined') {
                    if (this.isSampled(cartographicDegrees)) {
                        cartographic = [];
                        for ( var i = 0, len = cartographicDegrees.length; i < len; i += 4) {
                            cartographic[i] = cartographicDegrees[i];
                            cartographic[i + 1] = CesiumMath.toRadians(cartographicDegrees[i + 1]);
                            cartographic[i + 2] = CesiumMath.toRadians(cartographicDegrees[i + 2]);
                            cartographic[i + 3] = cartographicDegrees[i + 3];
                        }
                    } else {
                        cartographic = [CesiumMath.toRadians(cartographicDegrees[0]), CesiumMath.toRadians(cartographicDegrees[1]), cartographicDegrees[2]];
                    }
                }
            }

            return cartographic;
        },

        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        getValue : function(unwrappedInterval, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartographic3();
            }
            existingInstance.longitude = unwrappedInterval[0];
            existingInstance.latitude = unwrappedInterval[1];
            existingInstance.height = unwrappedInterval[2];
            return existingInstance;
        },

        getValueFromArray : function(array, startingIndex, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartographic3();
            }
            existingInstance.longitude = array[startingIndex];
            existingInstance.latitude = array[startingIndex + 1];
            existingInstance.height = array[startingIndex + 2];
            return existingInstance;
        },

        getValueFromInterpolationResult : function(array, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Cartographic3();
            }
            existingInstance.longitude = array[0];
            existingInstance.latitude = array[1];
            existingInstance.height = array[2];
            return existingInstance;
        },
    };

    return CzmlCartographic3;
});