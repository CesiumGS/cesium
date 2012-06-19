/*global define*/
define([
        './DeveloperError',
        './Transforms',
        './AxisAlignedBoundingBox',
        './IntersectionTests',
        './Cartesian2',
        './Cartesian3'
    ], function(
        DeveloperError,
        Transforms,
        AxisAlignedBoundingBox,
        IntersectionTests,
        Cartesian2,
        Cartesian3) {
    "use strict";

    /**
     * DOC_TBA
     * @name EllipsoidTangentPlane
     * @constructor
     *
     * @param {Ellipsoid} ellipsoid
     * @param {Cartesian3} origin
     */
    function EllipsoidTangentPlane(ellipsoid, origin) {
        var o = Cartesian3.clone(origin);
        var eastNorthUp = Transforms.eastNorthUpToFixedFrame(o, ellipsoid);

        this.origin = o;
        this.xAxis = eastNorthUp.getColumn0().getXYZ();
        this.yAxis = eastNorthUp.getColumn1().getXYZ();
        this.normal = eastNorthUp.getColumn2().getXYZ();
        this.d = -o.dot(o);
        this.ellipsoid = ellipsoid;
    }

    /**
     * DOC_TBA
     * @memberof EllipsoidTangentPlane
     */
    EllipsoidTangentPlane.create = function(ellipsoid, positions) {
        if (!ellipsoid || !positions) {
            throw new DeveloperError('ellipsoid and positions are required.');
        }

        var box = new AxisAlignedBoundingBox(positions);
        var origin = ellipsoid.scaleToGeodeticSurface(box.center);
        return new EllipsoidTangentPlane(ellipsoid, origin);
    };

    /**
     * DOC_TBA
     * @memberof EllipsoidTangentPlane
     */
    EllipsoidTangentPlane.prototype.projectPointsOntoPlane = function(positions) {
        if (!positions) {
            throw new DeveloperError('positions is required.');
        }

        var positionsOnPlane = [];

        var length = positions.length;
        for ( var i = 0; i < length; ++i) {
            var p = this.projectPointOntoPlane(positions[i]);
            if (p) {
                positionsOnPlane.push(p);
            }
        }

        return positionsOnPlane;
    };

    /**
     * DOC_TBA
     * @memberof EllipsoidTangentPlane
     */
    EllipsoidTangentPlane.prototype.projectPointOntoPlane = function(position) {
        if (position) {
            var pos = Cartesian3.clone(position);
            var intersectionPoint = IntersectionTests.rayPlane(pos, pos.normalize(), this.normal, this.d);

            if (intersectionPoint) {
                var v = intersectionPoint.subtract(this.origin);
                return new Cartesian2(this.xAxis.dot(v), this.yAxis.dot(v));
            }
        }
    };

    /**
     * DOC_TBA
     * @memberof EllipsoidTangentPlane
     */
    EllipsoidTangentPlane.prototype.projectPointsOntoEllipsoid = function(positions) {
        if (!positions) {
            throw new DeveloperError('positions is required.');
        }

        var positionsOnEllipsoid = [];

        var length = positions.length;
        for ( var i = 0; i < length; ++i) {
            var p = this.origin;
            p = p.add(this.xAxis.multiplyWithScalar(positions[i].x));
            p = p.add(this.yAxis.multiplyWithScalar(positions[i].y));

            positionsOnEllipsoid.push(this.ellipsoid.scaleToGeocentricSurface(p));
        }

        return positionsOnEllipsoid;
    };

    return EllipsoidTangentPlane;
});