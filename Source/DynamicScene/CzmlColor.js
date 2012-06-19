/*global define*/
define(['../Core/Color'], function(Color) {
    "use strict";

    var doublesPerValue = 4;

    var CzmlColor = {
        doublesPerValue : doublesPerValue,
        doublesPerInterpolationValue : doublesPerValue,

        unwrapInterval : function(czmlInterval) {
            var rgbaf = czmlInterval.rgbaf;
            if (typeof rgbaf === 'undefined') {
                var rgba = czmlInterval.rgba;
                if (typeof rgba !== 'undefined') {
                    if (this.isSampled(rgba)) {
                        rgbaf = [];
                        for ( var i = 0, len = rgba.length; i < len; i += 5) {
                            rgbaf.push(rgba[i]);
                            rgbaf.push(Color.byteToFloat(rgba[i + 1]));
                            rgbaf.push(Color.byteToFloat(rgba[i + 2]));
                            rgbaf.push(Color.byteToFloat(rgba[i + 3]));
                            rgbaf.push(Color.byteToFloat(rgba[i + 4]));
                        }
                    } else {
                        rgbaf = [Color.byteToFloat(rgba[0]),
                                 Color.byteToFloat(rgba[1]),
                                 Color.byteToFloat(rgba[2]),
                                 Color.byteToFloat(rgba[3])];
                    }
                }
            }

            return rgbaf;
        },

        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        getValue : function(unwrappedInterval, result) {
            if (typeof result === 'undefined') {
                result = new Color();
            }
            result.red = unwrappedInterval[0];
            result.green = unwrappedInterval[1];
            result.blue = unwrappedInterval[2];
            result.alpha = unwrappedInterval[3];
            return result;
        },

        getValueFromArray : function(array, startingIndex, result) {
            if (typeof result === 'undefined') {
                result = new Color();
            }
            result.red = array[startingIndex];
            result.green = array[startingIndex + 1];
            result.blue = array[startingIndex + 2];
            result.alpha = array[startingIndex + 3];
            return result;
        },

        getValueFromInterpolationResult : function(array, result) {
            if (typeof result === 'undefined') {
                result = new Color();
            }
            result.red = array[0];
            result.green = array[1];
            result.blue = array[2];
            result.alpha = array[3];
            return result;
        }
    };
    return CzmlColor;
});