import binarySearch from "../Core/binarySearch.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import CesiumMath from "../Core/Math.js";
import CullingVolume from "../Core/CullingVolume.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import DoubleEndedPriorityQueue from "../Core/DoubleEndedPriorityQueue.js";
import getTimestamp from "../Core/getTimestamp.js";
import Matrix3 from "../Core/Matrix3.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import PixelFormat from "../Core/PixelFormat.js";
import RuntimeError from "../Core/RuntimeError.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import MetadataType from "./MetadataType.js";
import MetadataComponentType from "./MetadataComponentType.js";

/**
 * Handles tileset traversal, tile requests, and GPU resources. Intended to be
 * private and paired with a {@link VoxelPrimitive}, which has a user-facing API.
 *
 * @alias VoxelTraversal
 * @constructor
 *
 * @param {VoxelPrimitive} primitive
 * @param {Context} context
 * @param {Cartesian3} dimensions
 * @param {MetadataType[]} types
 * @param {MetadataComponentType[]} componentTypes
 * @param {Number} keyframeCount
 * @param {Number} [maximumTextureMemoryByteLength]
 *
 * @private
 */
function VoxelTraversal(
  primitive,
  context,
  dimensions,
  types,
  componentTypes,
  keyframeCount,
  maximumTextureMemoryByteLength
) {
  /**
   * TODO: maybe this shouldn't be stored?
   * @type {VoxelPrimitive}
   * @private
   */
  this._primitive = primitive;

  const length = types.length;

  /**
   * @type {Megatexture[]}
   * @readonly
   */
  this.megatextures = new Array(length);

  // TODO make sure to split the maximumTextureMemoryByteLength across all the megatextures
  for (let i = 0; i < length; i++) {
    const type = types[i];
    const componentCount = MetadataType.getComponentCount(type);
    const componentType = componentTypes[i];

    this.megatextures[i] = new Megatexture(
      context,
      dimensions,
      componentCount,
      componentType,
      maximumTextureMemoryByteLength
    );
  }

  const maximumTileCount = this.megatextures[0].maximumTileCount;

  /**
   * @type {Number}
   * @private
   */
  this._simultaneousRequestCount = 0;

  /**
   * @type {Boolean}
   * @private
   */
  this._debugPrint = false;

  const shape = primitive._shape;
  const rootLevel = 0;
  const rootX = 0;
  const rootY = 0;
  const rootZ = 0;
  const rootParent = undefined;

  /**
   * @type {SpatialNode}
   * @readonly
   */
  this.rootNode = new SpatialNode(
    rootLevel,
    rootX,
    rootY,
    rootZ,
    rootParent,
    shape,
    dimensions
  );

  /**
   * @type {DoubleEndedPriorityQueue}
   * @private
   */
  this._priorityQueue = new DoubleEndedPriorityQueue({
    maximumLength: maximumTileCount,
    comparator: KeyframeNode.priorityComparator,
  });

  /**
   * @type {KeyframeNode[]}
   * @private
   */
  this._highPriorityKeyframeNodes = new Array(maximumTileCount);

  /**
   * @type {KeyframeNode[]}
   * @private
   */
  this._keyframeNodesInMegatexture = new Array(maximumTileCount);

  /**
   * @type {Number}
   * @private
   */
  this._keyframeCount = keyframeCount;

  /**
   * @type {Number}
   * @private
   */
  this._keyframeLocation = 0;

  /**
   * @type {Number[]}
   * @private
   */
  this._binaryTreeKeyframeWeighting = new Array(keyframeCount);

  function binaryTreeWeightingRecursive(arr, start, end, depth) {
    if (start > end) {
      return;
    }
    const mid = Math.floor((start + end) / 2);
    arr[mid] = depth;
    binaryTreeWeightingRecursive(arr, start, mid - 1, depth + 1);
    binaryTreeWeightingRecursive(arr, mid + 1, end, depth + 1);
  }

  const binaryTreeKeyframeWeighting = this._binaryTreeKeyframeWeighting;
  binaryTreeKeyframeWeighting[0] = 0;
  binaryTreeKeyframeWeighting[keyframeCount - 1] = 0;
  binaryTreeWeightingRecursive(
    binaryTreeKeyframeWeighting,
    1,
    keyframeCount - 2,
    0
  );

  const internalNodeTexelCount = 9;
  const internalNodeTextureDimensionX = 1024;
  const internalNodeTilesPerRow = Math.floor(
    internalNodeTextureDimensionX / internalNodeTexelCount
  );
  const internalNodeTextureDimensionY = Math.ceil(
    maximumTileCount / internalNodeTilesPerRow
  );

  /**
   * @type {Texture}
   * @readonly
   */
  this.internalNodeTexture = new Texture({
    context: context,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    flipY: false,
    width: internalNodeTextureDimensionX,
    height: internalNodeTextureDimensionY,
    sampler: new Sampler({
      minificationFilter: TextureMinificationFilter.NEAREST,
      magnificationFilter: TextureMagnificationFilter.NEAREST,
    }),
  });

  /**
   * @type {Number}
   * @readonly
   */
  this.internalNodeTilesPerRow = internalNodeTilesPerRow;

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.internalNodeTexelSizeUv = new Cartesian2(
    1.0 / internalNodeTextureDimensionX,
    1.0 / internalNodeTextureDimensionY
  );

  /**
   * @type {Boolean}
   * @readonly
   */
  this.useLeafNodeTexture = keyframeCount > 1;

  /**
   * @type {Texture|undefined}
   * @readonly
   */
  this.leafNodeTexture = undefined;

  /**
   * @type {Number|undefined}
   * @readonly
   */
  this.leafNodeTilesPerRow = undefined;

  /**
   * @type {Cartesian2|undefined}
   * @readonly
   */
  this.leafNodeTexelSizeUv = undefined;

  const useLeafNodeTexture = this._useLeafNodeTexture;
  if (useLeafNodeTexture) {
    const leafNodeTexelCount = 2;
    const leafNodeTextureDimensionX = 1024;
    const leafNodeTilesPerRow = Math.floor(
      leafNodeTextureDimensionX / leafNodeTexelCount
    );
    const leafNodeTextureDimensionY = Math.ceil(
      maximumTileCount / leafNodeTilesPerRow
    );

    this.leafNodeTexture = new Texture({
      context: context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      flipY: false,
      width: leafNodeTextureDimensionX,
      height: leafNodeTextureDimensionY,
      sampler: new Sampler({
        minificationFilter: TextureMinificationFilter.NEAREST,
        magnificationFilter: TextureMagnificationFilter.NEAREST,
      }),
    });
    this.leafNodeTexelSizeUv = new Cartesian2(
      1.0 / leafNodeTextureDimensionX,
      1.0 / leafNodeTextureDimensionY
    );
    this.leafNodeTilesPerRow = leafNodeTilesPerRow;
  }
}

VoxelTraversal.simultaneousRequestCountMaximum = 50;

/**
 * @param {FrameState} frameState
 * @param {Number} keyframeLocation
 * @param {Boolean} recomputeBoundingVolumes
 * @param {Boolean} pauseUpdate
 * @returns {Boolean} True if the voxel grid has any loaded data.
 */
