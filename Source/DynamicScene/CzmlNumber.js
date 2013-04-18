/*global define*/
define(function() {
    "use strict";

    var doublesPerValue = 1;

    /**
     * Provides methods for working with a number defined in CZML.
     *
     * @exports CzmlNumber
     *
     * @see DynamicProperty
     * @see CzmlBoolean
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlPosition
     * @see CzmlColor
     * @see CzmlHorizontalOrigin
     * @see CzmlLabelStyle
     * @see CzmlString
     * @see CzmlUnitCartesian3
     * @see CzmlUnitQuaternion
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     */
    var CzmlNumber = {
        /**
         * The number of doubles per packed value.
         */
        doublesPerValue : doublesPerValue,

        /**
         * The number of doubles per packed value used for interpolation.
         */
        doublesPerInterpolationValue : doublesPerValue,

        /**
         * Returns the packed numerical representation contained within the provided CZML interval
         * or undefined if the interval does not contain numerical data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var result = czmlInterval.number;
            return typeof result === 'undefined' ? czmlInterval : result;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlNumber.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval);
        },

        /**
         * Returns the numerical value contained within the unwrappedInterval.  For numbers
         * this is the unwrappedInterval itself.
         *
         * @param {Object} unwrappedInterval The result of CzmlNumber.unwrapInterval.
         * @returns The boolean value.
         */
        getValue : function(unwrappedInterval) {
            return unwrappedInterval;
        },

        /**
         * Given a packed array of numerical values, returns the number at the given index..
         *
         * @param {Array} array An array of numbers.
         * @param {Number} startingIndex The index into the array that contains the value you would like.
         * @returns The value at the specified index.
         */
        getValueFromArray : function(array, startingIndex) {
            return array[startingIndex];
        }
    };

    return CzmlNumber;
});