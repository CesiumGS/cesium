/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/DeveloperError',
        './TerrainProvider',
        './TerrainState',
        './TileProviderError',
        '../ThirdParty/when'
    ], function(
        BoundingSphere,
        Cartesian3,
        defined,
        DeveloperError,
        TerrainProvider,
        TerrainState,
        TileProviderError,
        when) {
    "use strict";

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
    var TileTerrain = function TileTerrain(upsampleDetails) {
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
    };

    TileTerrain.prototype.freeResources = function() {
        this.state = TerrainState.UNLOADED;
        this.data = undefined;
        this.mesh = undefined;

        if (defined(this.vertexArray)) {
            var indexBuffer = this.vertexArray.getIndexBuffer();

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
        var mesh = this.mesh;
        Cartesian3.clone(mesh.center, tile.center);
        tile.minimumHeight = mesh.minimumHeight;
        tile.maximumHeight = mesh.maximumHeight;
        tile.boundingSphere3D = BoundingSphere.clone(mesh.boundingSphere3D, tile.boundingSphere3D);

        tile.occludeePointInScaledSpace = Cartesian3.clone(mesh.occludeePointInScaledSpace, tile.occludeePointInScaledSpace);

        // Free the tile's existing vertex array, if any.
        tile.freeVertexArray();

        // Transfer ownership of the vertex array to the tile itself.
        tile.vertexArray = this.vertexArray;
        this.vertexArray = undefined;
    };

    TileTerrain.prototype.processLoadStateMachine = function(context, terrainProvider, x, y, level) {
        if (this.state === TerrainState.UNLOADED) {
            requestTileGeometry(this, terrainProvider, x, y, level);
        }

        if (this.state === TerrainState.RECEIVED) {
            transform(this, context, terrainProvider, x, y, level);
        }

        if (this.state === TerrainState.TRANSFORMED) {
            createResources(this, context, terrainProvider, x, y, level);
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

    TileTerrain.prototype.processUpsampleStateMachine = function(context, terrainProvider, x, y, level) {
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
            transform(this, context, terrainProvider, x, y, level);
        }

        if (this.state === TerrainState.TRANSFORMED) {
            createResources(this, context, terrainProvider, x, y, level);
        }
    };

    function transform(tileTerrain, context, terrainProvider, x, y, level) {
        var tilingScheme = terrainProvider.tilingScheme;

        var terrainData = tileTerrain.data;
        var meshPromise = terrainData.createMesh(tilingScheme, x, y, level);

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
        TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tileTerrain.mesh, tileTerrain, true);
        tileTerrain.state = TerrainState.READY;
    }

    return TileTerrain;
});
