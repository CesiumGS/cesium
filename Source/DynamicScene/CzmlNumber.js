/*global define*/
define([
        '../Core/defaultValue',
        '../Core/InterpolatableNumber'
    ], function(
        defaultValue,
        InterpolatableNumber) {
    "use strict";

    /**
     * Provides methods for working with a number defined in CZML.
     *
     * @exports CzmlNumber
     */
    var CzmlNumber = {
        type : InterpolatableNumber,

        /**
         * Returns the packed numerical representation contained within the provided CZML interval
         * or undefined if the interval does not contain numerical data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            return defaultValue(czmlInterval.number, czmlInterval);
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
        }
    };

    return CzmlNumber;
});