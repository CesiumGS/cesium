define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/IndexDatatype',
        '../Core/IntersectionTests',
        '../Core/PixelFormat',
        '../Core/Request',
        '../Core/RequestState',
        '../Core/RequestType',
        '../Core/TileProviderError',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Renderer/VertexArray',
        './ImageryState',
        './QuadtreeTileLoadState',
        './SceneMode',
        './TerrainState',
        './TileBoundingRegion',
        '../ThirdParty/when'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        defined,
        defineProperties,
        DeveloperError,
        IndexDatatype,
        IntersectionTests,
        PixelFormat,
        Request,
        RequestState,
        RequestType,
        TileProviderError,
        Buffer,
        BufferUsage,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        VertexArray,
        ImageryState,
        QuadtreeTileLoadState,
        SceneMode,
        TerrainState,
        TileBoundingRegion,
        when) {
    'use strict';

    /**
     * Contains additional information about a {@link QuadtreeTile} of the globe's surface, and
     * encapsulates state transition logic for loading tiles.
     *
     * @constructor
     * @alias GlobeSurfaceTile
     * @private
     */
    function GlobeSurfaceTile() {
        /**
         * The {@link TileImagery} attached to this tile.
         * @type {TileImagery[]}
         * @default []
         */
        this.imagery = [];

        this.waterMaskTexture = undefined;
        this.waterMaskTranslationAndScale = new Cartesian4(0.0, 0.0, 1.0, 1.0);

        this.terrainData = undefined;
        this.vertexArray = undefined;
        this.orientedBoundingBox = undefined;
        this.boundingVolumeSourceTile = undefined;
        this._bvh = undefined;

        this.renderableTile = undefined;
        this.renderableTileSubset = new Cartesian4();

        /**
         * A bounding region used to estimate distance to the tile. The horizontal bounds are always tight-fitting,
         * but the `minimumHeight` and `maximumHeight` properties may be derived from the min/max of an ancestor tile
         * and be quite loose-fitting and thus very poor for estimating distance. The {@link TileBoundingRegion#boundingVolume}
         * and {@link TileBoundingRegion#boundingSphere} will always be undefined; tiles store these separately.
         * @type {TileBoundingRegion}
         */
        this.tileBoundingRegion = undefined;
        this.occludeePointInScaledSpace = new Cartesian3();

        this.terrainState = TerrainState.UNLOADED;
        this.mesh = undefined;
        this.vertexArray = undefined;

        // TODO: probably better to have a bounding sphere for 2D rather than one for picking.
        this.pickBoundingSphere = new BoundingSphere();

        this.surfaceShader = undefined;
        this.isClipped = true;

        this.childTileMask = undefined;
    }

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
                var terrainState = this.terrainState;
                var loadingIsTransitioning = terrainState === TerrainState.RECEIVING || terrainState === TerrainState.TRANSFORMING;

                var shouldRemoveTile = !loadingIsTransitioning;

                var imagery = this.imagery;
                for (var i = 0, len = imagery.length; shouldRemoveTile && i < len; ++i) {
                    var tileImagery = imagery[i];
                    shouldRemoveTile = !defined(tileImagery.loadingImagery) || tileImagery.loadingImagery.state !== ImageryState.TRANSITIONING;
                }

                return shouldRemoveTile;
            }
        }
    });

    GlobeSurfaceTile.prototype.getBvh = function(tile, terrainProvider) {
        if (this._bvh === undefined) {
            var terrainData = this.terrainData;
            if (terrainData !== undefined && terrainData.bvh !== undefined) {
                this._bvh = terrainData.bvh;
            }

            var parent = tile.parent;
            if (parent !== undefined && parent.data !== undefined) {
                var parentBvh = parent.data.getBvh(parent, terrainProvider);
                if (parentBvh !== undefined && parentBvh.length > 2) {
                    var subsetLength = (parentBvh.length - 2) / 4;
                    var childIndex = (tile.y === parent.y * 2 ? 2 : 0) + (tile.x === parent.x * 2 ? 0 : 1);
                    var start = 2 + subsetLength * childIndex;
                    this._bvh = parentBvh.subarray(start, start + subsetLength);
                }
            }
        }

        return this._bvh;
};

    function getPosition(encoding, mode, projection, vertices, index, result) {
        encoding.decodePosition(vertices, index, result);

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
        var mesh = this.mesh;
        if (!defined(mesh)) {
            return undefined;
        }

        var vertices = mesh.vertices;
        var indices = mesh.indices;
        var encoding = mesh.encoding;

        var length = indices.length;
        for (var i = 0; i < length; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            var v0 = getPosition(encoding, mode, projection, vertices, i0, scratchV0);
            var v1 = getPosition(encoding, mode, projection, vertices, i1, scratchV1);
            var v2 = getPosition(encoding, mode, projection, vertices, i2, scratchV2);

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

        this.terrainState = TerrainState.UNLOADED;
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

    // var renderedJson = [{"level":18,"x":87944,"y":76105},{"level":18,"x":87945,"y":76105},{"level":19,"x":175890,"y":152209},{"level":19,"x":175891,"y":152209},{"level":19,"x":175892,"y":152210},{"level":19,"x":175892,"y":152208},{"level":18,"x":87947,"y":76104},{"level":18,"x":87948,"y":76103},{"level":18,"x":87949,"y":76102},{"level":17,"x":43975,"y":38051},{"level":17,"x":43975,"y":38050},{"level":16,"x":21991,"y":19026},{"level":16,"x":21991,"y":19027},{"level":16,"x":21989,"y":19025},{"level":17,"x":43977,"y":38049},{"level":16,"x":21989,"y":19024},{"level":16,"x":21990,"y":19025},{"level":16,"x":21991,"y":19025},{"level":16,"x":21990,"y":19024},{"level":16,"x":21991,"y":19024},{"level":16,"x":21991,"y":19028},{"level":16,"x":21991,"y":19029},{"level":16,"x":21991,"y":19030},{"level":16,"x":21992,"y":19026},{"level":16,"x":21992,"y":19027},{"level":16,"x":21993,"y":19026},{"level":16,"x":21993,"y":19027},{"level":15,"x":10997,"y":9513},{"level":15,"x":10996,"y":9512},{"level":15,"x":10997,"y":9512},{"level":16,"x":21992,"y":19028},{"level":16,"x":21992,"y":19029},{"level":16,"x":21993,"y":19028},{"level":16,"x":21993,"y":19029},{"level":15,"x":10996,"y":9515},{"level":15,"x":10997,"y":9514},{"level":15,"x":10997,"y":9515},{"level":15,"x":10998,"y":9513},{"level":15,"x":10999,"y":9513},{"level":15,"x":10998,"y":9512},{"level":15,"x":10999,"y":9512},{"level":15,"x":10998,"y":9514},{"level":15,"x":10998,"y":9515},{"level":15,"x":10999,"y":9514},{"level":15,"x":10999,"y":9515},{"level":15,"x":10998,"y":9516},{"level":15,"x":10999,"y":9516},{"level":14,"x":5500,"y":4756},{"level":14,"x":5500,"y":4757},{"level":14,"x":5501,"y":4756},{"level":14,"x":5501,"y":4757},{"level":14,"x":5500,"y":4758},{"level":14,"x":5501,"y":4758},{"level":14,"x":5501,"y":4759},{"level":14,"x":5502,"y":4756},{"level":14,"x":5502,"y":4757},{"level":14,"x":5503,"y":4756},{"level":14,"x":5503,"y":4757},{"level":14,"x":5502,"y":4758},{"level":14,"x":5502,"y":4759},{"level":14,"x":5503,"y":4758},{"level":14,"x":5503,"y":4759},{"level":16,"x":21991,"y":19023},{"level":16,"x":21993,"y":19023},{"level":16,"x":21993,"y":19022},{"level":15,"x":10997,"y":9511},{"level":15,"x":10998,"y":9511},{"level":15,"x":10999,"y":9511},{"level":15,"x":10998,"y":9510},{"level":15,"x":10999,"y":9510},{"level":14,"x":5500,"y":4755},{"level":14,"x":5501,"y":4755},{"level":14,"x":5500,"y":4754},{"level":14,"x":5501,"y":4754},{"level":14,"x":5502,"y":4755},{"level":14,"x":5503,"y":4755},{"level":14,"x":5502,"y":4754},{"level":14,"x":5503,"y":4754},{"level":14,"x":5503,"y":4753},{"level":13,"x":2751,"y":2380},{"level":13,"x":2752,"y":2378},{"level":13,"x":2752,"y":2379},{"level":13,"x":2753,"y":2378},{"level":13,"x":2753,"y":2379},{"level":13,"x":2754,"y":2378},{"level":13,"x":2754,"y":2379},{"level":13,"x":2755,"y":2378},{"level":13,"x":2755,"y":2379},{"level":13,"x":2752,"y":2377},{"level":13,"x":2753,"y":2377},{"level":13,"x":2752,"y":2376},{"level":13,"x":2753,"y":2376},{"level":13,"x":2754,"y":2377},{"level":13,"x":2755,"y":2377},{"level":13,"x":2754,"y":2376},{"level":13,"x":2752,"y":2380},{"level":13,"x":2753,"y":2380},{"level":13,"x":2753,"y":2381},{"level":12,"x":1377,"y":1190},{"level":12,"x":1377,"y":1191},{"level":12,"x":1378,"y":1189},{"level":12,"x":1379,"y":1189},{"level":12,"x":1378,"y":1188},{"level":12,"x":1379,"y":1188},{"level":12,"x":1378,"y":1190},{"level":12,"x":1378,"y":1191},{"level":12,"x":1379,"y":1190},{"level":11,"x":690,"y":594},{"level":11,"x":690,"y":595},{"level":11,"x":691,"y":594},{"level":11,"x":691,"y":595},{"level":12,"x":1377,"y":1187},{"level":12,"x":1379,"y":1187},{"level":12,"x":1379,"y":1186},{"level":11,"x":690,"y":593},{"level":11,"x":691,"y":593},{"level":11,"x":691,"y":592},{"level":11,"x":689,"y":596},{"level":11,"x":690,"y":596},{"level":11,"x":691,"y":596},{"level":11,"x":691,"y":597},{"level":10,"x":346,"y":297},{"level":10,"x":347,"y":297},{"level":10,"x":346,"y":296},{"level":10,"x":347,"y":296},{"level":10,"x":346,"y":298},{"level":10,"x":346,"y":299},{"level":10,"x":347,"y":298},{"level":10,"x":347,"y":299},{"level":9,"x":174,"y":148},{"level":9,"x":174,"y":149},{"level":9,"x":175,"y":148},{"level":9,"x":175,"y":149},{"level":9,"x":174,"y":150},{"level":9,"x":175,"y":150},{"level":10,"x":346,"y":295},{"level":10,"x":347,"y":295},{"level":9,"x":174,"y":147},{"level":9,"x":175,"y":147}];
    // var expectedTiles = {};
    // var unexpectedTiles = {};

    // function tileID(level, x, y) {
    //     return `L${level}X${x}Y${y}`;
    // }
    // renderedJson.forEach(tile => {
    //     while (tile.level >= 0) {
    //         expectedTiles[tileID(tile.level, tile.x, tile.y)] = true;
    //         --tile.level;
    //         tile.x >>= 1;
    //         tile.y >>= 1;
    //     }
    // });

    GlobeSurfaceTile.processStateMachine = function(tile, frameState, terrainProvider, imageryLayerCollection, vertexArraysToDestroy, terrainOnly) {
        var surfaceTile = tile.data;
        if (!defined(surfaceTile)) {
            surfaceTile = tile.data = new GlobeSurfaceTile();
        }

        if (tile.state === QuadtreeTileLoadState.START) {
            prepareNewTile(tile, terrainProvider, imageryLayerCollection);
            tile.state = QuadtreeTileLoadState.LOADING;
        }

        if (surfaceTile.boundingVolumeSourceTile !== tile && terrainProvider.getNearestBvhLevel !== undefined) {
            // So here we are loading this tile, but we know our bounding volume isn't very good, and so our
            // judgement that it's visible is kind of suspect. If this terrain source has bounding volume data
            // outside of individual tiles, let's get our hands on that before we waste time downloading
            // potentially not-actually-visible tiles like this one.
            var bvhLevel = terrainProvider.getNearestBvhLevel(tile.x, tile.y, tile.level);
            if (bvhLevel !== -1 && bvhLevel !== tile.level) {
                var ancestor = tile.parent;
                while (ancestor.level !== bvhLevel) {
                    ancestor = ancestor.parent;
                }

                if (ancestor.data === undefined || ancestor.data.terrainData === undefined) {
                    // The ancestor that holds the BVH data isn't loaded yet; load it (terrain only!) instead of this tile.
                    GlobeSurfaceTile.processStateMachine(ancestor, frameState, terrainProvider, imageryLayerCollection, vertexArraysToDestroy, true);
                    return;

                }
            }
        }

        if (tile.state === QuadtreeTileLoadState.LOADING) {
            processTerrainStateMachine(tile, frameState, terrainProvider, imageryLayerCollection, vertexArraysToDestroy);
        }

        // From here down we're loading imagery, not terrain. We don't want to load imagery until
        // we're certain that the terrain tiles are actually visible, though. So if our bounding
        // volume isn't accurate, stop here. Also stop here if we're explicitly loading terrain
        // only, which happens in these two scenarios:
        //   * we want ancestor BVH data from this tile but don't plan to render it (see code above).
        //   * we want to upsample from this tile but don't plan to render it (see processTerrainStateMachine).
        if (terrainOnly || (tile.level !== 0 && tile.data.boundingVolumeSourceTile !== tile)) {
            return;
        }

        // var id = tileID(tile.level, tile.x, tile.y);
        // if (!expectedTiles[id]) {
        //     if (!unexpectedTiles[id]) {
        //         unexpectedTiles[id] = true;
        //         console.log('Unexpected: ' + id);
        //     }
        // }

        // The terrain is renderable as soon as we have a valid vertex array.
        var isRenderable = defined(surfaceTile.vertexArray);

        // But it's not done loading until our two state machines are terminated.
        var isDoneLoading = surfaceTile.terrainState === TerrainState.READY;

        // If this tile's terrain and imagery are just upsampled from its parent, mark the tile as
        // upsampled only.  We won't refine a tile if its four children are upsampled only.
        var isUpsampledOnly = defined(surfaceTile.terrainData) && surfaceTile.terrainData.wasCreatedByUpsampling();

        // Transition imagery states
        var tileImageryCollection = surfaceTile.imagery;
        var i, len;
        for (i = 0, len = tileImageryCollection.length; i < len; ++i) {
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

            var thisTileDoneLoading = tileImagery.processStateMachine(tile, frameState);
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
                var callbacks = tile._loadedCallbacks;
                var newCallbacks = {};
                for(var layerId in callbacks) {
                    if (callbacks.hasOwnProperty(layerId)) {
                        if(!callbacks[layerId](tile)) {
                            newCallbacks[layerId] = callbacks[layerId];
                        }
                    }
                }
                tile._loadedCallbacks = newCallbacks;

                tile.state = QuadtreeTileLoadState.DONE;
            }
        }
    };

    /**
     * Determines if a given child tile is available.  The given child tile coordinates are assumed
     * to be one of the four children of this tile.  If non-child tile coordinates are
     * given, the availability of the southeast child tile is returned. This function determines
     * the presence of child tiles from `terrainProvider.availability` or from `this.terrainData.childTileMask`.
     *
     * @param {TerrainProvider} terrainProvider The terrain provider.
     * @param {QuatreeTile} tile The parent tile.
     * @param {Number} childX The tile X coordinate of the child tile to check for availability.
     * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
     * @returns {Boolean|undefined} True if the child tile is available; otherwise, false. If tile availability
     *          cannot be determined, this function returns undefined.
     */
    GlobeSurfaceTile.prototype.isChildAvailable = function(terrainProvider, tile, childX, childY) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(terrainProvider)) {
            throw new DeveloperError('terrainProvider is required.');
        }
        if (!defined(tile)) {
            throw new DeveloperError('tile is required.');
        }
        if (!defined(childX)) {
            throw new DeveloperError('childX is required.');
        }
        if (!defined(childY)) {
            throw new DeveloperError('childY is required.');
        }
        //>>includeEnd('debug');

        if (this.childTileMask === undefined) {
            if (terrainProvider.availability !== undefined) {
                this.childTileMask = terrainProvider.availability.computeChildMaskForTile(tile.level, tile.x, tile.y);
            } else if (this.terrainData !== undefined && this.terrainData.childTileMask !== undefined) {
                this.childTileMask = this.terrainData.childTileMask;
            } else {
                // No idea if children exist or not.
                return undefined;
            }
        }

        var bitNumber = 2; // northwest child
        if (childX !== tile.x * 2) {
            ++bitNumber; // east child
        }
        if (childY !== tile.y * 2) {
            bitNumber -= 2; // south child
        }

        return (this.childTileMask & (1 << bitNumber)) !== 0;
    };

    function prepareNewTile(tile, terrainProvider, imageryLayerCollection) {
        var surfaceTile = tile.data;

        var parent = tile.parent;
        if (parent !== undefined && !parent.data.isChildAvailable(parent.x, parent.y, tile.x, tile.y)) {
            // Start upsampling right away.
            surfaceTile.terrainState = TerrainState.FAILED;
        }

        // Map imagery tiles to this terrain tile
        for (var i = 0, len = imageryLayerCollection.length; i < len; ++i) {
            var layer = imageryLayerCollection.get(i);
            if (layer.show) {
                layer._createTileImagerySkeletons(tile, terrainProvider);
            }
        }
    }

    // var startTime;
    // var stopTime;

    function processTerrainStateMachine(tile, frameState, terrainProvider, imageryLayerCollection, vertexArraysToDestroy) {
        var surfaceTile = tile.data;

        // If this tile is FAILED, we'll need to upsample from the parent. If the parent isn't
        // ready for that, let's push it along.
        var parent = tile.parent;
        if (surfaceTile.terrainState === TerrainState.FAILED && parent !== undefined) {
            var parentReady = parent.data !== undefined && parent.data.terrainData !== undefined && parent.data.terrainData._mesh !== undefined;
            if (!parentReady) {
                //console.log('Waiting on L' + parent.level + 'X' + parent.x + 'Y' + parent.y);
                GlobeSurfaceTile.processStateMachine(parent, frameState, terrainProvider, imageryLayerCollection, vertexArraysToDestroy, true);
            }
        }

        if (surfaceTile.terrainState === TerrainState.FAILED) {
            upsample(surfaceTile, tile, frameState, terrainProvider, tile.x, tile.y, tile.level);
        }

        if (surfaceTile.terrainState === TerrainState.UNLOADED) {
            requestTileGeometry(surfaceTile, terrainProvider, tile.x, tile.y, tile.level);
        }

        if (surfaceTile.terrainState === TerrainState.RECEIVED) {
            transform(surfaceTile, frameState, terrainProvider, tile.x, tile.y, tile.level);
        }

        if (surfaceTile.terrainState === TerrainState.TRANSFORMED) {
            createResources(surfaceTile, frameState.context, terrainProvider, tile.x, tile.y, tile.level);
        }

        if (surfaceTile.terrainState >= TerrainState.RECEIVED && surfaceTile.waterMaskTexture === undefined && terrainProvider.hasWaterMask) {
            var terrainData = surfaceTile.terrainData;
            if (terrainData.waterMask !== undefined) {
                createWaterMaskTextureIfNeeded(frameState.context, surfaceTile);
            } else {
                upsampleWaterMask(tile);
            }
        }
    }

    function upsample(surfaceTile, tile, frameState, terrainProvider, x, y, level) {
        var parent = tile.parent;
        if (!parent) {
            // Trying to upsample from a root tile. No can do.
            return;
        }

        var sourceData = parent.data.terrainData;
        var sourceX = parent.x;
        var sourceY = parent.y;
        var sourceLevel = parent.level;

        if (sourceData === undefined || sourceData._mesh === undefined) {
            // Parent is not available, so we can't upsample this tile yet.
            return;
        }

        var terrainDataPromise = sourceData.upsample(terrainProvider.tilingScheme, sourceX, sourceY, sourceLevel, x, y, level);
        if (!defined(terrainDataPromise)) {
            // The upsample request has been deferred - try again later.
            return;
        }

        surfaceTile.terrainState = TerrainState.RECEIVING;

        when(terrainDataPromise, function(terrainData) {
            surfaceTile.terrainData = terrainData;
            surfaceTile.terrainState = TerrainState.RECEIVED;
        }, function() {
            surfaceTile.terrainState = TerrainState.FAILED;
        });
    }

    function requestTileGeometry(surfaceTile, terrainProvider, x, y, level) {
        function success(terrainData) {
            surfaceTile.terrainData = terrainData;
            surfaceTile.terrainState = TerrainState.RECEIVED;
            surfaceTile.request = undefined;
        }

        function failure() {
            if (surfaceTile.request.state === RequestState.CANCELLED) {
                // Cancelled due to low priority - try again later.
                surfaceTile.terrainData = undefined;
                surfaceTile.terrainState = TerrainState.UNLOADED;
                surfaceTile.request = undefined;
                return;
            }

            // Initially assume failure.  handleError may retry, in which case the state will
            // change to RECEIVING or UNLOADED.
            surfaceTile.terrainState = TerrainState.FAILED;
            surfaceTile.request = undefined;

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
            var request = new Request({
                throttle : false,
                throttleByServer : true,
                type : RequestType.TERRAIN
            });
            surfaceTile.request = request;
            var requestPromise = terrainProvider.requestTileGeometry(x, y, level, request);

            // If the request method returns undefined (instead of a promise), the request
            // has been deferred.
            if (defined(requestPromise)) {
                surfaceTile.terrainState = TerrainState.RECEIVING;
                when(requestPromise, success, failure);
            } else {
                // Deferred - try again later.
                surfaceTile.terrainState = TerrainState.UNLOADED;
                surfaceTile.request = undefined;
            }
        }

        doRequest();
    }

    function transform(surfaceTile, frameState, terrainProvider, x, y, level) {
        var tilingScheme = terrainProvider.tilingScheme;

        var terrainData = surfaceTile.terrainData;
        var meshPromise = terrainData.createMesh(tilingScheme, x, y, level, frameState.terrainExaggeration);

        if (!defined(meshPromise)) {
            // Postponed.
            return;
        }

        surfaceTile.terrainState = TerrainState.TRANSFORMING;

        when(meshPromise, function(mesh) {
            surfaceTile.mesh = mesh;
            surfaceTile.terrainState = TerrainState.TRANSFORMED;
        }, function() {
            surfaceTile.terrainState = TerrainState.FAILED;
        });
    }

    function createResources(surfaceTile, context, terrainProvider, x, y, level) {
        var mesh = surfaceTile.mesh;

        var typedArray = mesh.vertices;
        var buffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : typedArray,
            usage : BufferUsage.STATIC_DRAW
        });
        var attributes = mesh.encoding.getAttributes(buffer);

        var indexBuffers = mesh.indices.indexBuffers || {};
        var indexBuffer = indexBuffers[context.id];
        if (!defined(indexBuffer) || indexBuffer.isDestroyed()) {
            var indices = mesh.indices;
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
            surfaceTile.mesh.indices.indexBuffers = indexBuffers;
        } else {
            ++indexBuffer.referenceCount;
        }

        surfaceTile.vertexArray = new VertexArray({
            context : context,
            attributes : attributes,
            indexBuffer : indexBuffer
        });

        surfaceTile.terrainState = TerrainState.READY;
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
                sampler : waterMaskData.sampler,
                flipY : false
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