VoxelTraversal.prototype.update = function (
  frameState,
  keyframeLocation,
  recomputeBoundingVolumes,
  pauseUpdate
) {
  const keyframeCount = this._keyframeCount;
  this._keyframeLocation = CesiumMath.clamp(
    keyframeLocation,
    0.0,
    keyframeCount - 1
  );

  if (recomputeBoundingVolumes) {
    recomputeBoundingVolumesRecursive(this, this.rootNode);
  }

  if (!pauseUpdate) {
    const timestamp0 = getTimestamp();
    loadAndUnload(this, frameState);
    const timestamp1 = getTimestamp();
    generateOctree(this, frameState);
    const timestamp2 = getTimestamp();

    const debugStatistics = this._debugPrint;
    if (debugStatistics) {
      const loadAndUnloadTimeMs = timestamp1 - timestamp0;
      const generateOctreeTimeMs = timestamp2 - timestamp1;
      const totalTimeMs = timestamp2 - timestamp0;
      printDebugInformation(
        this,
        loadAndUnloadTimeMs,
        generateOctreeTimeMs,
        totalTimeMs
      );
    }
  }

  const rootNode = this.rootNode;
  const frameNumber = frameState.frameNumber;
  return rootNode.isRenderable(frameNumber);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see VoxelTraversal#destroy
 */
VoxelTraversal.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see VoxelTraversal#isDestroyed
 *
 * @example
 * voxelTraversal = voxelTraversal && voxelTraversal.destroy();
 */
VoxelTraversal.prototype.destroy = function () {
  const megatextures = this.megatextures;
  const megatextureLength = megatextures.length;
  for (let i = 0; i < megatextureLength; i++) {
    megatextures[i] = megatextures[i] && megatextures[i].destroy();
  }

  this.internalNodeTexture =
    this.internalNodeTexture && this.internalNodeTexture.destroy();

  this.leafNodeTexture = this.leafNodeTexture && this.leafNodeTexture.destroy();

  return destroyObject(this);
};

/**
 * @function
 *
 * @param {VoxelTraversal} that
 * @param {SpatialNode} node
 *
 * @private
 */
function recomputeBoundingVolumesRecursive(that, node) {
  const primitive = that._primitive;
  const shape = primitive._shape;
  const dimensions = primitive._provider.dimensions;
  node.computeBoundingVolumes(shape, dimensions);
  if (defined(node.children)) {
    for (let i = 0; i < 8; i++) {
      const child = node.children[i];
      recomputeBoundingVolumesRecursive(that, child);
    }
  }
}

/**
 * Call requestData for each metadata
 *
 * @function
 *
 * @param {VoxelTraversal} that
 * @param {KeyframeNode} keyframeNode
 *
 * @private
 */
function requestTiles(that, keyframeNode) {
  const keys = Object.keys(that.megatextures);
  const length = keys.length;
  for (let i = 0; i < length; i++) {
    const metadataName = keys[i];
    requestData(that, keyframeNode, metadataName);
  }
}
/**
 * @function
 *
 * @param {VoxelTraversal} that
 * @param {KeyframeNode} keyframeNode
 * @param {String} metadataName
 *
 * @private
 */
function requestData(that, keyframeNode, metadataName) {
  if (
    that._simultaneousRequestCount >=
    VoxelTraversal.simultaneousRequestCountMaximum
  ) {
    return;
  }

  const primitive = that._primitive;
  const provider = primitive._provider;
  const keyframe = keyframeNode.keyframe;
  const spatialNode = keyframeNode.spatialNode;
  const tileLevel = spatialNode.level;
  const tileX = spatialNode.x;
  const tileY = spatialNode.y;
  const tileZ = spatialNode.z;

  const postRequestSuccess = function (result) {
    that._simultaneousRequestCount--;
    const length = primitive._provider.types.length;

    if (!defined(result)) {
      keyframeNode.state = VoxelTraversal.LoadState.UNAVAILABLE;
    } else if (result === VoxelTraversal.LoadState.FAILED) {
      keyframeNode.state = VoxelTraversal.LoadState.FAILED;
    } else if (!Array.isArray(result) || result.length !== length) {
      // TODO should this throw runtime error?
      keyframeNode.state = VoxelTraversal.LoadState.FAILED;
    } else {
      const megatextures = that.megatextures;
      for (let i = 0; i < length; i++) {
        const megatexture = megatextures[i];
        const tileVoxelCount =
          megatexture.voxelCountPerTile.x *
          megatexture.voxelCountPerTile.y *
          megatexture.voxelCountPerTile.z;

        const data = result[i];
        const expectedLength = tileVoxelCount * megatexture.channelCount;
        if (data.length === expectedLength) {
          keyframeNode.metadatas[i] = data;
          // State is received only when all metadata requests have been received
          keyframeNode.state = VoxelTraversal.LoadState.RECEIVED;
        } else {
          keyframeNode.state = VoxelTraversal.LoadState.FAILED;
          break;
        }
      }
    }
  };

  const postRequestFailure = function () {
    that._simultaneousRequestCount--;
    keyframeNode.state = VoxelTraversal.LoadState.FAILED;
  };

  const promise = provider.requestData({
    tileLevel: tileLevel,
    tileX: tileX,
    tileY: tileY,
    tileZ: tileZ,
    keyframe: keyframe,
    metadataName: metadataName,
  });

  if (defined(promise)) {
    that._simultaneousRequestCount++;
    keyframeNode.state = VoxelTraversal.LoadState.RECEIVING;
    promise.then(postRequestSuccess).catch(postRequestFailure);
  } else {
    keyframeNode.state = VoxelTraversal.LoadState.FAILED;
  }
}

/**
 * @function
 *
 * @param {Number} x
 * @returns {Number}
 *
 * @private
 */
function mapInfiniteRangeToZeroOne(x) {
  return x / (1.0 + x);
}

/**
 * @function
 *
 * @param {VoxelTraversal} that
 * @param {FrameState} frameState
 *
 * @private
 */
function loadAndUnload(that, frameState) {
  const frameNumber = frameState.frameNumber;
  const primitive = that._primitive;
  const shape = primitive._shape;
  const voxelDimensions = primitive._provider.dimensions;
  const targetScreenSpaceError = primitive._screenSpaceError;
  const priorityQueue = that._priorityQueue;
  const keyframeLocation = that._keyframeLocation;
  const keyframeCount = that._keyframeCount;
  const rootNode = that.rootNode;

  const cameraPosition = frameState.camera.positionWC;
  const screenSpaceErrorDenominator = frameState.camera.frustum.sseDenominator;
  const screenHeight =
    frameState.context.drawingBufferHeight / frameState.pixelRatio;
  const screenSpaceErrorMultiplier = screenHeight / screenSpaceErrorDenominator;

  /**
   * @ignore
   * @param {SpatialNode} spatialNode
   * @param {Number} visibilityPlaneMask
   */
  function addToQueueRecursive(spatialNode, visibilityPlaneMask) {
    spatialNode.computeScreenSpaceError(
      cameraPosition,
      screenSpaceErrorMultiplier
    );

    visibilityPlaneMask = spatialNode.visibility(
      frameState,
      visibilityPlaneMask
    );
    if (visibilityPlaneMask === CullingVolume.MASK_OUTSIDE) {
      return;
    }
    spatialNode.visitedFrameNumber = frameNumber;

    const previousKeyframe = CesiumMath.clamp(
      Math.floor(keyframeLocation),
      0,
      keyframeCount - 2
    );
    const nextKeyframe = previousKeyframe + 1;

    // Create keyframe nodes at the playhead.
    // If they already exist, nothing will be created.
    if (keyframeCount === 1) {
      spatialNode.createKeyframeNode(0);
    } else {
      // // Always keep two keyframes loaded even if the playhead is directly on a keyframe.
      // spatialNode.createKeyframeNode(previousKeyframe);
      // spatialNode.createKeyframeNode(nextKeyframe);

      // Create all keyframes
      // eslint-disable-next-line no-lonely-if
      if (spatialNode.keyframeNodes.length !== keyframeCount) {
        for (let k = 0; k < keyframeCount; k++) {
          spatialNode.createKeyframeNode(k);
        }
      }
    }
    const ssePriority = mapInfiniteRangeToZeroOne(spatialNode.screenSpaceError);

    let hasLoadedKeyframe = false;
    const keyframeNodes = spatialNode.keyframeNodes;
    for (
      let keyframeIndex = 0;
      keyframeIndex < keyframeNodes.length;
      keyframeIndex++
    ) {
      const keyframeNode = keyframeNodes[keyframeIndex];
      const keyframe = keyframeNode.keyframe;

      // // Prioritize all keyframes equally
      // keyframeNode.priority = ssePriority;

      // // Prioritize ONLY keyframes adjacent to the playhead
      // keyframeNode.priority = ssePriority;
      // if (keyframe !== previousKeyframe && keyframe !== nextKeyframe) {
      //     keyframeNode.priority = -Number.MAX_VALUE;
      // }

      // // Prioritize keyframes closest to the playhead
      // keyframeNode.priority = ssePriority;
      // const keyframeDifference = Math.min(Math.abs(keyframe - previousKeyframe), Math.abs(keyframe - nextKeyframe));
      // keyframeNode.priority -= keyframeDifference;

      // Balanced prioritization
      const keyframeDifference = Math.min(
        Math.abs(keyframe - previousKeyframe),
        Math.abs(keyframe - nextKeyframe)
      );
      const maxKeyframeDifference = Math.max(
        previousKeyframe,
        keyframeCount - nextKeyframe - 1,
        1
      );
      const keyframeFactor = Math.pow(
        1.0 - keyframeDifference / maxKeyframeDifference,
        4.0
      );
      const binaryTreeFactor = Math.exp(
        -that._binaryTreeKeyframeWeighting[keyframe]
      );
      keyframeNode.priority = 10.0 * ssePriority;
      keyframeNode.priority += CesiumMath.lerp(
        binaryTreeFactor,
        keyframeFactor,
        0.15 + 0.85 * keyframeFactor
      );

      if (
        keyframeNode.state !== VoxelTraversal.LoadState.UNAVAILABLE &&
        keyframeNode.state !== VoxelTraversal.LoadState.FAILED &&
        keyframeNode.priority !== -Number.MAX_VALUE
      ) {
        priorityQueue.insert(keyframeNode);
      }
      if (keyframeNode.state === VoxelTraversal.LoadState.LOADED) {
        hasLoadedKeyframe = true;
      }
    }

    const meetsScreenSpaceError =
      spatialNode.screenSpaceError < targetScreenSpaceError;
    if (!meetsScreenSpaceError && hasLoadedKeyframe) {
      if (!defined(spatialNode.children)) {
        const childLevel = spatialNode.level + 1;
        const childXMin = spatialNode.x * 2 + 0;
        const childXMax = spatialNode.x * 2 + 1;
        const childYMin = spatialNode.y * 2 + 0;
        const childYMax = spatialNode.y * 2 + 1;
        const childZMin = spatialNode.z * 2 + 0;
        const childZMax = spatialNode.z * 2 + 1;

        spatialNode.children = new Array(
          new SpatialNode(
            childLevel,
            childXMin,
            childYMin,
            childZMin,
            spatialNode,
            shape,
            voxelDimensions
          ),
          new SpatialNode(
            childLevel,
            childXMax,
            childYMin,
            childZMin,
            spatialNode,
            shape,
            voxelDimensions
          ),
          new SpatialNode(
            childLevel,
            childXMin,
            childYMax,
            childZMin,
            spatialNode,
            shape,
            voxelDimensions
          ),
          new SpatialNode(
            childLevel,
            childXMax,
            childYMax,
            childZMin,
            spatialNode,
            shape,
            voxelDimensions
          ),
          new SpatialNode(
            childLevel,
            childXMin,
            childYMin,
            childZMax,
            spatialNode,
            shape,
            voxelDimensions
          ),
          new SpatialNode(
            childLevel,
            childXMax,
            childYMin,
            childZMax,
            spatialNode,
            shape,
            voxelDimensions
          ),
          new SpatialNode(
            childLevel,
            childXMin,
            childYMax,
            childZMax,
            spatialNode,
            shape,
            voxelDimensions
          ),
          new SpatialNode(
            childLevel,
            childXMax,
            childYMax,
            childZMax,
            spatialNode,
            shape,
            voxelDimensions
          )
        );
      }
      for (let childIndex = 0; childIndex < 8; childIndex++) {
        const child = spatialNode.children[childIndex];
        addToQueueRecursive(child, visibilityPlaneMask);
      }
    } else {
      // Free up memory
      spatialNode.children = undefined;
    }
  }

  priorityQueue.reset();
  addToQueueRecursive(rootNode, CullingVolume.MASK_INDETERMINATE);

  const highPriorityKeyframeNodes = that._highPriorityKeyframeNodes;
  let highPriorityKeyframeNodeCount = 0;
  let highPriorityKeyframeNode;
  while (priorityQueue.length > 0) {
    highPriorityKeyframeNode = priorityQueue.removeMaximum();
    highPriorityKeyframeNode.highPriorityFrameNumber = frameNumber;
    highPriorityKeyframeNodes[
      highPriorityKeyframeNodeCount
    ] = highPriorityKeyframeNode;
    highPriorityKeyframeNodeCount++;
  }

  const keyframeNodesInMegatexture = that._keyframeNodesInMegatexture;
  // TODO: some of the megatexture state should be stored once, not duplicate for each megatexture
  const megatexture = that.megatextures[0];
  const keyframeNodesInMegatextureCount = megatexture.occupiedCount;
  keyframeNodesInMegatexture.length = keyframeNodesInMegatextureCount;
  keyframeNodesInMegatexture.sort(function (a, b) {
    if (a.highPriorityFrameNumber === b.highPriorityFrameNumber) {
      return b.priority - a.priority;
    }
    return b.highPriorityFrameNumber - a.highPriorityFrameNumber;
  });

  let destroyedCount = 0;
  let addedCount = 0;

  for (
    let highPriorityKeyframeNodeIndex = 0;
    highPriorityKeyframeNodeIndex < highPriorityKeyframeNodeCount;
    highPriorityKeyframeNodeIndex++
  ) {
    highPriorityKeyframeNode =
      highPriorityKeyframeNodes[highPriorityKeyframeNodeIndex];

    if (
      highPriorityKeyframeNode.state === VoxelTraversal.LoadState.LOADED ||
      highPriorityKeyframeNode.spatialNode === undefined
    ) {
      // Already loaded, so nothing to do.
      // Or destroyed when adding a higher priority node
      continue;
    }
    if (highPriorityKeyframeNode.state === VoxelTraversal.LoadState.UNLOADED) {
      requestTiles(that, highPriorityKeyframeNode);
    }
    if (highPriorityKeyframeNode.state === VoxelTraversal.LoadState.RECEIVED) {
      let addNodeIndex = 0;
      if (megatexture.isFull()) {
        // If the megatexture is full, try removing a discardable node with the lowest priority.
        addNodeIndex = keyframeNodesInMegatextureCount - 1 - destroyedCount;
        destroyedCount++;

        const discardNode = keyframeNodesInMegatexture[addNodeIndex];
        discardNode.spatialNode.destroyKeyframeNode(
          discardNode,
          that.megatextures
        );
      } else {
        addNodeIndex = keyframeNodesInMegatextureCount + addedCount;
        addedCount++;
      }
      highPriorityKeyframeNode.spatialNode.addKeyframeNodeToMegatextures(
        highPriorityKeyframeNode,
        that.megatextures
      );
      keyframeNodesInMegatexture[addNodeIndex] = highPriorityKeyframeNode;
    }
  }
}

/**
 * @function
 *
 * @param {VoxelTraversal} that
 *
 * @private
 */
function printDebugInformation(
  that,
  loadAndUnloadTimeMs,
  generateOctreeTimeMs,
  totalTimeMs
) {
  const keyframeCount = that._keyframeCount;
  const rootNode = that.rootNode;

  const loadStateCount = Object.keys(VoxelTraversal.LoadState).length;
  const loadStatesByKeyframe = new Array(loadStateCount);
  const loadStateByCount = new Array(loadStateCount);
  let nodeCountTotal = 0;

  for (
    let loadStateIndex = 0;
    loadStateIndex < loadStateCount;
    loadStateIndex++
  ) {
    const keyframeArray = new Array(keyframeCount);
    loadStatesByKeyframe[loadStateIndex] = keyframeArray;
    for (let i = 0; i < keyframeCount; i++) {
      keyframeArray[i] = 0;
    }
    loadStateByCount[loadStateIndex] = 0;
  }

  /**
   * @ignore
   * @param {SpatialNode} node
   */
  function traverseRecursive(node) {
    const keyframeNodes = node.keyframeNodes;
    for (
      let keyframeIndex = 0;
      keyframeIndex < keyframeNodes.length;
      keyframeIndex++
    ) {
      const keyframeNode = keyframeNodes[keyframeIndex];
      const keyframe = keyframeNode.keyframe;
      const state = keyframeNode.state;
      loadStatesByKeyframe[state][keyframe] += 1;
      loadStateByCount[state] += 1;
      nodeCountTotal++;
    }

    if (defined(node.children)) {
      for (let childIndex = 0; childIndex < 8; childIndex++) {
        const child = node.children[childIndex];
        traverseRecursive(child);
      }
    }
  }
  traverseRecursive(rootNode);

  const loadedKeyframeStatistics = `KEYFRAMES: ${
    loadStatesByKeyframe[VoxelTraversal.LoadState.LOADED]
  }`;
  const loadStateStatistics =
    `UNLOADED: ${loadStateByCount[VoxelTraversal.LoadState.UNLOADED]} | ` +
    `RECEIVING: ${loadStateByCount[VoxelTraversal.LoadState.RECEIVING]} | ` +
    `RECEIVED: ${loadStateByCount[VoxelTraversal.LoadState.RECEIVED]} | ` +
    `LOADED: ${loadStateByCount[VoxelTraversal.LoadState.LOADED]} | ` +
    `FAILED: ${loadStateByCount[VoxelTraversal.LoadState.FAILED]} | ` +
    `UNAVAILABLE: ${
      loadStateByCount[VoxelTraversal.LoadState.UNAVAILABLE]
    } | ` +
    `TOTAL: ${nodeCountTotal}`;

  const loadAndUnloadTimeMsRounded =
    Math.round(loadAndUnloadTimeMs * 100) / 100;
  const generateOctreeTimeMsRounded =
    Math.round(generateOctreeTimeMs * 100) / 100;
  const totalTimeMsRounded = Math.round(totalTimeMs * 100) / 100;

  const timerStatistics =
    `LOAD: ${loadAndUnloadTimeMsRounded} | ` +
    `OCT: ${generateOctreeTimeMsRounded} | ` +
    `ALL: ${totalTimeMsRounded}`;

  console.log(
    `${loadedKeyframeStatistics} || ${loadStateStatistics} || ${timerStatistics}`
  );
}

VoxelTraversal.LoadState = {
  UNLOADED: 0, // Has no data and is in dormant state
  RECEIVING: 1, // Is waiting on data from the provider
  RECEIVED: 2, // Received data from the provider
  LOADED: 3, // Processed data from provider
  FAILED: 4, // Failed to receive data from the provider
  UNAVAILABLE: 5, // No data available for this tile
};

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
 * Finds the index of the keyframe if it exists, or the complement (~) of the index where it would be in the sorted array.
 *
 * @param {Number} keyframe
 * @returns {Number}
 */
SpatialNode.prototype.findKeyframeIndex = function (keyframe) {
  const keyframeNodes = this.keyframeNodes;
  scratchBinarySearchKeyframeNode.keyframe = keyframe;
  const index = binarySearch(
    keyframeNodes,
    scratchBinarySearchKeyframeNode,
    KeyframeNode.searchComparator
  );
  return index;
};

/**
 * Finds the index of the renderable keyframe if it exists, or the complement (~) of the index where it would be in the sorted array.
 *
 * @param {Number} keyframe
 * @returns {Number}
 */
SpatialNode.prototype.findRenderableKeyframeIndex = function (keyframe) {
  const renderableKeyframeNodes = this.renderableKeyframeNodes;
  scratchBinarySearchKeyframeNode.keyframe = keyframe;
  const index = binarySearch(
    renderableKeyframeNodes,
    scratchBinarySearchKeyframeNode,
    KeyframeNode.searchComparator
  );
  return index;
};

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
      let keyframeNodeIndexPrev = spatialNode.findRenderableKeyframeIndex(
        targetKeyframePrev
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

      // // Prioritize visual quality
      // const distancePrev = levelDistance === 0.0 ? 0.0 : Number.MAX_VALUE;
      // const distanceNext = levelDistance === 0.0 ? 0.0 : Number.MAX_VALUE;

      // // Prioritize temporal quality
      // const distancePrev = keyframeDistancePrev >= 0 ? keyframeDistancePrev : Number.MAX_VALUE + keyframeDistancePrev;
      // const distanceNext = keyframeDistanceNext >= 0 ? keyframeDistanceNext : Number.MAX_VALUE + keyframeDistanceNext;

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
  let index = this.findKeyframeIndex(keyframe);
  if (index < 0) {
    index = ~index; // convert to insertion index
    const keyframeNode = new KeyframeNode(this, keyframe);
    this.keyframeNodes.splice(index, 0, keyframeNode);
  }
};
/**
 * @param {KeyframeNode} keyframeNode
 * @param {Megatexture} megatexture
 */
SpatialNode.prototype.destroyKeyframeNode = function (
  keyframeNode,
  megatextures
) {
  const keyframe = keyframeNode.keyframe;
  const keyframeIndex = this.findKeyframeIndex(keyframe);
  if (keyframeIndex < 0) {
    throw new DeveloperError("Keyframe node does not exist.");
  }

  const keyframeNodes = this.keyframeNodes;
  keyframeNodes.splice(keyframeIndex, 1);

  if (keyframeNode.megatextureIndex !== -1) {
    const megatextureArray = Object.keys(megatextures).map(function (key) {
      return megatextures[key];
    }); // Object.values workaround
    const numberOfMegatextures = megatextureArray.length;
    for (let i = 0; i < numberOfMegatextures; i++) {
      megatextureArray[i].remove(keyframeNode.megatextureIndex);
    }

    const renderableKeyframeNodeIndex = this.findRenderableKeyframeIndex(
      keyframe
    );
    if (renderableKeyframeNodeIndex < 0) {
      throw new DeveloperError("Renderable keyframe node does not exist.");
    }

    const renderableKeyframeNodes = this.renderableKeyframeNodes;
    renderableKeyframeNodes.splice(renderableKeyframeNodeIndex, 1);
  }

  keyframeNode.spatialNode = undefined;
  keyframeNode.state = VoxelTraversal.LoadState.UNLOADED;
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
    keyframeNode.state !== VoxelTraversal.LoadState.RECEIVED ||
    keyframeNode.megatextureIndex !== -1 ||
    keyframeNode.metadatas.length !== megatextures.length
  ) {
    throw new DeveloperError("Keyframe node cannot be added to megatexture");
  }

  const length = megatextures.length;
  for (let i = 0; i < length; i++) {
    const megatexture = megatextures[i];
    keyframeNode.megatextureIndex = megatexture.add(keyframeNode.metadatas[i]);
    keyframeNode.metadatas[i] = undefined; // data is in megatexture so no need to hold onto it
  }

  keyframeNode.state = VoxelTraversal.LoadState.LOADED;

  const renderableKeyframeNodes = this.renderableKeyframeNodes;
  let renderableKeyframeNodeIndex = this.findRenderableKeyframeIndex(
    keyframeNode.keyframe
  );
  if (renderableKeyframeNodeIndex >= 0) {
    throw new DeveloperError("Keyframe already renderable");
  }
  renderableKeyframeNodeIndex = ~renderableKeyframeNodeIndex;
  renderableKeyframeNodes.splice(renderableKeyframeNodeIndex, 0, keyframeNode);
};

