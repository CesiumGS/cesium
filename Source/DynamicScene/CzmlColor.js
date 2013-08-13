/*global define*/
define([
        '../Core/Color',
        '../Core/defined'
    ], function(
        Color,
        defined) {
    "use strict";

    var length = 4;

    /**
     * Provides methods for working with a Color defined in CZML.
     *
     * @exports CzmlColor
     */
    var CzmlColor = {
        type : Color,

        /**
         * Returns the packed Color representation contained within the provided CZML interval
         * or undefined if the interval does not contain Color data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var rgbaf = czmlInterval.rgbaf;
            if (defined(rgbaf)) {
                return rgbaf;
            }

            var rgba = czmlInterval.rgba;
            if (!defined(rgba)) {
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
            return unwrappedInterval.length > length;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Color instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlColor.unwrapInterval.
         * @param {Color} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Color instance if result was not defined.
         */
        getValue : function(unwrappedInterval, result) {
            if (!defined(result)) {
                result = new Color();
            }
            result.red = unwrappedInterval[0];
            result.green = unwrappedInterval[1];
            result.blue = unwrappedInterval[2];
            result.alpha = unwrappedInterval[3];
            return result;
        }
    };
    return CzmlColor;
});