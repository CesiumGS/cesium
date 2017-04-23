/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './IndexDatatype',
        './Math',
        './PrimitiveType',
        './VertexFormat',
        './WallGeometryLibrary'
    ], function(
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        IndexDatatype,
        CesiumMath,
        PrimitiveType,
        VertexFormat,
        WallGeometryLibrary) {
    'use strict';

    var scratchCartesian3Position1 = new Cartesian3();
    var scratchCartesian3Position2 = new Cartesian3();
    var scratchCartesian3Position3 = new Cartesian3();
    var scratchCartesian3Position4 = new Cartesian3();
    var scratchCartesian3Position5 = new Cartesian3();
    var scratchBitangent = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchNormal = new Cartesian3();

    /**
     * A description of a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     *
     * @alias WallGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number[]} [options.maximumHeights] An array parallel to <code>positions</code> that give the maximum height of the
     *        wall at <code>positions</code>. If undefined, the height of each position in used.
     * @param {Number[]} [options.minimumHeights] An array parallel to <code>positions</code> that give the minimum height of the
     *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} positions length must be greater than or equal to 2.
     * @exception {DeveloperError} positions and maximumHeights must have the same length.
     * @exception {DeveloperError} positions and minimumHeights must have the same length.
     *
     * @see WallGeometry#createGeometry
     * @see WallGeometry#fromConstantHeight
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Wall.html|Cesium Sandcastle Wall Demo}
     *
     * @example
     * // create a wall that spans from ground level to 10000 meters
     * var wall = new Cesium.WallGeometry({
     *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
     *     19.0, 47.0, 10000.0,
     *     19.0, 48.0, 10000.0,
     *     20.0, 48.0, 10000.0,
     *     20.0, 47.0, 10000.0,
     *     19.0, 47.0, 10000.0
     *   ])
     * });
     * var geometry = Cesium.WallGeometry.createGeometry(wall);
     */
    function WallGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var wallPositions = options.positions;
        var maximumHeights = options.maximumHeights;
        var minimumHeights = options.minimumHeights;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(wallPositions)) {
            throw new DeveloperError('options.positions is required.');
        }
        if (defined(maximumHeights) && maximumHeights.length !== wallPositions.length) {
            throw new DeveloperError('options.positions and options.maximumHeights must have the same length.');
        }
        if (defined(minimumHeights) && minimumHeights.length !== wallPositions.length) {
            throw new DeveloperError('options.positions and options.minimumHeights must have the same length.');
        }
        //>>includeEnd('debug');

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        this._positions = wallPositions;
        this._minimumHeights = minimumHeights;
        this._maximumHeights = maximumHeights;
        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._granularity = granularity;
        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._workerName = 'createWallGeometry';

        var numComponents = 1 + wallPositions.length * Cartesian3.packedLength + 2;
        if (defined(minimumHeights)) {
            numComponents += minimumHeights.length;
        }
        if (defined(maximumHeights)) {
            numComponents += maximumHeights.length;
        }

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = numComponents + Ellipsoid.packedLength + VertexFormat.packedLength + 1;
    }

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {WallGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    WallGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var i;

        var positions = value._positions;
        var length = positions.length;
        array[startingIndex++] = length;

        for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            Cartesian3.pack(positions[i], array, startingIndex);
        }

        var minimumHeights = value._minimumHeights;
        length = defined(minimumHeights) ? minimumHeights.length : 0;
        array[startingIndex++] = length;

        if (defined(minimumHeights)) {
            for (i = 0; i < length; ++i) {
                array[startingIndex++] = minimumHeights[i];
            }
        }

        var maximumHeights = value._maximumHeights;
        length = defined(maximumHeights) ? maximumHeights.length : 0;
        array[startingIndex++] = length;

        if (defined(maximumHeights)) {
            for (i = 0; i < length; ++i) {
                array[startingIndex++] = maximumHeights[i];
            }
        }

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex] = value._granularity;

        return array;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        positions : undefined,
        minimumHeights : undefined,
        maximumHeights : undefined,
        ellipsoid : scratchEllipsoid,
        vertexFormat : scratchVertexFormat,
        granularity : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {WallGeometry} [result] The object into which to store the result.
     * @returns {WallGeometry} The modified result parameter or a new WallGeometry instance if one was not provided.
     */
    WallGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var i;

        var length = array[startingIndex++];
        var positions = new Array(length);

        for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            positions[i] = Cartesian3.unpack(array, startingIndex);
        }

        length = array[startingIndex++];
        var minimumHeights;

        if (length > 0) {
            minimumHeights = new Array(length);
            for (i = 0; i < length; ++i) {
                minimumHeights[i] = array[startingIndex++];
            }
        }

        length = array[startingIndex++];
        var maximumHeights;

        if (length > 0) {
            maximumHeights = new Array(length);
            for (i = 0; i < length; ++i) {
                maximumHeights[i] = array[startingIndex++];
            }
        }

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var granularity = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.positions = positions;
            scratchOptions.minimumHeights = minimumHeights;
            scratchOptions.maximumHeights = maximumHeights;
            scratchOptions.granularity = granularity;
            return new WallGeometry(scratchOptions);
        }

        result._positions = positions;
        result._minimumHeights = minimumHeights;
        result._maximumHeights = maximumHeights;
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._granularity = granularity;

        return result;
    };

    /**
     * A description of a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
     * @param {Number} [options.maximumHeight] A constant that defines the maximum height of the
     *        wall at <code>positions</code>. If undefined, the height of each position in used.
     * @param {Number} [options.minimumHeight] A constant that defines the minimum height of the
     *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @returns {WallGeometry}
     *
     *
     * @example
     * // create a wall that spans from 10000 meters to 20000 meters
     * var wall = Cesium.WallGeometry.fromConstantHeights({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     19.0, 47.0,
     *     19.0, 48.0,
     *     20.0, 48.0,
     *     20.0, 47.0,
     *     19.0, 47.0,
     *   ]),
     *   minimumHeight : 20000.0,
     *   maximumHeight : 10000.0
     * });
     * var geometry = Cesium.WallGeometry.createGeometry(wall);
     *
     * @see WallGeometry#createGeometry
     */
    WallGeometry.fromConstantHeights = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('options.positions is required.');
        }
        //>>includeEnd('debug');

        var minHeights;
        var maxHeights;

        var min = options.minimumHeight;
        var max = options.maximumHeight;

        var doMin = defined(min);
        var doMax = defined(max);
        if (doMin || doMax) {
            var length = positions.length;
            minHeights = (doMin) ? new Array(length) : undefined;
            maxHeights = (doMax) ? new Array(length) : undefined;

            for (var i = 0; i < length; ++i) {
                if (doMin) {
                    minHeights[i] = min;
                }

                if (doMax) {
                    maxHeights[i] = max;
                }
            }
        }

        var newOptions = {
            positions : positions,
            maximumHeights : maxHeights,
            minimumHeights : minHeights,
            ellipsoid : options.ellipsoid,
            vertexFormat : options.vertexFormat
        };
        return new WallGeometry(newOptions);
    };

    /**
     * Computes the geometric representation of a wall, including its vertices, indices, and a bounding sphere.
     *
     * @param {WallGeometry} wallGeometry A description of the wall.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    WallGeometry.createGeometry = function(wallGeometry) {
        var wallPositions = wallGeometry._positions;
        var minimumHeights = wallGeometry._minimumHeights;
        var maximumHeights = wallGeometry._maximumHeights;
        var vertexFormat = wallGeometry._vertexFormat;
        var granularity = wallGeometry._granularity;
        var ellipsoid = wallGeometry._ellipsoid;

        var pos = WallGeometryLibrary.computePositions(ellipsoid, wallPositions, maximumHeights, minimumHeights, granularity, true);
        if (!defined(pos)) {
            return;
        }

        var bottomPositions = pos.bottomPositions;
        var topPositions = pos.topPositions;
        var numCorners = pos.numCorners;

        var length = topPositions.length;
        var size = length * 2;

        var positions = vertexFormat.position ? new Float64Array(size) : undefined;
        var normals = vertexFormat.normal ? new Float32Array(size) : undefined;
        var tangents = vertexFormat.tangent ? new Float32Array(size) : undefined;
        var bitangents = vertexFormat.bitangent ? new Float32Array(size) : undefined;
        var textureCoordinates = vertexFormat.st ? new Float32Array(size / 3 * 2) : undefined;

        var positionIndex = 0;
        var normalIndex = 0;
        var bitangentIndex = 0;
        var tangentIndex = 0;
        var stIndex = 0;

        // add lower and upper points one after the other, lower
        // points being even and upper points being odd
        var normal = scratchNormal;
        var tangent = scratchTangent;
        var bitangent = scratchBitangent;
        var recomputeNormal = true;
        length /= 3;
        var i;
        var s = 0;
        var ds = 1/(length - wallPositions.length + 1);
        for (i = 0; i < length; ++i) {
            var i3 = i * 3;
            var topPosition = Cartesian3.fromArray(topPositions, i3, scratchCartesian3Position1);
            var bottomPosition = Cartesian3.fromArray(bottomPositions, i3, scratchCartesian3Position2);
            if (vertexFormat.position) {
                // insert the lower point
                positions[positionIndex++] = bottomPosition.x;
                positions[positionIndex++] = bottomPosition.y;
                positions[positionIndex++] = bottomPosition.z;

                // insert the upper point
                positions[positionIndex++] = topPosition.x;
                positions[positionIndex++] = topPosition.y;
                positions[positionIndex++] = topPosition.z;
            }

            if (vertexFormat.st) {
                textureCoordinates[stIndex++] = s;
                textureCoordinates[stIndex++] = 0.0;

                textureCoordinates[stIndex++] = s;
                textureCoordinates[stIndex++] = 1.0;
            }

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
                var nextPosition;
                var nextTop = Cartesian3.clone(Cartesian3.ZERO, scratchCartesian3Position5);
                var groundPosition = ellipsoid.scaleToGeodeticSurface(Cartesian3.fromArray(topPositions, i3, scratchCartesian3Position2), scratchCartesian3Position2);
                if (i + 1 < length) {
                    nextPosition = ellipsoid.scaleToGeodeticSurface(Cartesian3.fromArray(topPositions, i3 + 3, scratchCartesian3Position3), scratchCartesian3Position3);
                    nextTop = Cartesian3.fromArray(topPositions, i3 + 3, scratchCartesian3Position5);
                }

                if (recomputeNormal) {
                    var scalednextPosition = Cartesian3.subtract(nextTop, topPosition, scratchCartesian3Position4);
                    var scaledGroundPosition = Cartesian3.subtract(groundPosition, topPosition, scratchCartesian3Position1);
                    normal = Cartesian3.normalize(Cartesian3.cross(scaledGroundPosition, scalednextPosition, normal), normal);
                    recomputeNormal = false;
                }

                if (Cartesian3.equalsEpsilon(nextPosition, groundPosition, CesiumMath.EPSILON10)) {
                    recomputeNormal = true;
                } else {
                    s += ds;
                    if (vertexFormat.tangent) {
                        tangent = Cartesian3.normalize(Cartesian3.subtract(nextPosition, groundPosition, tangent), tangent);
                    }
                    if (vertexFormat.bitangent) {
                        bitangent = Cartesian3.normalize(Cartesian3.cross(normal, tangent, bitangent), bitangent);
                    }
                }

                if (vertexFormat.normal) {
                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;

                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;
                }

                if (vertexFormat.tangent) {
                    tangents[tangentIndex++] = tangent.x;
                    tangents[tangentIndex++] = tangent.y;
                    tangents[tangentIndex++] = tangent.z;

                    tangents[tangentIndex++] = tangent.x;
                    tangents[tangentIndex++] = tangent.y;
                    tangents[tangentIndex++] = tangent.z;
                }

                if (vertexFormat.bitangent) {
                    bitangents[bitangentIndex++] = bitangent.x;
                    bitangents[bitangentIndex++] = bitangent.y;
                    bitangents[bitangentIndex++] = bitangent.z;

                    bitangents[bitangentIndex++] = bitangent.x;
                    bitangents[bitangentIndex++] = bitangent.y;
                    bitangents[bitangentIndex++] = bitangent.z;
                }
            }
        }

        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }

        if (vertexFormat.tangent) {
            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : tangents
            });
        }

        if (vertexFormat.bitangent) {
            attributes.bitangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : bitangents
            });
        }

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        // prepare the side walls, two triangles for each wall
        //
        //    A (i+1)  B (i+3) E
        //    +--------+-------+
        //    |      / |      /|    triangles:  A C B
        //    |     /  |     / |                B C D
        //    |    /   |    /  |
        //    |   /    |   /   |
        //    |  /     |  /    |
        //    | /      | /     |
        //    +--------+-------+
        //    C (i)    D (i+2) F
        //

        var numVertices = size / 3;
        size -= 6 * (numCorners + 1);
        var indices = IndexDatatype.createTypedArray(numVertices, size);

        var edgeIndex = 0;
        for (i = 0; i < numVertices - 2; i += 2) {
            var LL = i;
            var LR = i + 2;
            var pl = Cartesian3.fromArray(positions, LL * 3, scratchCartesian3Position1);
            var pr = Cartesian3.fromArray(positions, LR * 3, scratchCartesian3Position2);
            if (Cartesian3.equalsEpsilon(pl, pr, CesiumMath.EPSILON10)) {
                continue;
            }
            var UL = i + 1;
            var UR = i + 3;

            indices[edgeIndex++] = UL;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = UR;
            indices[edgeIndex++] = UR;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = LR;
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : new BoundingSphere.fromVertices(positions)
        });
    };

    return WallGeometry;
});
