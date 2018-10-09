define([
        './ApproximateTerrainHeights',
        './arrayRemoveDuplicates',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './Check',
        './ComponentDatatype',
        './DeveloperError',
        './Math',
        './defaultValue',
        './defined',
        './defineProperties',
        './Ellipsoid',
        './EllipsoidGeodesic',
        './EncodedCartesian3',
        './GeographicProjection',
        './Geometry',
        './GeometryAttribute',
        './IntersectionTests',
        './Matrix3',
        './Plane',
        './Quaternion',
        './Rectangle',
        './WebMercatorProjection'
    ], function(
        ApproximateTerrainHeights,
        arrayRemoveDuplicates,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        Check,
        ComponentDatatype,
        DeveloperError,
        CesiumMath,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        EllipsoidGeodesic,
        EncodedCartesian3,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        IntersectionTests,
        Matrix3,
        Plane,
        Quaternion,
        Rectangle,
        WebMercatorProjection) {
    'use strict';

    var PROJECTIONS = [GeographicProjection, WebMercatorProjection];
    var PROJECTION_COUNT = PROJECTIONS.length;

    var MITER_BREAK_SMALL = Math.cos(CesiumMath.toRadians(30.0));
    var MITER_BREAK_LARGE = Math.cos(CesiumMath.toRadians(150.0));

    // Initial heights for constructing the wall.
    // Keeping WALL_INITIAL_MIN_HEIGHT near the ellipsoid surface helps
    // prevent precision problems with planes in the shader.
    // Putting the start point of a plane at ApproximateTerrainHeights._defaultMinTerrainHeight,
    // which is a highly conservative bound, usually puts the plane origin several thousands
    // of meters away from the actual terrain, causing floating point problems when checking
    // fragments on terrain against the plane.
    // Ellipsoid height is generally much closer.
    // The initial max height is arbitrary.
    // Both heights are corrected using ApproximateTerrainHeights for computing the actual volume geometry.
    var WALL_INITIAL_MIN_HEIGHT = 0.0;
    var WALL_INITIAL_MAX_HEIGHT = 1000.0;

    /**
     * A description of a polyline on terrain. Only to be used with {@link GroundPolylinePrimitive}.
     *
     * @alias GroundPolylineGeometry
     * @constructor
     *
     * @param {Object} options Options with the following properties:
     * @param {Cartesian3[]} options.positions An array of {@link Cartesian3} defining the polyline's points. Heights above the ellipsoid will be ignored.
     * @param {Number} [options.width=1.0] The screen space width in pixels.
     * @param {Number} [options.granularity=9999.0] The distance interval in meters used for interpolating options.points. Defaults to 9999.0 meters. Zero indicates no interpolation.
     * @param {Boolean} [options.loop=false] Whether during geometry creation a line segment will be added between the last and first line positions to make this Polyline a loop.
     *
     * @exception {DeveloperError} At least two positions are required.
     *
     * @see GroundPolylinePrimitive
     *
     * @example
     * var positions = Cesium.Cartesian3.fromDegreesArray([
     *   -112.1340164450331, 36.05494287836128,
     *   -112.08821010582645, 36.097804071380715,
     *   -112.13296079730024, 36.168769146801104
     * ]);
     *
     * var geometry = new Cesium.GroundPolylineGeometry({
     *   positions : positions
     * });
     */
    function GroundPolylineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;

        //>>includeStart('debug', pragmas.debug);
        if ((!defined(positions)) || (positions.length < 2)) {
            throw new DeveloperError('At least two positions are required.');
        }
        //>>includeEnd('debug');

        /**
         * The screen space width in pixels.
         * @type {Number}
         */
        this.width = defaultValue(options.width, 1.0); // Doesn't get packed, not necessary for computing geometry.

        this._positions = positions;

        /**
         * The distance interval used for interpolating options.points. Zero indicates no interpolation.
         * Default of 9999.0 allows centimeter accuracy with 32 bit floating point.
         * @type {Boolean}
         * @default 9999.0
         */
        this.granularity = defaultValue(options.granularity, 9999.0);

        /**
         * Whether during geometry creation a line segment will be added between the last and first line positions to make this Polyline a loop.
         * If the geometry has two positions this parameter will be ignored.
         * @type {Boolean}
         * @default false
         */
        this.loop = defaultValue(options.loop, false);

        this._ellipsoid = Ellipsoid.WGS84;

        // MapProjections can't be packed, so store the index to a known MapProjection.
        this._projectionIndex = 0;
        this._workerName = 'createGroundPolylineGeometry';

        // Used by GroundPolylinePrimitive to signal worker that scenemode is 3D only.
        this._scene3DOnly = false;
    }

    defineProperties(GroundPolylineGeometry.prototype, {
        /**
         * The number of elements used to pack the object into an array.
         * @memberof GroundPolylineGeometry.prototype
         * @type {Number}
         * @readonly
         * @private
         */
        packedLength: {
            get: function() {
                return 1.0 + this._positions.length * 3 + 1.0 + 1.0 + Ellipsoid.packedLength + 1.0 + 1.0;
            }
        }
    });

    /**
     * Set the GroundPolylineGeometry's projection and ellipsoid.
     * Used by GroundPolylinePrimitive to signal scene information to the geometry for generating 2D attributes.
     *
     * @param {GroundPolylineGeometry} groundPolylineGeometry GroundPolylinGeometry describing a polyline on terrain.
     * @param {Projection} mapProjection A MapProjection used for projecting cartographic coordinates to 2D.
     * @private
     */
    GroundPolylineGeometry.setProjectionAndEllipsoid = function(groundPolylineGeometry, mapProjection) {
        var projectionIndex = 0;
        for (var i = 0; i < PROJECTION_COUNT; i++) {
            if (mapProjection instanceof PROJECTIONS[i]) {
                projectionIndex = i;
                break;
            }
        }

        groundPolylineGeometry._projectionIndex = projectionIndex;
        groundPolylineGeometry._ellipsoid = mapProjection.ellipsoid;
    };

    var cart3Scratch1 = new Cartesian3();
    var cart3Scratch2 = new Cartesian3();
    var cart3Scratch3 = new Cartesian3();
    function computeRightNormal(start, end, maxHeight, ellipsoid, result) {
        var startBottom = getPosition(ellipsoid, start, 0.0, cart3Scratch1);
        var startTop = getPosition(ellipsoid, start, maxHeight, cart3Scratch2);
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
    function interpolateSegment(start, end, minHeight, maxHeight, granularity, ellipsoid, normalsArray, bottomPositionsArray, topPositionsArray, cartographicsArray) {
        if (granularity === 0.0) {
            return;
        }
        var ellipsoidGeodesic = new EllipsoidGeodesic(start, end, ellipsoid);
        var surfaceDistance = ellipsoidGeodesic.surfaceDistance;
        if (surfaceDistance < granularity) {
            return;
        }

        // Compute rightwards normal applicable at all interpolated points
        var interpolatedNormal = computeRightNormal(start, end, maxHeight, ellipsoid, interpolatedNormalScratch);

        var segments = Math.ceil(surfaceDistance / granularity);
        var interpointDistance = surfaceDistance / segments;
        var distanceFromStart = interpointDistance;
        var pointsToAdd = segments - 1;
        var packIndex = normalsArray.length;
        for (var i = 0; i < pointsToAdd; i++) {
            var interpolatedCartographic = ellipsoidGeodesic.interpolateUsingSurfaceDistance(distanceFromStart, interpolatedCartographicScratch);
            var interpolatedBottom = getPosition(ellipsoid, interpolatedCartographic, minHeight, interpolatedBottomScratch);
            var interpolatedTop = getPosition(ellipsoid, interpolatedCartographic, maxHeight, interpolatedTopScratch);

            Cartesian3.pack(interpolatedNormal, normalsArray, packIndex);
            Cartesian3.pack(interpolatedBottom, bottomPositionsArray, packIndex);
            Cartesian3.pack(interpolatedTop, topPositionsArray, packIndex);
            cartographicsArray.push(interpolatedCartographic.latitude);
            cartographicsArray.push(interpolatedCartographic.longitude);

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

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {PolygonGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    GroundPolylineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        //>>includeEnd('debug');

        var index = defaultValue(startingIndex, 0);

        var positions = value._positions;
        var positionsLength = positions.length;

        array[index++] = positionsLength;

        for (var i = 0; i < positionsLength; ++i) {
            var cartesian = positions[i];
            Cartesian3.pack(cartesian, array, index);
            index += 3;
        }

        array[index++] = value.granularity;
        array[index++] = value.loop ? 1.0 : 0.0;

        Ellipsoid.pack(value._ellipsoid, array, index);
        index += Ellipsoid.packedLength;

        array[index++] = value._projectionIndex;
        array[index++] = value._scene3DOnly ? 1.0 : 0.0;

        return array;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {PolygonGeometry} [result] The object into which to store the result.
     */
    GroundPolylineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        var index = defaultValue(startingIndex, 0);
        var positionsLength = array[index++];
        var positions = new Array(positionsLength);

        for (var i = 0; i < positionsLength; i++) {
            positions[i] = Cartesian3.unpack(array, index);
            index += 3;
        }

        var granularity = array[index++];
        var loop = array[index++] === 1.0;

        var ellipsoid = Ellipsoid.unpack(array, index);
        index += Ellipsoid.packedLength;

        var projectionIndex = array[index++];
        var scene3DOnly = (array[index++] === 1.0);

        if (!defined(result)) {
            var geometry = new GroundPolylineGeometry({
                positions : positions,
                granularity : granularity,
                loop : loop,
                ellipsoid : ellipsoid
            });
            geometry._projectionIndex = projectionIndex;
            geometry._scene3DOnly = scene3DOnly;
            return geometry;
        }

        result._positions = positions;
        result.granularity = granularity;
        result.loop = loop;
        result._ellipsoid = ellipsoid;
        result._projectionIndex = projectionIndex;
        result._scene3DOnly = scene3DOnly;

        return result;
    };

    function direction(target, origin, result) {
        Cartesian3.subtract(target, origin, result);
        Cartesian3.normalize(result, result);
        return result;
    }

    var toPreviousScratch = new Cartesian3();
    var toNextScratch = new Cartesian3();
    var forwardScratch = new Cartesian3();
    var coplanarNormalScratch = new Cartesian3();
    var coplanarPlaneScratch = new Plane(Cartesian3.UNIT_X, 0.0);
    var vertexUpScratch = new Cartesian3();
    var cosine90 = 0.0;
    function computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, result) {
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
        result = Cartesian3.normalize(result, result);

        // Rotate this direction to be orthogonal to up
        var forward = Cartesian3.cross(up, result, forwardScratch);
        Cartesian3.normalize(forward, forward);
        Cartesian3.cross(forward, up, result);
        Cartesian3.normalize(result, result);

        // Flip the normal if it isn't pointing roughly bound right (aka if forward is pointing more "backwards")
        if (Cartesian3.dot(toNext, forward) < cosine90) {
            result = Cartesian3.negate(result, result);
        }

        return result;
    }

    var XZ_PLANE = Plane.fromPointNormal(Cartesian3.ZERO, Cartesian3.UNIT_Y);

    var previousBottomScratch = new Cartesian3();
    var vertexBottomScratch = new Cartesian3();
    var vertexTopScratch = new Cartesian3();
    var nextBottomScratch = new Cartesian3();
    var vertexNormalScratch = new Cartesian3();
    var intersectionScratch = new Cartesian3();
    /**
     * Computes shadow volumes for the ground polyline, consisting of its vertices, indices, and a bounding sphere.
     * Vertices are "fat," packing all the data needed in each volume to describe a line on terrain.
     * Should not be called independent of {@link GroundPolylinePrimitive}.
     *
     * @param {GroundPolylineGeometry} groundPolylineGeometry
     * @private
     */
    GroundPolylineGeometry.createGeometry = function(groundPolylineGeometry) {
        var compute2dAttributes = !groundPolylineGeometry._scene3DOnly;
        var loop = groundPolylineGeometry.loop;
        var ellipsoid = groundPolylineGeometry._ellipsoid;
        var granularity = groundPolylineGeometry.granularity;
        var projection = new PROJECTIONS[groundPolylineGeometry._projectionIndex](ellipsoid);

        var minHeight = WALL_INITIAL_MIN_HEIGHT;
        var maxHeight = WALL_INITIAL_MAX_HEIGHT;

        var index;
        var i;

        var positions = groundPolylineGeometry._positions;
        var positionsLength = positions.length;

        if (positionsLength === 2) {
            loop = false;
        }

        // Split positions across the IDL and the Prime Meridian as well.
        // Split across prime meridian because very large geometries crossing the Prime Meridian but not the IDL
        // may get split by the plane of IDL + Prime Meridian.
        var p0;
        var p1;
        var intersection;
        var splitPositions = [positions[0]];
        for (i = 0; i < positionsLength - 1; i++) {
            p0 = positions[i];
            p1 = positions[i + 1];
            intersection = IntersectionTests.lineSegmentPlane(p0, p1, XZ_PLANE, intersectionScratch);
            if (defined(intersection) &&
                !Cartesian3.equalsEpsilon(intersection, p0, CesiumMath.EPSILON7) &&
                !Cartesian3.equalsEpsilon(intersection, p1, CesiumMath.EPSILON7)) {
                splitPositions.push(Cartesian3.clone(intersection));
            }
            splitPositions.push(p1);
        }

        if (loop) {
            p0 = positions[positionsLength - 1];
            p1 = positions[0];
            intersection = IntersectionTests.lineSegmentPlane(p0, p1, XZ_PLANE, intersectionScratch);
            if (defined(intersection) &&
                !Cartesian3.equalsEpsilon(intersection, p0, CesiumMath.EPSILON7) &&
                !Cartesian3.equalsEpsilon(intersection, p1, CesiumMath.EPSILON7)) {
                splitPositions.push(Cartesian3.clone(intersection));
            }
        }
        var cartographicsLength = splitPositions.length;

        var cartographics = new Array(cartographicsLength);
        for (i = 0; i < cartographicsLength; i++) {
            var cartographic = Cartographic.fromCartesian(splitPositions[i], ellipsoid);
            cartographic.height = 0.0;
            cartographics[i] = cartographic;
        }

        cartographics = arrayRemoveDuplicates(cartographics, Cartographic.equalsEpsilon);
        cartographicsLength = cartographics.length;

        if (cartographicsLength < 2) {
            return undefined;
        }

        /**** Build heap-side arrays for positions, interpolated cartographics, and normals from which to compute vertices ****/
        // We build a "wall" and then decompose it into separately connected component "volumes" because we need a lot
        // of information about the wall. Also, this simplifies interpolation.
        // Convention: "next" and "end" are locally forward to each segment of the wall,
        // and we are computing normals pointing towards the local right side of the vertices in each segment.
        var cartographicsArray = [];
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
        previousBottom = getPosition(ellipsoid, prestartCartographic, minHeight, previousBottom);
        nextBottom = getPosition(ellipsoid, nextCartographic, minHeight, nextBottom);
        vertexBottom = getPosition(ellipsoid, startCartographic, minHeight, vertexBottom);
        vertexTop = getPosition(ellipsoid, startCartographic, maxHeight, vertexTop);

        if (loop) {
            vertexNormal = computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, vertexNormal);
        } else {
            vertexNormal = computeRightNormal(startCartographic, nextCartographic, maxHeight, ellipsoid, vertexNormal);
        }

        Cartesian3.pack(vertexNormal, normalsArray, 0);
        Cartesian3.pack(vertexBottom, bottomPositionsArray, 0);
        Cartesian3.pack(vertexTop, topPositionsArray, 0);
        cartographicsArray.push(startCartographic.latitude);
        cartographicsArray.push(startCartographic.longitude);

        interpolateSegment(startCartographic, nextCartographic, minHeight, maxHeight, granularity, ellipsoid, normalsArray, bottomPositionsArray, topPositionsArray, cartographicsArray);

        // All inbetween points
        for (i = 1; i < cartographicsLength - 1; ++i) {
            previousBottom = Cartesian3.clone(vertexBottom, previousBottom);
            vertexBottom = Cartesian3.clone(nextBottom, vertexBottom);
            var vertexCartographic = cartographics[i];
            getPosition(ellipsoid, vertexCartographic, maxHeight, vertexTop);
            getPosition(ellipsoid, cartographics[i + 1], minHeight, nextBottom);

            computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, vertexNormal);

            index = normalsArray.length;
            Cartesian3.pack(vertexNormal, normalsArray, index);
            Cartesian3.pack(vertexBottom, bottomPositionsArray, index);
            Cartesian3.pack(vertexTop, topPositionsArray, index);
            cartographicsArray.push(vertexCartographic.latitude);
            cartographicsArray.push(vertexCartographic.longitude);

            interpolateSegment(cartographics[i], cartographics[i + 1], minHeight, maxHeight, granularity, ellipsoid, normalsArray, bottomPositionsArray, topPositionsArray, cartographicsArray);
        }

        // Last point - either loop or attach a normal "perpendicular" to the wall.
        var endCartographic = cartographics[cartographicsLength - 1];
        var preEndCartographic = cartographics[cartographicsLength - 2];

        vertexBottom = getPosition(ellipsoid, endCartographic, minHeight, vertexBottom);
        vertexTop = getPosition(ellipsoid, endCartographic, maxHeight, vertexTop);

        if (loop) {
            var postEndCartographic = cartographics[0];
            previousBottom = getPosition(ellipsoid, preEndCartographic, minHeight, previousBottom);
            nextBottom = getPosition(ellipsoid, postEndCartographic, minHeight, nextBottom);

            vertexNormal = computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, vertexNormal);
        } else {
            vertexNormal = computeRightNormal(preEndCartographic, endCartographic, maxHeight, ellipsoid, vertexNormal);
        }

        index = normalsArray.length;
        Cartesian3.pack(vertexNormal, normalsArray, index);
        Cartesian3.pack(vertexBottom, bottomPositionsArray, index);
        Cartesian3.pack(vertexTop, topPositionsArray, index);
        cartographicsArray.push(endCartographic.latitude);
        cartographicsArray.push(endCartographic.longitude);

        if (loop) {
            interpolateSegment(endCartographic, startCartographic, minHeight, maxHeight, granularity, ellipsoid, normalsArray, bottomPositionsArray, topPositionsArray, cartographicsArray);
            index = normalsArray.length;
            for (i = 0; i < 3; ++i) {
                normalsArray[index + i] = normalsArray[i];
                bottomPositionsArray[index + i] = bottomPositionsArray[i];
                topPositionsArray[index + i] = topPositionsArray[i];
            }
            cartographicsArray.push(startCartographic.latitude);
            cartographicsArray.push(startCartographic.longitude);
        }

        return generateGeometryAttributes(loop, projection, bottomPositionsArray, topPositionsArray, normalsArray, cartographicsArray, compute2dAttributes);
    };

    // If the end normal angle is too steep compared to the direction of the line segment,
    // "break" the miter by rotating the normal 90 degrees around the "up" direction at the point
    // For ultra precision we would want to project into a plane, but in practice this is sufficient.
    var lineDirectionScratch = new Cartesian3();
    var matrix3Scratch = new Matrix3();
    var quaternionScratch = new Quaternion();
    function breakMiter(endGeometryNormal, startBottom, endBottom, endTop) {
        var lineDirection = direction(endBottom, startBottom, lineDirectionScratch);

        var dot = Cartesian3.dot(lineDirection, endGeometryNormal);
        if (dot > MITER_BREAK_SMALL || dot < MITER_BREAK_LARGE) {
            var vertexUp = direction(endTop, endBottom, vertexUpScratch);
            var angle = dot < MITER_BREAK_LARGE ? CesiumMath.PI_OVER_TWO : -CesiumMath.PI_OVER_TWO;
            var quaternion = Quaternion.fromAxisAngle(vertexUp, angle, quaternionScratch);
            var rotationMatrix = Matrix3.fromQuaternion(quaternion, matrix3Scratch);
            Matrix3.multiplyByVector(rotationMatrix, endGeometryNormal, endGeometryNormal);
            return true;
        }
        return false;
    }

    var endPosCartographicScratch = new Cartographic();
    var normalStartpointScratch = new Cartesian3();
    var normalEndpointScratch = new Cartesian3();
    function projectNormal(projection, cartographic, normal, projectedPosition, result) {
        var position = Cartographic.toCartesian(cartographic, projection._ellipsoid, normalStartpointScratch);
        var normalEndpoint = Cartesian3.add(position, normal, normalEndpointScratch);
        var flipNormal = false;

        var ellipsoid = projection._ellipsoid;
        var normalEndpointCartographic = ellipsoid.cartesianToCartographic(normalEndpoint, endPosCartographicScratch);
        // If normal crosses the IDL, go the other way and flip the result.
        // In practice this almost never happens because the cartographic start
        // and end points of each segment are "nudged" to be on the same side
        // of the IDL and slightly away from the IDL.
        if (Math.abs(cartographic.longitude - normalEndpointCartographic.longitude) > CesiumMath.PI_OVER_TWO) {
            flipNormal = true;
            normalEndpoint = Cartesian3.subtract(position, normal, normalEndpointScratch);
            normalEndpointCartographic = ellipsoid.cartesianToCartographic(normalEndpoint, endPosCartographicScratch);
        }

        normalEndpointCartographic.height = 0.0;
        var normalEndpointProjected = projection.project(normalEndpointCartographic, result);
        result = Cartesian3.subtract(normalEndpointProjected, projectedPosition, result);
        result.z = 0.0;
        result = Cartesian3.normalize(result, result);
        if (flipNormal) {
            Cartesian3.negate(result, result);
        }
        return result;
    }

    var adjustHeightNormalScratch = new Cartesian3();
    var adjustHeightOffsetScratch = new Cartesian3();
    function adjustHeights(bottom, top, minHeight, maxHeight, adjustHeightBottom, adjustHeightTop) {
        // bottom and top should be at WALL_INITIAL_MIN_HEIGHT and WALL_INITIAL_MAX_HEIGHT, respectively
        var adjustHeightNormal = Cartesian3.subtract(top, bottom, adjustHeightNormalScratch);
        Cartesian3.normalize(adjustHeightNormal, adjustHeightNormal);

        var distanceForBottom = minHeight - WALL_INITIAL_MIN_HEIGHT;
        var adjustHeightOffset = Cartesian3.multiplyByScalar(adjustHeightNormal, distanceForBottom, adjustHeightOffsetScratch);
        Cartesian3.add(bottom, adjustHeightOffset, adjustHeightBottom);

        var distanceForTop = maxHeight - WALL_INITIAL_MAX_HEIGHT;
        adjustHeightOffset = Cartesian3.multiplyByScalar(adjustHeightNormal, distanceForTop, adjustHeightOffsetScratch);
        Cartesian3.add(top, adjustHeightOffset, adjustHeightTop);
    }

    var nudgeDirectionScratch = new Cartesian3();
    function nudgeXZ(start, end) {
        var startToXZdistance = Plane.getPointDistance(XZ_PLANE, start);
        var endToXZdistance = Plane.getPointDistance(XZ_PLANE, end);
        var offset = nudgeDirectionScratch;
        // Larger epsilon than what's used in GeometryPipeline, a centimeter in world space
        if (CesiumMath.equalsEpsilon(startToXZdistance, 0.0, CesiumMath.EPSILON2)) {
            offset = direction(end, start, offset);
            Cartesian3.multiplyByScalar(offset, CesiumMath.EPSILON2, offset);
            Cartesian3.add(start, offset, start);
        } else if (CesiumMath.equalsEpsilon(endToXZdistance, 0.0, CesiumMath.EPSILON2)) {
            offset = direction(start, end, offset);
            Cartesian3.multiplyByScalar(offset, CesiumMath.EPSILON2, offset);
            Cartesian3.add(end, offset, end);
        }
    }

    // "Nudge" cartographic coordinates so start and end are on the same side of the IDL.
    // Nudge amounts are tiny, basically just an IDL flip.
    // Only used for 2D/CV.
    function nudgeCartographic(start, end) {
        var absStartLon = Math.abs(start.longitude);
        var absEndLon = Math.abs(end.longitude);
        if (CesiumMath.equalsEpsilon(absStartLon, CesiumMath.PI, CesiumMath.EPSILON11)) {
            var endSign = CesiumMath.sign(end.longitude);
            start.longitude = endSign * (absStartLon - CesiumMath.EPSILON11);
            return 1;
        } else if (CesiumMath.equalsEpsilon(absEndLon, CesiumMath.PI, CesiumMath.EPSILON11)) {
            var startSign = CesiumMath.sign(start.longitude);
            end.longitude = startSign * (absEndLon - CesiumMath.EPSILON11);
            return 2;
        }
        return 0;
    }

    var startCartographicScratch = new Cartographic();
    var endCartographicScratch = new Cartographic();

    var segmentStartTopScratch = new Cartesian3();
    var segmentEndTopScratch = new Cartesian3();
    var segmentStartBottomScratch = new Cartesian3();
    var segmentEndBottomScratch = new Cartesian3();
    var segmentStartNormalScratch = new Cartesian3();
    var segmentEndNormalScratch = new Cartesian3();

    var getHeightCartographics = [startCartographicScratch, endCartographicScratch];
    var getHeightRectangleScratch = new Rectangle();

    var adjustHeightStartTopScratch = new Cartesian3();
    var adjustHeightEndTopScratch = new Cartesian3();
    var adjustHeightStartBottomScratch = new Cartesian3();
    var adjustHeightEndBottomScratch = new Cartesian3();

    var segmentStart2DScratch = new Cartesian3();
    var segmentEnd2DScratch = new Cartesian3();
    var segmentStartNormal2DScratch = new Cartesian3();
    var segmentEndNormal2DScratch = new Cartesian3();

    var offsetScratch = new Cartesian3();
    var startUpScratch = new Cartesian3();
    var endUpScratch = new Cartesian3();
    var rightScratch = new Cartesian3();
    var startPlaneNormalScratch = new Cartesian3();
    var endPlaneNormalScratch = new Cartesian3();
    var encodeScratch = new EncodedCartesian3();

    var encodeScratch2D = new EncodedCartesian3();
    var forwardOffset2DScratch = new Cartesian3();
    var right2DScratch = new Cartesian3();

    var normalNudgeScratch = new Cartesian3();

    var scratchBoundingSpheres = [new BoundingSphere(), new BoundingSphere()];

    // Winding order is reversed so each segment's volume is inside-out
    var REFERENCE_INDICES = [
        0, 2, 1, 0, 3, 2, // right
        0, 7, 3, 0, 4, 7, // start
        0, 5, 4, 0, 1, 5, // bottom
        5, 7, 4, 5, 6, 7, // left
        5, 2, 6, 5, 1, 2, // end
        3, 6, 2, 3, 7, 6 // top
    ];
    var REFERENCE_INDICES_LENGTH = REFERENCE_INDICES.length;

    // Decompose the "wall" into a series of shadow volumes.
    // Each shadow volume's vertices encode a description of the line it contains,
    // including mitering planes at the end points, a plane along the line itself,
    // and attributes for computing length-wise texture coordinates.
    function generateGeometryAttributes(loop, projection, bottomPositionsArray, topPositionsArray, normalsArray, cartographicsArray, compute2dAttributes) {
        var i;
        var index;
        var ellipsoid = projection._ellipsoid;

        // Each segment will have 8 vertices
        var segmentCount = (bottomPositionsArray.length / 3) - 1;
        var vertexCount = segmentCount * 8;
        var arraySizeVec4 = vertexCount * 4;
        var indexCount = segmentCount * 36;

        var indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
        var positionsArray = new Float64Array(vertexCount * 3);

        var startHiAndForwardOffsetX = new Float32Array(arraySizeVec4);
        var startLoAndForwardOffsetY = new Float32Array(arraySizeVec4);
        var startNormalAndForwardOffsetZ = new Float32Array(arraySizeVec4);
        var endNormalAndTextureCoordinateNormalizationX = new Float32Array(arraySizeVec4);
        var rightNormalAndTextureCoordinateNormalizationY = new Float32Array(arraySizeVec4);

        var startHiLo2D;
        var offsetAndRight2D;
        var startEndNormals2D;
        var texcoordNormalization2D;

        if (compute2dAttributes) {
            startHiLo2D = new Float32Array(arraySizeVec4);
            offsetAndRight2D = new Float32Array(arraySizeVec4);
            startEndNormals2D = new Float32Array(arraySizeVec4);
            texcoordNormalization2D = new Float32Array(vertexCount * 2);
        }

        /*** Compute total lengths for texture coordinate normalization ***/
        // 2D
        var cartographicsLength = cartographicsArray.length / 2;
        var length2D = 0.0;

        var startCartographic = startCartographicScratch;
        startCartographic.height = 0.0;
        var endCartographic = endCartographicScratch;
        endCartographic.height = 0.0;

        var segmentStartCartesian = segmentStartTopScratch;
        var segmentEndCartesian = segmentEndTopScratch;

        if (compute2dAttributes) {
            index = 0;
            for (i = 1; i < cartographicsLength; i++) {
                // Don't clone anything from previous segment b/c possible IDL touch
                startCartographic.latitude = cartographicsArray[index];
                startCartographic.longitude = cartographicsArray[index + 1];
                endCartographic.latitude = cartographicsArray[index + 2];
                endCartographic.longitude = cartographicsArray[index + 3];

                segmentStartCartesian = projection.project(startCartographic, segmentStartCartesian);
                segmentEndCartesian = projection.project(endCartographic, segmentEndCartesian);
                length2D += Cartesian3.distance(segmentStartCartesian, segmentEndCartesian);
                index += 2;
            }
        }

        // 3D
        var positionsLength = topPositionsArray.length / 3;
        segmentEndCartesian = Cartesian3.unpack(topPositionsArray, 0, segmentEndCartesian);
        var length3D = 0.0;

        index = 3;
        for (i = 1; i < positionsLength; i++) {
            segmentStartCartesian = Cartesian3.clone(segmentEndCartesian, segmentStartCartesian);
            segmentEndCartesian = Cartesian3.unpack(topPositionsArray, index, segmentEndCartesian);
            length3D += Cartesian3.distance(segmentStartCartesian, segmentEndCartesian);
            index += 3;
        }

        /*** Generate segments ***/
        var j;
        index = 3;
        var cartographicsIndex = 0;
        var vec2sWriteIndex = 0;
        var vec3sWriteIndex = 0;
        var vec4sWriteIndex = 0;
        var miterBroken = false;

        var endBottom = Cartesian3.unpack(bottomPositionsArray, 0, segmentEndBottomScratch);
        var endTop = Cartesian3.unpack(topPositionsArray, 0, segmentEndTopScratch);
        var endGeometryNormal = Cartesian3.unpack(normalsArray, 0, segmentEndNormalScratch);

        if (loop) {
            var preEndBottom = Cartesian3.unpack(bottomPositionsArray, bottomPositionsArray.length - 6, segmentStartBottomScratch);
            if (breakMiter(endGeometryNormal, preEndBottom, endBottom, endTop)) {
                // Miter broken as if for the last point in the loop, needs to be inverted for first point (clone of endBottom)
                endGeometryNormal = Cartesian3.negate(endGeometryNormal, endGeometryNormal);
            }
        }

        var lengthSoFar3D = 0.0;
        var lengthSoFar2D = 0.0;

        // For translating bounding volume
        var sumHeights = 0.0;

        for (i = 0; i < segmentCount; i++) {
            var startBottom = Cartesian3.clone(endBottom, segmentStartBottomScratch);
            var startTop = Cartesian3.clone(endTop, segmentStartTopScratch);
            var startGeometryNormal = Cartesian3.clone(endGeometryNormal, segmentStartNormalScratch);

            if (miterBroken) {
                startGeometryNormal = Cartesian3.negate(startGeometryNormal, startGeometryNormal);
            }

            endBottom = Cartesian3.unpack(bottomPositionsArray, index, segmentEndBottomScratch);
            endTop = Cartesian3.unpack(topPositionsArray, index, segmentEndTopScratch);
            endGeometryNormal = Cartesian3.unpack(normalsArray, index, segmentEndNormalScratch);

            miterBroken = breakMiter(endGeometryNormal, startBottom, endBottom, endTop);

            // 2D - don't clone anything from previous segment b/c possible IDL touch
            startCartographic.latitude = cartographicsArray[cartographicsIndex];
            startCartographic.longitude = cartographicsArray[cartographicsIndex + 1];
            endCartographic.latitude = cartographicsArray[cartographicsIndex + 2];
            endCartographic.longitude = cartographicsArray[cartographicsIndex + 3];
            var start2D;
            var end2D;
            var startGeometryNormal2D;
            var endGeometryNormal2D;

            if (compute2dAttributes) {
                var nudgeResult = nudgeCartographic(startCartographic, endCartographic);
                start2D = projection.project(startCartographic, segmentStart2DScratch);
                end2D = projection.project(endCartographic, segmentEnd2DScratch);
                var direction2D = direction(end2D, start2D, forwardOffset2DScratch);
                direction2D.y = Math.abs(direction2D.y);

                startGeometryNormal2D = segmentStartNormal2DScratch;
                endGeometryNormal2D = segmentEndNormal2DScratch;
                if (nudgeResult === 0 || Cartesian3.dot(direction2D, Cartesian3.UNIT_Y) > MITER_BREAK_SMALL) {
                    // No nudge - project the original normal
                    // Or, if the line's angle relative to the IDL is very acute,
                    // in which case snapping will produce oddly shaped volumes.
                    startGeometryNormal2D = projectNormal(projection, startCartographic, startGeometryNormal, start2D, segmentStartNormal2DScratch);
                    endGeometryNormal2D = projectNormal(projection, endCartographic, endGeometryNormal, end2D, segmentEndNormal2DScratch);
                } else if (nudgeResult === 1) {
                    // Start is close to IDL - snap start normal to align with IDL
                    endGeometryNormal2D = projectNormal(projection, endCartographic, endGeometryNormal, end2D, segmentEndNormal2DScratch);
                    startGeometryNormal2D.x = 0.0;
                    // If start longitude is negative and end longitude is less negative, relative right is unit -Y
                    // If start longitude is positive and end longitude is less positive, relative right is unit +Y
                    startGeometryNormal2D.y = CesiumMath.sign(startCartographic.longitude - Math.abs(endCartographic.longitude));
                    startGeometryNormal2D.z = 0.0;
                } else {
                    // End is close to IDL - snap end normal to align with IDL
                    startGeometryNormal2D = projectNormal(projection, startCartographic, startGeometryNormal, start2D, segmentStartNormal2DScratch);
                    endGeometryNormal2D.x = 0.0;
                    // If end longitude is negative and start longitude is less negative, relative right is unit Y
                    // If end longitude is positive and start longitude is less positive, relative right is unit -Y
                    endGeometryNormal2D.y = CesiumMath.sign(startCartographic.longitude - endCartographic.longitude);
                    endGeometryNormal2D.z = 0.0;
                }
            }

            /****************************************
             * Geometry descriptors of a "line on terrain,"
             * as opposed to the "shadow volume used to draw
             * the line on terrain":
             * - position of start + offset to end
             * - start, end, and right-facing planes
             * - encoded texture coordinate offsets
             ****************************************/

             /** 3D **/
            var segmentLength3D = Cartesian3.distance(startTop, endTop);

            var encodedStart = EncodedCartesian3.fromCartesian(startBottom, encodeScratch);
            var forwardOffset = Cartesian3.subtract(endBottom, startBottom, offsetScratch);
            var forward = Cartesian3.normalize(forwardOffset, rightScratch);

            var startUp = Cartesian3.subtract(startTop, startBottom, startUpScratch);
            startUp = Cartesian3.normalize(startUp, startUp);
            var rightNormal = Cartesian3.cross(forward, startUp, rightScratch);
            rightNormal = Cartesian3.normalize(rightNormal, rightNormal);

            var startPlaneNormal = Cartesian3.cross(startUp, startGeometryNormal, startPlaneNormalScratch);
            startPlaneNormal = Cartesian3.normalize(startPlaneNormal, startPlaneNormal);

            var endUp = Cartesian3.subtract(endTop, endBottom, endUpScratch);
            endUp = Cartesian3.normalize(endUp, endUp);
            var endPlaneNormal = Cartesian3.cross(endGeometryNormal, endUp, endPlaneNormalScratch);
            endPlaneNormal = Cartesian3.normalize(endPlaneNormal, endPlaneNormal);

            var texcoordNormalization3DX = segmentLength3D / length3D;
            var texcoordNormalization3DY = lengthSoFar3D / length3D;

            /** 2D **/
            var segmentLength2D = 0.0;
            var encodedStart2D;
            var forwardOffset2D;
            var right2D;
            var texcoordNormalization2DX = 0.0;
            var texcoordNormalization2DY = 0.0;
            if (compute2dAttributes) {
                segmentLength2D = Cartesian3.distance(start2D, end2D);

                encodedStart2D = EncodedCartesian3.fromCartesian(start2D, encodeScratch2D);
                forwardOffset2D = Cartesian3.subtract(end2D, start2D, forwardOffset2DScratch);

                // Right direction is just forward direction rotated by -90 degrees around Z
                // Similarly with plane normals
                right2D = Cartesian3.normalize(forwardOffset2D, right2DScratch);
                var swap = right2D.x;
                right2D.x = right2D.y;
                right2D.y = -swap;

                texcoordNormalization2DX = segmentLength2D / length2D;
                texcoordNormalization2DY = lengthSoFar2D / length2D;
            }
            /** Pack **/
            for (j = 0; j < 8; j++) {
                var vec4Index = vec4sWriteIndex + j * 4;
                var vec2Index = vec2sWriteIndex + j * 2;
                var wIndex = vec4Index + 3;

                // Encode sidedness of vertex relative to right plane in texture coordinate normalization X,
                // whether vertex is top or bottom of volume in sign/magnitude of normalization Y.
                var rightPlaneSide = j < 4 ? 1.0 : -1.0;
                var topBottomSide = (j === 2 || j === 3 || j === 6 || j === 7) ? 1.0 : -1.0;

                // 3D
                Cartesian3.pack(encodedStart.high, startHiAndForwardOffsetX, vec4Index);
                startHiAndForwardOffsetX[wIndex] = forwardOffset.x;

                Cartesian3.pack(encodedStart.low, startLoAndForwardOffsetY, vec4Index);
                startLoAndForwardOffsetY[wIndex] = forwardOffset.y;

                Cartesian3.pack(startPlaneNormal, startNormalAndForwardOffsetZ, vec4Index);
                startNormalAndForwardOffsetZ[wIndex] = forwardOffset.z;

                Cartesian3.pack(endPlaneNormal, endNormalAndTextureCoordinateNormalizationX, vec4Index);
                endNormalAndTextureCoordinateNormalizationX[wIndex] = texcoordNormalization3DX * rightPlaneSide;

                Cartesian3.pack(rightNormal, rightNormalAndTextureCoordinateNormalizationY, vec4Index);

                var texcoordNormalization = texcoordNormalization3DY * topBottomSide;
                if (texcoordNormalization === 0.0 && topBottomSide < 0.0) {
                    texcoordNormalization = Number.POSITIVE_INFINITY;
                }
                rightNormalAndTextureCoordinateNormalizationY[wIndex] = texcoordNormalization;

                // 2D
                if (compute2dAttributes) {
                    startHiLo2D[vec4Index] = encodedStart2D.high.x;
                    startHiLo2D[vec4Index + 1] = encodedStart2D.high.y;
                    startHiLo2D[vec4Index + 2] = encodedStart2D.low.x;
                    startHiLo2D[vec4Index + 3] = encodedStart2D.low.y;

                    startEndNormals2D[vec4Index] = -startGeometryNormal2D.y;
                    startEndNormals2D[vec4Index + 1] = startGeometryNormal2D.x;
                    startEndNormals2D[vec4Index + 2] = endGeometryNormal2D.y;
                    startEndNormals2D[vec4Index + 3] = -endGeometryNormal2D.x;

                    offsetAndRight2D[vec4Index] = forwardOffset2D.x;
                    offsetAndRight2D[vec4Index + 1] = forwardOffset2D.y;
                    offsetAndRight2D[vec4Index + 2] = right2D.x;
                    offsetAndRight2D[vec4Index + 3] = right2D.y;

                    texcoordNormalization2D[vec2Index] = texcoordNormalization2DX * rightPlaneSide;

                    texcoordNormalization = texcoordNormalization2DY * topBottomSide;
                    if (texcoordNormalization === 0.0 && topBottomSide < 0.0) {
                        texcoordNormalization = Number.POSITIVE_INFINITY;
                    }
                    texcoordNormalization2D[vec2Index + 1] = texcoordNormalization;
                }
            }

            // Adjust height of volume in 3D
            var adjustHeightStartBottom = adjustHeightStartBottomScratch;
            var adjustHeightEndBottom = adjustHeightEndBottomScratch;
            var adjustHeightStartTop = adjustHeightStartTopScratch;
            var adjustHeightEndTop = adjustHeightEndTopScratch;

            var getHeightsRectangle = Rectangle.fromCartographicArray(getHeightCartographics, getHeightRectangleScratch);
            var minMaxHeights = ApproximateTerrainHeights.getApproximateTerrainHeights(getHeightsRectangle, ellipsoid);
            var minHeight = minMaxHeights.minimumTerrainHeight;
            var maxHeight = minMaxHeights.maximumTerrainHeight;

            sumHeights += minHeight;
            sumHeights += maxHeight;

            adjustHeights(startBottom, startTop, minHeight, maxHeight, adjustHeightStartBottom, adjustHeightStartTop);
            adjustHeights(endBottom, endTop, minHeight, maxHeight, adjustHeightEndBottom, adjustHeightEndTop);

            // Nudge the positions away from the "polyline" a little bit to prevent errors in GeometryPipeline
            var normalNudge = Cartesian3.multiplyByScalar(rightNormal, CesiumMath.EPSILON5, normalNudgeScratch);
            Cartesian3.add(adjustHeightStartBottom, normalNudge, adjustHeightStartBottom);
            Cartesian3.add(adjustHeightEndBottom, normalNudge, adjustHeightEndBottom);
            Cartesian3.add(adjustHeightStartTop, normalNudge, adjustHeightStartTop);
            Cartesian3.add(adjustHeightEndTop, normalNudge, adjustHeightEndTop);

            // If the segment is very close to the XZ plane, nudge the vertices slightly to avoid touching it.
            nudgeXZ(adjustHeightStartBottom, adjustHeightEndBottom);
            nudgeXZ(adjustHeightStartTop, adjustHeightEndTop);

            Cartesian3.pack(adjustHeightStartBottom, positionsArray, vec3sWriteIndex);
            Cartesian3.pack(adjustHeightEndBottom, positionsArray, vec3sWriteIndex + 3);
            Cartesian3.pack(adjustHeightEndTop, positionsArray, vec3sWriteIndex + 6);
            Cartesian3.pack(adjustHeightStartTop, positionsArray, vec3sWriteIndex + 9);

            normalNudge = Cartesian3.multiplyByScalar(rightNormal, -2.0 * CesiumMath.EPSILON5, normalNudgeScratch);
            Cartesian3.add(adjustHeightStartBottom, normalNudge, adjustHeightStartBottom);
            Cartesian3.add(adjustHeightEndBottom, normalNudge, adjustHeightEndBottom);
            Cartesian3.add(adjustHeightStartTop, normalNudge, adjustHeightStartTop);
            Cartesian3.add(adjustHeightEndTop, normalNudge, adjustHeightEndTop);

            nudgeXZ(adjustHeightStartBottom, adjustHeightEndBottom);
            nudgeXZ(adjustHeightStartTop, adjustHeightEndTop);

            Cartesian3.pack(adjustHeightStartBottom, positionsArray, vec3sWriteIndex + 12);
            Cartesian3.pack(adjustHeightEndBottom, positionsArray, vec3sWriteIndex + 15);
            Cartesian3.pack(adjustHeightEndTop, positionsArray, vec3sWriteIndex + 18);
            Cartesian3.pack(adjustHeightStartTop, positionsArray, vec3sWriteIndex + 21);

            cartographicsIndex += 2;
            index += 3;

            vec2sWriteIndex += 16;
            vec3sWriteIndex += 24;
            vec4sWriteIndex += 32;

            lengthSoFar3D += segmentLength3D;
            lengthSoFar2D += segmentLength2D;
        }

        index = 0;
        var indexOffset = 0;
        for (i = 0; i < segmentCount; i++) {
            for (j = 0; j < REFERENCE_INDICES_LENGTH; j++) {
                indices[index + j] = REFERENCE_INDICES[j] + indexOffset;
            }
            indexOffset += 8;
            index += REFERENCE_INDICES_LENGTH;
        }

        var boundingSpheres = scratchBoundingSpheres;
        BoundingSphere.fromVertices(bottomPositionsArray, Cartesian3.ZERO, 3, boundingSpheres[0]);
        BoundingSphere.fromVertices(topPositionsArray, Cartesian3.ZERO, 3, boundingSpheres[1]);
        var boundingSphere = BoundingSphere.fromBoundingSpheres(boundingSpheres);

        // Adjust bounding sphere height and radius to cover more of the volume
        boundingSphere.radius += sumHeights / (segmentCount * 2.0);

        var attributes = {
            position : new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                normalize : false,
                values : positionsArray
            }),
            startHiAndForwardOffsetX : getVec4GeometryAttribute(startHiAndForwardOffsetX),
            startLoAndForwardOffsetY : getVec4GeometryAttribute(startLoAndForwardOffsetY),
            startNormalAndForwardOffsetZ : getVec4GeometryAttribute(startNormalAndForwardOffsetZ),
            endNormalAndTextureCoordinateNormalizationX : getVec4GeometryAttribute(endNormalAndTextureCoordinateNormalizationX),
            rightNormalAndTextureCoordinateNormalizationY : getVec4GeometryAttribute(rightNormalAndTextureCoordinateNormalizationY)
        };

        if (compute2dAttributes) {
            attributes.startHiLo2D = getVec4GeometryAttribute(startHiLo2D);
            attributes.offsetAndRight2D = getVec4GeometryAttribute(offsetAndRight2D);
            attributes.startEndNormals2D = getVec4GeometryAttribute(startEndNormals2D);
            attributes.texcoordNormalization2D = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                normalize : false,
                values : texcoordNormalization2D
            });
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            boundingSphere : boundingSphere
        });
    }

    function getVec4GeometryAttribute(typedArray) {
        return new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 4,
            normalize : false,
            values : typedArray
        });
    }

    /**
     * Approximates an ellipsoid-tangent vector in 2D by projecting the end point into 2D.
     * Exposed for testing.
     *
     * @param {MapProjection} projection Map Projection for projecting coordinates to 2D.
     * @param {Cartographic} cartographic The cartographic origin point of the normal.
     *   Used to check if the normal crosses the IDL during projection.
     * @param {Cartesian3} normal The normal in 3D.
     * @param {Cartesian3} projectedPosition The projected origin point of the normal in 2D.
     * @param {Cartesian3} result Result parameter on which to store the projected normal.
     * @private
     */
    GroundPolylineGeometry._projectNormal = projectNormal;

    return GroundPolylineGeometry;
});
