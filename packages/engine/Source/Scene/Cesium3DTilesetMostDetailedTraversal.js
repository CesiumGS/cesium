import Intersect from "../Core/Intersect.js";
import ManagedArray from "../Core/ManagedArray.js";
import Cesium3DTileRefine from "./Cesium3DTileRefine.js";
import Cesium3DTilesetTraversal from "./Cesium3DTilesetTraversal.js";

/**
 * Traversal that loads all leaves that intersect the camera frustum.
 * Used to determine ray-tileset intersections during a pickFromRayMostDetailed call.
 *
 * @alias Cesium3DTilesetMostDetailedTraversal
 * @constructor
 *
 * @private
 */
function Cesium3DTilesetMostDetailedTraversal() {}

const traversal = {
  stack: new ManagedArray(),
  stackMaximumLength: 0,
};

/**
 * Traverses a {@link Cesium3DTileset} to determine which tiles to load and render.
 *
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 * @returns {boolean} Whether the appropriate tile is ready for picking
 */
Cesium3DTilesetMostDetailedTraversal.selectTiles = function (
  tileset,
  frameState
) {
  tileset._selectedTiles.length = 0;
  tileset._requestedTiles.length = 0;
  tileset.hasMixedContent = false;

  let ready = true;

  const root = tileset.root;
  root.updateVisibility(frameState);

  if (!root.isVisible) {
    return ready;
  }

  const { touchTile, visitTile } = Cesium3DTilesetTraversal;

  const stack = traversal.stack;
  stack.push(root);

  while (stack.length > 0) {
    traversal.stackMaximumLength = Math.max(
      traversal.stackMaximumLength,
      stack.length
    );

    const tile = stack.pop();
    const add = tile.refine === Cesium3DTileRefine.ADD;
    const replace = tile.refine === Cesium3DTileRefine.REPLACE;
    const traverse = canTraverse(tile);

    if (traverse) {
      updateAndPushChildren(tile, stack, frameState);
    }

    if (add || (replace && !traverse)) {
      loadTile(tileset, tile);
      touchTile(tile, frameState);
      selectDesiredTile(tile, frameState);

      if (tile.hasRenderableContent && !tile.contentAvailable) {
        ready = false;
      }
    }

    visitTile(tile, frameState);
  }

  traversal.stack.trim(traversal.stackMaximumLength);

  return ready;
};

function canTraverse(tile) {
  if (tile.children.length === 0) {
    return false;
  }

  if (tile.hasTilesetContent || tile.hasImplicitContent) {
    // Traverse external tileset to visit its root tile
    // Don't traverse if the subtree is expired because it will be destroyed
    return !tile.contentExpired;
  }

  if (tile.hasEmptyContent) {
    return true;
  }

  return true; // Keep traversing until a leaf is hit
}

function updateAndPushChildren(tile, stack, frameState) {
  const { children } = tile;

  for (let i = 0; i < children.length; ++i) {
    const child = children[i];
    child.updateVisibility(frameState);
    if (child.isVisible) {
      stack.push(child);
    }
  }
}

function loadTile(tileset, tile) {
  if (tile.hasUnloadedRenderableContent || tile.contentExpired) {
    tile._priority = 0.0; // Highest priority
    tileset._requestedTiles.push(tile);
  }
}

function selectDesiredTile(tile, frameState) {
  if (
    tile.contentAvailable &&
    tile.contentVisibility(frameState) !== Intersect.OUTSIDE
  ) {
    tile.tileset._selectedTiles.push(tile);
  }
}

export default Cesium3DTilesetMostDetailedTraversal;
