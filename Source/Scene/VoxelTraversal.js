import Cartesian2 from "../Core/Cartesian2.js";
import CesiumMath from "../Core/Math.js";
import CullingVolume from "../Core/CullingVolume.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DoubleEndedPriorityQueue from "../Core/DoubleEndedPriorityQueue.js";
import getTimestamp from "../Core/getTimestamp.js";
import KeyframeNode from "./KeyframeNode.js";
import MetadataType from "./MetadataType.js";
import Megatexture from "./Megatexture.js";
import PixelFormat from "../Core/PixelFormat.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import SpatialNode from "./SpatialNode.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";

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
   * TODO: maybe this shouldn't be stored or passed into update function?
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

  /**
   * @type {Number}
   * @private
   */
  this._frameNumber = 0;

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
  this._sampleCount = undefined;

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
   * Only generated when there are two or more samples.
   * @type {Texture}
   * @readonly
   */
  this.leafNodeTexture = undefined;

  /**
   * Only generated when there are two or more samples.
   * @type {Number}
   * @readonly
   */
  this.leafNodeTilesPerRow = undefined;

  /**
   * Only generated when there are two or more samples.
   * @type {Cartesian2}
   * @readonly
   */
  this.leafNodeTexelSizeUv = new Cartesian2();
}

VoxelTraversal.simultaneousRequestCountMaximum = 50;

/**
 * @param {FrameState} frameState
 * @param {Number} keyframeLocation
 * @param {Boolean} recomputeBoundingVolumes
 * @param {Boolean} pauseUpdate
 */
