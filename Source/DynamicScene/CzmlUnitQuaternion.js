/*global define*/
define([
        '../Core/Quaternion',
        '../Core/defined'
    ], function(
        Quaternion,
        defined) {
    "use strict";

    var doublesPerQuaternion = 4;

    /**
     * Provides methods for working with a unit Quaternion defined in CZML.
     *
     * @exports CzmlUnitQuaternion
     */
    var CzmlUnitQuaternion = {
        type : Quaternion,

        /**
         * Returns the packed Quaternion representation contained within the provided CZML interval
         * or undefined if the interval does not contain Quaternion data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            return czmlInterval.unitQuaternion;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlUnitQuaternion.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return unwrappedInterval.length > doublesPerQuaternion;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Quaternion instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlUnitQuaternion.unwrapInterval.
         * @param {Cartesian3} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Quaternion instance if result was not defined.
         */
        getValue : function(unwrappedInterval, result) {
            if (!defined(result)) {
                result = new Quaternion();
            }
            result.x = unwrappedInterval[0];
            result.y = unwrappedInterval[1];
            result.z = unwrappedInterval[2];
            result.w = unwrappedInterval[3];
            return result.normalize(result);
        }
    };

    return CzmlUnitQuaternion;
});