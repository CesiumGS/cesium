/*global define*/
define([
        './defaultValue'
    ], function(
        defaultValue) {
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
      *
      * @private
      */
    function TerrainMesh(center, vertices, indices, minimumHeight, maximumHeight, boundingSphere3D, occludeePointInScaledSpace, vertexStride, orientedBoundingBox, encoding, exaggeration) {
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
    }

    return TerrainMesh;
});
