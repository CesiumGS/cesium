/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/defined'
       ], function(
         Cartesian2,
         defined) {
    "use strict";

    /**
     * Provides methods for working with a Cartesian2 defined in CZML.
     *
     * @exports CzmlCartesian2
     */
    var CzmlCartesian2 = {
        type : Cartesian2,

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
            return unwrappedInterval.length > 2;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Cartesian2 instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlCartesian2.unwrapInterval.
         * @param {Cartesian2} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartesian2 instance if result was not defined.
         */
        getValue : function(unwrappedInterval, result) {
            if (!defined(result)) {
                result = new Cartesian2();
            }
            result.x = unwrappedInterval[0];
            result.y = unwrappedInterval[1];
            return result;
        }
    };

    return CzmlCartesian2;
});