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

        createValue : function(unwrappedInterval) {
            return new Cartesian3(unwrappedInterval[0], unwrappedInterval[1], unwrappedInterval[2]);
        },

        createValueFromArray : function(array, startingIndex) {
            return new Cartesian3(array[startingIndex], array[startingIndex + 1], array[startingIndex + 2]);
        },

        createValueFromInterpolationResult : function(array) {
            return new Cartesian3(array[0], array[1], array[2]);
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