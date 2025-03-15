import binarySearch from "../Core/binarySearch.js";
import Cartesian3 from "../Core/Cartesian3.js";
import CesiumMath from "../Core/Math.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import KeyframeNode from "./KeyframeNode.js";
import Matrix3 from "../Core/Matrix3.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";

/**
 * @alias SpatialNode
 * @constructor
 *
 * @param {number} level
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {SpatialNode} parent
 * @param {VoxelShape} shape
 * @param {Cartesian3} voxelDimensions
 *
 * @private
 */
function SpatialNode(level, x, y, z, parent, shape, voxelDimensions) {
  /**
   * @type {SpatialNode[]}
   */
  this.children = undefined;
  this.parent = parent;

  this.level = level;
  this.x = x;
  this.y = y;
  this.z = z;

  /**
   * @type {Cartesian3}
   */
  this.dimensions = Cartesian3.clone(voxelDimensions);
  /**
   * @type {KeyframeNode[]}
   */
  this.keyframeNodes = [];
  /**
   * @type {KeyframeNode[]}
   */
  this.renderableKeyframeNodes = [];

  this.renderableKeyframeNodeLerp = 0.0;
  /**
   * @type {KeyframeNode}
   */
  this.renderableKeyframeNodePrevious = undefined;
  /**
   * @type {KeyframeNode}
   */
  this.renderableKeyframeNodeNext = undefined;

  this.orientedBoundingBox = new OrientedBoundingBox();
  this.approximateVoxelSize = 0.0;
  this.screenSpaceError = 0.0;
  this.visitedFrameNumber = -1;

  this.computeBoundingVolumes(shape);
}

const scratchObbHalfScale = new Cartesian3();

/**
 * @param {VoxelShape} shape
 */
SpatialNode.prototype.computeBoundingVolumes = function (shape) {
  this.orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
    this.level,
    this.x,
    this.y,
    this.z,
    this.orientedBoundingBox,
  );

  const halfScale = Matrix3.getScale(
    this.orientedBoundingBox.halfAxes,
    scratchObbHalfScale,
  );
  const maximumScale = 2.0 * Cartesian3.maximumComponent(halfScale);
  this.approximateVoxelSize =
    maximumScale / Cartesian3.minimumComponent(this.dimensions);
};

/**
 * @param {VoxelShape} shape The shape of the parent VoxelPrimitive
 * @private
 */
SpatialNode.prototype.constructChildNodes = function (shape) {
  const { level, x, y, z } = this;
  const xMin = x * 2;
  const yMin = y * 2;
  const zMin = z * 2;
  const yMax = yMin + 1;
  const xMax = xMin + 1;
  const zMax = zMin + 1;
  const childLevel = level + 1;

  const childCoords = [
    [childLevel, xMin, yMin, zMin],
    [childLevel, xMax, yMin, zMin],
    [childLevel, xMin, yMax, zMin],
    [childLevel, xMax, yMax, zMin],
    [childLevel, xMin, yMin, zMax],
    [childLevel, xMax, yMin, zMax],
    [childLevel, xMin, yMax, zMax],
    [childLevel, xMax, yMax, zMax],
  ];

  this.children = childCoords.map(([level, x, y, z]) => {
    return new SpatialNode(level, x, y, z, this, shape, this.dimensions);
  });
};

/**
 * @param {FrameState} frameState
 * @param {number} visibilityPlaneMask
 * @returns {number} A plane mask as described in {@link CullingVolume#computeVisibilityWithPlaneMask}.
 */
SpatialNode.prototype.visibility = function (frameState, visibilityPlaneMask) {
  const obb = this.orientedBoundingBox;
  const cullingVolume = frameState.cullingVolume;
  return cullingVolume.computeVisibilityWithPlaneMask(obb, visibilityPlaneMask);
};

/**
 * @param {Cartesian3} cameraPosition
 * @param {number} screenSpaceErrorMultiplier
 */
SpatialNode.prototype.computeScreenSpaceError = function (
  cameraPosition,
  screenSpaceErrorMultiplier,
) {
  const obb = this.orientedBoundingBox;

  let distance = Math.sqrt(obb.distanceSquaredTo(cameraPosition));
  // Avoid divide-by-zero when viewer is inside the tile.
  distance = Math.max(distance, CesiumMath.EPSILON7);
  const approximateVoxelSize = this.approximateVoxelSize;
  const error = screenSpaceErrorMultiplier * (approximateVoxelSize / distance);
  this.screenSpaceError = error;
};

