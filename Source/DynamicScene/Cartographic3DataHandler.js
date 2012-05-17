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

    var Cartographic3DataHandler = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapCzmlInterval : function(czmlInterval) {
            var cartographic = czmlInterval.cartographic;
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

        isSampled : function(czmlIntervalValue) {
            return Array.isArray(czmlIntervalValue) && czmlIntervalValue.length > doublesPerValue;
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * doublesPerValue;
            var destinationIndex = 0;
            var stop = (lastIndex + 1) * doublesPerValue;

            while (sourceIndex < stop) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
                sourceIndex++;
                destinationIndex++;
            }
        },

        createValue : function(data) {
            return new Cartographic3(data[0], data[1], data[2]);
        },

        createValueFromArray : function(data, startingIndex) {
            return new Cartographic3(data[startingIndex], data[startingIndex + 1], data[startingIndex + 2]);
        },

        createValueFromInterpolationResult : function(result) {
            return new Cartographic3(result[0], result[1], result[2]);
        },

        convertToCartographic : function(data) {
            return data;
        },

        convertToCartesian : function(data) {
            return wgs84.toCartesian(data);
        }
    };

    return Cartographic3DataHandler;
});