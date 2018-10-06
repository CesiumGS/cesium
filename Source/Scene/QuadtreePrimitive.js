define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/getTimestamp',
        '../Core/Math',
        '../Core/OrthographicFrustum',
        '../Core/OrthographicOffCenterFrustum',
        '../Core/Ray',
        '../Core/Rectangle',
        '../Core/Visibility',
        './QuadtreeOccluders',
        './QuadtreeTile',
        './QuadtreeTileLoadState',
        './SceneMode',
        './TileReplacementQueue',
        './TileSelectionResult'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        getTimestamp,
        CesiumMath,
        OrthographicFrustum,
        OrthographicOffCenterFrustum,
        Ray,
        Rectangle,
        Visibility,
        QuadtreeOccluders,
        QuadtreeTile,
        QuadtreeTileLoadState,
        SceneMode,
        TileReplacementQueue,
        TileSelectionResult) {
    'use strict';

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
    function QuadtreePrimitive(options) {
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

            suspendLodUpdate : false
        };

        var tilingScheme = this._tileProvider.tilingScheme;
        var ellipsoid = tilingScheme.ellipsoid;

        this._tilesToRender = [];
        this._nearestRenderableTiles = [];
        this._tileLoadQueueHigh = []; // high priority tiles are preventing refinement
        this._tileLoadQueueMedium = []; // medium priority tiles are being rendered
        this._tileLoadQueueLow = []; // low priority tiles were refined past or are non-visible parts of quads.
        this._tileReplacementQueue = new TileReplacementQueue();
        this._levelZeroTiles = undefined;
        this._loadQueueTimeSlice = 5.0;
        this._tilesInvalidated = false;

        this._addHeightCallbacks = [];
        this._removeHeightCallbacks = [];

        this._tileToUpdateHeights = [];
        this._lastTileIndex = 0;
        this._updateHeightsTimeSlice = 2.0;

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

        /**
         * Gets or sets the number of loading descendant tiles that is considered "too many".
         * If a tile has too many loading descendants, that tile will be loaded and rendered before any of
         * its descendants are loaded and rendered. This means more feedback for the user that something
         * is happening at the cost of a longer overall load time. Setting this to 0 will cause each
         * tile level to be loaded successively, significantly increasing load time. Setting it to a large
         * number (e.g. 100000) will minimize the number of tiles that are loaded but tend to make
         * detail appear all at once after a long wait.
         * @type {Number}
         * @default 20
         */
        this.loadingDescendantLimit = 20;

        /**
         * Gets or sets a value indicating whether the ancestors of rendered tiles should be preloaded.
         * Setting this to true optimizes the zoom-out experience and provides more detail in
         * newly-exposed areas when panning. The down side is that it requires loading more tiles.
         * @type {Boolean}
         * @default false
         */
        this.preloadAncestors = false;

        /**
         * Gets or sets a value indicating whether the siblings of rendered tiles should be preloaded.
         * Setting this to true causes tiles with the same parent as a rendered tile to be loaded, even
         * if they are culled. Setting this to true may provide a better panning experience at the
         * cost of loading more tiles.
         */
        this.preloadSiblings = false;

        this._occluders = new QuadtreeOccluders({
            ellipsoid : ellipsoid
        });

        this._tileLoadProgressEvent = new Event();
        this._lastTileLoadQueueLength = 0;

        this._lastSelectionFrameNumber = undefined;
    }

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
        },
        /**
         * Gets an event that's raised when the length of the tile load queue has changed since the last render frame.  When the load queue is empty,
         * all terrain and imagery for the current view have been loaded.  The event passes the new length of the tile load queue.
         *
         * @memberof QuadtreePrimitive.prototype
         * @type {Event}
         */
        tileLoadProgressEvent : {
            get : function() {
                return this._tileLoadProgressEvent;
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
        this._tilesInvalidated = true;
    };

    function invalidateAllTiles(primitive) {
        // Clear the replacement queue
        var replacementQueue = primitive._tileReplacementQueue;
        replacementQueue.head = undefined;
        replacementQueue.tail = undefined;
        replacementQueue.count = 0;

        clearTileLoadQueue(primitive);

        // Free and recreate the level zero tiles.
        var levelZeroTiles = primitive._levelZeroTiles;
        if (defined(levelZeroTiles)) {
            for (var i = 0; i < levelZeroTiles.length; ++i) {
                var tile = levelZeroTiles[i];
                var customData = tile.customData;
                var customDataLength = customData.length;

                for (var j = 0; j < customDataLength; ++j) {
                    var data = customData[j];
                    data.level = 0;
                    primitive._addHeightCallbacks.push(data);
                }

                levelZeroTiles[i].freeResources();
            }
        }

        primitive._levelZeroTiles = undefined;

        primitive._tileProvider.cancelReprojections();
    }

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
     * Calls the callback when a new tile is rendered that contains the given cartographic. The only parameter
     * is the cartesian position on the tile.
     *
     * @param {Cartographic} cartographic The cartographic position.
     * @param {Function} callback The function to be called when a new tile is loaded containing cartographic.
     * @returns {Function} The function to remove this callback from the quadtree.
     */
    QuadtreePrimitive.prototype.updateHeight = function(cartographic, callback) {
        var primitive = this;
        var object = {
            positionOnEllipsoidSurface : undefined,
            positionCartographic : cartographic,
            level : -1,
            callback : callback
        };

        object.removeFunc = function() {
            var addedCallbacks = primitive._addHeightCallbacks;
            var length = addedCallbacks.length;
            for (var i = 0; i < length; ++i) {
                if (addedCallbacks[i] === object) {
                    addedCallbacks.splice(i, 1);
                    break;
                }
            }
            primitive._removeHeightCallbacks.push(object);
        };

        primitive._addHeightCallbacks.push(object);
        return object.removeFunc;
    };

    /**
     * Updates the tile provider imagery and continues to process the tile load queue.
     * @private
     */
    QuadtreePrimitive.prototype.update = function(frameState) {
        if (defined(this._tileProvider.update)) {
            this._tileProvider.update(frameState);
        }
    };

    function clearTileLoadQueue(primitive) {
        var debug = primitive._debug;
        debug.maxDepth = 0;
        debug.tilesVisited = 0;
        debug.tilesCulled = 0;
        debug.tilesRendered = 0;
        debug.tilesWaitingForChildren = 0;

        primitive._tileLoadQueueHigh.length = 0;
        primitive._tileLoadQueueMedium.length = 0;
        primitive._tileLoadQueueLow.length = 0;
    }

    /**
     * Initializes values for a new render frame and prepare the tile load queue.
     * @private
     */
    QuadtreePrimitive.prototype.beginFrame = function(frameState) {
        var passes = frameState.passes;
        if (!passes.render) {
            return;
        }

        if (this._tilesInvalidated) {
            invalidateAllTiles(this);
            this._tilesInvalidated = false;
        }

        // Gets commands for any texture re-projections
        this._tileProvider.initialize(frameState);

        if (this._debug.suspendLodUpdate) {
            return;
        }

        clearTileLoadQueue(this);
        this._tileReplacementQueue.markStartOfRenderFrame();
    };

    /**
     * Selects new tiles to load based on the frame state and creates render commands.
     * @private
     */
    QuadtreePrimitive.prototype.render = function(frameState) {
        var passes = frameState.passes;
        var tileProvider = this._tileProvider;

        if (passes.render) {
            tileProvider.beginUpdate(frameState);

            selectTilesForRendering(this, frameState);
            createRenderCommandsForSelectedTiles(this, frameState);

            tileProvider.endUpdate(frameState);
        }

        if (passes.pick && this._tilesToRender.length > 0) {
            tileProvider.updateForPick(frameState);
        }
    };

    /**
     * Checks if the load queue length has changed since the last time we raised a queue change event - if so, raises
     * a new change event at the end of the render cycle.
     */
    function updateTileLoadProgress(primitive, frameState) {
        var currentLoadQueueLength = primitive._tileLoadQueueHigh.length + primitive._tileLoadQueueMedium.length + primitive._tileLoadQueueLow.length;

        if (currentLoadQueueLength !== primitive._lastTileLoadQueueLength || primitive._tilesInvalidated) {
            frameState.afterRender.push(Event.prototype.raiseEvent.bind(primitive._tileLoadProgressEvent, currentLoadQueueLength));
            primitive._lastTileLoadQueueLength = currentLoadQueueLength;
        }

        var debug = primitive._debug;
        if (debug.enableDebugOutput  && !debug.suspendLodUpdate) {
            if (debug.tilesVisited !== debug.lastTilesVisited ||
                debug.tilesRendered !== debug.lastTilesRendered ||
                debug.tilesCulled !== debug.lastTilesCulled ||
                debug.maxDepth !== debug.lastMaxDepth ||
                debug.tilesWaitingForChildren !== debug.lastTilesWaitingForChildren) {

                console.log('Visited ' + debug.tilesVisited + ', Rendered: ' + debug.tilesRendered + ', Culled: ' + debug.tilesCulled + ', Max Depth: ' + debug.maxDepth + ', Waiting for children: ' + debug.tilesWaitingForChildren);

                debug.lastTilesVisited = debug.tilesVisited;
                debug.lastTilesRendered = debug.tilesRendered;
                debug.lastTilesCulled = debug.tilesCulled;
                debug.lastMaxDepth = debug.maxDepth;
                debug.lastTilesWaitingForChildren = debug.tilesWaitingForChildren;
            }
        }
    }

    /**
     * Updates terrain heights.
     * @private
     */
    QuadtreePrimitive.prototype.endFrame = function(frameState) {
        var passes = frameState.passes;
        if (!passes.render || frameState.mode === SceneMode.MORPHING) {
            // Only process the load queue for a single pass.
            // Don't process the load queue or update heights during the morph flights.
            return;
        }

        // Load/create resources for terrain and imagery. Prepare texture re-projections for the next frame.
        processTileLoadQueue(this, frameState);
        updateHeights(this, frameState);
        updateTileLoadProgress(this, frameState);
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
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * primitive = primitive && primitive.destroy();
     *
     * @see QuadtreePrimitive#isDestroyed
     */
    QuadtreePrimitive.prototype.destroy = function() {
        this._tileProvider = this._tileProvider && this._tileProvider.destroy();
    };

    var comparisonPoint;
    var centerScratch = new Cartographic();
    function compareDistanceToPoint(a, b) {
        var center = Rectangle.center(a.rectangle, centerScratch);
        var alon = center.longitude - comparisonPoint.longitude;
        var alat = center.latitude - comparisonPoint.latitude;

        center = Rectangle.center(b.rectangle, centerScratch);
        var blon = center.longitude - comparisonPoint.longitude;
        var blat = center.latitude - comparisonPoint.latitude;

        return (alon * alon + alat * alat) - (blon * blon + blat * blat);
    }

    var rootTraversalDetails = [];

    function selectTilesForRendering(primitive, frameState) {
        var debug = primitive._debug;
        if (debug.suspendLodUpdate) {
            return;
        }

        // Clear the render list.
        var tilesToRender = primitive._tilesToRender;
        tilesToRender.length = 0;
        primitive._nearestRenderableTiles.length = 0;

        // We can't render anything before the level zero tiles exist.
        var i;
        var tileProvider = primitive._tileProvider;
        if (!defined(primitive._levelZeroTiles)) {
            if (tileProvider.ready) {
                var tilingScheme = tileProvider.tilingScheme;
                primitive._levelZeroTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
                var numberOfRootTiles = primitive._levelZeroTiles.length;
                if (rootTraversalDetails.length < numberOfRootTiles) {
                    rootTraversalDetails = new Array(numberOfRootTiles);
                    for (i = 0; i < numberOfRootTiles; ++i) {
                        if (rootTraversalDetails[i] === undefined) {
                            rootTraversalDetails[i] = new TraversalDetails();
                        }
                    }
                }
            } else {
                // Nothing to do until the provider is ready.
                return;
            }
        }

        primitive._occluders.ellipsoid.cameraPosition = frameState.camera.positionWC;

        var tile;
        var levelZeroTiles = primitive._levelZeroTiles;
        var occluders = levelZeroTiles.length > 1 ? primitive._occluders : undefined;

        // Sort the level zero tiles by the distance from the center to the camera.
        // The level zero tiles aren't necessarily a nice neat quad, so we can't use the
        // quadtree ordering we use elsewhere in the tree
        comparisonPoint = frameState.camera.positionCartographic;
        levelZeroTiles.sort(compareDistanceToPoint);

        var customDataAdded = primitive._addHeightCallbacks;
        var customDataRemoved = primitive._removeHeightCallbacks;
        var frameNumber = frameState.frameNumber;

        var len;
        if (customDataAdded.length > 0 || customDataRemoved.length > 0) {
            for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
                tile = levelZeroTiles[i];
                tile._updateCustomData(frameNumber, customDataAdded, customDataRemoved);
            }

            customDataAdded.length = 0;
            customDataRemoved.length = 0;
        }

        // Traverse in depth-first, near-to-far order.
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            tile = levelZeroTiles[i];
            primitive._tileReplacementQueue.markTileRendered(tile);
            if (!tile.renderable) {
                queueTileLoad(primitive, primitive._tileLoadQueueHigh, tile, frameState);
                ++debug.tilesWaitingForChildren;
            } else {
                visitIfVisible(primitive, tile, tileProvider, frameState, occluders, tile, false, rootTraversalDetails[i]);
            }
        }

        primitive._lastSelectionFrameNumber = frameNumber;
    }

    function queueTileLoad(primitive, queue, tile, frameState) {
        if (!tile.needsLoading) {
            return;
        }

        if (primitive.tileProvider.computeTileLoadPriority !== undefined) {
            tile._loadPriority = primitive.tileProvider.computeTileLoadPriority(tile, frameState);
        }
        queue.push(tile);
    }

    function TraversalDetails() {
        this.allAreRenderable = true;
        this.anyWereRenderedLastFrame = false;
        this.notYetRenderableCount = 0;
    }

    function TraversalQuadDetails() {
        this.southwest = new TraversalDetails();
        this.southeast = new TraversalDetails();
        this.northwest = new TraversalDetails();
        this.northeast = new TraversalDetails();
    }

    TraversalQuadDetails.prototype.combine = function(result) {
        var southwest = this.southwest;
        var southeast = this.southeast;
        var northwest = this.northwest;
        var northeast = this.northeast;

        result.allAreRenderable = southwest.allAreRenderable && southeast.allAreRenderable && northwest.allAreRenderable && northeast.allAreRenderable;
        result.anyWereRenderedLastFrame = southwest.anyWereRenderedLastFrame || southeast.anyWereRenderedLastFrame || northwest.anyWereRenderedLastFrame || northeast.anyWereRenderedLastFrame;
        result.notYetRenderableCount = southwest.notYetRenderableCount + southeast.notYetRenderableCount + northwest.notYetRenderableCount + northeast.notYetRenderableCount;
    };

    var traversalQuadsByLevel = new Array(30); // level 30 tiles are ~2cm wide at the equator, should be good enough.
    for (var i = 0; i < traversalQuadsByLevel.length; ++i) {
        traversalQuadsByLevel[i] = new TraversalQuadDetails();
    }

    /**
     * Visits a tile for possible rendering. When we call this function with a tile:
     *
     *    * the tile has been determined to be visible (possibly based on a bounding volume that is not very tight-fitting)
     *    * its parent tile does _not_ meet the SSE (unless ancestorMeetsSse=true, see comments below)
     *    * the tile may or may not be renderable
     *
     * @private
     *
     * @param {Primitive} primitive The QuadtreePrimitive.
     * @param {FrameState} frameState The frame state.
     * @param {QuadtreeTile} tile The tile to visit
     * @param {QuadtreeTile} nearestRenderableTile The nearest ancestor tile for which the `renderable` property is true.
     * @param {Boolean} ancestorMeetsSse True if a tile higher in the tile tree already met the SSE and we're refining further only
     *                  to maintain detail while that higher tile loads.
     * @param {TraversalDetails} traveralDetails On return, populated with details of how the traversal of this tile went.
     */
    function visitTile(primitive, frameState, tile, nearestRenderableTile, ancestorMeetsSse, traversalDetails) {
        var debug = primitive._debug;

        ++debug.tilesVisited;

        primitive._tileReplacementQueue.markTileRendered(tile);
        tile._updateCustomData(frameState.frameNumber);

        if (tile.level > debug.maxDepth) {
            debug.maxDepth = tile.level;
        }

        if (tile.renderable) {
            nearestRenderableTile = tile;
        }

        var meetsSse = screenSpaceError(primitive, frameState, tile) < primitive.maximumScreenSpaceError;

        var southwestChild = tile.southwestChild;
        var southeastChild = tile.southeastChild;
        var northwestChild = tile.northwestChild;
        var northeastChild = tile.northeastChild;

        var lastFrame = primitive._lastSelectionFrameNumber;

        if (meetsSse || ancestorMeetsSse) {
            // This tile (or an ancestor) is the one we want to render this frame, but we'll do different things depending
            // on the state of this tile and on what we did _last_ frame.

            // 1. If this tile is completely loaded (terrain _and_ imagery), render it.
            //      TODO: technically we only need to ensure that the geometry and any imagery layers previously
            //            loaded on descendants are loaded on this tile. It doesn't need to be really, totally
            //            done loading. Hard to determine this though.
            // 2. If this tile's children were not visited last frame because this tile was culled
            //    or because this tile or an ancestor tile met the SSE, then render this tile, or a fill if
            //    this tile isn't renderable yet.
            var oneCompletelyLoaded = tile.state === QuadtreeTileLoadState.DONE;
            var twoNoChildrenVisitedLastFrame =
                southwestChild._frameVisited !== lastFrame &&
                southeastChild._frameVisited !== lastFrame &&
                northwestChild._frameVisited !== lastFrame &&
                northeastChild._frameVisited !== lastFrame;

            if (oneCompletelyLoaded || twoNoChildrenVisitedLastFrame) {
                // Only load this tile if it (not just an ancestor) meets the SSE.
                if (meetsSse) {
                    queueTileLoad(primitive, primitive._tileLoadQueueMedium, tile, frameState);
                }
                addTileToRenderList(primitive, tile, nearestRenderableTile);

                tile._lastSelectionResultFrame = frameState.frameNumber;
                tile._lastSelectionResult = TileSelectionResult.RENDERED;

                traversalDetails.allAreRenderable = tile.renderable;
                traversalDetails.anyWereRenderedLastFrame = tile._frameRendered === primitive._lastSelectionFrameNumber;
                traversalDetails.notYetRenderableCount = tile.renderable ? 0 : 1;
                return;
            }

            // 3. Otherwise, we can't render this tile (or its fill) because doing so would cause detail to disappear
            //    that was visible last frame. Instead, keep rendering any still-visible descendants that were rendered
            //    last frame and render fills for newly-visible descendants. E.g. if we were rendering level 15 last
            //    frame but this frame we want level 14 and the closest renderable level <= 14 is 0, rendering level
            //    zero would be pretty jarring so instead we keep rendering level 15 even though its SSE is better
            //    than required. So fall through to continue traversal...
            ancestorMeetsSse = true;

            // Load this blocker tile with high priority, but only if this tile (not just an ancestor) meets the SSE.
            if (meetsSse) {
                queueTileLoad(primitive, primitive._tileLoadQueueHigh, tile, frameState);
            }
        }

        var tileProvider = primitive.tileProvider;

        if (tileProvider.canRefine(tile)) {
            var allAreUpsampled = southwestChild.upsampledFromParent && southeastChild.upsampledFromParent &&
                                  northwestChild.upsampledFromParent && northeastChild.upsampledFromParent;

            if (allAreUpsampled) {
                tile._lastSelectionResultFrame = frameState.frameNumber;
                tile._lastSelectionResult = TileSelectionResult.RENDERED;

                // No point in rendering the children because they're all upsampled.  Render this tile instead.
                addTileToRenderList(primitive, tile, nearestRenderableTile);

                // Rendered tile that's not waiting on children loads with medium priority.
                queueTileLoad(primitive, primitive._tileLoadQueueMedium, tile, frameState);

                // Make sure we don't unload the children and forget they're upsampled.
                primitive._tileReplacementQueue.markTileRendered(southwestChild);
                primitive._tileReplacementQueue.markTileRendered(southeastChild);
                primitive._tileReplacementQueue.markTileRendered(northwestChild);
                primitive._tileReplacementQueue.markTileRendered(northeastChild);

                traversalDetails.allAreRenderable = tile.renderable;
                traversalDetails.anyWereRenderedLastFrame = tile._frameRendered === primitive._lastSelectionFrameNumber;
                traversalDetails.notYetRenderableCount = tile.renderable ? 0 : 1;
                return;
            }

            // SSE is not good enough, so refine.
            tile._lastSelectionResultFrame = frameState.frameNumber;
            tile._lastSelectionResult = TileSelectionResult.REFINED;

            var firstRenderedDescendantIndex = primitive._tilesToRender.length;
            var loadIndexLow = primitive._tileLoadQueueLow.length;
            var loadIndexMedium = primitive._tileLoadQueueMedium.length;
            var loadIndexHigh = primitive._tileLoadQueueHigh.length;

            // No need to add the children to the load queue because they'll be added (if necessary) when they're visited.
            visitVisibleChildrenNearToFar(primitive, southwestChild, southeastChild, northwestChild, northeastChild, frameState, nearestRenderableTile, ancestorMeetsSse, traversalDetails);

            // If no descendant tiles were added to the render list by the function above, it means they were all
            // culled even though this tile was deemed visible. That's pretty common.

            if (firstRenderedDescendantIndex !== primitive._tilesToRender.length) {
                // At least one descendant tile was added to the render list.
                // The traversalDetails tell us what happened while visiting the children.

                var allAreRenderable = traversalDetails.allAreRenderable;
                var anyWereRenderedLastFrame = traversalDetails.anyWereRenderedLastFrame;
                var notYetRenderableCount = traversalDetails.notYetRenderableCount;

                if (!allAreRenderable && !anyWereRenderedLastFrame) {
                    // Some of our descendants aren't ready to render yet, and none were rendered last frame,
                    // so kick them all out of the render list and render this tile instead. Continue to load them though!

                    // Mark the rendered descendants and their ancestors - up to this tile - as kicked.
                    var renderList = primitive._tilesToRender;
                    for (var i = firstRenderedDescendantIndex; i < renderList.length; ++i) {
                        var workTile = renderList[i];
                        while (workTile !== undefined && workTile._lastSelectionResult !== TileSelectionResult.KICKED && workTile !== tile) {
                            workTile._lastSelectionResult = TileSelectionResult.KICKED;
                            workTile = workTile.parent;
                        }
                    }

                    // Remove all descendants from the render list.
                    primitive._tilesToRender.length = firstRenderedDescendantIndex;
                    primitive._nearestRenderableTiles.length = firstRenderedDescendantIndex;
                    addTileToRenderList(primitive, tile, nearestRenderableTile);

                    tile._lastSelectionResult = TileSelectionResult.RENDERED;

                    // If we're waiting on heaps of descendants, the above will take too long. So in that case,
                    // load this tile INSTEAD of loading any of the descendants, and tell the up-level we're only waiting
                    // on this tile. Keep doing this until we actually manage to render this tile.
                    var wasRenderedLastFrame = tile._frameRendered === primitive._lastSelectionFrameNumber;
                    if (!wasRenderedLastFrame && notYetRenderableCount > primitive.loadingDescendantLimit) {
                        // Remove all descendants from the load queues.
                        primitive._tileLoadQueueLow.length = loadIndexLow;
                        primitive._tileLoadQueueMedium.length = loadIndexMedium;
                        primitive._tileLoadQueueHigh.length = loadIndexHigh;
                        queueTileLoad(primitive, primitive._tileLoadQueueMedium, tile, frameState);
                        traversalDetails.notYetRenderableCount = tile.renderable ? 0 : 1;
                    }

                    // TODO: consolidate _frameRendered and _lastSelectionResultFrame.
                    // Will probably need to set anyWereRenderedLastFrame earlier, before we overwrite
                    // with the new selection result.

                    traversalDetails.allAreRenderable = tile.renderable;
                    traversalDetails.anyWereRenderedLastFrame = tile._frameRendered === primitive._lastSelectionFrameNumber;

                    ++debug.tilesWaitingForChildren;
                }

                if (primitive.preloadAncestors) {
                    queueTileLoad(primitive, primitive._tileLoadQueueLow, tile, frameState);
                }
            }

            return;
        }

        tile._lastSelectionResultFrame = frameState.frameNumber;
        tile._lastSelectionResult = TileSelectionResult.RENDERED;

        // We'd like to refine but can't because we have no availability data for this tile's children,
        // so we have no idea if refinining would involve a load or an upsample. We'll have to finish
        // loading this tile first in order to find that out, so load this refinement blocker with
        // high priority.
        addTileToRenderList(primitive, tile, nearestRenderableTile);
        queueTileLoad(primitive, primitive._tileLoadQueueHigh, tile, frameState);

        traversalDetails.allAreRenderable = tile.renderable;
        traversalDetails.anyWereRenderedLastFrame = tile._frameRendered === primitive._lastSelectionFrameNumber;
        traversalDetails.notYetRenderableCount = tile.renderable ? 0 : 1;
    }

    function visitVisibleChildrenNearToFar(primitive, southwest, southeast, northwest, northeast, frameState, nearestRenderableTile, ancestorMeetsSse, traversalDetails) {
        var cameraPosition = frameState.camera.positionCartographic;
        var tileProvider = primitive._tileProvider;
        var occluders = primitive._occluders;

        var quadDetails = traversalQuadsByLevel[southwest.level];
        var southwestDetails = quadDetails.southwest;
        var southeastDetails = quadDetails.southeast;
        var northwestDetails = quadDetails.northwest;
        var northeastDetails = quadDetails.northeast;

        if (cameraPosition.longitude < southwest.rectangle.east) {
            if (cameraPosition.latitude < southwest.rectangle.north) {
                // Camera in southwest quadrant
                visitIfVisible(primitive, southwest, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, southwestDetails);
                visitIfVisible(primitive, southeast, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, southeastDetails);
                visitIfVisible(primitive, northwest, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, northwestDetails);
                visitIfVisible(primitive, northeast, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, northeastDetails);
            } else {
                // Camera in northwest quadrant
                visitIfVisible(primitive, northwest, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, northwestDetails);
                visitIfVisible(primitive, southwest, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, southwestDetails);
                visitIfVisible(primitive, northeast, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, northeastDetails);
                visitIfVisible(primitive, southeast, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, southeastDetails);
            }
        } else if (cameraPosition.latitude < southwest.rectangle.north) {
            // Camera southeast quadrant
            visitIfVisible(primitive, southeast, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, southeastDetails);
            visitIfVisible(primitive, southwest, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, southwestDetails);
            visitIfVisible(primitive, northeast, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, northeastDetails);
            visitIfVisible(primitive, northwest, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, northwestDetails);
        } else {
            // Camera in northeast quadrant
            visitIfVisible(primitive, northeast, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, northeastDetails);
            visitIfVisible(primitive, northwest, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, northwestDetails);
            visitIfVisible(primitive, southeast, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, southeastDetails);
            visitIfVisible(primitive, southwest, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, southwestDetails);
        }

        quadDetails.combine(traversalDetails);
    }

    function visitIfVisible(primitive, tile, tileProvider, frameState, occluders, nearestRenderableTile, ancestorMeetsSse, traversalDetails) {
        tile._frameVisited = frameState.frameNumber;

        if (tileProvider.computeTileVisibility(tile, frameState, occluders) !== Visibility.NONE) {
            return visitTile(primitive, frameState, tile, nearestRenderableTile, ancestorMeetsSse, traversalDetails);
        }

        tile._lastSelectionResultFrame = frameState.frameNumber;
        tile._lastSelectionResult = TileSelectionResult.CULLED;
        ++primitive._debug.tilesCulled;
        primitive._tileReplacementQueue.markTileRendered(tile);

        traversalDetails.allAreRenderable = true;
        traversalDetails.anyWereRenderedLastFrame = false;
        traversalDetails.notYetRenderableCount = 0;

        if (primitive.preloadSiblings) {
            queueTileLoad(primitive, primitive._tileLoadQueueLow, tile, frameState);
        }
    }

    function screenSpaceError(primitive, frameState, tile) {
        if (frameState.mode === SceneMode.SCENE2D || frameState.camera.frustum instanceof OrthographicFrustum || frameState.camera.frustum instanceof OrthographicOffCenterFrustum) {
            return screenSpaceError2D(primitive, frameState, tile);
        }

        var maxGeometricError = primitive._tileProvider.getLevelMaximumGeometricError(tile.level);

        var distance = tile._distance;
        var height = frameState.context.drawingBufferHeight;
        var sseDenominator = frameState.camera.frustum.sseDenominator;

        var error = (maxGeometricError * height) / (distance * sseDenominator);

        if (frameState.fog.enabled) {
            error = error - CesiumMath.fog(distance, frameState.fog.density) * frameState.fog.sse;
        }

        return error;
    }

    function screenSpaceError2D(primitive, frameState, tile) {
        var camera = frameState.camera;
        var frustum = camera.frustum;
        if (defined(frustum._offCenterFrustum)) {
            frustum = frustum._offCenterFrustum;
        }

        var context = frameState.context;
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var maxGeometricError = primitive._tileProvider.getLevelMaximumGeometricError(tile.level);
        var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(width, height);
        var error = maxGeometricError / pixelSize;

        if (frameState.fog.enabled && frameState.mode !== SceneMode.SCENE2D) {
            error = error - CesiumMath.fog(tile._distance, frameState.fog.density) * frameState.fog.sse;
        }

        return error;
    }

    function addTileToRenderList(primitive, tile, nearestRenderableTile) {
        primitive._tilesToRender.push(tile);
        primitive._nearestRenderableTiles.push(nearestRenderableTile);
        ++primitive._debug.tilesRendered;
    }

    function processTileLoadQueue(primitive, frameState) {
        var tileLoadQueueHigh = primitive._tileLoadQueueHigh;
        var tileLoadQueueMedium = primitive._tileLoadQueueMedium;
        var tileLoadQueueLow = primitive._tileLoadQueueLow;

        if (tileLoadQueueHigh.length === 0 && tileLoadQueueMedium.length === 0 && tileLoadQueueLow.length === 0) {
            return;
        }

        // Remove any tiles that were not used this frame beyond the number
        // we're allowed to keep.
        primitive._tileReplacementQueue.trimTiles(primitive.tileCacheSize);

        var endTime = getTimestamp() + primitive._loadQueueTimeSlice;
        var tileProvider = primitive._tileProvider;

        var didSomething = processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, tileLoadQueueHigh, false);
        didSomething = processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, tileLoadQueueMedium, didSomething);
        processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, tileLoadQueueLow, didSomething);
    }

    function sortByLoadPriority(a, b) {
        return a._loadPriority - b._loadPriority;
    }

    function processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, loadQueue, didSomething) {
        if (tileProvider.computeTileLoadPriority !== undefined) {
            loadQueue.sort(sortByLoadPriority);
        }

        for (var i = 0, len = loadQueue.length; i < len && (getTimestamp() < endTime || !didSomething); ++i) {
            var tile = loadQueue[i];
            primitive._tileReplacementQueue.markTileRendered(tile);
            tileProvider.loadTile(frameState, tile);
            didSomething = true;
        }
    }

    var scratchRay = new Ray();
    var scratchCartographic = new Cartographic();
    var scratchPosition = new Cartesian3();
    var scratchArray = [];

    function updateHeights(primitive, frameState) {
        var tryNextFrame = scratchArray;
        tryNextFrame.length = 0;
        var tilesToUpdateHeights = primitive._tileToUpdateHeights;
        var terrainProvider = primitive._tileProvider.terrainProvider;

        var startTime = getTimestamp();
        var timeSlice = primitive._updateHeightsTimeSlice;
        var endTime = startTime + timeSlice;

        var mode = frameState.mode;
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;
        var i;

        while (tilesToUpdateHeights.length > 0) {
            var tile = tilesToUpdateHeights[0];
            if (tile.state !== QuadtreeTileLoadState.DONE) {
                tryNextFrame.push(tile);
                tilesToUpdateHeights.shift();
                primitive._lastTileIndex = 0;
                continue;
            }
            var customData = tile.customData;
            var customDataLength = customData.length;

            var timeSliceMax = false;
            for (i = primitive._lastTileIndex; i < customDataLength; ++i) {
                var data = customData[i];

                if (tile.level > data.level) {
                    if (!defined(data.positionOnEllipsoidSurface)) {
                        // cartesian has to be on the ellipsoid surface for `ellipsoid.geodeticSurfaceNormal`
                        data.positionOnEllipsoidSurface = Cartesian3.fromRadians(data.positionCartographic.longitude, data.positionCartographic.latitude, 0.0, ellipsoid);
                    }

                    if (mode === SceneMode.SCENE3D) {
                        var surfaceNormal = ellipsoid.geodeticSurfaceNormal(data.positionOnEllipsoidSurface, scratchRay.direction);

                        // compute origin point

                        // Try to find the intersection point between the surface normal and z-axis.
                        // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
                        var rayOrigin = ellipsoid.getSurfaceNormalIntersectionWithZAxis(data.positionOnEllipsoidSurface, 11500.0, scratchRay.origin);

                        // Theoretically, not with Earth datums, the intersection point can be outside the ellipsoid
                        if (!defined(rayOrigin)) {
                            // intersection point is outside the ellipsoid, try other value
                            // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
                            var magnitude = Math.min(defaultValue(tile.data.minimumHeight, 0.0),-11500.0);

                            // multiply by the *positive* value of the magnitude
                            var vectorToMinimumPoint = Cartesian3.multiplyByScalar(surfaceNormal, Math.abs(magnitude) + 1, scratchPosition);
                            Cartesian3.subtract(data.positionOnEllipsoidSurface, vectorToMinimumPoint, scratchRay.origin);
                        }
                    } else {
                        Cartographic.clone(data.positionCartographic, scratchCartographic);

                        // minimum height for the terrain set, need to get this information from the terrain provider
                        scratchCartographic.height = -11500.0;
                        projection.project(scratchCartographic, scratchPosition);
                        Cartesian3.fromElements(scratchPosition.z, scratchPosition.x, scratchPosition.y, scratchPosition);
                        Cartesian3.clone(scratchPosition, scratchRay.origin);
                        Cartesian3.clone(Cartesian3.UNIT_X, scratchRay.direction);
                    }

                    var position = tile.data.pick(scratchRay, mode, projection, false, scratchPosition);
                    if (defined(position)) {
                        data.callback(position);
                        data.level = tile.level;
                    }
                } else if (tile.level === data.level) {
                    var children = tile.children;
                    var childrenLength = children.length;

                    var child;
                    for (var j = 0; j < childrenLength; ++j) {
                        child = children[j];
                        if (Rectangle.contains(child.rectangle, data.positionCartographic)) {
                            break;
                        }
                    }

                    var tileDataAvailable = terrainProvider.getTileDataAvailable(child.x, child.y, child.level);
                    var parentTile = tile.parent;
                    if ((defined(tileDataAvailable) && !tileDataAvailable) ||
                        (defined(parentTile) && defined(parentTile.data) && defined(parentTile.data.terrainData) &&
                         !parentTile.data.terrainData.isChildAvailable(parentTile.x, parentTile.y, child.x, child.y))) {
                        data.removeFunc();
                    }
                }

                if (getTimestamp() >= endTime) {
                    timeSliceMax = true;
                    break;
                }
            }

            if (timeSliceMax) {
                primitive._lastTileIndex = i;
                break;
            } else {
                primitive._lastTileIndex = 0;
                tilesToUpdateHeights.shift();
            }
        }
        for (i = 0; i < tryNextFrame.length; i++) {
            tilesToUpdateHeights.push(tryNextFrame[i]);
        }
    }

    function createRenderCommandsForSelectedTiles(primitive, frameState) {
        var tileProvider = primitive._tileProvider;
        var tilesToRender = primitive._tilesToRender;
        var nearestRenderableTiles = primitive._nearestRenderableTiles;
        var tilesToUpdateHeights = primitive._tileToUpdateHeights;

        for (var i = 0, len = tilesToRender.length; i < len; ++i) {
            var tile = tilesToRender[i];
            tileProvider.showTileThisFrame(tile, frameState, nearestRenderableTiles[i]);

            if (tile._frameRendered !== frameState.frameNumber - 1) {
                tilesToUpdateHeights.push(tile);
            }
            tile._frameRendered = frameState.frameNumber;
        }
    }

    return QuadtreePrimitive;
});
