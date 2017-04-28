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

    var Cesium3DTilesetTraversal = {};

    function selectTiles(tileset, frameState, outOfCore) {
        if (tileset.debugFreezeFrame) {
            return;
        }

        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;

        tileset._desiredTiles.length = 0;
        tileset._selectedTiles.length = 0;
        tileset._selectedTilesToStyle.length = 0;
        tileset._hasMixedContent = false;

        // Move sentinel node to the tail so, at the start of the frame, all tiles
        // may be potentially replaced.  Tiles are moved to the right of the sentinel
        // when they are selected so they will not be replaced.
        var replacementList = tileset._replacementList;
        replacementList.splice(replacementList.tail, tileset._replacementSentinel);

        var root = tileset._root;
        root.updateTransform(tileset._modelMatrix);

        if (!root.insideViewerRequestVolume(frameState)) {
            return;
        }

        root.distanceToCamera = root.distanceToTile(frameState);

        if (getScreenSpaceError(tileset, tileset._geometricError, root, frameState) <= maximumScreenSpaceError) {
            // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
            return;
        }

        root.visibilityPlaneMask = root.visibility(frameState, CullingVolume.MASK_INDETERMINATE);
        if (root.visibilityPlaneMask === CullingVolume.MASK_OUTSIDE) {
            return;
        }

        if (root.contentUnloaded) {
            root._requestHeap.insert(root);
            return;
        }

        if (!tileset.skipLODs) {
            // just execute base traversal and add tiles to _desiredTiles
            tileset._baseTraversal.execute(tileset, root, maximumScreenSpaceError, frameState, outOfCore);
            var leaves = tileset._baseTraversal.leaves;
            var length = leaves.length;
            for (var i = 0; i < length; ++i) {
                tileset._desiredTiles.push(leaves.get(i));
            }
        } else {
            if (tileset.immediatelyLoadDesiredLOD) {
                tileset._skipTraversal.execute(tileset, root, frameState, outOfCore);
            } else {
                // leaves of the base traversal is where we start the skip traversal
                tileset._baseTraversal.leaves = tileset._skipTraversal.queue1;

                // load and select tiles without skipping up to tileset._baseScreenSpaceError
                tileset._baseTraversal.execute(tileset, root, tileset._baseScreenSpaceError, frameState, outOfCore);

                // skip traversal starts from a prepopulated queue from the base traversal
                tileset._skipTraversal.execute(tileset, undefined, frameState, outOfCore);
            }
        }

        // mark tiles for selection or their nearest loaded ancestor
        markLoadedTilesForSelection(tileset, frameState, outOfCore);

        // sort selected tiles by distance to camera and call selectTile on each
        // set tile._selectionDepth on all tiles
        traverseAndSelect(tileset, root, frameState);

        tileset._desiredTiles.trim();
    }

    var descendantStack = [];

    function markLoadedTilesForSelection(tileset, frameState, outOfCore) {
        var tiles = tileset._desiredTiles;
        var length = tiles.length;
        for (var i = 0; i < length; ++i) {
            var original = tiles.get(i);

            if (original.refine === Cesium3DTileRefine.ADD && original.contentReady) {
                original.selected = true;
                original._selectedFrame = frameState.frameNumber;
                continue;
            }

            var loadedTile = original._ancestorWithLoadedContent;
            if (original.hasRenderableContent && original.contentReady) {
                loadedTile = original;
            }

            if (defined(loadedTile)) {
                if (!loadedTile.selected) {
                    loadedTile.selected = true;
                    loadedTile._selectedFrame = frameState.frameNumber;
                }
            } else {
                // if no ancestors are ready, traverse down and select ready tiles to minimize empty regions
                descendantStack.push(original);
                while (descendantStack.length > 0) {
                    var tile = descendantStack.pop();
                    var children = tile.children;
                    var childrenLength = children.length;
                    for (var j = 0; j < childrenLength; ++j) {
                        var child = children[j];
                        touch(tileset, child, outOfCore);
                        if (child.contentReady) {
                            if (!child.selected) {
                                child.selected = true;
                                child._finalResolution = true;
                                child._selectedFrame = frameState.frameNumber;
                            }
                        }
                        if (child._depth - original._depth < 2) { // prevent traversing too far
                            if (!child.contentReady || child.refine === Cesium3DTileRefine.ADD) {
                                descendantStack.push(child);
                            }
                        }
                    }
                }
            }
        }
    }

    var scratchStack = [];
    var scratchStack2 = [];

    /**
     * Traverse the tree while tiles are visible and check if their selected frame is the current frame.
     * If so, add it to a selection queue.
     * Tiles are sorted near to far so we can take advantage of early Z.
     * Furthermore, this is a preorder traversal so children tiles are selected before ancestor tiles.
     *
     * The reason for the preorder traversal is so that tiles can easily be marked with their
     * selection depth. A tile's _selectionDepth is its depth in the tree where all non-selected tiles are removed.
     * This property is important for use in the stencil test because we want to render deeper tiles on top of their
     * ancestors. If a tileset is very deep, the depth is unlikely to fit into the stencil buffer.
     *
     * We want to select children before their ancestors because there is no guarantee on the relationship between
     * the children's z-depth and the ancestor's z-depth. We cannot rely on Z because we want the child to appear on top
     * of ancestor regardless of true depth. The stencil tests used require children to be drawn first. @see {@link updateTiles}
     *
     * NOTE: this will no longer work when there is a chain of selected tiles that is longer than the size of the
     * stencil buffer (usually 8 bits). In other words, the subset of the tree containing only selected tiles must be
     * no deeper than 255. It is very, very unlikely this will cause a problem.
     */
    function traverseAndSelect(tileset, root, frameState) {
        var stack = scratchStack;
        var ancestorStack = scratchStack2;

        var lastAncestor;
        stack.push(root);
        while (stack.length > 0 || ancestorStack.length > 0) {
            if (ancestorStack.length > 0) {
                var waitingTile = ancestorStack[ancestorStack.length - 1];
                if (waitingTile._stackLength === stack.length) {
                    ancestorStack.pop();
                    if (waitingTile === lastAncestor) {
                        waitingTile._finalResolution = true;
                    }
                    selectTile(tileset, waitingTile, frameState);
                    continue;
                }
            }

            var tile = stack.pop();
            if (!defined(tile) || tile._lastVisitedFrame !== frameState.frameNumber) {
                continue;
            }

            var shouldSelect = tile.selected && tile._selectedFrame === frameState.frameNumber && tile.hasRenderableContent;

            var children = tile.children;
            var childrenLength = children.length;

            children.sort(sortChildrenByDistanceToCamera);

            if (shouldSelect) {
                if (tile.refine === Cesium3DTileRefine.ADD) {
                    tile._finalResolution = true;
                    selectTile(tileset, tile, frameState);
                } else {
                    tile._selectionDepth = ancestorStack.length;

                    if (tile._selectionDepth > 0) {
                        tileset._hasMixedContent = true;
                    }

                    if (childrenLength === 0) {
                        tile._finalResolution = true;
                        lastAncestor = tile;
                        selectTile(tileset, tile, frameState);
                        continue;
                    }

                    ancestorStack.push(tile);
                    lastAncestor = tile;
                    tile._stackLength = stack.length;
                }
            }

            for (var i = 0; i < childrenLength; ++i) {
                var child = children[i];
                if (isVisible(child.visibilityPlaneMask)) {
                    stack.push(child);
                }
            }
        }
    }

    function selectTile(tileset, tile, frameState) {
        // There may also be a tight box around just the tile's contents, e.g., for a city, we may be
        // zoomed into a neighborhood and can cull the skyscrapers in the root node.
        if (tile.contentReady && (
                (tile.visibilityPlaneMask === CullingVolume.MASK_INSIDE) ||
                (tile.contentVisibility(frameState) !== Intersect.OUTSIDE)
            )) {
            tileset._selectedTiles.push(tile);

            var tileContent = tile.content;
            if (tileContent.featurePropertiesDirty) {
                // A feature's property in this tile changed, the tile needs to be re-styled.
                tileContent.featurePropertiesDirty = false;
                tile.lastStyleTime = 0; // Force applying the style to this tile
                tileset._selectedTilesToStyle.push(tile);
            }  else if ((tile.lastSelectedFrameNumber !== frameState.frameNumber - 1)) {
                // Tile is newly selected; it is selected this frame, but was not selected last frame.
                tileset._selectedTilesToStyle.push(tile);
            }
            tile.lastSelectedFrameNumber = frameState.frameNumber;
        }
    }

    // PERFORMANCE_IDEA: is it worth exploiting frame-to-frame coherence in the sort, i.e., the
    // list of children are probably fully or mostly sorted unless the camera moved significantly?
    function sortChildrenByDistanceToCamera(a, b) {
        // Sort by farthest child first since this is going on a stack
        if (b.distanceToCamera === 0 && a.distanceToCamera === 0) {
            return b._centerZDepth - a._centerZDepth;
        }

        return b.distanceToCamera - a.distanceToCamera;
    }

    var emptyArray = freezeObject([]);

    function BaseTraversal() {
        this.tileset = undefined;
        this.frameState = undefined;
        this.outOfCore = undefined;
        this.stack = new ManagedArray();
        this.leaves = new ManagedArray();
        this.baseScreenSpaceError = undefined;
    }

    BaseTraversal.prototype.execute = function(tileset, root, baseScreenSpaceError, frameState, outOfCore) {
        this.tileset = tileset;
        this.frameState = frameState;
        this.outOfCore = outOfCore;
        this.leaves.length = 0;
        this.baseScreenSpaceError = baseScreenSpaceError;

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('baseScreenSpaceError', baseScreenSpaceError, this.tileset._maximumScreenSpaceError);
        //>>includeEnd('debug');

        DFS(root, this);
    };

    BaseTraversal.prototype.visit = function(tile) {
        visitTile(this.tileset, tile, this.frameState, this.outOfCore);
    };

    BaseTraversal.prototype.getChildren = function(tile) {
        var tileset = this.tileset;
        var baseScreenSpaceError = this.baseScreenSpaceError;

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
            tileset._desiredTiles.push(tile);
        }

        // stop traversal when we've attained the desired level of error
        if (tile._screenSpaceError <= baseScreenSpaceError) {
            return emptyArray;
        }

        var childrenVisibility = updateChildren(tileset, tile, this.frameState);
        var showAdditive = tile.refine === Cesium3DTileRefine.ADD && tile._screenSpaceError > baseScreenSpaceError;
        var showReplacement = tile.refine === Cesium3DTileRefine.REPLACE && (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE_IN_REQUEST_VOLUME) !== 0;

        if (showAdditive || showReplacement || tile.hasTilesetContent || !defined(tile._ancestorWithContent)) {
            var children = tile.children;
            var childrenLength = children.length;
            var allReady = true;
            for (var i = 0; i < childrenLength; ++i) {
                var child = children[i];
                loadTile(child, this.frameState);
                allReady = allReady && child.contentReady;
                touch(tileset, child, this.outOfCore);
            }

            if (allReady) {
                return children;
            }
        }

        return emptyArray;
    };

    BaseTraversal.prototype.shouldVisit = function(tile) {
        return isVisible(tile.visibilityPlaneMask);
    };

    BaseTraversal.prototype.leafHandler = function(tile) {
        this.leaves.push(tile);
    };

    function SkipTraversal(options) {
        this.tileset = undefined;
        this.frameState = undefined;
        this.outOfCore = undefined;
        this.queue1 = new ManagedArray();
        this.queue2 = new ManagedArray();
        this.internalDFS = new InternalSkipTraversal(options.selectionHeuristic);
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

    var scratchQueue = [];

    SkipTraversal.prototype.getChildren = function(tile) {
        scratchQueue.length = 0;
        this.internalDFS.execute(tile, scratchQueue);
        return scratchQueue;
    };

    SkipTraversal.prototype.leafHandler = function(tile) {
        // additive tiles have already been pushed
        if (tile.refine === Cesium3DTileRefine.REPLACE) {
            this.tileset._desiredTiles.push(tile);
        }
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
                tileset._desiredTiles.push(tile);
            }

            // stop traversal when we've attained the desired level of error
            if (tile._screenSpaceError <= maximumScreenSpaceError) {
                return emptyArray;
            }

            // if we have reached the skipping threshold without any loaded ancestors, return empty so this tile is loaded
            if (
                (!tile.hasEmptyContent && tile.contentUnloaded) &&
                defined(tile._ancestorWithLoadedContent) &&
                this.selectionHeuristic(tileset, tile._ancestorWithLoadedContent, tile)) {
                return emptyArray;
            }
        }

        var childrenVisibility = updateChildren(tileset, tile, this.frameState);
        var showAdditive = tile.refine === Cesium3DTileRefine.ADD && tile._screenSpaceError > maximumScreenSpaceError;
        var showReplacement = tile.refine === Cesium3DTileRefine.REPLACE && (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE_IN_REQUEST_VOLUME) !== 0;

        // at least one child is visible, but is not in request volume. the parent must be selected
        if (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE_NOT_IN_REQUEST_VOLUME && tile.refine === Cesium3DTileRefine.REPLACE) {
            this.tileset._desiredTiles.push(tile);
        }

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
        if (!defined(parent)) {
            return true;
        }
        var showAdditive = parent.refine === Cesium3DTileRefine.ADD && parent._screenSpaceError > maximumScreenSpaceError;

        return isVisible(tile.visibilityPlaneMask) && (!showAdditive || getScreenSpaceError(this.tileset, parent.geometricError, tile, this.frameState) > maximumScreenSpaceError);
    };

    InternalSkipTraversal.prototype.leafHandler = function(tile) {
        if (tile !== this.root) {
            if (!tile.hasEmptyContent) {
                if (this.tileset.loadSiblings) {
                    var parent = tile.parent;
                    var tiles = parent.children;
                    var length = tiles.length;
                    for (var i = 0; i < length; ++i) {
                        loadTile(tiles[i], this.frameState);
                    }
                } else {
                    loadTile(tile, this.frameState);
                }
            }
            this.queue.push(tile);
        } else if (tile.refine === Cesium3DTileRefine.REPLACE) {
            // additive tiles have already been pushed
            this.tileset._desiredTiles.push(tile);
        }
    };

    function updateChildren(tileset, tile, frameState) {
        var children = tile.children;

        updateTransforms(children, tile.computedTransform);
        computeDistanceToCamera(children, frameState);

        return computeChildrenVisibility(tile, frameState, true);
    }

    function visitTile(tileset, tile, frameState, outOfCore) {
        // because the leaves of one tree traversal are the root of the subsequent traversal, avoid double visitation
        if (tile._lastVisitedFrame !== frameState.frameNumber) {
            tile._lastVisitedFrame = frameState.frameNumber;

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
                tile._ancestorWithContent = (replace && parent.hasRenderableContent) ? parent : parent._ancestorWithContent;
                tile._ancestorWithLoadedContent = (replace && parent.hasRenderableContent && parent.contentReady) ? parent : parent._ancestorWithLoadedContent;
            }
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
        if (tile._screenSpaceErrorComputedFrame !== frameState.frameNumber) {
            tile._screenSpaceErrorComputedFrame = frameState.frameNumber;
            tile._screenSpaceError = getScreenSpaceError(tile._tileset, tile.geometricError, tile, frameState);
        }
    }

    function loadTile(tile, frameState) {
        if (tile.contentUnloaded && tile._requestedFrame !== frameState.frameNumber) {
            tile._requestedFrame = frameState.frameNumber;
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
                for (var j = 0; j < childrenLength; ++j) {
                    var child = children[j];

                    if (!defined(options.shouldVisit) || options.shouldVisit(child)) {
                        queue2.push(child);
                    }
                }

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

    Cesium3DTilesetTraversal.selectTiles = selectTiles;

    Cesium3DTilesetTraversal.BaseTraversal = BaseTraversal;

    Cesium3DTilesetTraversal.SkipTraversal = SkipTraversal;

    return Cesium3DTilesetTraversal;
});