/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/IntersectionTests',
        '../Core/PixelFormat',
        '../Core/Rectangle',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './ImageryState',
        './QuadtreeTileLoadState',
        './SceneMode',
        './TerrainState',
        './TileTerrain'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        IntersectionTests,
        PixelFormat,
        Rectangle,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        ImageryState,
        QuadtreeTileLoadState,
        SceneMode,
        TerrainState,
        TileTerrain) {
    "use strict";

    /**
     * Contains additional information about a {@link QuadtreeTile} of the globe's surface, and
     * encapsulates state transition logic for loading tiles.
     *
     * @constructor
     * @alias GlobeSurfaceTile
     * @private
     */
    var GlobeSurfaceTile = function() {
        /**
         * The {@link TileImagery} attached to this tile.
         * @type {TileImagery[]}
         * @default []
         */
        this.imagery = [];

        /**
         * The world coordinates of the southwest corner of the tile's rectangle.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.southwestCornerCartesian = new Cartesian3();

        /**
         * The world coordinates of the northeast corner of the tile's rectangle.
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
        this.orientedBoundingBox = undefined;
        this.occludeePointInScaledSpace = new Cartesian3();

        this.loadedTerrain = undefined;
        this.upsampledTerrain = undefined;

        this.pickBoundingSphere = new BoundingSphere();
        this.pickTerrain = undefined;

        this.surfaceShader = undefined;
    };

    defineProperties(GlobeSurfaceTile.prototype, {
        /**
         * Gets a value indicating whether or not this tile is eligible to be unloaded.
         * Typically, a tile is ineligible to be unloaded while an asynchronous operation,
         * such as a request for data, is in progress on it.  A tile will never be
         * unloaded while it is needed for rendering, regardless of the value of this
         * property.
         * @memberof GlobeSurfaceTile.prototype
         * @type {Boolean}
         */
        eligibleForUnloading : {
            get : function() {
                // Do not remove tiles that are transitioning or that have
                // imagery that is transitioning.
                var loadedTerrain = this.loadedTerrain;
                var loadingIsTransitioning = defined(loadedTerrain) &&
                                             (loadedTerrain.state === TerrainState.RECEIVING || loadedTerrain.state === TerrainState.TRANSFORMING);

                var upsampledTerrain = this.upsampledTerrain;
                var upsamplingIsTransitioning = defined(upsampledTerrain) &&
                                                (upsampledTerrain.state === TerrainState.RECEIVING || upsampledTerrain.state === TerrainState.TRANSFORMING);

                var shouldRemoveTile = !loadingIsTransitioning && !upsamplingIsTransitioning;

                var imagery = this.imagery;
                for (var i = 0, len = imagery.length; shouldRemoveTile && i < len; ++i) {
                    var tileImagery = imagery[i];
                    shouldRemoveTile = !defined(tileImagery.loadingImagery) || tileImagery.loadingImagery.state !== ImageryState.TRANSITIONING;
                }

                return shouldRemoveTile;
            }
        }
    });

    function getPosition(tile, mode, projection, vertices, stride, index, result) {
        Cartesian3.unpack(vertices, index * stride, result);
        Cartesian3.add(tile.center, result, result);

        if (defined(mode) && mode !== SceneMode.SCENE3D) {
            var ellipsoid = projection.ellipsoid;
            var positionCart = ellipsoid.cartesianToCartographic(result);
            projection.project(positionCart, result);
            Cartesian3.fromElements(result.z, result.x, result.y, result);
        }

        return result;
    }

    var scratchV0 = new Cartesian3();
    var scratchV1 = new Cartesian3();
    var scratchV2 = new Cartesian3();
    var scratchResult = new Cartesian3();

    GlobeSurfaceTile.prototype.pick = function(ray, mode, projection, cullBackFaces, result) {
        var terrain = this.pickTerrain;
        if (!defined(terrain)) {
            return undefined;
        }

        var mesh = terrain.mesh;
        if (!defined(mesh)) {
            return undefined;
        }

        var vertices = mesh.vertices;
        var stride = mesh.stride;
        var indices = mesh.indices;

        var length = indices.length;
        for (var i = 0; i < length; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            var v0 = getPosition(this, mode, projection, vertices, stride, i0, scratchV0);
            var v1 = getPosition(this, mode, projection, vertices, stride, i1, scratchV1);
            var v2 = getPosition(this, mode, projection, vertices, stride, i2, scratchV2);

            var intersection = IntersectionTests.rayTriangle(ray, v0, v1, v2, cullBackFaces, scratchResult);
            if (defined(intersection)) {
                return Cartesian3.clone(intersection, result);
            }
        }

        return undefined;
    };

    GlobeSurfaceTile.prototype.freeResources = function() {
        if (defined(this.waterMaskTexture)) {
            --this.waterMaskTexture.referenceCount;
            if (this.waterMaskTexture.referenceCount === 0) {
                this.waterMaskTexture.destroy();
            }
            this.waterMaskTexture = undefined;
        }

        this.terrainData = undefined;

        if (defined(this.loadedTerrain)) {
            this.loadedTerrain.freeResources();
            this.loadedTerrain = undefined;
        }

        if (defined(this.upsampledTerrain)) {
            this.upsampledTerrain.freeResources();
            this.upsampledTerrain = undefined;
        }

        if (defined(this.pickTerrain)) {
            this.pickTerrain.freeResources();
            this.pickTerrain = undefined;
        }

        var i, len;

        var imageryList = this.imagery;
        for (i = 0, len = imageryList.length; i < len; ++i) {
            imageryList[i].freeResources();
        }
        this.imagery.length = 0;

        this.freeVertexArray();
    };

    GlobeSurfaceTile.prototype.freeVertexArray = function() {
        var indexBuffer;

        if (defined(this.vertexArray)) {
            indexBuffer = this.vertexArray.indexBuffer;

            this.vertexArray = this.vertexArray.destroy();

            if (!indexBuffer.isDestroyed() && defined(indexBuffer.referenceCount)) {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }

        if (defined(this.wireframeVertexArray)) {
            indexBuffer = this.wireframeVertexArray.indexBuffer;

            this.wireframeVertexArray = this.wireframeVertexArray.destroy();

            if (!indexBuffer.isDestroyed() && defined(indexBuffer.referenceCount)) {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }
    };

    GlobeSurfaceTile.processStateMachine = function(tile, context, commandList, terrainProvider, imageryLayerCollection) {
        var surfaceTile = tile.data;
        if (!defined(surfaceTile)) {
            surfaceTile = tile.data = new GlobeSurfaceTile();
        }

        if (tile.state === QuadtreeTileLoadState.START) {
            prepareNewTile(tile, terrainProvider, imageryLayerCollection);
            tile.state = QuadtreeTileLoadState.LOADING;
        }

        if (tile.state === QuadtreeTileLoadState.LOADING) {
            processTerrainStateMachine(tile, context, terrainProvider);
        }

        // The terrain is renderable as soon as we have a valid vertex array.
        var isRenderable = defined(surfaceTile.vertexArray);

        // But it's not done loading until our two state machines are terminated.
        var isDoneLoading = !defined(surfaceTile.loadedTerrain) && !defined(surfaceTile.upsampledTerrain);

        // If this tile's terrain and imagery are just upsampled from its parent, mark the tile as
        // upsampled only.  We won't refine a tile if its four children are upsampled only.
        var isUpsampledOnly = defined(surfaceTile.terrainData) && surfaceTile.terrainData.wasCreatedByUpsampling();

        // Transition imagery states
        var tileImageryCollection = surfaceTile.imagery;
        for (var i = 0, len = tileImageryCollection.length; i < len; ++i) {
            var tileImagery = tileImageryCollection[i];
            if (!defined(tileImagery.loadingImagery)) {
                isUpsampledOnly = false;
                continue;
            }

            if (tileImagery.loadingImagery.state === ImageryState.PLACEHOLDER) {
                var imageryLayer = tileImagery.loadingImagery.imageryLayer;
                if (imageryLayer.imageryProvider.ready) {
                    // Remove the placeholder and add the actual skeletons (if any)
                    // at the same position.  Then continue the loop at the same index.
                    tileImagery.freeResources();
                    tileImageryCollection.splice(i, 1);
                    imageryLayer._createTileImagerySkeletons(tile, terrainProvider, i);
                    --i;
                    len = tileImageryCollection.length;
                    continue;
                } else {
                    isUpsampledOnly = false;
                }
            }

            var thisTileDoneLoading = tileImagery.processStateMachine(tile, context, commandList);
            isDoneLoading = isDoneLoading && thisTileDoneLoading;

            // The imagery is renderable as soon as we have any renderable imagery for this region.
            isRenderable = isRenderable && (thisTileDoneLoading || defined(tileImagery.readyImagery));

            isUpsampledOnly = isUpsampledOnly && defined(tileImagery.loadingImagery) &&
                             (tileImagery.loadingImagery.state === ImageryState.FAILED || tileImagery.loadingImagery.state === ImageryState.INVALID);
        }

        tile.upsampledFromParent = isUpsampledOnly;

        // The tile becomes renderable when the terrain and all imagery data are loaded.
        if (i === len) {
            if (isRenderable) {
                tile.renderable = true;
            }

            if (isDoneLoading) {
                tile.state = QuadtreeTileLoadState.DONE;
            }
        }
    };

    var cartesian3Scratch = new Cartesian3();
    var cartesian3Scratch2 = new Cartesian3();
    var westernMidpointScratch = new Cartesian3();
    var easternMidpointScratch = new Cartesian3();
    var cartographicScratch = new Cartographic();

    function prepareNewTile(tile, terrainProvider, imageryLayerCollection) {
        var surfaceTile = tile.data;

        var upsampleTileDetails = getUpsampleTileDetails(tile);
        if (defined(upsampleTileDetails)) {
            surfaceTile.upsampledTerrain = new TileTerrain(upsampleTileDetails);
        }

        if (isDataAvailable(tile, terrainProvider)) {
            surfaceTile.loadedTerrain = new TileTerrain();
        }

        // Map imagery tiles to this terrain tile
        for (var i = 0, len = imageryLayerCollection.length; i < len; ++i) {
            var layer = imageryLayerCollection.get(i);
            if (layer.show) {
                layer._createTileImagerySkeletons(tile, terrainProvider);
            }
        }

        var ellipsoid = tile.tilingScheme.ellipsoid;

        // Compute tile rectangle boundaries for estimating the distance to the tile.
        var rectangle = tile.rectangle;

        ellipsoid.cartographicToCartesian(Rectangle.southwest(rectangle), surfaceTile.southwestCornerCartesian);
        ellipsoid.cartographicToCartesian(Rectangle.northeast(rectangle), surfaceTile.northeastCornerCartesian);

        // The middle latitude on the western edge.
        cartographicScratch.longitude = rectangle.west;
        cartographicScratch.latitude = (rectangle.south + rectangle.north) * 0.5;
        cartographicScratch.height = 0.0;
        var westernMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, westernMidpointScratch);

        // Compute the normal of the plane on the western edge of the tile.
        var westNormal = Cartesian3.cross(westernMidpointCartesian, Cartesian3.UNIT_Z, cartesian3Scratch);
        Cartesian3.normalize(westNormal, surfaceTile.westNormal);

        // The middle latitude on the eastern edge.
        cartographicScratch.longitude = rectangle.east;
        var easternMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, easternMidpointScratch);

        // Compute the normal of the plane on the eastern edge of the tile.
        var eastNormal = Cartesian3.cross(Cartesian3.UNIT_Z, easternMidpointCartesian, cartesian3Scratch);
        Cartesian3.normalize(eastNormal, surfaceTile.eastNormal);

        // Compute the normal of the plane bounding the southern edge of the tile.
        var southeastCornerNormal = ellipsoid.geodeticSurfaceNormalCartographic(Rectangle.southeast(rectangle), cartesian3Scratch2);
        var westVector = Cartesian3.subtract(westernMidpointCartesian, easternMidpointCartesian, cartesian3Scratch);
        var southNormal = Cartesian3.cross(southeastCornerNormal, westVector, cartesian3Scratch2);
        Cartesian3.normalize(southNormal, surfaceTile.southNormal);

        // Compute the normal of the plane bounding the northern edge of the tile.
        var northwestCornerNormal = ellipsoid.geodeticSurfaceNormalCartographic(Rectangle.northwest(rectangle), cartesian3Scratch2);
        var northNormal = Cartesian3.cross(westVector, northwestCornerNormal, cartesian3Scratch2);
        Cartesian3.normalize(northNormal, surfaceTile.northNormal);
    }

    function processTerrainStateMachine(tile, context, terrainProvider) {
        var surfaceTile = tile.data;
        var loaded = surfaceTile.loadedTerrain;
        var upsampled = surfaceTile.upsampledTerrain;
        var suspendUpsampling = false;

        if (defined(loaded)) {
            loaded.processLoadStateMachine(context, terrainProvider, tile.x, tile.y, tile.level);

            // Publish the terrain data on the tile as soon as it is available.
            // We'll potentially need it to upsample child tiles.
            if (loaded.state >= TerrainState.RECEIVED) {
                if (surfaceTile.terrainData !== loaded.data) {
                    surfaceTile.terrainData = loaded.data;

                    // If there's a water mask included in the terrain data, create a
                    // texture for it.
                    createWaterMaskTextureIfNeeded(context, surfaceTile);

                    propagateNewLoadedDataToChildren(tile);
                }
                suspendUpsampling = true;
            }

            if (loaded.state === TerrainState.READY) {
                loaded.publishToTile(tile);

                // No further loading or upsampling is necessary.
                surfaceTile.pickTerrain = defaultValue(surfaceTile.loadedTerrain, surfaceTile.upsampledTerrain);
                surfaceTile.loadedTerrain = undefined;
                surfaceTile.upsampledTerrain = undefined;
            } else if (loaded.state === TerrainState.FAILED) {
                // Loading failed for some reason, or data is simply not available,
                // so no need to continue trying to load.  Any retrying will happen before we
                // reach this point.
                surfaceTile.loadedTerrain = undefined;
            }
        }

        if (!suspendUpsampling && defined(upsampled)) {
            upsampled.processUpsampleStateMachine(context, terrainProvider, tile.x, tile.y, tile.level);

            // Publish the terrain data on the tile as soon as it is available.
            // We'll potentially need it to upsample child tiles.
            // It's safe to overwrite terrainData because we won't get here after
            // loaded terrain data has been received.
            if (upsampled.state >= TerrainState.RECEIVED) {
                if (surfaceTile.terrainData !== upsampled.data) {
                    surfaceTile.terrainData = upsampled.data;

                    // If the terrain provider has a water mask, "upsample" that as well
                    // by computing texture translation and scale.
                    if (terrainProvider.hasWaterMask) {
                        upsampleWaterMask(tile);
                    }

                    propagateNewUpsampledDataToChildren(tile);
                }
            }

            if (upsampled.state === TerrainState.READY) {
                upsampled.publishToTile(tile);

                // No further upsampling is necessary.  We need to continue loading, though.
                surfaceTile.pickTerrain = surfaceTile.upsampledTerrain;
                surfaceTile.upsampledTerrain = undefined;
            } else if (upsampled.state === TerrainState.FAILED) {
                // Upsampling failed for some reason.  This is pretty much a catastrophic failure,
                // but maybe we'll be saved by loading.
                surfaceTile.upsampledTerrain = undefined;
            }
        }
    }

    function getUpsampleTileDetails(tile) {
        // Find the nearest ancestor with loaded terrain.
        var sourceTile = tile.parent;
        while (defined(sourceTile) && defined(sourceTile.data) && !defined(sourceTile.data.terrainData)) {
            sourceTile = sourceTile.parent;
        }

        if (!defined(sourceTile) || !defined(sourceTile.data)) {
            // No ancestors have loaded terrain - try again later.
            return undefined;
        }

        return {
            data : sourceTile.data.terrainData,
            x : sourceTile.x,
            y : sourceTile.y,
            level : sourceTile.level
        };
    }

    function propagateNewUpsampledDataToChildren(tile) {
        var surfaceTile = tile.data;

        // Now that there's new data for this tile:
        //  - child tiles that were previously upsampled need to be re-upsampled based on the new data.

        // Generally this is only necessary when a child tile is upsampled, and then one
        // of its ancestors receives new (better) data and we want to re-upsample from the
        // new data.

        if (defined(tile._children)) {
            for (var childIndex = 0; childIndex < 4; ++childIndex) {
                var childTile = tile._children[childIndex];
                if (childTile.state !== QuadtreeTileLoadState.START) {
                    var childSurfaceTile = childTile.data;
                    if (defined(childSurfaceTile.terrainData) && !childSurfaceTile.terrainData.wasCreatedByUpsampling()) {
                        // Data for the child tile has already been loaded.
                        continue;
                    }

                    // Restart the upsampling process, no matter its current state.
                    // We create a new instance rather than just restarting the existing one
                    // because there could be an asynchronous operation pending on the existing one.
                    if (defined(childSurfaceTile.upsampledTerrain)) {
                        childSurfaceTile.upsampledTerrain.freeResources();
                    }
                    childSurfaceTile.upsampledTerrain = new TileTerrain({
                        data : surfaceTile.terrainData,
                        x : tile.x,
                        y : tile.y,
                        level : tile.level
                    });

                    childTile.state = QuadtreeTileLoadState.LOADING;
                }
            }
        }
    }

    function propagateNewLoadedDataToChildren(tile) {
        var surfaceTile = tile.data;

        // Now that there's new data for this tile:
        //  - child tiles that were previously upsampled need to be re-upsampled based on the new data.
        //  - child tiles that were previously deemed unavailable may now be available.

        if (defined(tile.children)) {
            for (var childIndex = 0; childIndex < 4; ++childIndex) {
                var childTile = tile.children[childIndex];
                if (childTile.state !== QuadtreeTileLoadState.START) {
                    var childSurfaceTile = childTile.data;
                    if (defined(childSurfaceTile.terrainData) && !childSurfaceTile.terrainData.wasCreatedByUpsampling()) {
                        // Data for the child tile has already been loaded.
                        continue;
                    }

                    // Restart the upsampling process, no matter its current state.
                    // We create a new instance rather than just restarting the existing one
                    // because there could be an asynchronous operation pending on the existing one.
                    if (defined(childSurfaceTile.upsampledTerrain)) {
                        childSurfaceTile.upsampledTerrain.freeResources();
                    }
                    childSurfaceTile.upsampledTerrain = new TileTerrain({
                        data : surfaceTile.terrainData,
                        x : tile.x,
                        y : tile.y,
                        level : tile.level
                    });

                    if (surfaceTile.terrainData.isChildAvailable(tile.x, tile.y, childTile.x, childTile.y)) {
                        // Data is available for the child now.  It might have been before, too.
                        if (!defined(childSurfaceTile.loadedTerrain)) {
                            // No load process is in progress, so start one.
                            childSurfaceTile.loadedTerrain = new TileTerrain();
                        }
                    }

                    childTile.state = QuadtreeTileLoadState.LOADING;
                }
            }
        }
    }

    function isDataAvailable(tile, terrainProvider) {
        var tileDataAvailable = terrainProvider.getTileDataAvailable(tile.x, tile.y, tile.level);
        if (defined(tileDataAvailable)) {
            return tileDataAvailable;
        }

        var parent = tile.parent;
        if (!defined(parent)) {
            // Data is assumed to be available for root tiles.
            return true;
        }

        if (!defined(parent.data) || !defined(parent.data.terrainData)) {
            // Parent tile data is not yet received or upsampled, so assume (for now) that this
            // child tile is not available.
            return false;
        }

        return parent.data.terrainData.isChildAvailable(parent.x, parent.y, tile.x, tile.y);
    }

    function getContextWaterMaskData(context) {
        var data = context.cache.tile_waterMaskData;

        if (!defined(data)) {
            var allWaterTexture = new Texture({
                context : context,
                pixelFormat : PixelFormat.LUMINANCE,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                source : {
                    arrayBufferView : new Uint8Array([255]),
                    width : 1,
                    height : 1
                }
            });
            allWaterTexture.referenceCount = 1;

            var sampler = new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.LINEAR,
                magnificationFilter : TextureMagnificationFilter.LINEAR
            });

            data = {
                allWaterTexture : allWaterTexture,
                sampler : sampler,
                destroy : function() {
                    this.allWaterTexture.destroy();
                }
            };

            context.cache.tile_waterMaskData = data;
        }

        return data;
    }

    function createWaterMaskTextureIfNeeded(context, surfaceTile) {
        var previousTexture = surfaceTile.waterMaskTexture;
        if (defined(previousTexture)) {
            --previousTexture.referenceCount;
            if (previousTexture.referenceCount === 0) {
                previousTexture.destroy();
            }
            surfaceTile.waterMaskTexture = undefined;
        }

        var waterMask = surfaceTile.terrainData.waterMask;
        if (!defined(waterMask)) {
            return;
        }

        var waterMaskData = getContextWaterMaskData(context);
        var texture;

        var waterMaskLength = waterMask.length;
        if (waterMaskLength === 1) {
            // Length 1 means the tile is entirely land or entirely water.
            // A value of 0 indicates entirely land, a value of 1 indicates entirely water.
            if (waterMask[0] !== 0) {
                texture = waterMaskData.allWaterTexture;
            } else {
                // Leave the texture undefined if the tile is entirely land.
                return;
            }
        } else {
            var textureSize = Math.sqrt(waterMaskLength);
            texture = new Texture({
                context : context,
                pixelFormat : PixelFormat.LUMINANCE,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                source : {
                    width : textureSize,
                    height : textureSize,
                    arrayBufferView : waterMask
                },
                sampler : waterMaskData.sampler
            });

            texture.referenceCount = 0;
        }

        ++texture.referenceCount;
        surfaceTile.waterMaskTexture = texture;

        Cartesian4.fromElements(0.0, 0.0, 1.0, 1.0, surfaceTile.waterMaskTranslationAndScale);
    }

    function upsampleWaterMask(tile) {
        var surfaceTile = tile.data;

        // Find the nearest ancestor with loaded terrain.
        var sourceTile = tile.parent;
        while (defined(sourceTile) && !defined(sourceTile.data.terrainData) || sourceTile.data.terrainData.wasCreatedByUpsampling()) {
            sourceTile = sourceTile.parent;
        }

        if (!defined(sourceTile) || !defined(sourceTile.data.waterMaskTexture)) {
            // No ancestors have a water mask texture - try again later.
            return;
        }

        surfaceTile.waterMaskTexture = sourceTile.data.waterMaskTexture;
        ++surfaceTile.waterMaskTexture.referenceCount;

        // Compute the water mask translation and scale
        var sourceTileRectangle = sourceTile.rectangle;
        var tileRectangle = tile.rectangle;
        var tileWidth = tileRectangle.width;
        var tileHeight = tileRectangle.height;

        var scaleX = tileWidth / sourceTileRectangle.width;
        var scaleY = tileHeight / sourceTileRectangle.height;
        surfaceTile.waterMaskTranslationAndScale.x = scaleX * (tileRectangle.west - sourceTileRectangle.west) / tileWidth;
        surfaceTile.waterMaskTranslationAndScale.y = scaleY * (tileRectangle.south - sourceTileRectangle.south) / tileHeight;
        surfaceTile.waterMaskTranslationAndScale.z = scaleX;
        surfaceTile.waterMaskTranslationAndScale.w = scaleY;
    }

    return GlobeSurfaceTile;
});
