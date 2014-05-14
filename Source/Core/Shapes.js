/*global define*/
define([
        './defaultValue',
        './Math',
        './Cartesian2'
    ], function(
        defaultValue,
        CesiumMath,
        Cartesian2) {
    "use strict";

    /**
     * Functions to compute the boundary positions for shapes.
     *
     * @exports Shapes
     */
    var Shapes = {
        /**
         * Computes a 2D circle about the origin.
         *
         * @param {Number} [radius = 1.0] The radius of the circle
         * @param {Number} [granularity = Cesium.RADIANS_PER_DEGREE*2] The radius of the circle
         *
         * @returns The set of points that form the ellipse's boundary.
         *
         * @example
         * var circle = Cesium.Shapes.compute2DCircle(100000.0);
         */
        compute2DCircle : function(radius, granularity) {
            radius = defaultValue(radius, 1.0);
            granularity = defaultValue(granularity, CesiumMath.RADIANS_PER_DEGREE*2);
            var positions = [];
            var theta = CesiumMath.toRadians(1.0);
            var posCount = Math.PI*2/theta;
            for (var i = 0; i < posCount; i++) {
                positions.push(new Cartesian2(radius * Math.cos(theta * i), radius * Math.sin(theta * i)));
            }
            return positions;
        }
    };

    return Shapes;
});
