/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined'
       ], function(
         Cartesian3,
         defined) {
    "use strict";

    var length = 3;

    /**
     * Provides methods for working with a Cartesian3 defined in CZML.
     *
     * @exports CzmlCartesian3
     */
    var CzmlCartesian3 = {
        type : Cartesian3,
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
            return unwrappedInterval.length > length;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Cartesian3 instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlCartesian3.unwrapInterval.
         * @param {Cartesian3} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Cartesian3 instance if result was not defined.
         */
        getValue : function(unwrappedInterval, result) {
            if (!defined(result)) {
                result = new Cartesian3();
            }
            result.x = unwrappedInterval[0];
            result.y = unwrappedInterval[1];
            result.z = unwrappedInterval[2];
            return result;
        }
    };

    return CzmlCartesian3;
});