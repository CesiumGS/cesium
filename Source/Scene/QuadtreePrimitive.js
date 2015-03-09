/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/getTimestamp',
        '../Core/Queue',
        '../Core/Rectangle',
        '../Core/Visibility',
        './QuadtreeOccluders',
        './QuadtreeTile',
        './QuadtreeTileLoadState',
        './SceneMode',
        './TileReplacementQueue'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        getTimestamp,
        Queue,
        Rectangle,
        Visibility,
        QuadtreeOccluders,
        QuadtreeTile,
        QuadtreeTileLoadState,
        SceneMode,
        TileReplacementQueue) {
    "use strict";

    /**
     * Renders massive sets of data by utilizing level-of-detail and culling.  The globe surface is divided into
     * a quadtree of tiles with large, low-detail tiles at the root and small, high-detail tiles at the leaves.
     * The set of tiles to render is selected by projecting an estimate of the geometric error in a tile onto
     * the screen to estimate screen-space error, in pixels, which must be below a user-specified threshold.
     * The actual content of the tiles is arbitrary and is specified using a {@link QuadtreeTileProvider}.
     *
     * @alias QuadtreePrimitive
     * @constructor
     * @private
     *
     * @param {QuadtreeTileProvider} options.tileProvider The tile provider that loads, renders, and estimates
     *        the distance to individual tiles.
     * @param {Number} [options.maximumScreenSpaceError=2] The maximum screen-space error, in pixels, that is allowed.
     *        A higher maximum error will render fewer tiles and improve performance, while a lower
     *        value will improve visual quality.
     * @param {Number} [options.tileCacheSize=100] The maximum number of tiles that will be retained in the tile cache.
     *        Note that tiles will never be unloaded if they were used for rendering the last
     *        frame, so the actual number of resident tiles may be higher.  The value of
     *        this property will not affect visual quality.
     */
    var QuadtreePrimitive = function QuadtreePrimitive(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.tileProvider)) {
            throw new DeveloperError('options.tileProvider is required.');
        }
        if (defined(options.tileProvider.quadtree)) {
            throw new DeveloperError('A QuadtreeTileProvider can only be used with a single QuadtreePrimitive');
        }
        //>>includeEnd('debug');

        this._tileProvider = options.tileProvider;
        this._tileProvider.quadtree = this;

        this._debug = {
            enableDebugOutput : false,

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

            suspendLodUpdate : false,

            recordLoadEvents : false,
            loadEvents : []
        };

        var tilingScheme = this._tileProvider.tilingScheme;
        var ellipsoid = tilingScheme.ellipsoid;

        this._tilesToRender = [];
        this._tileTraversalQueue = new Queue();
        this._tileLoadQueue = [];
        this._tileReplacementQueue = new TileReplacementQueue();
        this._levelZeroTiles = undefined;
        this._levelZeroTilesReady = false;
        this._loadQueueTimeSlice = 5.0;

        this._frameNumber = 0;

        /**
         * Gets or sets the maximum screen-space error, in pixels, that is allowed.
         * A higher maximum error will render fewer tiles and improve performance, while a lower
         * value will improve visual quality.
         * @type {Number}
         * @default 2
         */
        this.maximumScreenSpaceError = defaultValue(options.maximumScreenSpaceError, 2);

        /**
         * Gets or sets the maximum number of tiles that will be retained in the tile cache.
         * Note that tiles will never be unloaded if they were used for rendering the last
         * frame, so the actual number of resident tiles may be higher.  The value of
         * this property will not affect visual quality.
         * @type {Number}
         * @default 100
         */
        this.tileCacheSize = defaultValue(options.tileCacheSize, 100);

        this._occluders = new QuadtreeOccluders({
            ellipsoid : ellipsoid
        });
    };

    defineProperties(QuadtreePrimitive.prototype, {
        /**
         * Gets the provider of {@link QuadtreeTile} instances for this quadtree.
         * @type {QuadtreeTile}
         * @memberof QuadtreePrimitive.prototype
         */
        tileProvider : {
            get : function() {
                return this._tileProvider;
            }
        }
    });

    /**
     * Invalidates and frees all the tiles in the quadtree.  The tiles must be reloaded
     * before they can be displayed.
     *
     * @memberof QuadtreePrimitive
     */
    QuadtreePrimitive.prototype.invalidateAllTiles = function() {
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
    };

    /**
     * Invokes a specified function for each {@link QuadtreeTile} that is partially
     * or completely loaded.
     *
     * @param {Function} tileFunction The function to invoke for each loaded tile.  The
     *        function is passed a reference to the tile as its only parameter.
     */
    QuadtreePrimitive.prototype.forEachLoadedTile = function(tileFunction) {
        var tile = this._tileReplacementQueue.head;
        while (defined(tile)) {
            if (tile.state !== QuadtreeTileLoadState.START) {
                tileFunction(tile);
            }
            tile = tile.replacementNext;
        }
    };

    /**
     * Invokes a specified function for each {@link QuadtreeTile} that was rendered
     * in the most recent frame.
     *
     * @param {Function} tileFunction The function to invoke for each rendered tile.  The
     *        function is passed a reference to the tile as its only parameter.
     */
    QuadtreePrimitive.prototype.forEachRenderedTile = function(tileFunction) {
        var tilesRendered = this._tilesToRender;
        for (var i = 0, len = tilesRendered.length; i < len; ++i) {
            tileFunction(tilesRendered[i]);
        }
    };

    /**
     * Updates the primitive.
     *
     * @param {Context} context The rendering context to use.
     * @param {FrameState} frameState The state of the current frame.
     * @param {DrawCommand[]} commandList The list of draw commands.  The primitive will usually add
     *        commands to this array during the update call.
     */
    QuadtreePrimitive.prototype.update = function(context, frameState, commandList) {
        ++this._frameNumber;

        this._tileProvider.beginUpdate(context, frameState, commandList);

        selectTilesForRendering(this, context, frameState);
        processTileLoadQueue(this, context, frameState);
        createRenderCommandsForSelectedTiles(this, context, frameState, commandList);

        this._tileProvider.endUpdate(context, frameState, commandList);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof QuadtreePrimitive
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see QuadtreePrimitive#destroy
     */
    QuadtreePrimitive.prototype.isDestroyed = function() {
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
     * @memberof QuadtreePrimitive
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see QuadtreePrimitive#isDestroyed
     *
     * @example
     * primitive = primitive && primitive.destroy();
     */
    QuadtreePrimitive.prototype.destroy = function() {
        this._tileProvider = this._tileProvider && this._tileProvider.destroy();
    };

    var greatGrandChildrenScratch = [];

    function selectTilesForRendering(primitive, context, frameState) {
        var debug = primitive._debug;

        if (debug.suspendLodUpdate) {
            return;
        }

        var i;
        var len;

        // Clear the render list.
        var tilesToRender = primitive._tilesToRender;
        tilesToRender.length = 0;

        debug.maxDepth = 0;
        debug.tilesVisited = 0;
        debug.tilesCulled = 0;
        debug.tilesRendered = 0;
        debug.tilesWaitingForChildren = 0;

        primitive._tileLoadQueue.length = 0;
        primitive._tileReplacementQueue.markStartOfRenderFrame();

        // We can't render anything before the level zero tiles exist.
        if (!defined(primitive._levelZeroTiles)) {
            if (primitive._tileProvider.ready) {
                var terrainTilingScheme = primitive._tileProvider.tilingScheme;
                primitive._levelZeroTiles = QuadtreeTile.createLevelZeroTiles(terrainTilingScheme);
            } else {
                // Nothing to do until the provider is ready.
                return;
            }
        }

        primitive._occluders.ellipsoid.cameraPosition = frameState.camera.positionWC;

        var tileProvider = primitive._tileProvider;
        var occluders = primitive._occluders;


        var traversalQueue = primitive._tileTraversalQueue;
        traversalQueue.clear();

        var tile;

        // Select tiles in two passes:
        //   First pass, depth first, to depth that meets SSE:
        //     * Compute tile visibility (possibly estimated if the tile is not yet loaded)
        //     * Compute estimated distance to tile
        //     * Determine if a given tile is the deepest that completely covers the visible portion of its extent and
        //       set its _render flag if so.
        //     * Queue loading of all tiles along the way.
        //     * Record leaf tiles (those at meet the SSE) that are visible but not yet fully loaded.
        //   Second pass:
        //     * Count visible leaves.  If less than or equal to 16, all leaves get load priority.
        //     * Otherwise, get the unique parent of each leaf and count those.
        //     * Repeat until the number of tiles is less than 16 or equal to, and give them load priority

        var visibleNonRenderableLeafTiles = [];

        // First pass.
        var levelZeroTiles = primitive._levelZeroTiles;
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            tile = levelZeroTiles[i];
            tile._covered = visitTile(primitive, tile, tileProvider, occluders, context, frameState, visibleNonRenderableLeafTiles);
        }

        // First pass: mark the visible, non-renderable leaf tiles as high priority for load.
        // TODO: if there are too many of them, we should consider loading their parents instead.
        for (i = 0, len = visibleNonRenderableLeafTiles; i < len; ++i) {
            tile = visibleNonRenderableLeafTiles[i];
            tile._highPriorityForLoad = true;
        }

        // Second pass
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            tile = levelZeroTiles[i];
            if (tile._covered) {
                visitTileToAddToRenderList(primitive, tile, tilesToRender);
            }
        }
    }

    function visitTileToAddToRenderList(primitive, tile, tilesToRender) {
        if (tile._render) {
            tilesToRender.push(tile);
            return;
        }

        var children = tile.children;
        for (var i = 0, len = children.length; i < len; ++i) {
            visitTileToAddToRenderList(primitive, children[i], tilesToRender);
        }
    }

    // returns true if the visited tile or its children completely cover the visible extent of this tile
    // with renderable tiles.
    function visitTile(primitive, tile, tileProvider, occluders, context, frameState, visibleNonRenderableLeafTiles) {
        // Initially assume we will not render this tile and it is not high priority for load.
        tile._render = false;
        tile._highPriorityForLoad = false;

        primitive._tileReplacementQueue.markTileRendered(tile); // TODO: rename to markTileVisited

        if (tile.needsLoading) {
            queueTileLoad(primitive, tile);
        }

        if (tileProvider.computeTileVisibility(tile, frameState, occluders) === Visibility.NONE) {
            ++primitive._debug.tilesCulled;
            return true;
        }

        tile._distance = primitive._tileProvider.computeDistanceToTile(tile, frameState);
        var sse = screenSpaceError(primitive, context, frameState, tile);
        if (sse < primitive.maximumScreenSpaceError) {
            if (tile.renderable) {
                tile._render = true;
                tile._highPriorityForLoad = true;
                return true;
            } else {
                visibleNonRenderableLeafTiles.push(tile);
                return false;
            }
        } else {
            var covered = true;

            var children = tile.children;
            for (var i = 0, len = children.length; i < len; ++i) {
                covered = visitTile(primitive, children[i], tileProvider, occluders, context, frameState, visibleNonRenderableLeafTiles) && covered;
            }

            // If this tile's children do not cover its extent, render this tile if we can and report that we're
            // covered.  If this tile is not renderable, we're not covered.
            if (!covered) {
                covered = tile._render = tile.renderable;
            }

            return covered;
        }
    }

        // // Enqueue the root tiles that are renderable and visible.
        // var levelZeroTiles = primitive._levelZeroTiles;
        // for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
        //     tile = levelZeroTiles[i];
        //     primitive._tileReplacementQueue.markTileRendered(tile);
        //     if (tile.needsLoading) {
        //         queueTileLoad(primitive, tile);
        //     }
        //     if (tile.renderable && tileProvider.computeTileVisibility(tile, frameState, occluders) !== Visibility.NONE) {
        //         traversalQueue.enqueue(tile);
        //     } else {
        //         ++debug.tilesCulled;
        //         if (!tile.renderable) {
        //             ++debug.tilesWaitingForChildren;
        //         }
        //     }
        // }

        // // Traverse the tiles in breadth-first order
        // while (defined((tile = traversalQueue.dequeue()))) {
        //     ++debug.tilesVisited;

        //     primitive._tileReplacementQueue.markTileRendered(tile);

        //     if (tile.level > debug.maxDepth) {
        //         debug.maxDepth = tile.level;
        //     }

        //     var sse = screenSpaceError(primitive, context, frameState, tile);

        //     if (sse < primitive.maximumScreenSpaceError) {
        //         // This tile meets SSE requirements, so render it.
        //         addTileToRenderList(primitive, tile);
        //     } else {
        //         // Tile does not meet SSE requirements, so render children if possible.
        //         var allVisibleAreRenderable = true;
        //         var allRenderableAndVisibleAreUpsampledOnly = true;

        //         var children = tile.children;

        //         var descendants = [tile];
        //         var descendant;

        //         do {
        //             var lastAllVisibleAreRenderable = allVisibleAreRenderable;
        //             var lastAllRenderableAndVisibleAreUpsampledOnly = allRenderableAndVisibleAreUpsampledOnly;
        //             allVisibleAreRenderable = true;
        //             allRenderableAndVisibleAreUpsampledOnly = true;

        //             var nextDescendants = [];

        //             for (var j = 0, jlen = descendants.length; j < jlen; ++j) {
        //                 var parent = descendants[j];

        //                 children = parent.children;
        //                 for (i = 0, len = children.length; i < len; ++i) {
        //                     descendant = children[i];

        //                     primitive._tileReplacementQueue.markTileRendered(descendant);

        //                     var visible = tileProvider.computeTileVisibility(descendant, frameState, occluders) !== Visibility.NONE;
        //                     descendant._isVisible = false; // for low load priority.  TODO: do this a clearer way.

        //                     if (descendant.needsLoading) {
        //                         queueTileLoad(primitive, descendant);
        //                     }

        //                     descendant._distance = primitive._tileProvider.computeDistanceToTile(descendant, frameState);
        //                     sse = Math.min(sse, screenSpaceError(primitive, context, frameState, descendant));

        //                     allVisibleAreRenderable = allVisibleAreRenderable && (descendant.renderable || !visible);

        //                     var renderableAndVisible = descendant.renderable && visible;
        //                     allRenderableAndVisibleAreUpsampledOnly = allRenderableAndVisibleAreUpsampledOnly && (!renderableAndVisible || descendant.upsampledFromParent);

        //                     if (visible) {
        //                         nextDescendants.push(descendant);
        //                     }
        //                 }
        //             }

        //             if (allVisibleAreRenderable && allRenderableAndVisibleAreUpsampledOnly) {
        //                 if (descendants.length !== 0 || descendants[0] !== tile) {
        //                     allRenderableAndVisibleAreUpsampledOnly = lastAllRenderableAndVisibleAreUpsampledOnly;
        //                     allVisibleAreRenderable = lastAllVisibleAreRenderable;
        //                 }
        //                 break;
        //             }

        //             descendants = nextDescendants;
        //         } while (sse > primitive.maximumScreenSpaceError && descendants.length > 0 && descendants.length < 16);

        //         for (i = 0, len = descendants.length; i < len; ++i) {
        //             descendant = descendants[i];
        //             descendant._isVisible = true; // for high priority loading.
        //         }

        //         if (allRenderableAndVisibleAreUpsampledOnly) {
        //             // Rendering descendants rather than this tile would add nothing, because all renderable children were just upsampled from this tile.
        //             // So render this tile.
        //             addTileToRenderList(primitive, tile);
        //         } else if (allVisibleAreRenderable) {
        //             // Render visible descendants instead of this tile.
        //             for (i = 0, len = descendants.length; i < len; ++i) {
        //                 descendant = descendants[i];
        //                 traversalQueue.enqueue(descendant);
        //             }
        //         } else {
        //             // Some of the visibile children are not renderable yet, so render the parent for now.
        //             ++debug.tilesWaitingForChildren;
        //             addTileToRenderList(primitive, tile);
        //         }
        //     }
        // }
    //}

    function screenSpaceError(primitive, context, frameState, tile) {
        if (frameState.mode === SceneMode.SCENE2D) {
            return screenSpaceError2D(primitive, context, frameState, tile);
        }

        var maxGeometricError = primitive._tileProvider.getLevelMaximumGeometricError(tile.level);

        var height = context.drawingBufferHeight;

        var camera = frameState.camera;
        var frustum = camera.frustum;
        var fovy = frustum.fovy;

        // PERFORMANCE_IDEA: factor out stuff that's constant across tiles.
        return (maxGeometricError * height) / (2 * tile._distance * Math.tan(0.5 * fovy));
    }

    function screenSpaceError2D(primitive, context, frameState, tile) {
        var camera = frameState.camera;
        var frustum = camera.frustum;
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var maxGeometricError = primitive._tileProvider.getLevelMaximumGeometricError(tile.level);
        var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(width, height);
        return maxGeometricError / pixelSize;
    }

    function addTileToRenderList(primitive, tile) {
        primitive._tilesToRender.push(tile);
        ++primitive._debug.tilesRendered;
    }

    function queueTileLoad(primitive, tile) {
        tile._wasAddedToLoadQueue = true;
        primitive._tileLoadQueue.push(tile);
    }

    function processTileLoadQueue(primitive, context, frameState) {
        var tileLoadQueue = primitive._tileLoadQueue;
        var tileProvider = primitive._tileProvider;

        if (tileLoadQueue.length === 0) {
            return;
        }

        tileLoadQueue.sort(tileLoadSortFunction);

        var len, i, tile;

        // Remove any tiles that were not used this frame beyond the number
        // we're allowed to keep.
        primitive._tileReplacementQueue.trimTiles(primitive.tileCacheSize);

        var startTime = getTimestamp();
        var timeSlice = primitive._loadQueueTimeSlice;
        var endTime = startTime + timeSlice;

        for (len = tileLoadQueue.length - 1, i = len; i >= 0; --i) {
            tile = tileLoadQueue[i];
            primitive._tileReplacementQueue.markTileRendered(tile);
            tileProvider.loadTile(context, frameState, tile);
            if (getTimestamp() >= endTime) {
                break;
            }
        }

        if (primitive._debug.recordLoadEvents) {
            var now = getTimestamp();

            var events = primitive._debug.loadEvents;
            for (len = tileLoadQueue.length - 1, i = len; i >= 0; --i) {
                tile = tileLoadQueue[i];
                events.push({
                    tile: 'L' + tile.level + 'X' + tile.x + 'Y' + tile.y,
                    rectangle: tile.rectangle,
                    time: now,
                    distance: tile._distance,
                    isVisible: tile._isVisible,
                    done: tile.state === QuadtreeTileLoadState.DONE,
                    failed: tile.state === QuadtreeTileLoadState.FAILED
                });
            }
        }
    }

    function tileLoadSortFunction(a, b) {
        var aHighPriority = a._highPriorityForLoad ? 1 : 0;
        var bHighPriority = b._highPriorityForLoad ? 1 : 0;
        var aMinusB = aHighPriority - bHighPriority;
        if (aMinusB !== 0) {
            return aMinusB;
        } else {
            return b._distance - a._distance;
        }
    }

    function tileDistanceSortFunction(a, b) {
        return a._distance - b._distance;
    }

    function createRenderCommandsForSelectedTiles(primitive, context, frameState, commandList) {
        var tileProvider = primitive._tileProvider;
        var tilesToRender = primitive._tilesToRender;

        tilesToRender.sort(tileDistanceSortFunction);

        for (var i = 0, len = tilesToRender.length; i < len; ++i) {
            tileProvider.showTileThisFrame(tilesToRender[i], context, frameState, commandList);
        }
    }

    return QuadtreePrimitive;
});
