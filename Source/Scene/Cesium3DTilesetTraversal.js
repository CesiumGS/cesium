define([
        '../Core/CullingVolume',
        '../Core/defined',
        '../Core/freezeObject',
        '../Core/Intersect',
        '../Core/ManagedArray',
        '../Core/Math',
        '../Core/OrthographicFrustum',
        './Cesium3DTileChildrenVisibility',
        './Cesium3DTileRefine',
        './SceneMode'
    ], function(
        CullingVolume,
        defined,
        freezeObject,
        Intersect,
        ManagedArray,
        CesiumMath,
        OrthographicFrustum,
        Cesium3DTileChildrenVisibility,
        Cesium3DTileRefine,
        SceneMode) {
    'use strict';

    /**
     * @private
     */
    var Cesium3DTilesetTraversal = {};

    function selectTiles(tileset, frameState, outOfCore) {
        if (tileset.debugFreezeFrame) {
            return;
        }

        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;

        tileset._desiredTiles.length = 0;
        tileset._selectedTiles.length = 0;
        tileset._requestedTiles.length = 0;
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

        root._distanceToCamera = root.distanceToTile(frameState);

        if (getScreenSpaceError(tileset, tileset._geometricError, root, frameState) <= maximumScreenSpaceError) {
            // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
            return;
        }

        root._visibilityPlaneMask = root.visibility(frameState, CullingVolume.MASK_INDETERMINATE);
        if (root._visibilityPlaneMask === CullingVolume.MASK_OUTSIDE) {
            return;
        }

        loadTile(tileset, root, frameState, true);

        if (!tileset.skipLevelOfDetail) {
            // just execute base traversal and add tiles to _desiredTiles
            tileset._baseTraversal.execute(tileset, root, maximumScreenSpaceError, frameState, outOfCore);
            var leaves = tileset._baseTraversal.leaves;
            var length = leaves.length;
            for (var i = 0; i < length; ++i) {
                tileset._desiredTiles.push(leaves.get(i));
            }
        } else if (tileset.immediatelyLoadDesiredLevelOfDetail) {
            tileset._skipTraversal.execute(tileset, root, frameState, outOfCore);
        } else {
            // leaves of the base traversal is where we start the skip traversal
            tileset._baseTraversal.leaves = tileset._skipTraversal.queue1;

            // load and select tiles without skipping up to tileset.baseScreenSpaceError
            tileset._baseTraversal.execute(tileset, root, tileset.baseScreenSpaceError, frameState, outOfCore);

            // skip traversal starts from a prepopulated queue from the base traversal
            tileset._skipTraversal.execute(tileset, undefined, frameState, outOfCore);
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

            if (hasAdditiveContent(original)) {
                original.selected = true;
                original._selectedFrame = frameState.frameNumber;
                continue;
            }

            var loadedTile = original._ancestorWithLoadedContent;
            if (original.hasRenderableContent && original.contentAvailable) {
                loadedTile = original;
            }

            if (defined(loadedTile)) {
                loadedTile.selected = true;
                loadedTile._selectedFrame = frameState.frameNumber;
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
                        if (child.contentAvailable) {
                            child.selected = true;
                            child._finalResolution = true;
                            child._selectedFrame = frameState.frameNumber;
                        }
                        if (child._depth - original._depth < 2) { // prevent traversing too far
                            if (!child.contentAvailable || child.refine === Cesium3DTileRefine.ADD) {
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
     *
     * NOTE: when the scene has inverted classification enabled, the stencil buffer will be masked to 4 bits. So, the
     * selected tiles must be no deeper than 15. This is still very unlikely.
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
            if (!defined(tile) || !isVisited(tile, frameState)) {
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

                    lastAncestor = tile;

                    if (childrenLength === 0) {
                        tile._finalResolution = true;
                        selectTile(tileset, tile, frameState);
                        continue;
                    }

                    ancestorStack.push(tile);
                    tile._stackLength = stack.length;
                }
            }

            for (var i = 0; i < childrenLength; ++i) {
                var child = children[i];
                stack.push(child);
            }
        }
    }

    function selectTile(tileset, tile, frameState) {
        // There may also be a tight box around just the tile's contents, e.g., for a city, we may be
        // zoomed into a neighborhood and can cull the skyscrapers in the root tile.
        if (tile.contentAvailable && (
                (tile._visibilityPlaneMask === CullingVolume.MASK_INSIDE) ||
                (tile.contentVisibility(frameState) !== Intersect.OUTSIDE)
            )) {
            tileset._selectedTiles.push(tile);

            var tileContent = tile.content;
            if (tileContent.featurePropertiesDirty) {
                // A feature's property in this tile changed, the tile needs to be re-styled.
                tileContent.featurePropertiesDirty = false;
                tile.lastStyleTime = 0; // Force applying the style to this tile
                tileset._selectedTilesToStyle.push(tile);
            } else if ((tile._lastSelectedFrameNumber !== frameState.frameNumber - 1) || tile.lastStyleTime === 0) {
                // Tile is newly selected; it is selected this frame, but was not selected last frame.
                tileset._selectedTilesToStyle.push(tile);
            }
            tile._lastSelectedFrameNumber = frameState.frameNumber;
        }
    }

    // PERFORMANCE_IDEA: is it worth exploiting frame-to-frame coherence in the sort, i.e., the
    // list of children are probably fully or mostly sorted unless the camera moved significantly?
    function sortChildrenByDistanceToCamera(a, b) {
        // Sort by farthest child first since this is going on a stack
        if (b._distanceToCamera === 0 && a._distanceToCamera === 0) {
            return b._centerZDepth - a._centerZDepth;
        }

        return b._distanceToCamera - a._distanceToCamera;
    }

    var emptyArray = freezeObject([]);

    function BaseTraversal() {
        this.tileset = undefined;
        this.frameState = undefined;
        this.outOfCore = undefined;
        this.stack = new ManagedArray();
        this.leaves = new ManagedArray();
        this.baseScreenSpaceError = undefined;
        this.internalDFS = new InternalBaseTraversal();
    }

    BaseTraversal.prototype.execute = function(tileset, root, baseScreenSpaceError, frameState, outOfCore) {
        this.tileset = tileset;
        this.frameState = frameState;
        this.outOfCore = outOfCore;
        this.leaves.length = 0;
        this.baseScreenSpaceError = Math.max(baseScreenSpaceError, this.tileset._maximumScreenSpaceError);
        this.internalDFS.tileset = this.tileset;
        this.internalDFS.frameState = this.frameState;
        this.internalDFS.outOfCore = this.outOfCore;
        this.internalDFS.baseScreenSpaceError = this.baseScreenSpaceError;
        depthFirstSearch(root, this);
    };

    BaseTraversal.prototype.visitStart = function(tile) {
        if (!isVisited(tile, this.frameState)) {
            visitTile(this.tileset, tile, this.frameState, this.outOfCore);
        }
    };

    BaseTraversal.prototype.visitEnd = function(tile) {
        tile._lastVisitedFrame = this.frameState.frameNumber;
    };

    BaseTraversal.prototype.getChildren = function(tile) {
        var tileset = this.tileset;
        var outOfCore = this.outOfCore;
        var frameState = this.frameState;
        if (!baseUpdateAndCheckChildren(tileset, tile, this.baseScreenSpaceError, frameState)) {
            return emptyArray;
        }

        var children = tile.children;
        var childrenLength = children.length;
        var allReady = true;
        var replacementWithContent = tile.refine === Cesium3DTileRefine.REPLACE && tile.hasRenderableContent;
        for (var i = 0; i < childrenLength; ++i) {
            var child = children[i];
            loadTile(tileset, child, frameState, true);
            touch(tileset, child, outOfCore);

            // content cannot be replaced until all of the nearest descendants with content are all loaded
            if (replacementWithContent) {
                if (!child.hasEmptyContent) {
                    allReady = allReady && child.contentAvailable;
                } else {
                    allReady = allReady && this.internalDFS.execute(child);
                }
            }
        }

        if (allReady) {
            return children;
        }

        return emptyArray;
    };

    function baseUpdateAndCheckChildren(tileset, tile, baseScreenSpaceError, frameState) {
        if (hasAdditiveContent(tile)) {
            tileset._desiredTiles.push(tile);
        }

        // Stop traversal on the subtree since it will be destroyed
        if (tile.hasTilesetContent && tile.contentExpired) {
            return false;
        }

        // stop traversal when we've attained the desired level of error
        if (tile._screenSpaceError <= baseScreenSpaceError && !tile.hasTilesetContent) {
            // update children so the leaf handler can check if any are visible for the children union bound optimization
            updateChildren(tile, frameState);
            return false;
        }

        var childrenVisibility = updateChildren(tile, frameState);
        var showAdditive = tile.refine === Cesium3DTileRefine.ADD;
        var showReplacement = tile.refine === Cesium3DTileRefine.REPLACE && (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE_IN_REQUEST_VOLUME) !== 0;

        return showAdditive || showReplacement || tile.hasTilesetContent || !defined(tile._ancestorWithContent);
    }

    BaseTraversal.prototype.shouldVisit = function(tile) {
        return isVisible(tile._visibilityPlaneMask);
    };

    BaseTraversal.prototype.leafHandler = function(tile) {
        // if skipLevelOfDetail is off, leaves of the base traversal get pushed to tileset._desiredTiles. additive tiles have already been pushed
        if (this.tileset.skipLevelOfDetail || !hasAdditiveContent(tile)) {
            if (tile.refine === Cesium3DTileRefine.REPLACE && !childrenAreVisible(tile)) {
                ++this.tileset._statistics.numberOfTilesCulledWithChildrenUnion;
                return;
            }
            this.leaves.push(tile);
        }
    };

    function InternalBaseTraversal() {
        this.tileset = undefined;
        this.frameState = undefined;
        this.outOfCore = undefined;
        this.baseScreenSpaceError = undefined;
        this.stack = new ManagedArray();
        this.allLoaded = undefined;
    }

    InternalBaseTraversal.prototype.execute = function(root) {
        this.allLoaded = true;
        depthFirstSearch(root, this);
        return this.allLoaded;
    };

    InternalBaseTraversal.prototype.visitStart = function(tile) {
        if (!isVisited(tile, this.frameState)) {
            visitTile(this.tileset, tile, this.frameState, this.outOfCore);
        }
    };

    InternalBaseTraversal.prototype.visitEnd = BaseTraversal.prototype.visitEnd;

    // Continue traversing until we have renderable content. We want the first descendants with content of the root to load
    InternalBaseTraversal.prototype.shouldVisit = function(tile) {
        return !tile.hasRenderableContent && isVisible(tile._visibilityPlaneMask);
    };

    InternalBaseTraversal.prototype.getChildren = function(tile) {
        var tileset = this.tileset;
        var frameState = this.frameState;
        var outOfCore = this.outOfCore;

        if (!baseUpdateAndCheckChildren(tileset, tile, this.baseScreenSpaceError, frameState)) {
            return emptyArray;
        }

        var children = tile.children;
        var childrenLength = children.length;
        for (var i = 0; i < childrenLength; ++i) {
            var child = children[i];
            loadTile(tileset, child, frameState, true);
            touch(tileset, child, outOfCore);
            if (!tile.contentAvailable) {
                this.allLoaded = false;
            }
        }
        return children;
    };

    InternalBaseTraversal.prototype.updateAndCheckChildren = BaseTraversal.prototype.updateAndCheckChildren;

    function SkipTraversal(options) {
        this.tileset = undefined;
        this.frameState = undefined;
        this.outOfCore = undefined;
        this.queue1 = new ManagedArray();
        this.queue2 = new ManagedArray();
        this.internalDFS = new InternalSkipTraversal(options.selectionHeuristic);
        this.maxChildrenLength = 0;
        this.scratchQueue = new ManagedArray();
    }

    SkipTraversal.prototype.execute = function(tileset, root, frameState, outOfCore) {
        this.tileset = tileset;
        this.frameState = frameState;
        this.outOfCore = outOfCore;
        this.internalDFS.frameState = frameState;
        this.internalDFS.outOfCore = outOfCore;

        this.maxChildrenLength = 0;
        breadthFirstSearch(root, this);
        this.queue1.length = 0;
        this.queue2.length = 0;
        this.scratchQueue.length = 0;
        this.scratchQueue.trim(this.maxChildrenLength);
    };

    SkipTraversal.prototype.visitStart = function(tile) {
        if (!isVisited(tile, this.frameState)) {
            visitTile(this.tileset, tile, this.frameState, this.outOfCore);
        }
    };

    SkipTraversal.prototype.visitEnd = BaseTraversal.prototype.visitEnd;

    SkipTraversal.prototype.getChildren = function(tile) {
        this.scratchQueue.length = 0;
        this.internalDFS.execute(tile, this.scratchQueue);
        this.maxChildrenLength = Math.max(this.maxChildrenLength, this.scratchQueue.length);
        return this.scratchQueue;
    };

    SkipTraversal.prototype.leafHandler = function(tile) {
        // additive tiles have already been pushed
        if (!hasAdditiveContent(tile) && !isVisited(tile, this.frameState)) {
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
        depthFirstSearch(root, this);
    };

    InternalSkipTraversal.prototype.visitStart = function(tile) {
        if (!isVisited(tile, this.frameState)) {
            visitTile(this.tileset, tile, this.frameState, this.outOfCore);
        }
    };

    InternalSkipTraversal.prototype.visitEnd = BaseTraversal.prototype.visitEnd;

    InternalSkipTraversal.prototype.getChildren = function(tile) {
        var tileset = this.tileset;
        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;

        // Stop traversal on the subtree since it will be destroyed
        if (tile.hasTilesetContent && tile.contentExpired) {
            return emptyArray;
        }

        if (!tile.hasTilesetContent) {
            if (tile.refine === Cesium3DTileRefine.ADD) {
                // Always load additive tiles
                loadTile(tileset, tile, this.frameState, true);
                if (hasAdditiveContent(tile)) {
                    tileset._desiredTiles.push(tile);
                }
            }

            // stop traversal when we've attained the desired level of error
            if (tile._screenSpaceError <= maximumScreenSpaceError) {
                updateChildren(tile, this.frameState);
                return emptyArray;
            }

            // if we have reached the skipping threshold without any loaded ancestors, return empty so this tile is loaded
            if (
                (!tile.hasEmptyContent && tile.contentUnloaded) &&
                defined(tile._ancestorWithLoadedContent) &&
                this.selectionHeuristic(tileset, tile._ancestorWithLoadedContent, tile)) {
                updateChildren(tile, this.frameState);
                return emptyArray;
            }
        }

        var childrenVisibility = updateChildren(tile, this.frameState);
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
        }

        return emptyArray;
    };

    InternalSkipTraversal.prototype.shouldVisit = function(tile) {
        return isVisibleAndMeetsSSE(this.tileset, tile, this.frameState);
    };

    InternalSkipTraversal.prototype.leafHandler = function(tile) {
        if (tile !== this.root) {
            if (tile.refine === Cesium3DTileRefine.REPLACE && !childrenAreVisible(tile)) {
                ++this.tileset._statistics.numberOfTilesCulledWithChildrenUnion;
                return;
            }
            if (!tile.hasEmptyContent) {
                if (this.tileset.loadSiblings) {
                    var parent = tile.parent;
                    var tiles = parent.children;
                    var length = tiles.length;
                    for (var i = 0; i < length; ++i) {
                        loadTile(this.tileset, tiles[i], this.frameState, false);
                        touch(this.tileset, tiles[i], this.outOfCore);
                    }
                } else {
                    loadTile(this.tileset, tile, this.frameState, true);
                    touch(this.tileset, tile, this.outOfCore);
                }
            }
            this.queue.push(tile);
        } else if (!hasAdditiveContent(tile)) {
            // additive tiles have already been pushed
            this.tileset._desiredTiles.push(tile);
        }
    };

    function updateChildren(tile, frameState) {
        if (isVisited(tile, frameState)) {
            return tile._childrenVisibility;
        }

        var children = tile.children;

        updateTransforms(children, tile.computedTransform);
        computeDistanceToCamera(children, frameState);

        return computeChildrenVisibility(tile, frameState);
    }

    function isVisited(tile, frameState) {
        // because the leaves of one tree traversal are the root of the subsequent traversal, avoid double visitation
        return tile._lastVisitedFrame === frameState.frameNumber;
    }

    function visitTile(tileset, tile, frameState, outOfCore) {
        ++tileset._statistics.visited;
        tile.selected = false;
        tile._finalResolution = false;
        computeSSE(tile, frameState);
        touch(tileset, tile, outOfCore);
        tile.updateExpiration();
        tile._ancestorWithContent = undefined;
        tile._ancestorWithLoadedContent = undefined;
        var parent = tile.parent;
        if (defined(parent)) {
            var replace = parent.refine === Cesium3DTileRefine.REPLACE;
            tile._ancestorWithContent = (replace && parent.hasRenderableContent) ? parent : parent._ancestorWithContent;
            tile._ancestorWithLoadedContent = (replace && parent.hasRenderableContent && parent.contentAvailable) ? parent : parent._ancestorWithLoadedContent;
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

    function checkAdditiveVisibility(tileset, tile, frameState) {
        if (defined(tile.parent) && (tile.parent.refine === Cesium3DTileRefine.ADD)) {
            return isVisibleAndMeetsSSE(tileset, tile, frameState);
        }
        return true;
    }

    function loadTile(tileset, tile, frameState, checkVisibility) {
        if ((tile.contentUnloaded || tile.contentExpired) && tile._requestedFrame !== frameState.frameNumber) {
            if (!checkVisibility || checkAdditiveVisibility(tileset, tile, frameState)) {
                tile._requestedFrame = frameState.frameNumber;
                tileset._requestedTiles.push(tile);
            }
        }
    }

    function computeChildrenVisibility(tile, frameState) {
        var flag = Cesium3DTileChildrenVisibility.NONE;
        var children = tile.children;
        var childrenLength = children.length;
        var visibilityPlaneMask = tile._visibilityPlaneMask;
        for (var k = 0; k < childrenLength; ++k) {
            var child = children[k];

            var visibilityMask = child.visibility(frameState, visibilityPlaneMask);

            if (isVisible(visibilityMask)) {
                flag |= Cesium3DTileChildrenVisibility.VISIBLE;
            }

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

            child._visibilityPlaneMask = visibilityMask;
        }

        tile._childrenVisibility = flag;

        return flag;
    }

    function getScreenSpaceError(tileset, geometricError, tile, frameState) {
        if (geometricError === 0.0) {
            // Leaf tiles do not have any error so save the computation
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
            var distance = Math.max(tile._distanceToCamera, CesiumMath.EPSILON7);
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
            child._distanceToCamera = child.distanceToTile(frameState);
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

    function isVisibleAndMeetsSSE(tileset, tile, frameState) {
        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;
        var parent = tile.parent;
        if (!defined(parent)) {
            return isVisible(tile._visibilityPlaneMask);
        }
        var showAdditive = parent.refine === Cesium3DTileRefine.ADD && parent._screenSpaceError > maximumScreenSpaceError;

        return isVisible(tile._visibilityPlaneMask) && (!showAdditive || getScreenSpaceError(tileset, parent.geometricError, tile, frameState) > maximumScreenSpaceError);
    }

    function childrenAreVisible(tile) {
        // optimization does not apply for additive refinement
        return tile.refine === Cesium3DTileRefine.ADD || tile.children.length === 0 || tile._childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE !== 0;
    }

    function hasAdditiveContent(tile) {
        return tile.refine === Cesium3DTileRefine.ADD && tile.hasRenderableContent;
    }

    function depthFirstSearch(root, options) {
        var stack = options.stack;

        if (defined(root) && (!defined(options.shouldVisit) || options.shouldVisit(root))) {
            stack.push(root);
        }

        var maxLength = 0;
        while (stack.length > 0) {
            maxLength = Math.max(maxLength, stack.length);

            var tile = stack.pop();
            options.visitStart(tile);
            var children = options.getChildren(tile);
            var isNativeArray = !defined(children.get);
            var length = children.length;
            for (var i = 0; i < length; ++i) {
                var child = isNativeArray ? children[i] : children.get(i);

                if (!defined(options.shouldVisit) || options.shouldVisit(child)) {
                    stack.push(child);
                }
            }

            if (length === 0 && defined(options.leafHandler)) {
                options.leafHandler(tile);
            }
            options.visitEnd(tile);
        }

        stack.trim(maxLength);
    }

    function breadthFirstSearch(root, options) {
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
                var tile = queue1.get(i);
                options.visitStart(tile);
                var children = options.getChildren(tile);
                var isNativeArray = !defined(children.get);
                var childrenLength = children.length;
                for (var j = 0; j < childrenLength; ++j) {
                    var child = isNativeArray ? children[j] : children.get(j);

                    if (!defined(options.shouldVisit) || options.shouldVisit(child)) {
                        queue2.push(child);
                    }
                }

                if (childrenLength === 0 && defined(options.leafHandler)) {
                    options.leafHandler(tile);
                }
                options.visitEnd(tile);
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

        queue1.trim(maxLength);
        queue2.trim(maxLength);
    }

    Cesium3DTilesetTraversal.selectTiles = selectTiles;

    Cesium3DTilesetTraversal.BaseTraversal = BaseTraversal;

    Cesium3DTilesetTraversal.SkipTraversal = SkipTraversal;

    return Cesium3DTilesetTraversal;
});
