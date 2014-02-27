/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/ComponentDatatype',
        '../Renderer/BufferUsage',
        '../Core/IndexDatatype'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        ComponentDatatype,
        BufferUsage,
        IndexDatatype) {
    "use strict";

    /**
     * Provides terrain or other geometry for the surface of an ellipsoid.  The surface geometry is
     * organized into a pyramid of tiles according to a {@link TilingScheme}.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias TerrainProvider
     * @constructor
     *
     * @see EllipsoidTerrainProvider
     * @see CesiumTerrainProvider
     * @see ArcGisImageServerTerrainProvider
     */
    var TerrainProvider = function() {
        DeveloperError.throwInstantiationError();
    };

    defineProperties(TerrainProvider.prototype, {
        /**
         * Gets an event that is raised when the terrain provider encounters an asynchronous error..  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof TerrainProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the credit to display when this terrain provider is active.  Typically this is used to credit
         * the source of the terrain. This function should
         * not be called before {@link TerrainProvider#ready} returns true.
         * @memberof TerrainProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the tiling scheme used by the provider.  This function should
         * not be called before {@link TerrainProvider#ready} returns true.
         * @memberof TerrainProvider.prototype
         * @type {TilingScheme}
         */
        tilingScheme : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof TerrainProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Specifies the indices of the attributes of the terrain geometry.
     *
     * @memberof TerrainProvider
     */
    TerrainProvider.attributeLocations = {
        position3DAndHeight : 0,
        textureCoordinates : 1
    };

    var regularGridIndexArrays = [];

    TerrainProvider.getRegularGridIndices = function(width, height) {
        var byWidth = regularGridIndexArrays[width];
        if (!defined(byWidth)) {
            regularGridIndexArrays[width] = byWidth = [];
        }

        var indices = byWidth[height];
        if (!defined(indices)) {
            indices = byWidth[height] = new Uint16Array((width - 1) * (height - 1) * 6);

            var index = 0;
            var indicesIndex = 0;
            for ( var i = 0; i < height - 1; ++i) {
                for ( var j = 0; j < width - 1; ++j) {
                    var upperLeft = index;
                    var lowerLeft = upperLeft + width;
                    var lowerRight = lowerLeft + 1;
                    var upperRight = upperLeft + 1;

                    indices[indicesIndex++] = upperLeft;
                    indices[indicesIndex++] = lowerLeft;
                    indices[indicesIndex++] = upperRight;
                    indices[indicesIndex++] = upperRight;
                    indices[indicesIndex++] = lowerLeft;
                    indices[indicesIndex++] = lowerRight;

                    ++index;
                }
                ++index;
            }
        }

        return indices;
    };

    function addTriangle(lines, linesIndex, i0, i1, i2) {
        lines[linesIndex++] = i0;
        lines[linesIndex++] = i1;

        lines[linesIndex++] = i1;
        lines[linesIndex++] = i2;

        lines[linesIndex++] = i2;
        lines[linesIndex++] = i0;

        return linesIndex;
    }

    function trianglesToLines(triangles) {
        var count = triangles.length;
        var lines = new Uint16Array(2 * count);
        var linesIndex = 0;
        for ( var i = 0; i < count; i += 3) {
            linesIndex = addTriangle(lines, linesIndex, triangles[i], triangles[i + 1], triangles[i + 2]);
        }

        return lines;
    }

    TerrainProvider.createTileEllipsoidGeometryFromBuffers = function(context, buffers, tileTerrain, includesHeights) {
        var datatype = ComponentDatatype.FLOAT;
        var typedArray = buffers.vertices;
        var buffer = context.createVertexBuffer(typedArray, BufferUsage.STATIC_DRAW);
        var stride = 5 * datatype.sizeInBytes;
        var position3DAndHeightLength = 3;

        if (includesHeights) {
            stride += datatype.sizeInBytes;
            ++position3DAndHeightLength;
        }

        var attributes = [{
            index : TerrainProvider.attributeLocations.position3DAndHeight,
            vertexBuffer : buffer,
            componentDatatype : datatype,
            componentsPerAttribute : position3DAndHeightLength,
            offsetInBytes : 0,
            strideInBytes : stride
        }, {
            index : TerrainProvider.attributeLocations.textureCoordinates,
            vertexBuffer : buffer,
            componentDatatype : datatype,
            componentsPerAttribute : 2,
            offsetInBytes : position3DAndHeightLength * datatype.sizeInBytes,
            strideInBytes : stride
        }];

        var indexBuffers = buffers.indices.indexBuffers || {};
        var indexBuffer = indexBuffers[context.getId()];
        if (!defined(indexBuffer) || indexBuffer.isDestroyed()) {
            var indices = buffers.indices;
            indexBuffer = context.createIndexBuffer(indices, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
            indexBuffer.setVertexArrayDestroyable(false);
            indexBuffer.referenceCount = 1;
            indexBuffers[context.getId()] = indexBuffer;
            buffers.indices.indexBuffers = indexBuffers;
        } else {
            ++indexBuffer.referenceCount;
        }

        tileTerrain.vertexArray = context.createVertexArray(attributes, indexBuffer);
    };

    /**
     * Creates a vertex array for wireframe rendering of a terrain tile.
     *
     * @param {Context} context The context in which to create the vertex array.
     * @param {VertexArray} vertexArray The existing, non-wireframe vertex array.  The new vertex array
     *                      will share vertex buffers with this existing one.
     * @param {TerrainMesh} terrainMesh The terrain mesh containing non-wireframe indices.
     * @returns {VertexArray} The vertex array for wireframe rendering.
     */
    TerrainProvider.createWireframeVertexArray = function(context, vertexArray, terrainMesh) {
        var wireframeIndices = trianglesToLines(terrainMesh.indices);
        var wireframeIndexBuffer = context.createIndexBuffer(wireframeIndices, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
        return context.createVertexArray(vertexArray._attributes, wireframeIndexBuffer);
    };

    /**
     * Specifies the quality of terrain created from heightmaps.  A value of 1.0 will
     * ensure that adjacent heightmap vertices are separated by no more than
     * {@link CentralBody.maximumScreenSpaceError} screen pixels and will probably go very slowly.
     * A value of 0.5 will cut the estimated level zero geometric error in half, allowing twice the
     * screen pixels between adjacent heightmap vertices and thus rendering more quickly.
     */
    TerrainProvider.heightmapTerrainQuality = 0.25;

    /**
     * Determines an appropriate geometric error estimate when the geometry comes from a heightmap.
     *
     * @param ellipsoid The ellipsoid to which the terrain is attached.
     * @param tileImageWidth The width, in pixels, of the heightmap associated with a single tile.
     * @param numberOfTilesAtLevelZero The number of tiles in the horizontal direction at tile level zero.
     * @returns {Number} An estimated geometric error.
     */
    TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap = function(ellipsoid, tileImageWidth, numberOfTilesAtLevelZero) {
        return ellipsoid.maximumRadius * 2 * Math.PI * TerrainProvider.heightmapTerrainQuality / (tileImageWidth * numberOfTilesAtLevelZero);
    };

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link TerrainProvider#ready} returns true.  The result must include terrain data and
     * may optionally include a water mask and an indication of which child tiles are available.
     * @memberof TerrainProvider
     * @function
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @param {Boolean} [throttleRequests=true] True if the number of simultaneous requests should be limited,
     *                  or false if the request should be initiated regardless of the number of requests
     *                  already in progress.
     * @returns {Promise|TerrainData} A promise for the requested geometry.  If this method
     *          returns undefined instead of a promise, it is an indication that too many requests are already
     *          pending and the request will be retried later.
     */
    TerrainProvider.prototype.requestTileGeometry = DeveloperError.throwInstantiationError;

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.  This function should not be
     * called before {@link TerrainProvider#ready} returns true.
     * @memberof TerrainProvider
     * @function
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    TerrainProvider.prototype.getLevelMaximumGeometricError = DeveloperError.throwInstantiationError;

    /**
     * Gets a value indicating whether or not the provider includes a water mask.  The water mask
     * indicates which areas of the globe are water rather than land, so they can be rendered
     * as a reflective surface with animated waves.  This function should not be
     * called before {@link TerrainProvider#ready} returns true.
     * @memberof TerrainProvider
     * @function
     *
     * @returns {Boolean} True if the provider has a water mask; otherwise, false.
     */
    TerrainProvider.prototype.hasWaterMask = DeveloperError.throwInstantiationError;

    return TerrainProvider;
});