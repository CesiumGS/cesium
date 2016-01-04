/*global define*/
define([
        '../Core/appendForwardSlash',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Intersect',
        '../Core/loadJson',
        '../Core/Math',
        '../Core/RequestScheduler',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './Cesium3DTile',
        './Cesium3DTileRefine',
        './Cesium3DTilesetState',
        './CullingVolume',
        './SceneMode'
    ], function(
        appendForwardSlash,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Event,
        Intersect,
        loadJson,
        CesiumMath,
        RequestScheduler,
        Uri,
        when,
        Cesium3DTile,
        Cesium3DTileRefine,
        Cesium3DTilesetState,
        CullingVolume,
        SceneMode) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url TODO
     * @param {Boolean} [options.show=true] TODO
     * @param {Boolean} [options.maximumScreenSpaceError=16] TODO
     * @param {Boolean} [options.debugShowStatistics=false] TODO
     * @param {Boolean} [options.debugFreezeFrame=false] TODO
     * @param {Boolean} [options.debugColorizeTiles=false] TODO
     * @param {Boolean} [options.debugShowBox=false] TODO
     * @param {Boolean} [options.debugShowContentBox=false] TODO
     * @param {Boolean} [options.debugShowBoundingVolume=false] TODO
     * @param {Boolean} [options.debugShowContentsBoundingVolume=false] TODO
     *
     * @alias Cesium3DTileset
     * @constructor
     */
    var Cesium3DTileset = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var url = options.url;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        url = appendForwardSlash(url);

        this._url = url;
        this._tilesJson = url + 'tiles.json';
        this._state = Cesium3DTilesetState.UNLOADED;
        this._root = undefined;
        this._properties = undefined; // Metadata for per-model/point/etc properties
        this._geometricError = undefined; // Geometric error when the tree is not rendered at all
        this._processingQueue = [];
        this._selectedTiles = [];

        /**
         * DOC_TBA
         */
        this.show = defaultValue(options.show, true);

        /**
         * DOC_TBA
         */
        this.maximumScreenSpaceError = defaultValue(options.maximumScreenSpaceError, 16);

        /**
         * DOC_TBA
         */
        this.debugShowStatistics = defaultValue(options.debugShowStatistics, false);
        this._statistics = {
            // Rendering stats
            visited : 0,
            numberOfCommands : 0,
            // Loading stats
            numberOfPendingRequests : 0,
            numberProcessing : 0,

            lastSelected : -1,
            lastVisited : -1,
            lastNumberOfCommands : -1,
            lastNumberOfPendingRequests : -1,
            lastNumberProcessing : -1
        };

        /**
         * DOC_TBA
         */
        this.debugFreezeFrame = defaultValue(options.debugFreezeFrame, false);

        /**
         * DOC_TBA
         */
        this.debugColorizeTiles = defaultValue(options.debugColorizeTiles, false);

        /**
         * DOC_TBA
         */
        this.debugShowBox = defaultValue(options.debugShowBox, false);

        /**
         * DOC_TBA
         */
        this.debugShowContentBox = defaultValue(options.debugShowContentBox, false);

        /**
         * DOC_TBA
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        /**
         * DOC_TBA
         */
        this.debugShowContentsBoundingVolume = defaultValue(options.debugShowContentsBoundingVolume, false);

        /**
         * DOC_TBA
         */
        this.loadProgress = new Event();
        this._loadProgressEventsToRaise = [];

        /**
         * DOC_TBA
         */
// TODO:
// * This event fires inside update; the others are painfully deferred until the end of the frame,
// which also means they are one tick behind for time-dynamic updates.
        this.tileVisible = new Event();

        this._readyPromise = when.defer();
    };

    defineProperties(Cesium3DTileset.prototype, {
        /**
         * DOC_TBA
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Object}
         * @readonly
         */
        properties : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this.ready) {
                    throw new DeveloperError('The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._properties;
            }
        },

        /**
         * DOC_TBA
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        ready : {
            get : function() {
                return defined(this._root);
            }
        },

        /**
         * DOC_TBA
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Promise}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },

        /**
         * DOC_TBA
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._url;
            }
        }
    });

    /**
     * @private
     */
    Cesium3DTileset.prototype.loadTilesJson = function(tilesJson, parentTile) {
        var tileset = this;
        var promise = RequestScheduler.throttleRequest(tilesJson, loadJson);

        if (!defined(promise)) {
            return undefined;
        }

        return promise.then(function(tree) {
            if (tileset.isDestroyed()) {
                return when.reject('tileset is destroyed');
            }

            var baseUrl = tileset.url;
            var rootTile = new Cesium3DTile(tileset, baseUrl, tree.root, parentTile);

            // If there is a parentTile, add the root of the currently loading tileset
            // to parentTile's children, and increment its numberOfChildrenWithoutContent
            if (defined(parentTile)) {
                parentTile.children.push(rootTile);
                ++parentTile.numberOfChildrenWithoutContent;
            }

            var stack = [];
            stack.push({
                header : tree.root,
                cesium3DTile : rootTile
            });

            while (stack.length > 0) {
                var t = stack.pop();
                var children = t.header.children;
                if (defined(children)) {
                    var length = children.length;
                    for (var k = 0; k < length; ++k) {
                        var childHeader = children[k];
                        var childTile = new Cesium3DTile(tileset, baseUrl, childHeader, t.cesium3DTile);
                        t.cesium3DTile.children.push(childTile);

                        stack.push({
                            header : childHeader,
                            cesium3DTile : childTile
                        });
                    }
                }
            }

            return {
                tree : tree,
                root : rootTile
            };
        });
    };

    function getScreenSpaceError(geometricError, tile, frameState) {
        // TODO: screenSpaceError2D like QuadtreePrimitive.js
        if (geometricError === 0.0) {
            // Leaf nodes do not have any error so save the computation
            return 0.0;
        }

        // Avoid divide by zero when viewer is inside the tile
        var distance = Math.max(tile.distanceToCamera, CesiumMath.EPSILON7);
        var height = frameState.context.drawingBufferHeight;
        var sseDenominator = frameState.camera.frustum.sseDenominator;

        return (geometricError * height) / (distance * sseDenominator);
    }

    function computeDistanceToCamera(children, frameState) {
        var length = children.length;
        for (var i = 0; i < length; ++i) {
            var child = children[i];
            child.distanceToCamera = child.distanceToTile(frameState);
        }
    }

// TODO: is it worth exploiting frame-to-frame coherence in the sort?
    function sortChildrenByDistanceToCamera(a, b) {
        // Sort by farthest child first since this is going on a stack
        return b.distanceToCamera - a.distanceToCamera;
    }

    ///////////////////////////////////////////////////////////////////////////

    function requestContent(tiles3D, tile, outOfCore) {
        if (!outOfCore) {
            return;
        }
        if (!hasAvailableRequests(tiles3D)) {
            return;
        }

        var stats = tiles3D._statistics;
        ++stats.numberOfPendingRequests;
        addLoadProgressEvent(tiles3D);

        tile.requestContent();
        var removeFunction = removeFromProcessingQueue(tiles3D, tile);
        when(tile.processingPromise).then(addToProcessingQueue(tiles3D, tile)).otherwise(removeFunction);
        when(tile.readyPromise).then(removeFunction).otherwise(removeFunction);
    }

    function hasAvailableRequests(tiles3D) {
        return RequestScheduler.hasAvailableRequests(tiles3D._url);
    }

    function selectTile(selectedTiles, tile, fullyVisible, frameState) {
        // There may also be a tight box around just the tile's contents, e.g., for a city, we may be
        // zoomed into a neighborhood and can cull the skyscrapers in the root node.
        //
        // Don't select if the tile is being loaded to refine another tile
        if (tile.isReady() && !tile.refining &&
                (fullyVisible || (tile.contentsVisibility(frameState.cullingVolume) !== Intersect.OUTSIDE))) {
            selectedTiles.push(tile);
        }
    }

    var scratchStack = [];

    function selectTiles(tiles3D, frameState, outOfCore) {
        if (tiles3D.debugFreezeFrame) {
            return;
        }

        var maximumScreenSpaceError = tiles3D.maximumScreenSpaceError;
        var cullingVolume = frameState.cullingVolume;

        var selectedTiles = tiles3D._selectedTiles;
        selectedTiles.length = 0;

        var root = tiles3D._root;
        root.distanceToCamera = root.distanceToTile(frameState);
        root.parentPlaneMask = CullingVolume.MASK_INDETERMINATE;

        if (getScreenSpaceError(tiles3D._geometricError, root, frameState) <= maximumScreenSpaceError) {
            // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
            return;
        }

        if (root.isContentUnloaded()) {
            requestContent(tiles3D, root, outOfCore);
            return;
        }

        var stats = tiles3D._statistics;

        var stack = scratchStack;
        stack.push(root);
        while (stack.length > 0) {
            // Depth first.  We want the high detail tiles first.
            var t = stack.pop();
            ++stats.visited;

            var planeMask = t.visibility(cullingVolume);
            if (planeMask === CullingVolume.MASK_OUTSIDE) {
                // Tile is completely outside of the view frustum; therefore
                // so are all of its children.
                continue;
            }
            var fullyVisible = (planeMask === CullingVolume.MASK_INSIDE);

            // Tile is inside/intersects the view frustum.  How many pixels is its geometric error?
            var sse = getScreenSpaceError(t.geometricError, t, frameState);
// TODO: refine also based on (1) occlusion/VMSSE and/or (2) center of viewport

            var children = t.children;
            var childrenLength = children.length;
            var child;
            var k;
            var additiveRefinement = (t.refine === Cesium3DTileRefine.ADD);

            if (t.hasTilesetContent) {
                // If tile has tileset content, skip it and process its child instead (the tileset root)
                // No need to check visibility or sse of the child because its bounding volume
                // and geometric error are equal to its parent.
                if (t.isReady()) {
                    child = t.children[0];
                    child.parentPlaneMask = t.parentPlaneMask;
                    child.distanceToCamera = t.distanceToCamera;
                    child.refining = t.refining;
                    if (child.isContentUnloaded()) {
                        requestContent(tiles3D, child, outOfCore);
                    } else {
                        stack.push(child);
                    }
                }
                continue;
            }
            if (additiveRefinement) {
                // With additive refinement, the tile is rendered
                // regardless of if its SSE is sufficient.
                selectTile(selectedTiles, t, fullyVisible, frameState);

// TODO: experiment with prefetching children
                if (sse > maximumScreenSpaceError) {
                    // Tile does not meet SSE. Refine them in front-to-back order.

                    // Only sort and refine (render or request children) if any
                    // children are loaded or request slots are available.
                    var anyChildrenLoaded = (t.numberOfChildrenWithoutContent < childrenLength);
                    if (anyChildrenLoaded || hasAvailableRequests(tiles3D)) {
                        // Distance is used for sorting now and for computing SSE when the tile comes off the stack.
                        computeDistanceToCamera(children, frameState);

                        // Sort children by distance for (1) request ordering, and (2) early-z
                        children.sort(sortChildrenByDistanceToCamera);
// TODO: is pixel size better?
// TODO: consider priority queue instead of explicit sort, which would no longer be DFS.

                        // With additive refinement, we only request children that are visible, compared
                        // to replacement refinement where we need all children.
                        for (k = 0; k < childrenLength; ++k) {
                            child = children[k];
                            // Pass along whether the child is being loaded for refinement
                            child.refining = t.refining;
                            // Store the plane mask so that the child can optimize based on its parent's returned mask
                            child.parentPlaneMask = planeMask;

                            // Use parent's geometric error with child's box to see if we already meet the SSE
                            if (getScreenSpaceError(t.geometricError, child, frameState) > maximumScreenSpaceError) {
                                if (child.isContentUnloaded()) {
                                    if (child.visibility(cullingVolume) !== CullingVolume.MASK_OUTSIDE) {
                                        requestContent(tiles3D, child, outOfCore);
                                    }
                                } else {
                                    stack.push(child);
                                }
                            }
                        }
                    }
                }
            } else {
                // t.refine === Cesium3DTileRefine.REPLACE
                //
                // With replacement refinement, if the tile's SSE
                // is not sufficient, its children (or ancestors) are
                // rendered instead

                if ((sse <= maximumScreenSpaceError) || (childrenLength === 0)) {
                    // This tile meets the SSE so add its commands.
                    // Select tile if it's a leaf (childrenLength === 0)
                    selectTile(selectedTiles, t, fullyVisible, frameState);
                } else {
                    // Tile does not meet SSE.

                    // Only sort children by distance if we are going to refine to them
                    // or slots are available to request them.  If we are just rendering the
                    // tile (and can't make child requests because no slots are available)
                    // then the children do not need to be sorted.
                    var allChildrenLoaded = t.numberOfChildrenWithoutContent === 0;
                    if (allChildrenLoaded || hasAvailableRequests(tiles3D)) {
                        // Distance is used for sorting now and for computing SSE when the tile comes off the stack.
                        computeDistanceToCamera(children, frameState);

                        // Sort children by distance for (1) request ordering, and (2) early-z
                        children.sort(sortChildrenByDistanceToCamera);
// TODO: same TODO as above.
                    }

                    if (!t.isRefinable() || t.refining) {
                        // Tile does not meet SSE. Add its commands since it is the best we have until it becomes refinable.
                        // If all its children have content, it will became refinable once they are loaded.
                        // If a child is empty (such as for accelerating culling), its descendants with content must be loaded first.
                        selectTile(selectedTiles, t, fullyVisible, frameState);

                        for (k = 0; k < childrenLength; ++k) {
                            child = children[k];
                            if (child.isContentUnloaded()) {
                                requestContent(tiles3D, child, outOfCore);
                            } else if (!child.hasContent && !child.isRefinable()){
                                // If the child is empty, start loading its descendants. Mark as refining so they aren't selected.
                                child.refining = true;
                                // Store the plane mask so that the child can optimize based on its parent's returned mask
                                child.parentPlaneMask = planeMask;
                                stack.push(child);
                            }
                        }
                    } else {
                        // Tile does not meet SEE and it is refinable. Refine to children in front-to-back order.
                        for (k = 0; k < childrenLength; ++k) {
                            child = children[k];
                            child.refining = false;
                            // Store the plane mask so that the child can optimize based on its parent's returned mask
                            child.parentPlaneMask = planeMask;
                            stack.push(child);
                        }
                    }
                }
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    function addToProcessingQueue(tiles3D, tile) {
        return function() {
            tiles3D._processingQueue.push(tile);

            --tiles3D._statistics.numberOfPendingRequests;
            ++tiles3D._statistics.numberProcessing;
            addLoadProgressEvent(tiles3D);
        };
    }

    function removeFromProcessingQueue(tiles3D, tile) {
        return function() {
            var index = tiles3D._processingQueue.indexOf(tile);
            if (index >= 0) {
                // Remove from processing queue
                tiles3D._processingQueue.splice(index, 1);
                --tiles3D._statistics.numberProcessing;
            } else {
                // Not in processing queue
                // For example, when a url request fails and the ready promise is rejected
                --tiles3D._statistics.numberOfPendingRequests;
            }

            addLoadProgressEvent(tiles3D);
        };
    }

    function processTiles(tiles3D, frameState) {
        var tiles = tiles3D._processingQueue;
        var length = tiles.length;

        // Process tiles in the PROCESSING state so they will eventually move to the READY state.
        // Traverse backwards in case a tile is removed as a result of calling process()
        for (var i = length - 1; i >= 0; --i) {
            tiles[i].process(tiles3D, frameState);
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    function clearStats(tiles3D) {
        var stats = tiles3D._statistics;
        stats.visited = 0;
        stats.numberOfCommands = 0;
    }

    function showStats(tiles3D, isPick) {
        var stats = tiles3D._statistics;

        if (tiles3D.debugShowStatistics && (
            stats.lastVisited !== stats.visited ||
            stats.lastNumberOfCommands !== stats.numberOfCommands ||
            stats.lastSelected !== tiles3D._selectedTiles.length ||
            stats.lastNumberOfPendingRequests !== stats.numberOfPendingRequests ||
            stats.lastNumberProcessing !== stats.numberProcessing)) {

            stats.lastVisited = stats.visited;
            stats.lastNumberOfCommands = stats.numberOfCommands;
            stats.lastSelected = tiles3D._selectedTiles.length;
            stats.lastNumberOfPendingRequests = stats.numberOfPendingRequests;
            stats.lastNumberProcessing = stats.numberProcessing;

            // Since the pick pass uses a smaller frustum around the pixel of interest,
            // the stats will be different than the normal render pass.
            var s = isPick ? '[Pick ]: ' : '[Color]: ';
            s +=
                'Visited: ' + stats.visited +
                // Number of commands returned is likely to be higher than the number of tiles selected
                // because of tiles that create multiple commands.
                ', Selected: ' + tiles3D._selectedTiles.length +
                // Number of commands executed is likely to be higher because of commands overlapping
                // multiple frustums.
                ', Commands: ' + stats.numberOfCommands +
                ', Requests: ' + stats.numberOfPendingRequests +
                ', Processing: ' + stats.numberProcessing;

            /*global console*/
            console.log(s);
        }
    }

    function updateTiles(tiles3D, frameState) {
        var commandList = frameState.commandList;
        var numberOfCommands = commandList.length;
        var selectedTiles = tiles3D._selectedTiles;
        var length = selectedTiles.length;
        var tileVisible = tiles3D.tileVisible;
        for (var i = 0; i < length; ++i) {
            var tile = selectedTiles[i];
            tileVisible.raiseEvent(tile);
            tile.update(tiles3D, frameState);
        }

        tiles3D._statistics.numberOfCommands = (commandList.length - numberOfCommands);
    }

    ///////////////////////////////////////////////////////////////////////////

    function addLoadProgressEvent(tiles3D) {
        if (tiles3D.loadProgress.numberOfListeners > 0) {
            var stats = tiles3D._statistics;
            tiles3D._loadProgressEventsToRaise.push({
                numberOfPendingRequests : stats.numberOfPendingRequests,
                numberProcessing : stats.numberProcessing
            });
        }
    }

    function evenMoreComplicated(tiles3D, numberOfPendingRequests, numberProcessing) {
        return function() {
            tiles3D.loadProgress.raiseEvent(numberOfPendingRequests, numberProcessing);
        };
    }

    function raiseLoadProgressEvents(tiles3D, frameState) {
        var eventsToRaise = tiles3D._loadProgressEventsToRaise;
        var length = eventsToRaise.length;
        for (var i = 0; i < length; ++i) {
            var numberOfPendingRequests = eventsToRaise[i].numberOfPendingRequests;
            var numberProcessing = eventsToRaise[i].numberProcessing;

            frameState.afterRender.push(evenMoreComplicated(tiles3D, numberOfPendingRequests, numberProcessing));
        }
        eventsToRaise.length = 0;
    }

    ///////////////////////////////////////////////////////////////////////////

    function loadTiles(tileset) {
        var promise = tileset.loadTilesJson(tileset._tilesJson, undefined);
        if (defined(promise)) {
            tileset._state = Cesium3DTilesetState.LOADING;
            promise.then(function(data) {
                var tree = data.tree;
                tileset._state = Cesium3DTilesetState.READY;
                tileset._properties = tree.properties;
                tileset._geometricError = tree.geometricError;
                tileset._root = data.root;
                tileset._readyPromise.resolve(tileset);
            }).otherwise(function(error) {
                tileset._state = Cesium3DTilesetState.FAILED;
                tileset._readyPromise.reject(error);
            });
        }
    }

    /**
     * DOC_TBA
     */
    Cesium3DTileset.prototype.update = function(frameState) {
        if (this._state === Cesium3DTilesetState.UNLOADED) {
            loadTiles(this);
        }

        // TODO: Support 2D and CV
        if (!this.show || !defined(this._root) || (frameState.mode !== SceneMode.SCENE3D)) {
            return;
        }

        // Do not do out-of-core operations (new content requests, cache removal,
        // process new tiles) during the pick pass.
        var passes = frameState.passes;
        var isPick = (passes.pick && !passes.render);
        var outOfCore = !isPick;

        clearStats(this);

        if (outOfCore) {
            processTiles(this, frameState);
        }
        selectTiles(this, frameState, outOfCore);
        updateTiles(this, frameState);

        // Events are raised (added to the afterRender queue) here since promises
        // may resolve outside of the update loop that then raise events, e.g.,
        // model's readyPromise.
        raiseLoadProgressEvents(this, frameState);

        showStats(this, isPick);
    };

    /**
     * DOC_TBA
     */
    Cesium3DTileset.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    Cesium3DTileset.prototype.destroy = function() {
        // Traverse the tree and destroy all tiles
        if (defined(this._root)) {
            var stack = scratchStack;
            stack.push(this._root);

            while (stack.length > 0) {
                var t = stack.pop();
                t.destroy();

                var children = t.children;
                var length = children.length;
                for (var i = 0; i < length; ++i) {
                    stack.push(children[i]);
                }
            }
        }

        this._root = undefined;
        return destroyObject(this);
    };

    return Cesium3DTileset;
});
