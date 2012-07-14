/*global define*/
define([
        './Cartesian3',
        './DeveloperError'
    ], function(
        Cartesian3,
        DeveloperError) {
    "use strict";

    /**
     * A plane in Hessian Normal Form defined by
     * <pre>
     * ax + by + cz + d = 0
     * </pre>
     * where (a, b, c) is the plane's <code>normal</code>, d is the signed
     * <code>distance</code> to the plane, and (x, y, z) is any point on
     * the plane.
     *
     * @alias Plane
     * @constructor
     *
     * @param {Cartesian3} normal The plane's normal (normalized).
     * @param {Number} distance The signed shortest distance to the plane.
     *
     * @exception {DeveloperError} normal and distance are required.
     *
     * @example
     * // The plane x=0
     * var plane = new Plane(Cartesian3.UNIT_X, 0.0);
     */
    var Plane = function(normal, distance) {
        if ((typeof normal === 'undefined') || (typeof distance === 'undefined'))  {
            throw new DeveloperError('normal and distance are required');
        }

        /**
         * The plane's normal.
         *
         * @type {Cartesian3}
         */
        this.normal = normal;

        /**
         * The shortest distance from the origin to the plane.  The sign of
         * <code>distance</code> determines which side of the plane the origin
         * is on.  If <code>distance</code> is positive, origin is in the half-space
         * in the direction of the normal; if negative, the origin is in the half-space
         * opposite to the normal; if zero, the plane passes through the origin.
         *
         * @type {Number}
         */
        this.distance = distance;
    };

    return Plane;
});