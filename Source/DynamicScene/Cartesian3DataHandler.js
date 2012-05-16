/*global define*/
define(['../Core/Cartesian3',
        '../Core/Ellipsoid'],
function(Cartesian3, Ellipsoid) {
    "use strict";

    var doublesPerValue = 3;
    var wgs84 = Ellipsoid.WGS84;

    var Cartesian3DataHandler = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapCzmlInterval : function(czmlInterval) {
            return czmlInterval.cartesian;
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
            return new Cartesian3(data[0], data[1], data[2]);
        },

        createValueFromArray : function(data, startingIndex) {
            return new Cartesian3(data[startingIndex], data[startingIndex + 1], data[startingIndex + 2]);
        },

        createValueFromInterpolationResult : function(result) {
            return new Cartesian3(result[0], result[1], result[2]);
        },

        convertToCartographic : function(data) {
            return wgs84.toCartographic3(data);
        },

        convertToCartesian : function(data) {
            return data;
        }
    };

    return Cartesian3DataHandler;
});