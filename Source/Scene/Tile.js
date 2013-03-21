/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
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
     *
     * @exception {DeveloperError} Either description.extent or both description.x and description.y is required.
     * @exception {DeveloperError} description.level is required.
     */
    var Tile = function(description) {
        if (typeof description === 'undefined') {
            throw new DeveloperError('description is required.');
        }

        if (typeof description.x === 'undefined' || typeof description.y === 'undefined') {
            if (typeof description.extent === 'undefined') {
                throw new DeveloperError('Either description.extent is required or description.x and description.y are required.');
            }
        } else if (description.x < 0 || description.y < 0) {
            throw new DeveloperError('description.x and description.y must be greater than or equal to zero.');
        }

        if (typeof description.level === 'undefined' || description.zoom < 0) {
            throw new DeveloperError('description.level is required and must be greater than or equal to zero.');
        }

        if (typeof description.tilingScheme === 'undefined') {
            throw new DeveloperError('description.tilingScheme is required.');
        }

        /**
         * The tiling scheme used to tile the surface.
         * @type TilingScheme
         */
        this.tilingScheme = description.tilingScheme;

        /**
         * The x coordinate.
         * @type Number
         */
        this.x = description.x;

        /**
         * The y coordinate.
         * @type Number
         */
        this.y = description.y;

        /**
         * The level-of-detail, where zero is the coarsest, least-detailed.
         * @type Number
         */
        this.level = description.level;

        /**
         * The parent of this tile in a tiling scheme.
         * @type Tile
         */
        this.parent = description.parent;

        /**
         * The children of this tile in a tiling scheme.
         * @type Array
         */
        this.children = undefined;

        /**
         * The cartographic extent of the tile, with north, south, east and
         * west properties in radians.
         * @type Extent
         */
        this.extent = this.tilingScheme.tileXYToExtent(this.x, this.y, this.level);

        /**
         * The current state of the tile in the tile load pipeline.
         * @type TileState
         */
        this.state = TileState.START;

        /**
         * The previous tile in the {@link TileLoadQueue}.
         * @type Tile
         */
        this.loadPrevious = undefined;

        /**
         * The next tile in the {@link TileLoadQueue}.
         * @type Tile
         */
        this.loadNext = undefined;

        /**
         * The previous tile in the {@link TileReplacementQueue}.
         * @type Tile
         */
        this.replacementPrevious = undefined;

        /**
         * The next tile in the {@link TileReplacementQueue}.
         * @type Tile
         */
        this.replacementNext = undefined;

        /**
         * The {@link TileImagery} attached to this tile.
         * @type Array
         */
        this.imagery = [];

        /**
         * The distance from the camera to this tile, updated when the tile is selected
         * for rendering.  We can get rid of this if we have a better way to sort by
         * distance - for example, by using the natural ordering of a quadtree.
         * @type Number
         */
        this.distance = 0.0;

        /**
         * The world coordinates of the southwest corner of the tile's extent.
         *
         * @type Cartesian3
         */
        this.southwestCornerCartesian = new Cartesian3();

        /**
         * The world coordinates of the northeast corner of the tile's extent.
         *
         * @type Cartesian3
         */
        this.northeastCornerCartesian = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the western edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type Cartesian3
         */
        this.westNormal = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the southern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type Cartesian3
         */
        this.southNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type Cartesian3
         */
        this.eastNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type Cartesian3
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
     * @return {Array} The list of child tiles.
     */
    Tile.prototype.getChildren = function() {
        if (typeof this.children === 'undefined') {
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
        if (typeof this.waterMaskTexture !== 'undefined') {
            --this.waterMaskTexture.referenceCount;
            if (this.waterMaskTexture.referenceCount === 0) {
                this.waterMaskTexture.destroy();
            }
            this.waterMaskTexture = undefined;
        }

        this.state = TileState.START;
        this.isRenderable = false;
        this.terrainData = undefined;

        if (typeof this.loadedTerrain !== 'undefined') {
            this.loadedTerrain.freeResources();
            this.loadedTerrain = undefined;
        }

        if (typeof this.upsampledTerrain !== 'undefined') {
            this.upsampledTerrain.freeResources();
            this.upsampledTerrain = undefined;
        }

        var i, len;

        var imageryList = this.imagery;
        for (i = 0, len = imageryList.length; i < len; ++i) {
            imageryList[i].freeResources();
        }
        this.imagery.length = 0;

        if (typeof this.children !== 'undefined') {
            for (i = 0, len = this.children.length; i < len; ++i) {
                this.children[i].freeResources();
            }
            this.children = undefined;
        }

        this.freeVertexArray();
    };

    Tile.prototype.freeVertexArray = function() {
        if (typeof this.vertexArray !== 'undefined') {
            var indexBuffer = this.vertexArray.getIndexBuffer();

            this.vertexArray.destroy();
            this.vertexArray = undefined;

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

        var isRenderable = typeof this.vertexArray !== 'undefined';
        var isDoneLoading = typeof this.loadedTerrain === 'undefined' && typeof this.upsampledTerrain === 'undefined';

        // Transition imagery states
        var tileImageryCollection = this.imagery;
        for (var i = 0, len = tileImageryCollection.length; i < len; ++i) {
            var tileImagery = tileImageryCollection[i];
            var imagery = tileImagery.imagery;
            var imageryLayer = imagery.imageryLayer;

            if (imagery.state === ImageryState.PLACEHOLDER) {
                if (imageryLayer.getImageryProvider().isReady()) {
                    // Remove the placeholder and add the actual skeletons (if any)
                    // at the same position.  Then continue the loop at the same index.
                    tileImagery.freeResources();
                    tileImageryCollection.splice(i, 1);
                    imageryLayer._createTileImagerySkeletons(this, terrainProvider, i);
                    --i;
                    len = tileImageryCollection.length;
                }
            }

            if (imagery.state === ImageryState.UNLOADED) {
                imagery.state = ImageryState.TRANSITIONING;
                imageryLayer._requestImagery(imagery);
            }

            if (imagery.state === ImageryState.RECEIVED) {
                imagery.state = ImageryState.TRANSITIONING;
                imageryLayer._createTexture(context, imagery);
            }

            if (imagery.state === ImageryState.TEXTURE_LOADED) {
                imagery.state = ImageryState.TRANSITIONING;
                imageryLayer._reprojectTexture(context, imagery);
            }

            if (imagery.state === ImageryState.FAILED || imagery.state === ImageryState.INVALID) {
                // re-associate TileImagery with a parent Imagery that is not failed or invalid.
                var parent = imagery.parent;
                while (typeof parent !== 'undefined' && (parent.state === ImageryState.FAILED || parent.state === ImageryState.INVALID)) {
                    parent = parent.parent;
                }

                // If there's no valid parent, remove this TileImagery from the tile.
                if (typeof parent === 'undefined') {
                    tileImagery.freeResources();
                    tileImageryCollection.splice(i, 1);
                    --i;
                    len = tileImageryCollection.length;
                    continue;
                }

                // use that parent imagery instead, storing the original imagery
                // in originalImagery to keep it alive
                tileImagery.originalImagery = imagery;

                parent.addReference();
                tileImagery.imagery = parent;
                imagery = parent;
            }

            var imageryDoneLoading = imagery.state === ImageryState.READY;

            if (imageryDoneLoading && typeof tileImagery.textureTranslationAndScale === 'undefined') {
                tileImagery.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(this, tileImagery);
            }

            isRenderable = isRenderable && (imageryDoneLoading || imageryLayer.alpha === 0.0);
            isDoneLoading = isDoneLoading && imageryDoneLoading;
        }

        // The tile becomes renderable when the terrain and all imagery data are loaded.
        if (i === len && isRenderable) {
            this.isRenderable = true;

            if (isDoneLoading) {
                this.state = TileState.READY;
            }
        }
    };

    var cartesian3Scratch = new Cartesian3();
    var cartesian3Scratch2 = new Cartesian3();
    var southeastScratch = new Cartesian3();
    var northwestScratch = new Cartesian3();

    function prepareNewTile(tile, terrainProvider, imageryLayerCollection) {
        var upsampleTileDetails = getUpsampleTileDetails(tile);
        if (typeof upsampleTileDetails !== 'undefined') {
            tile.upsampledTerrain = new TileTerrain(upsampleTileDetails);
        }

        if (isDataAvailable(tile)) {
            tile.loadedTerrain = new TileTerrain();
        }

        // Map imagery tiles to this terrain tile
        for (var i = 0, len = imageryLayerCollection.getLength(); i < len; ++i) {
            var layer = imageryLayerCollection.get(i);
            if (layer.show) {
                layer._createTileImagerySkeletons(tile, terrainProvider);
            }
        }

        var ellipsoid = tile.tilingScheme.getEllipsoid();

        // Compute tile extent boundaries for estimating the distance to the tile.
        var extent = tile.extent;
        ellipsoid.cartographicToCartesian(extent.getSouthwest(), tile.southwestCornerCartesian);
        var southeastCornerCartesian = ellipsoid.cartographicToCartesian(extent.getSoutheast(), southeastScratch);
        ellipsoid.cartographicToCartesian(extent.getNortheast(), tile.northeastCornerCartesian);
        var northwestCornerCartesian = ellipsoid.cartographicToCartesian(extent.getNorthwest(), northwestScratch);

        Cartesian3.UNIT_Z.cross(tile.southwestCornerCartesian.negate(cartesian3Scratch), cartesian3Scratch).normalize(tile.westNormal);
        tile.northeastCornerCartesian.negate(cartesian3Scratch).cross(Cartesian3.UNIT_Z, cartesian3Scratch).normalize(tile.eastNormal);
        ellipsoid.geodeticSurfaceNormal(southeastCornerCartesian, cartesian3Scratch).cross(tile.southwestCornerCartesian.subtract(southeastCornerCartesian, cartesian3Scratch2), cartesian3Scratch).normalize(tile.southNormal);
        ellipsoid.geodeticSurfaceNormal(northwestCornerCartesian, cartesian3Scratch).cross(tile.northeastCornerCartesian.subtract(northwestCornerCartesian, cartesian3Scratch2), cartesian3Scratch).normalize(tile.northNormal);
    }

    function processTerrainStateMachine(tile, context, terrainProvider) {
        var loaded = tile.loadedTerrain;
        var upsampled = tile.upsampledTerrain;
        var suspendUpsampling = false;

        if (typeof loaded !== 'undefined') {
            loaded.processLoadStateMachine(context, terrainProvider, tile.x, tile.y, tile.level);

            // Publish the terrain data on the tile as soon as it is available.
            // We'll potentially need it to upsample child tiles.
            if (loaded.state.value >= TerrainState.RECEIVED.value) {
                if (tile.terrainData !== loaded.data) {
                    tile.terrainData = loaded.data;

                    // If there's a water mask included in the terrain data, create a
                    // texture for it.
                    var waterMask = tile.terrainData.getWaterMask();
                    if (typeof waterMask !== 'undefined') {
                        if (typeof tile.waterMaskTexture !== 'undefined') {
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

        if (!suspendUpsampling && typeof upsampled !== 'undefined') {
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
        while (typeof sourceTile !== 'undefined' && typeof sourceTile.terrainData === 'undefined') {
            sourceTile = sourceTile.parent;
        }

        if (typeof sourceTile === 'undefined') {
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

        if (typeof tile.children !== 'undefined') {
            for (var childIndex = 0; childIndex < 4; ++childIndex) {
                var childTile = tile.children[childIndex];
                if (childTile.state !== TileState.START) {
                    if (typeof childTile.terrainData !== 'undefined' && !childTile.terrainData.wasCreatedByUpsampling()) {
                        // Data for the child tile has already been loaded.
                        continue;
                    }

                    // Restart the upsampling process, no matter its current state.
                    // We create a new instance rather than just restarting the existing one
                    // because there could be an asynchronous operation pending on the existing one.
                    if (typeof childTile.upsampledTerrain !== 'undefined') {
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

        if (typeof tile.children !== 'undefined') {
            for (var childIndex = 0; childIndex < 4; ++childIndex) {
                var childTile = tile.children[childIndex];
                if (childTile.state !== TileState.START) {
                    if (typeof childTile.terrainData !== 'undefined' && !childTile.terrainData.wasCreatedByUpsampling()) {
                        // Data for the child tile has already been loaded.
                        continue;
                    }

                    // Restart the upsampling process, no matter its current state.
                    // We create a new instance rather than just restarting the existing one
                    // because there could be an asynchronous operation pending on the existing one.
                    if (typeof childTile.upsampledTerrain !== 'undefined') {
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
                        if (typeof childTile.loadedTerrain === 'undefined') {
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
        if (typeof parent === 'undefined') {
            // Data is assumed to be available for root tiles.
            return true;
        }

        if (typeof parent.terrainData === 'undefined') {
            // Parent tile data is not yet received or upsampled, so assume (for now) that this
            // child tile is not available.
            return false;
        }

        return parent.terrainData.isChildAvailable(parent.x, parent.y, tile.x, tile.y);
    }

    function createWaterMaskTexture(context, waterMask) {
        var result;

        var waterMaskData = context.cache.tile_waterMaskData;
        if (typeof waterMaskData === 'undefined') {
            waterMaskData = context.cache.tile_waterMaskData = {
                    allWaterTexture : undefined,
                    allLandTexture : undefined,
                    sampler : undefined,
                    destroy : function() {
                        if (typeof this.allWaterTexture !== 'undefined') {
                            this.allWaterTexture.destroy();
                        }
                        if (typeof this.allLandTexture !== 'undefined') {
                            this.allLandTexture.destroy();
                        }
                    }
            };
        }

        var waterMaskSize = Math.sqrt(waterMask.length);
        if (waterMaskSize === 1 && (waterMask[0] === 0 || waterMask[0] === 255)) {
            // Tile is entirely land or entirely water.
            if (typeof waterMaskData.allWaterTexture === 'undefined') {
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

            if (typeof waterMaskData.sampler === 'undefined') {
                waterMaskData.sampler = context.createSampler({
                    wrapS : TextureWrap.CLAMP,
                    wrapT : TextureWrap.CLAMP,
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
        while (typeof sourceTile !== 'undefined' && (typeof sourceTile.terrainData === 'undefined' || sourceTile.terrainData.wasCreatedByUpsampling())) {
            sourceTile = sourceTile.parent;
        }

        if (typeof sourceTile === 'undefined' || typeof sourceTile.waterMaskTexture === 'undefined') {
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