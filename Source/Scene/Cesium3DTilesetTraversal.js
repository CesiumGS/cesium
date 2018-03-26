define([
        '../Core/CullingVolume',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/freezeObject',
        '../Core/Intersect',
        '../Core/ManagedArray',
        '../Core/Math',
        '../Core/OrthographicFrustum',
        './Cesium3DTileChildrenVisibility',
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
        Cesium3DTileChildrenVisibility,
        Cesium3DTileOptimizationHint,
        Cesium3DTileRefine,
        SceneMode) {
    'use strict';

    /**
     * @private
     */
    function Cesium3DTilesetTraversal() {
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
        tileset._hasMixedContent = false;

        tileset._cache.reset();

        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;

        var root = tileset._root;
        var rootVisible = updateTile(tileset, root, frameState);
        if (!rootVisible) {
            return;
        }

        // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
        if (getScreenSpaceError(tileset, tileset._geometricError, root, frameState) <= maximumScreenSpaceError) {
            return;
        }

        if (!tileset._skipLevelOfDetail || tileset._allTilesAdditive) {
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

    function selectTile(tileset, tile, frameState) {
        if (tile.contentAvailable && contentVisible(tile, frameState)) {
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

    function sortChildrenByDistanceToCamera(a, b) {
        // Sort by farthest child first since this is going on a stack
        if (b._distanceToCamera === 0 && a._distanceToCamera === 0) {
            return b._centerZDepth - a._centerZDepth;
        }

        return b._distanceToCamera - a._distanceToCamera;
    }

    function contentVisible(tile, frameState) {
        return (tile._visibilityPlaneMask === CullingVolume.MASK_INSIDE) ||
               (tile.contentVisibility(frameState) !== Intersect.OUTSIDE);
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

    function selectDesiredTile(tileset, tile, final, frameState) {
        if (final) {
            // The tile can be selected right away and does not require traverseAndSelect. E.g. additive or empty tiles
            selectTile(tileset, tile, frameState);
            tile._finalResolution = true;
        } else {
            var loadedTile = tile.contentAvailable ? tile : tile._ancestorWithContentAvailable;
            if (defined(loadedTile)) {
                // Tiles marked for selection will be selected in traverseAndSelect
                loadedTile._selected = true;
            } else if (tileset.immediatelyLoadDesiredLevelOfDetail) {
                // If no ancestors are ready traverse down and select tiles to minimize empty regions.
                // This happens often in cases where the camera zooms out and we're waiting for parent tiles to load.
                selectDescendants(tileset, tile, frameState);
            }
        }
    }

    function visitTile(tileset) {
        ++tileset._statistics.visited;
    }

    function touchTile(tileset, tile, frameState) {
        tileset._cache.touch(tile);
        tile._touchedFrame = frameState.frameNumber;
    }

    function getPriority(tileset, tile, useParentPriority) {
        // The base traversal sets useParentPriority to true so that child tiles can load as soon as possible so that their parent can refine sooner.
        // Additive tiles always load based on distance because it subjectively looks better.
        // There may be issues with mixing additive and replacement tileset since SSE and distance are not using the same overall scale.
        // Maybe all priorities need to be normalized to 0-1 range.
        var parent = tile.parent;
        var replace = tile.refine === Cesium3DTileRefine.REPLACE;
        var add = tile.refine === Cesium3DTileRefine.ADD;
        if (add) {
            return tile._distanceToCamera;
        } else if (replace) {
            var screenSpaceError = (defined(parent) && (useParentPriority || (tile._screenSpaceError === 0.0))) ? parent._screenSpaceError : tile._screenSpaceError;
            var rootScreenSpaceError = tileset._root._screenSpaceError;
            return rootScreenSpaceError - screenSpaceError; // Map higher SSE to lower priority values (higher priority)
        }
    }

    function loadTile(tileset, tile, useParentPriority, frameState) {
        if (hasUnloadedContent(tile) || tile.contentExpired) {
            tile._requestedFrame = frameState.frameNumber;
            tile._priority = getPriority(tileset, tile, useParentPriority);
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
        if (tile._updatedVisibilityFrame === frameState.frameNumber) {
            return tile._visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE;
        }

        var parent = tile.parent;
        var parentTransorm = defined(parent) ? parent.computedTransform : tileset._modelMatrix;
        var parentVisibilityPlaneMask = defined(parent) ? parent._visibilityPlaneMask : CullingVolume.MASK_INDETERMINATE;

        tile.updateTransform(parentTransorm);
        tile._distanceToCamera = tile.distanceToTile(frameState);
        tile._centerZDepth = tile.distanceToTileCenter(frameState);
        tile._screenSpaceError = getScreenSpaceError(tileset, tile.geometricError, tile, frameState);

        var visibilityPlaneMask = tile.visibility(frameState, parentVisibilityPlaneMask); // Use parent's plane mask to speed up visibility test
        var visible = visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE;
        visible = visible && tile.insideViewerRequestVolume(frameState);
        tile._visibilityPlaneMask = visible ? visibilityPlaneMask : CullingVolume.MASK_OUTSIDE;
        tile._updatedFrame = frameState.frameNumber;
        return visible;
    }

    function updateChildrenVisibility(tileset, tile, frameState) {
        var anyVisible = false;
        var children = tile.children;
        var length = children.length;
        for (var i = 0; i < length; ++i) {
            var childVisible = updateVisibility(tileset, children[i], frameState);
            anyVisible = anyVisible || childVisible;
        }
        return anyVisible;
    }

    function getVisibility(tileset, tile, frameState) {
        updateVisibility(tileset, tile, frameState);

        // Not visible
        if (tile._visibilityPlaneMask === CullingVolume.MASK_OUTSIDE) {
            return false;
        }

        // Don't visit an expired subtree because it will be destroyed
        if (tile.hasTilesetContent && tile.contentExpired) {
            return false;
        }

        // Use parent's geometric error with child's box to see if we already meet the SSE
        var parent = tile.parent;
        if (defined(parent) && (parent.refine === Cesium3DTileRefine.ADD) && getScreenSpaceError(tileset, parent.geometricError, tile, frameState) <= tileset._maximumScreenSpaceError) {
            return false;
        }

        // Optimization - if none of the tile's children are visible then this tile isn't visible
        var replace = tile.refine === Cesium3DTileRefine.REPLACE;
        var useOptimization = tile._optimChildrenWithinParent === Cesium3DTileOptimizationHint.USE_OPTIMIZATION;
        var hasChildren = tile.children.length > 0;
        if (replace && useOptimization && hasChildren) {
            var anyChildrenVisible = updateChildrenVisibility(tileset, tile, frameState);
            if (!anyChildrenVisible) {
                ++tileset._statistics.numberOfTilesCulledWithChildrenUnion;
                return false;
            }
        }

        return true;
    }

    function updateTile(tileset, tile, frameState) {
        var visible = getVisibility(tileset, tile, frameState);
        tile._visibilityPlaneMask = visible ? tile._visibilityPlaneMask : CullingVolume.MASK_OUTSIDE;

        tile._selected = false;
        tile._finalResolution = false;
        tile._ancestorWithContent = undefined;
        tile._ancestorWithContentAvailable = undefined;

        tile.updateExpiration();

        var parent = tile.parent;
        if (defined(parent)) {
            // ancestorWithContent is an ancestor that has content or has the potential to have
            // content. Used in conjunction with tileset.skipLevels to know when to skip a tile.
            // ancestorWithContentAvailable is an ancestor that we can render if a desired tile is not loaded.
            var hasContent = !hasUnloadedContent(parent) || (parent._requestedFrame === frameState.frameNumber);
            tile._ancestorWithContent = hasContent ? parent : parent._ancestorWithContent;
            tile._ancestorWithContentAvailable = parent.contentAvailable ? parent : parent._ancestorWithContentAvailable;
        }

        return visible;
    }

    function isVisible(tile) {
        return tile._visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE;
    }

    function hasEmptyContent(tile) {
        return tile.hasEmptyContent || tile.hasTilesetContent;
    }

    function hasUnloadedContent(tile) {
        return !hasEmptyContent(tile) && tile.contentUnloaded;
    }

    function reachedSkippingThreshold(tileset, tile) {
        var ancestor = tile._ancestorWithContent;
        var skipLevels = tileset.skipLevelOfDetail ? tileset.skipLevels : 0;
        var skipScreenSpaceErrorFactor = tileset.skipLevelOfDetail ? tileset.skipScreenSpaceErrorFactor : 1.0;

        return !tileset.immediatelyLoadDesiredLevelOfDetail &&
               defined(ancestor) &&
               (tile._screenSpaceError < (ancestor._screenSpaceError / skipScreenSpaceErrorFactor)) &&
               (tile._depth > (ancestor._depth + skipLevels));
    }

    function inBaseTraversal(tile, baseScreenSpaceError) {
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
        // If the traversal is base traversal ONLY then a tile does not refine until all children are loaded. This is the
        // traditional replacement refinement approach.
        // Otherwise we allow for skipping levels of the tree and rendering children and parent tiles simultaneously.
        var baseTraversalOnly = baseScreenSpaceError === maximumScreenSpaceError;
        var stack = traversal.stack;
        stack.push(root);

        while (stack.length > 0) {
            traversal.stackMaximumLength = Math.max(traversal.stackMaximumLength, stack.length);

            var tile = stack.pop();
            var baseTraversal = baseTraversalOnly || inBaseTraversal(tile, baseScreenSpaceError);
            var add = tile.refine === Cesium3DTileRefine.ADD;
            var replace = tile.refine === Cesium3DTileRefine.REPLACE;
            var children = tile.children;
            var childrenLength = children.length;
            var parent = tile.parent;
            var parentRefines = !baseTraversalOnly || !defined(parent) || parent._refines;
            var traverse = (childrenLength > 0) && (tile._screenSpaceError > maximumScreenSpaceError);
            var refines = traverse && parentRefines;

            visitTile(tileset);

            if (traverse) {
                children.sort(sortChildrenByDistanceToCamera);
                for (var i = 0; i < childrenLength; ++i) {
                    var child = children[i];
                    var visible = updateTile(tileset, child, frameState);
                    if (visible) {
                        stack.push(child);
                    }
                    if (baseTraversalOnly && replace && !hasEmptyContent(tile)) {
                        // Check if the parent can refine to this child. If the child is empty we need to traverse further to
                        // load all descendants with content. Keep non-visible children loaded since they are still needed before the parent can refine.
                        // We don't do this for empty tiles because it looks better if children stream in as they are loaded to fill the empty space.
                        if (!visible) {
                            loadTile(tileset, child, true, frameState);
                            touchTile(tileset, child, frameState);
                        }
                        // Always run the internal base traversal even if we already know we can't refine. This keeps the tiles loaded while we wait to refine.
                        var refinesToChild = hasEmptyContent(child) ? executeEmptyTraversal(tileset, child, baseScreenSpaceError, maximumScreenSpaceError, frameState) : child.contentAvailable;
                        refines = refines && refinesToChild;
                    }
                }
            }

            if (replace) {
                if (baseTraversal) {
                    // Always load tiles in the base traversal
                    // Select tiles that can't refine further
                    loadTile(tileset, tile, true, frameState);
                    if (!refines && parentRefines && tile.contentAvailable) {
                        selectDesiredTile(tileset, tile, baseTraversalOnly, frameState);
                    }
                } else {
                    // Load tiles that are not skipped or can't refine further. In practice roughly half the tiles stay unloaded.
                    // Select tiles that can't refine further. If the tile doesn't have loaded content it will try to select an ancestor with loaded content instead.
                    if (!refines) { // eslint-disable-line
                        selectDesiredTile(tileset, tile, false, frameState);
                        loadTile(tileset, tile, false, frameState);
                    } else if (reachedSkippingThreshold(tileset, tile)) {
                        loadTile(tileset, tile, false, frameState);
                    }
                }
            }

            if (add) {
                // Additive tiles are always loaded and selected
                if (tile.contentAvailable) {
                    selectDesiredTile(tileset, tile, true, frameState);
                }
                loadTile(tileset, tile, false, frameState);
            }

            if (hasEmptyContent(tile)) {
                // Select empty tiles so that we can see their debug bounding volumes
                selectDesiredTile(tileset, tile, true, frameState);
            }

            touchTile(tileset, tile, frameState);
            tile._refines = refines;
        }
    }

    function executeEmptyTraversal(tileset, root, baseScreenSpaceError, maximumScreenSpaceError, frameState) {
        // Depth-first traversal that checks if all nearest descendants with content are loaded. Ignores visibility.
        // The reason we need to implement a full traversal is to handle chains of empty tiles.
        var allDescendantsLoaded = true;

        var stack = emptyTraversal.stack;
        stack.push(root);

        while (stack.length > 0) {
            emptyTraversal.stackMaximumLength = Math.max(emptyTraversal.stackMaximumLength, stack.length);

            var tile = stack.pop();
            var children = tile.children;
            var childrenLength = children.length;

            // Only traverse if the tile is empty - we are trying to find descendants with content
            var traverse = hasEmptyContent(tile) && (childrenLength > 0) && (tile._screenSpaceError > baseScreenSpaceError);

            // When we reach a "leaf" that does not have content available we know that not all descendants are loaded
            // i.e. there will be holes if the parent tries to refine to its children, so don't refine
            if (!traverse && !tile.contentAvailable) {
                allDescendantsLoaded = false;
            }

            var visible = updateTile(tileset, tile, frameState);
            if (!visible) {
                // Load tiles that aren't visible since they are still needed for the parent to refine
                // Tiles that are visible will get loaded from within executeBaseTraversal
                loadTile(tileset, tile, true, frameState);
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

            var markedForSelection = tile._selected;
            var children = tile.children;
            var childrenLength = children.length;
            var traverse = (childrenLength > 0) && (tile._screenSpaceError > maximumScreenSpaceError);

            if (markedForSelection) {
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
