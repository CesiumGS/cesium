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

    var baseTraversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0
    };

    var internalBaseTraversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0
    };

    var skipTraversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0
    };

    var selectionTraversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0,
        ancestorStack : new ManagedArray(),
        ancestorStackMaximumLength : 0
    };

    /**
     * @private
     */
    function Cesium3DTilesetTraversal() {
    }

    Cesium3DTilesetTraversal.selectTiles = function(tileset, frameState) {
        if (tileset.debugFreezeFrame) {
            return;
        }

        tileset._desiredTiles.length = 0;
        tileset._selectedTiles.length = 0;
        tileset._selectedTilesToStyle.length = 0;
        tileset._hasMixedContent = false;

        tileset._cache.reset();

        var root = tileset._root;
        var rootVisible = updateVisibility(tileset, root, frameState);
        if (!rootVisible) {
            return;
        }

        // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
        if (getScreenSpaceError(tileset, tileset._geometricError, root, frameState) <= tileset._maximumScreenSpaceError) {
            return;
        }

        if (!tileset._skipLevelOfDetail) {//} || tileset._allTilesAdditive) {
            selectBaseTraversal(tileset, root, frameState);
        } else if (tileset.immediatelyLoadDesiredLevelOfDetail) {
            selectSkipTraversal(tileset, root, frameState);
        } else {
            selectBaseAndSkipTraversal(tileset, root, frameState);
        }

        // TODO : these aren't really correct because min/max never get reset.
        tileset._desiredTiles.trim();
        baseTraversal.stack.trim(baseTraversal.stackMaximumLength);
        internalBaseTraversal.stack.trim(internalBaseTraversal.stackMaximumLength);
        skipTraversal.stack.trim(skipTraversal.stackMaximumLength);
        selectionTraversal.stack.trim(selectionTraversal.stackMaximumLength);
        selectionTraversal.ancestorStack.trim(selectionTraversal.ancestorStackMaximumLength);
    };

    function selectBaseTraversal(tileset, root, frameState) {
        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;
        executeBaseTraversal(tileset, root, maximumScreenSpaceError, maximumScreenSpaceError, undefined, frameState);

        // Select desired tiles
        var desiredTiles = tileset._desiredTiles;
        var length = desiredTiles.length;
        for (var i = 0; i < length; ++i) {
            selectTile(tileset, desiredTiles.get(i), frameState);
        }
    }

    function selectSkipTraversal(tileset, root, frameState) {
        // Start the skip traversal at the root
        skipTraversal.stack.push(root);

        // Execute the skip traversal
        executeSkipTraversal(tileset, tileset._maximumScreenSpaceError, frameState);

        // Mark tiles for selection or their nearest loaded ancestor
        markDesiredTilesForSelection(tileset, frameState);

        // Sort selected tiles by distance to camera and call selectTile on each
        traverseAndSelect(tileset, root, frameState);
    }

    function selectBaseAndSkipTraversal(tileset, root, frameState) {
        var baseScreenSpaceError = Math.max(tileset.baseScreenSpaceError, tileset.maximumScreenSpaceError);
        var maximumScreenSpaceError = tileset.maximumScreenSpaceError;

        // Load and select tiles without skipping up to baseScreenSpaceError
        // Leaves of the base traversal is where we start the skip traversal
        executeBaseTraversal(tileset, root, baseScreenSpaceError, maximumScreenSpaceError, skipTraversal.stack, frameState);

        executeSkipTraversal(tileset, maximumScreenSpaceError, frameState);

        // Mark tiles for selection or their nearest loaded ancestor
        markDesiredTilesForSelection(tileset, frameState);

        // Sort selected tiles by distance to camera and call selectTile on each
        traverseAndSelect(tileset, root, frameState);
    }

    function markDesiredTilesForSelection(tileset, frameState) {
        var tiles = tileset._desiredTiles;
        var length = tiles.length;
        for (var i = 0; i < length; ++i) {
            var tile = tiles.get(i);
            var loadedTile = tile.contentAvailable ? tile : tile._ancestorWithContentAvailable;
            if (defined(loadedTile)) {
                markForSelection(tileset, loadedTile, frameState);
            }
        }
    }

    function selectTile(tileset, tile, frameState) {
        if (tile._selectedFrame === frameState.frameNumber) {
            tileset._selectedTiles.push(tile);
        }
    }

    function markForSelection(tileset, tile, frameState) {
        if (tile._selectedFrame === frameState.frameNumber) {
            return;
        }

        // There may also be a tight box around just the tile's contents, e.g., for a city, we may be
        // zoomed into a neighborhood and can cull the skyscrapers in the root tile.
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
        }
    }

    function sortChildrenByDistanceToCamera(a, b) {
        // Sort by farthest child first since this is going on a stack
        if (b._distanceToCamera === 0 && a._distanceToCamera === 0) {
            return b._centerZDepth - a._centerZDepth;
        }

        return b._distanceToCamera - a._distanceToCamera;
    }

    /**
     * Traverse the tree while tiles are visible and check if their selected frame is the current frame.
     * If so, add it to a selection queue.
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
            var markedForSelection = tile._selectedFrame === frameState.frameNumber;
            var children = tile.children;
            var childrenLength = children.length;
            children.sort(sortChildrenByDistanceToCamera);

            if (markedForSelection) {
                if (add) {
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

    function contentVisible(tile, frameState) {
        return (tile._visibilityPlaneMask === CullingVolume.MASK_INSIDE) ||
               (tile.contentVisibility(frameState) !== Intersect.OUTSIDE);
    }

    // function addDesiredTile(tileset, tile, frameState) {
    //     if (tile._touchedFrame === frameState.frameNumber) {
    //         return;
    //     }
    //
    //     tileset._desiredTiles.push(tile);
    // }

    function addDesiredTile(tileset, tile, frameState) {
        var desiredTiles = tileset._desiredTiles;
        var length = desiredTiles.length;

        for (var i = 0; i < length; ++i) {
            var other = desiredTiles[i];
            if (other === tile) {
                return;
            }
        }

        tileset._desiredTiles.push(tile);
    }

    function visitTile(tileset, tile, frameState) {
        if (tile._touchedFrame === frameState.frameNumber) {
            return;
        }

        ++tileset._statistics.visited;
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
    }

    function touch(tileset, tile, frameState) {
        if (tile._touchedFrame === frameState.frameNumber) {
            return;
        }

        tileset._cache.touch(tile);
    }

    function getPriority(tile, useParentPriority) {
        // TODO : we want priority of base traversal to be SSE based so that it refines fast...
        // TODO : doesn't really matter though if we have skiplods on, though it does help a bit
        // TODO : somehow that means we need some comparison of distance and sse
        // The base traversal sets useParentPriority to true so that child tiles can load as soon as possible so that their parent can refine sooner.
        // Additive tiles always load based on distance because it subjectively looks better
        // TODO : what to do about tileset with heavy mix of replace and add. The priorities will differ a lot.
        var parent = tile.parent;
        var replace = tile.refine === Cesium3DTileRefine.REPLACE;
        var add = tile.refine === Cesium3DTileRefine.ADD;
        //if (add) {
            return tile._distanceToCamera;
        //} else if (replace) {
        //    var priority = (defined(parent) && (useParentPriority || tile._screenSpaceError === 0.0)) ? parent._screenSpaceError : tile._screenSpaceError;
        //    return 100000.0 - priority; // TODO : doing this just because RequestScheduler wants lower priority
        //}
    }

    function loadTile(tileset, tile, useParentPriority, frameState) {
        if (tile._touchedFrame === frameState.frameNumber) {
            return;
        }

        if (hasUnloadedContent(tile) || tile.contentExpired) {
            tile._requestedFrame = frameState.frameNumber;
            tile._priority = getPriority(tile, useParentPriority);
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

    function getVisibility(tileset, tile, maximumScreenSpaceError, frameState) {
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
        if (defined(parent) && (parent.refine === Cesium3DTileRefine.ADD) && getScreenSpaceError(tileset, parent.geometricError, tile, frameState) <= maximumScreenSpaceError) {
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

    function updateTile(tileset, tile, maximumScreenSpaceError, frameState) {
        if (tile._touchedFrame === frameState.frameNumber) {
            return tile._visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE;
        }

        var visible = getVisibility(tileset, tile, maximumScreenSpaceError, frameState);
        tile._visibilityPlaneMask = visible ? tile._visibilityPlaneMask : CullingVolume.MASK_OUTSIDE;
        return tile._visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE;
    }

    function hasEmptyContent(tile) {
        return tile.hasEmptyContent || tile.hasTilesetContent;
    }

    function hasUnloadedContent(tile) {
        return !hasEmptyContent(tile) && tile.contentUnloaded;
    }

    function executeBaseTraversal(tileset, root, baseScreenSpaceError, maximumScreenSpaceError, leaves, frameState) {
        // TODO wording
        // Depth-first traversal that loads all tiles that are visible and don't meet the screen space error.
        // For replacement refinement: selects tiles to render that can't refine further - either because
        // their children aren't loaded yet or they meet the screen space error.
        // For additive refinement: select all tiles to render
        var stack = baseTraversal.stack;
        stack.push(root);

        while (stack.length > 0) {
            baseTraversal.stackMaximumLength = Math.max(baseTraversal.stackMaximumLength, stack.length);

            var tile = stack.pop();
            var add = tile.refine === Cesium3DTileRefine.ADD;
            var replace = tile.refine === Cesium3DTileRefine.REPLACE;
            var children = tile.children;
            var childrenLength = children.length;
            var contentAvailable = tile.contentAvailable;
            var traverse = (childrenLength > 0) && (tile._screenSpaceError > baseScreenSpaceError);
            var parent = tile.parent;
            var parentRefines = !defined(parent) || parent._refines;
            var refines = traverse && parentRefines;

            if (traverse) {
                for (var i = 0; i < childrenLength; ++i) {
                    var child = children[i];
                    var visible = updateTile(tileset, child, maximumScreenSpaceError, frameState);
                    if (visible) {
                        stack.push(child);
                    }
                    if (replace && !hasEmptyContent(tile)) {
                        // Check if the parent can refine to this child. If the child is empty we need to traverse further to
                        // load all descendants with content. Keep non-visible children loaded since they are still needed before the parent can refine.
                        // We don't do this for empty tiles because it looks better if children stream in as they are loaded to fill the empty space.
                        if (!visible) {
                            loadTile(tileset, child, true, frameState);
                            touch(tileset, child, frameState);
                            child._touchedFrame = frameState.frameNumber;
                        }

                        // Always run the internal base traversal even if we already know we can't refine. This keeps the tiles loaded while we wait to refine.
                        var refinesToChild = hasEmptyContent(child) ? executeInternalBaseTraversal(tileset, child, baseScreenSpaceError, maximumScreenSpaceError, frameState) : child.contentAvailable;
                        refines = refines && refinesToChild;
                    }
                }
            }

            // TODO : optimization of rendering visible children even if the parent hasn't refined

            if (!defined(leaves) && replace && contentAvailable && !refines && parentRefines) {
                // Replacement tiles that have loaded content but can't refine further are desired
                // leaves is undefined if we are just running the base traversal
                addDesiredTile(tileset, tile, frameState);
            }

            if (add && contentAvailable) {
                // Additive tiles that have loaded content are always desired
                addDesiredTile(tileset, tile, frameState);
            }

            // if (defined(leaves) && !traverse && (childrenLength > 0) && (tile._screenSpaceError > maximumScreenSpaceError)) {
            //     // If the tile cannot traverse further in the base traversal but can traverse further in the skip traversal, add it to leaves
            //     // leaves is undefined if we are just running the base traversal
            //     leaves.push(tile);
            // }

            visitTile(tileset, tile, frameState);
            loadTile(tileset, tile, true, frameState);
            touch(tileset, tile, frameState);
            tile._touchedFrame = frameState.frameNumber;
            tile._refines = refines;
        }
    }

    function executeInternalBaseTraversal(tileset, root, baseScreenSpaceError, maximumScreenSpaceError, frameState) {
        // Depth-first traversal that checks if all nearest descendants with content are loaded. Ignores visibility.
        // The reason we need to implement a full traversal is to handle chains of empty tiles.
        var allDescendantsLoaded = true;

        var stack = internalBaseTraversal.stack;
        stack.push(root);

        while (stack.length > 0) {
            internalBaseTraversal.stackMaximumLength = Math.max(internalBaseTraversal.stackMaximumLength, stack.length);

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

            var visible = updateTile(tileset, tile, maximumScreenSpaceError, frameState);
            if (!visible) {
                // Load tiles that aren't visible since they are still needed for the parent to refine
                // Tiles that are visible will get loaded from within executeBaseTraversal
                loadTile(tileset, tile, true, frameState);
                touch(tileset, tile, frameState);
                tile._touchedFrame = frameState.frameNumber;
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

    function reachedSkippingThreshold(tileset, tile) {
        var ancestor = tile._ancestorWithContent;
        var skipLevels = tileset.skipLevelOfDetail ? tileset.skipLevels : 0;
        var skipScreenSpaceErrorFactor = tileset.skipLevelOfDetail ? tileset.skipScreenSpaceErrorFactor : 1.0;

        return !tileset.immediatelyLoadDesiredLevelOfDetail &&
               defined(ancestor) &&
               (tile._screenSpaceError < (ancestor._screenSpaceError / skipScreenSpaceErrorFactor)) &&
               (tile._depth > (ancestor._depth + skipLevels));
    }

    function executeSkipTraversal(tileset, maximumScreenSpaceError, frameState) {
        // Depth-first traversal that skips tiles until in reaches the skipping threshold.
        var i;

        var stack = skipTraversal.stack;

        // TODO : possibly remove this
        stack.length = 0;
        stack.push(tileset._root);

        while (stack.length > 0) {
            skipTraversal.stackMaximumLength = Math.max(skipTraversal.stackMaximumLength, stack.length);

            var tile = stack.pop();
            var add = tile.refine === Cesium3DTileRefine.ADD;
            var replace = tile.refine === Cesium3DTileRefine.REPLACE;
            var children = tile.children;
            var childrenLength = children.length;
            var traverse = (childrenLength > 0) && (tile._screenSpaceError > maximumScreenSpaceError);

            visitTile(tileset, tile, frameState);

            if (replace) {
                if (!traverse) {
                    addDesiredTile(tileset, tile, frameState);
                    loadTile(tileset, tile, false, frameState);
                } else if (reachedSkippingThreshold(tileset, tile)) {
                    loadTile(tileset, tile, false, frameState);
                }
                // Always touch tiles. Even tiles that are skipped should stay loaded.
                touch(tileset, tile, frameState);
                tile._touchedFrame = frameState.frameNumber;
            }

            if (add) {
                // Additive tiles are always desired
                if (tile.contentAvailable) {
                    addDesiredTile(tileset, tile, frameState);
                }
                loadTile(tileset, tile, false, frameState);
                touch(tileset, tile, frameState);
                tile._touchedFrame = frameState.frameNumber;
            }

            if (traverse) {
                for (i = 0; i < childrenLength; ++i) {
                    var child = children[i];
                    var visible = updateTile(tileset, child, maximumScreenSpaceError, frameState);
                    if (visible) {
                        stack.push(child);
                    }
                }
            }
        }
        // TODO : ignoring loadSiblings right now
    }

    return Cesium3DTilesetTraversal;
});
