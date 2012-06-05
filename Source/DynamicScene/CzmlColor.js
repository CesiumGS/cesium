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
                            rgbaf[i] = rgba[i];
                            rgbaf[i + 1] = rgba[i + 1] / 255.0;
                            rgbaf[i + 2] = rgba[i + 2] / 255.0;
                            rgbaf[i + 3] = rgba[i + 3] / 255.0;
                            rgbaf[i + 4] = rgba[i + 4] / 255.0;
                        }
                    } else {
                        rgbaf = [rgba[0] / 255.0, rgba[1] / 255.0, rgba[2] / 255.0, rgba[3] / 255.0];
                    }
                }
            }

            return rgbaf;
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