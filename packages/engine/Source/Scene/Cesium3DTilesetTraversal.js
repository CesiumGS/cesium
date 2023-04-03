import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Intersect from "../Core/Intersect.js";
import Cesium3DTileOptimizationHint from "./Cesium3DTileOptimizationHint.js";
import Cesium3DTileRefine from "./Cesium3DTileRefine.js";

/**
 * Traverses a {@link Cesium3DTileset} to determine which tiles to load and render.
 * This type describes an interface and is not intended to be instantiated directly.
 *
 * @alias Cesium3DTilesetTraversal
 * @constructor
 * @abstract
 *
 * @see Cesium3DTilesetBaseTraversal
 * @see Cesium3DTilesetSkipTraversal
 * @see Cesium3DTilesetMostDetailedTraversal
 *
 * @private
 */
function Cesium3DTilesetTraversal() {}

/**
 * Traverses a {@link Cesium3DTileset} to determine which tiles to load and render.
 *
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 */
Cesium3DTilesetTraversal.selectTiles = function (tileset, frameState) {
  DeveloperError.throwInstantiationError();
};

/**
 * Sort by farthest child first since this is going on a stack
 *
 * @private
 * @param {Cesium3DTile} a
 * @param {Cesium3DTile} b
 * @returns {number}
 */
Cesium3DTilesetTraversal.sortChildrenByDistanceToCamera = function (a, b) {
  if (b._distanceToCamera === 0 && a._distanceToCamera === 0) {
    return b._centerZDepth - a._centerZDepth;
  }

  return b._distanceToCamera - a._distanceToCamera;
};

/**
 * Determine if a tile can and should be traversed for children tiles that
 * would contribute to rendering the current view
 *
 * @private
 * @param {Cesium3DTile} tile
 * @returns {boolean}
 */
Cesium3DTilesetTraversal.canTraverse = function (tile) {
  if (tile.children.length === 0) {
    return false;
  }
  if (tile.hasTilesetContent || tile.hasImplicitContent) {
    // Traverse external tileset to visit its root tile
    // Don't traverse if the subtree is expired because it will be destroyed
    return !tile.contentExpired;
  }
  return tile._screenSpaceError > tile.tileset._maximumScreenSpaceError;
};

/**
 * Mark a tile as selected, and add it to the tileset's list of selected tiles
 *
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 */
Cesium3DTilesetTraversal.selectTile = function (tile, frameState) {
  if (tile.contentVisibility(frameState) === Intersect.OUTSIDE) {
    return;
  }

  const { content, tileset } = tile;
  if (content.featurePropertiesDirty) {
    // A feature's property in this tile changed, the tile needs to be re-styled.
    content.featurePropertiesDirty = false;
    tile.lastStyleTime = 0; // Force applying the style to this tile
    tileset._selectedTilesToStyle.push(tile);
  } else if (tile._selectedFrame < frameState.frameNumber - 1) {
    // Tile is newly selected; it is selected this frame, but was not selected last frame.
    tileset._selectedTilesToStyle.push(tile);
  }
  tile._selectedFrame = frameState.frameNumber;
  tileset._selectedTiles.push(tile);
};

/**
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 */
Cesium3DTilesetTraversal.visitTile = function (tile, frameState) {
  ++tile.tileset._statistics.visited;
  tile._visitedFrame = frameState.frameNumber;
};

/**
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 */
Cesium3DTilesetTraversal.touchTile = function (tile, frameState) {
  if (tile._touchedFrame === frameState.frameNumber) {
    // Prevents another pass from touching the frame again
    return;
  }
  tile.tileset._cache.touch(tile);
  tile._touchedFrame = frameState.frameNumber;
};

/**
 * Add a tile to the list of requested tiles, if appropriate
 *
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 */
Cesium3DTilesetTraversal.loadTile = function (tile, frameState) {
  const { tileset } = tile;
  if (
    tile._requestedFrame === frameState.frameNumber ||
    (!tile.hasUnloadedRenderableContent && !tile.contentExpired)
  ) {
    return;
  }

  if (!isOnScreenLongEnough(tile, frameState)) {
    return;
  }

  const cameraHasNotStoppedMovingLongEnough =
    frameState.camera.timeSinceMoved < tileset.foveatedTimeDelay;
  if (tile.priorityDeferred && cameraHasNotStoppedMovingLongEnough) {
    return;
  }

  tile._requestedFrame = frameState.frameNumber;
  tileset._requestedTiles.push(tile);
};

/**
 * Prevent unnecessary loads while camera is moving by getting the ratio of travel distance to tile size.
 *
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 * @returns {boolean}
 */
