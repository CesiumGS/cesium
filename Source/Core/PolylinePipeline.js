/*global define*/
define([
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidGeodesic',
        './IntersectionTests',
        './isArray',
        './Math',
        './Matrix4',
        './Plane'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        EllipsoidGeodesic,
        IntersectionTests,
        isArray,
        CesiumMath,
        Matrix4,
        Plane) {
    "use strict";

    /**
     * @private
     */
    var PolylinePipeline = {};

    var wrapLongitudeInversMatrix = new Matrix4();
    var wrapLongitudeOrigin = new Cartesian3();
    var wrapLongitudeXZNormal = new Cartesian3();
    var wrapLongitudeXZPlane = new Plane(Cartesian3.ZERO, 0.0);
    var wrapLongitudeYZNormal = new Cartesian3();
    var wrapLongitudeYZPlane = new Plane(Cartesian3.ZERO, 0.0);
    var wrapLongitudeIntersection = new Cartesian3();
    var wrapLongitudeOffset = new Cartesian3();

    var carto1 = new Cartographic();
    var carto2 = new Cartographic();
    var cartesian = new Cartesian3();
    var scaleFirst = new Cartesian3();
    var scaleLast = new Cartesian3();
    var ellipsoidGeodesic = new EllipsoidGeodesic();
    //Returns subdivided line scaled to ellipsoid surface starting at p1 and ending at p2.
    //Result includes p1, but not include p2.  This function is called for a sequence of line segments,
    //and this prevents duplication of end point.
    function generateCartesianArc(p1, p2, granularity, ellipsoid) {
        var first = ellipsoid.scaleToGeodeticSurface(p1, scaleFirst);
        var last = ellipsoid.scaleToGeodeticSurface(p2, scaleLast);
        var separationAngle = Cartesian3.angleBetween(first, last);
        var numPoints = Math.ceil(separationAngle / granularity);
        var result = new Array(numPoints * 3);
        var start = ellipsoid.cartesianToCartographic(first, carto1);
        var end = ellipsoid.cartesianToCartographic(last, carto2);

        ellipsoidGeodesic.setEndPoints(start, end);
        var surfaceDistanceBetweenPoints = ellipsoidGeodesic.surfaceDistance / (numPoints);

        var index = 0;
        start.height = 0;
        var cart = ellipsoid.cartographicToCartesian(start, cartesian);
        result[index++] = cart.x;
        result[index++] = cart.y;
        result[index++] = cart.z;

        for (var i = 1; i < numPoints; i++) {
            var carto = ellipsoidGeodesic.interpolateUsingSurfaceDistance(i * surfaceDistanceBetweenPoints, carto2);
            cart = ellipsoid.cartographicToCartesian(carto, cartesian);
            result[index++] = cart.x;
            result[index++] = cart.y;
            result[index++] = cart.z;
        }

        return result;
    }

    var scaleN = new Cartesian3();
    var scaleP = new Cartesian3();
    function computeHeight(p, h, ellipsoid) {
        var n = scaleN;

        ellipsoid.geodeticSurfaceNormal(p, n);
        Cartesian3.multiplyByScalar(n, h, n);
        Cartesian3.add(p, n, p);

        return p;
    }

    /**
     * Breaks a {@link Polyline} into segments such that it does not cross the &plusmn;180 degree meridian of an ellipsoid.
     *
     * @param {Cartesian3[]} positions The polyline's Cartesian positions.
     * @param {Matrix4} [modelMatrix=Matrix4.IDENTITY] The polyline's model matrix. Assumed to be an affine
     * transformation matrix, where the upper left 3x3 elements are a rotation matrix, and
     * the upper three elements in the fourth column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
     * The matrix is not verified to be in the proper form.
     * @returns {Object} An object with a <code>positions</code> property that is an array of positions and a
     * <code>segments</code> property.
     *
     * @see PolygonPipeline.wrapLongitude
     * @see Polyline
     * @see PolylineCollection
     *
     * @example
     * var polylines = new Cesium.PolylineCollection();
     * var polyline = polylines.add(...);
     * var positions = polyline.positions;
     * var modelMatrix = polylines.modelMatrix;
     * var segments = Cesium.PolylinePipeline.wrapLongitude(positions, modelMatrix);
     */
    PolylinePipeline.wrapLongitude = function(positions, modelMatrix) {
        var cartesians = [];
        var segments = [];

        if (defined(positions) && positions.length > 0) {
            modelMatrix = defaultValue(modelMatrix, Matrix4.IDENTITY);
            var inverseModelMatrix = Matrix4.inverseTransformation(modelMatrix, wrapLongitudeInversMatrix);

            var origin = Matrix4.multiplyByPoint(inverseModelMatrix, Cartesian3.ZERO, wrapLongitudeOrigin);
            var xzNormal = Matrix4.multiplyByPointAsVector(inverseModelMatrix, Cartesian3.UNIT_Y, wrapLongitudeXZNormal);
            var xzPlane = Plane.fromPointNormal(origin, xzNormal, wrapLongitudeXZPlane);
            var yzNormal = Matrix4.multiplyByPointAsVector(inverseModelMatrix, Cartesian3.UNIT_X, wrapLongitudeYZNormal);
            var yzPlane = Plane.fromPointNormal(origin, yzNormal, wrapLongitudeYZPlane);

            var count = 1;
            cartesians.push(Cartesian3.clone(positions[0]));
            var prev = cartesians[0];

            var length = positions.length;
            for (var i = 1; i < length; ++i) {
                var cur = positions[i];

                // intersects the IDL if either endpoint is on the negative side of the yz-plane
                if (Plane.getPointDistance(yzPlane, prev) < 0.0 || Plane.getPointDistance(yzPlane, cur) < 0.0) {
                    // and intersects the xz-plane
                    var intersection = IntersectionTests.lineSegmentPlane(prev, cur, xzPlane, wrapLongitudeIntersection);
                    if (defined(intersection)) {
                        // move point on the xz-plane slightly away from the plane
                        var offset = Cartesian3.multiplyByScalar(xzNormal, 5.0e-9, wrapLongitudeOffset);
                        if (Plane.getPointDistance(xzPlane, prev) < 0.0) {
                            Cartesian3.negate(offset, offset);
                        }

                        cartesians.push(Cartesian3.add(intersection, offset, new Cartesian3()));
                        segments.push(count + 1);

                        Cartesian3.negate(offset, offset);
                        cartesians.push(Cartesian3.add(intersection, offset, new Cartesian3()));
                        count = 1;
                    }
                }

                cartesians.push(Cartesian3.clone(positions[i]));
                count++;

                prev = cur;
            }

            segments.push(count);
        }

        return {
            positions : cartesians,
            lengths : segments
        };
    };

    /**
     * Removes adjacent duplicate positions in an array of positions.
     *
     * @param {Cartesian3[]} positions The array of positions.
     * @returns {Cartesian3[]} A new array of positions with no adjacent duplicate positions.  Positions are shallow copied.
     *
     * @example
     * // Returns [(1.0, 1.0, 1.0), (2.0, 2.0, 2.0)]
     * var positions = [
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
     *     new Cesium.Cartesian3(2.0, 2.0, 2.0)];
     * var nonDuplicatePositions = Cesium.PolylinePipeline.removeDuplicates(positions);
     */
    PolylinePipeline.removeDuplicates = function(positions) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('positions is required.');
        }
        //>>includeEnd('debug');

        var length = positions.length;
        if (length < 2) {
            return positions.slice(0);
        }

        var cleanedPositions = [];
        cleanedPositions.push(positions[0]);

        for (var i = 1; i < length; ++i) {
            var v0 = positions[i - 1];
            var v1 = positions[i];

            if (!Cartesian3.equals(v0, v1)) {
                cleanedPositions.push(v1); // Shallow copy!
            }
        }

        return cleanedPositions;
    };

    /**
     * Subdivides polyline and raises all points to the ellipsoid surface
     *
     * @param {Cartesian3[]} positions The array of positions of type {Cartesian3}.
     * @param {Number} [granularity = CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the positions lie.
     * @returns {Number[]} A new array of positions of type {Number} that have been subdivided and raised to the surface of the ellipsoid.
     *
     * @example
     * var positions = Cesium.Cartesian3.fromDegreesArray([
     *   -105.0, 40.0,
     *   -100.0, 38.0,
     *   -105.0, 35.0,
     *   -100.0, 32.0
     * ]);
     * var surfacePositions = Cesium.PolylinePipeline.scaleToSurface(positions);
     */
    PolylinePipeline.scaleToSurface = function(positions, granularity, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('positions is required');
        }
        //>>includeEnd('debug');

        granularity = defaultValue(granularity, CesiumMath.RADIANS_PER_DEGREE);
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var length = positions.length;
        var newPositions = [];
        for (var i = 0; i < length - 1; i++) {
            var p0 = positions[i];
            var p1 = positions[i + 1];
            newPositions = newPositions.concat(generateCartesianArc(p0, p1, granularity, ellipsoid));
        }

        var lastPoint = positions[length - 1];
        var carto = ellipsoid.cartesianToCartographic(lastPoint, carto1);
        carto.height = 0;
        var cart = ellipsoid.cartographicToCartesian(carto, cartesian);
        newPositions.push(cart.x, cart.y, cart.z);

        return newPositions;
    };

    /**
     * Raises the positions to the given height.
     *
     * @param {Number[]} positions The array of type {Number} representing positions.
     * @param {Number|Number[]} height A number or array of numbers representing the heights of each position.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the positions lie.
     * @param {Number[]} [result] An array to place the resultant positions in.
     * @returns {Number[]} The array of positions scaled to height.

     * @exception {DeveloperError} positions must be defined.
     * @exception {DeveloperError} height must be defined.
     * @exception {DeveloperError} result.length must be equal to positions.length
     * @exception {DeveloperError} height.length must be equal to positions.length
     *
     * @example
     * var p1 = Cesium.Cartesian3.fromDegrees(-105.0, 40.0);
     * var p2 = Cesium.Cartesian3.fromDegrees(-100.0, 38.0);
     * var positions = [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z];
     * var heights = [1000, 1000, 2000, 2000];
     *
     * var raisedPositions = Cesium.PolylinePipeline.scaleToGeodeticHeight(positions, heights);
     */
    PolylinePipeline.scaleToGeodeticHeight = function(positions, height, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('positions must be defined.');
        }
        if (!defined(height)) {
            throw new DeveloperError('height must be defined');
        }
        //>>includeEnd('debug');

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var length = positions.length;
        var i;
        var p = scaleP;
        var newPositions;
        if (defined(result)) {
            if (result.length !== positions.length) {
                throw new DeveloperError('result.length must be equal to positions.length');
            }
            newPositions = result;
        } else {
            newPositions = new Array(positions.length);
        }

        if (height === 0.0) {
            for (i = 0; i < length; i += 3) {
                p = ellipsoid.scaleToGeodeticSurface(Cartesian3.fromArray(positions, i, p), p);
                newPositions[i] = p.x;
                newPositions[i + 1] = p.y;
                newPositions[i + 2] = p.z;
            }
            return newPositions;
        }

        var h;
        if (isArray(height)) {
            if (height.length !== length / 3) {
                throw new DeveloperError('height.length must be equal to positions.length');
            }
            for (i = 0; i < length; i += 3) {
                h = height[i / 3];
                p = Cartesian3.fromArray(positions, i, p);
                p = computeHeight(p, h, ellipsoid);
                newPositions[i] = p.x;
                newPositions[i + 1] = p.y;
                newPositions[i + 2] = p.z;
            }
        } else {
            h = height;
            for (i = 0; i < length; i += 3) {
                p = Cartesian3.fromArray(positions, i, p);
                p = computeHeight(p, h, ellipsoid);
                newPositions[i] = p.x;
                newPositions[i + 1] = p.y;
                newPositions[i + 2] = p.z;
            }
        }

        return newPositions;
    };

    return PolylinePipeline;
});
