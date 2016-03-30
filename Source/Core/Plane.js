/*global define*/
define([
        './Cartesian3',
        './defined',
        './DeveloperError',
        './freezeObject'
    ], function(
        Cartesian3,
        defined,
        DeveloperError,
        freezeObject) {
    'use strict';

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
     * @param {Number} distance The shortest distance from the origin to the plane.  The sign of
     * <code>distance</code> determines which side of the plane the origin
     * is on.  If <code>distance</code> is positive, the origin is in the half-space
     * in the direction of the normal; if negative, the origin is in the half-space
     * opposite to the normal; if zero, the plane passes through the origin.
     *
     * @example
     * // The plane x=0
     * var plane = new Cesium.Plane(Cesium.Cartesian3.UNIT_X, 0.0);
     */
    function Plane(normal, distance) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(normal))  {
            throw new DeveloperError('normal is required.');
        }
        if (!defined(distance)) {
            throw new DeveloperError('distance is required.');
        }
        //>>includeEnd('debug');

        /**
         * The plane's normal.
         *
         * @type {Cartesian3}
         */
        this.normal = Cartesian3.clone(normal);

        /**
         * The shortest distance from the origin to the plane.  The sign of
         * <code>distance</code> determines which side of the plane the origin
         * is on.  If <code>distance</code> is positive, the origin is in the half-space
         * in the direction of the normal; if negative, the origin is in the half-space
         * opposite to the normal; if zero, the plane passes through the origin.
         *
         * @type {Number}
         */
        this.distance = distance;
    }

    /**
     * Creates a plane from a normal and a point on the plane.
     *
     * @param {Cartesian3} point The point on the plane.
     * @param {Cartesian3} normal The plane's normal (normalized).
     * @param {Plane} [result] The object onto which to store the result.
     * @returns {Plane} A new plane instance or the modified result parameter.
     *
     * @example
     * var point = Cesium.Cartesian3.fromDegrees(-72.0, 40.0);
     * var normal = ellipsoid.geodeticSurfaceNormal(point);
     * var tangentPlane = Cesium.Plane.fromPointNormal(point, normal);
     */
    Plane.fromPointNormal = function(point, normal, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(point)) {
            throw new DeveloperError('point is required.');
        }
        if (!defined(normal)) {
            throw new DeveloperError('normal is required.');
        }
        //>>includeEnd('debug');

        var distance = -Cartesian3.dot(normal, point);

        if (!defined(result)) {
            return new Plane(normal, distance);
        }

        Cartesian3.clone(normal, result.normal);
        result.distance = distance;
        return result;
    };

    var scratchNormal = new Cartesian3();
    /**
     * Creates a plane from the general equation
     *
     * @param {Cartesian4} coefficients The plane's normal (normalized).
     * @param {Plane} [result] The object onto which to store the result.
     * @returns {Plane} A new plane instance or the modified result parameter.
     */
    Plane.fromCartesian4 = function(coefficients, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(coefficients)) {
            throw new DeveloperError('coefficients is required.');
        }
        //>>includeEnd('debug');

        var normal = Cartesian3.fromCartesian4(coefficients, scratchNormal);
        var distance = coefficients.w;

        if (!defined(result)) {
            return new Plane(normal, distance);
        } else {
            Cartesian3.clone(normal, result.normal);
            result.distance = distance;
            return result;
        }
    };

    /**
     * Computes the signed shortest distance of a point to a plane.
     * The sign of the distance determines which side of the plane the point
     * is on.  If the distance is positive, the point is in the half-space
     * in the direction of the normal; if negative, the point is in the half-space
     * opposite to the normal; if zero, the plane passes through the point.
     *
     * @param {Plane} plane The plane.
     * @param {Cartesian3} point The point.
     * @returns {Number} The signed shortest distance of the point to the plane.
     */
    Plane.getPointDistance = function(plane, point) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        if (!defined(point)) {
            throw new DeveloperError('point is required.');
        }
        //>>includeEnd('debug');

        return Cartesian3.dot(plane.normal, point) + plane.distance;
    };

    /**
     * A constant initialized to the XY plane passing through the origin, with normal in positive Z.
     *
     * @type {Plane}
     * @constant
     */
    Plane.ORIGIN_XY_PLANE = freezeObject(new Plane(Cartesian3.UNIT_Z, 0.0));

    /**
     * A constant initialized to the YZ plane passing through the origin, with normal in positive X.
     *
     * @type {Plane}
     * @constant
     */
    Plane.ORIGIN_YZ_PLANE = freezeObject(new Plane(Cartesian3.UNIT_X, 0.0));

    /**
     * A constant initialized to the ZX plane passing through the origin, with normal in positive Y.
     *
     * @type {Plane}
     * @constant
     */
    Plane.ORIGIN_ZX_PLANE = freezeObject(new Plane(Cartesian3.UNIT_Y, 0.0));

    return Plane;
});
