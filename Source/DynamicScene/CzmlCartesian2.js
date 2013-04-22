/*global define*/
define([
        '../Core/Cartesian2'
       ], function(
         Cartesian2) {
    "use strict";

    var doublesPerValue = 2;

    /**
     * Provides methods for working with a Cartesian2 defined in CZML.
     *
     * @exports CzmlCartesian2
     *
     * @see Cartesian2
     * @see DynamicProperty
     * @see CzmlBoolean
     * @see CzmlCartesian3
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
    var CzmlCartesian2 = {
        /**
         * The number of doubles per packed Cartesian2 value.
         */
        doublesPerValue : doublesPerValue,

        /**
         * The number of doubles per packed value used for interpolation.
         */
        doublesPerInterpolationValue : doublesPerValue,

        /**
         * Returns the packed Cartesian2 representation contained within the provided CZML interval
         * or undefined if the interval does not contain Cartesian2 data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            return czmlInterval.cartesian2;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlCartesian2.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerValue;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Cartesian2 instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlCartesian2.unwrapInterval.
         * @param {Cartesian2} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartesian2 instance if result was not defined.
         */
        getValue : function(unwrappedInterval, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian2();
            }
            result.x = unwrappedInterval[0];
            result.y = unwrappedInterval[1];
            return result;
        },

        /**
         * Given a packed array of x and y values, extracts a Cartesian2 instance.
         *
         * @param {Array} array A packed array of Cartesian2 values, where every two elements represents an x,y pair.
         * @param {Number} startingIndex The index into the array that contains the x value of the Cartesian2 you would like.
         * @param {Cartesian2} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartesian2 instance if result was not defined.
         */
        getValueFromArray : function(array, startingIndex, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian2();
            }
            result.x = array[startingIndex];
            result.y = array[startingIndex + 1];
            return result;
        }
    };

    return CzmlCartesian2;
});