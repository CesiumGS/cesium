import defined from "../Core/defined.js";
import ManagedArray from "../Core/ManagedArray.js";
import Cesium3DTileRefine from "./Cesium3DTileRefine.js";
import Cesium3DTilesetTraversal from "./Cesium3DTilesetTraversal.js";

/**
 * Depth-first traversal that traverses all visible tiles and marks tiles for selection.
 * A tile does not refine until all children are loaded.
 * This is the traditional replacement refinement approach and is called the base traversal.
 *
 * @alias Cesium3DTilesetBaseTraversal
 * @constructor
 *
 * @private
 */
function Cesium3DTilesetBaseTraversal() {}

const traversal = {
  stack: new ManagedArray(),
  stackMaximumLength: 0,
};

const emptyTraversal = {
  stack: new ManagedArray(),
  stackMaximumLength: 0,
};

/**
 * Traverses a {@link Cesium3DTileset} to determine which tiles to load and render.
 *
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 */
Cesium3DTilesetBaseTraversal.selectTiles = function (tileset, frameState) {
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

  traversal.stack.trim(traversal.stackMaximumLength);
  emptyTraversal.stack.trim(emptyTraversal.stackMaximumLength);

  // Update the priority for any requests found during traversal
  // Update after traversal so that min and max values can be used to normalize priority values
  const requestedTiles = tileset._requestedTiles;
  for (let i = 0; i < requestedTiles.length; ++i) {
    requestedTiles[i].updatePriority();
  }
};

/**
 * Mark a tile as selected if it has content available.
 *
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 */
function selectDesiredTile(tile, frameState) {
  if (tile.contentAvailable) {
    Cesium3DTilesetTraversal.selectTile(tile, frameState);
  }
}

/**
 * @private
 * @param {Cesium3DTile} tile
 * @param {ManagedArray} stack
 * @param {FrameState} frameState
 * @returns {boolean}
 */
function updateAndPushChildren(tile, stack, frameState) {
  const replace = tile.refine === Cesium3DTileRefine.REPLACE;
  const { tileset, children } = tile;
  const { updateTile, loadTile, touchTile } = Cesium3DTilesetTraversal;

  for (let i = 0; i < children.length; ++i) {
    updateTile(children[i], frameState);
  }

  // Sort by distance to take advantage of early Z and reduce artifacts for skipLevelOfDetail
  children.sort(Cesium3DTilesetTraversal.sortChildrenByDistanceToCamera);

  // For traditional replacement refinement only refine if all children are loaded.
  // Empty tiles are exempt since it looks better if children stream in as they are loaded to fill the empty space.
  const checkRefines = replace && tile.hasRenderableContent;
  let refines = true;

  let anyChildrenVisible = false;

  // Determining min child
  let minIndex = -1;
  let minimumPriority = Number.MAX_VALUE;

  for (let i = 0; i < children.length; ++i) {
    const child = children[i];
    if (child.isVisible) {
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
      loadTile(child, frameState);
      touchTile(child, frameState);
    }
    if (checkRefines) {
      let childRefines;
      if (!child._inRequestVolume) {
        childRefines = false;
      } else if (!child.hasRenderableContent) {
        childRefines = executeEmptyTraversal(child, frameState);
      } else {
        childRefines = child.contentAvailable;
      }
      refines = refines && childRefines;
    }
  }

  if (!anyChildrenVisible) {
    refines = false;
  }

  if (minIndex !== -1 && replace) {
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

    for (let i = 0; i < children.length; ++i) {
      children[i]._priorityHolder = priorityHolder;
    }
  }

  return refines;
}

/**
 * Depth-first traversal that traverses all visible tiles and marks tiles for selection.
 * A tile does not refine until all children are loaded.
 * This is the traditional replacement refinement approach and is called the base traversal.
 *
 * @private
 * @param {Cesium3DTile} root
 * @param {FrameState} frameState
 */
function executeTraversal(root, frameState) {
  const { tileset } = root;

  const {
    canTraverse,
    loadTile,
    visitTile,
    touchTile,
  } = Cesium3DTilesetTraversal;
  const stack = traversal.stack;
  stack.push(root);

  while (stack.length > 0) {
    traversal.stackMaximumLength = Math.max(
      traversal.stackMaximumLength,
      stack.length
    );

    const tile = stack.pop();

    const parent = tile.parent;
    const parentRefines = !defined(parent) || parent._refines;

    tile._refines = canTraverse(tile)
      ? updateAndPushChildren(tile, stack, frameState) && parentRefines
      : false;

    const stoppedRefining = !tile._refines && parentRefines;

    if (!tile.hasRenderableContent) {
      // Add empty tile just to show its debug bounding volume
      // If the tile has tileset content load the external tileset
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
      loadTile(tile, frameState);
      if (stoppedRefining) {
        selectDesiredTile(tile, frameState);
      }
    }

    visitTile(tile, frameState);
    touchTile(tile, frameState);
  }
}

/**
 * Depth-first traversal that checks if all nearest descendants with content are loaded.
 * Ignores visibility.
 *
 * @private
 * @param {Cesium3DTile} root
 * @param {FrameState} frameState
 * @returns {boolean}
 */
function executeEmptyTraversal(root, frameState) {
  const {
    canTraverse,
    updateTile,
    loadTile,
    touchTile,
  } = Cesium3DTilesetTraversal;
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

    // Only traverse if the tile is empty - traversal stops at descendants with content
    const traverse = !tile.hasRenderableContent && canTraverse(tile);

    // Traversal stops but the tile does not have content yet
    // There will be holes if the parent tries to refine to its children, so don't refine
    if (!traverse && !tile.contentAvailable) {
      allDescendantsLoaded = false;
    }

    updateTile(tile, frameState);
    if (!tile.isVisible) {
      // Load tiles that aren't visible since they are still needed for the parent to refine
      loadTile(tile, frameState);
      touchTile(tile, frameState);
    }

    if (traverse) {
      for (let i = 0; i < childrenLength; ++i) {
        const child = children[i];
        stack.push(child);
      }
    }
  }

  return root.hasEmptyContent || allDescendantsLoaded;
}

export default Cesium3DTilesetBaseTraversal;
