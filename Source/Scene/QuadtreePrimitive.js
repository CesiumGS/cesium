/*global define*/
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
        '../Core/Ray',
        '../Core/Rectangle',
        '../Core/Visibility',
        './OrthographicFrustum',
        './QuadtreeOccluders',
        './QuadtreeTile',
        './QuadtreeTileLoadState',
        './SceneMode',
        './TileReplacementQueue'
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
        Ray,
        Rectangle,
        Visibility,
        OrthographicFrustum,
        QuadtreeOccluders,
        QuadtreeTile,
        QuadtreeTileLoadState,
        SceneMode,
        TileReplacementQueue) {
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
        this._tileLoadQueueHigh = []; // high priority tiles are preventing refinement
        this._tileLoadQueueMedium = []; // medium priority tiles are being rendered
        this._tileLoadQueueLow = []; // low priority tiles were refined past or are non-visible parts of quads.
        this._tileReplacementQueue = new TileReplacementQueue();
        this._levelZeroTiles = undefined;
        this._levelZeroTilesReady = false;
        this._loadQueueTimeSlice = 5.0;

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

        this._occluders = new QuadtreeOccluders({
            ellipsoid : ellipsoid
        });

        this._tileLoadProgressEvent = new Event();
        this._lastTileLoadQueueLength = 0;
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
        // Clear the replacement queue
        var replacementQueue = this._tileReplacementQueue;
        replacementQueue.head = undefined;
        replacementQueue.tail = undefined;
        replacementQueue.count = 0;

        // Free and recreate the level zero tiles.
        var levelZeroTiles = this._levelZeroTiles;
        if (defined(levelZeroTiles)) {
            for (var i = 0; i < levelZeroTiles.length; ++i) {
                var tile = levelZeroTiles[i];
                var customData = tile.customData;
                var customDataLength = customData.length;

                for (var j = 0; j < customDataLength; ++j) {
                    var data = customData[j];
                    data.level = 0;
                    this._addHeightCallbacks.push(data);
                }

                levelZeroTiles[i].freeResources();
            }
        }

        this._levelZeroTiles = undefined;

        this._tileProvider.cancelReprojections();
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
     * @private
     */
    QuadtreePrimitive.prototype.beginFrame = function(frameState) {
        var passes = frameState.passes;
        if (!passes.render) {
            return;
        }

        // Gets commands for any texture re-projections and updates the credit display
        this._tileProvider.initialize(frameState);

        var debug = this._debug;
        if (debug.suspendLodUpdate) {
            return;
        }

        debug.maxDepth = 0;
        debug.tilesVisited = 0;
        debug.tilesCulled = 0;
        debug.tilesRendered = 0;
        debug.tilesWaitingForChildren = 0;

        this._tileLoadQueueHigh.length = 0;
        this._tileLoadQueueMedium.length = 0;
        this._tileLoadQueueLow.length = 0;
        this._tileReplacementQueue.markStartOfRenderFrame();
    };

    /**
     * @private
     */
    QuadtreePrimitive.prototype.update = function(frameState) {
        var passes = frameState.passes;

        if (passes.render) {
            this._tileProvider.beginUpdate(frameState);

            selectTilesForRendering(this, frameState);
            createRenderCommandsForSelectedTiles(this, frameState);

            this._tileProvider.endUpdate(frameState);
        }

        if (passes.pick && this._tilesToRender.length > 0) {
            this._tileProvider.updateForPick(frameState);
        }
    };

    /**
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

        var debug = this._debug;
        if (debug.suspendLodUpdate) {
            return;
        }

        if (debug.enableDebugOutput) {
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

    function selectTilesForRendering(primitive, frameState) {
        var debug = primitive._debug;
        if (debug.suspendLodUpdate) {
            return;
        }

        var i;
        var len;

        // Clear the render list.
        var tilesToRender = primitive._tilesToRender;
        tilesToRender.length = 0;

        // We can't render anything before the level zero tiles exist.
        if (!defined(primitive._levelZeroTiles)) {
            if (primitive._tileProvider.ready) {
                var tilingScheme = primitive._tileProvider.tilingScheme;
                primitive._levelZeroTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
            } else {
                // Nothing to do until the provider is ready.
                return;
            }
        }

        primitive._occluders.ellipsoid.cameraPosition = frameState.camera.positionWC;

        var tileProvider = primitive._tileProvider;
        var occluders = primitive._occluders;

        var tile;
        var levelZeroTiles = primitive._levelZeroTiles;

        // Sort the level zero tiles by the distance from the center to the camera.
        // The level zero tiles aren't necessarily a nice neat quad, so we can use the
        // quadtree ordering we use elsewhere in the tree
        comparisonPoint = frameState.camera.positionCartographic;
        levelZeroTiles.sort(compareDistanceToPoint);

        var customDataAdded = primitive._addHeightCallbacks;
        var customDataRemoved = primitive._removeHeightCallbacks;
        var frameNumber = frameState.frameNumber;

        if (customDataAdded.length > 0 || customDataRemoved.length > 0) {
            for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
                tile = levelZeroTiles[i];
                tile._updateCustomData(frameNumber, customDataAdded, customDataRemoved);
            }

            customDataAdded.length = 0;
            customDataRemoved.length = 0;
        }

        // Our goal with load ordering is to first load all of the tiles we need to
        // render the current scene at full detail.  Loading any other tiles is just
        // a form of prefetching, and we need not do it at all (other concerns aside).  This
        // simple and obvious statement gets more complicated when we realize that, because
        // we don't have bounding volumes for the entire terrain tile pyramid, we don't
        // precisely know which tiles we need to render the scene at full detail, until we do
        // some loading.
        //
        // So our load priority is (from high to low):
        // 1. Tiles that we _would_ render, except that they're not sufficiently loaded yet.
        //    Ideally this would only include tiles that we've already determined to be visible,
        //    but since we don't have reliable visibility information until a tile is loaded,
        //    and because we (currently) must have all children in a quad renderable before we
        //    can refine, this pretty much means tiles we'd like to refine to, regardless of
        //    visibility. (high)
        // 2. Tiles that we're rendering. (medium)
        // 3. All other tiles. (low)
        //
        // Within each priority group, tiles should be loaded in approximate near-to-far order,
        // but currently they're just loaded in our traversal order which makes no guarantees
        // about depth ordering.

        // Traverse in depth-first, near-to-far order.
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            tile = levelZeroTiles[i];
            primitive._tileReplacementQueue.markTileRendered(tile);
            if (!tile.renderable) {
                if (tile.needsLoading) {
                    primitive._tileLoadQueueHigh.push(tile);
                }
                ++debug.tilesWaitingForChildren;
            } else if (tileProvider.computeTileVisibility(tile, frameState, occluders) !== Visibility.NONE) {
                visitTile(primitive, frameState, tile);
            } else {
                if (tile.needsLoading) {
                    primitive._tileLoadQueueLow.push(tile);
                }
                ++debug.tilesCulled;
            }
        }

        frameState.afterRender.push(createTileProgressFunction(primitive));
    }

    function createTileProgressFunction(primitive) {
        return function() {
            raiseTileLoadProgressEvent(primitive);
        };
    }

    function visitTile(primitive, frameState, tile) {
        var debug = primitive._debug;

        ++debug.tilesVisited;

        primitive._tileReplacementQueue.markTileRendered(tile);
        tile._updateCustomData(frameState.frameNumber);

        if (tile.level > debug.maxDepth) {
            debug.maxDepth = tile.level;
        }

        if (screenSpaceError(primitive, frameState, tile) < primitive.maximumScreenSpaceError) {
            // This tile meets SSE requirements, so render it.
            if (tile.needsLoading) {
                // Rendered tile meeting SSE loads with medium priority.
                primitive._tileLoadQueueMedium.push(tile);
            }
            addTileToRenderList(primitive, tile);
            return;
        }

        var southwestChild = tile.southwestChild;
        var southeastChild = tile.southeastChild;
        var northwestChild = tile.northwestChild;
        var northeastChild = tile.northeastChild;
        var allAreRenderable = southwestChild.renderable && southeastChild.renderable &&
                               northwestChild.renderable && northeastChild.renderable;
        var allAreUpsampled = southwestChild.upsampledFromParent && southeastChild.upsampledFromParent &&
                              northwestChild.upsampledFromParent && northeastChild.upsampledFromParent;

        if (allAreRenderable) {
            if (allAreUpsampled) {
                // No point in rendering the children because they're all upsampled.  Render this tile instead.
                addTileToRenderList(primitive, tile);

                // Load the children even though we're (currently) not going to render them.
                // A tile that is "upsampled only" right now might change its tune once it does more loading.
                // A tile that is upsampled now and forever should also be done loading, so no harm done.
                queueChildLoadNearToFar(primitive, frameState.camera.positionCartographic, southwestChild, southeastChild, northwestChild, northeastChild);

                if (tile.needsLoading) {
                    // Rendered tile that's not waiting on children loads with medium priority.
                    primitive._tileLoadQueueMedium.push(tile);
                }
            } else {
                // SSE is not good enough and children are loaded, so refine.
                // No need to add the children to the load queue because they'll be added (if necessary) when they're visited.
                visitVisibleChildrenNearToFar(primitive, southwestChild, southeastChild, northwestChild, northeastChild, frameState);

                if (tile.needsLoading) {
                    // Tile is not rendered, so load it with low priority.
                    primitive._tileLoadQueueLow.push(tile);
                }
            }
        } else {
            // We'd like to refine but can't because not all of our children are renderable.  Load the refinement blockers with high priority and
            // render this tile in the meantime.
            queueChildLoadNearToFar(primitive, frameState.camera.positionCartographic, southwestChild, southeastChild, northwestChild, northeastChild);
            addTileToRenderList(primitive, tile);

            if (tile.needsLoading) {
                // We will refine this tile when it's possible, so load this tile only with low priority.
                primitive._tileLoadQueueLow.push(tile);
            }
        }
    }

    function queueChildLoadNearToFar(primitive, cameraPosition, southwest, southeast, northwest, northeast) {
        if (cameraPosition.longitude < southwest.east) {
            if (cameraPosition.latitude < southwest.north) {
                // Camera in southwest quadrant
                queueChildTileLoad(primitive, southwest);
                queueChildTileLoad(primitive, southeast);
                queueChildTileLoad(primitive, northwest);
                queueChildTileLoad(primitive, northeast);
            } else {
                // Camera in northwest quadrant
                queueChildTileLoad(primitive, northwest);
                queueChildTileLoad(primitive, southwest);
                queueChildTileLoad(primitive, northeast);
                queueChildTileLoad(primitive, southeast);
            }
        } else {
            if (cameraPosition.latitude < southwest.north) {
                // Camera southeast quadrant
                queueChildTileLoad(primitive, southeast);
                queueChildTileLoad(primitive, southwest);
                queueChildTileLoad(primitive, northeast);
                queueChildTileLoad(primitive, northwest);
            } else {
                // Camera in northeast quadrant
                queueChildTileLoad(primitive, northeast);
                queueChildTileLoad(primitive, northwest);
                queueChildTileLoad(primitive, southeast);
                queueChildTileLoad(primitive, southwest);
            }
        }
    }

    function queueChildTileLoad(primitive, childTile) {
        primitive._tileReplacementQueue.markTileRendered(childTile);
        if (childTile.needsLoading) {
            if (childTile.renderable) {
                primitive._tileLoadQueueLow.push(childTile);
            } else {
                // A tile blocking refine loads with high priority
                primitive._tileLoadQueueHigh.push(childTile);
            }
        }
    }

    function visitVisibleChildrenNearToFar(primitive, southwest, southeast, northwest, northeast, frameState) {
        var cameraPosition = frameState.camera.positionCartographic;
        var tileProvider = primitive._tileProvider;
        var occluders = primitive._occluders;

        if (cameraPosition.longitude < southwest.rectangle.east) {
            if (cameraPosition.latitude < southwest.rectangle.north) {
                // Camera in southwest quadrant
                visitIfVisible(primitive, southwest, tileProvider, frameState, occluders);
                visitIfVisible(primitive, southeast, tileProvider, frameState, occluders);
                visitIfVisible(primitive, northwest, tileProvider, frameState, occluders);
                visitIfVisible(primitive, northeast, tileProvider, frameState, occluders);
            } else {
                // Camera in northwest quadrant
                visitIfVisible(primitive, northwest, tileProvider, frameState, occluders);
                visitIfVisible(primitive, southwest, tileProvider, frameState, occluders);
                visitIfVisible(primitive, northeast, tileProvider, frameState, occluders);
                visitIfVisible(primitive, southeast, tileProvider, frameState, occluders);
            }
        } else {
            if (cameraPosition.latitude < southwest.rectangle.north) {
                // Camera southeast quadrant
                visitIfVisible(primitive, southeast, tileProvider, frameState, occluders);
                visitIfVisible(primitive, southwest, tileProvider, frameState, occluders);
                visitIfVisible(primitive, northeast, tileProvider, frameState, occluders);
                visitIfVisible(primitive, northwest, tileProvider, frameState, occluders);
            } else {
                // Camera in northeast quadrant
                visitIfVisible(primitive, northeast, tileProvider, frameState, occluders);
                visitIfVisible(primitive, northwest, tileProvider, frameState, occluders);
                visitIfVisible(primitive, southeast, tileProvider, frameState, occluders);
                visitIfVisible(primitive, southwest, tileProvider, frameState, occluders);
            }
        }
    }

    function visitIfVisible(primitive, tile, tileProvider, frameState, occluders) {
        if (tileProvider.computeTileVisibility(tile, frameState, occluders) !== Visibility.NONE) {
            visitTile(primitive, frameState, tile);
        } else {
            ++primitive._debug.tilesCulled;
            primitive._tileReplacementQueue.markTileRendered(tile);
        }
    }
    /**
     * Checks if the load queue length has changed since the last time we raised a queue change event - if so, raises
     * a new one.
     */
    function raiseTileLoadProgressEvent(primitive) {
        var currentLoadQueueLength = primitive._tileLoadQueueHigh.length + primitive._tileLoadQueueMedium.length + primitive._tileLoadQueueLow.length;

        if (currentLoadQueueLength !== primitive._lastTileLoadQueueLength) {
            primitive._tileLoadProgressEvent.raiseEvent(currentLoadQueueLength);
            primitive._lastTileLoadQueueLength = currentLoadQueueLength;
        }
    }

    function screenSpaceError(primitive, frameState, tile) {
        if (frameState.mode === SceneMode.SCENE2D || frameState.camera.frustum instanceof OrthographicFrustum) {
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

    function addTileToRenderList(primitive, tile) {
        primitive._tilesToRender.push(tile);
        ++primitive._debug.tilesRendered;
    }

    function processTileLoadQueue(primitive, frameState) {
        var tileLoadQueueHigh = primitive._tileLoadQueueHigh;
        var tileLoadQueueMedium = primitive._tileLoadQueueMedium;
        var tileLoadQueueLow = primitive._tileLoadQueueLow;
        var tileProvider = primitive._tileProvider;

        if (tileLoadQueueHigh.length === 0 && tileLoadQueueMedium.length === 0 && tileLoadQueueLow.length === 0) {
            return;
        }

        // Remove any tiles that were not used this frame beyond the number
        // we're allowed to keep.
        primitive._tileReplacementQueue.trimTiles(primitive.tileCacheSize);

        var endTime = getTimestamp() + primitive._loadQueueTimeSlice;

        processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, tileLoadQueueHigh);
        processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, tileLoadQueueMedium);
        processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, tileLoadQueueLow);
    }

    function processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, loadQueue) {
        for (var i = 0, len = loadQueue.length; i < len && getTimestamp() < endTime; ++i) {
            var tile = loadQueue[i];
            primitive._tileReplacementQueue.markTileRendered(tile);
            tileProvider.loadTile(frameState, tile);
        }
    }

    var scratchRay = new Ray();
    var scratchCartographic = new Cartographic();
    var scratchPosition = new Cartesian3();

    function updateHeights(primitive, frameState) {
        var tilesToUpdateHeights = primitive._tileToUpdateHeights;
        var terrainProvider = primitive._tileProvider.terrainProvider;

        var startTime = getTimestamp();
        var timeSlice = primitive._updateHeightsTimeSlice;
        var endTime = startTime + timeSlice;

        var mode = frameState.mode;
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        while (tilesToUpdateHeights.length > 0) {
            var tile = tilesToUpdateHeights[0];
            var customData = tile.customData;
            var customDataLength = customData.length;

            var timeSliceMax = false;
            for (var i = primitive._lastTileIndex; i < customDataLength; ++i) {
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
                    }

                    data.level = tile.level;
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
    }

    function createRenderCommandsForSelectedTiles(primitive, frameState) {
        var tileProvider = primitive._tileProvider;
        var tilesToRender = primitive._tilesToRender;
        var tilesToUpdateHeights = primitive._tileToUpdateHeights;

        for (var i = 0, len = tilesToRender.length; i < len; ++i) {
            var tile = tilesToRender[i];
            tileProvider.showTileThisFrame(tile, frameState);

            if (tile._frameRendered !== frameState.frameNumber - 1) {
                tilesToUpdateHeights.push(tile);
            }
            tile._frameRendered = frameState.frameNumber;
        }
    }

    return QuadtreePrimitive;
});
