import defined from "../Core/defined.js";
import ManagedArray from "../Core/ManagedArray.js";
import Cesium3DTileRefine from "./Cesium3DTileRefine.js";
import Cesium3DTilesetTraversal from "./Cesium3DTilesetTraversal.js";

/**
 * Depth-first traversal that traverses all visible tiles and marks tiles for selection.
 * Allows for skipping levels of the tree and rendering children and parent tiles simultaneously.
 *
 * @alias Cesium3DTilesetSkipTraversal
 * @constructor
 *
 * @private
 */
function Cesium3DTilesetSkipTraversal() {}

const traversal = {
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

/**
 * Traverses a {@link Cesium3DTileset} to determine which tiles to load and render.
 *
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 */
Cesium3DTilesetSkipTraversal.selectTiles = function (tileset, frameState) {
  tileset._requestedTiles.length = 0;

  if (tileset.debugFreezeFrame) {
    return;
  }

  tileset._selectedTiles.length = 0;
  tileset._selectedTilesToStyle.length = 0;
  tileset._emptyTiles.length = 0;
  tileset.hasMixedContent = false;

  const root = tileset.root;
  Cesium3DTilesetTraversal.updateTile(root, frameState);

  if (!root.isVisible) {
    return;
  }

  if (
    root.getScreenSpaceError(frameState, true) <=
    tileset.memoryAdjustedScreenSpaceError
  ) {
    return;
  }

  executeTraversal(root, frameState);
  traverseAndSelect(root, frameState);

  traversal.stack.trim(traversal.stackMaximumLength);
  descendantTraversal.stack.trim(descendantTraversal.stackMaximumLength);
  selectionTraversal.stack.trim(selectionTraversal.stackMaximumLength);
  selectionTraversal.ancestorStack.trim(
    selectionTraversal.ancestorStackMaximumLength,
  );

  // Update the priority for any requests found during traversal
  // Update after traversal so that min and max values can be used to normalize priority values
  const requestedTiles = tileset._requestedTiles;
  for (let i = 0; i < requestedTiles.length; ++i) {
    requestedTiles[i].updatePriority();
  }
};

/**
 * Mark descendant tiles for rendering, and update as needed
 *
 * @private
 * @param {Cesium3DTile} root
 * @param {FrameState} frameState
 */
function selectDescendants(root, frameState) {
  const { updateTile, touchTile, selectTile } = Cesium3DTilesetTraversal;
  const stack = descendantTraversal.stack;
  stack.push(root);
  while (stack.length > 0) {
    descendantTraversal.stackMaximumLength = Math.max(
      descendantTraversal.stackMaximumLength,
      stack.length,
    );
    const tile = stack.pop();
    const children = tile.children;
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      if (child.isVisible) {
        if (child.contentAvailable) {
          updateTile(child, frameState);
          touchTile(child, frameState);
          selectTile(child, frameState);
        } else if (child._depth - root._depth < descendantSelectionDepth) {
          // Continue traversing, but not too far
          stack.push(child);
        }
      }
    }
  }
}

/**
 * Mark a tile as selected if it has content available.
 * If its content is not available, and we are skipping levels of detail,
 * select an ancestor or descendant tile instead
 *
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 */
function selectDesiredTile(tile, frameState) {
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
    selectDescendants(tile, frameState);
  }
}

/**
 * Update links to the ancestor tiles that have content
 *
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 */
function updateTileAncestorContentLinks(tile, frameState) {
  tile._ancestorWithContent = undefined;
  tile._ancestorWithContentAvailable = undefined;

  const { parent } = tile;
  if (!defined(parent)) {
    return;
  }
  const parentHasContent =
    !parent.hasUnloadedRenderableContent ||
    parent._requestedFrame === frameState.frameNumber;

  // ancestorWithContent is an ancestor that has content or has the potential to have
  // content. Used in conjunction with tileset.skipLevels to know when to skip a tile.
  tile._ancestorWithContent = parentHasContent
    ? parent
    : parent._ancestorWithContent;

  // ancestorWithContentAvailable is an ancestor that is rendered if a desired tile is not loaded
  tile._ancestorWithContentAvailable = parent.contentAvailable
    ? parent
    : parent._ancestorWithContentAvailable;
}

/**
 * Determine if a tile has reached the limit of level of detail skipping.
 * If so, it should _not_ be skipped: it should be loaded and rendered
 *
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 * @returns {boolean} true if this tile should not be skipped
 */
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

/**
 * @private
 * @param {Cesium3DTile} tile
 * @param {ManagedArray} stack
 * @param {FrameState} frameState
 * @returns {boolean}
 */
function updateAndPushChildren(tile, stack, frameState) {
  const { tileset, children } = tile;
  const { updateTile, loadTile, touchTile } = Cesium3DTilesetTraversal;

  for (let i = 0; i < children.length; ++i) {
    updateTile(children[i], frameState);
  }

  // Sort by distance to take advantage of early Z and reduce artifacts
  children.sort(Cesium3DTilesetTraversal.sortChildrenByDistanceToCamera);

  let anyChildrenVisible = false;

  for (let i = 0; i < children.length; ++i) {
    const child = children[i];
    if (child.isVisible) {
      stack.push(child);
      anyChildrenVisible = true;
    } else if (tileset.loadSiblings) {
      loadTile(child, frameState);
      touchTile(child, frameState);
    }
  }

  return anyChildrenVisible;
}

