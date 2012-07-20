/*global define*/
define([
        '../Core/Cartographic',
        '../Core/Math'
       ], function(
         Cartographic,
         CesiumMath) {
    "use strict";

    var doublesPerValue = 3;

    /**
     * Provides methods for working with a Cartographic defined in CZML.
     *
     * @exports CzmlCartographic
     *
     * @see Cartographic
     * @see DynamicProperty
     * @see DynamicPositionProperty
     * @see CzmlBoolean
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlColor
     * @see CzmlHorizontalOrigin
     * @see CzmlLabelStyle
     * @see CzmlNumber
     * @see CzmlString
     * @see CzmlUnitCartesian3
     * @see CzmlUnitQuaternion
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     */
    var CzmlCartographic = {
        /**
         * The number of doubles per packed Cartographic value.
         */
        doublesPerValue : doublesPerValue,

        /**
         * The number of doubles per packed value used for interpolation.
         */
        doublesPerInterpolationValue : doublesPerValue,

        /**
         * Returns the packed Cartographic representation contained within the provided CZML interval
         * or undefined if the interval does not contain Cartographic data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var cartographic = czmlInterval.cartographicRadians;
            if (typeof cartographic !== 'undefined') {
                return cartographic;
            }

            var cartographicDegrees = czmlInterval.cartographicDegrees;
            if (typeof cartographicDegrees === 'undefined') {
                return undefined;
            }

            if (!this.isSampled(cartographicDegrees)) {
                return [CesiumMath.toRadians(cartographicDegrees[0]),
                        CesiumMath.toRadians(cartographicDegrees[1]),
                        cartographicDegrees[2]];
            }

            var len = cartographicDegrees.length;
            cartographic = new Array(len);
            for ( var i = 0; i < len; i += 4) {
                cartographic[i] = cartographicDegrees[i];
                cartographic[i + 1] = CesiumMath.toRadians(cartographicDegrees[i + 1]);
                cartographic[i + 2] = CesiumMath.toRadians(cartographicDegrees[i + 2]);
                cartographic[i + 3] = cartographicDegrees[i + 3];
            }
            return cartographic;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlCartographic.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Cartographic instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlCartographic.unwrapInterval.
         * @param {Cartographic} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartographic instance if result was not defined.
         */
        getValue : function(unwrappedInterval, result) {
            if (typeof result === 'undefined') {
                result = new Cartographic();
            }
            result.longitude = unwrappedInterval[0];
            result.latitude = unwrappedInterval[1];
            result.height = unwrappedInterval[2];
            return result;
        },

        /**
         * Given a packed array of longitude, latitude, and height values, extracts a Cartographic instance.
         *
         * @param {Array} array A packed array of Cartographic values, where every three elements represents a Cartographic.
         * @param {Number} startingIndex The index into the array that contains the longitude value of the Cartographic you would like.
         * @param {Cartographic} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartographic instance if result was not defined.
         */
        getValueFromArray : function(array, startingIndex, result) {
            if (typeof result === 'undefined') {
                result = new Cartographic();
            }
            result.longitude = array[startingIndex];
            result.latitude = array[startingIndex + 1];
            result.height = array[startingIndex + 2];
            return result;
        }
    };

    return CzmlCartographic;
});