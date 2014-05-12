/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/EllipsoidalOccluder',
        '../Core/getTimestamp',
        '../Core/Queue',
        './QuadtreeTileState',
        './SceneMode',
        './TileReplacementQueue'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        EllipsoidalOccluder,
        getTimestamp,
        Queue,
        QuadtreeTileState,
        SceneMode,
        TileReplacementQueue) {
    "use strict";

    var QuadtreePrimitive = function QuadtreePrimitive(description) {
        this._tileProvider = description.tileProvider;

        this._debug = {
                enableDebugOutput : false,
                wireframe : false,
                boundingSphereTile : undefined,

                maxDepth : 0,
                tilesVisited : 0,
                tilesCulled : 0,
                tilesRendered : 0,
                tilesWaitingForChildren : 0,

                lastMaxDepth : -1,
                lastTilesVisited : -1,
                lastTilesCulled : -1,
                lastTilesRendered : -1,
                lastTilesWaitingForChildren : -1,

                suspendLodUpdate : false
            };

        var tilingScheme = this._tileProvider.tilingScheme;
        var ellipsoid = tilingScheme.ellipsoid;

        this._tilesToRender = [];
        this._tileTraversalQueue = new Queue();
        this._tileLoadQueue = [];
        this._tileReplacementQueue = new TileReplacementQueue();
        this._levelZeroTiles = undefined;
        this._levelZeroTilesReady = false;
        this._ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid, Cartesian3.ZERO);
        this._maximumScreenSpaceError = 2;
    };

    QuadtreePrimitive.prototype.update = function(context, frameState, commandList) {
        selectTilesForRendering(this, context, frameState);
        processTileLoadQueue(this, context, frameState);
        createRenderCommandsForSelectedTiles(this, context, frameState, commandList);
    };

    var scratchCamera = new Cartographic();

    function selectTilesForRendering(QuadtreePrimitive, context, frameState) {
        var debug = QuadtreePrimitive._debug;

        if (debug.suspendLodUpdate) {
            return;
        }

        var i, j, len;

        // Clear the render list.
        var tilesToRender = QuadtreePrimitive._tilesToRender;
        tilesToRender.length = 0;

        var traversalQueue = QuadtreePrimitive._tileTraversalQueue;
        traversalQueue.clear();

        debug.maxDepth = 0;
        debug.tilesVisited = 0;
        debug.tilesCulled = 0;
        debug.tilesRendered = 0;
        debug.tilesWaitingForChildren = 0;

        QuadtreePrimitive._tileLoadQueue.length = 0;
        QuadtreePrimitive._tileReplacementQueue.markStartOfRenderFrame();

        var tileProvider = QuadtreePrimitive._tileProvider;
        var tilingScheme = tileProvider.tilingScheme;
        var yTiles = tilingScheme.getNumberOfYTilesAtLevel(0);
        var xTiles = tilingScheme.getNumberOfXTilesAtLevel(0);

        // We can't render anything before the level zero tiles exist.
        if (!defined(QuadtreePrimitive._levelZeroTiles)) {
            if (QuadtreePrimitive._tileProvider.ready) {
                var terrainTilingScheme = QuadtreePrimitive._tileProvider.tilingScheme;
                QuadtreePrimitive._levelZeroTiles = terrainTilingScheme.createLevelZeroQuadtreeTiles();
            } else {
                // Nothing to do until the provider is ready.
                return;
            }
        }

        var cameraPosition = frameState.camera.positionWC;

        var ellipsoid = QuadtreePrimitive._tileProvider.tilingScheme.ellipsoid;
        var cameraPositionCartographic = ellipsoid.cartesianToCartographic(cameraPosition, scratchCamera);

        QuadtreePrimitive._ellipsoidalOccluder.cameraPosition = cameraPosition;

        var tile;

        // Enqueue the root tiles that are renderable and visible.
        var levelZeroTiles = QuadtreePrimitive._levelZeroTiles;
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            tile = levelZeroTiles[i];
            QuadtreePrimitive._tileReplacementQueue.markTileRendered(tile);
            if (tileProvider.getTileState(tile.data) === QuadtreeTileState.LOADING) {
                queueTileLoad(QuadtreePrimitive, tile);
            }
            if (tileProvider.isTileRenderable(tile.data) && isTileVisible(QuadtreePrimitive, frameState, tile.data)) {
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

            QuadtreePrimitive._tileReplacementQueue.markTileRendered(tile);

            if (tile.level > debug.maxDepth) {
                debug.maxDepth = tile.level;
            }

            // There are a few different algorithms we could use here.
            // This one doesn't load children unless we refine to them.
            // We may want to revisit this in the future.

            if (screenSpaceError(QuadtreePrimitive, context, frameState, cameraPosition, cameraPositionCartographic, tile) < QuadtreePrimitive._maximumScreenSpaceError) {
                // This tile meets SSE requirements, so render it.
                addTileToRenderList(QuadtreePrimitive, tile);
            } else if (queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(QuadtreePrimitive, frameState, tile)) {
                // SSE is not good enough and children are loaded, so refine.
                var children = tile.children;
                // PERFORMANCE_IDEA: traverse children front-to-back so we can avoid sorting by distance later.
                for (i = 0, len = children.length; i < len; ++i) {
                    if (isTileVisible(QuadtreePrimitive, frameState, children[i].data)) {
                        traversalQueue.enqueue(children[i]);
                    } else {
                        ++debug.tilesCulled;
                    }
                }
            } else {
                ++debug.tilesWaitingForChildren;
                // SSE is not good enough but not all children are loaded, so render this tile anyway.
                addTileToRenderList(QuadtreePrimitive, tile);
            }
        }

        if (debug.enableDebugOutput) {
            if (debug.tilesVisited !== debug.lastTilesVisited ||
                debug.tilesRendered !== debug.lastTilesRendered ||
                debug.tilesCulled !== debug.lastTilesCulled ||
                debug.maxDepth !== debug.lastMaxDepth ||
                debug.tilesWaitingForChildren !== debug.lastTilesWaitingForChildren) {

                /*global console*/
                console.log('Visited ' + debug.tilesVisited + ', Rendered: ' + debug.tilesRendered + ', Culled: ' + debug.tilesCulled + ', Max Depth: ' + debug.maxDepth + ', Waiting for children: ' + debug.tilesWaitingForChildren);

                debug.lastTilesVisited = debug.tilesVisited;
                debug.lastTilesRendered = debug.tilesRendered;
                debug.lastTilesCulled = debug.tilesCulled;
                debug.lastMaxDepth = debug.maxDepth;
                debug.lastTilesWaitingForChildren = debug.tilesWaitingForChildren;
            }
        }
    }

    function screenSpaceError(QuadtreePrimitive, context, frameState, cameraPosition, cameraPositionCartographic, tile) {
        if (frameState.mode === SceneMode.SCENE2D) {
            return screenSpaceError2D(QuadtreePrimitive, context, frameState, cameraPosition, cameraPositionCartographic, tile);
        }

        var maxGeometricError = QuadtreePrimitive._tileProvider.getLevelMaximumGeometricError(tile.level);

        var distance = QuadtreePrimitive._tileProvider.getDistanceToTile(tile.data, frameState);
        tile.distance = distance;

        var height = context.drawingBufferHeight;

        var camera = frameState.camera;
        var frustum = camera.frustum;
        var fovy = frustum.fovy;

        // PERFORMANCE_IDEA: factor out stuff that's constant across tiles.
        return (maxGeometricError * height) / (2 * distance * Math.tan(0.5 * fovy));
    }

    function screenSpaceError2D(QuadtreePrimitive, context, frameState, cameraPosition, cameraPositionCartographic, tile) {
        var camera = frameState.camera;
        var frustum = camera.frustum;
        var width = context.getDrawingBufferWidth();
        var height = context.getDrawingBufferHeight();

        var maxGeometricError = QuadtreePrimitive._tileProvider.getLevelMaximumGeometricError(tile.level);
        var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(width, height);
        return maxGeometricError / pixelSize;
    }

    function addTileToRenderList(QuadtreePrimitive, tile) {
        QuadtreePrimitive._tilesToRender.push(tile);
        ++QuadtreePrimitive._debug.tilesRendered;
    }

    function isTileVisible(QuadtreePrimitive, frameState, tile) {
        return QuadtreePrimitive._tileProvider.isTileVisible(tile, frameState);
    }

    function queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(QuadtreePrimitive, frameState, tile) {
        var allRenderable = true;

        var tileProvider = QuadtreePrimitive._tileProvider;

        var children = tile.getChildren();
        for (var i = 0, len = children.length; i < len; ++i) {
            var child = children[i];
            QuadtreePrimitive._tileReplacementQueue.markTileRendered(child);
            if (tileProvider.getTileState(child.data) === QuadtreeTileState.LOADING) {
                queueTileLoad(QuadtreePrimitive, child);
            }
            if (!tileProvider.isTileRenderable(child.data)) {
                allRenderable = false;
            }
        }

        return allRenderable;
    }

    function queueTileLoad(QuadtreePrimitive, tile) {
        QuadtreePrimitive._tileLoadQueue.push(tile);
    }

    function processTileLoadQueue(QuadtreePrimitive, context, frameState) {
        var tileLoadQueue = QuadtreePrimitive._tileLoadQueue;
        var tileProvider = QuadtreePrimitive._tileProvider;

        if (tileLoadQueue.length === 0) {
            return;
        }

        // Remove any tiles that were not used this frame beyond the number
        // we're allowed to keep.
        QuadtreePrimitive._tileReplacementQueue.trimTiles(QuadtreePrimitive._tileCacheSize);

        var startTime = getTimestamp();
        var timeSlice = QuadtreePrimitive._loadQueueTimeSlice;
        var endTime = startTime + timeSlice;

        for (var len = tileLoadQueue.length - 1, i = len; i >= 0; --i) {
            var tile = tileLoadQueue[i];
            QuadtreePrimitive._tileReplacementQueue.markTileRendered(tile);
            tile.data = tileProvider.loadTile(context, frameState, tile.x, tile.y, tile.level, tile.data);
            if (getTimestamp() >= endTime) {
                break;
            }
        }
    }

    function createRenderCommandsForSelectedTiles(QuadtreePrimitive, context, frameState, commandList) {
        var tileProvider = QuadtreePrimitive._tileProvider;
        var tilesToRender = QuadtreePrimitive._tilesToRender;
        for (var i = 0, len = tilesToRender.length; i < len; ++i) {
            tileProvider.renderTile(tilesToRender[i].data, context, frameState, commandList);
        }
    }

    return QuadtreePrimitive;
});
