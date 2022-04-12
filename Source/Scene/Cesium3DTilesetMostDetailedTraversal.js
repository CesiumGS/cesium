import Intersect from "../Core/Intersect.js";
import ManagedArray from "../Core/ManagedArray.js";
import Cesium3DTileRefine from "./Cesium3DTileRefine.js";

/**
 * Traversal that loads all leaves that intersect the camera frustum.
 * Used to determine ray-tileset intersections during a pickFromRayMostDetailed call.
 *
 * @private
 */
function Cesium3DTilesetMostDetailedTraversal() {}

const traversal = {
  stack: new ManagedArray(),
  stackMaximumLength: 0,
};

Cesium3DTilesetMostDetailedTraversal.selectTiles = function (
  tileset,
  frameState
) {
  tileset._selectedTiles.length = 0;
  tileset._requestedTiles.length = 0;
  tileset._hasMixedContent = false;

  let ready = true;

  const root = tileset.root;
  root.updateVisibility(frameState);

  if (!isVisible(root)) {
    return ready;
  }

  const stack = traversal.stack;
  stack.push(tileset.root);

  while (stack.length > 0) {
    traversal.stackMaximumLength = Math.max(
      traversal.stackMaximumLength,
      stack.length
    );

    const tile = stack.pop();
    const add = tile.refine === Cesium3DTileRefine.ADD;
    const replace = tile.refine === Cesium3DTileRefine.REPLACE;
    const traverse = canTraverse(tileset, tile);

    if (traverse) {
      updateAndPushChildren(tileset, tile, stack, frameState);
    }

    if (add || (replace && !traverse)) {
      loadTile(tileset, tile);
      touchTile(tileset, tile, frameState);
      selectDesiredTile(tileset, tile, frameState);

      if (!hasEmptyContent(tile) && !tile.contentAvailable) {
        ready = false;
      }
    }

    visitTile(tileset);
  }

  traversal.stack.trim(traversal.stackMaximumLength);

  return ready;
};

function isVisible(tile) {
  return tile._visible && tile._inRequestVolume;
}

function hasEmptyContent(tile) {
  return (
    tile.hasEmptyContent || tile.hasTilesetContent || tile.hasImplicitContent
  );
}

function hasUnloadedContent(tile) {
  return !hasEmptyContent(tile) && tile.contentUnloaded;
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

  if (tile.hasEmptyContent) {
    return true;
  }

  return true; // Keep traversing until a leave is hit
}

function updateAndPushChildren(tileset, tile, stack, frameState) {
  const children = tile.children;
  const length = children.length;

  for (let i = 0; i < length; ++i) {
    const child = children[i];
    child.updateVisibility(frameState);
    if (isVisible(child)) {
      stack.push(child);
    }
  }
}

function loadTile(tileset, tile) {
  if (hasUnloadedContent(tile) || tile.contentExpired) {
    tile._priority = 0.0; // Highest priority
    tileset._requestedTiles.push(tile);
  }
}

function touchTile(tileset, tile, frameState) {
  if (tile._touchedFrame === frameState.frameNumber) {
    // Prevents another pass from touching the frame again
    return;
  }
  tileset._cache.touch(tile);
  tile._touchedFrame = frameState.frameNumber;
}

function visitTile(tileset) {
  ++tileset.statistics.visited;
}

function selectDesiredTile(tileset, tile, frameState) {
  if (
    tile.contentAvailable &&
    tile.contentVisibility(frameState) !== Intersect.OUTSIDE
  ) {
    tileset._selectedTiles.push(tile);
  }
}
export default Cesium3DTilesetMostDetailedTraversal;
