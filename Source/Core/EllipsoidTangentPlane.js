/*global define*/
define([
        './AxisAlignedBoundingBox',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Ellipsoid',
        './IntersectionTests',
        './Matrix4',
        './Plane',
        './Ray',
        './Transforms'
    ], function(
        AxisAlignedBoundingBox,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        IntersectionTests,
        Matrix4,
        Plane,
        Ray,
        Transforms) {
    "use strict";

    var scratchCart4 = new Cartesian4();
    /**
     * A plane tangent to the provided ellipsoid at the provided origin.
     * If origin is not on the surface of the ellipsoid, it's surface projection will be used.
     * If origin as at the center of the ellipsoid, an exception will be thrown.
     * @alias EllipsoidTangentPlane
     * @constructor
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Cartesian3} origin The point on the surface of the ellipsoid where the tangent plane touches.
     *
     * @exception {DeveloperError} origin must not be at the center of the ellipsoid.
     */
    var EllipsoidTangentPlane = function(origin, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(origin)) {
            throw new DeveloperError('origin is required.');
        }
        //>>includeEnd('debug');

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        origin = ellipsoid.scaleToGeodeticSurface(origin);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(origin)) {
            throw new DeveloperError('origin must not be at the center of the ellipsoid.');
        }
        //>>includeEnd('debug');

        var eastNorthUp = Transforms.eastNorthUpToFixedFrame(origin, ellipsoid);
        this._ellipsoid = ellipsoid;
        this._origin = origin;
        this._xAxis = Cartesian3.fromCartesian4(Matrix4.getColumn(eastNorthUp, 0, scratchCart4));
        this._yAxis = Cartesian3.fromCartesian4(Matrix4.getColumn(eastNorthUp, 1, scratchCart4));

        var normal = Cartesian3.fromCartesian4(Matrix4.getColumn(eastNorthUp, 2, scratchCart4));
        this._plane = Plane.fromPointNormal(origin, normal);
    };

    defineProperties(EllipsoidTangentPlane.prototype, {
        /**
         * Gets the ellipsoid.
         * @memberof EllipsoidTangentPlane.prototype
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },

        /**
         * Gets the origin.
         * @memberof EllipsoidTangentPlane.prototype
         * @type {Cartesian3}
         */
        origin : {
            get : function() {
                return this._origin;
            }
        }
    });

    var tmp = new AxisAlignedBoundingBox();
    /**
     * Creates a new instance from the provided ellipsoid and the center
     * point of the provided Cartesians.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Cartesian3} cartesians The list of positions surrounding the center point.
     */
    EllipsoidTangentPlane.fromPoints = function(cartesians, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesians)) {
            throw new DeveloperError('cartesians is required.');
        }
        //>>includeEnd('debug');

        var box = AxisAlignedBoundingBox.fromPoints(cartesians, tmp);
        return new EllipsoidTangentPlane(box.center, ellipsoid);
    };

    var projectPointOntoPlaneRay = new Ray();
    var projectPointOntoPlaneCartesian3 = new Cartesian3();

    /**
     * Computes the projection of the provided 3D position onto the 2D plane.
     *
     * @param {Cartesian3} cartesian The point to project.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
     */
    EllipsoidTangentPlane.prototype.projectPointOntoPlane = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        var ray = projectPointOntoPlaneRay;
        ray.origin = cartesian;
        Cartesian3.normalize(cartesian, ray.direction);

        var intersectionPoint = IntersectionTests.rayPlane(ray, this._plane, projectPointOntoPlaneCartesian3);
        if (!defined(intersectionPoint)) {
            Cartesian3.negate(ray.direction, ray.direction);
            intersectionPoint = IntersectionTests.rayPlane(ray, this._plane, projectPointOntoPlaneCartesian3);
        }

        if (defined(intersectionPoint)) {
            var v = Cartesian3.subtract(intersectionPoint, this._origin, intersectionPoint);
            var x = Cartesian3.dot(this._xAxis, v);
            var y = Cartesian3.dot(this._yAxis, v);

            if (!defined(result)) {
                return new Cartesian2(x, y);
            }
            result.x = x;
            result.y = y;
            return result;
        }
        return undefined;
    };

    /**
     * Computes the projection of the provided 3D positions onto the 2D plane.
     *
     * @param {Cartesian3[]} cartesians The array of points to project.
     * @param {Cartesian2[]} [result] The array of Cartesian2 instances onto which to store results.
     * @returns {Cartesian2[]} The modified result parameter or a new array of Cartesian2 instances if none was provided.
     */
    EllipsoidTangentPlane.prototype.projectPointsOntoPlane = function(cartesians, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesians)) {
            throw new DeveloperError('cartesians is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = [];
        }

        var count = 0;
        var length = cartesians.length;
        for ( var i = 0; i < length; i++) {
            var p = this.projectPointOntoPlane(cartesians[i], result[count]);
            if (defined(p)) {
                result[count] = p;
                count++;
            }
        }
        result.length = count;
        return result;
    };


    var projectPointsOntoEllipsoidScratch = new Cartesian3();
    /**
     * Computes the projection of the provided 2D positions onto the 3D ellipsoid.
     *
     * @param {Cartesian2[]} cartesians The array of points to project.
     * @param {Cartesian3[]} [result] The array of Cartesian3 instances onto which to store results.
     * @returns {Cartesian3[]} The modified result parameter or a new array of Cartesian3 instances if none was provided.
     */
    EllipsoidTangentPlane.prototype.projectPointsOntoEllipsoid = function(cartesians, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesians)) {
            throw new DeveloperError('cartesians is required.');
        }
        //>>includeEnd('debug');

        var length = cartesians.length;
        if (!defined(result)) {
            result = new Array(length);
        } else {
            result.length = length;
        }

        var ellipsoid = this._ellipsoid;
        var origin = this._origin;
        var xAxis = this._xAxis;
        var yAxis = this._yAxis;
        var tmp = projectPointsOntoEllipsoidScratch;

        for ( var i = 0; i < length; ++i) {
            var position = cartesians[i];
            Cartesian3.multiplyByScalar(xAxis, position.x, tmp);
            if (!defined(result[i])) {
                result[i] = new Cartesian3();
            }
            var point = Cartesian3.add(origin, tmp, result[i]);
            Cartesian3.multiplyByScalar(yAxis, position.y, tmp);
            Cartesian3.add(point, tmp, point);
            ellipsoid.scaleToGeocentricSurface(point, point);
        }

        return result;
    };

    return EllipsoidTangentPlane;
});
