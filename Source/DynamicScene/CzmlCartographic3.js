/*global define*/
define(['../Core/Cartographic3',
        '../Core/Ellipsoid',
        '../Core/Math'],
function(Cartographic3,
         Ellipsoid,
         CesiumMath) {
    "use strict";

    var wgs84 = Ellipsoid.WGS84;
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
                            cartographic[i + 3] = CesiumMath.toRadians(cartographicDegrees[i + 3]);
                        }
                    } else {
                        cartographic = [CesiumMath.toRadians(cartographicDegrees[0]), CesiumMath.toRadians(cartographicDegrees[1]), CesiumMath.toRadians(cartographicDegrees[2])];
                    }
                }
            }

            return cartographic;
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
            return new Cartographic3(unwrappedInterval[0], unwrappedInterval[1], unwrappedInterval[2]);
        },

        createValueFromArray : function(array, startingIndex) {
            return new Cartographic3(array[startingIndex], array[startingIndex + 1], array[startingIndex + 2]);
        },

        createValueFromInterpolationResult : function(array) {
            return new Cartographic3(array[0], array[1], array[2]);
        },

        convertToCartographic3 : function(cartographic3) {
            return cartographic3;
        },

        convertToCartesian3 : function(cartographic3) {
            return wgs84.toCartesian(cartographic3);
        }
    };

    return CzmlCartographic3;
});