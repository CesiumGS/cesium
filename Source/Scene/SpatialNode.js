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
 * @param {Number} level
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @param {SpatialNode} parent
 * @param {VoxelShapeType} shape
 * @param {Cartesian3} voxelDimensions
 *
 * @private
 */
function SpatialNode(level, x, y, z, parent, shape, voxelDimensions) {
  /**
   * @ignore
   * @type {SpatialNode[]}
   */
  this.children = undefined;
  this.parent = parent;

  this.level = level;
  this.x = x;
  this.y = y;
  this.z = z;

  /**
   * @ignore
   * @type {KeyframeNode[]}
   */
  this.keyframeNodes = [];
  /**
   * @ignore
   * @type {KeyframeNode[]}
   */
  this.renderableKeyframeNodes = [];

  this.renderableKeyframeNodeLerp = 0.0;
  /**
   * @ignore
   * @type {KeyframeNode}
   */
  this.renderableKeyframeNodePrevious = undefined;
  /**
   * @ignore
   * @type {KeyframeNode}
   */
  this.renderableKeyframeNodeNext = undefined;

  this.orientedBoundingBox = new OrientedBoundingBox();
  this.approximateVoxelSize = 0.0;
  this.screenSpaceError = 0.0;
  this.visitedFrameNumber = -1;

  this.computeBoundingVolumes(shape, voxelDimensions);
}

/**
 * @param {SpatialNode} a
 * @param {SpatialNode} b
 * @returns {Boolean}
 */
SpatialNode.spatialComparator = function (a, b) {
  // The higher of the two screen space errors is prioritized
  return b.screenSpaceError - a.screenSpaceError;
};

const scratchObbHalfScale = new Cartesian3();

/**
 * @param {VoxelShape} shape
 * @param {Cartesian3} voxelDimensions
 */
SpatialNode.prototype.computeBoundingVolumes = function (
  shape,
  voxelDimensions
) {
  this.orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
    this.level,
    this.x,
    this.y,
    this.z,
    this.orientedBoundingBox
  );

  const halfScale = Matrix3.getScale(
    this.orientedBoundingBox.halfAxes,
    scratchObbHalfScale
  );
  const maximumScale = 2.0 * Cartesian3.maximumComponent(halfScale);
  this.approximateVoxelSize =
    maximumScale / Cartesian3.minimumComponent(voxelDimensions);
};

/**
 * @param {FrameState} frameState
 * @param {Number} visibilityPlaneMask
 * @returns {Number} A plane mask as described in {@link CullingVolume#computeVisibilityWithPlaneMask}.
 */
SpatialNode.prototype.visibility = function (frameState, visibilityPlaneMask) {
  const obb = this.orientedBoundingBox;
  const cullingVolume = frameState.cullingVolume;
  return cullingVolume.computeVisibilityWithPlaneMask(obb, visibilityPlaneMask);
};

/**
 * @param {Cartesian3} cameraPosition
 * @param {Number} screenSpaceErrorMultiplier
 */
