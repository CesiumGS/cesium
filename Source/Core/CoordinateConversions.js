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
         * @param {Spherical} [spherical=undefined] The Spherical in which the result will be stored.
         *
         * @returns The second parameter, or a new instance if none was provided, modified to contain the converted Cartesian3.
         */
        cartesian3ToSpherical : function(cartesian3, spherical) {
            if (typeof spherical === 'undefined') {
                spherical = new Spherical();
            }
            var x = cartesian3.x;
            var y = cartesian3.y;
            var z = cartesian3.z;
            var radialSquared = x * x + y * y;
            spherical.clock = Math.atan2(y, x);
            spherical.cone = Math.atan2(Math.sqrt(radialSquared), z);
            spherical.magnitude = Math.sqrt(radialSquared + z * z);
            return spherical;
        },

        /**
         * Converts the provided Spherical into Cartesian3 coordinates.
         *
         * @param {Spherical} spherical The Spherical to be converted to Cartesian3.
         * @param {Cartesian3} [cartesian3=undefined] The Cartesian3 in which the result will be stored.
         *
         * @returns The second parameter, or a new instance if none was provided, modified to contain the converted Spherical.
         */
        sphericalToCartesian3 : function(spherical, cartesian3) {
            if (typeof cartesian3 === 'undefined') {
                cartesian3 = new Cartesian3();
            }
            var clock = spherical.clock;
            var cone = spherical.cone;
            var magnitude = spherical.magnitude;
            var radial = magnitude * Math.sin(cone);
            cartesian3.x = radial * Math.cos(clock);
            cartesian3.y = radial * Math.sin(clock);
            cartesian3.z = magnitude * Math.cos(cone);
            return cartesian3;
        },
    };
    return CoordinateConversions;
});