/**
 * Determine if a tile is part of the base traversal.
 * If not, this tile could be considered for level of detail skipping
 *
 * @private
 * @param {Cesium3DTile} tile
 * @param {number} baseScreenSpaceError
 * @returns {boolean}
 */
function inBaseTraversal(tile, baseScreenSpaceError) {
  const { tileset } = tile;
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

/**
 * Depth-first traversal that traverses all visible tiles and marks tiles for selection.
 * Tiles that have a greater screen space error than the base screen space error are part of the base traversal,
 * all other tiles are part of the skip traversal. The skip traversal allows for skipping levels of the tree
 * and rendering children and parent tiles simultaneously.
 *
 * @private
 * @param {Cesium3DTile} root
 * @param {FrameState} frameState
 */
function executeTraversal(root, frameState) {
  const { tileset } = root;
  const baseScreenSpaceError = tileset.immediatelyLoadDesiredLevelOfDetail
    ? Number.MAX_VALUE
    : Math.max(
        tileset.baseScreenSpaceError,
        tileset.memoryAdjustedScreenSpaceError,
      );
  const { canTraverse, loadTile, visitTile, touchTile } =
    Cesium3DTilesetTraversal;
  const stack = traversal.stack;
  stack.push(root);

  while (stack.length > 0) {
    traversal.stackMaximumLength = Math.max(
      traversal.stackMaximumLength,
      stack.length,
    );

    const tile = stack.pop();

    updateTileAncestorContentLinks(tile, frameState);
    const parent = tile.parent;
    const parentRefines = !defined(parent) || parent._refines;

    tile._refines = canTraverse(tile)
      ? updateAndPushChildren(tile, stack, frameState) && parentRefines
      : false;

    const stoppedRefining = !tile._refines && parentRefines;

    if (!tile.hasRenderableContent) {
      // Add empty tile just to show its debug bounding volume
      // If the tile has tileset content load the external tileset
      // If the tile cannot refine further select its nearest loaded ancestor
      tileset._emptyTiles.push(tile);
      loadTile(tile, frameState);
      if (stoppedRefining) {
        selectDesiredTile(tile, frameState);
      }
    } else if (tile.refine === Cesium3DTileRefine.ADD) {
      // Additive tiles are always loaded and selected
      selectDesiredTile(tile, frameState);
      loadTile(tile, frameState);
    } else if (tile.refine === Cesium3DTileRefine.REPLACE) {
      if (inBaseTraversal(tile, baseScreenSpaceError)) {
        // Always load tiles in the base traversal
        // Select tiles that can't refine further
        loadTile(tile, frameState);
        if (stoppedRefining) {
          selectDesiredTile(tile, frameState);
        }
      } else if (stoppedRefining) {
        // In skip traversal, load and select tiles that can't refine further
        selectDesiredTile(tile, frameState);
        loadTile(tile, frameState);
      } else if (reachedSkippingThreshold(tileset, tile)) {
        // In skip traversal, load tiles that aren't skipped
        loadTile(tile, frameState);
      }
    }

    visitTile(tile, frameState);
    touchTile(tile, frameState);
  }
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
 *
 * @private
 * @param {Cesium3DTile} root
 * @param {FrameState} frameState
 */
function traverseAndSelect(root, frameState) {
  const { selectTile, canTraverse } = Cesium3DTilesetTraversal;
  const { stack, ancestorStack } = selectionTraversal;
  let lastAncestor;

  stack.push(root);

  while (stack.length > 0 || ancestorStack.length > 0) {
    selectionTraversal.stackMaximumLength = Math.max(
      selectionTraversal.stackMaximumLength,
      stack.length,
    );
    selectionTraversal.ancestorStackMaximumLength = Math.max(
      selectionTraversal.ancestorStackMaximumLength,
      ancestorStack.length,
    );

    if (ancestorStack.length > 0) {
      const waitingTile = ancestorStack.peek();
      if (waitingTile._stackLength === stack.length) {
        ancestorStack.pop();
        if (waitingTile !== lastAncestor) {
          waitingTile._finalResolution = false;
        }
        selectTile(waitingTile, frameState);
        continue;
      }
    }

    const tile = stack.pop();
    if (!defined(tile)) {
      // stack is empty but ancestorStack isn't
      continue;
    }

    const traverse = canTraverse(tile);

    if (tile._shouldSelect) {
      if (tile.refine === Cesium3DTileRefine.ADD) {
        selectTile(tile, frameState);
      } else {
        tile._selectionDepth = ancestorStack.length;
        if (tile._selectionDepth > 0) {
          tile.tileset.hasMixedContent = true;
        }
        lastAncestor = tile;
        if (!traverse) {
          selectTile(tile, frameState);
          continue;
        }
        ancestorStack.push(tile);
        tile._stackLength = stack.length;
      }
    }

    if (traverse) {
      const children = tile.children;
      for (let i = 0; i < children.length; ++i) {
        const child = children[i];
        if (child.isVisible) {
          stack.push(child);
        }
      }
    }
  }
}

export default Cesium3DTilesetSkipTraversal;