SpatialNode.prototype.computeScreenSpaceError = function (
  cameraPosition,
  screenSpaceErrorMultiplier
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
 * @param {Number} keyframe
 * @param {KeyframeNode[]} keyframeNodes
 * @returns {Number}
 * @private
 */
function findKeyframeIndex(keyframe, keyframeNodes) {
  scratchBinarySearchKeyframeNode.keyframe = keyframe;
  return binarySearch(
    keyframeNodes,
    scratchBinarySearchKeyframeNode,
    KeyframeNode.searchComparator
  );
}

/**
 * Computes the most suitable keyframes for rendering, balancing between temporal and visual quality.
 *
 * @param {Number} keyframeLocation
 */
SpatialNode.prototype.computeSurroundingRenderableKeyframeNodes = function (
  keyframeLocation
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
    const renderableKeyframeNodes = spatialNode.renderableKeyframeNodes;

    if (renderableKeyframeNodes.length >= 1) {
      let keyframeNodeIndexPrev = findKeyframeIndex(
        targetKeyframePrev,
        renderableKeyframeNodes
      );
      if (keyframeNodeIndexPrev < 0) {
        keyframeNodeIndexPrev = CesiumMath.clamp(
          ~keyframeNodeIndexPrev - 1,
          0,
          renderableKeyframeNodes.length - 1
        );
      }
      const keyframeNodePrev = renderableKeyframeNodes[keyframeNodeIndexPrev];
      const keyframePrev = keyframeNodePrev.keyframe;

      let keyframeNodeNext;
      if (
        targetKeyframeNext === targetKeyframePrev ||
        targetKeyframePrev < keyframePrev
      ) {
        keyframeNodeNext = keyframeNodePrev;
      } else {
        const keyframeNodeIndexNext = Math.min(
          keyframeNodeIndexPrev + 1,
          renderableKeyframeNodes.length - 1
        );
        keyframeNodeNext = renderableKeyframeNodes[keyframeNodeIndexNext];
      }
      const keyframeNext = keyframeNodeNext.keyframe;

      const keyframeDistancePrev = targetKeyframePrev - keyframePrev;
      const keyframeDistanceNext = keyframeNext - targetKeyframeNext;
      const levelDistance = startLevel - spatialNode.level;

      // Balance temporal and visual quality
      const levelWeight = Math.exp(levelDistance * 4.0);
      const normalKeyframeWeight = 1.0;
      const reverseKeyframeWeight = 200.0; // Keyframes on the opposite of the desired direction are deprioritized.
      const distancePrev =
        levelDistance * levelWeight +
        (keyframeDistancePrev >= 0
          ? keyframeDistancePrev * normalKeyframeWeight
          : -keyframeDistancePrev * reverseKeyframeWeight);
      const distanceNext =
        levelDistance * levelWeight +
        (keyframeDistanceNext >= 0
          ? keyframeDistanceNext * normalKeyframeWeight
          : -keyframeDistanceNext * reverseKeyframeWeight);

      if (distancePrev < minimumDistancePrev) {
        minimumDistancePrev = distancePrev;
        bestKeyframeNodePrev = keyframeNodePrev;
      }
      if (distanceNext < minimumDistanceNext) {
        minimumDistanceNext = distanceNext;
        bestKeyframeNodeNext = keyframeNodeNext;
      }
      if (keyframeDistancePrev === 0 && keyframeDistanceNext === 0) {
        // Nothing higher up will be better, so break early.
        break;
      }
    }

    spatialNode = spatialNode.parent;
  }

  this.renderableKeyframeNodePrevious = bestKeyframeNodePrev;
  this.renderableKeyframeNodeNext = bestKeyframeNodeNext;
  if (defined(bestKeyframeNodePrev) && defined(bestKeyframeNodeNext)) {
    const bestKeyframePrev = bestKeyframeNodePrev.keyframe;
    const bestKeyframeNext = bestKeyframeNodeNext.keyframe;
    this.renderableKeyframeNodeLerp =
      bestKeyframePrev === bestKeyframeNext
        ? 0.0
        : CesiumMath.clamp(
            (keyframeLocation - bestKeyframePrev) /
              (bestKeyframeNext - bestKeyframePrev),
            0.0,
            1.0
          );
  }
};

/**
 * @param {Number} frameNumber
 * @returns {Boolean}
 */
SpatialNode.prototype.isVisited = function (frameNumber) {
  return this.visitedFrameNumber === frameNumber;
};

/**
 * @param {Number} keyframe
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
  megatextures
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
      this.renderableKeyframeNodes
    );
    if (renderableKeyframeNodeIndex < 0) {
      throw new DeveloperError("Renderable keyframe node does not exist.");
    }

    this.renderableKeyframeNodes.splice(renderableKeyframeNodeIndex, 1);
  }

  keyframeNode.spatialNode = undefined;
  keyframeNode.state = KeyframeNode.LoadState.UNLOADED;
  keyframeNode.metadatas = {};
  keyframeNode.megatextureIndex = -1;
  keyframeNode.priority = -Number.MAX_VALUE;
  keyframeNode.highPriorityFrameNumber = -1;
};

/**
 * @param {KeyframeNode} keyframeNode
 * @param {Megatexture[]} megatextures
 */
SpatialNode.prototype.addKeyframeNodeToMegatextures = function (
  keyframeNode,
  megatextures
) {
  if (
    keyframeNode.state !== KeyframeNode.LoadState.RECEIVED ||
    keyframeNode.megatextureIndex !== -1 ||
    keyframeNode.metadatas.length !== megatextures.length
  ) {
    throw new DeveloperError("Keyframe node cannot be added to megatexture");
  }

  for (let i = 0; i < megatextures.length; i++) {
    const megatexture = megatextures[i];
    keyframeNode.megatextureIndex = megatexture.add(keyframeNode.metadatas[i]);
    keyframeNode.metadatas[i] = undefined; // data is in megatexture so no need to hold onto it
  }

  keyframeNode.state = KeyframeNode.LoadState.LOADED;

  const renderableKeyframeNodes = this.renderableKeyframeNodes;
  let renderableKeyframeNodeIndex = findKeyframeIndex(
    keyframeNode.keyframe,
    renderableKeyframeNodes
  );
  if (renderableKeyframeNodeIndex >= 0) {
    throw new DeveloperError("Keyframe already renderable");
  }
  renderableKeyframeNodeIndex = ~renderableKeyframeNodeIndex;
  renderableKeyframeNodes.splice(renderableKeyframeNodeIndex, 0, keyframeNode);
};

/**
 * @param {Number} frameNumber
 * @returns Boolean
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
