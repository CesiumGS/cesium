/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/Spherical',
        '../Core/Math',
        '../Core/Ellipsoid'
       ], function(
         Cartesian3,
         defined,
         Spherical,
         CesiumMath,
         Ellipsoid) {
    "use strict";

    var scratchCartesian = new Cartesian3();
    var scratchSpherical = new Spherical();

    /**
     * Provides methods for working with a direction defined in CZML.
     *
     * @exports CzmlDirection
     */
    var CzmlDirection = {
        type : Cartesian3,

        /**
         * Returns the packed Cartesian3 representation contained within the provided CZML interval
         * or undefined if the interval does not contain Cartesian3 data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            var unitCartesian = czmlInterval.unitCartesian;
            if (defined(unitCartesian)) {
                return unitCartesian;
            }

            var unitSpherical = czmlInterval.unitSpherical;
            if (defined(unitSpherical)) {
                var len = unitSpherical.length;
                if (len === 2) {
                    scratchSpherical.clock = unitSpherical[0];
                    scratchSpherical.cone = unitSpherical[1];
                    Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);
                    unitCartesian = [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
                } else {
                    var sphericalIt = 0;
                    unitCartesian = new Array((len / 3) * 4);
                    for ( var i = 0; i < len; i += 4) {
                        unitCartesian[i] = unitSpherical[sphericalIt++];

                        scratchSpherical.clock = unitSpherical[sphericalIt++];
                        scratchSpherical.cone = unitSpherical[sphericalIt++];
                        Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);

                        unitCartesian[i + 1] = scratchCartesian.x;
                        unitCartesian[i + 2] = scratchCartesian.y;
                        unitCartesian[i + 3] = scratchCartesian.z;
                    }
                }
            }
            return unitCartesian;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlDirection.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return unwrappedInterval.length > 3;
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Cartesian3 instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlDirection.unwrapInterval.
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

    return CzmlDirection;
});