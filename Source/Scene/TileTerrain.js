/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/IndexDatatype',
        '../Core/OrientedBoundingBox',
        '../Core/TileProviderError',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/VertexArray',
        '../ThirdParty/when',
        './TerrainState',
        './TileBoundingBox'
    ], function(
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        defined,
        DeveloperError,
        IndexDatatype,
        OrientedBoundingBox,
        TileProviderError,
        Buffer,
        BufferUsage,
        VertexArray,
        when,
        TerrainState,
        TileBoundingBox) {
    'use strict';

    /**
     * Manages details of the terrain load or upsample process.
     *
     * @alias TileTerrain
     * @constructor
     * @private
     *
     * @param {TerrainData} [upsampleDetails.data] The terrain data being upsampled.
     * @param {Number} [upsampleDetails.x] The X coordinate of the tile being upsampled.
     * @param {Number} [upsampleDetails.y] The Y coordinate of the tile being upsampled.
     * @param {Number} [upsampleDetails.level] The level coordinate of the tile being upsampled.
     */
    function TileTerrain(upsampleDetails) {
        /**
         * The current state of the terrain in the terrain processing pipeline.
         * @type {TerrainState}
         * @default {@link TerrainState.UNLOADED}
         */
        this.state = TerrainState.UNLOADED;
        this.data = undefined;
        this.mesh = undefined;
        this.vertexArray = undefined;
        this.upsampleDetails = upsampleDetails;
    }

    TileTerrain.prototype.freeResources = function() {
        this.state = TerrainState.UNLOADED;
        this.data = undefined;
        this.mesh = undefined;

        if (defined(this.vertexArray)) {
            var indexBuffer = this.vertexArray.indexBuffer;

            this.vertexArray.destroy();
            this.vertexArray = undefined;

            if (!indexBuffer.isDestroyed() && defined(indexBuffer.referenceCount)) {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }
    };

    TileTerrain.prototype.publishToTile = function(tile) {
        var surfaceTile = tile.data;

        var mesh = this.mesh;
        Cartesian3.clone(mesh.center, surfaceTile.center);
        surfaceTile.minimumHeight = mesh.minimumHeight;
        surfaceTile.maximumHeight = mesh.maximumHeight;
        surfaceTile.boundingSphere3D = BoundingSphere.clone(mesh.boundingSphere3D, surfaceTile.boundingSphere3D);
        surfaceTile.orientedBoundingBox = OrientedBoundingBox.clone(mesh.orientedBoundingBox, surfaceTile.orientedBoundingBox);
        surfaceTile.tileBoundingBox = new TileBoundingBox({
            rectangle : tile.rectangle,
            minimumHeight : mesh.minimumHeight,
            maximumHeight : mesh.maximumHeight,
            ellipsoid : tile.tilingScheme.ellipsoid
        });

        tile.data.occludeePointInScaledSpace = Cartesian3.clone(mesh.occludeePointInScaledSpace, surfaceTile.occludeePointInScaledSpace);
    };

    TileTerrain.prototype.processLoadStateMachine = function(frameState, terrainProvider, x, y, level) {
        if (this.state === TerrainState.UNLOADED) {
            requestTileGeometry(this, terrainProvider, x, y, level);
        }

        if (this.state === TerrainState.RECEIVED) {
            transform(this, frameState, terrainProvider, x, y, level);
        }

        if (this.state === TerrainState.TRANSFORMED) {
            createResources(this, frameState.context, terrainProvider, x, y, level);
        }
    };

    function requestTileGeometry(tileTerrain, terrainProvider, x, y, level) {
        function success(terrainData) {
            tileTerrain.data = terrainData;
            tileTerrain.state = TerrainState.RECEIVED;
        }

        function failure() {
            // Initially assume failure.  handleError may retry, in which case the state will
            // change to RECEIVING or UNLOADED.
            tileTerrain.state = TerrainState.FAILED;

            var message = 'Failed to obtain terrain tile X: ' + x + ' Y: ' + y + ' Level: ' + level + '.';
            terrainProvider._requestError = TileProviderError.handleError(
                terrainProvider._requestError,
                terrainProvider,
                terrainProvider.errorEvent,
                message,
                x, y, level,
                doRequest);
        }

        function doRequest() {
            // Request the terrain from the terrain provider.
            tileTerrain.data = terrainProvider.requestTileGeometry(x, y, level);

            // If the request method returns undefined (instead of a promise), the request
            // has been deferred.
            if (defined(tileTerrain.data)) {
                tileTerrain.state = TerrainState.RECEIVING;

                when(tileTerrain.data, success, failure);
            } else {
                // Deferred - try again later.
                tileTerrain.state = TerrainState.UNLOADED;
            }
        }

        doRequest();
    }

    TileTerrain.prototype.processUpsampleStateMachine = function(frameState, terrainProvider, x, y, level) {
        if (this.state === TerrainState.UNLOADED) {
            var upsampleDetails = this.upsampleDetails;

            //>>includeStart('debug', pragmas.debug);
            if (!defined(upsampleDetails)) {
                throw new DeveloperError('TileTerrain cannot upsample unless provided upsampleDetails.');
            }
            //>>includeEnd('debug');

            var sourceData = upsampleDetails.data;
            var sourceX = upsampleDetails.x;
            var sourceY = upsampleDetails.y;
            var sourceLevel = upsampleDetails.level;

            this.data = sourceData.upsample(terrainProvider.tilingScheme, sourceX, sourceY, sourceLevel, x, y, level);
            if (!defined(this.data)) {
                // The upsample request has been deferred - try again later.
                return;
            }

            this.state = TerrainState.RECEIVING;

            var that = this;
            when(this.data, function(terrainData) {
                that.data = terrainData;
                that.state = TerrainState.RECEIVED;
            }, function() {
                that.state = TerrainState.FAILED;
            });
        }

        if (this.state === TerrainState.RECEIVED) {
            transform(this, frameState, terrainProvider, x, y, level);
        }

        if (this.state === TerrainState.TRANSFORMED) {
            createResources(this, frameState.context, terrainProvider, x, y, level);
        }
    };

    function transform(tileTerrain, frameState, terrainProvider, x, y, level) {
        var tilingScheme = terrainProvider.tilingScheme;

        var terrainData = tileTerrain.data;
        var meshPromise = terrainData.createMesh(tilingScheme, x, y, level, frameState.terrainExaggeration);

        if (!defined(meshPromise)) {
            // Postponed.
            return;
        }

        tileTerrain.state = TerrainState.TRANSFORMING;

        when(meshPromise, function(mesh) {
            tileTerrain.mesh = mesh;
            tileTerrain.state = TerrainState.TRANSFORMED;
        }, function() {
            tileTerrain.state = TerrainState.FAILED;
        });
    }

    function createResources(tileTerrain, context, terrainProvider, x, y, level) {
        var typedArray = tileTerrain.mesh.vertices;
        var buffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : typedArray,
            usage : BufferUsage.STATIC_DRAW
        });
        var attributes = tileTerrain.mesh.encoding.getAttributes(buffer);

        var indexBuffers = tileTerrain.mesh.indices.indexBuffers || {};
        var indexBuffer = indexBuffers[context.id];
        if (!defined(indexBuffer) || indexBuffer.isDestroyed()) {
            var indices = tileTerrain.mesh.indices;
            var indexDatatype = (indices.BYTES_PER_ELEMENT === 2) ?  IndexDatatype.UNSIGNED_SHORT : IndexDatatype.UNSIGNED_INT;
            indexBuffer = Buffer.createIndexBuffer({
                context : context,
                typedArray : indices,
                usage : BufferUsage.STATIC_DRAW,
                indexDatatype : indexDatatype
            });
            indexBuffer.vertexArrayDestroyable = false;
            indexBuffer.referenceCount = 1;
            indexBuffers[context.id] = indexBuffer;
            tileTerrain.mesh.indices.indexBuffers = indexBuffers;
        } else {
            ++indexBuffer.referenceCount;
        }

        tileTerrain.vertexArray = new VertexArray({
            context : context,
            attributes : attributes,
            indexBuffer : indexBuffer
        });

        tileTerrain.state = TerrainState.READY;
    }

    return TileTerrain;
});