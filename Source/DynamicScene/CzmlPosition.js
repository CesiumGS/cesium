/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Math',
        '../Core/Ellipsoid'
       ], function(
         Cartesian3,
         Cartographic,
         CesiumMath,
         Ellipsoid) {
    "use strict";

    var doublesPerValue = 3;
    var scratchCartesian = new Cartesian3();
    var scratchCartographic = new Cartographic();

    /**
     * Provides methods for working with a position defined in CZML.
     *
     * @exports CzmlPosition
     *
     * @see Cartesian3
     * @see Cartographic
     * @see DynamicProperty
     * @see DynamicPositionProperty
     * @see CzmlBoolean
     * @see CzmlCartesian2
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
    var CzmlPosition = {
         /**
         * The number of doubles per packed Cartesian3 value.
         */
        doublesPerValue : doublesPerValue,

        /**
         * The number of doubles per packed value used for interpolation.
         */
        doublesPerInterpolationValue : doublesPerValue,

        /**
         * Returns the packed Cartesian3 representation contained within the provided CZML interval
         * or undefined if the interval does not contain Cartesian3 data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var cartesian = czmlInterval.cartesian;
            if (typeof cartesian !== 'undefined') {
                return cartesian;
            }

            var i;
            var len;
            var tmp = scratchCartesian;
            var cartographic = czmlInterval.cartographicRadians;
            if (typeof cartographic !== 'undefined') {
                if (!this.isSampled(cartographic)) {
                    scratchCartographic.longitude = cartographic[0];
                    scratchCartographic.latitude = cartographic[1];
                    scratchCartographic.height = cartographic[2];
                    Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, tmp);
                    cartesian = [tmp.x, tmp.y, tmp.z];
                } else {
                    len = cartographic.length;
                    cartesian = new Array(len);
                    for (i = 0; i < len; i += 4) {
                        scratchCartographic.longitude = cartographic[i + 1];
                        scratchCartographic.latitude = cartographic[i + 2];
                        scratchCartographic.height = cartographic[i + 3];
                        Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, tmp);

                        cartesian[i] = cartographic[i];
                        cartesian[i + 1] = tmp.x;
                        cartesian[i + 2] = tmp.y;
                        cartesian[i + 3] = tmp.z;
                    }
                }
            } else {
                var cartographicDegrees = czmlInterval.cartographicDegrees;
                if (typeof cartographicDegrees === 'undefined') {
                    return undefined;
                }

                if (!this.isSampled(cartographicDegrees)) {
                    scratchCartographic.longitude = CesiumMath.toRadians(cartographicDegrees[0]);
                    scratchCartographic.latitude = CesiumMath.toRadians(cartographicDegrees[1]);
                    scratchCartographic.height = cartographicDegrees[2];
                    Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, tmp);
                    cartesian = [tmp.x, tmp.y, tmp.z];
                } else {
                    len = cartographicDegrees.length;
                    cartesian = new Array(len);
                    for (i = 0; i < len; i += 4) {
                        scratchCartographic.longitude = CesiumMath.toRadians(cartographicDegrees[i + 1]);
                        scratchCartographic.latitude = CesiumMath.toRadians(cartographicDegrees[i + 2]);
                        scratchCartographic.height = cartographicDegrees[i + 3];
                        Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, tmp);

                        cartesian[i] = cartographicDegrees[i];
                        cartesian[i + 1] = tmp.x;
                        cartesian[i + 2] = tmp.y;
                        cartesian[i + 3] = tmp.z;
                    }
                }
            }
            return cartesian;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlPosition.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Cartesian3 instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlPosition.unwrapInterval.
         * @param {Cartesian3} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartesian3 instance if result was not defined.
         */
        getValue : function(unwrappedInterval, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian3();
            }
            result.x = unwrappedInterval[0];
            result.y = unwrappedInterval[1];
            result.z = unwrappedInterval[2];
            return result;
        },

        /**
         * Given a packed array of x, y, and z values, extracts a Cartesian3 instance.
         *
         * @param {Array} array A packed array of Cartesian3 values, where every three elements represents a Cartesian3.
         * @param {Number} startingIndex The index into the array that contains the x value of the Cartesian3 you would like.
         * @param {Cartesian3} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartesian3 instance if result was not defined.
         */
        getValueFromArray : function(array, startingIndex, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian3();
            }
            result.x = array[startingIndex];
            result.y = array[startingIndex + 1];
            result.z = array[startingIndex + 2];
            return result;
        }
    };

    return CzmlPosition;
});