/**
 * @param {KeyframeNode} keyframeNode
 * @param {Megatexture} megatexture
 */
SpatialNode.prototype.addKeyframeNodeToMegatexture = function (
  keyframeNode,
  megatexture
) {
  if (
    keyframeNode.state !== VoxelTraversal.LoadState.RECEIVED ||
    keyframeNode.megatextureIndex !== -1 ||
    !defined(keyframeNode.metadatas[megatexture.metadataName])
  ) {
    throw new DeveloperError("Keyframe node cannot be added to megatexture");
  }

  keyframeNode.megatextureIndex = megatexture.add(
    keyframeNode.metadatas[megatexture.metadataName]
  );
  keyframeNode.metadatas[megatexture.metadataName] = undefined; // data is in megatexture so no need to hold onto it
  keyframeNode.state = VoxelTraversal.LoadState.LOADED;

  const renderableKeyframeNodes = this.renderableKeyframeNodes;
  let renderableKeyframeNodeIndex = this.findRenderableKeyframeIndex(
    keyframeNode.keyframe
  );
  if (renderableKeyframeNodeIndex >= 0) {
    throw new DeveloperError("Keyframe already renderable");
  }
  renderableKeyframeNodeIndex = ~renderableKeyframeNodeIndex;
  renderableKeyframeNodes.splice(renderableKeyframeNodeIndex, 0, keyframeNode);
};

