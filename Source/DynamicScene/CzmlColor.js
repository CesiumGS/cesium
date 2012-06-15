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

        createValue : function(unwrappedInterval, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Color();
            }
            existingInstance.red = unwrappedInterval[0];
            existingInstance.green = unwrappedInterval[1];
            existingInstance.blue = unwrappedInterval[2];
            existingInstance.alpha = unwrappedInterval[3];
            return existingInstance;
        },

        createValueFromArray : function(array, startingIndex, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Color();
            }
            existingInstance.red = array[startingIndex];
            existingInstance.green = array[startingIndex + 1];
            existingInstance.blue = array[startingIndex + 2];
            existingInstance.alpha = array[startingIndex + 3];
            return existingInstance;
        },

        createValueFromInterpolationResult : function(array, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Color();
            }
            existingInstance.red = array[0];
            existingInstance.green = array[1];
            existingInstance.blue = array[2];
            existingInstance.alpha = array[3];
            return existingInstance;
        }
    };
    return CzmlColor;
});