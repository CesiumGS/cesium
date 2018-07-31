define([
        './AttributeCompression',
        './Cartesian2',
        './Cartesian3',
        './defaultValue',
        './Math',
        './TerrainTileEdgeDetails',
        './TileEdge',
        './WebMercatorProjection'
    ], function(
        AttributeCompression,
        Cartesian2,
        Cartesian3,
        defaultValue,
        CesiumMath,
        TerrainTileEdgeDetails,
        TileEdge,
        WebMercatorProjection) {
    'use strict';

    /**
      * A mesh plus related metadata for a single tile of terrain.  Instances of this type are
      * usually created from raw {@link TerrainData}.
      *
      * @alias TerrainMesh
      * @constructor
      *
      * @param {Cartesian3} center The center of the tile.  Vertex positions are specified relative to this center.
      * @param {Float32Array} vertices The vertex data, including positions, texture coordinates, and heights.
      *                       The vertex data is in the order [X, Y, Z, H, U, V], where X, Y, and Z represent
      *                       the Cartesian position of the vertex, H is the height above the ellipsoid, and
      *                       U and V are the texture coordinates.
      * @param {Uint16Array|Uint32Array} indices The indices describing how the vertices are connected to form triangles.
      * @param {Number} minimumHeight The lowest height in the tile, in meters above the ellipsoid.
      * @param {Number} maximumHeight The highest height in the tile, in meters above the ellipsoid.
      * @param {BoundingSphere} boundingSphere3D A bounding sphere that completely contains the tile.
      * @param {Cartesian3} occludeePointInScaledSpace The occludee point of the tile, represented in ellipsoid-
      *                     scaled space, and used for horizon culling.  If this point is below the horizon,
      *                     the tile is considered to be entirely below the horizon.
      * @param {Number} [vertexStride=6] The number of components in each vertex.
      * @param {OrientedBoundingBox} [orientedBoundingBox] A bounding box that completely contains the tile.
      * @param {TerrainEncoding} encoding Information used to decode the mesh.
      * @param {Number} exaggeration The amount that this mesh was exaggerated.
      * @param {Number[]} westIndicesSouthToNorth The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
      * @param {Number[]} southIndicesEastToWest The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
      * @param {Number[]} eastIndicesNorthToSouth The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
      * @param {Number[]} northIndicesWestToEast The indices of the vertices on the Northern edge of the tile, ordered tom West to East (clockwise).
      *
      * @private
      */
    function TerrainMesh(
        center, vertices, indices, minimumHeight, maximumHeight,
        boundingSphere3D, occludeePointInScaledSpace,
        vertexStride, orientedBoundingBox, encoding, exaggeration,
        westIndicesSouthToNorth, southIndicesEastToWest, eastIndicesNorthToSouth, northIndicesWestToEast) {

        /**
         * The center of the tile.  Vertex positions are specified relative to this center.
         * @type {Cartesian3}
         */
        this.center = center;

        /**
         * The vertex data, including positions, texture coordinates, and heights.
         * The vertex data is in the order [X, Y, Z, H, U, V], where X, Y, and Z represent
         * the Cartesian position of the vertex, H is the height above the ellipsoid, and
         * U and V are the texture coordinates.  The vertex data may have additional attributes after those
         * mentioned above when the {@link TerrainMesh#stride} is greater than 6.
         * @type {Float32Array}
         */
        this.vertices = vertices;

        /**
         * The number of components in each vertex.  Typically this is 6 for the 6 components
         * [X, Y, Z, H, U, V], but if each vertex has additional data (such as a vertex normal), this value
         * may be higher.
         * @type {Number}
         */
        this.stride = defaultValue(vertexStride, 6);

        /**
         * The indices describing how the vertices are connected to form triangles.
         * @type {Uint16Array|Uint32Array}
         */
        this.indices = indices;

        /**
         * The lowest height in the tile, in meters above the ellipsoid.
         * @type {Number}
         */
        this.minimumHeight = minimumHeight;

        /**
         * The highest height in the tile, in meters above the ellipsoid.
         * @type {Number}
         */
        this.maximumHeight = maximumHeight;

        /**
         * A bounding sphere that completely contains the tile.
         * @type {BoundingSphere}
         */
        this.boundingSphere3D = boundingSphere3D;

        /**
         * The occludee point of the tile, represented in ellipsoid-
         * scaled space, and used for horizon culling.  If this point is below the horizon,
         * the tile is considered to be entirely below the horizon.
         * @type {Cartesian3}
         */
        this.occludeePointInScaledSpace = occludeePointInScaledSpace;

        /**
         * A bounding box that completely contains the tile.
         * @type {OrientedBoundingBox}
         */
        this.orientedBoundingBox = orientedBoundingBox;

        /**
         * Information for decoding the mesh vertices.
         * @type {TerrainEncoding}
         */
        this.encoding = encoding;

        /**
         * The amount that this mesh was exaggerated.
         * @type {Number}
         */
        this.exaggeration = exaggeration;

        /**
         * The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
         * @type {Number[]}
         */
        this.westIndicesSouthToNorth = westIndicesSouthToNorth;

        /**
         * The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
         * @type {Number[]}
         */
        this.southIndicesEastToWest = southIndicesEastToWest;

        /**
         * The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
         * @type {Number[]}
         */
        this.eastIndicesNorthToSouth = eastIndicesNorthToSouth;

        /**
         * The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
         * @type {Number[]}
         */
        this.northIndicesWestToEast = northIndicesWestToEast;
    }

    var positionScratch = new Cartesian3();
    var encodedNormalScratch = new Cartesian2();
    var uvScratch = new Cartesian2();

    function getVertex(encoding, vertices, index, result, resultIndex) {
        resultIndex = defaultValue(resultIndex, result.length);

        encoding.decodePosition(vertices, index, positionScratch);
        result[resultIndex++] = positionScratch.x;
        result[resultIndex++] = positionScratch.y;
        result[resultIndex++] = positionScratch.z;

        result[resultIndex++] = encoding.decodeHeight(vertices, index);

        encoding.decodeTextureCoordinates(vertices, index, uvScratch);
        result[resultIndex++] = uvScratch.x;
        result[resultIndex++] = uvScratch.y;

        if (encoding.hasWebMercatorT) {
            result[resultIndex++] = encoding.decodeWebMercatorT(vertices, index);
        }

        if (encoding.hasVertexNormals) {
            encoding.getOctEncodedNormal(vertices, index, encodedNormalScratch);
            result[resultIndex++] = encodedNormalScratch.x;
            result[resultIndex++] = encodedNormalScratch.y;
        }

        return resultIndex;
    }

    function addVertex(ellipsoid, rectangle, encoding, u, v, height, octEncodedNormal, southMercatorY, oneOverMercatorHeight, result, resultIndex) {
        var longitude = CesiumMath.lerp(rectangle.west, rectangle.east, u);
        var latitude = CesiumMath.lerp(rectangle.south, rectangle.north, v);
        Cartesian3.fromRadians(longitude, latitude, height, ellipsoid, positionScratch);

        result[resultIndex++] = positionScratch.x;
        result[resultIndex++] = positionScratch.y;
        result[resultIndex++] = positionScratch.z;
        result[resultIndex++] = height;
        result[resultIndex++] = u;
        result[resultIndex++] = v;

        if (encoding.hasWebMercatorT) {
            result[resultIndex++] = (WebMercatorProjection.geodeticLatitudeToMercatorAngle(latitude) - southMercatorY) * oneOverMercatorHeight;
        }

        if (encoding.hasVertexNormals) {
            result[resultIndex++] = octEncodedNormal.x;
            result[resultIndex++] = octEncodedNormal.y;
        }
    }

    function transformTextureCoordinate(toMin, toMax, fromValue) {
        return (fromValue - toMin) / (toMax - toMin);
    }

    var previousVertexScratch = new Array(9);
    var currentVertexScratch = new Array(9);
    var normalScratch1 = new Cartesian3();
    var normalScratch2 = new Cartesian3();
    var normalScratch3 = new Cartesian3();

    TerrainMesh.prototype.getEdgeVertices = function(tileEdge, thisRectangle, clipRectangle, ellipsoid, result) {
        if (result === undefined) {
            result = new TerrainTileEdgeDetails();
        }
        var outputVertices = result.vertices;
        var minimumHeight = result.minimumHeight;
        var maximumHeight = result.maximumHeight;

        var clipRectangleUMin = (clipRectangle.west - thisRectangle.west) / (thisRectangle.east - thisRectangle.west);
        var clipRectangleUMax = (clipRectangle.east - thisRectangle.west) / (thisRectangle.east - thisRectangle.west);
        var clipRectangleVMin = (clipRectangle.south - thisRectangle.south) / (thisRectangle.north - thisRectangle.south);
        var clipRectangleVMax = (clipRectangle.north - thisRectangle.south) / (thisRectangle.north - thisRectangle.south);

        var indices;
        var first;
        var second;
        var edgeCoordinate;
        var compareU;

        switch (tileEdge) {
            case TileEdge.WEST:
                indices = this.westIndicesSouthToNorth;
                first = 0.0;
                second = 1.0;
                edgeCoordinate = transformTextureCoordinate(clipRectangleUMin, clipRectangleUMax, 0.0);
                compareU = false;
                break;
            case TileEdge.NORTH:
                indices = this.northIndicesWestToEast;
                first = 0.0;
                second = 1.0;
                edgeCoordinate = transformTextureCoordinate(clipRectangleVMin, clipRectangleVMax, 1.0);
                compareU = true;
                break;
            case TileEdge.EAST:
                indices = this.eastIndicesNorthToSouth;
                first = 1.0;
                second = 0.0;
                edgeCoordinate = transformTextureCoordinate(clipRectangleUMin, clipRectangleUMax, 1.0);
                compareU = false;
                break;
            case TileEdge.SOUTH:
                indices = this.southIndicesEastToWest;
                first = 1.0;
                second = 0.0;
                edgeCoordinate = transformTextureCoordinate(clipRectangleVMin, clipRectangleVMax, 0.0);
                compareU = true;
                break;
        }

        var encoding = this.encoding;
        var vertices = this.vertices;
        var southMercatorY;
        var oneOverMercatorHeight;
        var lastUOrV;

        var destinationStride = 6;
        if (encoding.hasVertexNormals) {
            destinationStride += 2;
        }
        if (encoding.hasWebMercatorT) {
            ++destinationStride;
        }

        if (encoding.hasWebMercatorT) {
            southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(clipRectangle.south);
            oneOverMercatorHeight = 1.0 / (WebMercatorProjection.geodeticLatitudeToMercatorAngle(clipRectangle.north) - southMercatorY);
        }

        for (var i = 0; i < indices.length; ++i) {
            var index = indices[i];

            var uv = encoding.decodeTextureCoordinates(vertices, index, uvScratch);
            var u = transformTextureCoordinate(clipRectangleUMin, clipRectangleUMax, uv.x);
            var v = transformTextureCoordinate(clipRectangleVMin, clipRectangleVMax, uv.y);
            var uOrV = compareU ? u : v;

            var inside = uOrV >= 0.0 && uOrV <= 1.0;
            var crossedFirst = uOrV < first && lastUOrV > first || uOrV > first && lastUOrV < first;
            var crossedSecond = uOrV < second && lastUOrV > second || uOrV > second && lastUOrV < second;

            var previousVertex = previousVertexScratch;
            var currentVertex = currentVertexScratch;

            if (crossedFirst || crossedSecond) {
                var lastIndex = indices[i - 1];
                getVertex(encoding, vertices, lastIndex, previousVertex, 0);
                getVertex(encoding, vertices, index, currentVertex, 0);
            }

            var ratio;
            var interpolatedHeight;
            var interpolatedU;
            var interpolatedV;
            var interpolatedOctEncodedNormal;
            var previousNormal;
            var currentNormal;

            if (crossedFirst) {
                ratio = (first - uOrV) / (lastUOrV - uOrV);
                interpolatedHeight = CesiumMath.lerp(currentVertex[3], previousVertex[3], ratio);
                interpolatedU = compareU ? first : edgeCoordinate;
                interpolatedV = compareU ? edgeCoordinate : first;

                if (encoding.hasVertexNormals) {
                    previousNormal = AttributeCompression.octDecode(previousVertex[destinationStride - 2], previousVertex[destinationStride - 1], normalScratch1);
                    currentNormal = AttributeCompression.octDecode(currentVertex[destinationStride - 2], currentVertex[destinationStride - 1], normalScratch2);
                    Cartesian3.lerp(currentNormal, previousNormal, ratio, normalScratch3);
                    Cartesian3.normalize(normalScratch3, normalScratch3);
                    interpolatedOctEncodedNormal = AttributeCompression.octEncode(normalScratch3, encodedNormalScratch);
                }

                addVertex(ellipsoid, clipRectangle, encoding, interpolatedU, interpolatedV, interpolatedHeight, interpolatedOctEncodedNormal, southMercatorY, oneOverMercatorHeight, outputVertices, outputVertices.length);
                minimumHeight = Math.min(minimumHeight, interpolatedHeight);
                maximumHeight = Math.max(maximumHeight, interpolatedHeight);
            }

            if (inside) {
                getVertex(encoding, vertices, index, outputVertices, outputVertices.length);
                var vertexStart = outputVertices.length - destinationStride;
                outputVertices[vertexStart + 4] = compareU ? transformTextureCoordinate(clipRectangleUMin, clipRectangleUMax, outputVertices[vertexStart + 4]) : edgeCoordinate;
                outputVertices[vertexStart + 5] = compareU ? edgeCoordinate : transformTextureCoordinate(clipRectangleVMin, clipRectangleVMax, outputVertices[vertexStart + 5]);
                if (encoding.hasWebMercatorT) {
                    var latitude = CesiumMath.lerp(clipRectangle.south, clipRectangle.north, v);
                    outputVertices[vertexStart + 6] = (WebMercatorProjection.geodeticLatitudeToMercatorAngle(latitude) - southMercatorY) * oneOverMercatorHeight;
                }
                minimumHeight = Math.min(minimumHeight, outputVertices[vertexStart + 3]);
                maximumHeight = Math.max(maximumHeight, outputVertices[vertexStart + 3]);
            }

            if (crossedSecond) {
                ratio = (second - uOrV) / (lastUOrV - uOrV);
                interpolatedHeight = CesiumMath.lerp(currentVertex[3], previousVertex[3], ratio);
                interpolatedU = compareU ? second : edgeCoordinate;
                interpolatedV = compareU ? edgeCoordinate : second;

                if (encoding.hasVertexNormals) {
                    previousNormal = AttributeCompression.octDecode(previousVertex[destinationStride - 2], previousVertex[destinationStride - 1], normalScratch1);
                    currentNormal = AttributeCompression.octDecode(currentVertex[destinationStride - 2], currentVertex[destinationStride - 1], normalScratch2);
                    Cartesian3.lerp(currentNormal, previousNormal, ratio, normalScratch3);
                    Cartesian3.normalize(normalScratch3, normalScratch3);
                    interpolatedOctEncodedNormal = AttributeCompression.octEncode(normalScratch3, encodedNormalScratch);
                }

                addVertex(ellipsoid, clipRectangle, encoding, interpolatedU, interpolatedV, interpolatedHeight, interpolatedOctEncodedNormal, southMercatorY, oneOverMercatorHeight, outputVertices, outputVertices.length);
                minimumHeight = Math.min(minimumHeight, interpolatedHeight);
                maximumHeight = Math.max(maximumHeight, interpolatedHeight);
            }

            lastUOrV = uOrV;
        }

        result.minimumHeight = minimumHeight;
        result.maximumHeight = maximumHeight;

        return result;
    };

    return TerrainMesh;
});
