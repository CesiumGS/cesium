/*global define*/
define([
        './DeveloperError',
        './Transforms',
        './AxisAlignedBoundingBox',
        './IntersectionTests',
        './Cartesian2',
        './Cartesian3',
        './Ray'
    ], function(
        DeveloperError,
        Transforms,
        AxisAlignedBoundingBox,
        IntersectionTests,
        Cartesian2,
        Cartesian3,
        Ray) {
    "use strict";

    /**
     * A plane tangent to the provided ellipsoid at the provided origin.
     * If origin is not on the surface of the ellipsoid, it's surface projection will be used.
     * @alias EllipsoidTangentPlane
     * @constructor
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Cartesian3} origin The surface of the ellipsoid which the tangent plane touches.
     */
    var EllipsoidTangentPlane = function (ellipsoid, origin) {
        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid isrequired.');
        }

        if (typeof origin === 'undefined') {
            throw new DeveloperError('origin is required.');
        }

        origin = ellipsoid.scaleToGeodeticSurface(origin);
        var eastNorthUp = Transforms.eastNorthUpToFixedFrame(origin, ellipsoid);
        this._ellipsoid = ellipsoid;
        this._origin = Cartesian3.clone(origin);
        this._xAxis = Cartesian3.fromCartesian4(eastNorthUp.getColumn(0));
        this._yAxis = Cartesian3.fromCartesian4(eastNorthUp.getColumn(1));
        this._normal = Cartesian3.fromCartesian4(eastNorthUp.getColumn(2));
        this._direction = -Cartesian3.dot(origin, origin);
    };

    var tmp = new AxisAlignedBoundingBox();
    /**
     * Creates a new instance from the provided ellipsoid and the center
     * point of the provided Cartesians.
     * @memberof EllipsoidTangentPlane
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Cartesian3} cartesians The list of positions surrounding the center point.
     */
    EllipsoidTangentPlane.fromPoints = function(ellipsoid, cartesians) {
        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid isrequired.');
        }

        if (typeof cartesians === 'undefined') {
            throw new DeveloperError('cartesians is required.');
        }

        var box = AxisAlignedBoundingBox.fromPoints(cartesians, tmp);
        return new EllipsoidTangentPlane(ellipsoid, box.center);
    };

    /**
     * @memberof EllipsoidTangentPlane
     * @returns {Ellipsoid} Gets the ellipsoid.
     */
    EllipsoidTangentPlane.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * @memberof EllipsoidTangentPlane
     * @returns {Cartesian3} Gets the origin.
     */
    EllipsoidTangentPlane.prototype.getOrigin = function() {
        return this._origin;
    };

    var projectPointOntoPlaneRay = new Ray();
    var projectPointOntoPlaneCartesian3 = new Cartesian3();

    /**
     * Computes the projection of the provided 3D position onto the 2D plane.
     * @memberof EllipsoidTangentPlane
     *
     * @param {Cartesian3} cartesian The point to project.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @return {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
     */
    EllipsoidTangentPlane.prototype.projectPointOntoPlane = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required.');
        }

        projectPointOntoPlaneRay.origin = cartesian;
        Cartesian3.normalize(cartesian, projectPointOntoPlaneRay.direction);
        var intersectionPoint = IntersectionTests.rayPlane(projectPointOntoPlaneRay, this._normal, this._direction, projectPointOntoPlaneCartesian3);

        if (typeof intersectionPoint !== 'undefined') {
            var v = intersectionPoint.subtract(this._origin, intersectionPoint);
            var x = this._xAxis.dot(v);
            var y = this._yAxis.dot(v);

            if (typeof result === 'undefined') {
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
     * @memberof EllipsoidTangentPlane
     *
     * @param {Array} cartesians The array of points to project.
     * @param {Array} [result] The array of Cartesian2 instances onto which to store results.
     * @return {Array} The modified result parameter or a new array of Cartesian2 instances if none was provided.
     */
    EllipsoidTangentPlane.prototype.projectPointsOntoPlane = function(cartesians, result) {
        if (typeof cartesians === 'undefined') {
            throw new DeveloperError('cartesians is required.');
        }

        if (typeof result === 'undefined') {
            result = [];
        }

        var count = 0;
        var length = cartesians.length;
        for ( var i = 0; i < length; i++) {
            var p = this.projectPointOntoPlane(cartesians[i], result[count]);
            if (typeof p !== 'undefined') {
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
     * @memberof EllipsoidTangentPlane
     *
     * @param {Array} cartesians The array of points to project.
     * @param {Array} [result] The array of Cartesian3 instances onto which to store results.
     * @return {Array} The modified result parameter or a new array of Cartesian3 instances if none was provided.
     */
    EllipsoidTangentPlane.prototype.projectPointsOntoEllipsoid = function(cartesians, result) {
        if (typeof cartesians === 'undefined') {
            throw new DeveloperError('cartesians is required.');
        }

        var length = cartesians.length;
        if (typeof result === 'undefined') {
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
            xAxis.multiplyByScalar(position.x, tmp);
            var point = result[i] = Cartesian3.add(origin, tmp, result[i]);
            yAxis.multiplyByScalar(position.y, tmp);
            Cartesian3.add(point, tmp, point);
            ellipsoid.scaleToGeocentricSurface(point, point);
        }

        return result;
    };

    return EllipsoidTangentPlane;
});