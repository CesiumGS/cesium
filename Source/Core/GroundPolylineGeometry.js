define([
        './Cartesian3',
        './Cartographic',
        './Check',
        './Math',
        './defaultValue',
        './defined',
        './defineProperties',
        './Ellipsoid',
        './EllipsoidGeodesic',
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
        EllipsoidGeodesic,
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
     * @param {Number} [options.granularity=9999.0] The distance interval used for interpolating options.points. Defaults to 9999.0 meters. Zero indicates no interpolation.
     * @param {Boolean} [options.loop=false] Whether during geometry creation a line segment will be added between the last and first line positions to make this Polyline a loop.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] Ellipsoid for projecting cartographic coordinates to cartesian
     * @param {Number} [options.width=1.0] Integer width for the polyline.
     *
     * @see GroundPolylinePrimitive
     */
    function GroundPolylineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._positions = defaultValue(options.positions, []);

        /**
         * The distance interval used for interpolating options.points. Zero indicates no interpolation.
         * Default of 9999.0 allows sub-centimeter accuracy with 32 bit floating point.
         * @type {Boolean}
         */
        this.granularity = defaultValue(options.granularity, 9999.0);

        /**
         * Whether during geometry creation a line segment will be added between the last and first line positions to make this Polyline a loop.
         * @type {Boolean}
         */
        this.loop = defaultValue(options.loop, false);

        this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        this.width = defaultValue(options.width, 1.0);
    }

    var cart3Scratch1 = new Cartesian3();
    var cart3Scratch2 = new Cartesian3();
    var cart3Scratch3 = new Cartesian3();
    function computeRightNormal(start, end, wallHeight, ellipsoid, result) {
        var startBottom = getPosition(ellipsoid, start, 0.0, cart3Scratch1);
        var startTop = getPosition(ellipsoid, start, wallHeight, cart3Scratch2);
        var endBottom = getPosition(ellipsoid, end, 0.0, cart3Scratch3);

        var up = direction(startTop, startBottom, cart3Scratch2);
        var forward = direction(endBottom, startBottom, cart3Scratch3);

        Cartesian3.cross(forward, up, result);
        return Cartesian3.normalize(result, result);
    }

    var interpolatedCartographicScratch = new Cartographic();
    var interpolatedBottomScratch = new Cartesian3();
    var interpolatedTopScratch = new Cartesian3();
    var interpolatedNormalScratch = new Cartesian3();
    function interpolateSegment(start, end, wallHeight, granularity, ellipsoid, normalsArray, bottomPositionsArray, topPositionsArray) {
        if (granularity === 0.0) {
            return;
        }
        var ellipsoidGeodesic = new EllipsoidGeodesic(start, end, ellipsoid);
        var surfaceDistance = ellipsoidGeodesic.surfaceDistance;
        if (surfaceDistance < granularity) {
            return;
        }

        // Compute rightwards normal applicable at all interpolated points
        var interpolatedNormal = computeRightNormal(start, end, wallHeight, ellipsoid, interpolatedNormalScratch);

        var segments = Math.ceil(surfaceDistance / granularity);
        var interpointDistance = surfaceDistance / segments;
        var distanceFromStart = interpointDistance;
        var pointsToAdd = segments - 1;
        var packIndex = normalsArray.length;
        for (var i = 0; i < pointsToAdd; i++) {
            var interpolatedCartographic = ellipsoidGeodesic.interpolateUsingSurfaceDistance(distanceFromStart, interpolatedCartographicScratch);
            var interpolatedBottom = getPosition(ellipsoid, interpolatedCartographic, 0.0, interpolatedBottomScratch);
            var interpolatedTop = getPosition(ellipsoid, interpolatedCartographic, wallHeight, interpolatedTopScratch);

            Cartesian3.pack(interpolatedNormal, normalsArray, packIndex);
            Cartesian3.pack(interpolatedBottom, bottomPositionsArray, packIndex);
            Cartesian3.pack(interpolatedTop, topPositionsArray, packIndex);

            packIndex += 3;
            distanceFromStart += interpointDistance;
        }
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
        }
    });

    var previousBottomScratch = new Cartesian3();
    var vertexBottomScratch = new Cartesian3();
    var vertexTopScratch = new Cartesian3();
    var nextBottomScratch = new Cartesian3();
    var vertexNormalScratch = new Cartesian3();
    GroundPolylineGeometry.createWallVertices = function(groundPolylineGeometry, wallHeight) {
        var cartographics = groundPolylineGeometry.positions;
        var loop = groundPolylineGeometry.loop;
        var ellipsoid = groundPolylineGeometry.ellipsoid;
        var granularity = groundPolylineGeometry.granularity;

        // TODO: throw errors/negate loop if not enough points

        var cartographicsLength = cartographics.length;
        var index;
        var i;

        var normalsArray = [];
        var bottomPositionsArray = [];
        var topPositionsArray = [];

        var previousBottom = previousBottomScratch;
        var vertexBottom = vertexBottomScratch;
        var vertexTop = vertexTopScratch;
        var nextBottom = nextBottomScratch;
        var vertexNormal = vertexNormalScratch;

        // First point - either loop or attach a "perpendicular" normal
        var startCartographic = cartographics[0];
        var nextCartographic = cartographics[1];

        var prestartCartographic = cartographics[cartographicsLength - 1];
        previousBottom = getPosition(ellipsoid, prestartCartographic, 0.0, previousBottom);
        nextBottom = getPosition(ellipsoid, nextCartographic, 0.0, nextBottom);
        vertexBottom = getPosition(ellipsoid, startCartographic, 0.0, vertexBottom);
        vertexTop = getPosition(ellipsoid, startCartographic, wallHeight, vertexTop);

        if (loop) {
            vertexNormal = computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, vertexNormal);
        } else {
            vertexNormal = computeRightNormal(startCartographic, nextCartographic, wallHeight, ellipsoid, vertexNormal);
        }

        Cartesian3.pack(vertexNormal, normalsArray, 0);
        Cartesian3.pack(vertexBottom, bottomPositionsArray, 0);
        Cartesian3.pack(vertexTop, topPositionsArray, 0);

        // Interpolate between start and start + 1
        interpolateSegment(startCartographic, nextCartographic, wallHeight, granularity, ellipsoid, normalsArray, bottomPositionsArray, topPositionsArray);

        // All inbetween points
        for (i = 1; i < cartographicsLength - 1; ++i) {
            previousBottom = Cartesian3.clone(vertexBottom, previousBottom);
            vertexBottom = Cartesian3.clone(nextBottom, vertexBottom);
            getPosition(ellipsoid, cartographics[i], wallHeight, vertexTop);
            getPosition(ellipsoid, cartographics[i + 1], 0.0, nextBottom);

            computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, vertexNormal);

            index = normalsArray.length;
            Cartesian3.pack(vertexNormal, normalsArray, index);
            Cartesian3.pack(vertexBottom, bottomPositionsArray, index);
            Cartesian3.pack(vertexTop, topPositionsArray, index);

            interpolateSegment(cartographics[i], cartographics[i + 1], wallHeight, granularity, ellipsoid, normalsArray, bottomPositionsArray, topPositionsArray);
        }

        // Last point - either loop or attach a "perpendicular" normal
        var endCartographic = cartographics[cartographicsLength - 1];
        var preEndCartographic = cartographics[cartographicsLength - 2];

        vertexBottom = getPosition(ellipsoid, endCartographic, 0.0, vertexBottom);
        vertexTop = getPosition(ellipsoid, endCartographic, wallHeight, vertexTop);

        if (loop) {
            var postEndCartographic = cartographics[0];
            previousBottom = getPosition(ellipsoid, preEndCartographic, 0.0, previousBottom);
            nextBottom = getPosition(ellipsoid, postEndCartographic, 0.0, nextBottom);

            vertexNormal = computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, vertexNormal);
        } else {
            vertexNormal = computeRightNormal(preEndCartographic, endCartographic, wallHeight, ellipsoid, vertexNormal);
        }

        index = normalsArray.length;
        Cartesian3.pack(vertexNormal, normalsArray, index);
        Cartesian3.pack(vertexBottom, bottomPositionsArray, index);
        Cartesian3.pack(vertexTop, topPositionsArray, index);

        if (loop) {
            interpolateSegment(endCartographic, startCartographic, wallHeight, granularity, ellipsoid, normalsArray, bottomPositionsArray, topPositionsArray);
            index = normalsArray.length;
            // Copy the first vertex
            for (i = 0; i < 3; ++i) {
                normalsArray[index + i] = normalsArray[i];
                bottomPositionsArray[index + i] = bottomPositionsArray[i];
                topPositionsArray[index + i] = topPositionsArray[i];
            }
        }

        return {
            rightFacingNormals : new Float32Array(normalsArray),
            bottomPositions : new Float64Array(bottomPositionsArray),
            topPositions : new Float64Array(topPositionsArray)
        };
    };

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

    return GroundPolylineGeometry;
});
