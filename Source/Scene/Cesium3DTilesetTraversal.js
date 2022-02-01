import defined from "../Core/defined.js";
import Intersect from "../Core/Intersect.js";
import ManagedArray from "../Core/ManagedArray.js";
import Cesium3DTileOptimizationHint from "./Cesium3DTileOptimizationHint.js";
import Cesium3DTileRefine from "./Cesium3DTileRefine.js";

/**
 * @private
 */
function Cesium3DTilesetTraversal() {}

function isVisible(tile) {
  return tile._visible && tile._inRequestVolume;
}

const traversal = {
  stack: new ManagedArray(),
  stackMaximumLength: 0,
};

const emptyTraversal = {
  stack: new ManagedArray(),
  stackMaximumLength: 0,
};

const descendantTraversal = {
  stack: new ManagedArray(),
  stackMaximumLength: 0,
};

const selectionTraversal = {
  stack: new ManagedArray(),
  stackMaximumLength: 0,
  ancestorStack: new ManagedArray(),
  ancestorStackMaximumLength: 0,
};

const descendantSelectionDepth = 2;

Cesium3DTilesetTraversal.selectTiles = function (tileset, frameState) {
  tileset._requestedTiles.length = 0;

  if (tileset.debugFreezeFrame) {
    return;
  }

  tileset._selectedTiles.length = 0;
  tileset._selectedTilesToStyle.length = 0;
  tileset._emptyTiles.length = 0;
  tileset._hasMixedContent = false;

  const root = tileset.root;
  updateTile(tileset, root, frameState);

  // The root tile is not visible
  if (!isVisible(root)) {
    return;
  }

  // The tileset doesn't meet the SSE requirement, therefore the tree does not need to be rendered
  if (
    root.getScreenSpaceError(frameState, true) <=
    tileset._maximumScreenSpaceError
  ) {
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
  selectionTraversal.ancestorStack.trim(
    selectionTraversal.ancestorStackMaximumLength
  );

  // Update the priority for any requests found during traversal
  // Update after traversal so that min and max values can be used to normalize priority values
  const requestedTiles = tileset._requestedTiles;
  const length = requestedTiles.length;
  for (let i = 0; i < length; ++i) {
    requestedTiles[i].updatePriority();
  }
};

function executeBaseTraversal(tileset, root, frameState) {
  const baseScreenSpaceError = tileset._maximumScreenSpaceError;
  const maximumScreenSpaceError = tileset._maximumScreenSpaceError;
  executeTraversal(
    tileset,
    root,
    baseScreenSpaceError,
    maximumScreenSpaceError,
    frameState
  );
}

function executeSkipTraversal(tileset, root, frameState) {
  const baseScreenSpaceError = Number.MAX_VALUE;
  const maximumScreenSpaceError = tileset._maximumScreenSpaceError;
  executeTraversal(
    tileset,
    root,
    baseScreenSpaceError,
    maximumScreenSpaceError,
    frameState
  );
  traverseAndSelect(tileset, root, frameState);
}

function executeBaseAndSkipTraversal(tileset, root, frameState) {
  const baseScreenSpaceError = Math.max(
    tileset.baseScreenSpaceError,
    tileset.maximumScreenSpaceError
  );
  const maximumScreenSpaceError = tileset.maximumScreenSpaceError;
  executeTraversal(
    tileset,
    root,
    baseScreenSpaceError,
    maximumScreenSpaceError,
    frameState
  );
  traverseAndSelect(tileset, root, frameState);
}

function skipLevelOfDetail(tileset) {
  return tileset._skipLevelOfDetail;
}

function addEmptyTile(tileset, tile) {
  tileset._emptyTiles.push(tile);
}

function selectTile(tileset, tile, frameState) {
  if (tile.contentVisibility(frameState) !== Intersect.OUTSIDE) {
    const tileContent = tile.content;
    if (tileContent.featurePropertiesDirty) {
      // A feature's property in this tile changed, the tile needs to be re-styled.
      tileContent.featurePropertiesDirty = false;
      tile.lastStyleTime = 0; // Force applying the style to this tile
      tileset._selectedTilesToStyle.push(tile);
    } else if (tile._selectedFrame < frameState.frameNumber - 1) {
      // Tile is newly selected; it is selected this frame, but was not selected last frame.
      tileset._selectedTilesToStyle.push(tile);
    }
    tile._selectedFrame = frameState.frameNumber;
    tileset._selectedTiles.push(tile);
  }
}

function selectDescendants(tileset, root, frameState) {
  const stack = descendantTraversal.stack;
  stack.push(root);
  while (stack.length > 0) {
    descendantTraversal.stackMaximumLength = Math.max(
      descendantTraversal.stackMaximumLength,
      stack.length
    );
    const tile = stack.pop();
    const children = tile.children;
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; ++i) {
      const child = children[i];
      if (isVisible(child)) {
        if (child.contentAvailable) {
          updateTile(tileset, child, frameState);
          touchTile(tileset, child, frameState);
          selectTile(tileset, child, frameState);
        } else if (child._depth - root._depth < descendantSelectionDepth) {
          // Continue traversing, but not too far
          stack.push(child);
        }
      }
    }
  }
}

