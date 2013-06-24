/*global define*/
define([
        './barycentricCoordinates',
        './Cartesian3',
        './DeveloperError'
    ], function(
        barycentricCoordinates,
        Cartesian3,
        DeveloperError) {
    "use strict";

    var coords = new Cartesian3();

    /**
     * DOC_TBA
     *
     * @param point
     * @param p0
     * @param p1
     * @param p2
     *
     * @exports pointInsideTriangle2D
     *
     * @exception {DeveloperError} point, p0, p1, and p2 are required.
     */
    var pointInsideTriangle2D = function(point, p0, p1, p2) {
        barycentricCoordinates(point, p0, p1, p2, coords);
        return (coords.x > 0.0) && (coords.y > 0.0) && (coords.z > 0);
    };

    return pointInsideTriangle2D;
});
