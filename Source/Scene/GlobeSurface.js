/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EllipsoidalOccluder',
        '../Core/FeatureDetection',
        '../Core/GeometryPipeline',
        '../Core/getTimestamp',
        '../Core/IndexDatatype',
        '../Core/Intersect',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        '../Core/Queue',
        '../Core/Rectangle',
        '../Core/TerrainProvider',
        '../Core/WebMercatorProjection',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../ThirdParty/when',
        './ImageryLayer',
        './ImageryState',
        './Pass',
        './SceneMode',
        './Tile',
        './TileReplacementQueue',
        './TileState'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        EllipsoidalOccluder,
        FeatureDetection,
        GeometryPipeline,
        getTimestamp,
        IndexDatatype,
        Intersect,
        Matrix4,
        PrimitiveType,
        Queue,
        Rectangle,
        TerrainProvider,
        WebMercatorProjection,
        BufferUsage,
        DrawCommand,
        when,
        ImageryLayer,
        ImageryState,
        Pass,
        SceneMode,
        Tile,
        TileReplacementQueue,
        TileState) {
    "use strict";

    /**
     * Manages and renders the terrain and imagery on the surface of a {@link Globe}.
     * This class should be considered an implementation detail of {@link Globe} and not
     * used directly.
     *
     * @alias GlobeSurface
     * @constructor
     * @private
     */
    var GlobeSurface = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.terrainProvider)) {
            throw new DeveloperError('options.terrainProvider is required.');
        }
        if (!defined(options.imageryLayerCollection)) {
            throw new DeveloperError('options.imageryLayerCollection is required.');
        }
        //>>includeEnd('debug');

        this._terrainProvider = options.terrainProvider;
        this._imageryLayerCollection = options.imageryLayerCollection;

        this._imageryLayerCollection.layerAdded.addEventListener(GlobeSurface.prototype._onLayerAdded, this);
        this._imageryLayerCollection.layerRemoved.addEventListener(GlobeSurface.prototype._onLayerRemoved, this);
        this._imageryLayerCollection.layerMoved.addEventListener(GlobeSurface.prototype._onLayerMoved, this);
        this._imageryLayerCollection.layerShownOrHidden.addEventListener(GlobeSurface.prototype._onLayerShownOrHidden, this);

        this._layerOrderChanged = false;

        var terrainTilingScheme = this._terrainProvider.tilingScheme;
        this._levelZeroTiles = undefined;

        this._tilesToRenderByTextureCount = [];
        this._tileCommands = [];
        this._tileCommandUniformMaps = [];
        this._tileTraversalQueue = new Queue();
        this._tileLoadQueue = [];
        this._tileReplacementQueue = new TileReplacementQueue();
        this._maximumScreenSpaceError = 2;
        this._tileCacheSize = 100;

        // The number of milliseconds each frame to allow for processing the tile load queue.
        // At least one tile will be processed per frame (assuming that any need processing),
        // even if this value is 0.
        this._loadQueueTimeSlice = 5;

        var ellipsoid = terrainTilingScheme.ellipsoid;
        this._ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid, Cartesian3.ZERO);

        this._debug = {
            enableDebugOutput : false,
            wireframe : false,
            boundingSphereTile : undefined,

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

    defineProperties(GlobeSurface.prototype, {
        terrainProvider : {
            get : function() {
                return this._terrainProvider;
            },
            set : function(terrainProvider) {
                if (this._terrainProvider === terrainProvider) {
                    return;
                }

                //>>includeStart('debug', pragmas.debug);
                if (!defined(terrainProvider)) {
                    throw new DeveloperError('terrainProvider is required.');
                }
                //>>includeEnd('debug');

                this._terrainProvider = terrainProvider;

                // Clear the replacement queue
                var replacementQueue = this._tileReplacementQueue;
                replacementQueue.head = undefined;
                replacementQueue.tail = undefined;
                replacementQueue.count = 0;

                // Free and recreate the level zero tiles.
                var levelZeroTiles = this._levelZeroTiles;
                if (defined(levelZeroTiles)) {
                    for (var i = 0; i < levelZeroTiles.length; ++i) {
                        levelZeroTiles[i].freeResources();
                    }
                }

                this._levelZeroTiles = undefined;
            }
        }
    });

    GlobeSurface.prototype.update = function(context, frameState, commandList, globeUniformMap, shaderSet, renderState, projection) {
        updateLayers(this);
        selectTilesForRendering(this, context, frameState);
        processTileLoadQueue(this, context, frameState);
        createRenderCommandsForSelectedTiles(this, context, frameState, shaderSet, projection, globeUniformMap, commandList, renderState);
    };

    GlobeSurface.prototype._onLayerAdded = function(layer, index) {
        if (!defined(this._levelZeroTiles)) {
            return;
        }

        // create TileImagerys for this layer for all previously loaded tiles
        if (layer.show) {
            var tile = this._tileReplacementQueue.head;
            while (defined(tile)) {
                if (layer._createTileImagerySkeletons(tile, this._terrainProvider)) {
                    tile.state = TileState.LOADING;
                }
                tile = tile.replacementNext;
            }

            this._layerOrderChanged = true;
        }
    };

    GlobeSurface.prototype._onLayerRemoved = function(layer, index) {
        if (!defined(this._levelZeroTiles)) {
            return;
        }

        // destroy TileImagerys for this layer for all previously loaded tiles
        var tile = this._tileReplacementQueue.head;
        while (defined(tile)) {
            var tileImageryCollection = tile.imagery;

            var startIndex = -1;
            var numDestroyed = 0;
            for ( var i = 0, len = tileImageryCollection.length; i < len; ++i) {
                var tileImagery = tileImageryCollection[i];
                var imagery = tileImagery.loadingImagery;
                if (!defined(imagery)) {
                    imagery = tileImagery.readyImagery;
                }
                if (imagery.imageryLayer === layer) {
                    if (startIndex === -1) {
                        startIndex = i;
                    }

                    tileImagery.freeResources();
                    ++numDestroyed;
                } else if (startIndex !== -1) {
                    // iterated past the section of TileImagerys belonging to this layer, no need to continue.
                    break;
                }
            }

            if (startIndex !== -1) {
                tileImageryCollection.splice(startIndex, numDestroyed);
            }
            // If the base layer has been removed, mark the tile as non-renderable.
            if (layer.isBaseLayer()) {
                tile.isRenderable = false;
            }

            tile = tile.replacementNext;
        }
    };

    GlobeSurface.prototype._onLayerMoved = function(layer, newIndex, oldIndex) {
        if (!defined(this._levelZeroTiles)) {
            return;
        }

        this._layerOrderChanged = true;
    };

    GlobeSurface.prototype._onLayerShownOrHidden = function(layer, index, show) {
        if (!defined(this._levelZeroTiles)) {
            return;
        }

        if (show) {
            this._onLayerAdded(layer, index);
        } else {
            this._onLayerRemoved(layer, index);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see GlobeSurface#destroy
     */
    GlobeSurface.prototype.isDestroyed = function() {
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
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see GlobeSurface#isDestroyed
     */
    GlobeSurface.prototype.destroy = function() {
        var levelZeroTiles = this._levelZeroTiles;
        if (defined(levelZeroTiles)) {
            for (var i = 0; i < levelZeroTiles.length; ++i) {
                levelZeroTiles[i].freeResources();
            }
        }

        this._imageryLayerCollection.destroy();

        return destroyObject(this);
    };

    function sortTileImageryByLayerIndex(a, b) {
        var aImagery = a.loadingImagery;
        if (!defined(aImagery)) {
            aImagery = a.readyImagery;
        }

        var bImagery = b.loadingImagery;
        if (!defined(bImagery)) {
            bImagery = b.readyImagery;
        }

        return aImagery.imageryLayer._layerIndex - bImagery.imageryLayer._layerIndex;
    }

    function updateLayers(surface) {
        surface._imageryLayerCollection._update();

        if (surface._layerOrderChanged) {
            surface._layerOrderChanged = false;

            // Sort the TileImagery instances in each tile by the layer index.
            var tile = surface._tileReplacementQueue.head;
            while (defined(tile)) {
                tile.imagery.sort(sortTileImageryByLayerIndex);
                tile = tile.replacementNext;
            }
        }
    }

    var scratchCamera = new Cartographic();

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
            if (defined(tiles)) {
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

        surface._tileLoadQueue.length = 0;
        surface._tileReplacementQueue.markStartOfRenderFrame();

        // We can't render anything before the level zero tiles exist.
        if (!defined(surface._levelZeroTiles)) {
            if (surface._terrainProvider.ready) {
                var terrainTilingScheme = surface._terrainProvider.tilingScheme;
                surface._levelZeroTiles = Tile.createLevelZeroTiles(terrainTilingScheme);
            } else {
                // Nothing to do until the terrain provider is ready.
                return;
            }
        }

        var cameraPosition = frameState.camera.positionWC;

        var ellipsoid = surface._terrainProvider.tilingScheme.ellipsoid;
        var cameraPositionCartographic = ellipsoid.cartesianToCartographic(cameraPosition, scratchCamera);

        surface._ellipsoidalOccluder.cameraPosition = cameraPosition;

        var tile;

        // Enqueue the root tiles that are renderable and visible.
        var levelZeroTiles = surface._levelZeroTiles;
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            tile = levelZeroTiles[i];
            surface._tileReplacementQueue.markTileRendered(tile);
            if (tile.state < TileState.READY) {
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
        while (defined((tile = traversalQueue.dequeue()))) {
            ++debug.tilesVisited;

            surface._tileReplacementQueue.markTileRendered(tile);

            if (tile.level > debug.maxDepth) {
                debug.maxDepth = tile.level;
            }

            // There are a few different algorithms we could use here.
            // This one doesn't load children unless we refine to them.
            // We may want to revisit this in the future.

            if (screenSpaceError(surface, context, frameState, cameraPosition, cameraPositionCartographic, tile) < surface._maximumScreenSpaceError) {
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
                // SSE is not good enough but either all children are upsampled (so there's no point in refining) or they're not all loaded yet.
                // So render the current tile.
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

        var maxGeometricError = surface._terrainProvider.getLevelMaximumGeometricError(tile.level);

        var distance = Math.sqrt(distanceSquaredToTile(frameState, cameraPosition, cameraPositionCartographic, tile));
        tile.distance = distance;

        var height = context.drawingBufferHeight;

        var camera = frameState.camera;
        var frustum = camera.frustum;
        var fovy = frustum.fovy;

        // PERFORMANCE_IDEA: factor out stuff that's constant across tiles.
        return (maxGeometricError * height) / (2 * distance * Math.tan(0.5 * fovy));
    }

    function screenSpaceError2D(surface, context, frameState, cameraPosition, cameraPositionCartographic, tile) {
        var camera = frameState.camera;
        var frustum = camera.frustum;
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var maxGeometricError = surface._terrainProvider.getLevelMaximumGeometricError(tile.level);
        var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(width, height);
        return maxGeometricError / pixelSize;
    }

    function addTileToRenderList(surface, tile) {
        var readyTextureCount = 0;
        var tileImageryCollection = tile.imagery;
        for ( var i = 0, len = tileImageryCollection.length; i < len; ++i) {
            var tileImagery = tileImageryCollection[i];
            if (defined(tileImagery.readyImagery) && tileImagery.readyImagery.imageryLayer.alpha !== 0.0) {
                ++readyTextureCount;
            }
        }

        var tileSet = surface._tilesToRenderByTextureCount[readyTextureCount];
        if (!defined(tileSet)) {
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
            BoundingSphere.fromRectangleWithHeights2D(tile.rectangle, frameState.mapProjection, tile.minimumHeight, tile.maximumHeight, boundingVolume);
            Cartesian3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);

            if (frameState.mode === SceneMode.MORPHING) {
                boundingVolume = BoundingSphere.union(tile.boundingSphere3D, boundingVolume, boundingVolume);
            }
        }

        if (cullingVolume.getVisibility(boundingVolume) === Intersect.OUTSIDE) {
            return false;
        }

        if (frameState.mode === SceneMode.SCENE3D) {
            var occludeePointInScaledSpace = tile.occludeePointInScaledSpace;
            if (!defined(occludeePointInScaledSpace)) {
                return true;
            }

            return surface._ellipsoidalOccluder.isScaledSpacePointVisible(occludeePointInScaledSpace);
        }

        return true;
    }

    var southwestCornerScratch = new Cartesian3();
    var northeastCornerScratch = new Cartesian3();
    var negativeUnitY = Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3());
    var negativeUnitZ = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
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
            southwestCornerCartesian = frameState.mapProjection.project(Rectangle.getSouthwest(tile.rectangle), southwestCornerScratch);
            southwestCornerCartesian.z = southwestCornerCartesian.y;
            southwestCornerCartesian.y = southwestCornerCartesian.x;
            southwestCornerCartesian.x = 0.0;
            northeastCornerCartesian = frameState.mapProjection.project(Rectangle.getNortheast(tile.rectangle), northeastCornerScratch);
            northeastCornerCartesian.z = northeastCornerCartesian.y;
            northeastCornerCartesian.y = northeastCornerCartesian.x;
            northeastCornerCartesian.x = 0.0;
            westNormal = negativeUnitY;
            eastNormal = Cartesian3.UNIT_Y;
            southNormal = negativeUnitZ;
            northNormal = Cartesian3.UNIT_Z;
            maximumHeight = 0.0;
        }

        var vectorFromSouthwestCorner = Cartesian3.subtract(cameraCartesianPosition, southwestCornerCartesian, vectorScratch);
        var distanceToWestPlane = Cartesian3.dot(vectorFromSouthwestCorner, westNormal);
        var distanceToSouthPlane = Cartesian3.dot(vectorFromSouthwestCorner, southNormal);

        var vectorFromNortheastCorner = Cartesian3.subtract(cameraCartesianPosition, northeastCornerCartesian, vectorScratch);
        var distanceToEastPlane = Cartesian3.dot(vectorFromNortheastCorner, eastNormal);
        var distanceToNorthPlane = Cartesian3.dot(vectorFromNortheastCorner, northNormal);

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
        var allUpsampledOnly = true;

        var children = tile.children;
        for (var i = 0, len = children.length; i < len; ++i) {
            var child = children[i];

            surface._tileReplacementQueue.markTileRendered(child);

            allUpsampledOnly = allUpsampledOnly && child.state === TileState.UPSAMPLED_ONLY;
            allRenderable = allRenderable && child.isRenderable;

            if (child.state < TileState.READY) {
                queueTileLoad(surface, child);
            }
        }

        if (!allRenderable) {
            ++surface._debug.tilesWaitingForChildren;
        }

        // If all children are upsampled from this tile, we just render this tile instead of its children.
        return allRenderable && !allUpsampledOnly;
    }

    function queueTileLoad(surface, tile) {
        surface._tileLoadQueue.push(tile);
    }

    function processTileLoadQueue(surface, context, frameState) {
        var tileLoadQueue = surface._tileLoadQueue;
        var terrainProvider = surface._terrainProvider;
        var imageryLayerCollection = surface._imageryLayerCollection;

        if (tileLoadQueue.length === 0) {
            return;
        }

        // Remove any tiles that were not used this frame beyond the number
        // we're allowed to keep.
        surface._tileReplacementQueue.trimTiles(surface._tileCacheSize);

        var startTime = getTimestamp();
        var timeSlice = surface._loadQueueTimeSlice;
        var endTime = startTime + timeSlice;

        for (var len = tileLoadQueue.length - 1, i = len; i >= 0; --i) {
            var tile = tileLoadQueue[i];
            surface._tileReplacementQueue.markTileRendered(tile);

            tile.processStateMachine(context, terrainProvider, imageryLayerCollection);

            if (getTimestamp() >= endTime) {
                break;
            }
        }
    }

    // This is debug code to render the bounding sphere of the tile in
    // GlobeSurface._debug.boundingSphereTile.
    GlobeSurface.prototype.debugShowBoundingSphereOfTileAt = function(cartographicPick) {
        // Find the tile in the render list that overlaps this rectangle
        var tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
        var result;
        var tile;
        for (var i = 0; i < tilesToRenderByTextureCount.length && !defined(result); ++i) {
            var tileSet = tilesToRenderByTextureCount[i];
            if (!defined(tileSet)) {
                continue;
            }
            for (var j = 0; j < tileSet.length; ++j) {
                tile = tileSet[j];
                if (Rectangle.contains(tile.rectangle, cartographicPick)) {
                    result = tile;
                    break;
                }
            }
        }

        if (defined(result)) {
            console.log('x: ' + result.x + ' y: ' + result.y + ' level: ' + result.level + ' radius: ' + result.boundingSphere3D.radius + ' center magnitude: ' + Cartesian3.magnitude(result.boundingSphere3D.center));
        }

        this._debug.boundingSphereTile = result;
    };

    GlobeSurface.prototype.debugToggleLodUpdate = function(frameState) {
        this._debug.suspendLodUpdate = !this._debug.suspendLodUpdate;
    };

    function tileDistanceSortFunction(a, b) {
        return a.distance - b.distance;
    }

    function mergeUniformMap(target, source) {
        for (var property in source) {
            if (source.hasOwnProperty(property)) {
                target[property] = source[property];
            }
        }
    }

    function createTileUniformMap(globeUniformMap) {
        var uniformMap = {
            u_center3D : function() {
                return this.center3D;
            },
            u_tileRectangle : function() {
                return this.tileRectangle;
            },
            u_modifiedModelView : function() {
                return this.modifiedModelView;
            },
            u_dayTextures : function() {
                return this.dayTextures;
            },
            u_dayTextureTranslationAndScale : function() {
                return this.dayTextureTranslationAndScale;
            },
            u_dayTextureTexCoordsRectangle : function() {
                return this.dayTextureTexCoordsRectangle;
            },
            u_dayTextureAlpha : function() {
                return this.dayTextureAlpha;
            },
            u_dayTextureBrightness : function() {
                return this.dayTextureBrightness;
            },
            u_dayTextureContrast : function() {
                return this.dayTextureContrast;
            },
            u_dayTextureHue : function() {
                return this.dayTextureHue;
            },
            u_dayTextureSaturation : function() {
                return this.dayTextureSaturation;
            },
            u_dayTextureOneOverGamma : function() {
                return this.dayTextureOneOverGamma;
            },
            u_dayIntensity : function() {
                return this.dayIntensity;
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
            tileRectangle : new Cartesian4(),

            dayTextures : [],
            dayTextureTranslationAndScale : [],
            dayTextureTexCoordsRectangle : [],
            dayTextureAlpha : [],
            dayTextureBrightness : [],
            dayTextureContrast : [],
            dayTextureHue : [],
            dayTextureSaturation : [],
            dayTextureOneOverGamma : [],
            dayIntensity : 0.0,

            southAndNorthLatitude : new Cartesian2(),
            southMercatorYLowAndHighAndOneOverHeight : new Cartesian3(),

            waterMask : undefined,
            waterMaskTranslationAndScale : new Cartesian4()
        };

        mergeUniformMap(uniformMap, globeUniformMap);

        return uniformMap;
    }

    var float32ArrayScratch = FeatureDetection.supportsTypedArrays() ? new Float32Array(1) : undefined;
    var modifiedModelViewScratch = new Matrix4();
    var tileRectangleScratch = new Cartesian4();
    var rtcScratch = new Cartesian3();
    var centerEyeScratch = new Cartesian4();
    var southwestScratch = new Cartesian3();
    var northeastScratch = new Cartesian3();

    function createRenderCommandsForSelectedTiles(surface, context, frameState, shaderSet, projection, globeUniformMap, commandList, renderState) {
        displayCredits(surface, frameState);

        var viewMatrix = frameState.camera.viewMatrix;

        var maxTextures = context.maximumTextureImageUnits;

        var tileCommands = surface._tileCommands;
        var tileCommandUniformMaps = surface._tileCommandUniformMaps;
        var tileCommandIndex = -1;

        var tilesToRenderByTextureCount = surface._tilesToRenderByTextureCount;
        for (var tileSetIndex = 0, tileSetLength = tilesToRenderByTextureCount.length; tileSetIndex < tileSetLength; ++tileSetIndex) {
            var tileSet = tilesToRenderByTextureCount[tileSetIndex];
            if (!defined(tileSet) || tileSet.length === 0) {
                continue;
            }

            tileSet.sort(tileDistanceSortFunction);

            for (var i = 0, len = tileSet.length; i < len; i++) {
                var tile = tileSet[i];

                var rtc = tile.center;

                // Not used in 3D.
                var tileRectangle = tileRectangleScratch;

                // Only used for Mercator projections.
                var southLatitude = 0.0;
                var northLatitude = 0.0;
                var southMercatorYHigh = 0.0;
                var southMercatorYLow = 0.0;
                var oneOverMercatorHeight = 0.0;

                if (frameState.mode !== SceneMode.SCENE3D) {
                    var southwest = projection.project(Rectangle.getSouthwest(tile.rectangle), southwestScratch);
                    var northeast = projection.project(Rectangle.getNortheast(tile.rectangle), northeastScratch);

                    tileRectangle.x = southwest.x;
                    tileRectangle.y = southwest.y;
                    tileRectangle.z = northeast.x;
                    tileRectangle.w = northeast.y;

                    // In 2D and Columbus View, use the center of the tile for RTC rendering.
                    if (frameState.mode !== SceneMode.MORPHING) {
                        rtc = rtcScratch;
                        rtc.x = 0.0;
                        rtc.y = (tileRectangle.z + tileRectangle.x) * 0.5;
                        rtc.z = (tileRectangle.w + tileRectangle.y) * 0.5;
                        tileRectangle.x -= rtc.y;
                        tileRectangle.y -= rtc.z;
                        tileRectangle.z -= rtc.y;
                        tileRectangle.w -= rtc.z;
                    }

                    if (projection instanceof WebMercatorProjection) {
                        southLatitude = tile.rectangle.south;
                        northLatitude = tile.rectangle.north;

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
                Matrix4.setColumn(viewMatrix, 3, centerEye, modifiedModelViewScratch);

                var tileImageryCollection = tile.imagery;
                var imageryIndex = 0;
                var imageryLen = tileImageryCollection.length;

                do {
                    var numberOfDayTextures = 0;

                    ++tileCommandIndex;
                    var command = tileCommands[tileCommandIndex];
                    if (!defined(command)) {
                        command = new DrawCommand({
                            cull : false,
                            boundingVolume : new BoundingSphere()
                        });
                        tileCommands[tileCommandIndex] = command;
                        tileCommandUniformMaps[tileCommandIndex] = createTileUniformMap(globeUniformMap);
                    }
                    command.owner = tile;

                    command.debugShowBoundingVolume = (tile === surface._debug.boundingSphereTile);

                    var uniformMap = tileCommandUniformMaps[tileCommandIndex];

                    uniformMap.center3D = tile.center;

                    Cartesian4.clone(tileRectangle, uniformMap.tileRectangle);
                    uniformMap.southAndNorthLatitude.x = southLatitude;
                    uniformMap.southAndNorthLatitude.y = northLatitude;
                    uniformMap.southMercatorYLowAndHighAndOneOverHeight.x = southMercatorYLow;
                    uniformMap.southMercatorYLowAndHighAndOneOverHeight.y = southMercatorYHigh;
                    uniformMap.southMercatorYLowAndHighAndOneOverHeight.z = oneOverMercatorHeight;
                    Matrix4.clone(modifiedModelViewScratch, uniformMap.modifiedModelView);

                    var applyBrightness = false;
                    var applyContrast = false;
                    var applyHue = false;
                    var applySaturation = false;
                    var applyGamma = false;
                    var applyAlpha = false;

                    while (numberOfDayTextures < maxTextures && imageryIndex < imageryLen) {
                        var tileImagery = tileImageryCollection[imageryIndex];
                        var imagery = tileImagery.readyImagery;
                        ++imageryIndex;

                        if (!defined(imagery) || imagery.state !== ImageryState.READY || imagery.imageryLayer.alpha === 0.0) {
                            continue;
                        }

                        var imageryLayer = imagery.imageryLayer;

                        if (!defined(tileImagery.textureTranslationAndScale)) {
                            tileImagery.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(tile, tileImagery);
                        }

                        uniformMap.dayTextures[numberOfDayTextures] = imagery.texture;
                        uniformMap.dayTextureTranslationAndScale[numberOfDayTextures] = tileImagery.textureTranslationAndScale;
                        uniformMap.dayTextureTexCoordsRectangle[numberOfDayTextures] = tileImagery.textureCoordinateRectangle;

                        if (typeof imageryLayer.alpha === 'function') {
                            uniformMap.dayTextureAlpha[numberOfDayTextures] = imageryLayer.alpha(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                        } else {
                            uniformMap.dayTextureAlpha[numberOfDayTextures] = imageryLayer.alpha;
                        }
                        applyAlpha = applyAlpha || uniformMap.dayTextureAlpha[numberOfDayTextures] !== 1.0;

                        if (typeof imageryLayer.brightness === 'function') {
                            uniformMap.dayTextureBrightness[numberOfDayTextures] = imageryLayer.brightness(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                        } else {
                            uniformMap.dayTextureBrightness[numberOfDayTextures] = imageryLayer.brightness;
                        }
                        applyBrightness = applyBrightness || uniformMap.dayTextureBrightness[numberOfDayTextures] !== ImageryLayer.DEFAULT_BRIGHTNESS;

                        if (typeof imageryLayer.contrast === 'function') {
                            uniformMap.dayTextureContrast[numberOfDayTextures] = imageryLayer.contrast(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                        } else {
                            uniformMap.dayTextureContrast[numberOfDayTextures] = imageryLayer.contrast;
                        }
                        applyContrast = applyContrast || uniformMap.dayTextureContrast[numberOfDayTextures] !== ImageryLayer.DEFAULT_CONTRAST;

                        if (typeof imageryLayer.hue === 'function') {
                            uniformMap.dayTextureHue[numberOfDayTextures] = imageryLayer.hue(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                        } else {
                            uniformMap.dayTextureHue[numberOfDayTextures] = imageryLayer.hue;
                        }
                        applyHue = applyHue || uniformMap.dayTextureHue[numberOfDayTextures] !== ImageryLayer.DEFAULT_HUE;

                        if (typeof imageryLayer.saturation === 'function') {
                            uniformMap.dayTextureSaturation[numberOfDayTextures] = imageryLayer.saturation(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                        } else {
                            uniformMap.dayTextureSaturation[numberOfDayTextures] = imageryLayer.saturation;
                        }
                        applySaturation = applySaturation || uniformMap.dayTextureSaturation[numberOfDayTextures] !== ImageryLayer.DEFAULT_SATURATION;

                        if (typeof imageryLayer.gamma === 'function') {
                            uniformMap.dayTextureOneOverGamma[numberOfDayTextures] = 1.0 / imageryLayer.gamma(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                        } else {
                            uniformMap.dayTextureOneOverGamma[numberOfDayTextures] = 1.0 / imageryLayer.gamma;
                        }
                        applyGamma = applyGamma || uniformMap.dayTextureOneOverGamma[numberOfDayTextures] !== 1.0 / ImageryLayer.DEFAULT_GAMMA;

                        if (defined(imagery.credits)) {
                            var creditDisplay = frameState.creditDisplay;
                            var credits = imagery.credits;
                            for (var creditIndex = 0, creditLength = credits.length; creditIndex < creditLength; ++creditIndex) {
                                creditDisplay.addCredit(credits[creditIndex]);
                            }
                        }

                        ++numberOfDayTextures;
                    }

                    // trim texture array to the used length so we don't end up using old textures
                    // which might get destroyed eventually
                    uniformMap.dayTextures.length = numberOfDayTextures;
                    uniformMap.waterMask = tile.waterMaskTexture;
                    Cartesian4.clone(tile.waterMaskTranslationAndScale, uniformMap.waterMaskTranslationAndScale);

                    commandList.push(command);

                    command.shaderProgram = shaderSet.getShaderProgram(context, tileSetIndex, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha);
                    command.renderState = renderState;
                    command.primitiveType = PrimitiveType.TRIANGLES;
                    command.vertexArray = tile.vertexArray;
                    command.uniformMap = uniformMap;
                    command.pass = Pass.OPAQUE;

                    if (surface._debug.wireframe) {
                        createWireframeVertexArrayIfNecessary(context, surface, tile);
                        if (defined(tile.wireframeVertexArray)) {
                            command.vertexArray = tile.wireframeVertexArray;
                            command.primitiveType = PrimitiveType.LINES;
                        }
                    }

                    var boundingVolume = command.boundingVolume;

                    if (frameState.mode !== SceneMode.SCENE3D) {
                        BoundingSphere.fromRectangleWithHeights2D(tile.rectangle, frameState.mapProjection, tile.minimumHeight, tile.maximumHeight, boundingVolume);
                        Cartesian3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);

                        if (frameState.mode === SceneMode.MORPHING) {
                            boundingVolume = BoundingSphere.union(tile.boundingSphere3D, boundingVolume, boundingVolume);
                        }
                    } else {
                        BoundingSphere.clone(tile.boundingSphere3D, boundingVolume);
                    }

                } while (imageryIndex < imageryLen);
            }
        }

        // trim command list to the number actually needed
        tileCommands.length = Math.max(0, tileCommandIndex + 1);
    }

    function createWireframeVertexArrayIfNecessary(context, surface, tile) {
        if (defined(tile.wireframeVertexArray)) {
            return;
        }

        if (defined(tile.meshForWireframePromise)) {
            return;
        }

        tile.meshForWireframePromise = tile.terrainData.createMesh(surface._terrainProvider.tilingScheme, tile.x, tile.y, tile.level);
        if (!defined(tile.meshForWireframePromise)) {
            // deferrred
            return;
        }

        var vertexArray = tile.vertexArray;

        when(tile.meshForWireframePromise, function(mesh) {
            if (tile.vertexArray === vertexArray) {
                tile.wireframeVertexArray = createWireframeVertexArray(context, tile.vertexArray, mesh);
            }
            tile.meshForWireframePromise = undefined;
        });
    }

    function displayCredits(surface, frameState) {
        var creditDisplay = frameState.creditDisplay;
        var credit;

        if (surface._terrainProvider.ready) {
            credit = surface._terrainProvider.credit;
            if (defined(credit)) {
                creditDisplay.addCredit(credit);
            }
        }

        var imageryLayerCollection = surface._imageryLayerCollection;
        for ( var i = 0, len = imageryLayerCollection.length; i < len; ++i) {
            var layer = imageryLayerCollection.get(i);
            if (layer.show) {
                if (layer.imageryProvider.ready) {
                    credit = layer.imageryProvider.credit;
                    if (defined(credit)) {
                        creditDisplay.addCredit(credit);
                    }
                }
            }
        }
    }

    /**
     * Creates a vertex array for wireframe rendering of a terrain tile.
     *
     * @private
     *
     * @param {Context} context The context in which to create the vertex array.
     * @param {VertexArray} vertexArray The existing, non-wireframe vertex array.  The new vertex array
     *                      will share vertex buffers with this existing one.
     * @param {TerrainMesh} terrainMesh The terrain mesh containing non-wireframe indices.
     * @returns {VertexArray} The vertex array for wireframe rendering.
     */
    function createWireframeVertexArray(context, vertexArray, terrainMesh) {
        var geometry = {
            indices : terrainMesh.indices,
            primitiveType : PrimitiveType.TRIANGLES
        };

        GeometryPipeline.toWireframe(geometry);

        var wireframeIndices = geometry.indices;
        var wireframeIndexBuffer = context.createIndexBuffer(wireframeIndices, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
        return context.createVertexArray(vertexArray._attributes, wireframeIndexBuffer);
    }

    return GlobeSurface;
});
