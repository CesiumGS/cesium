import Cartesian3 from './Cartesian3.js';
import Cartographic from './Cartographic.js';
import defaultValue from './defaultValue.js';
import defined from './defined.js';
import DeveloperError from './DeveloperError.js';
import Ellipsoid from './Ellipsoid.js';
import EllipsoidGeodesic from './EllipsoidGeodesic.js';
import EllipsoidRhumbLine from './EllipsoidRhumbLine.js';
import IntersectionTests from './IntersectionTests.js';
import isArray from './isArray.js';
import CesiumMath from './Math.js';
import Matrix4 from './Matrix4.js';
import Plane from './Plane.js';

    /**
     * @private
     */
    var PolylinePipeline = {};

    PolylinePipeline.numberOfPoints = function(p0, p1, minDistance) {
        var distance = Cartesian3.distance(p0, p1);
        return Math.ceil(distance / minDistance);
    };

    PolylinePipeline.numberOfPointsRhumbLine = function(p0, p1, granularity) {
        var radiansDistanceSquared = Math.pow((p0.longitude - p1.longitude), 2) + Math.pow((p0.latitude - p1.latitude), 2);
        return Math.ceil(Math.sqrt(radiansDistanceSquared / (granularity * granularity)));
    };

    var cartoScratch = new Cartographic();
    PolylinePipeline.extractHeights = function(positions, ellipsoid) {
        var length = positions.length;
        var heights = new Array(length);
        for (var i = 0; i < length; i++) {
            var p = positions[i];
            heights[i] = ellipsoid.cartesianToCartographic(p, cartoScratch).height;
        }
        return heights;
    };

    var wrapLongitudeInversMatrix = new Matrix4();
    var wrapLongitudeOrigin = new Cartesian3();
    var wrapLongitudeXZNormal = new Cartesian3();
    var wrapLongitudeXZPlane = new Plane(Cartesian3.UNIT_X, 0.0);
    var wrapLongitudeYZNormal = new Cartesian3();
    var wrapLongitudeYZPlane = new Plane(Cartesian3.UNIT_X, 0.0);
    var wrapLongitudeIntersection = new Cartesian3();
    var wrapLongitudeOffset = new Cartesian3();

    var subdivideHeightsScratchArray = [];

    function subdivideHeights(numPoints, h0, h1) {
        var heights = subdivideHeightsScratchArray;
        heights.length = numPoints;

        var i;
        if (h0 === h1) {
            for (i = 0; i < numPoints; i++) {
                heights[i] = h0;
            }
            return heights;
        }

        var dHeight = h1 - h0;
        var heightPerVertex = dHeight / numPoints;

        for (i = 0; i < numPoints; i++) {
            var h = h0 + i*heightPerVertex;
            heights[i] = h;
        }

        return heights;
    }

    var carto1 = new Cartographic();
    var carto2 = new Cartographic();
    var cartesian = new Cartesian3();
    var scaleFirst = new Cartesian3();
    var scaleLast = new Cartesian3();
    var ellipsoidGeodesic = new EllipsoidGeodesic();
    var ellipsoidRhumb = new EllipsoidRhumbLine();

    //Returns subdivided line scaled to ellipsoid surface starting at p1 and ending at p2.
    //Result includes p1, but not include p2.  This function is called for a sequence of line segments,
    //and this prevents duplication of end point.
    function generateCartesianArc(p0, p1, minDistance, ellipsoid, h0, h1, array, offset) {
        var first = ellipsoid.scaleToGeodeticSurface(p0, scaleFirst);
        var last = ellipsoid.scaleToGeodeticSurface(p1, scaleLast);
        var numPoints = PolylinePipeline.numberOfPoints(p0, p1, minDistance);
        var start = ellipsoid.cartesianToCartographic(first, carto1);
        var end = ellipsoid.cartesianToCartographic(last, carto2);
        var heights = subdivideHeights(numPoints, h0, h1);

        ellipsoidGeodesic.setEndPoints(start, end);
        var surfaceDistanceBetweenPoints = ellipsoidGeodesic.surfaceDistance / numPoints;

        var index = offset;
        start.height = h0;
        var cart = ellipsoid.cartographicToCartesian(start, cartesian);
        Cartesian3.pack(cart, array, index);
        index += 3;

        for (var i = 1; i < numPoints; i++) {
            var carto = ellipsoidGeodesic.interpolateUsingSurfaceDistance(i * surfaceDistanceBetweenPoints, carto2);
            carto.height = heights[i];
            cart = ellipsoid.cartographicToCartesian(carto, cartesian);
            Cartesian3.pack(cart, array, index);
            index += 3;
        }

        return index;
    }

    //Returns subdivided line scaled to ellipsoid surface starting at p1 and ending at p2.
    //Result includes p1, but not include p2.  This function is called for a sequence of line segments,
    //and this prevents duplication of end point.
    function generateCartesianRhumbArc(p0, p1, granularity, ellipsoid, h0, h1, array, offset) {
        var first = ellipsoid.scaleToGeodeticSurface(p0, scaleFirst);
        var last = ellipsoid.scaleToGeodeticSurface(p1, scaleLast);
        var start = ellipsoid.cartesianToCartographic(first, carto1);
        var end = ellipsoid.cartesianToCartographic(last, carto2);

        var numPoints = PolylinePipeline.numberOfPointsRhumbLine(start, end, granularity);
        var heights = subdivideHeights(numPoints, h0, h1);

        if (!ellipsoidRhumb.ellipsoid.equals(ellipsoid)) {
            ellipsoidRhumb = new EllipsoidRhumbLine(undefined, undefined, ellipsoid);
        }
        ellipsoidRhumb.setEndPoints(start, end);
        var surfaceDistanceBetweenPoints = ellipsoidRhumb.surfaceDistance / numPoints;

        var index = offset;
        start.height = h0;
        var cart = ellipsoid.cartographicToCartesian(start, cartesian);
        Cartesian3.pack(cart, array, index);
        index += 3;

        for (var i = 1; i < numPoints; i++) {
            var carto = ellipsoidRhumb.interpolateUsingSurfaceDistance(i * surfaceDistanceBetweenPoints, carto2);
            carto.height = heights[i];
            cart = ellipsoid.cartographicToCartesian(carto, cartesian);
            Cartesian3.pack(cart, array, index);
            index += 3;
        }

        return index;
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
     *
     * @example
     * var polylines = new Cesium.PolylineCollection();
     * var polyline = polylines.add(...);
     * var positions = polyline.positions;
     * var modelMatrix = polylines.modelMatrix;
     * var segments = Cesium.PolylinePipeline.wrapLongitude(positions, modelMatrix);
     *
     * @see PolygonPipeline.wrapLongitude
     * @see Polyline
     * @see PolylineCollection
     */
    PolylinePipeline.wrapLongitude = function(positions, modelMatrix) {
        var cartesians = [];
        var segments = [];

        if (defined(positions) && positions.length > 0) {
            modelMatrix = defaultValue(modelMatrix, Matrix4.IDENTITY);
            var inverseModelMatrix = Matrix4.inverseTransformation(modelMatrix, wrapLongitudeInversMatrix);

            var origin = Matrix4.multiplyByPoint(inverseModelMatrix, Cartesian3.ZERO, wrapLongitudeOrigin);
            var xzNormal = Cartesian3.normalize(Matrix4.multiplyByPointAsVector(inverseModelMatrix, Cartesian3.UNIT_Y, wrapLongitudeXZNormal), wrapLongitudeXZNormal);
            var xzPlane = Plane.fromPointNormal(origin, xzNormal, wrapLongitudeXZPlane);
            var yzNormal = Cartesian3.normalize(Matrix4.multiplyByPointAsVector(inverseModelMatrix, Cartesian3.UNIT_X, wrapLongitudeYZNormal), wrapLongitudeYZNormal);
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
     * Subdivides polyline and raises all points to the specified height.  Returns an array of numbers to represent the positions.
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions The array of type {Cartesian3} representing positions.
     * @param {Number|Number[]} [options.height=0.0] A number or array of numbers representing the heights of each position.
     * @param {Number} [options.granularity = CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the positions lie.
     * @returns {Number[]} A new array of positions of type {Number} that have been subdivided and raised to the surface of the ellipsoid.
     *
     * @example
     * var positions = Cesium.Cartesian3.fromDegreesArray([
     *   -105.0, 40.0,
     *   -100.0, 38.0,
     *   -105.0, 35.0,
     *   -100.0, 32.0
     * ]);
     * var surfacePositions = Cesium.PolylinePipeline.generateArc({
     *   positons: positions
     * });
     */
    PolylinePipeline.generateArc = function(options) {
        if (!defined(options)) {
            options = {};
        }
        var positions = options.positions;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('options.positions is required.');
        }
        //>>includeEnd('debug');

        var length = positions.length;
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var height = defaultValue(options.height, 0);
        var hasHeightArray = isArray(height);

        if (length < 1) {
            return [];
        } else if (length === 1) {
            var p = ellipsoid.scaleToGeodeticSurface(positions[0], scaleFirst);
            height = hasHeightArray ? height[0] : height;
            if (height !== 0) {
                var n = ellipsoid.geodeticSurfaceNormal(p, cartesian);
                Cartesian3.multiplyByScalar(n, height, n);
                Cartesian3.add(p, n, p);
            }

            return [p.x, p.y, p.z];
        }

        var minDistance = options.minDistance;
        if (!defined(minDistance)) {
            var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
            minDistance = CesiumMath.chordLength(granularity, ellipsoid.maximumRadius);
        }

        var numPoints = 0;
        var i;

        for (i = 0; i < length -1; i++) {
            numPoints += PolylinePipeline.numberOfPoints(positions[i], positions[i+1], minDistance);
        }

        var arrayLength = (numPoints + 1) * 3;
        var newPositions = new Array(arrayLength);
        var offset = 0;

        for (i = 0; i < length - 1; i++) {
            var p0 = positions[i];
            var p1 = positions[i + 1];

            var h0 = hasHeightArray ? height[i] : height;
            var h1 = hasHeightArray ? height[i + 1] : height;

            offset = generateCartesianArc(p0, p1, minDistance, ellipsoid, h0, h1, newPositions, offset);
        }

        subdivideHeightsScratchArray.length = 0;

        var lastPoint = positions[length - 1];
        var carto = ellipsoid.cartesianToCartographic(lastPoint, carto1);
        carto.height = hasHeightArray ? height[length - 1] : height;
        var cart = ellipsoid.cartographicToCartesian(carto, cartesian);
        Cartesian3.pack(cart, newPositions, arrayLength - 3);

        return newPositions;
    };

    var scratchCartographic0 = new Cartographic();
    var scratchCartographic1 = new Cartographic();

    /**
     * Subdivides polyline and raises all points to the specified height using Rhumb lines.  Returns an array of numbers to represent the positions.
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions The array of type {Cartesian3} representing positions.
     * @param {Number|Number[]} [options.height=0.0] A number or array of numbers representing the heights of each position.
     * @param {Number} [options.granularity = CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the positions lie.
     * @returns {Number[]} A new array of positions of type {Number} that have been subdivided and raised to the surface of the ellipsoid.
     *
     * @example
     * var positions = Cesium.Cartesian3.fromDegreesArray([
     *   -105.0, 40.0,
     *   -100.0, 38.0,
     *   -105.0, 35.0,
     *   -100.0, 32.0
     * ]);
     * var surfacePositions = Cesium.PolylinePipeline.generateRhumbArc({
     *   positons: positions
     * });
     */
    PolylinePipeline.generateRhumbArc = function(options) {
        if (!defined(options)) {
            options = {};
        }
        var positions = options.positions;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('options.positions is required.');
        }
        //>>includeEnd('debug');

        var length = positions.length;
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var height = defaultValue(options.height, 0);
        var hasHeightArray = isArray(height);

        if (length < 1) {
            return [];
        } else if (length === 1) {
            var p = ellipsoid.scaleToGeodeticSurface(positions[0], scaleFirst);
            height = hasHeightArray ? height[0] : height;
            if (height !== 0) {
                var n = ellipsoid.geodeticSurfaceNormal(p, cartesian);
                Cartesian3.multiplyByScalar(n, height, n);
                Cartesian3.add(p, n, p);
            }

            return [p.x, p.y, p.z];
        }

        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);

        var numPoints = 0;
        var i;

        var c0 = ellipsoid.cartesianToCartographic(positions[0], scratchCartographic0);
        var c1;
        for (i = 0; i < length - 1; i++) {
            c1 = ellipsoid.cartesianToCartographic(positions[i + 1], scratchCartographic1);
            numPoints += PolylinePipeline.numberOfPointsRhumbLine(c0, c1, granularity);
            c0 = Cartographic.clone(c1, scratchCartographic0);
        }

        var arrayLength = (numPoints + 1) * 3;
        var newPositions = new Array(arrayLength);
        var offset = 0;

        for (i = 0; i < length - 1; i++) {
            var p0 = positions[i];
            var p1 = positions[i + 1];

            var h0 = hasHeightArray ? height[i] : height;
            var h1 = hasHeightArray ? height[i + 1] : height;

            offset = generateCartesianRhumbArc(p0, p1, granularity, ellipsoid, h0, h1, newPositions, offset);
        }

        subdivideHeightsScratchArray.length = 0;

        var lastPoint = positions[length - 1];
        var carto = ellipsoid.cartesianToCartographic(lastPoint, carto1);
        carto.height = hasHeightArray ? height[length - 1] : height;
        var cart = ellipsoid.cartographicToCartesian(carto, cartesian);
        Cartesian3.pack(cart, newPositions, arrayLength - 3);

        return newPositions;
    };

    /**
     * Subdivides polyline and raises all points to the specified height. Returns an array of new {Cartesian3} positions.
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions The array of type {Cartesian3} representing positions.
     * @param {Number|Number[]} [options.height=0.0] A number or array of numbers representing the heights of each position.
     * @param {Number} [options.granularity = CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the positions lie.
     * @returns {Cartesian3[]} A new array of cartesian3 positions that have been subdivided and raised to the surface of the ellipsoid.
     *
     * @example
     * var positions = Cesium.Cartesian3.fromDegreesArray([
     *   -105.0, 40.0,
     *   -100.0, 38.0,
     *   -105.0, 35.0,
     *   -100.0, 32.0
     * ]);
     * var surfacePositions = Cesium.PolylinePipeline.generateCartesianArc({
     *   positons: positions
     * });
     */
    PolylinePipeline.generateCartesianArc = function(options) {
        var numberArray = PolylinePipeline.generateArc(options);
        var size = numberArray.length/3;
        var newPositions = new Array(size);
        for (var i = 0; i < size; i++) {
            newPositions[i] = Cartesian3.unpack(numberArray, i*3);
        }
        return newPositions;
    };

    /**
     * Subdivides polyline and raises all points to the specified height using Rhumb Lines. Returns an array of new {Cartesian3} positions.
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions The array of type {Cartesian3} representing positions.
     * @param {Number|Number[]} [options.height=0.0] A number or array of numbers representing the heights of each position.
     * @param {Number} [options.granularity = CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the positions lie.
     * @returns {Cartesian3[]} A new array of cartesian3 positions that have been subdivided and raised to the surface of the ellipsoid.
     *
     * @example
     * var positions = Cesium.Cartesian3.fromDegreesArray([
     *   -105.0, 40.0,
     *   -100.0, 38.0,
     *   -105.0, 35.0,
     *   -100.0, 32.0
     * ]);
     * var surfacePositions = Cesium.PolylinePipeline.generateCartesianRhumbArc({
     *   positons: positions
     * });
     */
    PolylinePipeline.generateCartesianRhumbArc = function(options) {
        var numberArray = PolylinePipeline.generateRhumbArc(options);
        var size = numberArray.length/3;
        var newPositions = new Array(size);
        for (var i = 0; i < size; i++) {
            newPositions[i] = Cartesian3.unpack(numberArray, i*3);
        }
        return newPositions;
    };
export default PolylinePipeline;
