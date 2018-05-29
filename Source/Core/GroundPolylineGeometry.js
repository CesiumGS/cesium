define([
        './ApproximateTerrainHeights',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './Check',
        './ComponentDatatype',
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
        './Matrix3',
        './Plane',
        './Quaternion',
        './Rectangle',
        './WebMercatorProjection'
    ], function(
        ApproximateTerrainHeights,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        Check,
        ComponentDatatype,
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
        Matrix3,
        Plane,
        Quaternion,
        Rectangle,
        WebMercatorProjection) {
    'use strict';

    var PROJECTIONS = [GeographicProjection, WebMercatorProjection];
    var PROJECTION_COUNT = PROJECTIONS.length;

    var MITER_BREAK_SMALL = Math.cos(CesiumMath.toRadians(30));
    var MITER_BREAK_LARGE = Math.cos(CesiumMath.toRadians(150));

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
     * @param {Number} [options.maximumTerrainHeight]
     * @param {Number} [options.minimumTerrainHeight]
     * @param {MapProjection} [options.projection]
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

        this.minimumTerrainHeight = defaultValue(options.minimumTerrainHeight, ApproximateTerrainHeights._defaultMinTerrainHeight);
        this.maximumTerrainHeight = defaultValue(options.maximumTerrainHeight, ApproximateTerrainHeights._defaultMaxTerrainHeight);

        var projectionIndex = 0;
        if (defined(options.projection)) {
            for (var i = 0; i < PROJECTION_COUNT; i++) {
                if (options.projection instanceof PROJECTIONS[i]) { // TODO: is this ok?
                    projectionIndex = i;
                    break;
                }
            }
        }
        this.projectionIndex = projectionIndex;

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = 1.0 + this._positions.length * 2 + 1.0 + 1.0 + Ellipsoid.packedLength + 1.0 + 1.0 + 1.0;

        this._workerName = 'createGroundPolylineGeometry';
    }

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
            // TODO: doc, packedLength, etc.
            set: function(value) {
                this._positions = defaultValue(value, []);
            }
        }
    });

    GroundPolylineGeometry.pack = function(value, packArray, startingIndex) {
        startingIndex = defaultValue(startingIndex, 0);

        // Pack position length, then all positions
        var positions = value._positions;
        var positionsLength = positions.length;

        var index = startingIndex;
        packArray[index++] = positionsLength;

        for (var i = 0; i < positionsLength; ++i) {
            var cartographic = positions[i];
            packArray[index++] = cartographic.longitude;
            packArray[index++] = cartographic.latitude;
        }

        packArray[index++] = value.granularity;
        packArray[index++] = value.loop ? 1.0 : 0.0;

        Ellipsoid.pack(value.ellipsoid, packArray, index);
        index += Ellipsoid.packedLength;

        packArray[index++] = value.minimumTerrainHeight;
        packArray[index++] = value.maximumTerrainHeight;
        packArray[index++] = value.projectionIndex;

        return packArray;
    };

    GroundPolylineGeometry.unpack = function(packArray, startingIndex, result) {
        var index = defaultValue(startingIndex, 0);
        var positions = [];

        var positionsLength = packArray[index++];
        for (var i = 0; i < positionsLength; i++) {
            var cartographic = new Cartographic();
            cartographic.longitude = packArray[index++];
            cartographic.latitude = packArray[index++];
            positions.push(cartographic);
        }

        var granularity = packArray[index++];
        var loop = packArray[index++] === 1.0 ? true : false;

        var ellipsoid = Ellipsoid.unpack(packArray, index);
        index += Ellipsoid.packedLength;

        var minimumTerrainHeight = packArray[index++];
        var maximumTerrainHeight = packArray[index++];
        var projectionIndex = packArray[index++];

        if (!defined(result)) {
            return new GroundPolylineGeometry({
                positions : positions,
                granularity : granularity,
                loop : loop,
                ellipsoid : ellipsoid,
                maximumTerrainHeight : maximumTerrainHeight,
                minimumTerrainHeight : minimumTerrainHeight,
                projection : new PROJECTIONS[projectionIndex](ellipsoid)
            });
        }

        result._positions = positions;
        result.granularity = granularity;
        result.loop = loop;
        result.ellipsoid = ellipsoid;
        result.maximumTerrainHeight = maximumTerrainHeight;
        result.minimumTerrainHeight = minimumTerrainHeight;
        result.projectionIndex = projectionIndex;

        return result;
    };

    // If the end normal angle is too steep compared to the direction of the line segment,
    // "break" the miter by rotating the normal 90 degrees around the "up" direction at the point
    // For ultra precision we would want to project into a plane, but in practice this is sufficient.
    var lineDirectionScratch = new Cartesian3();
    var vertexUpScratch = new Cartesian3();
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

    var previousBottomScratch = new Cartesian3();
    var vertexBottomScratch = new Cartesian3();
    var vertexTopScratch = new Cartesian3();
    var nextBottomScratch = new Cartesian3();
    var vertexNormalScratch = new Cartesian3();
    GroundPolylineGeometry.createGeometry = function(groundPolylineGeometry) {
        var cartographics = groundPolylineGeometry.positions;
        var loop = groundPolylineGeometry.loop;
        var ellipsoid = groundPolylineGeometry.ellipsoid;
        var granularity = groundPolylineGeometry.granularity;
        var projection = new PROJECTIONS[groundPolylineGeometry.projectionIndex](ellipsoid);

        var maxHeight = groundPolylineGeometry.maximumTerrainHeight;
        var minHeight = groundPolylineGeometry.minimumTerrainHeight;

        var cartographicsLength = cartographics.length;

        // TODO: throw errors/negate loop if not enough points

        var index;
        var i;

        /**** Build heap-side arrays of positions, cartographics, and normals from which to compute vertices ****/
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

        // Interpolate between start and start + 1
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

        // Last point - either loop or attach a "perpendicular" normal
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
            // Copy the first vertex
            for (i = 0; i < 3; ++i) {
                normalsArray[index + i] = normalsArray[i];
                bottomPositionsArray[index + i] = bottomPositionsArray[i];
                topPositionsArray[index + i] = topPositionsArray[i];
            }
            cartographicsArray.push(startCartographic.latitude);
            cartographicsArray.push(startCartographic.longitude);
        }

        return generateGeometryAttributes(groundPolylineGeometry, projection, bottomPositionsArray, topPositionsArray, normalsArray, cartographicsArray);
    };

    var positionCartographicScratch = new Cartographic();
    var normalEndpointScratch = new Cartesian3();
    function projectNormal(projection, position, normal, projectedPosition, result) {
        var normalEndpoint = Cartesian3.add(position, normal, normalEndpointScratch);

        var ellipsoid = projection.ellipsoid;
        var normalEndpointCartographic = ellipsoid.cartesianToCartographic(normalEndpoint, positionCartographicScratch);
        normalEndpointCartographic.height = 0.0;
        var normalEndpointProjected = projection.project(normalEndpointCartographic, result);
        result = Cartesian3.subtract(normalEndpointProjected, projectedPosition, result);
        result.z = 0.0;
        result = Cartesian3.normalize(result, result);
        return result;
    }

    var adjustHeightNormalScratch = new Cartesian3();
    var adjustHeightOffsetScratch = new Cartesian3();
    function adjustHeights(groundPolylineGeometry, bottom, top, minHeight, maxHeight, adjustHeightBottom, adjustHeightTop) {
        // bottom and top should be at groundPolylineGeometry.minimumTerrainHeight and groundPolylineGeometry.maximumTerrainHeight, respectively
        var adjustHeightNormal = Cartesian3.subtract(top, bottom, adjustHeightNormalScratch);
        Cartesian3.normalize(adjustHeightNormal, adjustHeightNormal);

        var distanceForBottom = minHeight - groundPolylineGeometry.minimumTerrainHeight;
        var adjustHeightOffset = Cartesian3.multiplyByScalar(adjustHeightNormal, distanceForBottom, adjustHeightOffsetScratch);
        Cartesian3.add(bottom, adjustHeightOffset, adjustHeightBottom);

        var distanceForTop = maxHeight - groundPolylineGeometry.maximumTerrainHeight;
        adjustHeightOffset = Cartesian3.multiplyByScalar(adjustHeightNormal, distanceForTop, adjustHeightOffsetScratch);
        Cartesian3.add(top, adjustHeightOffset, adjustHeightTop);
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
    function generateGeometryAttributes(groundPolylineGeometry, projection, bottomPositionsArray, topPositionsArray, normalsArray, cartographicsArray) {
        var i;
        var index;
        var loop = groundPolylineGeometry.loop;
        var ellipsoid = groundPolylineGeometry.ellipsoid;

        // Each segment will have 8 vertices
        var segmentCount = (bottomPositionsArray.length / 3) - 1;
        var vertexCount = segmentCount * 8;
        var arraySizeVec4 = vertexCount * 4;
        var indexCount = segmentCount * 36;

        var indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
        var positionsArray = new Float64Array(vertexCount * 3);

        var startHi_and_forwardOffsetX = new Float32Array(arraySizeVec4);
        var startLo_and_forwardOffsetY = new Float32Array(arraySizeVec4);
        var startNormal_and_forwardOffsetZ = new Float32Array(arraySizeVec4);
        var endNormal_andTextureCoordinateNormalizationX = new Float32Array(arraySizeVec4);
        var rightNormal_andTextureCoordinateNormalizationY = new Float32Array(arraySizeVec4);

        var startHiLo2D = new Float32Array(arraySizeVec4);
        var offsetAndRight2D = new Float32Array(arraySizeVec4);
        var startEndNormals2D = new Float32Array(arraySizeVec4);
        var texcoordNormalization2D = new Float32Array(vertexCount * 2);

        /*** Compute total lengths for texture coordinate normalization ***/
        // 2D
        var cartographicsLength = cartographicsArray.length / 2;
        var length2D = 0.0;
        var length3D = 0.0;

        var cartographic = startCartographicScratch;
        cartographic.latitude = cartographicsArray[0];
        cartographic.longitude = cartographicsArray[1];
        cartographic.height = 0.0;

        var segmentStartCartesian = segmentStartTopScratch;
        var segmentEndCartesian = projection.project(cartographic, segmentEndTopScratch);

        index = 2;
        for (i = 1; i < cartographicsLength; i++) {
            cartographic.latitude = cartographicsArray[index];
            cartographic.longitude = cartographicsArray[index + 1];

            segmentStartCartesian = Cartesian3.clone(segmentEndCartesian, segmentStartCartesian);
            segmentEndCartesian = projection.project(cartographic, segmentEndCartesian);
            length2D += Cartesian3.distance(segmentStartCartesian, segmentEndCartesian);
            index += 2;
        }

        // 3D
        var positionsLength = topPositionsArray.length / 3;
        segmentEndCartesian = Cartesian3.unpack(topPositionsArray, 0, segmentEndCartesian);

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
        var cartographicsIndex = 2;
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
                endGeometryNormal = Cartesian3.multiplyByScalar(endGeometryNormal, -1.0, endGeometryNormal);
            }
        }
        var endCartographic = endCartographicScratch;
        var startCartographic = startCartographicScratch;
        endCartographic.latitude = cartographicsArray[0];
        endCartographic.longitude = cartographicsArray[1];
        var end2D = projection.project(endCartographic, segmentEnd2DScratch);
        var endGeometryNormal2D = projectNormal(projection, endBottom, endGeometryNormal, end2D, segmentEndNormal2DScratch);

        var lengthSoFar3D = 0.0;
        var lengthSoFar2D = 0.0;

        var boundingSphere = BoundingSphere.fromPoints([endBottom, endTop]);
        for (i = 0; i < segmentCount; i++) {
            var startBottom = Cartesian3.clone(endBottom, segmentStartBottomScratch);
            var startTop = Cartesian3.clone(endTop, segmentStartTopScratch);
            var startGeometryNormal = Cartesian3.clone(endGeometryNormal, segmentStartNormalScratch);

            var start2D = Cartesian3.clone(end2D, segmentStart2DScratch);
            var startGeometryNormal2D = Cartesian3.clone(endGeometryNormal2D, segmentStartNormal2DScratch);
            startCartographic = Cartographic.clone(endCartographic, startCartographic);

            if (miterBroken) {
                // If miter was broken for the previous segment's end vertex, flip for this segment's start vertex
                // These normals are "right facing."
                startGeometryNormal = Cartesian3.multiplyByScalar(startGeometryNormal, -1.0, startGeometryNormal);
                startGeometryNormal2D = Cartesian3.multiplyByScalar(startGeometryNormal2D, -1.0, startGeometryNormal2D);
            }

            endBottom = Cartesian3.unpack(bottomPositionsArray, index, segmentEndBottomScratch);
            endTop = Cartesian3.unpack(topPositionsArray, index, segmentEndTopScratch);
            endGeometryNormal = Cartesian3.unpack(normalsArray, index, segmentEndNormalScratch);

            BoundingSphere.expand(boundingSphere, endBottom, boundingSphere);
            BoundingSphere.expand(boundingSphere, endTop, boundingSphere);

            miterBroken = breakMiter(endGeometryNormal, startBottom, endBottom, endTop);

            endCartographic.latitude = cartographicsArray[cartographicsIndex];
            endCartographic.longitude = cartographicsArray[cartographicsIndex + 1];
            end2D = projection.project(endCartographic, segmentEnd2DScratch);
            endGeometryNormal2D = projectNormal(projection, endBottom, endGeometryNormal, end2D, segmentEndNormal2DScratch);

            /****************************************
             * Geometry descriptors:
             * - position of start + offset to end
             * - start, end, and right-facing planes
             * - encoded texture coordinate offsets
             ****************************************/

             /** 3D **/
            var segmentLength3D = Cartesian3.distance(startTop, endTop);

            // Encode start position and end position as high precision point + offset
            var encodedStart = EncodedCartesian3.fromCartesian(startBottom, encodeScratch);
            var forwardOffset = Cartesian3.subtract(endBottom, startBottom, offsetScratch);
            var forward = Cartesian3.normalize(forwardOffset, rightScratch);

            // Right plane
            var startUp = Cartesian3.subtract(startTop, startBottom, startUpScratch);
            startUp = Cartesian3.normalize(startUp, startUp);
            var rightNormal = Cartesian3.cross(forward, startUp, rightScratch);
            rightNormal = Cartesian3.normalize(rightNormal, rightNormal);

            // Plane normals perpendicular to "geometry" normals, so cross (startTop - startBottom) with geometry normal at start
            var startPlaneNormal = Cartesian3.cross(startUp, startGeometryNormal, startPlaneNormalScratch);
            startPlaneNormal = Cartesian3.normalize(startPlaneNormal, startPlaneNormal);

            // Similarly with (endTop - endBottom)
            var endUp = Cartesian3.subtract(endTop, endBottom, endUpScratch);
            endUp = Cartesian3.normalize(endUp, endUp);
            var endPlaneNormal = Cartesian3.cross(endGeometryNormal, endUp, endPlaneNormalScratch);
            endPlaneNormal = Cartesian3.normalize(endPlaneNormal, endPlaneNormal);

            var texcoordNormalization3DX = segmentLength3D / length3D;
            var texcoordNormalization3DY = lengthSoFar3D / length3D;

            /** 2D **/
            // In 2D case, positions and normals can be done as 2 components
            var segmentLength2D = Cartesian3.distance(start2D, end2D);

            var encodedStart2D = EncodedCartesian3.fromCartesian(start2D, encodeScratch2D);
            var forwardOffset2D = Cartesian3.subtract(end2D, start2D, forwardOffset2DScratch);

            // Right direction is just forward direction rotated by -90 degrees around Z
            // Similarly with plane normals
            var right2D = Cartesian3.normalize(forwardOffset2D, right2DScratch);
            var swap = right2D.x;
            right2D.x = right2D.y;
            right2D.y = -swap;

            var texcoordNormalization2DX = segmentLength2D / length2D;
            var texcoordNormalization2DY = lengthSoFar2D / length2D;

            /** Pack **/
            for (j = 0; j < 8; j++) {
                var vec4Index = vec4sWriteIndex + j * 4;
                var vec2Index = vec2sWriteIndex + j * 2;
                var wIndex = vec4Index + 3;

                // 3D
                Cartesian3.pack(encodedStart.high, startHi_and_forwardOffsetX, vec4Index);
                startHi_and_forwardOffsetX[wIndex] = forwardOffset.x;

                Cartesian3.pack(encodedStart.low, startLo_and_forwardOffsetY, vec4Index);
                startLo_and_forwardOffsetY[wIndex] = forwardOffset.y;

                Cartesian3.pack(startPlaneNormal, startNormal_and_forwardOffsetZ, vec4Index);
                startNormal_and_forwardOffsetZ[wIndex] = forwardOffset.z;

                Cartesian3.pack(endPlaneNormal, endNormal_andTextureCoordinateNormalizationX, vec4Index);
                endNormal_andTextureCoordinateNormalizationX[wIndex] = texcoordNormalization3DX;

                Cartesian3.pack(rightNormal, rightNormal_andTextureCoordinateNormalizationY, vec4Index);
                rightNormal_andTextureCoordinateNormalizationY[wIndex] = texcoordNormalization3DY;

                // 2D
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

                texcoordNormalization2D[vec2Index] = texcoordNormalization2DX;
                texcoordNormalization2D[vec2Index + 1] = texcoordNormalization2DY;
            }

            /****************************************************************
             * Vertex Positions
             *
             * Encode which side of the line segment each position is on by
             * pushing it "away" by 1 meter along the geometry normal.
             *
             * Needed when pushing the vertices out by varying amounts to
             * help simulate constant screen-space line width.
             ****************************************************************/
            // Adjust heights of positions in 3D
            var adjustHeightStartBottom = adjustHeightStartBottomScratch;
            var adjustHeightEndBottom = adjustHeightEndBottomScratch;
            var adjustHeightStartTop = adjustHeightStartTopScratch;
            var adjustHeightEndTop = adjustHeightEndTopScratch;

            var getHeightsRectangle = Rectangle.fromCartographicArray(getHeightCartographics, getHeightRectangleScratch);
            var minMaxHeights = ApproximateTerrainHeights.getApproximateTerrainHeights(getHeightsRectangle, ellipsoid);
            var minHeight = minMaxHeights.minimumTerrainHeight;
            var maxHeight = minMaxHeights.maximumTerrainHeight;

            adjustHeights(groundPolylineGeometry, startBottom, startTop, minHeight, maxHeight, adjustHeightStartBottom, adjustHeightStartTop);
            adjustHeights(groundPolylineGeometry, endBottom, endTop, minHeight, maxHeight, adjustHeightEndBottom, adjustHeightEndTop);

            // Push out by 1.0 in the "right" direction
            var pushedStartBottom = Cartesian3.add(adjustHeightStartBottom, startGeometryNormal, adjustHeightStartBottom);
            var pushedEndBottom = Cartesian3.add(adjustHeightEndBottom, endGeometryNormal, adjustHeightEndBottom);
            var pushedEndTop = Cartesian3.add(adjustHeightEndTop, endGeometryNormal, adjustHeightEndTop);
            var pushedStartTop = Cartesian3.add(adjustHeightStartTop, startGeometryNormal, adjustHeightStartTop);
            Cartesian3.pack(pushedStartBottom, positionsArray, vec3sWriteIndex);
            Cartesian3.pack(pushedEndBottom, positionsArray, vec3sWriteIndex + 3);
            Cartesian3.pack(pushedEndTop, positionsArray, vec3sWriteIndex + 6);
            Cartesian3.pack(pushedStartTop, positionsArray, vec3sWriteIndex + 9);

            // Return to center
            pushedStartBottom = Cartesian3.subtract(adjustHeightStartBottom, startGeometryNormal, adjustHeightStartBottom);
            pushedEndBottom = Cartesian3.subtract(adjustHeightEndBottom, endGeometryNormal, adjustHeightEndBottom);
            pushedEndTop = Cartesian3.subtract(adjustHeightEndTop, endGeometryNormal, adjustHeightEndTop);
            pushedStartTop = Cartesian3.subtract(adjustHeightStartTop, startGeometryNormal, adjustHeightStartTop);

            // Push out by 1.0 in the "left" direction
            pushedStartBottom = Cartesian3.subtract(adjustHeightStartBottom, startGeometryNormal, adjustHeightStartBottom);
            pushedEndBottom = Cartesian3.subtract(adjustHeightEndBottom, endGeometryNormal, adjustHeightEndBottom);
            pushedEndTop = Cartesian3.subtract(adjustHeightEndTop, endGeometryNormal, adjustHeightEndTop);
            pushedStartTop = Cartesian3.subtract(adjustHeightStartTop, startGeometryNormal, adjustHeightStartTop);
            Cartesian3.pack(pushedStartBottom, positionsArray, vec3sWriteIndex + 12);
            Cartesian3.pack(pushedEndBottom, positionsArray, vec3sWriteIndex + 15);
            Cartesian3.pack(pushedEndTop, positionsArray, vec3sWriteIndex + 18);
            Cartesian3.pack(pushedStartTop, positionsArray, vec3sWriteIndex + 21);

            cartographicsIndex += 2;
            index += 3;

            vec2sWriteIndex += 16;
            vec3sWriteIndex += 24;
            vec4sWriteIndex += 32;

            lengthSoFar3D += segmentLength3D;
            lengthSoFar2D = segmentLength2D;
        }

        /*** Generate indices ***/
        index = 0;
        var indexOffset = 0;
        for (i = 0; i < segmentCount; i++) {
            for (j = 0; j < REFERENCE_INDICES_LENGTH; j++) {
                indices[index + j] = REFERENCE_INDICES[j] + indexOffset;
            }
            indexOffset += 8;
            index += REFERENCE_INDICES_LENGTH;
        }

        return new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    normalize : false,
                    values : positionsArray
                }),
                startHi_and_forwardOffsetX : getVec4Attribute(startHi_and_forwardOffsetX),
                startLo_and_forwardOffsetY : getVec4Attribute(startLo_and_forwardOffsetY),
                startNormal_and_forwardOffsetZ : getVec4Attribute(startNormal_and_forwardOffsetZ),
                endNormal_andTextureCoordinateNormalizationX : getVec4Attribute(endNormal_andTextureCoordinateNormalizationX),
                rightNormal_andTextureCoordinateNormalizationY : getVec4Attribute(rightNormal_andTextureCoordinateNormalizationY),

                startHiLo2D : getVec4Attribute(startHiLo2D),
                offsetAndRight2D : getVec4Attribute(offsetAndRight2D),
                startEndNormals2D : getVec4Attribute(startEndNormals2D),
                texcoordNormalization2D : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    normalize : false,
                    values : texcoordNormalization2D
                })
            },
            indices : indices,
            boundingSphere : boundingSphere
        });
    }

    function getVec4Attribute(typedArray) {
        return new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 4,
            normalize : false,
            values : typedArray
        });
    }

    function direction(target, origin, result) {
        Cartesian3.subtract(target, origin, result);
        Cartesian3.normalize(result, result);
        return result;
    }

    // Inputs are cartesians
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
