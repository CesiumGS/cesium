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

        createValue : function(unwrappedInterval) {
            return new Color(unwrappedInterval[0], unwrappedInterval[1], unwrappedInterval[2], unwrappedInterval[3]);
        },

        createValueFromArray : function(array, startingIndex) {
            return new Color(array[startingIndex], array[startingIndex + 1], array[startingIndex + 2], array[startingIndex + 3]);
        },

        createValueFromInterpolationResult : function(array) {
            return new Color(array[0], array[1], array[2], array[3]);
        }
    };
    return CzmlColor;
});