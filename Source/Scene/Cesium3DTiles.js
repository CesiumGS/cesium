/*global define*/
define([
        '../Core/appendForwardSlash',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Intersect',
        '../Core/loadJson',
        '../Core/Math',
        './Cesium3DTile',
        './SceneMode',
        '../ThirdParty/when'
    ], function(
        appendForwardSlash,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Intersect,
        loadJson,
        CesiumMath,
        Cesium3DTile,
        SceneMode,
        when) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url TODO
     * @param {Boolean} [options.show=true] TODO
     * @param {Boolean} [options.maximumScreenSpaceError=32] TODO
     * @param {Boolean} [options.debugShowStatistics=false] TODO
     * @param {Boolean} [options.debugFreezeFrame=false] TODO
     * @param {Boolean} [options.debugColorizeTiles=false] TODO
     * @param {Boolean} [options.debugShowBox=false] TODO
     * @param {Boolean} [options.debugShowcontentBox=false] TODO
     * @param {Boolean} [options.debugShowBoundingVolume=false] TODO
     * @param {Boolean} [options.debugShowContentsBoundingVolume=false] TODO
     *
     * @alias Cesium3DTiles
     * @constructor
     * @private
     */
    var Cesium3DTiles = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var url = options.url;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        var baseUrl = appendForwardSlash(url);

        this._url = url;
        this._root = undefined;
        this._geometricError = undefined; // Geometric error when the tree is not rendered at all
// TODO: a linked list would be better depending on how how it allocates/frees.
        this._processingQueue = [];
        this._selectedTiles = [];

        /**
         * DOC_TBA
         */
        this.show = defaultValue(options.show, true);

        /**
         * DOC_TBA
         */
        this.maximumScreenSpaceError = defaultValue(options.maximumScreenSpaceError, 32);

        /**
         * DOC_TBA
         */
        this.debugShowStatistics = defaultValue(options.debugShowStatistics, false);
        this._statistics = {
            visited : 0,
            frustumTests : 0,

            lastSelected : -1,
            lastVisited : -1,
            lastFrustumTests : -1
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
        this.debugShowcontentBox = defaultValue(options.debugShowcontentBox, false);

        /**
         * DOC_TBA
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        /**
         * DOC_TBA
         */
        this.debugShowContentsBoundingVolume = defaultValue(options.debugShowContentsBoundingVolume, false);

        var that = this;

        loadJson(baseUrl + 'tree.json').then(function(tree) {
            that._geometricError = tree.geometricError;
            that._root = new Cesium3DTile(baseUrl, tree.root, undefined);

            var stack = [];
            stack.push({
                header : tree.root,
                cesium3DTile : that._root
            });

// TODO: allow tree itself to be out-of-core?  Or have content-type that can be a tree?
            while (stack.length > 0) {
                var n = stack.pop();
                var skeletonChildren = n.header.children;
                var length = skeletonChildren.length;
                for (var k = 0; k < length; ++k) {
                    var skeletonChild = skeletonChildren[k];
                    var cesium3DTileChild = new Cesium3DTile(baseUrl, skeletonChild, n.cesium3DTile);
                    n.cesium3DTile.children.push(cesium3DTileChild);

                    stack.push({
                        header : skeletonChild,
                        cesium3DTile : cesium3DTileChild
                    });
                }
            }
        });
    };

    defineProperties(Cesium3DTiles.prototype, {
        /**
         * DOC_TBA
         *
         * @memberof Cesium3DTiles.prototype
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

    function visible(tile, cullingVolume, stats) {
        // Exploit temporal coherence: if a tile is completely in the view frustum
        // then so are its children so they do not need to be culled.
        if (tile.parentFullyVisible) {
            return Intersect.INSIDE;
        }

        ++stats.frustumTests;
        return tile.visibility(cullingVolume);
    }

    function contentsVisible(tile, cullingVolume) {
        if (tile.parentFullyVisible) {
            return true;
        }

        return tile.contentsVisibility(cullingVolume) !== Intersect.OUTSIDE;
    }

    function getScreenSpaceError(tile, context, frameState) {
// TODO: screenSpaceError2D like QuadtreePrimitive.js
        if (tile.geometricError === 0.0) {
            // Leaf nodes do not have any error so save the computation
            return tile.geometricError;
        }

        return getExplicitScreenSpaceError(tile.geometricError, tile, context, frameState);
    }

    function getExplicitScreenSpaceError(geometricError, tile, context, frameState) {
        // Avoid divide by zero when viewer is inside the tile
        var distance = Math.max(tile.distanceToCamera, CesiumMath.EPSILON7);
        var height = context.drawingBufferHeight;
        var sseDenominator = frameState.camera.frustum.sseDenominator;

        return (geometricError * height) / (distance * sseDenominator);
    }

    function computeDistanceToCamera(children, frameState) {
        var camera = frameState.camera;
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

    function requestChild(tiles3D, tile) {
        tile.requestContent();
        var removeFunction = removeFromProcessingQueue(tiles3D, tile);
        when(tile.processingPromise).then(addToProcessingQueue(tiles3D, tile));
        when(tile.readyPromise).then(removeFunction).otherwise(removeFunction);
    }

    function requestChildren(tiles3D, parent, frameState) {
        var children = parent.children;
        var length = children.length;

        // Sort to request tiles closest to the viewer first
        computeDistanceToCamera(children, frameState);
        children.sort(sortChildrenByDistanceToCamera);

        for (var i = 0; i < length; ++i) {
            var child = children[i];
            if (child.isContentUnloaded()) {
                requestChild(tiles3D, child);
            }
 // TODO: when we don't require all four children for refinement and we don't require top-down rendering, we can only request visible children, e.g.,
 //   (parentFullyVisible || (contentsVisible(child, frameState.cullingVolume) !== Intersect.OUTSIDE))
        }
    }

    function selectTile(selectedTiles, tile, fullyVisible, frameState) {
        // There may also be a tight box around just the tile's contents, e.g., for a city, we may be
        // zoomed into a neighborhood and can cull the skyscrapers in the root node.
        if (tile.isReady() && (fullyVisible || contentsVisible(tile, frameState.cullingVolume))) {
            selectedTiles.push(tile);
        }
    }

    var scratchStack = [];

    function selectTiles(tiles3D, context, frameState, commandList) {
        if (tiles3D.debugFreezeFrame) {
            return;
        }

        var maximumScreenSpaceError = tiles3D.maximumScreenSpaceError;
        var cullingVolume = frameState.cullingVolume;

        var selectedTiles = tiles3D._selectedTiles;
        selectedTiles.length = 0;

        var root = tiles3D._root;
        root.distanceToCamera = root.distanceToTile(frameState);

        if (getExplicitScreenSpaceError(tiles3D._geometricError, root, context, frameState) <= maximumScreenSpaceError) {
            // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
            return;
        }

        if (root.isContentUnloaded()) {
            requestChild(tiles3D, root);
            return;
        }

        var stats = tiles3D._statistics;

        var stack = scratchStack;
        stack.push(root);
//console.log('---');
        while (stack.length > 0) {
            // Depth first.  We want the high detail tiles first.
            var t = stack.pop();
            ++stats.visited;

            var visibility = visible(t, cullingVolume, stats);
            var fullyVisible = (visibility === Intersect.INSIDE);
            if (visibility === Intersect.OUTSIDE) {
                // Tile is completely outside of the view frustum; therefore
                // so are all of its children.
                continue;
            }

            // Tile is inside/intersects the view frustum.  How many pixels is its geometric error?
            var sse = getScreenSpaceError(t, context, frameState);
// TODO: refine also based on (1) occlusion/VMSSE and/or (2) center of viewport

            var children = t.children;
            var childrenLength = children.length;
            var allChildrenLoaded = t.numberOfChildrenWithoutContent === 0;

            if ((sse <= maximumScreenSpaceError) || (childrenLength === 0.0)) {
                // This tile meets the SSE so add its commands.
                //
                // We also checked if the tile is a leaf (childrenLength === 0.0) for the potential case when the leaf
                // node has a non-zero geometric error, e.g., because its contents is another 3D Tiles tree.
                selectTile(selectedTiles, t, fullyVisible, frameState);
//console.log(t._content._url);
            } else if (!allChildrenLoaded) {
                // Tile does not meet SSE.  Add its commands since it is the best we have and request its children.
                selectTile(selectedTiles, t, fullyVisible, frameState);
//console.log(t._content._url);
                requestChildren(tiles3D, t, frameState);
            } else {
                // Tile does not meet SEE and its children are loaded.  Refine to them in front-to-back order.

                // Distance is used for sorting now and for computing SSE when the tile comes off the stack.
                computeDistanceToCamera(children, frameState);

                // Sort children by distance for (1) request ordering, and (2) early-z
                children.sort(sortChildrenByDistanceToCamera);
// TODO: is pixel size better?  Same question for requestChildren().
// TODO: consider priority queue instead of explicit sort, which would no longer be BFS, and would not average detail throughout the tree

                for (var k = 0; k < childrenLength; ++k) {
                    var child = children[k];
                    child.parentFullyVisible = fullyVisible;
                    stack.push(child);
                }
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    function addToProcessingQueue(tiles3D, tile) {
        return function() {
            tiles3D._processingQueue.push(tile);
        };
    }

    function removeFromProcessingQueue(tiles3D, tile) {
        return function() {
            var index = tiles3D._processingQueue.indexOf(tile);
            tiles3D._processingQueue.splice(index, 1);
        };
    }

    function processTiles(tiles3D, context, frameState) {
        var tiles = tiles3D._processingQueue;
        var length = tiles.length;

        // Process tiles in the PROCESSING state so they will eventually move to the READY state.
        // Traverse backwards in case a tile is removed as a result of calling process()
        for (var i = length - 1; i >= 0; --i) {
            tiles[i].process(tiles3D, context, frameState);
        }
// TODO: timeslice like QuadtreePrimitive.js (but with round robin?) Or should that happen at a lower-level, e.g., models/renderer?
    }

    ///////////////////////////////////////////////////////////////////////////

    function clearStats(tiles3D) {
        var stats = tiles3D._statistics;
        stats.visited = 0;
        stats.frustumTests = 0;
    }

    function showStats(tiles3D) {
        var stats = tiles3D._statistics;

        if (tiles3D.debugShowStatistics && (
            stats.lastVisited !== stats.visited ||
            stats.lastFrustumTests !== stats.frustumTests ||
            stats.lastSelected !== tiles3D._selectedTiles.length)) {

            stats.lastVisited = stats.visited;
            stats.lastFrustumTests = stats.frustumTests;
            stats.lastSelected = tiles3D._selectedTiles.length;

            var s =
                'Visited: ' + stats.visited +
                // Frustum tests do not include tests for child tile requests or culling the contents.
                // This number can be less than the number of tiles visited since spatial coherence is
                // exploited to avoid unnecessary checks.
                ', Frustum Tests: ' + stats.frustumTests +
                // Number of commands executed is likely to be higher than the number of tiles selected
                // because of tiles that create multiple commands and/or overlap multiple frustums.
                ', Selected: ' + tiles3D._selectedTiles.length;

            /*global console*/
            console.log(s);
        }
    }

    /**
     * DOC_TBA
     */
    Cesium3DTiles.prototype.update = function(context, frameState, commandList) {
        // TODO: Support 2D and CV
        if (!this.show || !defined(this._root) || (frameState.mode !== SceneMode.SCENE3D)) {
            return;
        }

        clearStats(this);

        processTiles(this, context, frameState);
        selectTiles(this, context, frameState, commandList);

        var selectedTiles = this._selectedTiles;
        var length = selectedTiles.length;
        for (var i = 0; i < length; ++i) {
            selectedTiles[i].update(this, context, frameState, commandList);
        }

        showStats(this);
    };

    /**
     * DOC_TBA
     */
    Cesium3DTiles.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    Cesium3DTiles.prototype.destroy = function() {
// TODO: traverse and destroy...careful of pending loads/processing
        return destroyObject(this);
    };

    return Cesium3DTiles;
});