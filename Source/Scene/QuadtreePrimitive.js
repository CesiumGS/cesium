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

        var levelZeroTiles = primitive._levelZeroTiles;
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            tile = levelZeroTiles[i];
            if (tile.needsLoading) {
                queueTileLoad(primitive, tile);
            } else {
                visitTile(primitive, tile, tileProvider, occluders, context, frameState);
            }
        }
    }

    function visitTile(primitive, tile, tileProvider, occluders, context, frameState) {
        primitive._tileReplacementQueue.markTileRendered(tile); // TODO: rename to markTileVisited

        // Give the provider a chance to update the tile this frame.
        tileProvider.visitTileDepthFirst(tile);

        if (tile.needsLoading) {
            // Initially assume this tile is not high priorty for load.
            tile._highPriorityForLoad = false;

            queueTileLoad(primitive, tile);
        }

        // If the tile is not visible, consider it no more.
        if (tileProvider.computeTileVisibility(tile, frameState, occluders) === Visibility.NONE) {
            ++primitive._debug.tilesCulled;
            return;
        }

        // Give the provider another chance to update this tile, now that it is known to be visible.
        tileProvider.visitVisibleTileDepthFirst(tile);

        // Determine if this tile meets our error requirements.
        tile._distance = tileProvider.computeDistanceToTile(tile, frameState);
        var sse = screenSpaceError(primitive, context, frameState, tile);
        if (sse < primitive.maximumScreenSpaceError) {
            // It does, so render it.
            tile._highPriorityForLoad = true;
            addTileToRenderList(primitive, tile);
        } else {
            // Tile does not meet error requirements, so render children instead (if possible).
            var children = tile.children;
            var childrenRenderable = true;
            var i, len;
            for (i = 0, len = children.length; childrenRenderable && i < len; ++i) {
                childrenRenderable = children[i].renderable;
            }

            if (childrenRenderable) {
                // Children are renderable, so visit them instead.
                for (i = 0, len = children.length; i < len; ++i) {
                    visitTile(primitive, children[i], tileProvider, occluders, context, frameState);
                }
            } else {
                // Children are not renderable, so render this tile even though it doesn't meet
                // error requirements.
                for (i = 0, len = children.length; i < len; ++i) {
                    var child = children[i];
                    primitive._tileReplacementQueue.markTileRendered(child); // TODO: rename to markTileVisited
                    if (child.needsLoading) {
                        queueTileLoad(primitive, child);
                        child._highPriorityForLoad = true;
                    }
                }

                tile._highPriorityForLoad = true;
                addTileToRenderList(primitive, tile);
            }
        }
    }

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
