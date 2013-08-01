/*global define*/
define([
        './Cartesian3',
        './DeveloperError'
    ], function(
        Cartesian3,
        DeveloperError) {
    "use strict";

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();

    /**
     * Computes the barycentric coordinates for a point with respect to a triangle.
     *
     * @exports pointInsideTriangle
     *
     * @param {Cartesian2|Cartesian3} point The point to test.
     * @param {Cartesian2|Cartesian3} p0 The first point of the triangle, corresponding to the barycentric x-axis.
     * @param {Cartesian2|Cartesian3} p1 The second point of the triangle, corresponding to the barycentric y-axis.
     * @param {Cartesian2|Cartesian3} p2 The third point of the triangle, corresponding to the barycentric z-axis.
     * @param {Cartesian3} [result] The object onto which to store the result.
     *
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @exception {DeveloperError} point, p0, p1, and p2 are required.
     *
     * @example
     * // Returns Cartesian3.UNIT_X
     * var p = new Cartesian3(-1.0, 0.0, 0.0);
     * var b = barycentricCoordinates(p,
     *   new Cartesian3(-1.0, 0.0, 0.0),
     *   new Cartesian3( 1.0, 0.0, 0.0),
     *   new Cartesian3( 0.0, 1.0, 1.0));
     */
    var barycentricCoordinates = function(point, p0, p1, p2, result) {
        if (typeof point === 'undefined' || typeof p0 === 'undefined' || typeof p1 === 'undefined' || typeof p2 === 'undefined') {
            throw new DeveloperError('point, p0, p1, and p2 are required.');
        }

        if (typeof result === 'undefined') {
            result = new Cartesian3();
        }

        // Implementation based on http://www.blackpawn.com/texts/pointinpoly/default.html.
        var v0 = p1.subtract(p0, scratchCartesian1);
        var v1 = p2.subtract(p0, scratchCartesian2);
        var v2 = point.subtract(p0, scratchCartesian3);

        var dot00 = v0.dot(v0);
        var dot01 = v0.dot(v1);
        var dot02 = v0.dot(v2);
        var dot11 = v1.dot(v1);
        var dot12 = v1.dot(v2);

        var q = 1.0 / (dot00 * dot11 - dot01 * dot01);
        result.y = (dot11 * dot02 - dot01 * dot12) * q;
        result.z = (dot00 * dot12 - dot01 * dot02) * q;
        result.x = 1.0 - result.y - result.z;
        return result;
    };

    return barycentricCoordinates;
});