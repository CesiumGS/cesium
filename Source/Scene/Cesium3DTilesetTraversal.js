define([
        '../Core/CullingVolume',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/freezeObject',
        '../Core/Intersect',
        '../Core/ManagedArray',
        '../Core/Math',
        '../Core/OrthographicFrustum',
        './Cesium3DTileOptimizationHint',
        './Cesium3DTileRefine',
        './SceneMode'
    ], function(
        CullingVolume,
        defaultValue,
        defined,
        freezeObject,
        Intersect,
        ManagedArray,
        CesiumMath,
        OrthographicFrustum,
        Cesium3DTileOptimizationHint,
        Cesium3DTileRefine,
        SceneMode) {
    'use strict';

    /**
     * @private
     */
    function Cesium3DTilesetTraversal() {
    }

    var VisibilityFlag = {
        NONE : 0,
        VISIBLE : 1,
        IN_REQUEST_VOLUME : 2
    };

    function isVisibleBit(flag) {
        return (flag & VisibilityFlag.VISIBLE) > 0;
    }

    function inRequestVolumeBit(flag) {
        return (flag & VisibilityFlag.IN_REQUEST_VOLUME) > 0;
    }

    function clearVisibility(tile) {
        tile._visibilityFlag = tile._visibilityFlag & ~VisibilityFlag.VISIBLE;
    }

    function isVisible(tile) {
        var flag = tile._visibilityFlag;
        return isVisibleBit(flag) && inRequestVolumeBit(flag);
    }

    function isVisibleButNotInRequestVolume(tile) {
        var flag = tile._visibilityFlag;
        return isVisibleBit(flag) && !inRequestVolumeBit(flag);
    }

    var traversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0
    };

    var emptyTraversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0
    };

    var descendantTraversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0
    };

    var selectionTraversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0,
        ancestorStack : new ManagedArray(),
        ancestorStackMaximumLength : 0
    };

    Cesium3DTilesetTraversal.selectTiles = function(tileset, frameState) {
        if (tileset.debugFreezeFrame) {
            return;
        }

        tileset._selectedTiles.length = 0;
        tileset._selectedTilesToStyle.length = 0;
        tileset._emptyTiles.length = 0;
        tileset._hasMixedContent = false;

        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;

        var root = tileset._root;
        updateTile(tileset, root, frameState);
        if (!isVisible(root)) {
            return;
        }

        // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
        if (getScreenSpaceError(tileset, tileset._geometricError, root, frameState) <= maximumScreenSpaceError) {
            return;
        }

        if (!skipLevelOfDetail(tileset)) {
            executeBaseTraversal(tileset, root, frameState);
        } else if (tileset.immediatelyLoadDesiredLevelOfDetail) {
            executeSkipTraversal(tileset, root, frameState);
        } else {
            executeBaseAndSkipTraversal(tileset, root, frameState);
        }

        traversal.stack.trim(traversal.stackMaximumLength);
        emptyTraversal.stack.trim(emptyTraversal.stackMaximumLength);
        descendantTraversal.stack.trim(descendantTraversal.stackMaximumLength);
        selectionTraversal.stack.trim(selectionTraversal.stackMaximumLength);
        selectionTraversal.ancestorStack.trim(selectionTraversal.ancestorStackMaximumLength);
    };

    function executeBaseTraversal(tileset, root, frameState) {
        var baseScreenSpaceError = tileset._maximumScreenSpaceError;
        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;
        executeTraversal(tileset, root, baseScreenSpaceError, maximumScreenSpaceError, frameState);
    }

    function executeSkipTraversal(tileset, root, frameState) {
        var baseScreenSpaceError = Number.MAX_VALUE;
        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;
        executeTraversal(tileset, root, baseScreenSpaceError, maximumScreenSpaceError, frameState);
        traverseAndSelect(tileset, root, frameState);
    }

    function executeBaseAndSkipTraversal(tileset, root, frameState) {
        var baseScreenSpaceError = Math.max(tileset.baseScreenSpaceError, tileset.maximumScreenSpaceError);
        var maximumScreenSpaceError = tileset.maximumScreenSpaceError;
        executeTraversal(tileset, root, baseScreenSpaceError, maximumScreenSpaceError, frameState);
        traverseAndSelect(tileset, root, frameState);
    }

    function skipLevelOfDetail(tileset) {
        // Optimization: if all tiles are additive we can turn skipLevelOfDetail off and save some processing
        return tileset._skipLevelOfDetail && !tileset._allTilesAdditive;
    }

    function addEmptyTile(tileset, tile) {
        tile._finalResolution = true;
        tileset._emptyTiles.push(tile);
    }

    function contentVisible(tile, frameState) {
        return (tile._visibilityPlaneMask === CullingVolume.MASK_INSIDE) ||
               (tile.contentVisibility(frameState) !== Intersect.OUTSIDE);
    }

    function selectTile(tileset, tile, frameState) {
        if (contentVisible(tile, frameState)) {
            var tileContent = tile.content;
            if (tileContent.featurePropertiesDirty) {
                // A feature's property in this tile changed, the tile needs to be re-styled.
                tileContent.featurePropertiesDirty = false;
                tile.lastStyleTime = 0; // Force applying the style to this tile
                tileset._selectedTilesToStyle.push(tile);
            } else if ((tile._selectedFrame !== frameState.frameNumber - 1)) {
                // Tile is newly selected; it is selected this frame, but was not selected last frame.
                tile.lastStyleTime = 0; // Force applying the style to this tile
                tileset._selectedTilesToStyle.push(tile);
            }
            tile._selectedFrame = frameState.frameNumber;
            tileset._selectedTiles.push(tile);
        }
    }

    function selectDescendants(tileset, root, frameState) {
        var stack = descendantTraversal.stack;
        stack.push(root);
        while (stack.length > 0) {
            descendantTraversal.stackMaximumLength = Math.max(descendantTraversal.stackMaximumLength, stack.length);
            var tile = stack.pop();
            var children = tile.children;
            var childrenLength = children.length;
            for (var i = 0; i < childrenLength; ++i) {
                var child = children[i];
                if (child.contentAvailable) {
                    updateTile(tileset, child, frameState);
                    touchTile(tileset, child, frameState);
                    selectTile(tileset, child, frameState);
                } else if (child._depth - root._depth < 2) {
                    // Continue traversing, but not too far
                    stack.push(child);
                }
            }
        }
    }

    function selectDesiredTile(tileset, tile, frameState) {
        if (!skipLevelOfDetail(tileset)) {
            if (tile.contentAvailable) {
                // The tile can be selected right away and does not require traverseAndSelect
                tile._finalResolution = true;
                selectTile(tileset, tile, frameState);
            }
            return;
        }

        // If this tile is not loaded attempt to select its ancestor instead
        var loadedTile = tile.contentAvailable ? tile : tile._ancestorWithContentAvailable;
        if (defined(loadedTile)) {
            // Tiles will actually be selected in traverseAndSelect
            loadedTile._shouldSelect = true;
        } else if (tileset.immediatelyLoadDesiredLevelOfDetail) {
            // If no ancestors are ready traverse down and select tiles to minimize empty regions.
            // This happens often in cases where the camera zooms out and we're waiting for parent tiles to load.
            selectDescendants(tileset, tile, frameState);
        }
    }

    function visitTile(tileset) {
        ++tileset._statistics.visited;
    }

    function touchTile(tileset, tile, frameState) {
        if (frameState.passes.pick) {
            return;
        }
        tileset._cache.touch(tile);
        tile._touchedFrame = frameState.frameNumber;
    }

    function getPriority(tileset, tile) {
        // If skipLevelOfDetail is off we try to load child tiles as soon as possible so that their parent can refine sooner.
        // Additive tiles always load based on distance because it subjectively looks better.
        // There may be issues with mixing additive and replacement tiles since SSE and distance are different types of values.
        // Maybe all priorities need to be normalized to 0-1 range.
        var parent = tile.parent;
        var replace = tile.refine === Cesium3DTileRefine.REPLACE;
        var add = tile.refine === Cesium3DTileRefine.ADD;
        if (tile.hasTilesetContent) {
            return 0.0; // Load external tileset as soon as possible
        } else if (add) {
            return tile._distanceToCamera;
        } else if (replace) {
            var useParentScreenSpaceError = defined(parent) && (!skipLevelOfDetail(tileset) || (tile._screenSpaceError === 0.0));
            var screenSpaceError = useParentScreenSpaceError ? parent._screenSpaceError : tile._screenSpaceError;
            var rootScreenSpaceError = tileset._root._screenSpaceError;
            return rootScreenSpaceError - screenSpaceError; // Map higher SSE to lower priority values (higher priority)
        }
    }

    function loadTile(tileset, tile, frameState) {
        if (hasUnloadedContent(tile) || tile.contentExpired) {
            tile._requestedFrame = frameState.frameNumber;
            tile._priority = getPriority(tileset, tile);
            tileset._requestedTiles.push(tile);
        }
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

    function updateVisibility(tileset, tile, frameState) {
        if (tile._updatedVisibilityFrame === frameState.frameNumber && !frameState.passes.pick) {
            return;
        }

        var visibilityFlag = VisibilityFlag.NONE;

        var parent = tile.parent;
        var parentTransform = defined(parent) ? parent.computedTransform : tileset._modelMatrix;
        var parentVisibilityPlaneMask = defined(parent) ? parent._visibilityPlaneMask : CullingVolume.MASK_INDETERMINATE;

        tile.updateTransform(parentTransform);
        tile._distanceToCamera = tile.distanceToTile(frameState);
        tile._centerZDepth = tile.distanceToTileCenter(frameState);
        tile._screenSpaceError = getScreenSpaceError(tileset, tile.geometricError, tile, frameState);
        tile._visibilityPlaneMask = tile.visibility(frameState, parentVisibilityPlaneMask); // Use parent's plane mask to speed up visibility test

        if (tile._visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE) {
            visibilityFlag |= VisibilityFlag.VISIBLE;
        }

        if (tile.insideViewerRequestVolume(frameState)) {
            visibilityFlag |= VisibilityFlag.IN_REQUEST_VOLUME;
        }

        tile._visibilityFlag = visibilityFlag;
        tile._updatedVisibilityFrame = frameState.frameNumber;
    }

    function anyChildrenVisible(tileset, tile, frameState) {
        var anyVisible = false;
        var children = tile.children;
        var length = children.length;
        for (var i = 0; i < length; ++i) {
            var child = children[i];
            updateVisibility(tileset, child, frameState);
            anyVisible = anyVisible || isVisible(child);
        }
        return anyVisible;
    }

    function updateTileVisibility(tileset, tile, frameState) {
        updateVisibility(tileset, tile, frameState);

        if (!isVisible(tile)) {
            return;
        }

        // Use parent's geometric error with child's box to see if we already meet the SSE
        var parent = tile.parent;
        if (defined(parent) && (parent.refine === Cesium3DTileRefine.ADD) && getScreenSpaceError(tileset, parent.geometricError, tile, frameState) <= tileset._maximumScreenSpaceError) {
            clearVisibility(tile);
            return;
        }

        // Optimization - if none of the tile's children are visible then this tile isn't visible
        var replace = tile.refine === Cesium3DTileRefine.REPLACE;
        var useOptimization = tile._optimChildrenWithinParent === Cesium3DTileOptimizationHint.USE_OPTIMIZATION;
        var hasChildren = tile.children.length > 0;
        if (replace && useOptimization && hasChildren) {
            if (!anyChildrenVisible(tileset, tile, frameState)) {
                ++tileset._statistics.numberOfTilesCulledWithChildrenUnion;
                clearVisibility(tile);
                return;
            }
        }
    }

    function updateTile(tileset, tile, frameState) {
        updateTileVisibility(tileset, tile, frameState);
        tile.updateExpiration();

        tile._shouldSelect = false;
        tile._finalResolution = false;
        tile._ancestorWithContent = undefined;
        tile._ancestorWithContentAvailable = undefined;

        var parent = tile.parent;
        if (defined(parent)) {
            // ancestorWithContent is an ancestor that has content or has the potential to have
            // content. Used in conjunction with tileset.skipLevels to know when to skip a tile.
            // ancestorWithContentAvailable is an ancestor that we can render if a desired tile is not loaded.
            var hasContent = !hasUnloadedContent(parent) || (parent._requestedFrame === frameState.frameNumber);
            tile._ancestorWithContent = hasContent ? parent : parent._ancestorWithContent;
            tile._ancestorWithContentAvailable = parent.contentAvailable ? parent : parent._ancestorWithContentAvailable;
        }
    }

    function hasEmptyContent(tile) {
        return tile.hasEmptyContent || tile.hasTilesetContent;
    }

    function hasUnloadedContent(tile) {
        return !hasEmptyContent(tile) && tile.contentUnloaded;
    }

    function reachedSkippingThreshold(tileset, tile) {
        var ancestor = tile._ancestorWithContent;
        return !tileset.immediatelyLoadDesiredLevelOfDetail &&
               defined(ancestor) &&
               (tile._screenSpaceError < (ancestor._screenSpaceError / tileset.skipScreenSpaceErrorFactor)) &&
               (tile._depth > (ancestor._depth + tileset.skipLevels));
    }

    function sortChildrenByDistanceToCamera(a, b) {
        // Sort by farthest child first since this is going on a stack
        if (b._distanceToCamera === 0 && a._distanceToCamera === 0) {
            return b._centerZDepth - a._centerZDepth;
        }

        return b._distanceToCamera - a._distanceToCamera;
    }

    function updateAndPushChildren(tileset, tile, stack, frameState) {
        var i;
        var replace = tile.refine === Cesium3DTileRefine.REPLACE;
        var children = tile.children;
        var length = children.length;

        for (i = 0; i < length; ++i) {
            updateTile(tileset, children[i], frameState);
        }

        // Sort by distance to take advantage of early Z and reduce artifacts for skipLevelOfDetail
        children.sort(sortChildrenByDistanceToCamera);

        // For traditional replacement refinement we need to check if all children are loaded before we can refine
        // The reason we always refine empty tiles is it looks better if children stream in as they are loaded to fill the empty space
        var checkRefines = !skipLevelOfDetail(tileset) && replace && !hasEmptyContent(tile);
        var refines = true;

        var anyChildrenVisible = false;
        for (i = 0; i < length; ++i) {
            var child = children[i];
            if (isVisible(child)) {
                stack.push(child);
                anyChildrenVisible = true;
            } else if (checkRefines || tileset.loadSiblings) {
                // Keep non-visible children loaded since they are still needed before the parent can refine.
                // Or loadSiblings is true so we should always load tiles regardless of visibility.
                loadTile(tileset, child, frameState);
                touchTile(tileset, child, frameState);
            }
            if (checkRefines) {
                var childRefines;
                if (isVisibleButNotInRequestVolume(child)) {
                    childRefines = false;
                } else if (hasEmptyContent(child)) {
                    // We need to traverse past any empty tiles to know if we can refine
                    childRefines = executeEmptyTraversal(tileset, child, frameState);
                } else {
                    childRefines = child.contentAvailable;
                }
                refines = refines && childRefines;
            }
        }

        if (!anyChildrenVisible) {
            refines = false;
        }

        return refines;
    }

    function inBaseTraversal(tileset, tile, baseScreenSpaceError) {
        if (!skipLevelOfDetail(tileset)) {
            return true;
        }
        if (tile._screenSpaceError === 0) {
            var parent = tile.parent;
            if (defined(parent)) {
                return parent._screenSpaceError > baseScreenSpaceError;
            }
            return true;
        }
        return tile._screenSpaceError > baseScreenSpaceError;
    }

    function executeTraversal(tileset, root, baseScreenSpaceError, maximumScreenSpaceError, frameState) {
        // Depth-first traversal that traverses all visible tiles and marks tiles for selection.
        // If skipLevelOfDetail is off then a tile does not refine until all children are loaded. This is the
        // traditional replacement refinement approach.
        // Otherwise we allow for skipping levels of the tree and rendering children and parent tiles simultaneously.
        var stack = traversal.stack;
        stack.push(root);

        while (stack.length > 0) {
            traversal.stackMaximumLength = Math.max(traversal.stackMaximumLength, stack.length);

            var tile = stack.pop();
            var baseTraversal = inBaseTraversal(tileset, tile, baseScreenSpaceError);
            var add = tile.refine === Cesium3DTileRefine.ADD;
            var replace = tile.refine === Cesium3DTileRefine.REPLACE;
            var children = tile.children;
            var childrenLength = children.length;
            var parent = tile.parent;
            var parentRefines = !defined(parent) || parent._refines;
            var traverse = (childrenLength > 0) && (tile._screenSpaceError > maximumScreenSpaceError);
            var refines = false;

            if (tile.hasTilesetContent && tile.contentExpired) {
                // Don't traverse expired subtree because it will be destroyed
                traverse = false;
            }

            if (traverse) {
                refines = updateAndPushChildren(tileset, tile, stack, frameState);
            }

            if (hasEmptyContent(tile)) {
                // Add empty tile so we can see its debug bounding volumes
                addEmptyTile(tileset, tile, frameState);
                loadTile(tileset, tile, frameState);
            } else if (add) {
                // Additive tiles are always loaded and selected
                selectDesiredTile(tileset, tile, frameState);
                loadTile(tileset, tile, frameState);
            } else if (replace) {
                if (baseTraversal) {
                    // Always load tiles in the base traversal
                    // Select tiles that can't refine further
                    loadTile(tileset, tile, frameState);
                    if (!refines && parentRefines) {
                        selectDesiredTile(tileset, tile, frameState);
                    }
                } else {
                    // Load tiles that are not skipped or can't refine further. In practice roughly half the tiles stay unloaded.
                    // Select tiles that can't refine further. If the tile doesn't have loaded content it will try to select an ancestor with loaded content instead.
                    if (!refines) { // eslint-disable-line
                        selectDesiredTile(tileset, tile, frameState);
                        loadTile(tileset, tile, frameState);
                    } else if (reachedSkippingThreshold(tileset, tile)) {
                        loadTile(tileset, tile, frameState);
                    }
                }
            }

            visitTile(tileset);
            touchTile(tileset, tile, frameState);
            tile._refines = refines;
        }
    }

    function executeEmptyTraversal(tileset, root, frameState) {
        // Depth-first traversal that checks if all nearest descendants with content are loaded. Ignores visibility.
        // The reason we need to implement a full traversal is to handle chains of empty tiles.
        var allDescendantsLoaded = true;
        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;
        var stack = emptyTraversal.stack;
        stack.push(root);

        while (stack.length > 0) {
            emptyTraversal.stackMaximumLength = Math.max(emptyTraversal.stackMaximumLength, stack.length);

            var tile = stack.pop();
            var children = tile.children;
            var childrenLength = children.length;

            // Only traverse if the tile is empty - we are trying to find descendants with content
            var traverse = hasEmptyContent(tile) && (childrenLength > 0) && (tile._screenSpaceError > maximumScreenSpaceError);

            // When we reach a "leaf" that does not have content available we know that not all descendants are loaded
            // i.e. there will be holes if the parent tries to refine to its children, so don't refine
            if (!traverse && !tile.contentAvailable) {
                allDescendantsLoaded = false;
            }

            updateTile(tileset, tile, frameState);
            if (!isVisible(tile)) {
                // Load tiles that aren't visible since they are still needed for the parent to refine
                loadTile(tileset, tile, frameState);
                touchTile(tileset, tile, frameState);
            }

            if (traverse) {
                for (var i = 0; i < childrenLength; ++i) {
                    var child = children[i];
                    stack.push(child);
                }
            }
        }

        return allDescendantsLoaded;
    }

    /**
     * Traverse the tree and check if their selected frame is the current frame. If so, add it to a selection queue.
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
     * of ancestor regardless of true depth. The stencil tests used require children to be drawn first.
     *
     * NOTE: this will no longer work when there is a chain of selected tiles that is longer than the size of the
     * stencil buffer (usually 8 bits). In other words, the subset of the tree containing only selected tiles must be
     * no deeper than 255. It is very, very unlikely this will cause a problem.
     *
     * NOTE: when the scene has inverted classification enabled, the stencil buffer will be masked to 4 bits. So, the
     * selected tiles must be no deeper than 15. This is still very unlikely.
     */
    function traverseAndSelect(tileset, root, frameState) {
        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;
        var stack = selectionTraversal.stack;
        var ancestorStack = selectionTraversal.ancestorStack;
        var lastAncestor;

        stack.push(root);

        while (stack.length > 0 || ancestorStack.length > 0) {
            selectionTraversal.stackMaximumLength = Math.max(selectionTraversal.stackMaximumLength, stack.length);
            selectionTraversal.ancestorStackMaximumLength = Math.max(selectionTraversal.ancestorStackMaximumLength, ancestorStack.length);

            if (ancestorStack.length > 0) {
                var waitingTile = ancestorStack.get(ancestorStack.length - 1);
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
            if (!defined(tile)) {
                // stack is empty but ancestorStack isn't
                continue;
            }

            var add = tile.refine === Cesium3DTileRefine.ADD;
            var shouldSelect = tile._shouldSelect;
            var children = tile.children;
            var childrenLength = children.length;
            var traverse = (childrenLength > 0) && (tile._screenSpaceError > maximumScreenSpaceError);

            if (shouldSelect) {
                if (add) {
                    tile._finalResolution = true;
                    selectTile(tileset, tile, frameState);
                } else {
                    tile._selectionDepth = ancestorStack.length;
                    if (tile._selectionDepth > 0) {
                        tileset._hasMixedContent = true;
                    }
                    lastAncestor = tile;
                    if (!traverse) {
                        tile._finalResolution = true;
                        selectTile(tileset, tile, frameState);
                        continue;
                    }
                    ancestorStack.push(tile);
                    tile._stackLength = stack.length;
                }
            }

            if (traverse) {
                for (var i = 0; i < childrenLength; ++i) {
                    var child = children[i];
                    if (isVisible(child)) {
                        stack.push(child);
                    }
                }
            }
        }
    }

    return Cesium3DTilesetTraversal;
});