function isOnScreenLongEnough(tile, frameState) {
  const { tileset } = tile;
  if (!tileset._cullRequestsWhileMoving) {
    return true;
  }

  const {
    positionWCDeltaMagnitude,
    positionWCDeltaMagnitudeLastFrame,
  } = frameState.camera;
  const deltaMagnitude =
    positionWCDeltaMagnitude !== 0.0
      ? positionWCDeltaMagnitude
      : positionWCDeltaMagnitudeLastFrame;

  // How do n frames of this movement compare to the tile's physical size.
  const diameter = Math.max(tile.boundingSphere.radius * 2.0, 1.0);
  const movementRatio =
    (tileset.cullRequestsWhileMovingMultiplier * deltaMagnitude) / diameter;

  return movementRatio < 1.0;
}

/**
 * Reset some of the tile's flags and re-evaluate visibility and priority
 *
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 */
Cesium3DTilesetTraversal.updateTile = function (tile, frameState) {
  updateTileVisibility(tile, frameState);
  tile.updateExpiration();

  tile._wasMinPriorityChild = false;
  tile._priorityHolder = tile;
  updateMinimumMaximumPriority(tile);

  // SkipLOD
  tile._shouldSelect = false;
  tile._finalResolution = true;
};

/**
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 */
function updateTileVisibility(tile, frameState) {
  tile.updateVisibility(frameState);

  if (!tile.isVisible) {
    return;
  }

  const hasChildren = tile.children.length > 0;
  if ((tile.hasTilesetContent || tile.hasImplicitContent) && hasChildren) {
    // Use the root tile's visibility instead of this tile's visibility.
    // The root tile may be culled by the children bounds optimization in which
    // case this tile should also be culled.
    const child = tile.children[0];
    updateTileVisibility(child, frameState);
    tile._visible = child._visible;
    return;
  }

  if (meetsScreenSpaceErrorEarly(tile, frameState)) {
    tile._visible = false;
    return;
  }

  // Optimization - if none of the tile's children are visible then this tile isn't visible
  const replace = tile.refine === Cesium3DTileRefine.REPLACE;
  const useOptimization =
    tile._optimChildrenWithinParent ===
    Cesium3DTileOptimizationHint.USE_OPTIMIZATION;
  if (replace && useOptimization && hasChildren) {
    if (!anyChildrenVisible(tile, frameState)) {
      ++tile.tileset._statistics.numberOfTilesCulledWithChildrenUnion;
      tile._visible = false;
      return;
    }
  }
}

/**
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 * @returns {boolean}
 */
function meetsScreenSpaceErrorEarly(tile, frameState) {
  const { parent, tileset } = tile;
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

/**
 * @private
 * @param {Cesium3DTile} tile
 * @param {FrameState} frameState
 * @returns {boolean}
 */
function anyChildrenVisible(tile, frameState) {
  let anyVisible = false;
  const children = tile.children;
  for (let i = 0; i < children.length; ++i) {
    const child = children[i];
    child.updateVisibility(frameState);
    anyVisible = anyVisible || child.isVisible;
  }
  return anyVisible;
}

/**
 * @private
 * @param {Cesium3DTile} tile
 */
function updateMinimumMaximumPriority(tile) {
  const minimumPriority = tile.tileset._minimumPriority;
  const maximumPriority = tile.tileset._maximumPriority;
  const priorityHolder = tile._priorityHolder;

  maximumPriority.distance = Math.max(
    priorityHolder._distanceToCamera,
    maximumPriority.distance
  );
  minimumPriority.distance = Math.min(
    priorityHolder._distanceToCamera,
    minimumPriority.distance
  );
  maximumPriority.depth = Math.max(tile._depth, maximumPriority.depth);
  minimumPriority.depth = Math.min(tile._depth, minimumPriority.depth);
  maximumPriority.foveatedFactor = Math.max(
    priorityHolder._foveatedFactor,
    maximumPriority.foveatedFactor
  );
  minimumPriority.foveatedFactor = Math.min(
    priorityHolder._foveatedFactor,
    minimumPriority.foveatedFactor
  );
  maximumPriority.reverseScreenSpaceError = Math.max(
    tile._priorityReverseScreenSpaceError,
    maximumPriority.reverseScreenSpaceError
  );
  minimumPriority.reverseScreenSpaceError = Math.min(
    tile._priorityReverseScreenSpaceError,
    minimumPriority.reverseScreenSpaceError
  );
}

export default Cesium3DTilesetTraversal;