// This object imitates a KeyframeNode. Only used for binary search function.
const scratchBinarySearchKeyframeNode = {
  keyframe: 0,
};

/**
 * Find the index of a given key frame position within an array of KeyframeNodes,
 * or the complement (~) of the index where it would be in the sorted array.
 * @param {number} keyframe
 * @param {KeyframeNode[]} keyframeNodes
 * @returns {number}
 * @private
 */
function findKeyframeIndex(keyframe, keyframeNodes) {
  scratchBinarySearchKeyframeNode.keyframe = keyframe;
  return binarySearch(
    keyframeNodes,
    scratchBinarySearchKeyframeNode,
    KeyframeNode.searchComparator,
  );
}

/**
 * Computes the most suitable keyframes for rendering, balancing between temporal and visual quality.
 *
 * @param {number} keyframeLocation
 */
SpatialNode.prototype.computeSurroundingRenderableKeyframeNodes = function (
  keyframeLocation,
) {
  let spatialNode = this;
  const startLevel = spatialNode.level;

  const targetKeyframePrev = Math.floor(keyframeLocation);
  const targetKeyframeNext = Math.ceil(keyframeLocation);

  let bestKeyframeNodePrev;
  let bestKeyframeNodeNext;
  let minimumDistancePrev = +Number.MAX_VALUE;
  let minimumDistanceNext = +Number.MAX_VALUE;

  while (defined(spatialNode)) {
    const { renderableKeyframeNodes } = spatialNode;

    if (renderableKeyframeNodes.length >= 1) {
      const indexPrev = getKeyframeIndexPrev(
        targetKeyframePrev,
        renderableKeyframeNodes,
      );
      const keyframeNodePrev = renderableKeyframeNodes[indexPrev];

      const indexNext =
        targetKeyframeNext === targetKeyframePrev ||
        targetKeyframePrev < keyframeNodePrev.keyframe
          ? indexPrev
          : Math.min(indexPrev + 1, renderableKeyframeNodes.length - 1);
      const keyframeNodeNext = renderableKeyframeNodes[indexNext];

      const distancePrev = targetKeyframePrev - keyframeNodePrev.keyframe;
      const weightedDistancePrev = getWeightedKeyframeDistance(
        startLevel - spatialNode.level,
        distancePrev,
      );
      if (weightedDistancePrev < minimumDistancePrev) {
        minimumDistancePrev = weightedDistancePrev;
        bestKeyframeNodePrev = keyframeNodePrev;
      }

      const distanceNext = keyframeNodeNext.keyframe - targetKeyframeNext;
      const weightedDistanceNext = getWeightedKeyframeDistance(
        startLevel - spatialNode.level,
        distanceNext,
      );
      if (weightedDistanceNext < minimumDistanceNext) {
        minimumDistanceNext = weightedDistanceNext;
        bestKeyframeNodeNext = keyframeNodeNext;
      }

      if (distancePrev === 0 && distanceNext === 0) {
        // Nothing higher up will be better, so break early.
        break;
      }
    }

    spatialNode = spatialNode.parent;
  }

  this.renderableKeyframeNodePrevious = bestKeyframeNodePrev;
  this.renderableKeyframeNodeNext = bestKeyframeNodeNext;

  if (!defined(bestKeyframeNodePrev) || !defined(bestKeyframeNodeNext)) {
    return;
  }

  const bestKeyframePrev = bestKeyframeNodePrev.keyframe;
  const bestKeyframeNext = bestKeyframeNodeNext.keyframe;
  this.renderableKeyframeNodeLerp =
    bestKeyframePrev === bestKeyframeNext
      ? 0.0
      : CesiumMath.clamp(
          (keyframeLocation - bestKeyframePrev) /
            (bestKeyframeNext - bestKeyframePrev),
          0.0,
          1.0,
        );
};

