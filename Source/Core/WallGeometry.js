/*global define*/
define([
        './defaultValue',
        './defined',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './Math',
        './PolylinePipeline',
        './PolygonPipeline',
        './PrimitiveType',
        './VertexFormat',
        './WindingOrder'
    ], function(
        defaultValue,
        defined,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        CesiumMath,
        PolylinePipeline,
        PolygonPipeline,
        PrimitiveType,
        VertexFormat,
        WindingOrder) {
    "use strict";

    var scratchCartographic1 = new Cartographic();
    var scratchCartographic2 = new Cartographic();
    var scratchCartesian3Position1 = new Cartesian3();
    var scratchCartesian3Position2 = new Cartesian3();
    var scratchCartesian3Position3 = new Cartesian3();
    var scratchCartesian3Position4 = new Cartesian3();
    var scratchCartesian3Position5 = new Cartesian3();
    var scratchBinormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchNormal = new Cartesian3();

    function subdivideHeights(p0, p1, h0, h1, granularity) {
        var angleBetween = Cartesian3.angleBetween(p0, p1);
        var numPoints = Math.ceil(angleBetween/granularity) + 1;
        var heights = new Array(numPoints);
        var i;
        if (h0 === h1) {
            for (i = 0; i < numPoints; i++) {
                heights[i] = h0;
            }
            return heights;
        }

        var dHeight = h1 - h0;
        var heightPerVertex = dHeight / (numPoints - 1);

        for (i = 1; i < numPoints - 1; i++) {
            var h = h0 + i*heightPerVertex;
            heights[i] = h;
        }

        heights[0] = h0;
        heights[numPoints - 1] = h1;

        return heights;
    }

    function latLonEquals(c0, c1) {
        return ((CesiumMath.equalsEpsilon(c0.latitude, c1.latitude, CesiumMath.EPSILON6)) && (CesiumMath.equalsEpsilon(c0.longitude, c1.longitude, CesiumMath.EPSILON6)));
    }

    function removeDuplicates(ellipsoid, positions, topHeights, bottomHeights) {
        var hasBottomHeights = (defined(bottomHeights));
        var hasTopHeights = (defined(topHeights));
        var cleanedPositions = [];
        var cleanedTopHeights = [];
        var cleanedBottomHeights = hasBottomHeights ? [] : undefined;

        var length = positions.length;
        if (length < 2) {
            return positions.slice(0);
        }

        var v0 = positions[0];
        cleanedPositions.push(v0);
        var c0 = ellipsoid.cartesianToCartographic(v0, scratchCartographic1);
        if (hasTopHeights) {
            c0.height = topHeights[0];
        }
        cleanedTopHeights.push(c0.height);
        if (hasBottomHeights) {
            cleanedBottomHeights.push(bottomHeights[0]);
        }
        for (var i = 1; i < length; ++i) {
            var v1 = positions[i];
            var c1 = ellipsoid.cartesianToCartographic(v1, scratchCartographic2);
            if (hasTopHeights) {
                c1.height = topHeights[i];
            }
            if (!latLonEquals(c0, c1)) {
                cleanedPositions.push(v1); // Shallow copy!
                cleanedTopHeights.push(c1.height);
                if (hasBottomHeights) {
                    cleanedBottomHeights.push(bottomHeights[i]);
                }
            } else if (c0.height < c1.height) {
                cleanedTopHeights[i-1] = c1.height;
            }

            c0 = c1.clone(c0);
        }

        return {
            positions: cleanedPositions,
            topHeights: cleanedTopHeights,
            bottomHeights: cleanedBottomHeights
        };
    }

    /**
     * A description of a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     *
     * @alias WallGeometry
     * @constructor
     *
     * @param {Array} positions An array of Cartesian objects, which are the points of the wall.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Array} [maximumHeights] An array parallel to <code>positions</code> that give the maximum height of the
     *        wall at <code>positions</code>. If undefined, the height of each position in used.
     * @param {Array} [minimumHeights] An array parallel to <code>positions</code> that give the minimum height of the
     *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} positions is required.
     * @exception {DeveloperError} positions and maximumHeights must have the same length.
     * @exception {DeveloperError} positions and minimumHeights must have the same length.
     * @exception {DeveloperError} unique positions must be greater than or equal to 2.
     *
     * @see WallGeometry.createGeometry
     *
     * @example
     * var positions = [
     *   Cartographic.fromDegrees(19.0, 47.0, 10000.0),
     *   Cartographic.fromDegrees(19.0, 48.0, 10000.0),
     *   Cartographic.fromDegrees(20.0, 48.0, 10000.0),
     *   Cartographic.fromDegrees(20.0, 47.0, 10000.0),
     *   Cartographic.fromDegrees(19.0, 47.0, 10000.0)
     * ];
     *
     * // create a wall that spans from ground level to 10000 meters
     * var wall = new WallGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray(positions)
     * });
     * var geometry = WallGeometry.createGeometry(wall);
     */
    var WallGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var wallPositions = options.positions;
        var maximumHeights = options.maximumHeights;
        var minimumHeights = options.minimumHeights;

        if (!defined(wallPositions)) {
            throw new DeveloperError('positions is required.');
        }

        if (defined(maximumHeights) && maximumHeights.length !== wallPositions.length) {
            throw new DeveloperError('positions and maximumHeights must have the same length.');
        }

        if (defined(minimumHeights) && minimumHeights.length !== wallPositions.length) {
            throw new DeveloperError('positions and minimumHeights must have the same length.');
        }

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        var o = removeDuplicates(ellipsoid, wallPositions, maximumHeights, minimumHeights);

        wallPositions = o.positions;
        maximumHeights = o.topHeights;
        minimumHeights = o.bottomHeights;

        if (wallPositions.length < 2) {
            throw new DeveloperError('unique positions must be greater than or equal to 2');
        }

        this._positions = wallPositions;
        this._minimumHeights = minimumHeights;
        this._maximumHeights = maximumHeights;
        this._vertexFormat = vertexFormat;
        this._granularity = granularity;
        this._ellipsoid = ellipsoid;
        this._workerName = 'createWallGeometry';
    };

    /**
     * A description of a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     *
     * @memberof WallGeometry
     *
     * @param {Array} positions An array of Cartesian objects, which are the points of the wall.
     * @param {Number} [maximumHeight] A constant that defines the maximum height of the
     *        wall at <code>positions</code>. If undefined, the height of each position in used.
     * @param {Number} [minimumHeight] A constant that defines the minimum height of the
     *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} positions is required.
     * @exception {DeveloperError} unique positions must be greater than or equal to 2.
     *
     * @see WallGeometry.createGeometry
     *
     * @example
     * var positions = [
     *   Cartographic.fromDegrees(19.0, 47.0, 10000.0),
     *   Cartographic.fromDegrees(19.0, 48.0, 10000.0),
     *   Cartographic.fromDegrees(20.0, 48.0, 10000.0),
     *   Cartographic.fromDegrees(20.0, 47.0, 10000.0),
     *   Cartographic.fromDegrees(19.0, 47.0, 10000.0)
     * ];
     *
     * // create a wall that spans from 10000 meters to 20000 meters
     * var wall = WallGeometry.fromConstantHeights({
     *     positions : ellipsoid.cartographicArrayToCartesianArray(positions),
     *     minimumHeight : 20000.0,
     *     maximumHeight : 10000.0
     * });
     * var geometry = WallGeometry.createGeometry(wall);
     */
    WallGeometry.fromConstantHeights = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var positions = options.positions;
        if (typeof positions === 'undefined') {
            throw new DeveloperError('options.positions is required.');
        }

        var minHeights;
        var maxHeights;

        var min = options.minimumHeight;
        var max = options.maximumHeight;

        var doMin = (typeof min !== 'undefined');
        var doMax = (typeof max !== 'undefined');
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
     * @returns {Geometry} The computed vertices and indices.
     */
    WallGeometry.createGeometry = function(wallGeometry) {
        var wallPositions = wallGeometry._positions;
        var minimumHeights = wallGeometry._minimumHeights;
        var maximumHeights = wallGeometry._maximumHeights;
        var vertexFormat = wallGeometry._vertexFormat;
        var granularity = wallGeometry._granularity;
        var ellipsoid = wallGeometry._ellipsoid;

        if (wallPositions.length >= 3) {
            // Order positions counter-clockwise
            var tangentPlane = EllipsoidTangentPlane.fromPoints(wallPositions, ellipsoid);
            var positions2D = tangentPlane.projectPointsOntoPlane(wallPositions);

            if (PolygonPipeline.computeWindingOrder2D(positions2D) === WindingOrder.CLOCKWISE) {
                wallPositions.reverse();
                maximumHeights.reverse();

                if (defined(minimumHeights)) {
                    minimumHeights.reverse();
                }
            }
        }

        var i;
        var length = wallPositions.length;
        var newMaxHeights = [];
        var newMinHeights = (defined(minimumHeights)) ? [] : undefined;
        var newWallPositions = [];
        for (i = 0; i < length-1; i++) {
            var p1 = wallPositions[i];
            var p2 = wallPositions[i + 1];
            var h1 = maximumHeights[i];
            var h2 = maximumHeights[i + 1];
            newMaxHeights = newMaxHeights.concat(subdivideHeights(p1, p2, h1, h2, granularity));

            if (defined(minimumHeights)) {
                p1 = wallPositions[i];
                p2 = wallPositions[i + 1];
                h1 = minimumHeights[i];
                h2 = minimumHeights[i + 1];
                newMinHeights = newMinHeights.concat(subdivideHeights(p1, p2, h1, h2, granularity));
            }

            newWallPositions = newWallPositions.concat(PolylinePipeline.scaleToSurface([p1, p2], granularity, ellipsoid));
        }

        length = newWallPositions.length;
        var size = length * 2;

        var positions = vertexFormat.position ? new Float64Array(size) : undefined;
        var normals = vertexFormat.normal ? new Float32Array(size) : undefined;
        var tangents = vertexFormat.tangent ? new Float32Array(size) : undefined;
        var binormals = vertexFormat.binormal ? new Float32Array(size) : undefined;
        var textureCoordinates = vertexFormat.st ? new Float32Array(size / 3 * 2) : undefined;

        var positionIndex = 0;
        var normalIndex = 0;
        var binormalIndex = 0;
        var tangentIndex = 0;
        var stIndex = 0;

        var bottomPositions;
        var topPositions;

        var minH = defaultValue(newMinHeights, 0);
        bottomPositions = PolylinePipeline.scaleToGeodeticHeight(newWallPositions, minH, ellipsoid);
        topPositions = PolylinePipeline.scaleToGeodeticHeight(newWallPositions, newMaxHeights, ellipsoid);


        // add lower and upper points one after the other, lower
        // points being even and upper points being odd
        var normal = scratchNormal;
        var tangent = scratchTangent;
        var binormal = scratchBinormal;
        var recomputeNormal = true;
        length /= 3;
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

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                var nextPosition;
                var nextTop;
                var groundPosition = Cartesian3.fromArray(newWallPositions, i3, scratchCartesian3Position2);
                if (i + 1 < length) {
                    nextPosition = Cartesian3.fromArray(newWallPositions, i3 + 3, scratchCartesian3Position3);
                    nextTop = Cartesian3.fromArray(topPositions, i3 + 3, scratchCartesian3Position5);
                }

                if (recomputeNormal) {
                    var scalednextPosition = nextTop.subtract(topPosition, scratchCartesian3Position4);
                    var scaledGroundPosition = groundPosition.subtract(topPosition, scratchCartesian3Position1);
                    normal = Cartesian3.cross(scaledGroundPosition, scalednextPosition, normal).normalize(normal);
                    recomputeNormal = false;
                }

                if (nextPosition.equalsEpsilon(groundPosition, CesiumMath.EPSILON6)) {
                    recomputeNormal = true;
                } else {
                    if (vertexFormat.tangent) {
                        tangent = nextPosition.subtract(groundPosition, tangent).normalize(tangent);
                    }
                    if (vertexFormat.binormal) {
                        binormal = Cartesian3.cross(normal, tangent, binormal).normalize(binormal);
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

                if (vertexFormat.binormal) {
                    binormals[binormalIndex++] = binormal.x;
                    binormals[binormalIndex++] = binormal.y;
                    binormals[binormalIndex++] = binormal.z;

                    binormals[binormalIndex++] = binormal.x;
                    binormals[binormalIndex++] = binormal.y;
                    binormals[binormalIndex++] = binormal.z;
                }
            }

            if (vertexFormat.st) {
                var s = i / (length - 1);

                textureCoordinates[stIndex++] = s;
                textureCoordinates[stIndex++] = 0.0;

                textureCoordinates[stIndex++] = s;
                textureCoordinates[stIndex++] = 1.0;
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

        if (vertexFormat.binormal) {
            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : binormals
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
        size -= 6;
        var indices = IndexDatatype.createTypedArray(numVertices, size);

        var edgeIndex = 0;
        for (i = 0; i < numVertices - 2; i += 2) {
            var LL = i;
            var LR = i + 2;
            var pl = Cartesian3.fromArray(positions, LL * 3, scratchCartesian3Position1);
            var pr = Cartesian3.fromArray(positions, LR * 3, scratchCartesian3Position2);
            if (Cartesian3.equalsEpsilon(pl, pr, CesiumMath.EPSILON6)) {
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
