/*global define*/
define([
        '../Core/Cartesian3'
       ], function(
         Cartesian3) {
    "use strict";

    var doublesPerValue = 3;

    /**
     * Provides methods for working with a Cartesian3 defined in CZML.
     *
     * @exports CzmlCartesian3
     *
     * @see Cartesian3
     * @see DynamicProperty
     * @see DynamicPositionProperty
     * @see CzmlBoolean
     * @see CzmlCartesian2
     * @see CzmlPosition
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
    var CzmlCartesian3 = {
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
            return czmlInterval.cartesian;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlCartesian3.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Cartesian3 instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlCartesian3.unwrapInterval.
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

    return CzmlCartesian3;
});