function getKeyframeIndexPrev(targetKeyframe, keyframeNodes) {
  const keyframeIndex = findKeyframeIndex(targetKeyframe, keyframeNodes);
  return keyframeIndex < 0
    ? CesiumMath.clamp(~keyframeIndex - 1, 0, keyframeNodes.length - 1)
    : keyframeIndex;
}

function getWeightedKeyframeDistance(levelDistance, keyframeDistance) {
  // Balance quality between visual (levelDistance) and temporal (keyframeDistance)
  const levelWeight = Math.exp(levelDistance * 4.0);
  // Keyframes on the opposite of the desired direction are deprioritized.
  const keyframeWeight = keyframeDistance >= 0 ? 1.0 : -200.0;
  return levelDistance * levelWeight + keyframeDistance * keyframeWeight;
}

/**
 * @param {number} frameNumber
 * @returns {boolean}
 */
SpatialNode.prototype.isVisited = function (frameNumber) {
  return this.visitedFrameNumber === frameNumber;
};

/**
 * @param {number} keyframe
 */
SpatialNode.prototype.createKeyframeNode = function (keyframe) {
  let index = findKeyframeIndex(keyframe, this.keyframeNodes);
  if (index < 0) {
    index = ~index; // convert to insertion index
    const keyframeNode = new KeyframeNode(this, keyframe);
    this.keyframeNodes.splice(index, 0, keyframeNode);
  }
};

/**
 * @param {KeyframeNode} keyframeNode
 * @param {Megatexture[]} megatextures
 */
SpatialNode.prototype.destroyKeyframeNode = function (
  keyframeNode,
  megatextures,
) {
  const keyframe = keyframeNode.keyframe;
  const keyframeIndex = findKeyframeIndex(keyframe, this.keyframeNodes);
  if (keyframeIndex < 0) {
    throw new DeveloperError("Keyframe node does not exist.");
  }

  this.keyframeNodes.splice(keyframeIndex, 1);

  if (keyframeNode.megatextureIndex !== -1) {
    for (let i = 0; i < megatextures.length; i++) {
      megatextures[i].remove(keyframeNode.megatextureIndex);
    }

    const renderableKeyframeNodeIndex = findKeyframeIndex(
      keyframe,
      this.renderableKeyframeNodes,
    );
    if (renderableKeyframeNodeIndex < 0) {
      throw new DeveloperError("Renderable keyframe node does not exist.");
    }

    this.renderableKeyframeNodes.splice(renderableKeyframeNodeIndex, 1);
  }

  keyframeNode.unload();
};

/**
 * @param {KeyframeNode} keyframeNode
 * @param {Megatexture[]} megatextures
 */
SpatialNode.prototype.addKeyframeNodeToMegatextures = function (
  keyframeNode,
  megatextures,
) {
  if (
    keyframeNode.megatextureIndex !== -1 ||
    keyframeNode.content.metadata.length !== megatextures.length
  ) {
    throw new DeveloperError("Keyframe node cannot be added to megatexture");
  }

  const { metadata } = keyframeNode.content;
  for (let i = 0; i < megatextures.length; i++) {
    const megatexture = megatextures[i];
    keyframeNode.megatextureIndex = megatexture.add(metadata[i]);
  }

  const renderableKeyframeNodes = this.renderableKeyframeNodes;
  let renderableKeyframeNodeIndex = findKeyframeIndex(
    keyframeNode.keyframe,
    renderableKeyframeNodes,
  );
  if (renderableKeyframeNodeIndex >= 0) {
    throw new DeveloperError("Keyframe already renderable");
  }
  renderableKeyframeNodeIndex = ~renderableKeyframeNodeIndex;
  renderableKeyframeNodes.splice(renderableKeyframeNodeIndex, 0, keyframeNode);
};

/**
 * @param {number} frameNumber
 * @returns {boolean}
 */
SpatialNode.prototype.isRenderable = function (frameNumber) {
  const previousNode = this.renderableKeyframeNodePrevious;
  const nextNode = this.renderableKeyframeNodeNext;
  const level = this.level;

  return (
    defined(previousNode) &&
    defined(nextNode) &&
    (previousNode.spatialNode.level === level ||
      nextNode.spatialNode.level === level) &&
    this.visitedFrameNumber === frameNumber
  );
};

export default SpatialNode;