/**
 * @param {Number} frameNumber
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

/**
 * @alias KeyframeNode
 * @constructor
 *
 * @param {SpatialNode} spatialNode
 * @param {Number} keyframe
 *
 * @private
 */
function KeyframeNode(spatialNode, keyframe) {
  this.spatialNode = spatialNode;
  this.keyframe = keyframe;
  this.state = VoxelTraversal.LoadState.UNLOADED;
  this.metadatas = [];
  this.megatextureIndex = -1;
  this.priority = -Number.MAX_VALUE;
  this.highPriorityFrameNumber = -1;
}

/**
 * @param {KeyframeNode} a
 * @param {KeyframeNode} b
 */
KeyframeNode.priorityComparator = function (a, b) {
  return a.priority - b.priority;
};

/**
 * @param {KeyframeNode} a
 * @param {KeyframeNode} b
 */
KeyframeNode.searchComparator = function (a, b) {
  return a.keyframe - b.keyframe;
};

// GPU Octree Layout
// (shown as binary tree instead of octree for demonstration purposes)
//
// Tree representation:
//           0
//          / \
//         /   \
//        /     \
//       1       3
//      / \     / \
//     L0  2   L3 L4
//        / \
//       L1 L2
//
//
// Array representation:
// L = leaf index
// * = index to parent node
// index:   0_______  1________  2________  3_________
// array:  [*0, 1, 3, *0, L0, 2, *1 L1, L2, *0, L3, L4]
//
// The array is generated from a depth-first traversal. The end result could be an unbalanced tree,
// so the parent index is stored at each node to make it possible to traverse upwards.

