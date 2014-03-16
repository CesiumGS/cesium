/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/defined',
        '../Core/DeveloperError',
        './ImageryState',
        './TerrainState',
        './TileState',
        './TileTerrain',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        Cartographic,
        defined,
        DeveloperError,
        ImageryState,
        TerrainState,
        TileState,
        TileTerrain,
        PixelDatatype,
        PixelFormat,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    "use strict";

    /**
     * A node in the quadtree representing the surface of a {@link CentralBody}.
     * A tile holds the surface geometry for its horizontal extent and zero or
     * more imagery textures overlaid on the geometry.
     *
     * @alias Tile
     * @constructor
     * @private
     *
     * @param {TilingScheme} description.tilingScheme The tiling scheme of which the new tile is a part, such as a
     *                                                {@link WebMercatorTilingScheme} or a {@link GeographicTilingScheme}.
     * @param {Number} description.x The tile x coordinate.
     * @param {Number} description.y The tile y coordinate.
     * @param {Number} description.level The tile level-of-detail.
     * @param {Tile} description.parent The parent of this tile in a tile tree system.
     */
    var Tile = function(description) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(description)) {
            throw new DeveloperError('description is required.');
        }
        if (!defined(description.x)) {
            throw new DeveloperError('description.x is required.');
        } else if (!defined(description.y)) {
            throw new DeveloperError('description.y is required.');
        } else if (description.x < 0 || description.y < 0) {
            throw new DeveloperError('description.x and description.y must be greater than or equal to zero.');
        }
        if (!defined(description.level)) {
            throw new DeveloperError('description.level is required and must be greater than or equal to zero.');
        }
        if (!defined(description.tilingScheme)) {
            throw new DeveloperError('description.tilingScheme is required.');
        }
        //>>includeEnd('debug');

        /**
         * The tiling scheme used to tile the surface.
         * @type {TilingScheme}
         */
        this.tilingScheme = description.tilingScheme;

        /**
         * The x coordinate.
         * @type {Number}
         */
        this.x = description.x;

        /**
         * The y coordinate.
         * @type {Number}
         */
        this.y = description.y;

        /**
         * The level-of-detail, where zero is the coarsest, least-detailed.
         * @type {Number}
         */
        this.level = description.level;

        /**
         * The parent of this tile in a tiling scheme.
         * @type {Tile}
         */
        this.parent = description.parent;

        /**
         * The children of this tile in a tiling scheme.
         * @type {Array}
         * @default undefined
         */
        this.children = undefined;

        /**
         * The cartographic extent of the tile, with north, south, east and
         * west properties in radians.
         * @type {Extent}
         */
        this.extent = this.tilingScheme.tileXYToExtent(this.x, this.y, this.level);

        /**
         * The current state of the tile in the tile load pipeline.
         * @type {TileState}
         * @default {@link TileState.START}
         */
        this.state = TileState.START;

        /**
         * The previous tile in the {@link TileReplacementQueue}.
         * @type {Tile}
         * @default undefined
         */
        this.replacementPrevious = undefined;

        /**
         * The next tile in the {@link TileReplacementQueue}.
         * @type {Tile}
         * @default undefined
         */
        this.replacementNext = undefined;

        /**
         * The {@link TileImagery} attached to this tile.
         * @type {Array}
         * @default []
         */
        this.imagery = [];

        /**
         * The distance from the camera to this tile, updated when the tile is selected
         * for rendering.  We can get rid of this if we have a better way to sort by
         * distance - for example, by using the natural ordering of a quadtree.
         * @type {Number}
         * @default 0.0
         */
        this.distance = 0.0;

        /**
         * The world coordinates of the southwest corner of the tile's extent.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.southwestCornerCartesian = new Cartesian3();

        /**
         * The world coordinates of the northeast corner of the tile's extent.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.northeastCornerCartesian = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the western edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.westNormal = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the southern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.southNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.eastNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.northNormal = new Cartesian3();

        this.waterMaskTexture = undefined;

        this.waterMaskTranslationAndScale = new Cartesian4(0.0, 0.0, 1.0, 1.0);

        this.terrainData = undefined;
        this.center = new Cartesian3();
        this.vertexArray = undefined;
        this.minimumHeight = 0.0;
        this.maximumHeight = 0.0;
        this.boundingSphere3D = new BoundingSphere();
        this.boundingSphere2D = new BoundingSphere();
        this.occludeePointInScaledSpace = new Cartesian3();

        this.isRenderable = false;

        this.loadedTerrain = undefined;
        this.upsampledTerrain = undefined;
    };

    /**
     * Returns an array of tiles that would be at the next level of the tile tree.
     *
     * @memberof Tile
     *
     * @returns {Array} The list of child tiles.
     */
    Tile.prototype.getChildren = function() {
        if (!defined(this.children)) {
            var tilingScheme = this.tilingScheme;
            var level = this.level + 1;
            var x = this.x * 2;
            var y = this.y * 2;
            this.children = [new Tile({
                tilingScheme : tilingScheme,
                x : x,
                y : y,
                level : level,
                parent : this
            }), new Tile({
                tilingScheme : tilingScheme,
                x : x + 1,
                y : y,
                level : level,
                parent : this
            }), new Tile({
                tilingScheme : tilingScheme,
                x : x,
                y : y + 1,
                level : level,
                parent : this
            }), new Tile({
                tilingScheme : tilingScheme,
                x : x + 1,
                y : y + 1,
                level : level,
                parent : this
            })];
        }

        return this.children;
    };

    Tile.prototype.freeResources = function() {
        if (defined(this.waterMaskTexture)) {
            --this.waterMaskTexture.referenceCount;
            if (this.waterMaskTexture.referenceCount === 0) {
                this.waterMaskTexture.destroy();
            }
            this.waterMaskTexture = undefined;
        }

        this.state = TileState.START;
        this.isRenderable = false;
        this.terrainData = undefined;

        if (defined(this.loadedTerrain)) {
            this.loadedTerrain.freeResources();
            this.loadedTerrain = undefined;
        }

        if (defined(this.upsampledTerrain)) {
            this.upsampledTerrain.freeResources();
            this.upsampledTerrain = undefined;
        }

        var i, len;

        var imageryList = this.imagery;
        for (i = 0, len = imageryList.length; i < len; ++i) {
            imageryList[i].freeResources();
        }
        this.imagery.length = 0;

        if (defined(this.children)) {
            for (i = 0, len = this.children.length; i < len; ++i) {
                this.children[i].freeResources();
            }
            this.children = undefined;
        }

        this.freeVertexArray();
    };

    Tile.prototype.freeVertexArray = function() {
        var indexBuffer;

        if (defined(this.vertexArray)) {
            indexBuffer = this.vertexArray.getIndexBuffer();

            this.vertexArray.destroy();
            this.vertexArray = undefined;

            if (!indexBuffer.isDestroyed() && defined(indexBuffer.referenceCount)) {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }

        if (typeof this.wireframeVertexArray !== 'undefined') {
            indexBuffer = this.wireframeVertexArray.getIndexBuffer();

            this.wireframeVertexArray.destroy();
            this.wireframeVertexArray = undefined;

            if (!indexBuffer.isDestroyed() && typeof indexBuffer.referenceCount !== 'undefined') {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }
    };

    Tile.prototype.processStateMachine = function(context, terrainProvider, imageryLayerCollection) {
        if (this.state === TileState.START) {
            prepareNewTile(this, terrainProvider, imageryLayerCollection);
            this.state = TileState.LOADING;
        }

        if (this.state === TileState.LOADING) {
            processTerrainStateMachine(this, context, terrainProvider);
        }

        // The terrain is renderable as soon as we have a valid vertex array.
        var isRenderable = defined(this.vertexArray);

        // But it's not done loading until our two state machines are terminated.
        var isDoneLoading = !defined(this.loadedTerrain) && !defined(this.upsampledTerrain);

        // Transition imagery states
        var tileImageryCollection = this.imagery;
        for (var i = 0, len = tileImageryCollection.length; i < len; ++i) {
            var tileImagery = tileImageryCollection[i];
            if (!defined(tileImagery.loadingImagery)) {
                continue;
            }

            if (tileImagery.loadingImagery.state === ImageryState.PLACEHOLDER) {
                var imageryLayer = tileImagery.loadingImagery.imageryLayer;
                if (imageryLayer.getImageryProvider().ready) {
                    // Remove the placeholder and add the actual skeletons (if any)
                    // at the same position.  Then continue the loop at the same index.
                    tileImagery.freeResources();
                    tileImageryCollection.splice(i, 1);
                    imageryLayer._createTileImagerySkeletons(this, terrainProvider, i);
                    --i;
                    len = tileImageryCollection.length;
                    continue;
                }
            }

            var thisTileDoneLoading = tileImagery.processStateMachine(this, context);
            isDoneLoading = isDoneLoading && thisTileDoneLoading;

            // The imagery is renderable as soon as we have any renderable imagery for this region.
            isRenderable = isRenderable && (thisTileDoneLoading || defined(tileImagery.readyImagery));
        }

        // The tile becomes renderable when the terrain and all imagery data are loaded.
        if (i === len) {
            if (isRenderable) {
                this.isRenderable = true;
            }

            if (isDoneLoading) {
                this.state = TileState.READY;
            }
        }
    };

    var cartesian3Scratch = new Cartesian3();
    var cartesian3Scratch2 = new Cartesian3();
    var westernMidpointScratch = new Cartesian3();
    var easternMidpointScratch = new Cartesian3();
    var cartographicScratch = new Cartographic();

    function prepareNewTile(tile, terrainProvider, imageryLayerCollection) {
        var upsampleTileDetails = getUpsampleTileDetails(tile);
        if (defined(upsampleTileDetails)) {
            tile.upsampledTerrain = new TileTerrain(upsampleTileDetails);
        }

        if (isDataAvailable(tile)) {
            tile.loadedTerrain = new TileTerrain();
        }

        // Map imagery tiles to this terrain tile
        for (var i = 0, len = imageryLayerCollection.length; i < len; ++i) {
            var layer = imageryLayerCollection.get(i);
            if (layer.show) {
                layer._createTileImagerySkeletons(tile, terrainProvider);
            }
        }

        var ellipsoid = tile.tilingScheme.ellipsoid;

        // Compute tile extent boundaries for estimating the distance to the tile.
        var extent = tile.extent;

        ellipsoid.cartographicToCartesian(extent.getSouthwest(), tile.southwestCornerCartesian);
        ellipsoid.cartographicToCartesian(extent.getNortheast(), tile.northeastCornerCartesian);

        // The middle latitude on the western edge.
        cartographicScratch.longitude = extent.west;
        cartographicScratch.latitude = (extent.south + extent.north) * 0.5;
        cartographicScratch.height = 0.0;
        var westernMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, westernMidpointScratch);

        // Compute the normal of the plane on the western edge of the tile.
        var westNormal = Cartesian3.cross(westernMidpointCartesian, Cartesian3.UNIT_Z, cartesian3Scratch);
        Cartesian3.normalize(westNormal, tile.westNormal);

        // The middle latitude on the eastern edge.
        cartographicScratch.longitude = extent.east;
        var easternMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, easternMidpointScratch);

        // Compute the normal of the plane on the eastern edge of the tile.
        var eastNormal = Cartesian3.cross(Cartesian3.UNIT_Z, easternMidpointCartesian, cartesian3Scratch);
        Cartesian3.normalize(eastNormal, tile.eastNormal);

        // Compute the normal of the plane bounding the southern edge of the tile.
        var southeastCornerNormal = ellipsoid.geodeticSurfaceNormalCartographic(extent.getSoutheast(), cartesian3Scratch2);
        var westVector = Cartesian3.subtract(westernMidpointCartesian, easternMidpointCartesian, cartesian3Scratch);
        var southNormal = Cartesian3.cross(southeastCornerNormal, westVector, cartesian3Scratch2);
        Cartesian3.normalize(southNormal, tile.southNormal);

        // Compute the normal of the plane bounding the northern edge of the tile.
        var northwestCornerNormal = ellipsoid.geodeticSurfaceNormalCartographic(extent.getNorthwest(), cartesian3Scratch2);
        var northNormal = Cartesian3.cross(westVector, northwestCornerNormal, cartesian3Scratch2);
        Cartesian3.normalize(northNormal, tile.northNormal);
    }

    function processTerrainStateMachine(tile, context, terrainProvider) {
        var loaded = tile.loadedTerrain;
        var upsampled = tile.upsampledTerrain;
        var suspendUpsampling = false;

        if (defined(loaded)) {
            loaded.processLoadStateMachine(context, terrainProvider, tile.x, tile.y, tile.level);

            // Publish the terrain data on the tile as soon as it is available.
            // We'll potentially need it to upsample child tiles.
            if (loaded.state.value >= TerrainState.RECEIVED.value) {
                if (tile.terrainData !== loaded.data) {
                    tile.terrainData = loaded.data;

                    // If there's a water mask included in the terrain data, create a
                    // texture for it.
                    var waterMask = tile.terrainData.getWaterMask();
                    if (defined(waterMask)) {
                        if (defined(tile.waterMaskTexture)) {
                            --tile.waterMaskTexture.referenceCount;
                            if (tile.waterMaskTexture.referenceCount === 0) {
                                tile.waterMaskTexture.destroy();
                            }
                        }
                        tile.waterMaskTexture = createWaterMaskTexture(context, waterMask);
                        tile.waterMaskTranslationAndScale.x = 0.0;
                        tile.waterMaskTranslationAndScale.y = 0.0;
                        tile.waterMaskTranslationAndScale.z = 1.0;
                        tile.waterMaskTranslationAndScale.w = 1.0;
                    }

                    propagateNewLoadedDataToChildren(tile);
                }
                suspendUpsampling = true;
            }

            if (loaded.state === TerrainState.READY) {
                loaded.publishToTile(tile);

                // No further loading or upsampling is necessary.
                tile.loadedTerrain = undefined;
                tile.upsampledTerrain = undefined;
            } else if (loaded.state === TerrainState.FAILED) {
                // Loading failed for some reason, or data is simply not available,
                // so no need to continue trying to load.  Any retrying will happen before we
                // reach this point.
                tile.loadedTerrain = undefined;
            }
        }

        if (!suspendUpsampling && defined(upsampled)) {
            upsampled.processUpsampleStateMachine(context, terrainProvider, tile.x, tile.y, tile.level);

            // Publish the terrain data on the tile as soon as it is available.
            // We'll potentially need it to upsample child tiles.
            // It's safe to overwrite terrainData because we won't get here after
            // loaded terrain data has been received.
            if (upsampled.state.value >= TerrainState.RECEIVED.value) {
                if (tile.terrainData !== upsampled.data) {
                    tile.terrainData = upsampled.data;

                    // If the terrain provider has a water mask, "upsample" that as well
                    // by computing texture translation and scale.
                    if (terrainProvider.hasWaterMask()) {
                        upsampleWaterMask(tile, context);
                    }

                    propagateNewUpsampledDataToChildren(tile);
                }
            }

            if (upsampled.state === TerrainState.READY) {
                upsampled.publishToTile(tile);

                // No further upsampling is necessary.  We need to continue loading, though.
                tile.upsampledTerrain = undefined;
            } else if (upsampled.state === TerrainState.FAILED) {
                // Upsampling failed for some reason.  This is pretty much a catastrophic failure,
                // but maybe we'll be saved by loading.
                tile.upsampledTerrain = undefined;
            }
        }
    }

    function getUpsampleTileDetails(tile) {
        // Find the nearest ancestor with loaded terrain.
        var sourceTile = tile.parent;
        while (defined(sourceTile) && !defined(sourceTile.terrainData)) {
            sourceTile = sourceTile.parent;
        }

        if (!defined(sourceTile)) {
            // No ancestors have loaded terrain - try again later.
            return undefined;
        }

        return {
            data : sourceTile.terrainData,
            x : sourceTile.x,
            y : sourceTile.y,
            level : sourceTile.level
        };
    }

    function propagateNewUpsampledDataToChildren(tile) {
        // Now that there's new data for this tile:
        //  - child tiles that were previously upsampled need to be re-upsampled based on the new data.

        // Generally this is only necessary when a child tile is upsampled, and then one
        // of its ancestors receives new (better) data and we want to re-upsample from the
        // new data.

        if (defined(tile.children)) {
            for (var childIndex = 0; childIndex < 4; ++childIndex) {
                var childTile = tile.children[childIndex];
                if (childTile.state !== TileState.START) {
                    if (defined(childTile.terrainData) && !childTile.terrainData.wasCreatedByUpsampling()) {
                        // Data for the child tile has already been loaded.
                        continue;
                    }

                    // Restart the upsampling process, no matter its current state.
                    // We create a new instance rather than just restarting the existing one
                    // because there could be an asynchronous operation pending on the existing one.
                    if (defined(childTile.upsampledTerrain)) {
                        childTile.upsampledTerrain.freeResources();
                    }
                    childTile.upsampledTerrain = new TileTerrain({
                        data : tile.terrainData,
                        x : tile.x,
                        y : tile.y,
                        level : tile.level
                    });

                    childTile.state = TileState.LOADING;
                }
            }
        }
    }

    function propagateNewLoadedDataToChildren(tile) {
        // Now that there's new data for this tile:
        //  - child tiles that were previously upsampled need to be re-upsampled based on the new data.
        //  - child tiles that were previously deemed unavailable may now be available.

        if (defined(tile.children)) {
            for (var childIndex = 0; childIndex < 4; ++childIndex) {
                var childTile = tile.children[childIndex];
                if (childTile.state !== TileState.START) {
                    if (defined(childTile.terrainData) && !childTile.terrainData.wasCreatedByUpsampling()) {
                        // Data for the child tile has already been loaded.
                        continue;
                    }

                    // Restart the upsampling process, no matter its current state.
                    // We create a new instance rather than just restarting the existing one
                    // because there could be an asynchronous operation pending on the existing one.
                    if (defined(childTile.upsampledTerrain)) {
                        childTile.upsampledTerrain.freeResources();
                    }
                    childTile.upsampledTerrain = new TileTerrain({
                        data : tile.terrainData,
                        x : tile.x,
                        y : tile.y,
                        level : tile.level
                    });

                    if (tile.terrainData.isChildAvailable(tile.x, tile.y, childTile.x, childTile.y)) {
                        // Data is available for the child now.  It might have been before, too.
                        if (!defined(childTile.loadedTerrain)) {
                            // No load process is in progress, so start one.
                            childTile.loadedTerrain = new TileTerrain();
                        }
                    }

                    childTile.state = TileState.LOADING;
                }
            }
        }
    }

    function isDataAvailable(tile) {
        var parent = tile.parent;
        if (!defined(parent)) {
            // Data is assumed to be available for root tiles.
            return true;
        }

        if (!defined(parent.terrainData)) {
            // Parent tile data is not yet received or upsampled, so assume (for now) that this
            // child tile is not available.
            return false;
        }

        return parent.terrainData.isChildAvailable(parent.x, parent.y, tile.x, tile.y);
    }

    function createWaterMaskTexture(context, waterMask) {
        var result;

        var waterMaskData = context.cache.tile_waterMaskData;
        if (!defined(waterMaskData)) {
            waterMaskData = context.cache.tile_waterMaskData = {
                    allWaterTexture : undefined,
                    allLandTexture : undefined,
                    sampler : undefined,
                    destroy : function() {
                        if (defined(this.allWaterTexture)) {
                            this.allWaterTexture.destroy();
                        }
                        if (defined(this.allLandTexture)) {
                            this.allLandTexture.destroy();
                        }
                    }
            };
        }

        var waterMaskSize = Math.sqrt(waterMask.length);
        if (waterMaskSize === 1 && (waterMask[0] === 0 || waterMask[0] === 255)) {
            // Tile is entirely land or entirely water.
            if (!defined(waterMaskData.allWaterTexture)) {
                waterMaskData.allWaterTexture = context.createTexture2D({
                    pixelFormat : PixelFormat.LUMINANCE,
                    pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                    source : {
                        arrayBufferView : new Uint8Array([255]),
                        width : 1,
                        height : 1
                    }
                });
                waterMaskData.allWaterTexture.referenceCount = 1;

                waterMaskData.allLandTexture = context.createTexture2D({
                    pixelFormat : PixelFormat.LUMINANCE,
                    pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                    source : {
                        arrayBufferView : new Uint8Array([0]),
                        width : 1,
                        height : 1
                    }
                });
                waterMaskData.allLandTexture.referenceCount = 1;
            }

            result = waterMask[0] === 0 ? waterMaskData.allLandTexture : waterMaskData.allWaterTexture;
        } else {
            result = context.createTexture2D({
                pixelFormat : PixelFormat.LUMINANCE,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                source : {
                    width : waterMaskSize,
                    height : waterMaskSize,
                    arrayBufferView : waterMask
                }
            });

            result.referenceCount = 0;

            if (!defined(waterMaskData.sampler)) {
                waterMaskData.sampler = context.createSampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.LINEAR,
                    magnificationFilter : TextureMagnificationFilter.LINEAR
                });
            }

            result.setSampler(waterMaskData.sampler);
        }

        ++result.referenceCount;
        return result;
    }

    function upsampleWaterMask(tile, context) {
        // Find the nearest ancestor with loaded terrain.
        var sourceTile = tile.parent;
        while (defined(sourceTile) && !defined(sourceTile.terrainData) || sourceTile.terrainData.wasCreatedByUpsampling()) {
            sourceTile = sourceTile.parent;
        }

        if (!defined(sourceTile) || !defined(sourceTile.waterMaskTexture)) {
            // No ancestors have a water mask texture - try again later.
            return;
        }

        tile.waterMaskTexture = sourceTile.waterMaskTexture;
        ++tile.waterMaskTexture.referenceCount;

        // Compute the water mask translation and scale
        var sourceTileExtent = sourceTile.extent;
        var tileExtent = tile.extent;
        var tileWidth = tileExtent.east - tileExtent.west;
        var tileHeight = tileExtent.north - tileExtent.south;

        var scaleX = tileWidth / (sourceTileExtent.east - sourceTileExtent.west);
        var scaleY = tileHeight / (sourceTileExtent.north - sourceTileExtent.south);
        tile.waterMaskTranslationAndScale.x = scaleX * (tileExtent.west - sourceTileExtent.west) / tileWidth;
        tile.waterMaskTranslationAndScale.y = scaleY * (tileExtent.south - sourceTileExtent.south) / tileHeight;
        tile.waterMaskTranslationAndScale.z = scaleX;
        tile.waterMaskTranslationAndScale.w = scaleY;
    }

    return Tile;
});