function selectDesiredTile(tileset, tile, frameState) {
  if (!skipLevelOfDetail(tileset)) {
    if (tile.contentAvailable) {
      // The tile can be selected right away and does not require traverseAndSelect
      selectTile(tileset, tile, frameState);
    }
    return;
  }

  // If this tile is not loaded attempt to select its ancestor instead
  const loadedTile = tile.contentAvailable
    ? tile
    : tile._ancestorWithContentAvailable;
  if (defined(loadedTile)) {
    // Tiles will actually be selected in traverseAndSelect
    loadedTile._shouldSelect = true;
  } else {
    // If no ancestors are ready traverse down and select tiles to minimize empty regions.
    // This happens often for immediatelyLoadDesiredLevelOfDetail where parent tiles are not necessarily loaded before zooming out.
    selectDescendants(tileset, tile, frameState);
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

function updateMinimumMaximumPriority(tileset, tile) {
  tileset._maximumPriority.distance = Math.max(
    tile._priorityHolder._distanceToCamera,
    tileset._maximumPriority.distance
  );
  tileset._minimumPriority.distance = Math.min(
    tile._priorityHolder._distanceToCamera,
    tileset._minimumPriority.distance
  );
  tileset._maximumPriority.depth = Math.max(
    tile._depth,
    tileset._maximumPriority.depth
  );
  tileset._minimumPriority.depth = Math.min(
    tile._depth,
    tileset._minimumPriority.depth
  );
  tileset._maximumPriority.foveatedFactor = Math.max(
    tile._priorityHolder._foveatedFactor,
    tileset._maximumPriority.foveatedFactor
  );
  tileset._minimumPriority.foveatedFactor = Math.min(
    tile._priorityHolder._foveatedFactor,
    tileset._minimumPriority.foveatedFactor
  );
  tileset._maximumPriority.reverseScreenSpaceError = Math.max(
    tile._priorityReverseScreenSpaceError,
    tileset._maximumPriority.reverseScreenSpaceError
  );
  tileset._minimumPriority.reverseScreenSpaceError = Math.min(
    tile._priorityReverseScreenSpaceError,
    tileset._minimumPriority.reverseScreenSpaceError
  );
}

function isOnScreenLongEnough(tileset, tile, frameState) {
  // Prevent unnecessary loads while camera is moving by getting the ratio of travel distance to tile size.
  if (!tileset._cullRequestsWhileMoving) {
    return true;
  }

  const sphere = tile.boundingSphere;
  const diameter = Math.max(sphere.radius * 2.0, 1.0);

  const camera = frameState.camera;
  const deltaMagnitude =
    camera.positionWCDeltaMagnitude !== 0.0
      ? camera.positionWCDeltaMagnitude
      : camera.positionWCDeltaMagnitudeLastFrame;
  const movementRatio =
    (tileset.cullRequestsWhileMovingMultiplier * deltaMagnitude) / diameter; // How do n frames of this movement compare to the tile's physical size.
  return movementRatio < 1.0;
}

function loadTile(tileset, tile, frameState) {
  if (
    tile._requestedFrame === frameState.frameNumber ||
    (!hasUnloadedContent(tile) && !tile.contentExpired)
  ) {
    return;
  }

  if (!isOnScreenLongEnough(tileset, tile, frameState)) {
    return;
  }

  const cameraHasNotStoppedMovingLongEnough =
    frameState.camera.timeSinceMoved < tileset.foveatedTimeDelay;
  if (tile.priorityDeferred && cameraHasNotStoppedMovingLongEnough) {
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

function anyChildrenVisible(tileset, tile, frameState) {
  let anyVisible = false;
  const children = tile.children;
  const length = children.length;
  for (let i = 0; i < length; ++i) {
    const child = children[i];
    updateVisibility(tileset, child, frameState);
    anyVisible = anyVisible || isVisible(child);
  }
  return anyVisible;
}

function meetsScreenSpaceErrorEarly(tileset, tile, frameState) {
  const parent = tile.parent;
  if (
    !defined(parent) ||
    parent.hasTilesetContent ||
    parent.hasImplicitContent ||
    parent.refine !== Cesium3DTileRefine.ADD
  ) {
    return false;
  }

  // Use parent's geometric error with child's box to see if the tile already meet the SSE
  return (
    tile.getScreenSpaceError(frameState, true) <=
    tileset._maximumScreenSpaceError
  );
}

function updateTileVisibility(tileset, tile, frameState) {
  updateVisibility(tileset, tile, frameState);

  if (!isVisible(tile)) {
    return;
  }

  const hasChildren = tile.children.length > 0;
  if ((tile.hasTilesetContent || tile.hasImplicitContent) && hasChildren) {
    // Use the root tile's visibility instead of this tile's visibility.
    // The root tile may be culled by the children bounds optimization in which
    // case this tile should also be culled.
    const child = tile.children[0];
    updateTileVisibility(tileset, child, frameState);
    tile._visible = child._visible;
    return;
  }

  if (meetsScreenSpaceErrorEarly(tileset, tile, frameState)) {
    tile._visible = false;
    return;
  }

  // Optimization - if none of the tile's children are visible then this tile isn't visible
  const replace = tile.refine === Cesium3DTileRefine.REPLACE;
  const useOptimization =
    tile._optimChildrenWithinParent ===
    Cesium3DTileOptimizationHint.USE_OPTIMIZATION;
  if (replace && useOptimization && hasChildren) {
    if (!anyChildrenVisible(tileset, tile, frameState)) {
      ++tileset._statistics.numberOfTilesCulledWithChildrenUnion;
      tile._visible = false;
      return;
    }
  }
}

function updateTile(tileset, tile, frameState) {
  // Reset some of the tile's flags and re-evaluate visibility
  updateTileVisibility(tileset, tile, frameState);
  tile.updateExpiration();

  // Request priority
  tile._wasMinPriorityChild = false;
  tile._priorityHolder = tile;
  updateMinimumMaximumPriority(tileset, tile);

  // SkipLOD
  tile._shouldSelect = false;
  tile._finalResolution = true;
}

function updateTileAncestorContentLinks(tile, frameState) {
  tile._ancestorWithContent = undefined;
  tile._ancestorWithContentAvailable = undefined;

  const parent = tile.parent;
  if (defined(parent)) {
    // ancestorWithContent is an ancestor that has content or has the potential to have
    // content. Used in conjunction with tileset.skipLevels to know when to skip a tile.
    // ancestorWithContentAvailable is an ancestor that is rendered if a desired tile is not loaded.
    const hasContent =
      !hasUnloadedContent(parent) ||
      parent._requestedFrame === frameState.frameNumber;
    tile._ancestorWithContent = hasContent
      ? parent
      : parent._ancestorWithContent;
    tile._ancestorWithContentAvailable = parent.contentAvailable
      ? parent
      : parent._ancestorWithContentAvailable; // Links a descendant up to its contentAvailable ancestor as the traversal progresses.
  }
}

function hasEmptyContent(tile) {
  return (
    tile.hasEmptyContent || tile.hasTilesetContent || tile.hasImplicitContent
  );
}

function hasUnloadedContent(tile) {
  return !hasEmptyContent(tile) && tile.contentUnloaded;
}

function reachedSkippingThreshold(tileset, tile) {
  const ancestor = tile._ancestorWithContent;
  return (
    !tileset.immediatelyLoadDesiredLevelOfDetail &&
    (tile._priorityProgressiveResolutionScreenSpaceErrorLeaf ||
      (defined(ancestor) &&
        tile._screenSpaceError <
          ancestor._screenSpaceError / tileset.skipScreenSpaceErrorFactor &&
        tile._depth > ancestor._depth + tileset.skipLevels))
  );
}

function sortChildrenByDistanceToCamera(a, b) {
  // Sort by farthest child first since this is going on a stack
  if (b._distanceToCamera === 0 && a._distanceToCamera === 0) {
    return b._centerZDepth - a._centerZDepth;
  }

  return b._distanceToCamera - a._distanceToCamera;
}

function updateAndPushChildren(tileset, tile, stack, frameState) {
  let i;
  const replace = tile.refine === Cesium3DTileRefine.REPLACE;
  const children = tile.children;
  const length = children.length;

  for (i = 0; i < length; ++i) {
    updateTile(tileset, children[i], frameState);
  }

  // Sort by distance to take advantage of early Z and reduce artifacts for skipLevelOfDetail
  children.sort(sortChildrenByDistanceToCamera);

  // For traditional replacement refinement only refine if all children are loaded.
  // Empty tiles are exempt since it looks better if children stream in as they are loaded to fill the empty space.
  const checkRefines =
    !skipLevelOfDetail(tileset) && replace && !hasEmptyContent(tile);
  let refines = true;

  let anyChildrenVisible = false;

  // Determining min child
  let minIndex = -1;
  let minimumPriority = Number.MAX_VALUE;

  let child;
  for (i = 0; i < length; ++i) {
    child = children[i];
    if (isVisible(child)) {
      stack.push(child);
      if (child._foveatedFactor < minimumPriority) {
        minIndex = i;
        minimumPriority = child._foveatedFactor;
      }
      anyChildrenVisible = true;
    } else if (checkRefines || tileset.loadSiblings) {
      // Keep non-visible children loaded since they are still needed before the parent can refine.
      // Or loadSiblings is true so always load tiles regardless of visibility.
      if (child._foveatedFactor < minimumPriority) {
        minIndex = i;
        minimumPriority = child._foveatedFactor;
      }
      loadTile(tileset, child, frameState);
      touchTile(tileset, child, frameState);
    }
    if (checkRefines) {
      let childRefines;
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

  if (!anyChildrenVisible) {
    refines = false;
  }

  if (minIndex !== -1 && !skipLevelOfDetail(tileset) && replace) {
    // An ancestor will hold the _foveatedFactor and _distanceToCamera for descendants between itself and its highest priority descendant. Siblings of a min children along the way use this ancestor as their priority holder as well.
    // Priority of all tiles that refer to the _foveatedFactor and _distanceToCamera stored in the common ancestor will be differentiated based on their _depth.
    const minPriorityChild = children[minIndex];
    minPriorityChild._wasMinPriorityChild = true;
    const priorityHolder =
      (tile._wasMinPriorityChild || tile === tileset.root) &&
      minimumPriority <= tile._priorityHolder._foveatedFactor
        ? tile._priorityHolder
        : tile; // This is where priority dependency chains are wired up or started anew.
    priorityHolder._foveatedFactor = Math.min(
      minPriorityChild._foveatedFactor,
      priorityHolder._foveatedFactor
    );
    priorityHolder._distanceToCamera = Math.min(
      minPriorityChild._distanceToCamera,
      priorityHolder._distanceToCamera
    );

    for (i = 0; i < length; ++i) {
      child = children[i];
      child._priorityHolder = priorityHolder;
    }
  }

  return refines;
}

function inBaseTraversal(tileset, tile, baseScreenSpaceError) {
  if (!skipLevelOfDetail(tileset)) {
    return true;
  }
  if (tileset.immediatelyLoadDesiredLevelOfDetail) {
    return false;
  }
  if (!defined(tile._ancestorWithContent)) {
    // Include root or near-root tiles in the base traversal so there is something to select up to
    return true;
  }
  if (tile._screenSpaceError === 0.0) {
    // If a leaf, use parent's SSE
    return tile.parent._screenSpaceError > baseScreenSpaceError;
  }
  return tile._screenSpaceError > baseScreenSpaceError;
}

function canTraverse(tileset, tile) {
  if (tile.children.length === 0) {
    return false;
  }
  if (tile.hasTilesetContent || tile.hasImplicitContent) {
    // Traverse external tileset to visit its root tile
    // Don't traverse if the subtree is expired because it will be destroyed
    return !tile.contentExpired;
  }
  return tile._screenSpaceError > tileset._maximumScreenSpaceError;
}

function executeTraversal(
  tileset,
  root,
  baseScreenSpaceError,
  maximumScreenSpaceError,
  frameState
) {
  // Depth-first traversal that traverses all visible tiles and marks tiles for selection.
  // If skipLevelOfDetail is off then a tile does not refine until all children are loaded.
  // This is the traditional replacement refinement approach and is called the base traversal.
  // Tiles that have a greater screen space error than the base screen space error are part of the base traversal,
  // all other tiles are part of the skip traversal. The skip traversal allows for skipping levels of the tree
  // and rendering children and parent tiles simultaneously.
  const stack = traversal.stack;
  stack.push(root);

  while (stack.length > 0) {
    traversal.stackMaximumLength = Math.max(
      traversal.stackMaximumLength,
      stack.length
    );

    const tile = stack.pop();

    updateTileAncestorContentLinks(tile, frameState);
    const baseTraversal = inBaseTraversal(tileset, tile, baseScreenSpaceError);
    const add = tile.refine === Cesium3DTileRefine.ADD;
    const replace = tile.refine === Cesium3DTileRefine.REPLACE;
    const parent = tile.parent;
    const parentRefines = !defined(parent) || parent._refines;
    let refines = false;

    if (canTraverse(tileset, tile)) {
      refines =
        updateAndPushChildren(tileset, tile, stack, frameState) &&
        parentRefines;
    }

    const stoppedRefining = !refines && parentRefines;

    if (hasEmptyContent(tile)) {
      // Add empty tile just to show its debug bounding volume
      // If the tile has tileset content load the external tileset
      // If the tile cannot refine further select its nearest loaded ancestor
      addEmptyTile(tileset, tile, frameState);
      loadTile(tileset, tile, frameState);
      if (stoppedRefining) {
        selectDesiredTile(tileset, tile, frameState);
      }
    } else if (add) {
      // Additive tiles are always loaded and selected
      selectDesiredTile(tileset, tile, frameState);
      loadTile(tileset, tile, frameState);
    } else if (replace) {
      if (baseTraversal) {
        // Always load tiles in the base traversal
        // Select tiles that can't refine further
        loadTile(tileset, tile, frameState);
        if (stoppedRefining) {
          selectDesiredTile(tileset, tile, frameState);
        }
      } else if (stoppedRefining) {
        // In skip traversal, load and select tiles that can't refine further
        selectDesiredTile(tileset, tile, frameState);
        loadTile(tileset, tile, frameState);
      } else if (reachedSkippingThreshold(tileset, tile)) {
        // In skip traversal, load tiles that aren't skipped. In practice roughly half the tiles stay unloaded.
        loadTile(tileset, tile, frameState);
      }
    }

    visitTile(tileset, tile, frameState);
    touchTile(tileset, tile, frameState);
    tile._refines = refines;
  }
}

function executeEmptyTraversal(tileset, root, frameState) {
  // Depth-first traversal that checks if all nearest descendants with content are loaded. Ignores visibility.
  let allDescendantsLoaded = true;
  const stack = emptyTraversal.stack;
  stack.push(root);

  while (stack.length > 0) {
    emptyTraversal.stackMaximumLength = Math.max(
      emptyTraversal.stackMaximumLength,
      stack.length
    );

    const tile = stack.pop();
    const children = tile.children;
    const childrenLength = children.length;

    // Only traverse if the tile is empty - traversal stop at descendants with content
    const emptyContent = hasEmptyContent(tile);
    const traverse = emptyContent && canTraverse(tileset, tile);
    const emptyLeaf = emptyContent && tile.children.length === 0;

    // Traversal stops but the tile does not have content yet
    // There will be holes if the parent tries to refine to its children, so don't refine
    // One exception: a parent may refine even if one of its descendants is an empty leaf
    if (!traverse && !tile.contentAvailable && !emptyLeaf) {
      allDescendantsLoaded = false;
    }

    updateTile(tileset, tile, frameState);
    if (!isVisible(tile)) {
      // Load tiles that aren't visible since they are still needed for the parent to refine
      loadTile(tileset, tile, frameState);
      touchTile(tileset, tile, frameState);
    }

    if (traverse) {
      for (let i = 0; i < childrenLength; ++i) {
        const child = children[i];
        stack.push(child);
      }
    }
  }

  return allDescendantsLoaded;
}

/**
 * Traverse the tree and check if their selected frame is the current frame. If so, add it to a selection queue.
 * This is a preorder traversal so children tiles are selected before ancestor tiles.
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
 * NOTE: 3D Tiles uses 3 bits from the stencil buffer meaning this will not work when there is a chain of
 * selected tiles that is deeper than 7. This is not very likely.
 * @private
 */
function traverseAndSelect(tileset, root, frameState) {
  const stack = selectionTraversal.stack;
  const ancestorStack = selectionTraversal.ancestorStack;
  let lastAncestor;

  stack.push(root);

  while (stack.length > 0 || ancestorStack.length > 0) {
    selectionTraversal.stackMaximumLength = Math.max(
      selectionTraversal.stackMaximumLength,
      stack.length
    );
    selectionTraversal.ancestorStackMaximumLength = Math.max(
      selectionTraversal.ancestorStackMaximumLength,
      ancestorStack.length
    );

    if (ancestorStack.length > 0) {
      const waitingTile = ancestorStack.peek();
      if (waitingTile._stackLength === stack.length) {
        ancestorStack.pop();
        if (waitingTile !== lastAncestor) {
          waitingTile._finalResolution = false;
        }
        selectTile(tileset, waitingTile, frameState);
        continue;
      }
    }

    const tile = stack.pop();
    if (!defined(tile)) {
      // stack is empty but ancestorStack isn't
      continue;
    }

    const add = tile.refine === Cesium3DTileRefine.ADD;
    const shouldSelect = tile._shouldSelect;
    const children = tile.children;
    const childrenLength = children.length;
    const traverse = canTraverse(tileset, tile);

    if (shouldSelect) {
      if (add) {
        selectTile(tileset, tile, frameState);
      } else {
        tile._selectionDepth = ancestorStack.length;
        if (tile._selectionDepth > 0) {
          tileset._hasMixedContent = true;
        }
        lastAncestor = tile;
        if (!traverse) {
          selectTile(tileset, tile, frameState);
          continue;
        }
        ancestorStack.push(tile);
        tile._stackLength = stack.length;
      }
    }

    if (traverse) {
      for (let i = 0; i < childrenLength; ++i) {
        const child = children[i];
        if (isVisible(child)) {
          stack.push(child);
        }
      }
    }
  }
}
export default Cesium3DTilesetTraversal;
