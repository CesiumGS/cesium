/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './GeometryAttribute',
        './Math',
        './PolylinePipeline',
        './PolygonPipeline',
        './PrimitiveType',
        './VertexFormat',
        './WindingOrder'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        GeometryAttribute,
        CesiumMath,
        PolylinePipeline,
        PolygonPipeline,
        PrimitiveType,
        VertexFormat,
        WindingOrder) {
    "use strict";

    var scratchCartographic = new Cartographic();
    var scratchCartesian3Position1 = new Cartesian3();
    var scratchCartesian3Position2 = new Cartesian3();
    var scratchCartesian3Position3 = new Cartesian3();
    var scratchBinormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchNormal = new Cartesian3();

    /**
     * Creates a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     * The points in the wall can be offset by supplied terrain elevation data.
     *
     * @alias WallGeometry
     * @constructor
     *
     * @param {Array} positions An array of Cartesian objects, which are the points of the wall.
     * @param {Array} [terrain] Has to denote the same points as in positions, with the ground elevation reflecting the terrain elevation.
     * @param {Number} [top] The top of the wall. If specified, the top of the wall is treated as this
     *        height, and the information in the positions array is disregarded.
     * @param {Number} [bottom] The bottom of the wall. If specified, the bottom of the wall is treated as
     *        this height. Otherwise, its treated as 'ground' (the WGS84 ellipsoid height 0).
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} positions is required.
     * @exception {DeveloperError} positions and terrain points must have the same length.
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
     */
    var WallGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var wallPositions = options.positions;
        var terrain = options.terrain;
        var top = options.top;
        var bottom = defaultValue(options.bottom, 0);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        if (typeof wallPositions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        if (typeof terrain !== 'undefined' && terrain.length !== wallPositions.length) {
            throw new DeveloperError('positions and terrain points must have the same length.');
        }

        wallPositions = PolylinePipeline.removeDuplicates(wallPositions);
        if (wallPositions.length >= 3) {
            // Order positions counter-clockwise
            var tangentPlane = EllipsoidTangentPlane.fromPoints(wallPositions, ellipsoid);
            var positions2D = tangentPlane.projectPointsOntoPlane(wallPositions);

            if (PolygonPipeline.computeWindingOrder2D(positions2D) === WindingOrder.CLOCKWISE) {
                wallPositions.reverse();
            }
        }
        var i;
        var flatPositions = [];
        var length = wallPositions.length;
        for (i = 0; i < length - 1; i++) {
            var p1 = wallPositions[i];
            var p2 = wallPositions[i+1];
            flatPositions.push(p1.x, p1.y, p1.z);
            flatPositions.push(p2.x, p2.y, p2.z);
        }

        var size = flatPositions.length * 2;

        var positions = vertexFormat.position ? new Float64Array(size) : undefined;
        var normals = vertexFormat.normal ? new Float32Array(size) : undefined;
        var tangents = vertexFormat.tangent ? new Float32Array(size) : undefined;
        var binormals = vertexFormat.binormal ? new Float32Array(size) : undefined;
        var textureCoordinates = vertexFormat.st ? new Float32Array(size / 3 * 2) : undefined;

        var positionIndex = 0;
        var normalIndex = 0;
        var tangentIndex = 0;
        var binormalIndex = 0;
        var textureCoordIndex = 0;

        // add lower and upper points one after the other, lower
        // points being even and upper points being odd
        length = flatPositions.length;
        var normal = scratchNormal;
        var tangent = scratchTangent;
        var binormal = scratchBinormal;
        var recomputeNormal = true;
        for (i = 0; i < length; i += 3) {
            var pos = Cartesian3.fromArray(flatPositions, i, scratchCartesian3Position1);
            var c = ellipsoid.cartesianToCartographic(pos, scratchCartographic);
            var origHeight = c.height;
            c.height = 0.0;

            var terrainHeight = 0.0;
            if (terrain !== undefined) {
                var h = terrain[i].height;
                if (!isNaN(h)) {
                    terrainHeight = h;
                }
            }

            c.height = bottom + terrainHeight;
            var bottomPosition = ellipsoid.cartographicToCartesian(c, scratchCartesian3Position1);

            // get the original height back, or set the top value
            if (typeof top !== 'undefined') {
                c.height = top + terrain.height;
            } else {
                c.height = origHeight + terrainHeight;
            }

            var topPosition = ellipsoid.cartographicToCartesian(c, scratchCartesian3Position2);

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
                if (i+3 < length) {
                    nextPosition = Cartesian3.fromArray(flatPositions, i+3, scratchCartesian3Position3);
                }

                if (recomputeNormal) {
                    nextPosition = nextPosition.subtract(topPosition, nextPosition);
                    bottomPosition = bottomPosition.subtract(topPosition, bottomPosition);
                    normal = Cartesian3.cross(bottomPosition, nextPosition, normal).normalize(normal);
                    if (vertexFormat.tangent) {
                        tangent = nextPosition.normalize(tangent);
                    }
                    if (vertexFormat.binormal) {
                        binormal = Cartesian3.cross(normal, tangent, binormal).normalize(binormal);
                    }
                    recomputeNormal = false;
                }

                if (topPosition.equalsEpsilon(nextPosition, CesiumMath.EPSILON4)) { // if we've reached a corner
                    recomputeNormal = true;
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

                textureCoordinates[textureCoordIndex++] = s;
                textureCoordinates[textureCoordIndex++] = 0.0;

                textureCoordinates[textureCoordIndex++] = s;
                textureCoordinates[textureCoordIndex++] = 1.0;
            }
        }

        var attributes = {};

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

        var numVertices = size/3;
        size -= 6;
        var indices = IndexDatatype.createTypedArray(numVertices, size);

        var edgeIndex = 0;
        for (i = 0; i < numVertices - 2; i += 2) {
            var LL = i;
            var LR = i + 2;
            var pl = Cartesian3.fromArray(positions, LL*3, scratchCartesian3Position1);
            var pr = Cartesian3.fromArray(positions, LR*3, scratchCartesian3Position2);
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

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that - along with {@link Geometry#primitiveType} - determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.TRIANGLES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = new BoundingSphere.fromVertices(positions);
    };

    return WallGeometry;
});

