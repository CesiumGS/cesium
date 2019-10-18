define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/Intersect',
        '../Core/ManagedArray',
        '../Core/Math',
        './Cesium3DTileOptimizationHint',
        './Cesium3DTileRefine',
        './SubtreeInfo'
    ], function(
        Cartesian3,
        defined,
        Intersect,
        ManagedArray,
        CesiumMath,
        Cesium3DTileOptimizationHint,
        Cesium3DTileRefine,
        SubtreeInfo) {
    'use strict';

    /**
     * @private
     */
    function Cesium3DTilesetTraversalImplicit() {
    }

    function isVisible(tile) {
        return tile._visible && tile._inRequestVolume;
    }

    Cesium3DTilesetTraversalImplicit.selectTiles = function(tileset, frameState) {
        tileset._requestedTiles.length = 0;

        if (tileset.debugFreezeFrame) {
            return;
        }

        tileset._selectedTiles.length = 0;
        tileset._selectedTilesToStyle.length = 0;
        tileset._emptyTiles.length = 0;
        tileset._hasMixedContent = false;

        updateVisibility2(tileset, tileset.root, frameState);
        tileset._indicesFinder.update(frameState);

        // ADD: _maximumTraversalLevel is the max content level we can explicitly check, starting at content root
        // REPLACE: _maximumTraversalLevel - 1 is the max content level we can explicitly check(it is the last parent level), starting at tileset root
        // if a tile succeeds, all the children must be requested, if the children are visible and ready they can be added to _selectedTiles
        if (tileset._allTilesAdditive) {
            additiveTraversal(tileset, frameState);
        } else {
            // replacementTraversal(tileset, frameState);
            replacementTraversal2(tileset, frameState);
        }

        // Update the priority for any requests found during traversal
        // Update after traversal so that min and max values can be used to normalize priority values
        var requestedTiles = tileset._requestedTiles;
        var length = requestedTiles.length;
        for (var i = 0; i < length; ++i) {
            requestedTiles[i].updatePriority();
        }
    };

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
        // if (tile.contentAvailable) {
        if (tile.contentAvailable && tile._selectedFrame !== frameState.frameNumber) {
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

    function updateVisibility2(tileset, tile, frameState) {
        if (tile._updatedVisibilityFrame !== tileset._updatedVisibilityFrame) {
            tile.updateVisibility2(frameState);
            tile._updatedVisibilityFrame = tileset._updatedVisibilityFrame;
        }
    }

    function hasEmptyContent(tile) {
        return tile.hasEmptyContent || tile.hasTilesetContent;
    }

    function hasUnloadedContent(tile) {
        return !hasEmptyContent(tile) && tile.contentUnloaded;
    }

    // function additiveTileChecks_visAndDist(tileset, subtree, contentLevel, distanceForLevel, frameState) {
    //     var indexRange = subtree.arrayIndexRangeForLevel(contentLevel);
    //     var begin = indexRange.begin;
    //     var end = indexRange.end;
    //     var tiles = subtree._tiles;
    //     var j, tile;
    //     for (j = begin; j < end; j++) {
    //         tile = tiles[j];
    //
    //         if (!defined(tile)) {
    //             continue;
    //         }
    //
    //         updateVisibility(tileset, tile, frameState);
    //
    //         if (!isVisible(tile) || tile._distanceToCamera > distanceForLevel) {
    //             continue;
    //         }
    //
    //         loadTile(tileset, tile, frameState);
    //         selectDesiredTile(tileset, tile, frameState);
    //         visitTile(tileset, tile, frameState);
    //         touchTile(tileset, tile, frameState);
    //     }
    // }

    function additiveTileChecks(
        tileset,
        subtree,
        subtreeMinTreeIndicesForLevel,
        subtreeMaxTreeIndicesForLevel,
        contentLevel,
        levelEllipsoid,
        frameState) {

        var i;
        var levelEllipsoidLength = levelEllipsoid.length;
        var xRowRange;
        for (i = 0; i < levelEllipsoidLength; i++) {
            xRowRange = levelEllipsoid.get(i);
            if (xRowRange.x < subtreeMinTreeIndicesForLevel.x ||
                xRowRange.w > subtreeMaxTreeIndicesForLevel.x ||
                xRowRange.y < subtreeMinTreeIndicesForLevel.y ||
                xRowRange.y > subtreeMaxTreeIndicesForLevel.y ||
                xRowRange.z < subtreeMinTreeIndicesForLevel.z ||
                xRowRange.z > subtreeMaxTreeIndicesForLevel.z) {
                continue;
            }

            // Clamp the xRowRange start and end to the subtrees indices for level
            var xStart = Math.max(subtreeMinTreeIndicesForLevel.x, xRowRange.w);
            var xEnd = Math.min(subtreeMaxTreeIndicesForLevel.x, xRowRange.x);

            // Find the begin and end in the tiles array for this x row stretch
            var indexRange = subtree.arrayIndexRangeForLevel(contentLevel);
            var offset = indexRange.begin;

            var relXInSubtreeLevelGrid = xStart      - subtreeMinTreeIndicesForLevel.x;
            var relYInSubtreeLevelGrid = xRowRange.y - subtreeMinTreeIndicesForLevel.y;
            var relZInSubtreeLevelGrid = xRowRange.z - subtreeMinTreeIndicesForLevel.z;
            var subtreeLevelDim = subtreeMaxTreeIndicesForLevel.x - subtreeMinTreeIndicesForLevel.x + 1;
            var begin = offset + relZInSubtreeLevelGrid*subtreeLevelDim*subtreeLevelDim + relYInSubtreeLevelGrid*subtreeLevelDim + relXInSubtreeLevelGrid;
            var end = begin + xEnd - xStart;

            var tiles = subtree._tiles;
            var j, tile;
            for (j = begin; j <= end; j++) {
                tile = tiles[j];

                if (!defined(tile)) {
                    continue;
                }

                // updateVisibility2(tileset, tile, frameState);
                updateVisibility(tileset, tile, frameState);
                if (!isVisible(tile)) {
                    continue;
                }

                loadTile(tileset, tile, frameState);
                selectDesiredTile(tileset, tile, frameState);
                visitTile(tileset, tile, frameState);
                touchTile(tileset, tile, frameState);
            }
        }
    }

    var subtreeMinTreeIndicesForLevel = new Cartesian3();
    var subtreeMaxTreeIndicesForLevel = new Cartesian3();
    function additiveTraversal(tileset, frameState) {
        // ADD: On every level in the loop:
        // 1. updateTile
        // 2. if visible and within the Camear distance for the level, loadTile and selectDesiredTile
        var indicesFinder = tileset._indicesFinder;
        var contentStartLevel = indicesFinder._startLevel;
        var lastContentLevelToCheck = indicesFinder._maximumTraversalLevel;
        var contentRootAccessible = contentStartLevel <= lastContentLevelToCheck;
        if (!contentRootAccessible) {
            return;
        }

        // These are really the level ellipsoids index bounding box
        var minIndices = indicesFinder._minIndices;
        var maxIndices = indicesFinder._maxIndices;

        var allSubtrees = tileset._subtreeInfo.subtreesInRange(contentStartLevel, lastContentLevelToCheck/* , minIndices, maxIndices */);
        if (allSubtrees.length === 0) {
            // None available yet
            return;
        }

        // var lodDistances = indicesFinder._lodDistances;
        // indicesFinder.determineLocalPlanePositions(frameState.cullingVolume.planes);
        indicesFinder.determineRadEffectivePerPlanePerLevel(frameState.cullingVolume.planes);

        var i;
        for (var contentLevel = contentStartLevel; contentLevel <= lastContentLevelToCheck; contentLevel++) {
            var subtreesForThisLevel = SubtreeInfo.subtreesContainingLevel(allSubtrees, contentLevel, contentStartLevel);

            var length = subtreesForThisLevel.length;
            if (length === 0) {
                // None available yet
                break;
            }

            // var distanceForLevel = lodDistances[contentLevel];
            // var levelEllipsoid = indicesFinder.updateLevelEllipsoid(contentLevel);
            var levelEllipsoid = indicesFinder.updateLevelEllipsoidDynamic(contentLevel, frameState.cullingVolume.planes);

            for (i = 0; i < length; i++) {
                var subtree = subtreesForThisLevel[i];
                subtree.treeIndexRangeForTreeLevel(contentLevel, subtreeMinTreeIndicesForLevel, subtreeMaxTreeIndicesForLevel);
                // if any of the min from indices finder for the level are greater than any of the max you can break (sphere ranges get smaller as you go down levels)
                // vice versa for max vs min
                var minTraversalIndicesForLevel = minIndices[contentLevel];
                var maxTraversalIndicesForLevel = maxIndices[contentLevel];

                if (subtreeMaxTreeIndicesForLevel.x < minTraversalIndicesForLevel.x ||
                    subtreeMaxTreeIndicesForLevel.y < minTraversalIndicesForLevel.y ||
                    subtreeMaxTreeIndicesForLevel.z < minTraversalIndicesForLevel.z ||
                    subtreeMinTreeIndicesForLevel.x > maxTraversalIndicesForLevel.x ||
                    subtreeMinTreeIndicesForLevel.y > maxTraversalIndicesForLevel.y ||
                    subtreeMinTreeIndicesForLevel.z > maxTraversalIndicesForLevel.z) {
                    continue;
                }

                // Using traditional visbility and distance
                // additiveTileChecks_visAndDist(tileset, subtree, contentLevel, distanceForLevel, frameState);
                additiveTileChecks(tileset, subtree, subtreeMinTreeIndicesForLevel, subtreeMaxTreeIndicesForLevel, contentLevel, levelEllipsoid, frameState);
            } // for i
        } // for contentLevel
    }

    function replacementTraversal(tileset, frameState) {
        // Must request all content roots for REPLACE refinement, so it's slightly different than the main loop
        // Access through the tileset's subtreeInfo database, add accessor functions for pulling all subtrees for a given level
        // You then loop over all tiles on the subtree level that we care about.
        // 1. call updateTile, if not vis continue to next tile, otherwise call loadTile
        // Just make the requests, let priority handle the ordering / shoving onto requeset queue
        // Selection is what cares about blocked indices, loading does not

        var indicesFinder = tileset._indicesFinder;
        var contentStartLevel = indicesFinder._startLevel;
        var lastContentLevelToCheck = indicesFinder._maximumTraversalLevel - 1;

        var contentRootAccessible = contentStartLevel - 1 <= lastContentLevelToCheck;
        if (!contentRootAccessible) {
            return;
        }

        var onlyContentRootTiles = lastContentLevelToCheck < contentStartLevel;
        var lodDistances = indicesFinder._lodDistances;
        var tilesetRoot = tileset.root;
        var distanceForLevel = lodDistances[contentStartLevel];

        var children = tilesetRoot.children;
        var childrenLength = children.length;
        var child;
        var i;
        for (i = 0; i < childrenLength; ++i) {
            child = children[i];
            updateVisibility(tileset, child, frameState);
            if (!isVisible(child) || child._distanceToCamera > distanceForLevel) {
                continue;
            }

            loadTile(tileset, child, frameState);
            visitTile(tileset, child, frameState);
            touchTile(tileset, child, frameState);
            if (onlyContentRootTiles) {
                selectDesiredTile(tileset, child, frameState);
            }
        }

        // This is possible for the replacement case since lastContentLevelToCheck is defined in terms of
        // the last parent level to check, which could be the contentless tileset root.
        if (onlyContentRootTiles) {
            return;
        }

        var minIndices = indicesFinder._minIndices;
        var maxIndices = indicesFinder._maxIndices;
        var allSubtrees = tileset._subtreeInfo.subtreesInRange(contentStartLevel, lastContentLevelToCheck/* , minIndices, maxIndices */);
        if (allSubtrees.length === 0) {
            // None available yet
            return;
        }

        indicesFinder.determineRadEffectivePerPlanePerLevel(frameState.cullingVolume.planes);
        var finalRefinementIndices = [];
        for (var contentLevel = contentStartLevel; contentLevel <= lastContentLevelToCheck; contentLevel++) {
            var subtreesForThisLevel = SubtreeInfo.subtreesContainingLevel(allSubtrees, contentLevel, contentStartLevel);

            var length = subtreesForThisLevel.length;
            if (length === 0) {
                // None available yet
                break;
            }

            var levelEllipsoid = indicesFinder.updateLevelEllipsoidDynamic(contentLevel, frameState.cullingVolume.planes);

            for (i = 0; i < length; i++) {
                var subtree = subtreesForThisLevel[i];

                subtree.treeIndexRangeForTreeLevel(contentLevel, subtreeMinTreeIndicesForLevel, subtreeMaxTreeIndicesForLevel);
                // if any of the min from indices finder for the level are greater than any of the max you can break (sphere ranges get smaller as you go down levels)
                // vice versa for max vs min
                var minTraversalIndicesForLevel = minIndices[contentLevel];
                var maxTraversalIndicesForLevel = maxIndices[contentLevel];

                if (subtreeMaxTreeIndicesForLevel.x < minTraversalIndicesForLevel.x ||
                    subtreeMaxTreeIndicesForLevel.y < minTraversalIndicesForLevel.y ||
                    subtreeMaxTreeIndicesForLevel.z < minTraversalIndicesForLevel.z ||
                    subtreeMinTreeIndicesForLevel.x > maxTraversalIndicesForLevel.x ||
                    subtreeMinTreeIndicesForLevel.y > maxTraversalIndicesForLevel.y ||
                    subtreeMinTreeIndicesForLevel.z > maxTraversalIndicesForLevel.z) {
                    continue;
                }

                // Using traditional visbility and distance
                replacementTileChecks_visAndDist(tileset, subtree, contentLevel, finalRefinementIndices, frameState);
            } // for i
        } // for contentLevel
    }

    function replacementTraversal2(tileset, frameState) {
        // Must request all content roots for REPLACE refinement, so it's slightly different than the main loop
        // Access through the tileset's subtreeInfo database, add accessor functions for pulling all subtrees for a given level
        // You then loop over all tiles on the subtree level that we care about.
        // 1. call updateTile, if not vis continue to next tile, otherwise call loadTile
        // Just make the requests, let priority handle the ordering / shoving onto requeset queue
        // Selection is what cares about blocked indices, loading does not

        var indicesFinder = tileset._indicesFinder;
        var contentStartLevel = indicesFinder._startLevel;
        var maxTraversalLevel = indicesFinder._maximumTraversalLevel;

        if (maxTraversalLevel < contentStartLevel) {
            return;
        }

        var i;
        var minIndices = indicesFinder._minIndices;
        var maxIndices = indicesFinder._maxIndices;
        var allSubtrees = tileset._subtreeInfo.subtreesInRange(contentStartLevel, maxTraversalLevel/* , minIndices, maxIndices */);
        if (allSubtrees.length === 0) {
            // None available yet
            return;
        }

        indicesFinder.determineRadEffectivePerPlanePerLevel(frameState.cullingVolume.planes);
        var finalRefinementIndices = [];
        for (var contentLevel = contentStartLevel; contentLevel <= maxTraversalLevel; contentLevel++) {
            var subtreesForThisLevel = SubtreeInfo.subtreesContainingLevel(allSubtrees, contentLevel, contentStartLevel);

            var length = subtreesForThisLevel.length;
            if (length === 0) {
                // None available yet
                break;
            }

            indicesFinder.updateLevelEllipsoidDynamic(contentLevel, frameState.cullingVolume.planes);

            for (i = 0; i < length; i++) {
                var subtree = subtreesForThisLevel[i];

                subtree.treeIndexRangeForTreeLevel(contentLevel, subtreeMinTreeIndicesForLevel, subtreeMaxTreeIndicesForLevel);
                // if any of the min from indices finder for the level are greater than any of the max you can break (sphere ranges get smaller as you go down levels)
                // vice versa for max vs min
                var minTraversalIndicesForLevel = minIndices[contentLevel];
                var maxTraversalIndicesForLevel = maxIndices[contentLevel];

                if (subtreeMaxTreeIndicesForLevel.x < minTraversalIndicesForLevel.x ||
                    subtreeMaxTreeIndicesForLevel.y < minTraversalIndicesForLevel.y ||
                    subtreeMaxTreeIndicesForLevel.z < minTraversalIndicesForLevel.z ||
                    subtreeMinTreeIndicesForLevel.x > maxTraversalIndicesForLevel.x ||
                    subtreeMinTreeIndicesForLevel.y > maxTraversalIndicesForLevel.y ||
                    subtreeMinTreeIndicesForLevel.z > maxTraversalIndicesForLevel.z) {
                    continue;
                }

                // Using traditional visbility and distance
                replacementTileChecks(tileset, subtree, subtreeMinTreeIndicesForLevel, subtreeMaxTreeIndicesForLevel, contentLevel, indicesFinder, finalRefinementIndices, frameState);
            } // for i
        } // for contentLevel
    }

    function replacementTileChecks(
        tileset,
        subtree,
        subtreeMinTreeIndicesForLevel,
        subtreeMaxTreeIndicesForLevel,
        contentLevel,
        indicesFinder,
        finalRefinementIndices,
        frameState) {

        // NOTE: A sibling is in the same subtree.
        var levelEllipsoid = indicesFinder._levelEllipsoid;
        var i, j, tile, xRowRange;
        var levelEllipsoidLength = levelEllipsoid.length;
        var lodDistances = indicesFinder._lodDistances;
        var distanceForLevel = lodDistances[contentLevel + 1];
        var tiles = subtree._tiles;
        var subtreeLevelDim = subtreeMaxTreeIndicesForLevel.x - subtreeMinTreeIndicesForLevel.x + 1;
        var startLevel = indicesFinder._startLevel;
        var isStartLevel = contentLevel === startLevel;
        var maxTraversalLevel = indicesFinder._maximumTraversalLevel;
        var isLastLevel = contentLevel === maxTraversalLevel;
        // only make requests/selects on a skipLevel, unless the tree stops early on the level.
        var skipLength = tileset._skipLength;
        var isSkipLevel = isStartLevel || isLastLevel || (((contentLevel - startLevel) % skipLength) === 0);
        var previousLevelIsSkipLevel = contentLevel - 1 >= startLevel && (((contentLevel - 1 - startLevel) % skipLength) === 0);
        for (i = 0; i < levelEllipsoidLength; i++) {
            xRowRange = levelEllipsoid.get(i);
            if (xRowRange.x < subtreeMinTreeIndicesForLevel.x ||
                xRowRange.w > subtreeMaxTreeIndicesForLevel.x ||
                xRowRange.y < subtreeMinTreeIndicesForLevel.y ||
                xRowRange.y > subtreeMaxTreeIndicesForLevel.y ||
                xRowRange.z < subtreeMinTreeIndicesForLevel.z ||
                xRowRange.z > subtreeMaxTreeIndicesForLevel.z) {
                continue;
            }

            // Clamp the xRowRange start and end to the subtrees indices for level
            var xStart = Math.max(subtreeMinTreeIndicesForLevel.x, xRowRange.w);
            var xEnd = Math.min(subtreeMaxTreeIndicesForLevel.x, xRowRange.x);

            // Find the begin and end in the tiles array for this x row stretch
            var indexRange = subtree.arrayIndexRangeForLevel(contentLevel);
            var offset = indexRange.begin;

            var relXInSubtreeLevelGrid = xStart      - subtreeMinTreeIndicesForLevel.x;
            var relYInSubtreeLevelGrid = xRowRange.y - subtreeMinTreeIndicesForLevel.y;
            var relZInSubtreeLevelGrid = xRowRange.z - subtreeMinTreeIndicesForLevel.z;
            var begin = offset + relZInSubtreeLevelGrid*subtreeLevelDim*subtreeLevelDim + relYInSubtreeLevelGrid*subtreeLevelDim + relXInSubtreeLevelGrid;
            var end = begin + xEnd - xStart;
            var parent, parentDefined;
            var subtreeLevel = contentLevel - subtree._subtreeRootKey.w;

            for (j = begin; j <= end; j++) {
                tile = tiles[j];

                if (!defined(tile)) {
                    continue;
                }

                parent = tile.parent;
                parentDefined = defined(parent);

                // updateVisibility2(tileset, tile, frameState);
                updateVisibility(tileset, tile, frameState);
                if (!isVisible(tile)) {
                    // Only load non-vis if parent vis
                    // In addtion, need to request if on a skipLevel or a sibling stops early
                    if (parentDefined && isVisible(parent) && (isSkipLevel || visibleSiblingStopped(tileset, parent, frameState))) {
                        loadTile(tileset, tile, frameState);
                        visitTile(tileset, tile, frameState);
                        touchTile(tileset, tile, frameState);
                    }
                    continue;
                }

                if (isSkipLevel) {
                    loadTile(tileset, tile, frameState);
                    visitTile(tileset, tile, frameState);
                    touchTile(tileset, tile, frameState);
                }

                var siblings = tile.parent.children;
                var siblingsLength = siblings.length;
                var k, sibling;
                var visibleSiblingsReady = siblingsLength > 0;
                if (siblingsLength > 0)  {
                    for (k = 0; k < siblingsLength; k++) {
                        sibling = siblings[k];
                        updateVisibility(tileset, sibling, frameState);
                        if (isVisible(sibling) && !sibling.contentAvailable) {
                            visibleSiblingsReady = false;
                        }
                    }
                }

                // notInBlockedRefinementRegion could also return true if skipLength > 1 && ancestorWithContentAvailable
                if (skipLength > 0 || !inBlockedRefinementRegion(finalRefinementIndices, tile.treeKey)) {
                    if (isLastLevel) {
                        if (isStartLevel) {
                            selectDesiredTile(tileset, tile, frameState);
                        } else {
                            if (visibleSiblingsReady) {
                                selectVisibleChildren(tileset, parent, frameState);
                            } else if (previousLevelIsSkipLevel) {
                                // Actually, this is an 'else' and it needs to select ancestor.
                                selectDesiredTile(tileset, parent, frameState);
                            }
                            if (skipLength === 1) { finalRefinementIndices.push(parent.treeKey); }
                        }
                    } else if (!isStartLevel) {
                        if (tile.contentAvailable && (tile._distanceToCamera > distanceForLevel || tile.children.length === 0)) {
                            selectDesiredTile(tileset, tile, frameState);
                            if (skipLength === 1) { finalRefinementIndices.push(tile.treeKey); }
                        } else if (!tile.contentAvailable && parentDefined && previousLevelIsSkipLevel) {
                            selectDesiredTile(tileset, parent, frameState);
                            if (skipLevel === 1) { finalRefinementIndices.push(parent.treeKey); }
                        }
                    }
                }

            } // j
        } // i
    }

    function visibleSiblingStopped(tileset, parent, frameState) {
        var siblings = parent.children;
        var siblingsLength = siblings.length;
        var k, sibling;
        for (k = 0; k < siblingsLength; k++) {
            sibling = siblings[k];
            updateVisibility(tileset, sibling, frameState);
            if (isVisible(sibling) && sibling.children.length === 0) {
                return true;
            }
        }
        return false;
    }

    function replacementTileChecks_visAndDist(tileset, subtree, contentLevel, finalRefinementIndices, frameState) {
        var indicesFinder = tileset._indicesFinder;
        var lodDistances = indicesFinder._lodDistances;
        var distanceForParent = lodDistances[contentLevel];
        var distanceForLevel = lodDistances[contentLevel + 1];
        var contentStartLevel = indicesFinder._startLevel;
        var lastContentLevelToCheck = indicesFinder._maximumTraversalLevel - 1;

        var tiles = subtree._tiles;
        var indexRange = subtree.arrayIndexRangeForLevel(contentLevel);
        var begin = indexRange.begin;
        var end = indexRange.end;
        var j, k, tile, child, children, childrenLength;
        var notInBlockedRefinementRegion, visibleChildrenReady;
        for (j = begin; j < end; j++) {
            tile = tiles[j];

            if (!defined(tile)) {
                continue;
            }

            updateVisibility(tileset, tile, frameState);
            if (!isVisible(tile))  {
                continue;
            }

            notInBlockedRefinementRegion = !inBlockedRefinementRegion(finalRefinementIndices, tile.treeKey);
            tile.notInBlockedRefinementRegion = notInBlockedRefinementRegion;
            if (tile._distanceToCamera > distanceForLevel) {
                if ((tile.parent._distanceToCamera <= distanceForParent) &&
                    contentLevel !== contentStartLevel &&
                    notInBlockedRefinementRegion) {
                    // TODO: This might be ok to call load vist touch select and
                    // get rid of the content level check and root content loop above
                    selectDesiredTile(tileset, tile, frameState);
                    finalRefinementIndices.push(tile.treeKey);
                }
                continue;
            }

            // Replacement is child based
            children = tile.children;
            childrenLength = children.length;
            visibleChildrenReady = childrenLength > 0 ? true : false;
            for (k = 0; k < childrenLength; ++k) {
                child = children[k];

                if (notInBlockedRefinementRegion) {
                    updateVisibility(tileset, child, frameState);
                    if (isVisible(child) && (!child.contentAvailable && !child.hasEmptyContent)) {
                        visibleChildrenReady = false;
                    }
                }

                loadTile(tileset, child, frameState);
                visitTile(tileset, child, frameState);
                touchTile(tileset, child, frameState);
            } // for k

            if (notInBlockedRefinementRegion) {
                if (!visibleChildrenReady) {
                    selectDesiredTile(tileset, tile, frameState);
                    finalRefinementIndices.push(tile.treeKey);
                } else if (contentLevel === lastContentLevelToCheck) {
                    // can only call this on children that pass their
                    // parents radius check but fail their own (or are
                    // on the last level)
                    selectVisibleChildren(tileset, tile, frameState);
                }
            }
        } // for j
    }

    function inBlockedRefinementRegion(keys, treeKey) {
        var length = keys.length;
        for (var i = 0; i < length; i++) {
            var key = keys[i];
            // Traversal is level by level so we can early return
            if (key.w >= treeKey.w) {
                return false;
            } else if (SubtreeInfo.isDescendant(key, treeKey)) {
                return true;
            }
        }
        return false;
    }

    function selectVisibleChildren(tileset, tile, frameState) {
        // Replacement is child based
        var children = tile.children;
        var childrenLength = children.length;
        for (var k = 0; k < childrenLength; ++k) {
            selectDesiredTile(tileset, children[k], frameState);
        }
    }

    return Cesium3DTilesetTraversalImplicit;
});
