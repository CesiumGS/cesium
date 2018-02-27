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
        leaves : new ManagedArray(),
        stackMaximumLength : 0,
        leavesMaximumLength : 0
    };

    var internalBaseTraversal = {
        stack : new ManagedArray(),
        stackMaxmimumLength : 0
    };

    var skipTraversal = {
        queue1 : new ManagedArray(),
        queue2 : new ManagedArray(),
        queueMaximumLength : 0
    };

    var internalSkipTraversal = {
        stack : new ManagedArray(),
        children : new ManagedArray(),
        stackMaximumLength : 0,
        childrenMaximumLength : 0
    };

    function selectionHeuristic(tileset, ancestor, tile) {
        var skipLevels = tileset._skipLevelOfDetail ? tileset.skipLevels : 0;
        var skipScreenSpaceErrorFactor = tileset._skipLevelOfDetail ? tileset.skipScreenSpaceErrorFactor : 1.0;

        return (ancestor !== tile && !tile.hasEmptyContent && !tileset.immediatelyLoadDesiredLevelOfDetail) &&
               (tile._screenSpaceError < ancestor._screenSpaceError / skipScreenSpaceErrorFactor) &&
               (tile._depth > ancestor._depth + skipLevels);
    }

    /**
     * @private
     */
    function Cesium3DTilesetTraversal() {
    }

    Cesium3DTilesetTraversal.selectTiles = function(tileset, frameState) {
        if (tileset.debugFreezeFrame) {
            return;
        }

        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;

        tileset._desiredTiles.length = 0;
        tileset._selectedTiles.length = 0;
        tileset._requestedTiles.length = 0;
        tileset._selectedTilesToStyle.length = 0;
        tileset._hasMixedContent = false;

        tileset._cache.reset();

        var root = tileset._root;
        var rootVisible = updateTile(tileset, root, frameState) && isVisible(tileset, root, maximumScreenSpaceError, frameState);
        if (!rootVisible) {
            return;
        }

        // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
        if (getScreenSpaceError(tileset, tileset._geometricError, root, frameState) <= maximumScreenSpaceError) {
            return;
        }

        loadTile(tileset, root, frameState);
        touch(tileset, root, frameState);
        root._touchedFrame = frameState.frameNumber;

        // TODO - remove
        tileset._skipLevelOfDetail = false;

        if (!tileset._skipLevelOfDetail) {
            selectBaseTraversal(tileset, root, frameState);
        } else if (tileset.immediatelyLoadDesiredLevelOfDetail) {
            selectSkipTraversal(tileset, root, frameState);
        } else {
            selectBaseAndSkipTraversal(tileset, root, frameState);
        }

        tileset._desiredTiles.trim();
        baseTraversal.stack.trim(baseTraversal.stackMaximumLength);
        baseTraversal.leaves.trim();
        internalBaseTraversal.stack.trim(internalBaseTraversal.stackMaxmimumLength);
        skipTraversal.queue1.trim(skipTraversal.queueMaximumLength);
        skipTraversal.queue2.trim(skipTraversal.queueMaximumLength);
        internalSkipTraversal.stack.trim(internalSkipTraversal.stackMaximumLength);
        internalSkipTraversal.children.trim(internalSkipTraversal.childrenMaximumLength);
    };

    function selectBaseTraversal(tileset, root, frameState) {
        var i;
        var length;

        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;
        executeBaseTraversal(tileset, root, maximumScreenSpaceError, frameState);

        // Select leaves (replacement tiles that can't refine further)
        var leaves = baseTraversal.leaves;
        length = leaves.length;
        for (i = 0; i < length; ++i) {
            selectTile(tileset, leaves.get(i), frameState);
        }

        // Select additive tiles
        var additiveTiles = tileset._desiredTiles;
        length = additiveTiles.length;
        for (i = 0; i < length; ++i) {
            selectTile(tileset, additiveTiles.get(i), frameState);
        }
    }

    function selectSkipTraversal(tileset, root, frameState) {
        // Start the skip traversal at the root
        skipTraversal.queue1.push(root);

        // Execute the skip traversal
        executeSkipTraversal(tileset, root, tileset._maximumScreenSpaceError, frameState);

        // Mark tiles for selection or their nearest loaded ancestor
        markLoadedTilesForSelection(tileset, frameState);

        // Sort selected tiles by distance to camera and call selectTile on each
        traverseAndSelect(tileset, root, frameState);
    }

    function selectBaseAndSkipTraversal(tileset, root, frameState) {
        var baseScreenSpaceError = Math.max(tileset.baseScreenSpaceError, tileset.maximumScreenSpaceError);
        var maximumScreenSpaceError = tileset.maximumScreenSpaceError;

        // Leaves of the base traversal is where we start the skip traversal
        baseTraversal.leaves = skipTraversal.queue1;

        // Load and select tiles without skipping up to baseScreenSpaceError
        executeBaseTraversal(tileset, root, baseScreenSpaceError, frameState);

        // Skip traversal starts from a prepopulated queue from the base traversal
        executeSkipTraversal(tileset, maximumScreenSpaceError, frameState);

        // Mark tiles for selection or their nearest loaded ancestor
        markLoadedTilesForSelection(tileset, frameState);

        // Sort selected tiles by distance to camera and call selectTile on each
        traverseAndSelect(tileset, root, frameState);
    }

    function executeSkipTraversal(tileset, maximumScreenSpaceError, frameState) {
        // TODO : doc needs more
        // Breadth-first traversal where we always refine up to the maximum screen space error.
        // The breadth first condition is important for markLoadedTilesForSelection.
        // The skip traversal's queue is populated before getting here.
        var queue1 = skipTraversal.queue1;
        var queue2 = skipTraversal.queue2;
        var children = internalSkipTraversal.children;

        while (queue1.length > 0) {
            var length = queue1.length;
            skipTraversal.queueMaximumLength = Math.max(skipTraversal.queueMaximumLength, length);

            for (var i = 0; i < length; ++i) {
                var tile = queue1.get(i);
                visitTile(tileset, tile, frameState); // TODO : avoid double visitation. This tile has already visited from the base traversal
                executeInternalSkipTraversal(tileset, tile, maximumScreenSpaceError, frameState); // Populates children
                var childrenLength = children.length;
                skipTraversal.childrenMaximumLength = Math.max(skipTraversal.childrenMaximumLength, childrenLength);
                for (var j = 0; j < childrenLength; ++j) {
                    queue2.push(children[j]);
                }
            }

            // Swap the queues to begin next level
            queue1.length = 0;
            var temp = queue1;
            queue1 = queue2;
            queue2 = temp;
        }

        queue1.length = 0;
        queue2.length = 0;
        children.length = 0;
    }

    function executeInternalSkipTraversal(tileset, root, maximumScreenSpaceError, frameState) {
        var finalChildren = internalSkipTraversal.children;
        finalChildren.length = 0;

        var stack = internalBaseTraversal.stack;
        stack.length = 0;

        stack.push(root);

        while (stack.length > 0) {
            internalSkipTraversal.stackMaximumLength = Math.max(internalSkipTraversal.stackMaximumLength, stack.length);
            var tile = stack.pop();

            // TODO : avoid double visible check. Already checked in base traversal.
            if (tile !== !isVisible(tileset, tile, maximumScreenSpaceError, frameState)) {

            }


            updateChildren(tileset, tile, frameState);

            var children = tile.children;
            var childrenLength = children.length;

            // Only traverse if the tile is empty - we are trying to find descendants with content
            var traverse = (tile.hasEmptyContent || tile.hasTilesetContent) && (childrenLength > 0) && shouldTraverse(tileset, tile, maximumScreenSpaceError);

            // When we reach a "leaf" that does not have content available we know that not all descendants are loaded
            // i.e. there will be holes if the parent tries to refine to its children, so don't refine
            if (!traverse && !tile.contentAvailable) {
                allDescendantsLoaded = false;
            }

            if (traverse) {
                for (var i = 0; i < childrenLength; ++i) {
                    var child = children[i];
                    touch(tileset, child, frameState);
                    loadTile(tileset, child, frameState);
                    stack.push(child);
                }
            }
        }
    }



    // var descendantStack = [];
    //
    // function markLoadedTilesForSelection(tileset, frameState) {
    //     var tiles = tileset._desiredTiles;
    //     var length = tiles.length;
    //     for (var i = 0; i < length; ++i) {
    //         var original = tiles.get(i);
    //
    //         if (hasAdditiveContent(original)) {
    //             original.selected = true;
    //             original._selectedFrame = frameState.frameNumber;
    //             continue;
    //         }
    //
    //         var loadedTile = original._ancestorWithContentAvailable;
    //         if (original.contentAvailable) {
    //             loadedTile = original;
    //         }
    //
    //         if (defined(loadedTile)) {
    //             loadedTile.selected = true;
    //             loadedTile._selectedFrame = frameState.frameNumber;
    //         } else {
    //             // if no ancestors are ready, traverse down and select ready tiles to minimize empty regions
    //             descendantStack.push(original);
    //             while (descendantStack.length > 0) {
    //                 var tile = descendantStack.pop();
    //                 var children = tile.children;
    //                 var childrenLength = children.length;
    //                 for (var j = 0; j < childrenLength; ++j) {
    //                     var child = children[j];
    //                     touch(tileset, child);
    //                     if (child.contentAvailable) {
    //                         child.selected = true;
    //                         child._finalResolution = true;
    //                         child._selectedFrame = frameState.frameNumber;
    //                     }
    //                     if (child._depth - original._depth < 2) { // prevent traversing too far
    //                         if (!child.contentAvailable || child.refine === Cesium3DTileRefine.ADD) {
    //                             descendantStack.push(child);
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }
    //
    // var scratchStack = [];
    // var scratchStack2 = [];
    //
    // /**
    //  * Traverse the tree while tiles are visible and check if their selected frame is the current frame.
    //  * If so, add it to a selection queue.
    //  * Tiles are sorted near to far so we can take advantage of early Z.
    //  * Furthermore, this is a preorder traversal so children tiles are selected before ancestor tiles.
    //  *
    //  * The reason for the preorder traversal is so that tiles can easily be marked with their
    //  * selection depth. A tile's _selectionDepth is its depth in the tree where all non-selected tiles are removed.
    //  * This property is important for use in the stencil test because we want to render deeper tiles on top of their
    //  * ancestors. If a tileset is very deep, the depth is unlikely to fit into the stencil buffer.
    //  *
    //  * We want to select children before their ancestors because there is no guarantee on the relationship between
    //  * the children's z-depth and the ancestor's z-depth. We cannot rely on Z because we want the child to appear on top
    //  * of ancestor regardless of true depth. The stencil tests used require children to be drawn first. @see {@link updateTiles}
    //  *
    //  * NOTE: this will no longer work when there is a chain of selected tiles that is longer than the size of the
    //  * stencil buffer (usually 8 bits). In other words, the subset of the tree containing only selected tiles must be
    //  * no deeper than 255. It is very, very unlikely this will cause a problem.
    //  *
    //  * NOTE: when the scene has inverted classification enabled, the stencil buffer will be masked to 4 bits. So, the
    //  * selected tiles must be no deeper than 15. This is still very unlikely.
    //  */
    // function traverseAndSelect(tileset, root, frameState) {
    //     var stack = scratchStack;
    //     var ancestorStack = scratchStack2;
    //
    //     var lastAncestor;
    //     stack.push(root);
    //     while (stack.length > 0 || ancestorStack.length > 0) {
    //         if (ancestorStack.length > 0) {
    //             var waitingTile = ancestorStack[ancestorStack.length - 1];
    //             if (waitingTile._stackLength === stack.length) {
    //                 ancestorStack.pop();
    //                 if (waitingTile === lastAncestor) {
    //                     waitingTile._finalResolution = true;
    //                 }
    //                 selectTile(tileset, waitingTile, frameState);
    //                 continue;
    //             }
    //         }
    //
    //         var tile = stack.pop();
    //         if (!defined(tile) || !isVisited(tile, frameState)) {
    //             continue;
    //         }
    //
    //         var shouldSelect = tile.selected && tile._selectedFrame === frameState.frameNumber && tile.contentAvailable;
    //
    //         var children = tile.children;
    //         var childrenLength = children.length;
    //
    //         children.sort(sortChildrenByDistanceToCamera);
    //
    //         if (shouldSelect) {
    //             if (tile.refine === Cesium3DTileRefine.ADD) {
    //                 tile._finalResolution = true;
    //                 selectTile(tileset, tile, frameState);
    //             } else {
    //                 tile._selectionDepth = ancestorStack.length;
    //
    //                 if (tile._selectionDepth > 0) {
    //                     tileset._hasMixedContent = true;
    //                 }
    //
    //                 lastAncestor = tile;
    //
    //                 if (childrenLength === 0) {
    //                     tile._finalResolution = true;
    //                     selectTile(tileset, tile, frameState);
    //                     continue;
    //                 }
    //
    //                 ancestorStack.push(tile);
    //                 tile._stackLength = stack.length;
    //             }
    //         }
    //
    //         for (var i = 0; i < childrenLength; ++i) {
    //             var child = children[i];
    //             stack.push(child);
    //         }
    //     }
    // }

    function selectTile(tileset, tile, frameState) {
        // There may also be a tight box around just the tile's contents, e.g., for a city, we may be
        // zoomed into a neighborhood and can cull the skyscrapers in the root tile.
        if (tile.contentAvailable && (
                (tile._visibilityPlaneMask === CullingVolume.MASK_INSIDE) ||
                (tile.contentVisibility(frameState) !== Intersect.OUTSIDE)
            )) {
            tileset._selectedTiles.push(tile);

            var tileContent = tile.content;
            // TODO remove
            if (!defined(tileContent)) {
                console.log('why is it undefined');
            }
            if (tileContent.featurePropertiesDirty) {
                // A feature's property in this tile changed, the tile needs to be re-styled.
                tileContent.featurePropertiesDirty = false;
                tile.lastStyleTime = 0; // Force applying the style to this tile
                tileset._selectedTilesToStyle.push(tile);
            } else if ((tile._lastSelectedFrameNumber !== frameState.frameNumber - 1)) {
                // Tile is newly selected; it is selected this frame, but was not selected last frame.
                tileset._selectedTilesToStyle.push(tile);
            }
            tile._lastSelectedFrameNumber = frameState.frameNumber;
        }
    }

    // // PERFORMANCE_IDEA: is it worth exploiting frame-to-frame coherence in the sort, i.e., the
    // // list of children are probably fully or mostly sorted unless the camera moved significantly?
    // function sortChildrenByDistanceToCamera(a, b) {
    //     // Sort by farthest child first since this is going on a stack
    //     if (b._distanceToCamera === 0 && a._distanceToCamera === 0) {
    //         return b._centerZDepth - a._centerZDepth;
    //     }
    //
    //     return b._distanceToCamera - a._distanceToCamera;
    // }

    function visitTile(tileset, tile, frameState) {
        if (tile._visitedFrame === frameState.frameNumber) {
            // TODO : does this actually called called ever
            console.log('Already visited');
            return;
        }

        tile._visitedFrame = frameState.frameNumber;
        ++tileset._statistics.visited;
        tile.selected = false; // TODO : do we need selected?
        tile._finalResolution = false;
        tile._ancestorWithContentAvailable = undefined;

        tile.updateExpiration();

        var parent = tile.parent;
        if (defined(parent)) {
            var replace = parent.refine === Cesium3DTileRefine.REPLACE;
            tile._ancestorWithContentAvailable = (replace && parent.contentAvailable) ? parent : parent._ancestorWithContentAvailable;
        }
    }

    function touch(tileset, tile, frameState) {
        if (tile._touchedFrame === frameState.frameNumber) {
            return;
        }

        tileset._cache.touch(tile);
        tile._touchedFrame = frameState.frameNumber;
    }

    function loadTile(tileset, tile, frameState) {
        if (tile._touchedFrame === frameState.frameNumber) {
            return;
        }

        if (tile.contentUnloaded || tile.contentExpired) {
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

    function updateTile(tileset, tile, frameState) {
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
        return visible;
    }

    function updateChildren(tileset, tile, frameState) {
        var anyVisible = false;
        var children = tile.children;
        var length = children.length;
        for (var i = 0; i < length; ++i) {
            var childVisible = updateTile(tileset, children[i], frameState);
            anyVisible = anyVisible || childVisible;
        }
        return anyVisible;
    }

    function getVisibility(tileset, tile, maximumScreenSpaceError, frameState) {
        // Not visible. Visibility is updated in its parent's call to updateChildren.
        if (tile._visibilityPlaneMask === CullingVolume.MASK_OUTSIDE) {
            return false;
        }

        // Don't visit an expired subtree because it will be destroyed
        if (tile.hasTilesetContent && tile.contentExpired) {
            return false;
        }

        // Use parent's geometric error with child's box to see if we already meet the SSE
        var parent = tile.parent;
        if (defined(parent) && parent.refine === Cesium3DTileRefine.ADD && getScreenSpaceError(tileset, parent.geometricError, tile, frameState) <= maximumScreenSpaceError) {
            return false;
        }

        var replace = tile.refine === Cesium3DTileRefine.REPLACE;
        var useOptimization = tile._optimChildrenWithinParent === Cesium3DTileOptimizationHint.USE_OPTIMIZATION;
        var meetsScreenSpaceError = tile._screenSpaceError <= maximumScreenSpaceError;

        // Update children. Skip the update if the tile meets screen space error and doesn't use the optimization.
        var anyChildrenVisible = true;
        if ((!meetsScreenSpaceError || useOptimization) && tile.children.length > 0) {
            anyChildrenVisible = updateChildren(tileset, tile, frameState);
        }

        // Optimization - if no children are visible then this tile isn't visible either
        if (replace && useOptimization && !anyChildrenVisible) {
            ++tileset._statistics.numberOfTilesCulledWithChildrenUnion;
            return false;
        }

        return true;
    }

    function isVisible(tileset, tile, maximumScreenSpaceError, frameState) {
        if (tile._touchedFrame === frameState.frameNumber) {
            return tile._visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE
        }

        var visible = getVisibility(tileset, tile, maximumScreenSpaceError, frameState);
        tile._visibilityPlaneMask = visible ? tile._visibilityPlaneMask : CullingVolume.MASK_OUTSIDE;
        return tile._visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE;
    }

    function shouldTraverse(tileset, tile, maximumScreenSpaceError) {
        // Traverse if we don't meet the SSE yet
        return tile._screenSpaceError > maximumScreenSpaceError;
    }

    function executeBaseTraversal(tileset, root, maximumScreenSpaceError, frameState) {
        // Depth-first traversal where we only refine further if the tile uses additive refinement
        // or the tile uses replacement refinement and its descendants have loaded content.
        var i;
        var child;

        var stack = baseTraversal.stack;
        var leaves = baseTraversal.leaves;

        stack.length = 0;
        leaves.length = 0;

        stack.push(root);

        while (stack.length > 0) {
            baseTraversal.stackMaxmimumLength = Math.max(baseTraversal.stackMaxmimumLength, stack.length);

            var tile = stack.pop();
            var add = tile.refine === Cesium3DTileRefine.ADD;
            var replace = tile.refine === Cesium3DTileRefine.REPLACE;

            visitTile(tileset, tile, frameState);

            var children = tile.children;
            var childrenLength = children.length;

            var traverse = (childrenLength > 0) && shouldTraverse(tileset, tile, maximumScreenSpaceError);

            if (traverse) {
                var replacementWithContent = replace && tile.contentAvailable;
                for (i = 0; i < childrenLength; ++i) {
                    child = children[i];
                    // For replacement refinement we need to load all children before we can refine. This includes children that are not visible.
                    // If any of the children are empty tiles we need to traverse further to load all descendants with content.
                    // Touch children so that they are not unloaded from the cache while their siblings are loading.
                    if (replace || (add && isVisible(tileset, child, maximumScreenSpaceError, frameState))) {
                        loadTile(tileset, child, frameState);
                        touch(tileset, child, frameState);
                        child._touchedFrame = frameState.frameNumber;
                    }

                    if (replacementWithContent) {
                        if (child.hasEmptyContent || child.hasTilesetContent) {
                            traverse = traverse && executeInternalBaseTraversal(tileset, child, maximumScreenSpaceError, frameState);
                        } else {
                            traverse = traverse && child.contentAvailable;
                        }
                    }
                }
            }

            if (traverse) {
                for (i = 0; i < childrenLength; ++i) {
                    child = children[i];
                    if (isVisible(tileset, child, maximumScreenSpaceError, frameState)) {
                        stack.push(child);
                    }
                }
            }

            // TODO : technically this might not be right - should it look at its parent's replace instead?
            if (!traverse && replace && tile.contentAvailable) {
                leaves.push(tile);
            }

            // Additive tiles are always selected
            // TODO : technically this might not be right - should it look at its parent's add instead?
            if (add && tile.contentAvailable) {
                tileset._desiredTiles.push(tile);
            }
        }
    }

    function executeInternalBaseTraversal(tileset, root, maximumScreenSpaceError, frameState) {
        // Depth-first traversal that checks if all nearest descendants with content are loaded. Ignores visibility.
        // The reason we need to implement a full traversal is to handle chains of empty tiles.
        // TODO : there is some duplication when this is called. If allDescendantsLoaded is true some of this code will
        // TODO : happen again as part of executeBaseTraversal
        var stack = internalBaseTraversal.stack;
        stack.length = 0;

        var allDescendantsLoaded = true;
        stack.push(root);

        while (stack.length > 0) {
            internalBaseTraversal.stackMaxmimumLength = Math.max(internalBaseTraversal.stackMaxmimumLength, stack.length);

            var tile = stack.pop();
            var children = tile.children;
            var childrenLength = children.length;

            // Only traverse if the tile is empty - we are trying to find descendants with content
            var traverse = (tile.hasEmptyContent || tile.hasTilesetContent) && (childrenLength > 0) && shouldTraverse(tileset, tile, maximumScreenSpaceError);

            // When we reach a "leaf" that does not have content available we know that not all descendants are loaded
            // i.e. there will be holes if the parent tries to refine to its children, so don't refine
            if (!traverse && !tile.contentAvailable) {
                allDescendantsLoaded = false;
            }

            if (traverse) {
                for (var i = 0; i < childrenLength; ++i) {
                    var child = children[i];
                    updateTile(child);
                    loadTile(tileset, child, frameState);
                    touch(tileset, child, frameState);
                    child._touchedFrame = frameState.frameNumber;
                    stack.push(child);
                }
            }
        }

        return allDescendantsLoaded;
    }

    return Cesium3DTilesetTraversal;
});
