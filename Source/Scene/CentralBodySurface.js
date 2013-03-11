/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/BoundingSphere',
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/CubeMapEllipsoidTessellator',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/EllipsoidalOccluder',
        '../Core/Intersect',
        '../Core/Matrix4',
        '../Core/MeshFilters',
        '../Core/Occluder',
        '../Core/PrimitiveType',
        '../Core/Queue',
        '../Core/TaskProcessor',
        '../Core/WebMercatorProjection',
        '../Renderer/DrawCommand',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './ImageryLayer',
        './ImageryState',
        './SceneMode',
        './TerrainProvider',
        './TerrainState',
        './TileLoadQueue',
        './TileReplacementQueue',
        './TileState',
        './TileTerrain',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        destroyObject,
        BoundingSphere,
        BoundingRectangle,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        CubeMapEllipsoidTessellator,
        DeveloperError,
        Ellipsoid,
        EllipsoidalOccluder,
        Intersect,
        Matrix4,
        MeshFilters,
        Occluder,
        PrimitiveType,
        Queue,
        TaskProcessor,
        WebMercatorProjection,
        DrawCommand,
        PixelDatatype,
        PixelFormat,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        ImageryLayer,
        ImageryState,
        SceneMode,
        TerrainProvider,
        TerrainState,
        TileLoadQueue,
        TileReplacementQueue,
        TileState,
        TileTerrain,
        when) {
    "use strict";

    /**
     * Manages and renders the terrain and imagery on the surface of a {@link CentralBody}.
     * This class should be considered an implementation detail of {@link CentralBody} and not
     * used directly.
     *
     * @alias CentralBodySurface
     * @constructor
     * @private
     */
    var CentralBodySurface = function(description) {
        if (typeof description.terrainProvider === 'undefined') {
            throw new DeveloperError('description.terrainProvider is required.');
        }
        if (typeof description.imageryLayerCollection === 'undefined') {
            throw new DeveloperError('description.imageryLayerCollection is required.');
        }

        this._terrainProvider = description.terrainProvider;
        this._imageryLayerCollection = description.imageryLayerCollection;
        this._maxScreenSpaceError = defaultValue(description.maxScreenSpaceError, 2);

        this._imageryLayerCollection.layerAdded.addEventListener(CentralBodySurface.prototype._onLayerAdded, this);
        this._imageryLayerCollection.layerRemoved.addEventListener(CentralBodySurface.prototype._onLayerRemoved, this);
        this._imageryLayerCollection.layerMoved.addEventListener(CentralBodySurface.prototype._onLayerMoved, this);
        this._imageryLayerCollection.layerShownOrHidden.addEventListener(CentralBodySurface.prototype._onLayerShownOrHidden, this);

        var terrainTilingScheme = this._terrainProvider.getTilingScheme();
        this._levelZeroTiles = undefined;

        this._tilesToRenderByTextureCount = [];
        this._tileCommands = [];
        this._tileCommandUniformMaps = [];
        this._tileTraversalQueue = new Queue();
        this._tileLoadQueue = new TileLoadQueue();
        this._tileReplacementQueue = new TileReplacementQueue();
        this._tileCacheSize = 100;

        // The number of milliseconds each frame to allow for processing the tile load queue.
        // At least one tile will be processed per frame (assuming that any need processing),
        // even if this value is 0.
        this._loadQueueTimeSlice = 5;

        var ellipsoid = terrainTilingScheme.getEllipsoid();
        this._ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid, Cartesian3.ZERO);

        this._debug = {
            enableDebugOutput : false,
            boundingSphereTile : undefined,
            boundingSphereVA : undefined,

            maxDepth : 0,
            tilesVisited : 0,
            tilesCulled : 0,
            tilesRendered : 0,
            texturesRendered : 0,
            tilesWaitingForChildren : 0,

            lastMaxDepth : -1,
            lastTilesVisited : -1,
            lastTilesCulled : -1,
            lastTilesRendered : -1,
            lastTexturesRendered : -1,
            lastTilesWaitingForChildren : -1,

            suspendLodUpdate : false
        };
    };

    CentralBodySurface.prototype.update = function(context, frameState, colorCommandList, centralBodyUniformMap, shaderSet, renderState, mode, projection) {
        updateLayers(this);
        selectTilesForRendering(this, context, frameState);
        processTileLoadQueue(this, context, frameState);
        createRenderCommandsForSelectedTiles(this, context, frameState, shaderSet, mode, projection, centralBodyUniformMap, colorCommandList, renderState);
        debugCreateRenderCommandsForTileBoundingSphere(this, context, frameState, centralBodyUniformMap, shaderSet, renderState, colorCommandList);
    };

    CentralBodySurface.prototype.getTerrainProvider = function() {
        return this._terrainProvider;
    };

    CentralBodySurface.prototype.setTerrainProvider = function(terrainProvider) {
        if (this._terrainProvider === terrainProvider) {
            return;
        }

        if (typeof terrainProvider === 'undefined') {
            throw new DeveloperError('terrainProvider is required.');
        }

        this._terrainProvider = terrainProvider;

        // Clear the replacement queue
        var replacementQueue = this._tileReplacementQueue;
        replacementQueue.head = undefined;
        replacementQueue.tail = undefined;
        replacementQueue.count = 0;

        // Free and recreate the level zero tiles.
        var levelZeroTiles = this._levelZeroTiles;
        if (typeof levelZeroTiles !== 'undefined') {
            for (var i = 0; i < levelZeroTiles.length; ++i) {
                levelZeroTiles[i].freeResources();
            }
        }

        this._levelZeroTiles = undefined;
    };

    CentralBodySurface.prototype._onLayerAdded = function(layer, index) {
        if (typeof this._levelZeroTiles === 'undefined') {
            return;
        }

        function insertUndefined(array, index) {
            if (index >= array.length) {
                array[index] = undefined;
            } else {
                array.splice(index, 0, null);
                array[index] = undefined;
            }
        }

        // create TileImagerys for this layer for all previously loaded tiles
        var tile = this._tileReplacementQueue.head;
        while (typeof tile !== 'undefined') {
            insertUndefined(tile.imagery, index);
            insertUndefined(tile.textures, index);
            insertUndefined(tile.inheritedTextures, index);
            insertUndefined(tile.inheritedTextureTranslationAndScale, index);

            tile.state = TileState.LOADING;

            if (layer.show) {
                layer._createTileImagerySkeletons(tile, this._terrainProvider);
            }

            tile = tile.replacementNext;
        }
    };

    CentralBodySurface.prototype._onLayerRemoved = function(layer, index) {
        if (typeof this._levelZeroTiles === 'undefined') {
            return;
        }

        // destroy TileImagerys for this layer for all previously loaded tiles
        var tile = this._tileReplacementQueue.head;
        while (typeof tile !== 'undefined') {
            var tileImageryCollection = tile.imagery;
            var layerTileImageryCollection = tileImageryCollection[index];

            if (typeof layerTileImageryCollection !== 'undefined') {
                for (var i = 0, len = layerTileImageryCollection.length; i < len; ++i) {
                    var tileImagery = layerTileImageryCollection[i];
                    tileImagery.freeResources();
                }
            }

            tile.imagery.splice(index, 1);

            if (typeof tile.textures[index] !== 'undefined') {
                tile.textures[index].destroy();
            }
            tile.textures.splice(index, 1);
            tile.inheritedTextures.splice(index, 1);
            tile.inheritedTextureTranslationAndScale.splice(index, 1);

            // If the base layer has been removed, mark the tile as non-renderable.
            if (layer.isBaseLayer()) {
                tile.isRenderable = false;
            }

            tile.state = TileState.LOADING;

            tile = tile.replacementNext;
        }
    };

    CentralBodySurface.prototype._onLayerMoved = function(layer, newIndex, oldIndex) {
        if (typeof this._levelZeroTiles === 'undefined') {
            return;
        }

        function moveArrayItem(array, newIndex, oldIndex) {
            var item = array[oldIndex];
            array.splice(oldIndex, 1);
            if (newIndex > array.length) {
                array[newIndex] = item;
            } else {
                array.splice(newIndex, 0, item);
            }
        }

        // Move the layer for all previously loaded tiles.
        var tile = this._tileReplacementQueue.head;
        while (typeof tile !== 'undefined') {
            moveArrayItem(tile.imagery, newIndex, oldIndex);
            moveArrayItem(tile.textures, newIndex, oldIndex);
            moveArrayItem(tile.inheritedTextures, newIndex, oldIndex);
            moveArrayItem(tile.inheritedTextureTranslationAndScale, newIndex, oldIndex);

            tile = tile.replacementNext;
        }
    };

    CentralBodySurface.prototype._onLayerShownOrHidden = function(layer, index, show) {
        if (typeof this._levelZeroTiles === 'undefined') {
            return;
        }

        var tile = this._tileReplacementQueue.head;
        while (typeof tile !== 'undefined') {
            if (show) {
                if (layer._createTileImagerySkeletons(tile, this._terrainProvider)) {
                    tile.state = TileState.LOADING;
                }
            } else {
                var layerImagery = tile.imagery[index];
                if (typeof layerImagery !== 'undefined') {
                    for (var i = 0, len = layerImagery.length; i < len; ++i) {
                        var tileImagery = layerImagery[i];
                        if (typeof tileImagery !== 'undefined') {
                            tileImagery.freeResources();
                        }
                    }
                    tile.imagery[index] = undefined;
                }

                if (typeof tile.textures[index] !== 'undefined') {
                    tile.textures[index].destroy();
                }
                tile.textures[index] = undefined;
                tile.inheritedTextures[index] = undefined;
                tile.inheritedTextureTranslationAndScale[index] = undefined;
            }

            tile = tile.replacementNext;
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof CentralBodySurface
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see CentralBodySurface#destroy
     */
    CentralBodySurface.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CentralBodySurface
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CentralBodySurface#isDestroyed
     */
    CentralBodySurface.prototype.destroy = function() {
        var levelZeroTiles = this._levelZeroTiles;
        if (typeof levelZeroTiles !== 'undefined') {
            for (var i = 0; i < levelZeroTiles.length; ++i) {
                levelZeroTiles[i].freeResources();
            }
        }

        this._imageryLayerCollection.destroy();

        var debug = this._debug;
        if (typeof debug !== 'undefined') {
            if (typeof debug.boundingSphereVA !== 'undefined') {
                debug.boundingSphereVA.destroy();
            }
        }

        return destroyObject(this);
    };

    function sortTileImageryByLayerIndex(a, b) {
        return a.imagery.imageryLayer._layerIndex - b.imagery.imageryLayer._layerIndex;
    }

    function updateLayers(surface) {
        surface._imageryLayerCollection._update();
    }

    function selectTilesForRendering(surface, context, frameState) {
        var debug = surface._debug;

        if (debug.suspendLodUpdate) {
            return;
        }

        var i, len;

        // Clear the render list.
        var tilesToRenderByTextureCount = surface._tilesToRenderByTextureCount;
        for (i = 0, len = tilesToRenderByTextureCount.length; i < len; ++i) {
            var tiles = tilesToRenderByTextureCount[i];
            if (typeof tiles !== 'undefined') {
                tiles.length = 0;
            }
        }

        var traversalQueue = surface._tileTraversalQueue;
        traversalQueue.clear();

        debug.maxDepth = 0;
        debug.tilesVisited = 0;
        debug.tilesCulled = 0;
        debug.tilesRendered = 0;
        debug.texturesRendered = 0;
        debug.tilesWaitingForChildren = 0;

        surface._tileLoadQueue.clear();
        surface._tileLoadQueue.markInsertionPoint();
        surface._tileReplacementQueue.markStartOfRenderFrame();

        // We can't render anything before the level zero tiles exist.
        if (typeof surface._levelZeroTiles === 'undefined') {
            if (surface._terrainProvider.isReady()) {
                var terrainTilingScheme = surface._terrainProvider.getTilingScheme();
                surface._levelZeroTiles = terrainTilingScheme.createLevelZeroTiles();
            } else {
                // Nothing to do until the terrain provider is ready.
                return;
            }
        }

        var cameraPosition = frameState.camera.getPositionWC();

        var ellipsoid = surface._terrainProvider.getTilingScheme().getEllipsoid();
        var cameraPositionCartographic = ellipsoid.cartesianToCartographic(cameraPosition);

        surface._ellipsoidalOccluder.setCameraPosition(cameraPosition);

        var tile;

        // Enqueue the root tiles that are renderable and visible.
        var levelZeroTiles = surface._levelZeroTiles;
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            tile = levelZeroTiles[i];
            surface._tileReplacementQueue.markTileRendered(tile);
            if (tile.state !== TileState.READY) {
                queueTileLoad(surface, tile);
            }
            if (tile.isRenderable && isTileVisible(surface, frameState, tile)) {
                traversalQueue.enqueue(tile);
            } else {
                ++debug.tilesCulled;
                if (!tile.isRenderable) {
                    ++debug.tilesWaitingForChildren;
                }
            }
        }

        // Traverse the tiles in breadth-first order.
        // This ordering allows us to load bigger, lower-detail tiles before smaller, higher-detail ones.
        // This maximizes the average detail across the scene and results in fewer sharp transitions
        // between very different LODs.
        while (typeof (tile = traversalQueue.dequeue()) !== 'undefined') {
            ++debug.tilesVisited;

            surface._tileReplacementQueue.markTileRendered(tile);

            if (tile.level > debug.maxDepth) {
                debug.maxDepth = tile.level;
            }

            // There are a few different algorithms we could use here.
            // This one doesn't load children unless we refine to them.
            // We may want to revisit this in the future.

            if (screenSpaceError(surface, context, frameState, cameraPosition, cameraPositionCartographic, tile) < surface._maxScreenSpaceError) {
                // This tile meets SSE requirements, so render it.
                addTileToRenderList(surface, tile);
            } else if (queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, frameState, tile)) {
                // SSE is not good enough and children are loaded, so refine.
                var children = tile.children;
                // PERFORMANCE_IDEA: traverse children front-to-back so we can avoid sorting by distance later.
                for (i = 0, len = children.length; i < len; ++i) {
                    if (isTileVisible(surface, frameState, children[i])) {
                        traversalQueue.enqueue(children[i]);
                    } else {
                        ++debug.tilesCulled;
                    }
                }
            } else {
                ++debug.tilesWaitingForChildren;
                // SSE is not good enough but not all children are loaded, so render this tile anyway.
                addTileToRenderList(surface, tile);
            }
        }

        if (debug.enableDebugOutput) {
            if (debug.tilesVisited !== debug.lastTilesVisited ||
                debug.tilesRendered !== debug.lastTilesRendered ||
                debug.texturesRendered !== debug.lastTexturesRendered ||
                debug.tilesCulled !== debug.lastTilesCulled ||
                debug.maxDepth !== debug.lastMaxDepth ||
                debug.tilesWaitingForChildren !== debug.lastTilesWaitingForChildren) {

                /*global console*/
                console.log('Visited ' + debug.tilesVisited + ', Rendered: ' + debug.tilesRendered + ', Textures: ' + debug.texturesRendered + ', Culled: ' + debug.tilesCulled + ', Max Depth: ' + debug.maxDepth + ', Waiting for children: ' + debug.tilesWaitingForChildren);

                debug.lastTilesVisited = debug.tilesVisited;
                debug.lastTilesRendered = debug.tilesRendered;
                debug.lastTexturesRendered = debug.texturesRendered;
                debug.lastTilesCulled = debug.tilesCulled;
                debug.lastMaxDepth = debug.maxDepth;
                debug.lastTilesWaitingForChildren = debug.tilesWaitingForChildren;
            }
        }
    }

    function screenSpaceError(surface, context, frameState, cameraPosition, cameraPositionCartographic, tile) {
        if (frameState.mode === SceneMode.SCENE2D) {
            return screenSpaceError2D(surface, context, frameState, cameraPosition, cameraPositionCartographic, tile);
        }

        var extent = tile.extent;

        var latitudeFactor = 1.0;

        // Adjust by latitude in 3D only.
        if (frameState.mode === SceneMode.SCENE3D) {
            var latitudeClosestToEquator = 0.0;
            if (extent.south > 0.0) {
                latitudeClosestToEquator = extent.south;
            } else if (extent.north < 0.0) {
                latitudeClosestToEquator = extent.north;
            }

            latitudeFactor = Math.cos(latitudeClosestToEquator);
        }

        var maxGeometricError = latitudeFactor * surface._terrainProvider.getLevelMaximumGeometricError(tile.level);


        var distance = Math.sqrt(distanceSquaredToTile(frameState, cameraPosition, cameraPositionCartographic, tile));
        tile.distance = distance;

        var canvas = context.getCanvas();
        var height = canvas.clientHeight;

        var camera = frameState.camera;
        var frustum = camera.frustum;
        var fovy = frustum.fovy;

        // PERFORMANCE_IDEA: factor out stuff that's constant across tiles.
        return (maxGeometricError * height) / (2 * distance * Math.tan(0.5 * fovy));
    }

    function screenSpaceError2D(surface, context, frameState, cameraPosition, cameraPositionCartographic, tile) {
        var camera = frameState.camera;
        var frustum = camera.frustum;
        var canvas = context.getCanvas();
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        var maxGeometricError = surface._terrainProvider.getLevelMaximumGeometricError(tile.level);
        var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(width, height);
        return maxGeometricError / pixelSize;
    }

    function addTileToRenderList(surface, tile) {
        var readyTextureCount = 0;
        var textures = tile.textures;
        var inheritedTextures = tile.inheritedTextures;
        var layerCount = Math.max(tile.textures.length, tile.inheritedTextures.length);
        for (var i = 0, len = layerCount; i < len; ++i) {
            if (typeof textures[i] !== 'undefined' || typeof inheritedTextures[i] !== 'undefined') {
                ++readyTextureCount;
            }
        }

        var tileSet = surface._tilesToRenderByTextureCount[readyTextureCount];
        if (typeof tileSet === 'undefined') {
            tileSet = [];
            surface._tilesToRenderByTextureCount[readyTextureCount] = tileSet;
        }

        tileSet.push(tile);

        var debug = surface._debug;
        ++debug.tilesRendered;
        debug.texturesRendered += readyTextureCount;
    }

    var boundingSphereScratch = new BoundingSphere();

    function isTileVisible(surface, frameState, tile) {
        var cullingVolume = frameState.cullingVolume;

        var boundingVolume = tile.boundingSphere3D;

        if (frameState.mode !== SceneMode.SCENE3D) {
            boundingVolume = boundingSphereScratch;
            BoundingSphere.fromExtentWithHeights2D(tile.extent, frameState.scene2D.projection, tile.minimumHeight, tile.maximumHeight, boundingVolume);
            boundingVolume.center = new Cartesian3(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y);

            if (frameState.mode === SceneMode.MORPHING) {
                boundingVolume = BoundingSphere.union(tile.boundingSphere3D, boundingVolume, boundingVolume);
            }
        }

        if (cullingVolume.getVisibility(boundingVolume) === Intersect.OUTSIDE) {
            return false;
        }

        if (frameState.mode === SceneMode.SCENE3D) {
            var occludeePointInScaledSpace = tile.occludeePointInScaledSpace;
            if (typeof occludeePointInScaledSpace === 'undefined') {
                return true;
            }

            return surface._ellipsoidalOccluder.isScaledSpacePointVisible(occludeePointInScaledSpace);
        }

        return true;
    }

    var southwestCornerScratch = new Cartesian3();
    var northeastCornerScratch = new Cartesian3();
    var negativeUnitY = Cartesian3.UNIT_Y.negate();
    var negativeUnitZ = Cartesian3.UNIT_Z.negate();
    var vectorScratch = new Cartesian3();

    function distanceSquaredToTile(frameState, cameraCartesianPosition, cameraCartographicPosition, tile) {
        var southwestCornerCartesian = tile.southwestCornerCartesian;
        var northeastCornerCartesian = tile.northeastCornerCartesian;
        var westNormal = tile.westNormal;
        var southNormal = tile.southNormal;
        var eastNormal = tile.eastNormal;
        var northNormal = tile.northNormal;
        var maximumHeight = tile.maximumHeight;

        if (frameState.mode !== SceneMode.SCENE3D) {
            southwestCornerCartesian = frameState.scene2D.projection.project(tile.extent.getSouthwest(), southwestCornerScratch);
            southwestCornerCartesian.z = southwestCornerCartesian.y;
            southwestCornerCartesian.y = southwestCornerCartesian.x;
            southwestCornerCartesian.x = 0.0;
            northeastCornerCartesian = frameState.scene2D.projection.project(tile.extent.getNortheast(), northeastCornerScratch);
            northeastCornerCartesian.z = northeastCornerCartesian.y;
            northeastCornerCartesian.y = northeastCornerCartesian.x;
            northeastCornerCartesian.x = 0.0;
            westNormal = negativeUnitY;
            eastNormal = Cartesian3.UNIT_Y;
            southNormal = negativeUnitZ;
            northNormal = Cartesian3.UNIT_Z;
            maximumHeight = 0.0;
        }

        var vectorFromSouthwestCorner = cameraCartesianPosition.subtract(southwestCornerCartesian, vectorScratch);
        var distanceToWestPlane = vectorFromSouthwestCorner.dot(westNormal);
        var distanceToSouthPlane = vectorFromSouthwestCorner.dot(southNormal);

        var vectorFromNortheastCorner = cameraCartesianPosition.subtract(northeastCornerCartesian, vectorScratch);
        var distanceToEastPlane = vectorFromNortheastCorner.dot(eastNormal);
        var distanceToNorthPlane = vectorFromNortheastCorner.dot(northNormal);

        var cameraHeight;
        if (frameState.mode === SceneMode.SCENE3D) {
            cameraHeight = cameraCartographicPosition.height;
        } else {
            cameraHeight = cameraCartesianPosition.x;
        }
        var distanceFromTop = cameraHeight - maximumHeight;

        var result = 0.0;

        if (distanceToWestPlane > 0.0) {
            result += distanceToWestPlane * distanceToWestPlane;
        } else if (distanceToEastPlane > 0.0) {
            result += distanceToEastPlane * distanceToEastPlane;
        }

        if (distanceToSouthPlane > 0.0) {
            result += distanceToSouthPlane * distanceToSouthPlane;
        } else if (distanceToNorthPlane > 0.0) {
            result += distanceToNorthPlane * distanceToNorthPlane;
        }

        if (distanceFromTop > 0.0) {
            result += distanceFromTop * distanceFromTop;
        }

        return result;
    }

    function queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, frameState, tile) {
        var allRenderable = true;

        var children = tile.getChildren();
        for (var i = 0, len = children.length; i < len; ++i) {
            var child = children[i];
            surface._tileReplacementQueue.markTileRendered(child);
            if (child.state !== TileState.READY) {
                queueTileLoad(surface, child);
            }
            if (!child.isRenderable) {
                allRenderable = false;
            }
        }

        return allRenderable;
    }

    function queueTileLoad(surface, tile) {
        surface._tileLoadQueue.insertBeforeInsertionPoint(tile);

        if (tile.state === TileState.START) {
            surface._tileReplacementQueue.markTileRendered(tile);
            tile.prepareNewTile(surface._terrainProvider, surface._imageryLayerCollection);
        }
    }

    function processTileLoadQueue(surface, context, frameState) {
        var tileLoadQueue = surface._tileLoadQueue;
        var terrainProvider = surface._terrainProvider;
        var imageryLayerCollection = surface._imageryLayerCollection;

        var tile = tileLoadQueue.head;
        if (typeof tile === 'undefined') {
            return;
        }

        // Remove any tiles that were not used this frame beyond the number
        // we're allowed to keep.
        surface._tileReplacementQueue.trimTiles(surface._tileCacheSize);

        var startTime = Date.now();
        var timeSlice = surface._loadQueueTimeSlice;
        var endTime = startTime + timeSlice;

        do {
            surface._tileReplacementQueue.markTileRendered(tile);

            tile.processStateMachine(context, terrainProvider, imageryLayerCollection);

            var next = tile.loadNext;

            if (tile.state === TileState.READY) {
                tileLoadQueue.remove(tile);
            }

            tile = next;
        } while (Date.now() < endTime && typeof tile !== 'undefined');
    }

    // This is debug code to render the bounding sphere of the tile in
    // CentralBodySurface._debug.boundingSphereTile.
    CentralBodySurface.prototype.debugShowBoundingSphereOfTileAt = function(cartographicPick) {
        // Find the tile in the render list that overlaps this extent
        var tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
        var result;
        var tile;
        for (var i = 0; i < tilesToRenderByTextureCount.length && typeof result === 'undefined'; ++i) {
            var tileSet = tilesToRenderByTextureCount[i];
            if (typeof tileSet === 'undefined') {
                continue;
            }
            for (var j = 0; j < tileSet.length; ++j) {
                tile = tileSet[j];
                if (tile.extent.contains(cartographicPick)) {
                    result = tile;
                    break;
                }
            }
        }

        if (typeof result !== 'undefined') {
            console.log('x: ' + result.x + ' y: ' + result.y + ' level: ' + result.level + ' radius: ' + result.boundingSphere3D.radius + ' center magnitude: ' + result.boundingSphere3D.center.magnitude());
        }

        this._debug.boundingSphereTile = result;
        this._debug.boundingSphereVA = undefined;
    };

    function debugCreateRenderCommandsForTileBoundingSphere(surface, context, frameState, centralBodyUniformMap, shaderSet, renderState, colorCommandList) {
        if (typeof surface._debug !== 'undefined' && typeof surface._debug.boundingSphereTile !== 'undefined') {
            if (!surface._debug.boundingSphereVA) {
                var radius = surface._debug.boundingSphereTile.boundingSphere3D.radius;
                var sphere = CubeMapEllipsoidTessellator.compute(new Ellipsoid(radius, radius, radius), 10);
                MeshFilters.toWireframeInPlace(sphere);
                surface._debug.boundingSphereVA = context.createVertexArrayFromMesh({
                    mesh : sphere,
                    attributeIndices : MeshFilters.createAttributeIndices(sphere)
                });
            }

            var tile = surface._debug.boundingSphereTile;
            if (typeof tile.vertexArray === 'undefined') {
                return;
            }

            var rtc2 = tile.center;

            var uniformMap2 = createTileUniformMap();
            mergeUniformMap(uniformMap2, centralBodyUniformMap);

            uniformMap2.waterMask = tile.waterMaskTexture;

            uniformMap2.center3D = rtc2;

            var viewMatrix = frameState.camera.getViewMatrix();

            var centerEye2 = viewMatrix.multiplyByVector(new Cartesian4(rtc2.x, rtc2.y, rtc2.z, 1.0));
            uniformMap2.modifiedModelView = viewMatrix.setColumn(3, centerEye2, uniformMap2.modifiedModelView);

            uniformMap2.dayTextures[0] = context.getDefaultTexture();
            uniformMap2.dayTextureTranslationAndScale[0] = new Cartesian4(0.0, 0.0, 1.0, 1.0);
            uniformMap2.dayTextureTexCoordsExtent[0] = new Cartesian4(0.0, 0.0, 1.0, 1.0);
            uniformMap2.dayTextureAlpha[0] = 1.0;

            var boundingSphereCommand = new DrawCommand();
            boundingSphereCommand.shaderProgram = shaderSet.getShaderProgram(context, 0);
            boundingSphereCommand.renderState = renderState;
            boundingSphereCommand.primitiveType = PrimitiveType.LINES;
            boundingSphereCommand.vertexArray = surface._debug.boundingSphereVA;
            boundingSphereCommand.uniformMap = uniformMap2;

            colorCommandList.push(boundingSphereCommand);
        }
    }

    CentralBodySurface.prototype.debugToggleLodUpdate = function(frameState) {
        this._debug.suspendLodUpdate = !this._debug.suspendLodUpdate;
    };

    function tileDistanceSortFunction(a, b) {
        return a.distance - b.distance;
    }

    function createTileUniformMap() {
        return {
            u_center3D : function() {
                return this.center3D;
            },
            u_tileExtent : function() {
                return this.tileExtent;
            },
            u_modifiedModelView : function() {
                return this.modifiedModelView;
            },
            u_layerTexture : function() {
                return this.layerTexture;
            },
            u_layerTranslationAndScale : function() {
                return this.layerTranslationAndScale;
            },
            u_layerAlpha : function() {
                return this.layerAlpha;
            },
            u_layerBrightness : function() {
                return this.layerBrightness;
            },
            u_layerContrast : function() {
                return this.layerContrast;
            },
            u_layerHue : function() {
                return this.layerHue;
            },
            u_layerSaturation : function() {
                return this.layerSaturation;
            },
            u_layerOneOverGamma : function() {
                return this.layerOneOverGamma;
            },
            u_layerIntensity : function() {
                return this.layerIntensity;
            },
            u_southAndNorthLatitude : function() {
                return this.southAndNorthLatitude;
            },
            u_southMercatorYLowAndHighAndOneOverHeight : function() {
               return this.southMercatorYLowAndHighAndOneOverHeight;
            },
            u_waterMask : function() {
                return this.waterMask;
            },
            u_waterMaskTranslationAndScale : function() {
                return this.waterMaskTranslationAndScale;
            },

            center3D : undefined,
            modifiedModelView : new Matrix4(),
            tileExtent : new Cartesian4(),

            layerTexture : [],
            layerTranslationAndScale : [],
            layerAlpha : [],
            layerBrightness : [],
            layerContrast : [],
            layerHue : [],
            layerSaturation : [],
            layerOneOverGamma : [],
            layerIntensity : 0.0,

            southAndNorthLatitude : new Cartesian2(),
            southMercatorYLowAndHighAndOneOverHeight : new Cartesian3(),

            waterMask : undefined,
            waterMaskTranslationAndScale : new Cartesian4()
        };
    }

    function mergeUniformMap(target, source) {
        for (var property in source) {
            if (source.hasOwnProperty(property)) {
                target[property] = source[property];
            }
        }
    }

    var float32ArrayScratch = typeof Float32Array !== 'undefined' ? new Float32Array(1) : undefined;
    var modifiedModelViewScratch = new Matrix4();
    var tileExtentScratch = new Cartesian4();
    var rtcScratch = new Cartesian3();
    var centerEyeScratch = new Cartesian4();
    var noTranslationOrScale = new Cartesian4(0.0, 0.0, 1.0, 1.0);

    function createRenderCommandsForSelectedTiles(surface, context, frameState, shaderSet, mode, projection, centralBodyUniformMap, colorCommandList, renderState) {
        var viewMatrix = frameState.camera.getViewMatrix();

        var tileCommands = surface._tileCommands;
        var tileCommandUniformMaps = surface._tileCommandUniformMaps;
        var tileCommandIndex = -1;

        var imageryLayerCollection = surface._imageryLayerCollection;

        var tilesToRenderByTextureCount = surface._tilesToRenderByTextureCount;
        for (var tileSetIndex = 0, tileSetLength = tilesToRenderByTextureCount.length; tileSetIndex < tileSetLength; ++tileSetIndex) {
            var tileSet = tilesToRenderByTextureCount[tileSetIndex];
            if (typeof tileSet === 'undefined' || tileSet.length === 0) {
                continue;
            }

            tileSet.sort(tileDistanceSortFunction);

            for (var i = 0, len = tileSet.length; i < len; i++) {
                var tile = tileSet[i];

                var rtc = tile.center;

                // Not used in 3D.
                var tileExtent = tileExtentScratch;

                // Only used for Mercator projections.
                var southLatitude = 0.0;
                var northLatitude = 0.0;
                var southMercatorYHigh = 0.0;
                var southMercatorYLow = 0.0;
                var oneOverMercatorHeight = 0.0;

                if (mode !== SceneMode.SCENE3D) {
                    var southwest = projection.project(tile.extent.getSouthwest());
                    var northeast = projection.project(tile.extent.getNortheast());

                    tileExtent.x = southwest.x;
                    tileExtent.y = southwest.y;
                    tileExtent.z = northeast.x;
                    tileExtent.w = northeast.y;

                    // In 2D and Columbus View, use the center of the tile for RTC rendering.
                    if (mode !== SceneMode.MORPHING) {
                        rtc = rtcScratch;
                        rtc.x = 0.0;
                        rtc.y = (tileExtent.z + tileExtent.x) * 0.5;
                        rtc.z = (tileExtent.w + tileExtent.y) * 0.5;
                        tileExtent.x -= rtc.y;
                        tileExtent.y -= rtc.z;
                        tileExtent.z -= rtc.y;
                        tileExtent.w -= rtc.z;
                    }

                    if (projection instanceof WebMercatorProjection) {
                        southLatitude = tile.extent.south;
                        northLatitude = tile.extent.north;

                        var southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(southLatitude);
                        var northMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(northLatitude);

                        float32ArrayScratch[0] = southMercatorY;
                        southMercatorYHigh = float32ArrayScratch[0];
                        southMercatorYLow = southMercatorY - float32ArrayScratch[0];

                        oneOverMercatorHeight = 1.0 / (northMercatorY - southMercatorY);
                    }
                }

                var centerEye = centerEyeScratch;
                centerEye.x = rtc.x;
                centerEye.y = rtc.y;
                centerEye.z = rtc.z;
                centerEye.w = 1.0;

                Matrix4.multiplyByVector(viewMatrix, centerEye, centerEye);
                viewMatrix.setColumn(3, centerEye, modifiedModelViewScratch);

                ++tileCommandIndex;
                var command = tileCommands[tileCommandIndex];
                if (typeof command === 'undefined') {
                    command = new DrawCommand();
                    tileCommands[tileCommandIndex] = command;
                    tileCommandUniformMaps[tileCommandIndex] = createTileUniformMap();
                }
                var uniformMap = tileCommandUniformMaps[tileCommandIndex];

                mergeUniformMap(uniformMap, centralBodyUniformMap);

                uniformMap.center3D = tile.center;

                Cartesian4.clone(tileExtent, uniformMap.tileExtent);
                uniformMap.southAndNorthLatitude.x = southLatitude;
                uniformMap.southAndNorthLatitude.y = northLatitude;
                uniformMap.southMercatorYLowAndHighAndOneOverHeight.x = southMercatorYLow;
                uniformMap.southMercatorYLowAndHighAndOneOverHeight.y = southMercatorYHigh;
                uniformMap.southMercatorYLowAndHighAndOneOverHeight.z = oneOverMercatorHeight;
                Matrix4.clone(modifiedModelViewScratch, uniformMap.modifiedModelView);

                var numberOfDayTextures = 0;

                var applyBrightness = false;
                var applyContrast = false;
                var applyHue = false;
                var applySaturation = false;
                var applyGamma = false;

                var textureCount = Math.max(tile.textures.length, tile.inheritedTextures.length);

                for (var textureIndex = 0; textureIndex < textureCount; ++textureIndex) {
                    var texture = tile.textures[textureIndex];
                    var inheritedTexture = tile.inheritedTextures[textureIndex];
                    var textureTranslationAndScale = noTranslationOrScale;

                    if (typeof texture === 'undefined' && typeof inheritedTexture === 'undefined') {
                        continue;
                    }

                    if (typeof texture === 'undefined') {
                        texture = inheritedTexture;
                        textureTranslationAndScale = tile.inheritedTextureTranslationAndScale[textureIndex];
                    }

                    uniformMap.layerTexture[numberOfDayTextures] = texture;
                    uniformMap.layerTranslationAndScale[numberOfDayTextures] = textureTranslationAndScale;

                    var imageryLayer = imageryLayerCollection.get(textureIndex);

                    if (typeof imageryLayer.alpha === 'function') {
                        uniformMap.layerAlpha[numberOfDayTextures] = imageryLayer.alpha(frameState, imageryLayer, tile.x, tile.y, tile.level, tile.extent);
                    } else {
                        uniformMap.layerAlpha[numberOfDayTextures] = imageryLayer.alpha;
                    }

                    if (typeof imageryLayer.brightness === 'function') {
                        uniformMap.layerBrightness[numberOfDayTextures] = imageryLayer.brightness(frameState, imageryLayer, tile.x, tile.y, tile.level, tile.extent);
                    } else {
                        uniformMap.layerBrightness[numberOfDayTextures] = imageryLayer.brightness;
                    }
                    applyBrightness = applyBrightness || uniformMap.layerBrightness[numberOfDayTextures] !== ImageryLayer.DEFAULT_BRIGHTNESS;

                    if (typeof imageryLayer.contrast === 'function') {
                        uniformMap.layerContrast[numberOfDayTextures] = imageryLayer.contrast(frameState, imageryLayer, tile.x, tile.y, tile.level, tile.extent);
                    } else {
                        uniformMap.layerContrast[numberOfDayTextures] = imageryLayer.contrast;
                    }
                    applyContrast = applyContrast || uniformMap.layerContrast[numberOfDayTextures] !== ImageryLayer.DEFAULT_CONTRAST;

                    if (typeof imageryLayer.hue === 'function') {
                        uniformMap.layerHue[numberOfDayTextures] = imageryLayer.hue(frameState, imageryLayer, tile.x, tile.y, tile.level, tile.extent);
                    } else {
                        uniformMap.layerHue[numberOfDayTextures] = imageryLayer.hue;
                    }
                    applyHue = applyHue || uniformMap.layerHue[numberOfDayTextures] !== ImageryLayer.DEFAULT_HUE;

                    if (typeof imageryLayer.saturation === 'function') {
                        uniformMap.layerSaturation[numberOfDayTextures] = imageryLayer.saturation(frameState, imageryLayer, tile.x, tile.y, tile.level, tile.extent);
                    } else {
                        uniformMap.layerSaturation[numberOfDayTextures] = imageryLayer.saturation;
                    }
                    applySaturation = applySaturation || uniformMap.layerSaturation[numberOfDayTextures] !== ImageryLayer.DEFAULT_SATURATION;

                    if (typeof imageryLayer.gamma === 'function') {
                        uniformMap.layerOneOverGamma[numberOfDayTextures] = 1.0 / imageryLayer.gamma(frameState, imageryLayer, tile.x, tile.y, tile.level, tile.extent);
                    } else {
                        uniformMap.layerOneOverGamma[numberOfDayTextures] = 1.0 / imageryLayer.gamma;
                    }
                    applyGamma = applyGamma || uniformMap.layerOneOverGamma[numberOfDayTextures] !== 1.0 / ImageryLayer.DEFAULT_GAMMA;

                    ++numberOfDayTextures;
                }

                // trim texture array to the used length so we don't end up using old textures
                // which might get destroyed eventually
                uniformMap.waterMask = tile.waterMaskTexture;
                Cartesian4.clone(tile.waterMaskTranslationAndScale, uniformMap.waterMaskTranslationAndScale);

                colorCommandList.push(command);

                command.shaderProgram = shaderSet.getShaderProgram(context, numberOfDayTextures, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma);
                command.renderState = renderState;
                command.primitiveType = TerrainProvider.wireframe ? PrimitiveType.LINES : PrimitiveType.TRIANGLES;
                command.vertexArray = tile.vertexArray;
                command.uniformMap = uniformMap;

                var boundingVolume = tile.boundingSphere3D;

                if (frameState.mode !== SceneMode.SCENE3D) {
                    boundingVolume = BoundingSphere.fromExtentWithHeights2D(tile.extent, frameState.scene2D.projection, tile.minimumHeight, tile.maximumHeight);
                    boundingVolume.center = new Cartesian3(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y);

                    if (frameState.mode === SceneMode.MORPHING) {
                        boundingVolume = BoundingSphere.union(tile.boundingSphere3D, boundingVolume, boundingVolume);
                    }
                }

                command.boundingVolume = boundingVolume;
            }
        }

        // trim command list to the number actually needed
        tileCommands.length = Math.max(0, tileCommandIndex + 1);
    }

    return CentralBodySurface;
});
