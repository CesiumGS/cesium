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
        '../Core/Queue',
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
        Queue,
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
     * @param {Boolean} [options.maximumScreenSpaceError=2] TODO
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

        /**
         * DOC_TBA
         */
        this.show = defaultValue(options.show, true);

        /**
         * DOC_TBA
         */
        this.maximumScreenSpaceError = defaultValue(options.maximumScreenSpaceError, 100);

        var that = this;

        loadJson(baseUrl + 'tree.json').then(function(tree) {
            that._geometricError = tree.geometricError;
            that._root = new Cesium3DTile(baseUrl, tree.root, undefined);

            var stack = [];
            stack.push({
                skeletonTile : tree.root,
                cesium3DTile : that._root
            });

// TODO: allow skeleton tree itself to be out-of-core
            while (stack.length > 0) {
                var n = stack.pop();
                var skeletonChildren = n.skeletonTile.children;
                var length = skeletonChildren.length;
                for (var k = 0; k < length; ++k) {
                    var skeletonChild = skeletonChildren[k];
                    var cesium3DTileChild = new Cesium3DTile(baseUrl, skeletonChild, n.cesium3DTile);
                    n.cesium3DTile.children.push(cesium3DTileChild);

                    stack.push({
                        skeletonTile : skeletonChild,
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

    function visible(tile, cullingVolume) {
        // Exploit temporal coherence: if a tile is completely in the view frustum
        // then so are its children so they do not need to be culled.
        if (tile.parentFullyVisible) {
            return Intersect.INSIDE;
        }

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

        return (tile.geometricError * height) / (distance * sseDenominator);
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
        // Sort by closest child first
        return a.distanceToCamera - b.distanceToCamera;
    }

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

    function requestChildren(tiles3D, parent, frameState, parentFullyVisible) {
        var cullingVolume = frameState.cullingVolume;
        var children = parent.children;
        var length = children.length;

        // Sort so we request tiles closest to the viewer first
        computeDistanceToCamera(children, frameState);
        children.sort(sortChildrenByDistanceToCamera);
        for (var i = 0; i < length; ++i) {
            var child = children[i];
            // Use visisble() instead of contentsVisible() since the child may have
            // visible ancestors even if contents are not visible
            if (parentFullyVisible || (visible(child, cullingVolume) !== Intersect.OUTSIDE)) {
                if (child.request()) {
                    var removeFunction = removeFromProcessingQueue(tiles3D, child);
                    when(child.processingPromise).then(addToProcessingQueue(tiles3D, child));
                    when(child.readyPromise).then(removeFunction).otherwise(removeFunction);
                }
            }
        }
    }

    var scratchQueue = new Queue({
        compact : false
    });

    function spatialTraverse(tiles3D, context, frameState, commandList) {
        var maximumScreenSpaceError = tiles3D.maximumScreenSpaceError;
        var cullingVolume = frameState.cullingVolume;

        var root = tiles3D._root;
        root.distanceToCamera = root.distanceToTile(frameState);

        if (getExplicitScreenSpaceError(tiles3D._geometricError, root, context, frameState) <= maximumScreenSpaceError) {
            // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
            return;
        }

        if (root.isUnloaded()) {
            root.request();
            return;
        }

        var queue = scratchQueue;
        queue.enqueue(root);

        while (queue.length > 0) {
            // Level-order breath-first
            var t = queue.dequeue();

            var visibility = visible(t, cullingVolume);
            var fullyVisible = (visibility === Intersect.INSIDE);
            if (visibility === Intersect.OUTSIDE) {
                // Tile is completely outside of the view frustum; therefore
                // so are all of its children.
                continue;
            }

            // Tile is inside/interest the view frustum.  How many pixels is its error?
            var sse = getScreenSpaceError(t, context, frameState);
// TODO: refine also based on (1) occlusion/VMSSE and/or (2) center of viewport

            var children = t.children;
            var childrenLength = children.length;
            var childrenNeedLoad = (t.numberOfChildrenWithoutContent !== 0);

            // Check if the tile is a leaf (childrenLength === 0.0) for the
            // potential case when the leaf node has a non-zero geometric error.
            if ((sse <= maximumScreenSpaceError) || (childrenLength === 0.0) || (childrenNeedLoad)) {
                // There may also be a tight box around just the models in the tile
                if (fullyVisible || contentsVisible(t, cullingVolume)) {
                    t.update(context, frameState, commandList);
                }

                if ((sse > maximumScreenSpaceError) && childrenNeedLoad) {
                    requestChildren(tiles3D, t, frameState, fullyVisible);
                }
            } else {
                // Distance is used for computing SSE and for sorting.
                computeDistanceToCamera(children, frameState);

                // Sort children by distance for (1) request ordering, and (2) early-z
                children.sort(sortChildrenByDistanceToCamera);
// TODO: is pixel size better?  Same question for requestChildren().
// TODO: consider priority queue instead of explicit sort, which would no longer be BFS, and would not average detail throughout the tree

                for (var k = 0; k < childrenLength; ++k) {
                    var child = children[k];
                    child.parentFullyVisible = fullyVisible;
                    queue.enqueue(child);
                }
            }
        }

        queue.clear();
    }

    function processTiles(tiles3D, context, frameState) {
        var tiles = tiles3D._processingQueue;
        var length = tiles.length;

        // Process tiles in the PROCESSING state so they will eventually move to the READY state.
        for (var i = 0; i < length; ++i) {
            tiles[i].process(context, frameState);
        }
// TODO: timeslice like QuadtreePrimitive.js (but with round robin?) Or should that happen at a lower-level, e.g., models/renderer?
    }

    /**
     * DOC_TBA
     */
    Cesium3DTiles.prototype.update = function(context, frameState, commandList) {
        // TODO: Support 2D and CV
        if (!this.show || !defined(this._root) || (frameState.mode !== SceneMode.SCENE3D)) {
            return;
        }

        processTiles(this, context, frameState);
        spatialTraverse(this, context, frameState, commandList);
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
        return destroyObject(this);
    };

    return Cesium3DTiles;
});