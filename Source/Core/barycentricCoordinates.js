/*global define*/
define([
        './Cartesian2',
        './Cartesian3',
        './defined',
        './DeveloperError'
    ], function(
        Cartesian2,
        Cartesian3,
        defined,
        DeveloperError) {
    'use strict';

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();

    /**
     * Computes the barycentric coordinates for a point with respect to a triangle.
     *
     * @exports barycentricCoordinates
     *
     * @param {Cartesian2|Cartesian3} point The point to test.
     * @param {Cartesian2|Cartesian3} p0 The first point of the triangle, corresponding to the barycentric x-axis.
     * @param {Cartesian2|Cartesian3} p1 The second point of the triangle, corresponding to the barycentric y-axis.
     * @param {Cartesian2|Cartesian3} p2 The third point of the triangle, corresponding to the barycentric z-axis.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @example
     * // Returns Cartesian3.UNIT_X
     * var p = new Cesium.Cartesian3(-1.0, 0.0, 0.0);
     * var b = Cesium.barycentricCoordinates(p,
     *   new Cesium.Cartesian3(-1.0, 0.0, 0.0),
     *   new Cesium.Cartesian3( 1.0, 0.0, 0.0),
     *   new Cesium.Cartesian3( 0.0, 1.0, 1.0));
     */
    function barycentricCoordinates(point, p0, p1, p2, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(point) || !defined(p0) || !defined(p1) || !defined(p2)) {
            throw new DeveloperError('point, p0, p1, and p2 are required.');
        }
        //>>includeEnd('debug');


        if (!defined(result)) {
            result = new Cartesian3();
        }

        // Implementation based on http://www.blackpawn.com/texts/pointinpoly/default.html.
        var v0, v1, v2;
        var dot00, dot01, dot02, dot11, dot12;

        if(!defined(p0.z)) {
          v0 = Cartesian2.subtract(p1, p0, scratchCartesian1);
          v1 = Cartesian2.subtract(p2, p0, scratchCartesian2);
          v2 = Cartesian2.subtract(point, p0, scratchCartesian3);

          dot00 = Cartesian2.dot(v0, v0);
          dot01 = Cartesian2.dot(v0, v1);
          dot02 = Cartesian2.dot(v0, v2);
          dot11 = Cartesian2.dot(v1, v1);
          dot12 = Cartesian2.dot(v1, v2);
        } else {
          v0 = Cartesian3.subtract(p1, p0, scratchCartesian1);
          v1 = Cartesian3.subtract(p2, p0, scratchCartesian2);
          v2 = Cartesian3.subtract(point, p0, scratchCartesian3);

          dot00 = Cartesian3.dot(v0, v0);
          dot01 = Cartesian3.dot(v0, v1);
          dot02 = Cartesian3.dot(v0, v2);
          dot11 = Cartesian3.dot(v1, v1);
          dot12 = Cartesian3.dot(v1, v2);
        }

        var q = 1.0 / (dot00 * dot11 - dot01 * dot01);
        result.y = (dot11 * dot02 - dot01 * dot12) * q;
        result.z = (dot00 * dot12 - dot01 * dot02) * q;
        result.x = 1.0 - result.y - result.z;
        return result;
    }

    return barycentricCoordinates;
});
