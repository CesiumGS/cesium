/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian2',
        './Cartesian3',
        './Quaternion',
        './Matrix3'
    ], function(
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Cartesian3,
        Quaternion,
        Matrix3) {
    "use strict";

    function _computeEllipseQuadrant(cb, cbRadius, aSqr, bSqr, ab, ecc, mag, unitPos, eastVec, northVec, bearing,
                                     thetaPts, thetaPtsIndex, offset, clockDir, ellipsePts, ellipsePtsIndex, numPts) {
        var angle;
        var theta;
        var radius;
        var azimuth;
        var temp;
        var temp2;
        var rotAxis;
        var tempVec;

        for (var i = 0; i < numPts; i++, thetaPtsIndex += clockDir, ++ellipsePtsIndex) {
            theta = (clockDir > 0) ? (thetaPts[thetaPtsIndex] + offset) : (offset - thetaPts[thetaPtsIndex]);

            azimuth = theta + bearing;

            temp = -Math.cos(azimuth);

            rotAxis = eastVec.multiplyByScalar(temp);

            temp = Math.sin(azimuth);
            tempVec = northVec.multiplyByScalar(temp);

            rotAxis = rotAxis.add(tempVec);

            temp = Math.cos(theta);
            temp = temp * temp;

            temp2 = Math.sin(theta);
            temp2 = temp2 * temp2;

            radius = ab / Math.sqrt(bSqr * temp + aSqr * temp2);
            angle = radius / cbRadius;

            // Create the quaternion to rotate the position vector to the boundary of the ellipse.
            temp = Math.sin(angle / 2.0);

            var unitQuat = (new Quaternion(rotAxis.x * temp, rotAxis.y * temp, rotAxis.z * temp, Math.cos(angle / 2.0))).normalize();
            var rotMtx = Matrix3.fromQuaternion(unitQuat);

            var tmpEllipsePts = rotMtx.multiplyByVector(unitPos);
            var unitCart = tmpEllipsePts.normalize();
            tmpEllipsePts = unitCart.multiplyByScalar(mag);
            ellipsePts[ellipsePtsIndex] = tmpEllipsePts;
        }
    }

    /**
     * Functions to compute the boundary positions for shapes, such as circles,
     * drawn on the ellipsoid.
     *
     * @exports Shapes
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Circles%20and%20Ellipses.html">Cesium Sandcastle Circles and Ellipses Demo</a>
     */
    var Shapes = {
        /**
         * Computes boundary points for a circle on the ellipsoid.
         * <br /><br />
         * The <code>granularity</code> determines the number of points
         * in the boundary.  A lower granularity results in more points and a more
         * exact circle.
         * <br /><br />
         * An outlined circle is rendered by passing the result of this function call to
         * {@link Polyline#setPositions}.  A filled circle is rendered by passing
         * the result to {@link Polygon#setPositions}.
         *
         * @param {Ellipsoid} ellipsoid The ellipsoid the circle will be on.
         * @param {Cartesian3} center The circle's center point in the fixed frame.
         * @param {Number} radius The radius in meters.
         * @param {Number} [granularity] The angular distance between points on the circle.
         *
         * @exception {DeveloperError} ellipsoid, center, and radius are required.
         * @exception {DeveloperError} radius must be greater than zero.
         * @exception {DeveloperError} granularity must be greater than zero.
         *
         * @see Polyline#setPositions
         * @see Polygon#setPositions
         *
         * @example
         * // Create a polyline of a circle
         * var polyline = new Polyline();
         * polyline.setPositions(Shapes.computeCircleBoundary(
         *   ellipsoid, ellipsoid.cartographicToCartesian(
         *     Cartographic.fromDegrees(-75.59777, 40.03883, 0.0)), 100000.0));
         */
        computeCircleBoundary : function(ellipsoid, center, radius, granularity) {
            if (!ellipsoid || !center || !radius) {
                throw new DeveloperError('ellipsoid, center, and radius are required.');
            }

            if (radius <= 0.0) {
                throw new DeveloperError('radius must be greater than zero.');
            }

            granularity = granularity || CesiumMath.toRadians(1.0);
            if (granularity <= 0.0) {
                throw new DeveloperError('granularity must be greater than zero.');
            }

            return this.computeEllipseBoundary(ellipsoid, center, radius, radius, 0, granularity);
        },

        /**
         * Computes boundary points for an ellipse on the ellipsoid.
         * <br /><br />
         * The <code>granularity</code> determines the number of points
         * in the boundary.  A lower granularity results in more points and a more
         * exact circle.
         * <br /><br />
         * An outlined ellipse is rendered by passing the result of this function call to
         * {@link Polyline#setPositions}.  A filled ellipse is rendered by passing
         * the result to {@link Polygon#setPositions}.
         *
         * @param {Ellipsoid} ellipsoid The ellipsoid the ellipse will be on.
         * @param {Cartesian3} center The ellipse's center point in the fixed frame.
         * @param {Number} semiMajorAxis The length of the ellipse's semi-major axis in meters.
         * @param {Number} semiMinorAxis The length of the ellipse's semi-minor axis in meters.
         * @param {Number} [bearing] The angle from north (clockwise) in radians. The default is zero.
         * @param {Number} [granularity] The angular distance between points on the circle.
         *
         * @exception {DeveloperError} ellipsoid, center, semiMajorAxis, and semiMinorAxis are required.
         * @exception {DeveloperError} Semi-major and semi-minor axes must be greater than zero.
         * @exception {DeveloperError} granularity must be greater than zero.
         *
         * @see Polyline#setPositions
         * @see Polygon#setPositions
         *
         * @return The set of points that form the ellipse's boundary.
         *
         * @example
         * // Create a filled ellipse.
         * var polygon = new Polygon();
         * polygon.setPositions(Shapes.computeEllipseBoundary(
         *   ellipsoid, ellipsoid.cartographicToCartesian(
         *      Cartographic.fromDegrees(-75.59777, 40.03883)), 500000.0, 300000.0, Math.toRadians(60)));
         */
        computeEllipseBoundary : function(ellipsoid, center, semiMajorAxis, semiMinorAxis, bearing, granularity) {
            if (!ellipsoid || !center || !semiMajorAxis || !semiMinorAxis) {
                throw new DeveloperError('ellipsoid, center, semiMajorAxis, and semiMinorAxis are required.');
            }

            if (semiMajorAxis <= 0.0 || semiMinorAxis <= 0.0) {
                throw new DeveloperError('Semi-major and semi-minor axes must be greater than zero.');
            }

            bearing = bearing || 0.0;
            granularity = granularity || CesiumMath.toRadians(1.0);

            if (granularity <= 0.0) {
                throw new DeveloperError('granularity must be greater than zero.');
            }

            if (semiMajorAxis < semiMinorAxis) {
               var t = semiMajorAxis;
               semiMajorAxis = semiMinorAxis;
               semiMinorAxis = t;
            }

            var MAX_ANOMALY_LIMIT = 2.31;

            var aSqr = semiMajorAxis * semiMajorAxis;
            var bSqr = semiMinorAxis * semiMinorAxis;
            var ab = semiMajorAxis * semiMinorAxis;

            var value = 1.0 - (bSqr / aSqr);
            var ecc = Math.sqrt(value);

            var surfPos = Cartesian3.clone(center);
            var mag = surfPos.magnitude();

            var tempVec = new Cartesian3(0.0, 0.0, 1);
            var temp = 1.0 / mag;

            var unitPos = surfPos.multiplyByScalar(temp);
            var eastVec = tempVec.cross(surfPos).normalize();
            var northVec = unitPos.cross(eastVec);

            var numQuadrantPts = 1 + Math.ceil(CesiumMath.PI_OVER_TWO / granularity);
            var deltaTheta = MAX_ANOMALY_LIMIT / (numQuadrantPts - 1);
            var thetaPts = [];
            var thetaPtsIndex = 0;

            var sampleTheta = 0.0;
            for (var i = 0; i < numQuadrantPts; i++, sampleTheta += deltaTheta, ++thetaPtsIndex) {
                thetaPts[thetaPtsIndex] = sampleTheta - ecc * Math.sin(sampleTheta);
                if (thetaPts[thetaPtsIndex] >= CesiumMath.PI_OVER_TWO) {
                    thetaPts[thetaPtsIndex] = CesiumMath.PI_OVER_TWO;
                    numQuadrantPts = i + 1;
                    break;
                }
            }

            var ellipsePts = [];

            _computeEllipseQuadrant(ellipsoid, surfPos.magnitude(), aSqr, bSqr, ab, ecc, mag, unitPos, eastVec, northVec, bearing,
                                   thetaPts, 0.0, 0.0, 1, ellipsePts, 0, numQuadrantPts - 1);

            _computeEllipseQuadrant(ellipsoid, surfPos.magnitude(), aSqr, bSqr, ab, ecc, mag, unitPos, eastVec, northVec, bearing,
                                   thetaPts, numQuadrantPts - 1, Math.PI, -1, ellipsePts, numQuadrantPts - 1, numQuadrantPts - 1);

            _computeEllipseQuadrant(ellipsoid, surfPos.magnitude(), aSqr, bSqr, ab, ecc, mag, unitPos, eastVec, northVec, bearing,
                                   thetaPts, 0.0, Math.PI, 1, ellipsePts, (2 * numQuadrantPts) - 2, numQuadrantPts - 1);

            _computeEllipseQuadrant(ellipsoid, surfPos.magnitude(), aSqr, bSqr, ab, ecc, mag, unitPos, eastVec, northVec, bearing,
                                   thetaPts, numQuadrantPts - 1, CesiumMath.TWO_PI, -1, ellipsePts, (3 * numQuadrantPts) - 3, numQuadrantPts);

            ellipsePts.push(ellipsePts[0].clone()); // Duplicates first and last point for polyline

            return ellipsePts;
        }
    };

    return Shapes;
});