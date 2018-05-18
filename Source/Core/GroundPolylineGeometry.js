define([
        './Cartesian3',
        './Cartographic',
        './Check',
        './Math',
        './defaultValue',
        './defined',
        './defineProperties',
        './Ellipsoid',
        './EncodedCartesian3',
        './Matrix3',
        './Plane',
        './Quaternion'
    ], function(
        Cartesian3,
        Cartographic,
        Check,
        CesiumMath,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        EncodedCartesian3,
        Matrix3,
        Plane,
        Quaternion) {
    'use strict';

    /**
     * A description of a polyline on terrain. Only to be used with GroundPolylinePrimitive.
     *
     * @alias GroundPolylineGeometry
     * @constructor
     *
     * @param {Object} [options] Options with the following properties:
     * @param {Cartographic[]} [options.positions] An array of {@link Cartographic} defining the polyline's points. Heights will be ignored.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance interval used for interpolating options.points. Zero indicates no interpolation.
     * @param {Boolean} [options.loop=false] Whether during geometry creation a line segment will be added between the last and first line positions to make this Polyline a loop.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] Ellipsoid for projecting cartographic coordinates to cartesian
     * @param {Number} [options.width=1.0] Integer width for the polyline.
     *
     * @see GroundPolylinePrimitive
     */
    function GroundPolylineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);

        this._positions = interpolatePoints(defaultValue(options.positions, []), granularity);

        /**
         * The distance interval used for interpolating options.points. Zero indicates no interpolation.
         * @type {Boolean}
         */
        this.granularity = granularity;

        /**
         * Whether during geometry creation a line segment will be added between the last and first line positions to make this Polyline a loop.
         * @type {Boolean}
         */
        this.loop = defaultValue(options.loop, false);

        this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        this._lengthOnEllipsoid = undefined;

        this.width = defaultValue(options.width, 1.0);
    }

    function interpolatePoints(positions, granularity) {
        var interpolatedPositions = [];

        // TODO: actually interpolate
        return positions;
    }

    var heightlessCartographicScratch = new Cartographic();
    function getPosition(ellipsoid, cartographic, height, result) {
        Cartographic.clone(cartographic, heightlessCartographicScratch);
        heightlessCartographicScratch.height = height;
        return Cartographic.toCartesian(heightlessCartographicScratch, ellipsoid, result);
    }

    defineProperties(GroundPolylineGeometry.prototype, {
        /**
         * Gets the interpolated Cartographic positions describing the Ground Polyline
         * @memberof GroundPolylineGeometry.prototype
         * @type {Cartographic[]}
         */
        positions: {
            get: function() {
                return this._positions;
            },
            // TODO: doc, interpolation, etc.
            set: function(value) {
                this._positions = defaultValue(value, []);
            }
        },
        lengthOnEllipsoid : {
            get : function() {
                if (!defined(this._lengthOnEllipsoid)) {
                    this._lengthOnEllipsoid = computeLengthOnEllipsoid(this._positions, this.loop, this.ellipsoid);
                }
                return this._lengthOnEllipsoid;
            }
        }
    });

    var colinearCartographicScratch = new Cartographic();
    var previousBottomScratch = new Cartesian3();
    var vertexBottomScratch = new Cartesian3();
    var vertexTopScratch = new Cartesian3();
    var nextBottomScratch = new Cartesian3();
    var vertexNormalScratch = new Cartesian3();
    GroundPolylineGeometry.createWallVertices = function(groundPolylineGeometry, wallHeight) {
        var cartographics = groundPolylineGeometry.positions;
        var loop = groundPolylineGeometry.loop;
        var ellipsoid = groundPolylineGeometry.ellipsoid;

        // TODO: throw errors/negate loop if not enough points

        var cartographicsLength = cartographics.length;
        var index;
        var i;

        var floatCount = (cartographicsLength + (loop ? 1 : 0)) * 3;
        var normalsArray = new Float32Array(floatCount);
        var bottomPositionsArray = new Float64Array(floatCount);
        var topPositionsArray = new Float64Array(floatCount);

        var previousBottom = previousBottomScratch;
        var vertexBottom = vertexBottomScratch;
        var vertexTop = vertexTopScratch;
        var nextBottom = nextBottomScratch;
        var vertexNormal = vertexNormalScratch;

        // First point - generate fake "previous" position for computing normal
        var startCartographic = cartographics[0];
        var nextCartographic = cartographics[1];
        var prestartCartographic;
        if (loop) {
            prestartCartographic = cartographics[cartographicsLength - 1];
        } else {
            prestartCartographic = colinearCartographicScratch;
            prestartCartographic.longitude = startCartographic.longitude - (nextCartographic.longitude - startCartographic.longitude);
            prestartCartographic.latitude = startCartographic.latitude - (nextCartographic.latitude - startCartographic.latitude);
        }

        getPosition(ellipsoid, prestartCartographic, 0.0, previousBottom);
        getPosition(ellipsoid, startCartographic, 0.0, vertexBottom);
        getPosition(ellipsoid, startCartographic, wallHeight, vertexTop);
        getPosition(ellipsoid, nextCartographic, 0.0, nextBottom);
        computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, vertexNormal);

        Cartesian3.pack(vertexNormal, normalsArray, 0);
        Cartesian3.pack(vertexBottom, bottomPositionsArray, 0);
        Cartesian3.pack(vertexTop, topPositionsArray, 0);

        // All inbetween points
        for (i = 1; i < cartographicsLength - 1; ++i) {
            previousBottom = Cartesian3.clone(vertexBottom, previousBottom);
            vertexBottom = Cartesian3.clone(nextBottom, vertexBottom);
            getPosition(ellipsoid, cartographics[i], wallHeight, vertexTop);
            getPosition(ellipsoid, cartographics[i + 1], 0.0, nextBottom);

            computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, vertexNormal);

            index = i * 3;
            Cartesian3.pack(vertexNormal, normalsArray, index);
            Cartesian3.pack(vertexBottom, bottomPositionsArray, index);
            Cartesian3.pack(vertexTop, topPositionsArray, index);
        }

        // Last point - generate fake "next" position for computing normal
        var endCartographic = cartographics[cartographicsLength - 1];
        var preEndCartographic = cartographics[cartographicsLength - 2];

        var postEndCartographic;
        if (loop) {
            postEndCartographic = cartographics[0];
        } else {
            postEndCartographic = colinearCartographicScratch;
            postEndCartographic.longitude = endCartographic.longitude + (endCartographic.longitude - preEndCartographic.longitude);
            postEndCartographic.latitude = endCartographic.latitude + (endCartographic.latitude - preEndCartographic.latitude);
        }

        getPosition(ellipsoid, preEndCartographic, 0.0, previousBottom);
        getPosition(ellipsoid, endCartographic, 0.0, vertexBottom);
        getPosition(ellipsoid, endCartographic, wallHeight, vertexTop);
        getPosition(ellipsoid, postEndCartographic, 0.0, nextBottom);
        computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, vertexNormal);

        index = (cartographicsLength - 1) * 3;
        Cartesian3.pack(vertexNormal, normalsArray, index);
        Cartesian3.pack(vertexBottom, bottomPositionsArray, index);
        Cartesian3.pack(vertexTop, topPositionsArray, index);

        if (loop) {
            index = cartographicsLength * 3;
            // Copy the first vertex
            for (i = 0; i < 3; ++i) {
                normalsArray[index + i] = normalsArray[i];
                bottomPositionsArray[index + i] = bottomPositionsArray[i];
                topPositionsArray[index + i] = topPositionsArray[i];
            }
        }

        return {
            rightFacingNormals : normalsArray,
            bottomPositions : bottomPositionsArray,
            topPositions : topPositionsArray
        };
    };

    var MIN_HEIGHT = 0.0;
    var MAX_HEIGHT = 10000.0;

    function direction(target, origin, result) {
        Cartesian3.subtract(target, origin, result);
        Cartesian3.normalize(result, result);
        return result;
    }

    // inputs are cartesians
    var vertexUpScratch = new Cartesian3();
    var toPreviousScratch = new Cartesian3();
    var toNextScratch = new Cartesian3();
    var forwardScratch = new Cartesian3();
    var coplanarNormalScratch = new Cartesian3();
    var coplanarPlaneScratch = new Plane(Cartesian3.UNIT_X, 0.0);
    var cosine90 = 0.0;
    function computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, result) {
        // Convention: "next" is locally forward and we are computing a normal pointing towards the local right side of the vertices.

        var up = direction(vertexTop, vertexBottom, vertexUpScratch);
        var toPrevious = direction(previousBottom, vertexBottom, toPreviousScratch);
        var toNext = direction(nextBottom, vertexBottom, toNextScratch);

        // Check if points are coplanar in a right-side-pointing plane that contains "up."
        // This is roughly equivalent to the points being colinear in cartographic space.
        var coplanarNormal = Cartesian3.cross(up, toPrevious, coplanarNormalScratch);
        coplanarNormal = Cartesian3.normalize(coplanarNormal, coplanarNormal);
        var coplanarPlane = Plane.fromPointNormal(vertexBottom, coplanarNormal, coplanarPlaneScratch);
        var nextBottomDistance = Plane.getPointDistance(coplanarPlane, nextBottom);
        if (CesiumMath.equalsEpsilon(nextBottomDistance, 0.0, CesiumMath.EPSILON7)) {
            // If the points are coplanar, point the normal in the direction of the plane
            Cartesian3.clone(coplanarNormal, result);
            return result;
        }

        // Average directions to previous and to next
        result = Cartesian3.add(toNext, toPrevious, result);
        result = Cartesian3.multiplyByScalar(result, 0.5, result);
        result = Cartesian3.normalize(result, result);

        // Rotate this direction to be orthogonal to up
        var forward = Cartesian3.cross(up, result, forwardScratch);
        Cartesian3.normalize(forward, forward);
        Cartesian3.cross(forward, up, result);
        Cartesian3.normalize(result, result);

        // Flip the normal if it isn't pointing roughly bound right (aka if forward is pointing more "backwards")
        if (Cartesian3.dot(toNext, forward) < cosine90) {
            result = Cartesian3.multiplyByScalar(result, -1.0, result);
        }

        return result;
    }

    var segmentStartScratch = new Cartesian3();
    var segmentEndScratch = new Cartesian3();
    function computeLengthOnEllipsoid(cartographicPositions, loop, ellipsoid) {
        var cartographicsLength = cartographicPositions.length;

        var segmentStart = segmentStartScratch;
        var segmentEnd = segmentEndScratch;
        getPosition(ellipsoid, cartographicPositions[0], 0.0, segmentStart);
        getPosition(ellipsoid, cartographicPositions[1], 0.0, segmentEnd);

        var length = Cartesian3.distance(segmentStart, segmentEnd);

        for (var i = 1; i < cartographicsLength - 1; i++) {
            segmentStart = Cartesian3.clone(segmentEnd, segmentStart);
            getPosition(ellipsoid, cartographicPositions[i + 1], 0.0, segmentEnd);

            length += Cartesian3.distance(segmentStart, segmentEnd);
        }

        if (loop) {
            getPosition(ellipsoid, cartographicPositions[cartographicsLength - 1], 0.0, segmentStart);
            getPosition(ellipsoid, cartographicPositions[0], 0.0, segmentEnd);

            length += Cartesian3.distance(segmentStart, segmentEnd);
        }
        return length;
    }

    return GroundPolylineGeometry;
});
