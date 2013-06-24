/*global define*/
define([
        './Cartesian3',
        './DeveloperError'
    ], function(
        Cartesian3,
        DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     */
    var barycentricCoordinates = function(point, p0, p1, p2, result) {
        if (typeof point === 'undefined' || typeof p0 === 'undefined' || typeof p1 === 'undefined' || typeof p2 === 'undefined') {
            throw new DeveloperError('point, p0, p1, and p2 are required.');
        }

        if (typeof result === 'undefined') {
            result = new Cartesian3();
        }

        // Implementation based on http://www.blackpawn.com/texts/pointinpoly/default.html.
        var v0 = p1.subtract(p0);
        var v1 = p2.subtract(p0);
        var v2 = point.subtract(p0);

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