const GpuOctreeFlag = {
  // Data is an octree index.
  INTERNAL: 0,
  // Data is a leaf node.
  LEAF: 1,
  // When leaf data is packed in the octree and there's a node that is forced to
  // render but has no data of its own (such as when its siblings are renderable but it
  // is not), signal that it's using its parent's data.
  PACKED_LEAF_FROM_PARENT: 2,
};

/**
 * @function
 *
 * @param {VoxelTraversal} that
 * @param {FrameState} frameState
 */
function generateOctree(that, frameState) {
  const keyframeLocation = that._keyframeLocation;
  const useLeafNodes = that._useLeafNodeTexture;
  const frameNumber = frameState.frameNumber;

  let internalNodeCount = 0;
  let leafNodeCount = 0;
  const internalNodeOctreeData = [];
  const leafNodeOctreeData = [];

  /**
   * @ignore
   * @param {SpatialNode} node
   * @param {Number} childOctreeIndex
   * @param {Number} childEntryIndex
   * @param {Number} parentOctreeIndex
   * @param {Number} parentEntryIndex
   */
  function buildOctree(
    node,
    childOctreeIndex,
    childEntryIndex,
    parentOctreeIndex,
    parentEntryIndex
  ) {
    let hasRenderableChildren = false;
    if (defined(node.children)) {
      for (let c = 0; c < 8; c++) {
        const childNode = node.children[c];
        childNode.computeSurroundingRenderableKeyframeNodes(keyframeLocation);
        if (childNode.isRenderable(frameNumber)) {
          hasRenderableChildren = true;
        }
      }
    }

    if (hasRenderableChildren) {
      // Point the parent and child octree indexes at each other
      internalNodeOctreeData[parentEntryIndex] =
        (GpuOctreeFlag.INTERNAL << 16) | childOctreeIndex;
      internalNodeOctreeData[childEntryIndex] = parentOctreeIndex;
      internalNodeCount++;

      // Recurse over children
      parentOctreeIndex = childOctreeIndex;
      parentEntryIndex = parentOctreeIndex * 9 + 1;
      for (let cc = 0; cc < 8; cc++) {
        const child = node.children[cc];
        childOctreeIndex = internalNodeCount;
        childEntryIndex = childOctreeIndex * 9 + 0;
        buildOctree(
          child,
          childOctreeIndex,
          childEntryIndex,
          parentOctreeIndex,
          parentEntryIndex + cc
        );
      }
    } else {
      // Store the leaf node information instead
      // Recursion stops here because there are no renderable children
      if (useLeafNodes) {
        const previousKeyframeNode = node.renderableKeyframeNodePrevious;
        const nextKeyframeNode = node.renderableKeyframeNodeNext;
        leafNodeOctreeData[leafNodeCount * 5 + 0] =
          node.renderableKeyframeNodeLerp;
        leafNodeOctreeData[leafNodeCount * 5 + 1] =
          node.level - previousKeyframeNode.spatialNode.level;
        leafNodeOctreeData[leafNodeCount * 5 + 2] =
          node.level - nextKeyframeNode.spatialNode.level;
        leafNodeOctreeData[leafNodeCount * 5 + 3] =
          previousKeyframeNode.megatextureIndex;
        leafNodeOctreeData[leafNodeCount * 5 + 4] =
          nextKeyframeNode.megatextureIndex;
        internalNodeOctreeData[parentEntryIndex] =
          (GpuOctreeFlag.LEAF << 16) | leafNodeCount;
      } else {
        const keyframeNode = node.renderableKeyframeNodePrevious;
        const levelDifference = node.level - keyframeNode.spatialNode.level;
        const flag =
          levelDifference === 0
            ? GpuOctreeFlag.LEAF
            : GpuOctreeFlag.PACKED_LEAF_FROM_PARENT;
        internalNodeOctreeData[parentEntryIndex] =
          (flag << 16) | keyframeNode.megatextureIndex;
      }
      leafNodeCount++;
    }
  }

  const rootNode = that.rootNode;
  rootNode.computeSurroundingRenderableKeyframeNodes(keyframeLocation);
  if (rootNode.isRenderable(frameNumber)) {
    buildOctree(rootNode, 0, 0, 0, 0);
  }

  /**
   * @ignore
   * @param {Number[]} data
   * @param {Number} texelsPerTile
   * @param {Number} tilesPerRow
   * @param {Texture} texture
   */
  function copyToInternalNodeTexture(
    data,
    texelsPerTile,
    tilesPerRow,
    texture
  ) {
    const channelCount = PixelFormat.componentsLength(texture.pixelFormat);
    const tileCount = Math.ceil(data.length / texelsPerTile);
    const copyWidth = Math.max(
      1,
      texelsPerTile * Math.min(tileCount, tilesPerRow)
    );
    const copyHeight = Math.max(1, Math.ceil(tileCount / tilesPerRow));

    const textureData = new Uint8Array(copyWidth * copyHeight * channelCount);
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      const startIndex = i * channelCount;
      for (let j = 0; j < channelCount; j++) {
        textureData[startIndex + j] = (val >>> (j * 8)) & 0xff;
      }
    }

    const source = {
      arrayBufferView: textureData,
      width: copyWidth,
      height: copyHeight,
    };

    const copyOptions = {
      source: source,
      xOffset: 0,
      yOffset: 0,
    };

    texture.copyFrom(copyOptions);
  }

  /**
   * @ignore
   * @param {Number[]} data
   * @param {Number} texelsPerTile
   * @param {Number} tilesPerRow
   * @param {Texture} texture
   */
  function copyToLeafNodeTexture(data, texelsPerTile, tilesPerRow, texture) {
    const channelCount = PixelFormat.componentsLength(texture.pixelFormat);
    const datasPerTile = 5;
    const tileCount = Math.ceil(data.length / datasPerTile);
    const copyWidth = Math.max(
      1,
      texelsPerTile * Math.min(tileCount, tilesPerRow)
    );
    const copyHeight = Math.max(1, Math.ceil(tileCount / tilesPerRow));

    const textureData = new Uint8Array(copyWidth * copyHeight * channelCount);
    for (let tileIndex = 0; tileIndex < tileCount; tileIndex++) {
      const timeLerp = data[tileIndex * datasPerTile + 0];
      const previousKeyframeLevelsAbove = data[tileIndex * datasPerTile + 1];
      const nextKeyframeLevelsAbove = data[tileIndex * datasPerTile + 2];
      const previousKeyframeMegatextureIndex =
        data[tileIndex * datasPerTile + 3];
      const nextKeyframeMegatextureIndex = data[tileIndex * datasPerTile + 4];

      const timeLerpCompressed = CesiumMath.clamp(
        Math.floor(65536 * timeLerp),
        0,
        65535
      );
      textureData[tileIndex * 8 + 0] = (timeLerpCompressed >>> 0) & 0xff;
      textureData[tileIndex * 8 + 1] = (timeLerpCompressed >>> 8) & 0xff;
      textureData[tileIndex * 8 + 2] = previousKeyframeLevelsAbove & 0xff;
      textureData[tileIndex * 8 + 3] = nextKeyframeLevelsAbove & 0xff;
      textureData[tileIndex * 8 + 4] =
        (previousKeyframeMegatextureIndex >>> 0) & 0xff;
      textureData[tileIndex * 8 + 5] =
        (previousKeyframeMegatextureIndex >>> 8) & 0xff;
      textureData[tileIndex * 8 + 6] =
        (nextKeyframeMegatextureIndex >>> 0) & 0xff;
      textureData[tileIndex * 8 + 7] =
        (nextKeyframeMegatextureIndex >>> 8) & 0xff;
    }

    const source = {
      arrayBufferView: textureData,
      width: copyWidth,
      height: copyHeight,
    };

    const copyOptions = {
      source: source,
      xOffset: 0,
      yOffset: 0,
    };

    texture.copyFrom(copyOptions);
  }

  copyToInternalNodeTexture(
    internalNodeOctreeData,
    9,
    that.internalNodeTilesPerRow,
    that.internalNodeTexture
  );
  if (useLeafNodes) {
    copyToLeafNodeTexture(
      leafNodeOctreeData,
      2,
      that.leafNodeTilesPerRow,
      that.leafNodeTexture
    );
  }
}