VoxelTraversal.prototype.update = function (
  frameState,
  keyframeLocation,
  recomputeBoundingVolumes,
  pauseUpdate
) {
  const primitive = this._primitive;
  const context = frameState.context;
  const maximumTileCount = this.megatextures[0].maximumTileCount;
  const keyframeCount = this._keyframeCount;

  const levelBlendFactor = primitive._levelBlendFactor;
  const haslevelBlendFactor = levelBlendFactor > 0.0;
  const hasKeyframes = keyframeCount > 1;
  const sampleCount = (haslevelBlendFactor ? 2 : 1) * (hasKeyframes ? 2 : 1);
  this._sampleCount = sampleCount;

  const useLeafNodes = sampleCount >= 2;
  if (useLeafNodes && !defined(this.leafNodeTexture)) {
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
    this.leafNodeTexelSizeUv = Cartesian2.fromElements(
      1.0 / leafNodeTextureDimensionX,
      1.0 / leafNodeTextureDimensionY,
      this.leafNodeTexelSizeUv
    );
    this.leafNodeTilesPerRow = leafNodeTilesPerRow;
  } else if (!useLeafNodes && defined(this.leafNodeTexture)) {
    this.leafNodeTexture = this.leafNodeTexture.destroy();
  }

  this._keyframeLocation = CesiumMath.clamp(
    keyframeLocation,
    0.0,
    keyframeCount - 1
  );

  if (recomputeBoundingVolumes) {
    recomputeBoundingVolumesRecursive(this, this.rootNode);
  }

  if (pauseUpdate) {
    return;
  }

  this._frameNumber = frameState.frameNumber;
  const timestamp0 = getTimestamp();
  loadAndUnload(this, frameState);
  const timestamp1 = getTimestamp();
  generateOctree(this, sampleCount, levelBlendFactor);
  const timestamp2 = getTimestamp();

  if (this._debugPrint) {
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
};

/**
 * Check if a node is renderable.
 * @param {SpatialNode} tile
 * @returns {Boolean}
 */
VoxelTraversal.prototype.isRenderable = function (tile) {
  return tile.isRenderable(this._frameNumber);
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
 * @function
 *
 * @param {VoxelTraversal} that
 * @param {KeyframeNode} keyframeNode
 *
 * @private
 */
function requestData(that, keyframeNode) {
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
      keyframeNode.state = KeyframeNode.LoadState.UNAVAILABLE;
    } else if (result === KeyframeNode.LoadState.FAILED) {
      keyframeNode.state = KeyframeNode.LoadState.FAILED;
    } else if (!Array.isArray(result) || result.length !== length) {
      // TODO should this throw runtime error?
      keyframeNode.state = KeyframeNode.LoadState.FAILED;
    } else {
      const megatextures = that.megatextures;
      for (let i = 0; i < length; i++) {
        const { voxelCountPerTile, channelCount } = megatextures[i];
        const { x, y, z } = voxelCountPerTile;
        const tileVoxelCount = x * y * z;

        const data = result[i];
        const expectedLength = tileVoxelCount * channelCount;
        if (data.length === expectedLength) {
          keyframeNode.metadatas[i] = data;
          // State is received only when all metadata requests have been received
          keyframeNode.state = KeyframeNode.LoadState.RECEIVED;
        } else {
          keyframeNode.state = KeyframeNode.LoadState.FAILED;
          break;
        }
      }
    }
  };

  const postRequestFailure = function () {
    that._simultaneousRequestCount--;
    keyframeNode.state = KeyframeNode.LoadState.FAILED;
  };

  const promise = provider.requestData({
    tileLevel: tileLevel,
    tileX: tileX,
    tileY: tileY,
    tileZ: tileZ,
    keyframe: keyframe,
  });

  if (defined(promise)) {
    that._simultaneousRequestCount++;
    keyframeNode.state = KeyframeNode.LoadState.RECEIVING;
    promise.then(postRequestSuccess).catch(postRequestFailure);
  } else {
    keyframeNode.state = KeyframeNode.LoadState.FAILED;
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
  const frameNumber = that._frameNumber;
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
        keyframeNode.state !== KeyframeNode.LoadState.UNAVAILABLE &&
        keyframeNode.state !== KeyframeNode.LoadState.FAILED &&
        keyframeNode.priority !== -Number.MAX_VALUE
      ) {
        priorityQueue.insert(keyframeNode);
      }
      if (keyframeNode.state === KeyframeNode.LoadState.LOADED) {
        hasLoadedKeyframe = true;
      }
    }

    const meetsScreenSpaceError =
      spatialNode.screenSpaceError < targetScreenSpaceError;
    if (meetsScreenSpaceError || !hasLoadedKeyframe) {
      // Free up memory
      spatialNode.children = undefined;
      return;
    }

    if (!defined(spatialNode.children)) {
      const childLevel = spatialNode.level + 1;
      const childXMin = spatialNode.x * 2 + 0;
      const childXMax = spatialNode.x * 2 + 1;
      const childYMin = spatialNode.y * 2 + 0;
      const childYMax = spatialNode.y * 2 + 1;
      const childZMin = spatialNode.z * 2 + 0;
      const childZMax = spatialNode.z * 2 + 1;

      const childCoords = [
        [childXMin, childYMin, childZMin],
        [childXMax, childYMin, childZMin],
        [childXMin, childYMax, childZMin],
        [childXMax, childYMax, childZMin],
        [childXMin, childYMin, childZMax],
        [childXMax, childYMin, childZMax],
        [childXMin, childYMax, childZMax],
        [childXMax, childYMax, childZMax],
      ];
      spatialNode.children = childCoords.map(([x, y, z]) => {
        return new SpatialNode(
          childLevel,
          x,
          y,
          z,
          spatialNode,
          shape,
          voxelDimensions
        );
      });
    }
    for (let childIndex = 0; childIndex < 8; childIndex++) {
      const child = spatialNode.children[childIndex];
      addToQueueRecursive(child, visibilityPlaneMask);
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
      highPriorityKeyframeNode.state === KeyframeNode.LoadState.LOADED ||
      highPriorityKeyframeNode.spatialNode === undefined
    ) {
      // Already loaded, so nothing to do.
      // Or destroyed when adding a higher priority node
      continue;
    }
    if (highPriorityKeyframeNode.state === KeyframeNode.LoadState.UNLOADED) {
      requestData(that, highPriorityKeyframeNode);
    }
    if (highPriorityKeyframeNode.state === KeyframeNode.LoadState.RECEIVED) {
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

  const loadStateCount = Object.keys(KeyframeNode.LoadState).length;
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
    loadStatesByKeyframe[KeyframeNode.LoadState.LOADED]
  }`;
  const loadStateStatistics =
    `UNLOADED: ${loadStateByCount[KeyframeNode.LoadState.UNLOADED]} | ` +
    `RECEIVING: ${loadStateByCount[KeyframeNode.LoadState.RECEIVING]} | ` +
    `RECEIVED: ${loadStateByCount[KeyframeNode.LoadState.RECEIVED]} | ` +
    `LOADED: ${loadStateByCount[KeyframeNode.LoadState.LOADED]} | ` +
    `FAILED: ${loadStateByCount[KeyframeNode.LoadState.FAILED]} | ` +
    `UNAVAILABLE: ${loadStateByCount[KeyframeNode.LoadState.UNAVAILABLE]} | ` +
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
 * @param {Number} sampleCount
 * @param {Number} levelBlendFactor
 * @private
 */
function generateOctree(that, sampleCount, levelBlendFactor) {
  const primitive = that._primitive;
  const keyframeLocation = that._keyframeLocation;
  const frameNumber = that._frameNumber;
  const useLeafNodes = sampleCount >= 2;

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
        const baseIdx = leafNodeCount * 5;

        const useTimeDynamic = false;
        if (useTimeDynamic) {
          const previousKeyframeNode = node.renderableKeyframeNodePrevious;
          const nextKeyframeNode = node.renderableKeyframeNodeNext;
          const prevKeyframeLevel = previousKeyframeNode.spatialNode.level;
          const nextKeyframeLevel = nextKeyframeNode.spatialNode.level;
          const prevKeyframeLevelDifference = node.level - prevKeyframeLevel;
          const nextKeyframeLevelDifference = node.level - nextKeyframeLevel;

          leafNodeOctreeData[baseIdx + 0] = node.renderableKeyframeNodeLerp;
          leafNodeOctreeData[baseIdx + 1] = prevKeyframeLevelDifference;
          leafNodeOctreeData[baseIdx + 2] = nextKeyframeLevelDifference;
          leafNodeOctreeData[baseIdx + 3] =
            previousKeyframeNode.megatextureIndex;
          leafNodeOctreeData[baseIdx + 4] = nextKeyframeNode.megatextureIndex;
        } else {
          const keyframeNode = node.renderableKeyframeNodePrevious;
          const levelDifference = node.level - keyframeNode.spatialNode.level;

          const parentNode = keyframeNode.spatialNode.parent;
          const parentKeyframeNode = defined(parentNode)
            ? parentNode.renderableKeyframeNodePrevious
            : keyframeNode;

          let lodLerp = 0.0;
          if (node.parent !== undefined) {
            const sse = node.screenSpaceError;
            const parentSse = node.parent.screenSpaceError;
            const targetSse = primitive._screenSpaceError;
            lodLerp = (targetSse - sse) / (parentSse - sse);
            lodLerp = (lodLerp + levelBlendFactor - 1.0) / levelBlendFactor;
            lodLerp = CesiumMath.clamp(lodLerp, 0.0, 1.0);
          }

          const levelDifferenceChild = levelDifference;
          const levelDifferenceParent = 1;
          const megatextureIndexChild = keyframeNode.megatextureIndex;
          const megatextureIndexParent = parentKeyframeNode.megatextureIndex;

          leafNodeOctreeData[baseIdx + 0] = lodLerp;
          leafNodeOctreeData[baseIdx + 1] = levelDifferenceChild;
          leafNodeOctreeData[baseIdx + 2] = levelDifferenceParent;
          leafNodeOctreeData[baseIdx + 3] = megatextureIndexChild;
          leafNodeOctreeData[baseIdx + 4] = megatextureIndexParent;
        }

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

export default VoxelTraversal;
