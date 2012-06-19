/*global define*/
define([
        './Cartesian3',
        './Spherical'
       ], function(
        Cartesian3,
        Spherical) {
    "use strict";

    /**
     * Provides methods for converting between different coordinates.
     *
     * @exports CoordinateConversions
     *
     * @see Cartesian3
     * @see Spherical
     */
    var CoordinateConversions = {
        /**
         * Converts the provided Cartesian3 into Spherical coordinates.
         *
         * @param {Cartesian3} cartesian3 The Cartesian3 to be converted to Spherical.
         * @param {Spherical} [spherical] The object in which the result will be stored, if undefined a new instance will be created.
         *
         * @returns The modified result parameter, or a new instance if none was provided.
         */
        cartesian3ToSpherical : function(cartesian3, result) {
            if (typeof result === 'undefined') {
                result = new Spherical();
            }
            var x = cartesian3.x;
            var y = cartesian3.y;
            var z = cartesian3.z;
            var radialSquared = x * x + y * y;
            result.clock = Math.atan2(y, x);
            result.cone = Math.atan2(Math.sqrt(radialSquared), z);
            result.magnitude = Math.sqrt(radialSquared + z * z);
            return result;
        },

        /**
         * Converts the provided Spherical into Cartesian3 coordinates.
         *
         * @param {Spherical} spherical The Spherical to be converted to Cartesian3.
         * @param {Cartesian3} [cartesian3] The object in which the result will be stored, if undefined a new instance will be created.
         *
         * @returns The modified result parameter, or a new instance if none was provided.
         */
        sphericalToCartesian3 : function(spherical, result) {
            if (typeof result === 'undefined') {
                result = new Cartesian3();
            }
            var clock = spherical.clock;
            var cone = spherical.cone;
            var magnitude = spherical.magnitude;
            var radial = magnitude * Math.sin(cone);
            result.x = radial * Math.cos(clock);
            result.y = radial * Math.sin(clock);
            result.z = magnitude * Math.cos(cone);
            return result;
        },
    };
    return CoordinateConversions;
});
