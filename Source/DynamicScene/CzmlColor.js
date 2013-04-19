/*global define*/
define([
        '../Core/Color'
       ], function(
         Color) {
    "use strict";

    var doublesPerValue = 4;

    /**
     * Provides methods for working with a Color defined in CZML.
     *
     * @exports CzmlColor
     *
     * @see Color
     * @see DynamicProperty
     * @see DynamicPositionProperty
     * @see CzmlBoolean
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlPosition
     * @see CzmlHorizontalOrigin
     * @see CzmlLabelStyle
     * @see CzmlNumber
     * @see CzmlString
     * @see CzmlUnitCartesian3
     * @see CzmlUnitQuaternion
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     */
    var CzmlColor = {
        /**
         * The number of doubles per packed Color value.
         */
        doublesPerValue : doublesPerValue,

        /**
         * The number of doubles per packed value used for interpolation.
         */
        doublesPerInterpolationValue : doublesPerValue,

        /**
         * Returns the packed Color representation contained within the provided CZML interval
         * or undefined if the interval does not contain Color data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var rgbaf = czmlInterval.rgbaf;
            if (typeof rgbaf !== 'undefined') {
                return rgbaf;
            }

            var rgba = czmlInterval.rgba;
            if (typeof rgba === 'undefined') {
                return undefined;
            }

            if (!this.isSampled(rgba)) {
                return [Color.byteToFloat(rgba[0]),
                        Color.byteToFloat(rgba[1]),
                        Color.byteToFloat(rgba[2]),
                        Color.byteToFloat(rgba[3])];
            }

            var len = rgba.length;
            rgbaf = new Array(len);
            for ( var i = 0; i < len; i += 5) {
                rgbaf[i] = rgba[i];
                rgbaf[i + 1] = Color.byteToFloat(rgba[i + 1]);
                rgbaf[i + 2] = Color.byteToFloat(rgba[i + 2]);
                rgbaf[i + 3] = Color.byteToFloat(rgba[i + 3]);
                rgbaf[i + 4] = Color.byteToFloat(rgba[i + 4]);
            }
            return rgbaf;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlColor.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Color instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlColor.unwrapInterval.
         * @param {Color} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Color instance if result was not defined.
         */
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


        /**
         * Given a packed array of red, green, blue, and alpha values, extracts a Color instance.
         *
         * @param {Array} array A packed array of Color values, where every four elements represents a Color.
         * @param {Number} startingIndex The index into the array that contains the red value of the Color you would like.
         * @param {Color} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Color instance if result was not defined.
         */
        getValueFromArray : function(array, startingIndex, result) {
            if (typeof result === 'undefined') {
                result = new Color();
            }
            result.red = array[startingIndex];
            result.green = array[startingIndex + 1];
            result.blue = array[startingIndex + 2];
            result.alpha = array[startingIndex + 3];
            return result;
        }
    };
    return CzmlColor;
});