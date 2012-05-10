/*global define*/
define(['Core/Color'],
function(Color) {
    "use strict";

    var doublesPerValue = 4;

    var ColorDataHandler = {

        doublesPerValue : doublesPerValue,

        doublesPerInterpolationValue : doublesPerValue,

        unwrapCzmlInterval : function(czmlInterval) {
            var rgbaf = czmlInterval.rgbaf;
            if (typeof rgbaf === 'undefined') {
                var rgba = czmlInterval.rgba;
                if (typeof rgba !== 'undefined') {
                    rgbaf = [];
                    if (this.isSampled(rgba)) {
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

        isSampled : function(czmlIntervalData) {
            return Array.isArray(czmlIntervalData) && czmlIntervalData.length > doublesPerValue;
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * doublesPerValue, destinationIndex = 0, stop = (lastIndex + 1) * doublesPerValue;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        createValue : function(data) {
            return new Color(data[0], data[1], data[2], data[3]);
        },

        createValueFromArray : function(data, startingIndex) {
            return new Color(data[startingIndex], data[startingIndex + 1], data[startingIndex + 2], data[startingIndex + 3]);
        },

        createValueFromInterpolationResult : function(result) {
            return new Color(result[0], result[1], result[2], result[3]);
        }
    };
    return ColorDataHandler;
});