/**
 * @param {Number} tileCount
 * @param {Cartesian3} dimensions
 * @param {MetadataType[]} types
 * @param {MetadataComponentType[]} componentTypes
 */
VoxelTraversal.getApproximateTextureMemoryByteLength = function (
  tileCount,
  dimensions,
  types,
  componentTypes
) {
  let textureMemoryByteLength = 0;

  const length = types.length;
  for (let i = 0; i < length; i++) {
    const type = types[i];
    const componentType = componentTypes[i];
    const componentCount = MetadataType.getComponentCount(type);

    textureMemoryByteLength += Megatexture.getApproximateTextureMemoryByteLength(
      tileCount,
      dimensions,
      componentCount,
      componentType
    );
  }

  return textureMemoryByteLength;
};

/**
 * @alias Megatexture
 * @constructor
 *
 * @param {Context} context
 * @param {Cartesian3} dimensions
 * @param {Number} channelCount
 * @param {MetadataComponentType} componentType
 * @param {Number} [textureMemoryByteLength]
 *
 * @private
 */
function Megatexture(
  context,
  dimensions,
  channelCount,
  componentType,
  textureMemoryByteLength
) {
  // TODO there are a lot of texture packing rules, see https://github.com/CesiumGS/cesium/issues/9572
  // Unsigned short textures not allowed in webgl 1, so treat as float
  if (componentType === MetadataComponentType.UNSIGNED_SHORT) {
    componentType = MetadataComponentType.FLOAT32;
  }

  const supportsFloatingPointTexture = context.floatingPointTexture;
  if (
    componentType === MetadataComponentType.FLOAT32 &&
    !supportsFloatingPointTexture
  ) {
    throw new RuntimeError("Floating point texture not supported");
  }

  // TODO support more
  let pixelType;
  if (
    componentType === MetadataComponentType.FLOAT32 ||
    componentType === MetadataComponentType.FLOAT64
  ) {
    pixelType = PixelDatatype.FLOAT;
  } else if (componentType === MetadataComponentType.UINT8) {
    pixelType = PixelDatatype.UNSIGNED_BYTE;
  }

  let pixelFormat;
  if (channelCount === 1) {
    pixelFormat = PixelFormat.LUMINANCE;
  } else if (channelCount === 2) {
    pixelFormat = PixelFormat.LUMINANCE_ALPHA;
  } else if (channelCount === 3) {
    pixelFormat = PixelFormat.RGB;
  } else if (channelCount === 4) {
    pixelFormat = PixelFormat.RGBA;
  }

  const maximumTextureMemoryByteLength = 512 * 1024 * 1024;
  const defaultTextureMemoryByteLength = 128 * 1024 * 1024;
  textureMemoryByteLength = Math.min(
    defaultValue(textureMemoryByteLength, defaultTextureMemoryByteLength),
    maximumTextureMemoryByteLength
  );
  const maximumTextureDimensionContext = ContextLimits.maximumTextureSize;
  const componentTypeByteLength = MetadataComponentType.getSizeInBytes(
    componentType
  );
  const texelCount = Math.floor(
    textureMemoryByteLength / (channelCount * componentTypeByteLength)
  );
  const textureDimension = Math.min(
    maximumTextureDimensionContext,
    CesiumMath.previousPowerOfTwo(Math.floor(Math.sqrt(texelCount)))
  );

  const sliceCountPerRegionX = Math.ceil(Math.sqrt(dimensions.x));
  const sliceCountPerRegionY = Math.ceil(dimensions.z / sliceCountPerRegionX);
  const voxelCountPerRegionX = sliceCountPerRegionX * dimensions.x;
  const voxelCountPerRegionY = sliceCountPerRegionY * dimensions.y;
  const regionCountPerMegatextureX = Math.floor(
    textureDimension / voxelCountPerRegionX
  );
  const regionCountPerMegatextureY = Math.floor(
    textureDimension / voxelCountPerRegionY
  );

  // TODO can this happen?
  if (regionCountPerMegatextureX === 0 || regionCountPerMegatextureY === 0) {
    throw new RuntimeError("Tileset is too large to fit into megatexture");
  }

  /**
   * @type {Number}
   * @readonly
   */
  this.channelCount = channelCount;

  /**
   * @type {MetadataComponentType}
   * @readonly
   */
  this.componentType = componentType;

  /**
   * @type {Cartesian3}
   * @readonly
   */
  this.voxelCountPerTile = Cartesian3.clone(dimensions, new Cartesian3());

  /**
   * @type {Number}
   * @readonly
   */
  this.maximumTileCount =
    regionCountPerMegatextureX * regionCountPerMegatextureY;

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.regionCountPerMegatexture = new Cartesian2(
    regionCountPerMegatextureX,
    regionCountPerMegatextureY
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.voxelCountPerRegion = new Cartesian2(
    voxelCountPerRegionX,
    voxelCountPerRegionY
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.sliceCountPerRegion = new Cartesian2(
    sliceCountPerRegionX,
    sliceCountPerRegionY
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.voxelSizeUv = new Cartesian2(
    1.0 / textureDimension,
    1.0 / textureDimension
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.sliceSizeUv = new Cartesian2(
    dimensions.x / textureDimension,
    dimensions.y / textureDimension
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.regionSizeUv = new Cartesian2(
    voxelCountPerRegionX / textureDimension,
    voxelCountPerRegionY / textureDimension
  );

  /**
   * @type {Texture}
   * @readonly
   */
  this.texture = new Texture({
    context: context,
    pixelFormat: pixelFormat,
    pixelDatatype: pixelType,
    flipY: false,
    width: textureDimension,
    height: textureDimension,
    sampler: new Sampler({
      wrapS: TextureWrap.CLAMP_TO_EDGE,
      wrapT: TextureWrap.CLAMP_TO_EDGE,
      minificationFilter: TextureMinificationFilter.LINEAR,
      magnificationFilter: TextureMagnificationFilter.LINEAR,
    }),
  });

  const ArrayType = MetadataComponentType.toTypedArrayType(componentType);

  /**
   * @type {Array}
   */
  this.tileVoxelDataTemp = new ArrayType(
    voxelCountPerRegionX * voxelCountPerRegionY * channelCount
  );

  /**
   * @type {MegatextureNode[]}
   * @readonly
   */
  this.nodes = new Array(this.maximumTileCount);
  for (let tileIndex = 0; tileIndex < this.maximumTileCount; tileIndex++) {
    this.nodes[tileIndex] = new MegatextureNode(tileIndex);
  }
  for (let tileIndex = 0; tileIndex < this.maximumTileCount; tileIndex++) {
    const node = this.nodes[tileIndex];
    node.previousNode = tileIndex > 0 ? this.nodes[tileIndex - 1] : undefined;
    node.nextNode =
      tileIndex < this.maximumTileCount - 1
        ? this.nodes[tileIndex + 1]
        : undefined;
  }

  /**
   * @type {MegatextureNode}
   * @readonly
   */
  this.occupiedList = undefined;

  /**
   * @type {MegatextureNode}
   * @readonly
   */
  this.emptyList = this.nodes[0];

  /**
   * @type {Number}
   * @readonly
   */
  this.occupiedCount = 0;
}

/**
 * @alias MegatextureNode
 * @constructor
 *
 * @param {Number} index
 *
 * @private
 */
function MegatextureNode(index) {
  /**
   * @type {Number}
   */
  this.index = index;

  /**
   * @type {MegatextureNode}
   */
  this.nextNode = undefined;

  /**
   * @type {MegatextureNode}
   */
  this.previousNode = undefined;
}

/**
 * @param {Array} data
 * @returns {Number}
 */
Megatexture.prototype.add = function (data) {
  if (this.isFull()) {
    throw new DeveloperError("Trying to add when there are no empty spots");
  }

  // remove head of empty list
  const node = this.emptyList;
  this.emptyList = this.emptyList.nextNode;
  if (defined(this.emptyList)) {
    this.emptyList.previousNode = undefined;
  }

  // make head of occupied list
  node.nextNode = this.occupiedList;
  if (defined(node.nextNode)) {
    node.nextNode.previousNode = node;
  }
  this.occupiedList = node;

  const index = node.index;
  this.writeDataToTexture(index, data);

  this.occupiedCount++;
  return index;
};

/**
 * @param {Number} index
 */
Megatexture.prototype.remove = function (index) {
  if (index < 0 || index >= this.maximumTileCount) {
    throw new DeveloperError("Megatexture index out of bounds");
  }

  // remove from list
  const node = this.nodes[index];
  if (defined(node.previousNode)) {
    node.previousNode.nextNode = node.nextNode;
  }
  if (defined(node.nextNode)) {
    node.nextNode.previousNode = node.previousNode;
  }

  // make head of empty list
  node.nextNode = this.emptyList;
  if (defined(node.nextNode)) {
    node.nextNode.previousNode = node;
  }
  node.previousNode = undefined;
  this.emptyList = node;
  this.occupiedCount--;
};

/**
 * @returns {Boolean}
 */
Megatexture.prototype.isFull = function () {
  return this.emptyList === undefined;
};

/**
 * @param {Number} tileCount
 * @param {Cartesian3} dimensions
 * @param {Number} channelCount number of channels in the metadata. Must be 1 to 4.
 * @param {MetadataComponentType} componentType
 * @returns {Number}
 */
Megatexture.getApproximateTextureMemoryByteLength = function (
  tileCount,
  dimensions,
  channelCount,
  componentType
) {
  // TODO there's a lot of code duplicate with Megatexture constructor

  // Unsigned short textures not allowed in webgl 1, so treat as float
  if (componentType === MetadataComponentType.UNSIGNED_SHORT) {
    componentType = MetadataComponentType.FLOAT32;
  }

  const datatypeSizeInBytes = MetadataComponentType.getSizeInBytes(
    componentType
  );
  const voxelCountTotal =
    tileCount * dimensions.x * dimensions.y * dimensions.z;

  const sliceCountPerRegionX = Math.ceil(Math.sqrt(dimensions.z));
  const sliceCountPerRegionY = Math.ceil(dimensions.z / sliceCountPerRegionX);
  const voxelCountPerRegionX = sliceCountPerRegionX * dimensions.x;
  const voxelCountPerRegionY = sliceCountPerRegionY * dimensions.y;

  // Find the power of two that can fit all tile data, accounting for slices.
  // There's probably a non-iterative solution for this, but this is good enough for now.
  let textureDimension = CesiumMath.previousPowerOfTwo(
    Math.floor(Math.sqrt(voxelCountTotal))
  );
  for (;;) {
    const regionCountX = Math.floor(textureDimension / voxelCountPerRegionX);
    const regionCountY = Math.floor(textureDimension / voxelCountPerRegionY);
    const regionCount = regionCountX * regionCountY;
    if (regionCount >= tileCount) {
      break;
    } else {
      textureDimension *= 2;
    }
  }

  const textureMemoryByteLength =
    textureDimension * textureDimension * channelCount * datatypeSizeInBytes;
  return textureMemoryByteLength;
};

/**
 * @param {Number} index
 * @param {Float32Array|Uint16Array|Uint8Array} data
 */
Megatexture.prototype.writeDataToTexture = function (index, data) {
  const texture = this.texture;
  const channelCount = this.channelCount;
  const regionDimensionsPerMegatexture = this.regionCountPerMegatexture;
  const voxelDimensionsPerRegion = this.voxelCountPerRegion;
  const voxelDimensionsPerTile = this.voxelCountPerTile;
  const sliceDimensionsPerRegion = this.sliceCountPerRegion;

  let tileData = data;

  // Unsigned short textures not allowed in webgl 1, so treat as float
  if (data.constructor === Uint16Array) {
    const elementCount = data.length;
    tileData = new Float32Array(elementCount);
    for (let i = 0; i < elementCount / channelCount; i++) {
      for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
        const dataIndex = i * channelCount + channelIndex;
        const minimumValue = this.minimumValues[channelIndex];
        const maximumValue = this.maximumValues[channelIndex];
        // TODO extrema are unnormalized, but we are normalizing to [0, 1] here. what do we want to do? will the user expect to get normalized samples and extrema in the style function?
        tileData[dataIndex] =
          (data[dataIndex] - minimumValue) / (maximumValue - minimumValue);
        // tileData[dataIndex] = CesiumMath.lerp(
        //   minimumValue,
        //   maximumValue,
        //   data[dataIndex] / 65535
        // );
      }
    }
  }

  const tileVoxelData = this.tileVoxelDataTemp;
  for (let z = 0; z < voxelDimensionsPerTile.z; z++) {
    const sliceVoxelOffsetX =
      (z % sliceDimensionsPerRegion.x) * voxelDimensionsPerTile.x;
    const sliceVoxelOffsetY =
      Math.floor(z / sliceDimensionsPerRegion.x) * voxelDimensionsPerTile.y;
    for (let y = 0; y < voxelDimensionsPerTile.y; y++) {
      for (let x = 0; x < voxelDimensionsPerTile.x; x++) {
        const readIndex =
          z * voxelDimensionsPerTile.y * voxelDimensionsPerTile.x +
          y * voxelDimensionsPerTile.x +
          x;
        const writeIndex =
          (sliceVoxelOffsetY + y) * voxelDimensionsPerRegion.x +
          (sliceVoxelOffsetX + x);
        for (let c = 0; c < channelCount; c++) {
          tileVoxelData[writeIndex * channelCount + c] =
            tileData[readIndex * channelCount + c];
        }
      }
    }
  }

  const voxelWidth = voxelDimensionsPerRegion.x;
  const voxelHeight = voxelDimensionsPerRegion.y;
  const voxelOffsetX =
    (index % regionDimensionsPerMegatexture.x) * voxelDimensionsPerRegion.x;
  const voxelOffsetY =
    Math.floor(index / regionDimensionsPerMegatexture.x) *
    voxelDimensionsPerRegion.y;

  const source = {
    arrayBufferView: tileVoxelData,
    width: voxelWidth,
    height: voxelHeight,
  };

  const copyOptions = {
    source: source,
    xOffset: voxelOffsetX,
    yOffset: voxelOffsetY,
  };

  texture.copyFrom(copyOptions);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Megatexture#destroy
 */
Megatexture.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see Megatexture#isDestroyed
 *
 * @example
 * megatexture = megatexture && megatexture.destroy();
 */
Megatexture.prototype.destroy = function () {
  this.texture = this.texture && this.texture.destroy();
  return destroyObject(this);
};

export default VoxelTraversal;
