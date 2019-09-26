define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/Intersect',
        '../Core/ManagedArray',
        '../Core/Math',
        './Cesium3DTileOptimizationHint',
        './Cesium3DTileRefine'
    ], function(
        Cartesian3,
        defined,
        Intersect,
        ManagedArray,
        CesiumMath,
        Cesium3DTileOptimizationHint,
        Cesium3DTileRefine) {
    'use strict';

    /**
     * @private
     */
    function Cesium3DTilesetTraversalImplicit() {
    }

    function isVisible(tile) {
        return tile._visible && tile._inRequestVolume;
    }

    var traversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0
    };

    var emptyTraversal = {
        stack : new ManagedArray(),
        stackMaximumLength : 0
    };

    Cesium3DTilesetTraversalImplicit.selectTiles = function(tileset, frameState) {
        tileset._requestedTiles.length = 0;

        if (tileset.debugFreezeFrame) {
            return;
        }

        tileset._selectedTiles.length = 0;
        tileset._selectedTilesToStyle.length = 0;
        tileset._emptyTiles.length = 0;
        tileset._hasMixedContent = false;

        executeTraversal(tileset, frameState);

        traversal.stack.trim(traversal.stackMaximumLength);
        emptyTraversal.stack.trim(emptyTraversal.stackMaximumLength);

        // Update the priority for any requests found during traversal
        // Update after traversal so that min and max values can be used to normalize priority values
        var requestedTiles = tileset._requestedTiles;
        var length = requestedTiles.length;
        for (var i = 0; i < length; ++i) {
            requestedTiles[i].updatePriority();
        }
    };

    function addEmptyTile(tileset, tile) {
        tileset._emptyTiles.push(tile);
    }

    function selectTile(tileset, tile, frameState) {
        if (tile.contentVisibility(frameState) !== Intersect.OUTSIDE) {
            var tileContent = tile.content;
            if (tileContent.featurePropertiesDirty) {
                // A feature's property in this tile changed, the tile needs to be re-styled.
                tileContent.featurePropertiesDirty = false;
                tile.lastStyleTime = 0; // Force applying the style to this tile
                tileset._selectedTilesToStyle.push(tile);
            } else if ((tile._selectedFrame < frameState.frameNumber - 1)) {
                // Tile is newly selected; it is selected this frame, but was not selected last frame.
                tileset._selectedTilesToStyle.push(tile);
            }
            tile._selectedFrame = frameState.frameNumber;
            tileset._selectedTiles.push(tile);
        }
    }

    function selectDesiredTile(tileset, tile, frameState) {
        if (tile.contentAvailable) {
            // The tile can be selected right away and does not require traverseAndSelect
            selectTile(tileset, tile, frameState);
        }
    }

    function visitTile(tileset, tile, frameState) {
        ++tileset._statistics.visited;
        tile._visitedFrame = frameState.frameNumber;
    }

    function touchTile(tileset, tile, frameState) {
        if (tile._touchedFrame === frameState.frameNumber) {
            // Prevents another pass from touching the frame again
            return;
        }
        tileset._cache.touch(tile);
        tile._touchedFrame = frameState.frameNumber;
    }

    function loadTile(tileset, tile, frameState) {
        if (tile._requestedFrame === frameState.frameNumber || (!hasUnloadedContent(tile) && !tile.contentExpired)) {
            return;
        }

        tile._requestedFrame = frameState.frameNumber;
        tileset._requestedTiles.push(tile);
    }

    function updateVisibility(tileset, tile, frameState) {
        if (tile._updatedVisibilityFrame === tileset._updatedVisibilityFrame) {
            // Return early if visibility has already been checked during the traversal.
            // The visibility may have already been checked if the cullWithChildrenBounds optimization is used.
            return;
        }

        tile.updateVisibility(frameState);
        tile._updatedVisibilityFrame = tileset._updatedVisibilityFrame;
    }

    // function anyChildrenVisible(tileset, tile, frameState) {
    //     var anyVisible = false;
    //     var children = tile.children;
    //     var length = children.length;
    //     for (var i = 0; i < length; ++i) {
    //         var child = children[i];
    //         updateVisibility(tileset, child, frameState);
    //         anyVisible = anyVisible || isVisible(child);
    //     }
    //     return anyVisible;
    // }

    function meetsScreenSpaceErrorEarly(tileset, tile, frameState) {
        var parent = tile.parent;
        if (!defined(parent) || parent.hasTilesetContent || (parent.refine !== Cesium3DTileRefine.ADD)) {
            return false;
        }

        // Use parent's geometric error with child's box to see if the tile already meet the SSE
        return tile.getScreenSpaceError(frameState, true) <= tileset._maximumScreenSpaceError;
    }

    function updateTileVisibility(tileset, tile, frameState) {
        updateVisibility(tileset, tile, frameState);

        if (!isVisible(tile)) {
            return;
        }

        var hasChildren = tile.children.length > 0;
        if (tile.hasTilesetContent && hasChildren) {
            // Use the root tile's visibility instead of this tile's visibility.
            // The root tile may be culled by the children bounds optimization in which
            // case this tile should also be culled.
            var child = tile.children[0];
            // updateTileVisibility(tileset, child, frameState);
            updateVisibility(tileset, child, frameState);
            tile._visible = child._visible;
            return;
        }

        // Very much needed for additive
        if (meetsScreenSpaceErrorEarly(tileset, tile, frameState)) {
            tile._visible = false;
            return;
        }
    }

    function updateTile(tileset, tile, frameState) {
        // Reset some of the tile's flags and re-evaluate visibility
        updateTileVisibility(tileset, tile, frameState);
    }


    function hasEmptyContent(tile) {
        return tile.hasEmptyContent || tile.hasTilesetContent;
    }

    function hasUnloadedContent(tile) {
        return !hasEmptyContent(tile) && tile.contentUnloaded;
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

        // For traditional replacement refinement only refine if all children are loaded.
        // Empty tiles are exempt since it looks better if children stream in as they are loaded to fill the empty space.
        // var checkRefines = !skipLevelOfDetail(tileset) && replace && !hasEmptyContent(tile);
        var checkRefines = replace && !hasEmptyContent(tile);
        var refines = true;

        var hasVisibleChild = false;

        var child;
        for (i = 0; i < length; ++i) {
            child = children[i];
            if (isVisible(child)) {
                stack.push(child);
                hasVisibleChild = true;
            } else if (checkRefines || tileset.loadSiblings) {
                // Keep non-visible children loaded since they are still needed before the parent can refine.
                // Or loadSiblings is true so always load tiles regardless of visibility.
                loadTile(tileset, child, frameState);
                touchTile(tileset, child, frameState);
            }
            if (checkRefines) {
                var childRefines;
                if (!child._inRequestVolume) {
                    childRefines = false;
                } else if (hasEmptyContent(child)) {
                    childRefines = executeEmptyTraversal(tileset, child, frameState);
                } else {
                    childRefines = child.contentAvailable;
                }
                refines = refines && childRefines;
            }
        }

        if (!hasVisibleChild) {
            refines = false;
        }

        return refines;
    }

    function canTraverse(tileset, tile) {
        if (tile.children.length === 0) {
            return false;
        }
        if (tile.hasTilesetContent) {
            // Traverse external tileset to visit its root tile
            // Don't traverse if the subtree is expired because it will be destroyed
            return !tile.contentExpired;
        }
        return tile._screenSpaceError > tileset._maximumScreenSpaceError;
    }

    function executeTraversal(tileset, frameState) {
        // Determine how far down we should go
        // ADD: _maximumTraversalLevel is the max content level we can explicitly check, starting at content root
        // REPLACE: _maximumTraversalLevel - 1 is the max content level we can explicitly check(it is the last parent level), starting at tileset root
        // if a tile succeeds, all the children must be requested, if the children are visible and ready they can be added to _selectedTiles
        var tilesetRoot = tileset.root;
        updateTile(tileset, tilesetRoot, frameState);
        tileset.updateTraversalInfo(frameState);

        var isAdd = tileset._allTilesAdditive;
        var contentStartLevel = tileset._startLevel;

        var lastContentLevelToCheck;
        var contentRootAccessible;
        if (isAdd) {
            lastContentLevelToCheck = tileset._maximumTraversalLevel;
            contentRootAccessible = contentStartLevel <= lastContentLevelToCheck;
        } else {
            lastContentLevelToCheck = tileset._maximumTraversalLevel - 1;
            contentRootAccessible = contentStartLevel - 1 <= lastContentLevelToCheck;
        }

        if (!contentRootAccessible) {
            return;
        }

        // if (!isAdd) {
        if (true) {
            var stack = traversal.stack;
            stack.push(tilesetRoot);

            while (stack.length > 0) {
                var tile = stack.pop();

                var parent = tile.parent;
                var parentRefines = !defined(parent) || parent._refines;
                var refines = false;

                if (canTraverse(tileset, tile)) {
                    refines = updateAndPushChildren(tileset, tile, stack, frameState) && parentRefines;
                }

                var stoppedRefining = !refines && parentRefines;

                if (hasEmptyContent(tile)) {
                    // Add empty tile just to show its debug bounding volume
                    // If the tile has tileset content load the external tileset
                    // If the tile cannot refine further select its nearest loaded ancestor
                    addEmptyTile(tileset, tile, frameState);
                    loadTile(tileset, tile, frameState);
                    if (stoppedRefining) {
                        selectDesiredTile(tileset, tile, frameState);
                    }
                } else if (isAdd) {
                    // Additive tiles are always loaded and selected
                    selectDesiredTile(tileset, tile, frameState);
                    loadTile(tileset, tile, frameState);
                } else {
                    loadTile(tileset, tile, frameState);
                    if (stoppedRefining) {
                        selectDesiredTile(tileset, tile, frameState);
                    }
                }

                visitTile(tileset, tile, frameState);
                touchTile(tileset, tile, frameState);
                tile._refines = refines;
            }
        }


        // if (!isAdd) {
        //     // Must request all content roots for REPLACE refinement, so it's slightly different than the main loop
        //     // Access through the tileset's subtreeInfo database, add accessor functions for pulling all subtrees for a given level
        //     // You then loop over all tiles on the subtree level that we care about.
        //     // 1. call updateTile, if not vis continue to next tile, otherwise call loadTile
        //     // TODO: I think REPLACE refine might be best with stack or double buffer stack
        // }

        // ADD: On every level in the loop:
        // 1. updateTile
        // 2. if visible and within the Camear distance for the level, loadTile and selectDesiredTile
        // For now maybe: ask tileset.subtreeInfo for an array of subtreeInfo's
        // for all the levels we have to process, then on each level we get a
        // subset from this list for subtrees at the tree level we are processing
        var allSubtrees = tileset._subtreeInfo.subtreesInRange(contentStartLevel, lastContentLevelToCheck); // TODO: Maybe later update this to take min max x, y ,z?
        var contentLevel;
        for (contentLevel = contentStartLevel; contentLevel <= lastContentLevelToCheck; contentLevel++) {

        }
    }

    function executeEmptyTraversal(tileset, root, frameState) {
        // Depth-first traversal that checks if all nearest descendants with content are loaded. Ignores visibility.
        var allDescendantsLoaded = true;
        var stack = emptyTraversal.stack;
        stack.push(root);

        while (stack.length > 0) {
            emptyTraversal.stackMaximumLength = Math.max(emptyTraversal.stackMaximumLength, stack.length);

            var tile = stack.pop();
            var children = tile.children;
            var childrenLength = children.length;

            // Only traverse if the tile is empty - traversal stop at descendants with content
            var traverse = hasEmptyContent(tile) && canTraverse(tileset, tile);

            // Traversal stops but the tile does not have content yet.
            // There will be holes if the parent tries to refine to its children, so don't refine.
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

    return Cesium3DTilesetTraversalImplicit;
});
