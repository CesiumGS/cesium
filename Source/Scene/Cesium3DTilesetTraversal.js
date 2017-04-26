/*global define*/
define([
        '../Core/Check',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/freezeObject',
        '../Core/Intersect',
        '../Core/ManagedArray',
        '../Core/Math',
        './Cesium3DTileChildrenVisibility',
        './Cesium3DTileRefine',
        './CullingVolume',
        './OrthographicFrustum',
        './SceneMode'
    ], function(
        Check,
        defined,
        defineProperties,
        freezeObject,
        Intersect,
        ManagedArray,
        CesiumMath,
        Cesium3DTileChildrenVisibility,
        Cesium3DTileRefine,
        CullingVolume,
        OrthographicFrustum,
        SceneMode) {
    'use strict';

    var emptyArray = freezeObject([]);

    function BaseTraversal() {
        this.tileset = undefined;
        this.frameState = undefined;
        this.outOfCore = undefined;
        this.stack = new ManagedArray();
        this.leaves = new ManagedArray();
    }

    BaseTraversal.prototype.execute = function(tileset, root, frameState, outOfCore) {
        this.tileset = tileset;
        this.frameState = frameState;
        this.outOfCore = outOfCore;
        this.leaves.length = 0;

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('baseScreenSpaceError', this.tileset._baseScreenSpaceError, this.tileset._maximumScreenSpaceError);
        //>>includeEnd('debug');

        DFS(root, this);
        // return this.leaves;
    };

    BaseTraversal.prototype.visit = function(tile) {
        visitTile(this.tileset, tile, this.frameState, this.outOfCore);
    };

    BaseTraversal.prototype.getChildren = function(tile) {
        var tileset = this.tileset;
        var baseScreenSpaceError = tileset._baseScreenSpaceError;

        if (tile.hasTilesetContent) {
            // load any tilesets of tilesets now because at this point we still have not achieved a base level of content
            if (!defined(tile._ancestorWithContent)) {
                loadTile(tile, this.frameState);
            }
            if (!tile.contentReady) {
                return emptyArray;
            }
        }

        if (tile.refine === Cesium3DTileRefine.ADD) {
            if (tile.hasContent) {
                tileset._desiredTiles.push(tile);
            }
        } else {
            if (tile.hasContent && // continue traversal until some content exists at all branches of the tree
                tile._sse <= baseScreenSpaceError) {  // stop traversal when we've attained the desired level of error
                return emptyArray;
            }
        }

        var childrenVisibility = updateChildren(tileset, tile, this.frameState);
        var showAdditive = tile.refine === Cesium3DTileRefine.ADD && tile._sse > baseScreenSpaceError;
        var showReplacement = tile.refine === Cesium3DTileRefine.REPLACE && (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE_IN_REQUEST_VOLUME) !== 0;

        if (showAdditive || showReplacement || tile.hasTilesetContent || !defined(tile._ancestorWithContent)) {
            var children = tile.children;
            var childrenLength = children.length;
            var allVisibleReady = true;
            for (var i = 0; i < childrenLength; ++i) {
                var child = children[i];
                if (isVisible(child.visibilityPlaneMask)) {
                    loadTile(child, this.frameState);
                    allVisibleReady = allVisibleReady && child.contentReady;
                }
                touch(tileset, child, this.outOfCore);
            }

            if (allVisibleReady) {
                return children;
            }
        }

        return emptyArray;
    };

    BaseTraversal.prototype.shouldVisit = function(tile) {
        return isVisible(tile.visibilityPlaneMask);
    }

    BaseTraversal.prototype.leafHandler = function(tile) {
        var contentTile = tile._ancestorWithLoadedContent;
        if (tile.hasContent && tile.contentReady) {
            contentTile = tile;
        }

        if (defined(contentTile)) {
            this.leaves.push(contentTile);
        } else {
            this.tileset._desiredTiles.push(tile);
        }
    };

    function SkipTraversal(options) {
        this.tileset = undefined;
        this.frameState = undefined;
        this.outOfCore = undefined;
        this.queue1 = new ManagedArray();
        this.queue2 = new ManagedArray();
        this.internalDFS = new InternalSkipTraversal(options.selectionHeuristic);
        this.selectedTiles = options.selectedTiles;
    }

    SkipTraversal.prototype.execute = function(tileset, root, frameState, outOfCore) {
        this.tileset = tileset;
        this.frameState = frameState;
        this.outOfCore = outOfCore;
        this.internalDFS.frameState = frameState;
        this.internalDFS.outOfCore = outOfCore;

        BFS(root, this);
        this.queue1.length = 0;
        this.queue2.length = 0;
    };

    SkipTraversal.prototype.visit = function(tile) {
        visitTile(this.tileset, tile, this.frameState, this.outOfCore);
    };

    SkipTraversal.prototype.getChildren = function(tile) {
        this.internalDFS.execute(tile, this.queue2);
        return this.queue2;
    };

    SkipTraversal.prototype.addChildren = function(children, queue) {
        // the internal DFS already adds to queue2
    };

    SkipTraversal.prototype.leafHandler = function(tile) {
        this.tileset._desiredTiles.push(tile);
    };

    function InternalSkipTraversal(selectionHeuristic) {
        this.selectionHeuristic = selectionHeuristic;
        this.tileset = undefined;
        this.frameState = undefined;
        this.outOfCore = undefined;
        this.root = undefined;
        this.queue = undefined;
        this.stack = new ManagedArray();
    }

    InternalSkipTraversal.prototype.execute = function(root, queue) {
        this.tileset = root._tileset;
        this.root = root;
        this.queue = queue;
        DFS(root, this);
    };

    InternalSkipTraversal.prototype.visit = function(tile) {
        visitTile(this.tileset, tile, this.frameState, this.outOfCore);
    };

    InternalSkipTraversal.prototype.getChildren = function(tile) {
        var tileset = tile._tileset;
        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;

        if (tile.hasTilesetContent) {
            if (!tile.contentReady) {
                return emptyArray;
            }
        } else {
            if (tile.refine === Cesium3DTileRefine.ADD) {
                if (tile.hasContent) {
                    tileset._desiredTiles.push(tile);
                }
            } else if (tile.hasContent) {   // require the tile to have content before refining it
                if (tile._sse <= maximumScreenSpaceError) {
                    return emptyArray;
                }

                // if we have reached the skipping threshold without any loaded ancestors, return empty so this tile is loaded
                if (defined(tile._ancestorWithLoadedContent) && this.selectionHeuristic(tileset, tile._ancestorWithLoadedContent, tile)) {
                    return emptyArray;
                }
            }
        }

        var childrenVisibility = updateChildren(tileset, tile, this.frameState);
        var showAdditive = tile.refine === Cesium3DTileRefine.ADD && tile._sse > maximumScreenSpaceError;
        var showReplacement = tile.refine === Cesium3DTileRefine.REPLACE && (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE_IN_REQUEST_VOLUME) !== 0;

        if (showAdditive || showReplacement || tile.hasTilesetContent) {
            var children = tile.children;
            var childrenLength = children.length;
            for (var i = 0; i < childrenLength; ++i) {
                touch(tileset, children[i], this.outOfCore);
            }
            return children;
        } else {
            return emptyArray;
        }
    };

    InternalSkipTraversal.prototype.shouldVisit = function(tile) {
        var maximumScreenSpaceError = this.tileset._maximumScreenSpaceError;
        var parent = tile.parent;
        var showAdditive = parent.refine === Cesium3DTileRefine.ADD && parent._sse > maximumScreenSpaceError;
        var showReplacement = parent.refine === Cesium3DTileRefine.REPLACE && (parent.childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE_IN_REQUEST_VOLUME) !== 0;

        return isVisible(tile.visibilityPlaneMask) && (!showAdditive || getScreenSpaceError(this.tileset, parent.geometricError, tile, frameState) > maximumScreenSpaceError);
    };

    InternalSkipTraversal.prototype.leafHandler = function(tile) {
        if (tile !== this.root) {

            if (tile.hasContent || tile.hasTilesetContent) {
                loadTile(tile, this.frameState);
            }

            this.queue.push(tile);

        } else {
            this.tileset._desiredTiles.push(tile);
        }
    };

    function updateChildren(tileset, tile, frameState) {
        var children = tile.children;
        var childrenLength = children.length;

        updateTransforms(children, tile.computedTransform);
        computeDistanceToCamera(children, frameState);

        return computeChildrenVisibility(tile, frameState, true);
    }

    function visitTile(tileset, tile, frameState, outOfCore) {
        ++tileset._statistics.visited;
        tile.selected = false;
        tile._finalResolution = false;
        computeSSE(tile, frameState);
        touch(tileset, tile, outOfCore);
        tile._ancestorWithContent = undefined;
        tile._ancestorWithLoadedContent = undefined;
        var parent = tile.parent;
        if (defined(parent)) {
            var replace = parent.refine === Cesium3DTileRefine.REPLACE;
            tile._ancestorWithContent = (replace && parent.hasContent) ? parent : parent._ancestorWithContent;
            tile._ancestorWithLoadedContent = (replace && parent.hasContent && parent.contentReady) ? parent : parent._ancestorWithLoadedContent;
        }
    }

    function touch(tileset, tile, outOfCore) {
        if (!outOfCore) {
            return;
        }
        var node = tile.replacementNode;
        if (defined(node)) {
            tileset._replacementList.splice(tileset._replacementSentinel, node);
        }
    }

    function computeSSE(tile, frameState) {
        if (tile._sseComputedFrame !== frameState.frameNumber) {
            tile._sseComputedFrame = frameState.frameNumber;
            tile._sse = getScreenSpaceError(tile._tileset, tile.geometricError, tile, frameState);
        }
    }

    function loadTile(tile, frameState) {
        if (tile.contentUnloaded) {
            computeSSE(tile, frameState);
            tile._requestHeap.insert(tile);
        }
    }

    function computeChildrenVisibility(tile, frameState, checkViewerRequestVolume) {
        var flag = Cesium3DTileChildrenVisibility.NONE;
        var children = tile.children;
        var childrenLength = children.length;
        var visibilityPlaneMask = tile.visibilityPlaneMask;
        for (var k = 0; k < childrenLength; ++k) {
            var child = children[k];

            var visibilityMask = child.visibility(frameState, visibilityPlaneMask);

            if (isVisible(visibilityMask)) {
                flag |= Cesium3DTileChildrenVisibility.VISIBLE;
            }

            if (checkViewerRequestVolume) {
                if (!child.insideViewerRequestVolume(frameState)) {
                    if (isVisible(visibilityMask)) {
                        flag |= Cesium3DTileChildrenVisibility.VISIBLE_NOT_IN_REQUEST_VOLUME;
                    }
                    visibilityMask = CullingVolume.MASK_OUTSIDE;
                } else {
                    flag |= Cesium3DTileChildrenVisibility.IN_REQUEST_VOLUME;
                    if (isVisible(visibilityMask)) {
                        flag |= Cesium3DTileChildrenVisibility.VISIBLE_IN_REQUEST_VOLUME;
                    }
                }
            }

            child.visibilityPlaneMask = visibilityMask;
        }

        tile.childrenVisibility = flag;

        return flag;
    }

    function getScreenSpaceError(tileset, geometricError, tile, frameState) {
        if (geometricError === 0.0) {
            // Leaf nodes do not have any error so save the computation
            return 0.0;
        }

        // Avoid divide by zero when viewer is inside the tile
        var camera = frameState.camera;
        var frustum = camera.frustum;
        var context = frameState.context;
        var height = context.drawingBufferHeight;

        var error;
        if (frameState.mode === SceneMode.SCENE2D || frustum instanceof OrthographicFrustum) {
            if (defined(frustum._offCenterFrustum)) {
                frustum = frustum._offCenterFrustum;
            }
            var width = context.drawingBufferWidth;
            var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(width, height);
            error = geometricError / pixelSize;
        } else {
            var distance = Math.max(tile.distanceToCamera, CesiumMath.EPSILON7);
            var sseDenominator = camera.frustum.sseDenominator;
            error = (geometricError * height) / (distance * sseDenominator);

            if (tileset.dynamicScreenSpaceError) {
                var density = tileset._dynamicScreenSpaceErrorComputedDensity;
                var factor = tileset.dynamicScreenSpaceErrorFactor;
                var dynamicError = CesiumMath.fog(distance, density) * factor;
                error -= dynamicError;
            }
        }

        return error;
    }

    function computeDistanceToCamera(children, frameState) {
        var length = children.length;
        for (var i = 0; i < length; ++i) {
            var child = children[i];
            child.distanceToCamera = child.distanceToTile(frameState);
            child._centerZDepth = child.distanceToTileCenter(frameState);
        }
    }

    function updateTransforms(children, parentTransform) {
        var length = children.length;
        for (var i = 0; i < length; ++i) {
            var child = children[i];
            child.updateTransform(parentTransform);
        }
    }

    function isVisible(visibilityPlaneMask) {
        return visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE;
    }

    function DFS(root, options) {
        var stack = options.stack;

        if (defined(root) && (!defined(options.shouldVisit) || options.shouldVisit(root))) {
            stack.push(root);
        }

        var maxLength = 0;
        while (stack.length > 0) {
            maxLength = Math.max(maxLength, stack.length);

            var node = stack.pop();
            options.visit(node);
            var children = options.getChildren(node);
            var length = children.length;
            for (var i = 0; i < length; ++i) {
                var child = children[i];

                if (!defined(options.shouldVisit) || options.shouldVisit(child)) {
                    stack.push(child);
                }
            }

            if (length === 0 && defined(options.leafHandler)) {
                options.leafHandler(node);
            }
        }

        if (defined(stack.trim)) {
            stack.trim(maxLength);
        }
    }

    function BFS(root, options) {
        var queue1 = options.queue1;
        var queue2 = options.queue2;

        if (defined(root) && (!defined(options.shouldVisit) || options.shouldVisit(root))) {
            queue1.push(root);
        }

        var maxLength = 0;
        while (queue1.length > 0) {
            var length = queue1.length;
            maxLength = Math.max(maxLength, length);

            for (var i = 0; i < length; ++i) {
                var node = queue1.get(i);
                options.visit(node);
                var children = options.getChildren(node);
                var childrenLength = children.length;
                maxLength = Math.max(maxLength, childrenLength);
                options.addChildren(children, queue2);

                if (childrenLength === 0 && defined(options.leafHandler)) {
                    options.leafHandler(node);
                }
            }

            queue1.length = 0;
            var temp = queue1;
            queue1 = queue2;
            queue2 = temp;
            options.queue1 = queue1;
            options.queue2 = queue2;
        }

        queue1.length = 0;
        queue2.length = 0;

        if (defined(queue1.trim)) {
            queue1.trim(maxLength);
        }
        if (defined(queue2.trim)) {
            queue2.trim(maxLength);
        }
    }

    return {
        BaseTraversal: BaseTraversal,
        SkipTraversal: SkipTraversal
    };
});