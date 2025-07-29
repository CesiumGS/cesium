import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
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
import VoxelMetadataOrder from "./VoxelMetadataOrder.js";

/**
 * Handles tileset traversal, tile requests, and GPU resources. Intended to be
 * private and paired with a {@link VoxelPrimitive}, which has a user-facing API.
 *
 * @alias VoxelTraversal
 * @constructor
 *
 * @param {VoxelPrimitive} primitive The voxel primitive for which this traversal will be used.
 * @param {Context} context The context in which to create GPU resources.
 * @param {number} keyframeCount The number of keyframes in the tileset.
 * @param {number} [maximumTextureMemoryByteLength] The maximum amount of memory to use for textures.
 *
 * @private
 */
function VoxelTraversal(
  primitive,
  context,
  keyframeCount,
  maximumTextureMemoryByteLength,
) {
  const { provider, dimensions, paddingBefore, paddingAfter } = primitive;
  const { types, componentTypes, metadataOrder } = provider;

  const inputDimensions = Cartesian3.add(
    dimensions,
    paddingBefore,
    new Cartesian3(),
  );
  Cartesian3.add(inputDimensions, paddingAfter, inputDimensions);

  if (metadataOrder === VoxelMetadataOrder.Y_UP) {
    const inputDimensionsY = inputDimensions.y;
    inputDimensions.y = inputDimensions.z;
    inputDimensions.z = inputDimensionsY;
  }

  if (
    !defined(maximumTextureMemoryByteLength) &&
    defined(provider.maximumTileCount)
  ) {
    maximumTextureMemoryByteLength = getApproximateTextureMemoryByteLength(
      provider.maximumTileCount,
      inputDimensions,
      types,
      componentTypes,
    );
  }

  /**
   * @type {VoxelPrimitive}
   * @private
   */
  this._primitive = primitive;

  /**
   * @type {number}
   * @private
   */
  this.textureMemoryByteLength = 0;

  /**
   * @type {Megatexture[]}
   * @readonly
   */
  this.megatextures = new Array(types.length);

  // TODO make sure to split the maximumTextureMemoryByteLength across all the megatextures
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    const componentCount = MetadataType.getComponentCount(type);
    const componentType = componentTypes[i];

    this.megatextures[i] = new Megatexture(
      context,
      inputDimensions,
      componentCount,
      componentType,
      maximumTextureMemoryByteLength,
    );

    this.textureMemoryByteLength +=
      this.megatextures[i].textureMemoryByteLength;
  }

  const maximumTileCount = this.megatextures[0].maximumTileCount;

  /**
   * @type {number}
   * @private
   */
  this._simultaneousRequestCount = 0;

  /**
   * @type {boolean}
   * @private
   */
  this._debugPrint = false;

  /**
   * @type {boolean}
   * @private
   */
  this._calculateStatistics = this._primitive._calculateStatistics ?? false;

  /**
   * @type {number}
   * @private
   */
  this._frameNumber = 0;

  const shape = primitive._shape;

  /**
   * @type {SpatialNode}
   * @readonly
   */
  this.rootNode = new SpatialNode(0, 0, 0, 0, undefined, shape, dimensions);

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
   * @type {number}
   * @private
   */
  this._highPriorityKeyframeNodeCount = 0;

  /**
   * @type {KeyframeNode[]}
   * @private
   */
  this._keyframeNodesInMegatexture = new Array(maximumTileCount);

  /**
   * @type {number}
   * @private
   */
  this._keyframeCount = keyframeCount;

  /**
   * @type {number}
   * @private
   */
  this._sampleCount = undefined;

  /**
   * @type {number}
   * @private
   */
  this._keyframeLocation = 0;

  /**
   * @type {number[]}
   * @private
   */
  this._binaryTreeKeyframeWeighting = new Array(keyframeCount);

  /**
   * @type {boolean}
   * @private
   */
  this._initialTilesLoaded = false;

  const binaryTreeKeyframeWeighting = this._binaryTreeKeyframeWeighting;
  binaryTreeKeyframeWeighting[0] = 0;
  binaryTreeKeyframeWeighting[keyframeCount - 1] = 0;
  binaryTreeWeightingRecursive(
    binaryTreeKeyframeWeighting,
    1,
    keyframeCount - 2,
    0,
  );

  const internalNodeTexelCount = 9;
  const internalNodeTextureDimensionX = 2048;
  const internalNodeTilesPerRow = Math.floor(
    internalNodeTextureDimensionX / internalNodeTexelCount,
  );
  const internalNodeTextureDimensionY = Math.ceil(
    maximumTileCount / internalNodeTilesPerRow,
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
   * @type {number}
   * @readonly
   */
  this.internalNodeTilesPerRow = internalNodeTilesPerRow;

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.internalNodeTexelSizeUv = new Cartesian2(
    1.0 / internalNodeTextureDimensionX,
    1.0 / internalNodeTextureDimensionY,
  );

  /**
   * Only generated when there are two or more samples.
   * @type {Texture}
   * @readonly
   */
  this.leafNodeTexture = undefined;

  /**
   * Only generated when there are two or more samples.
   * @type {number}
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

/**
 * Finds a keyframe node in the traversal
 *
 * @param {number} megatextureIndex
 * @returns {KeyframeNode}
 */
VoxelTraversal.prototype.findKeyframeNode = function (megatextureIndex) {
  return this._keyframeNodesInMegatexture.find(function (keyframeNode) {
    return keyframeNode.megatextureIndex === megatextureIndex;
  });
};

function binaryTreeWeightingRecursive(arr, start, end, depth) {
  if (start > end) {
    return;
  }
  const mid = Math.floor((start + end) / 2);
  arr[mid] = depth;
  binaryTreeWeightingRecursive(arr, start, mid - 1, depth + 1);
  binaryTreeWeightingRecursive(arr, mid + 1, end, depth + 1);
}

VoxelTraversal.simultaneousRequestCountMaximum = 50;

/**
 * @param {FrameState} frameState
 * @param {number} keyframeLocation
 * @param {boolean} recomputeBoundingVolumes
 * @param {boolean} pauseUpdate
 */
VoxelTraversal.prototype.update = function (
  frameState,
  keyframeLocation,
  recomputeBoundingVolumes,
  pauseUpdate,
) {
  const primitive = this._primitive;
  const context = frameState.context;
  const maximumTileCount = this.megatextures[0].maximumTileCount;
  const keyframeCount = this._keyframeCount;

  const levelBlendFactor = primitive._levelBlendFactor;
  const hasLevelBlendFactor = levelBlendFactor > 0.0;
  const hasKeyframes = keyframeCount > 1;
  const sampleCount = (hasLevelBlendFactor ? 2 : 1) * (hasKeyframes ? 2 : 1);
  this._sampleCount = sampleCount;

  const useLeafNodes = sampleCount >= 2;
  if (useLeafNodes && !defined(this.leafNodeTexture)) {
    const leafNodeTexelCount = 2;
    const leafNodeTextureDimensionX = 1024;
    const leafNodeTilesPerRow = Math.floor(
      leafNodeTextureDimensionX / leafNodeTexelCount,
    );
    const leafNodeTextureDimensionY = Math.ceil(
      maximumTileCount / leafNodeTilesPerRow,
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
      this.leafNodeTexelSizeUv,
    );
    this.leafNodeTilesPerRow = leafNodeTilesPerRow;
  } else if (!useLeafNodes && defined(this.leafNodeTexture)) {
    this.leafNodeTexture = this.leafNodeTexture.destroy();
  }

  this._keyframeLocation = CesiumMath.clamp(
    keyframeLocation,
    0.0,
    keyframeCount - 1,
  );

  if (recomputeBoundingVolumes) {
    recomputeBoundingVolumesRecursive(this, this.rootNode);
  }

  if (pauseUpdate) {
    return;
  }

  this._frameNumber = frameState.frameNumber;
  const timestamp0 = getTimestamp();
  selectKeyframeNodes(this, frameState);
  updateKeyframeNodes(this, frameState);
  const timestamp1 = getTimestamp();
  generateOctree(this, sampleCount, levelBlendFactor);
  const timestamp2 = getTimestamp();

  const checkEventListeners =
    primitive.loadProgress.numberOfListeners > 0 ||
    primitive.allTilesLoaded.numberOfListeners > 0 ||
    primitive.initialTilesLoaded.numberOfListeners > 0;

  if (this._debugPrint || this._calculateStatistics || checkEventListeners) {
    const loadAndUnloadTimeMs = timestamp1 - timestamp0;
    const generateOctreeTimeMs = timestamp2 - timestamp1;
    const totalTimeMs = timestamp2 - timestamp0;
    postPassesUpdate(
      this,
      frameState,
      loadAndUnloadTimeMs,
      generateOctreeTimeMs,
      totalTimeMs,
    );
  }
};

/**
 * Check if a node is renderable.
 * @param {SpatialNode} tile
 * @returns {boolean}
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
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
  this.textureMemoryByteLength = 0;

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
  node.computeBoundingVolumes(that._primitive._shape);
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
  const provider = primitive.provider;
  const { keyframe, spatialNode } = keyframeNode;
  if (
    defined(provider.availableLevels) &&
    spatialNode.level >= provider.availableLevels
  ) {
    return;
  }

  function postRequestSuccess(result) {
    that._simultaneousRequestCount--;
    keyframeNode.content = result;
    keyframeNode.state = defined(result)
      ? KeyframeNode.LoadState.PROCESSING
      : KeyframeNode.LoadState.UNAVAILABLE;
  }

  function postRequestFailure(error) {
    that._simultaneousRequestCount--;
    keyframeNode.state = KeyframeNode.LoadState.FAILED;
    that._primitive.tileFailed.raiseEvent();
  }

  const requestParameters = {
    tileLevel: spatialNode.level,
    tileX: spatialNode.x,
    tileY: spatialNode.y,
    tileZ: spatialNode.z,
    keyframe: keyframe,
  };
  const promise = provider.requestData(requestParameters);
  if (!defined(promise)) {
    return;
  }
  that._simultaneousRequestCount++;
  keyframeNode.state = KeyframeNode.LoadState.RECEIVING;
  promise.then(postRequestSuccess).catch(postRequestFailure);
}

/**
 * @function
 *
 * @param {number} x
 * @returns {number}
 *
 * @private
 */
function mapInfiniteRangeToZeroOne(x) {
  return x / (1.0 + x);
}

/**
 * @param {VoxelTraversal} that
 * @param {FrameState} frameState
 *
 * @private
 */
function selectKeyframeNodes(that, frameState) {
  const frameNumber = that._frameNumber;
  const priorityQueue = that._priorityQueue;

  // Add all the nodes to the queue, to sort them by priority.
  priorityQueue.reset();
  addToQueueRecursive(
    that.rootNode,
    CullingVolume.MASK_INDETERMINATE,
    that,
    frameState,
  );

  // Move the nodes from the queue to array of high priority nodes.
  const highPriorityKeyframeNodes = that._highPriorityKeyframeNodes;
  let highPriorityKeyframeNodeCount = 0;
  let highPriorityKeyframeNode;
  while (priorityQueue.length > 0) {
    highPriorityKeyframeNode = priorityQueue.removeMaximum();
    highPriorityKeyframeNode.highPriorityFrameNumber = frameNumber;
    highPriorityKeyframeNodes[highPriorityKeyframeNodeCount] =
      highPriorityKeyframeNode;
    highPriorityKeyframeNodeCount++;
  }
  that._highPriorityKeyframeNodeCount = highPriorityKeyframeNodeCount;
}

/**
 * @param {VoxelTraversal} that
 * @param {FrameState} frameState
 *
 * @private
 */
function updateKeyframeNodes(that, frameState) {
  const megatexture = that.megatextures[0];
  const keyframeNodesInMegatextureCount = megatexture.occupiedCount;

  // Sort the list of keyframe nodes in the megatexture by priority, so
  // we can remove the lowest priority nodes if we need space.
  const keyframeNodesInMegatexture = that._keyframeNodesInMegatexture;
  keyframeNodesInMegatexture.length = keyframeNodesInMegatextureCount;
  keyframeNodesInMegatexture.sort(keyframeNodeSort);

  // Add the high priority nodes to the megatexture,
  // removing existing lower-priority nodes if necessary.
  const highPriorityKeyframeNodes = that._highPriorityKeyframeNodes;
  const highPriorityKeyframeNodeCount = that._highPriorityKeyframeNodeCount;
  let destroyedCount = 0;
  let addedCount = 0;

  for (
    let highPriorityKeyframeNodeIndex = 0;
    highPriorityKeyframeNodeIndex < highPriorityKeyframeNodeCount;
    highPriorityKeyframeNodeIndex++
  ) {
    const highPriorityKeyframeNode =
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
    if (highPriorityKeyframeNode.state === KeyframeNode.LoadState.PROCESSING) {
      const { content } = highPriorityKeyframeNode;
      content.update(that._primitive, frameState);
      if (!content.ready) {
        continue;
      }
      if (!validateMetadata(content.metadata, that)) {
        highPriorityKeyframeNode.content = undefined;
        highPriorityKeyframeNode.state = KeyframeNode.LoadState.FAILED;
        that._primitive.tileFailed.raiseEvent();
        continue;
      }
      let addNodeIndex = 0;
      if (megatexture.isFull()) {
        // If the megatexture is full, try removing a discardable node with the lowest priority.
        addNodeIndex = keyframeNodesInMegatextureCount - 1 - destroyedCount;
        destroyedCount++;

        const discardNode = keyframeNodesInMegatexture[addNodeIndex];
        that._primitive.tileUnload.raiseEvent();
        discardNode.spatialNode.destroyKeyframeNode(
          discardNode,
          that.megatextures,
        );
      } else {
        addNodeIndex = keyframeNodesInMegatextureCount + addedCount;
        addedCount++;
      }
      highPriorityKeyframeNode.spatialNode.addKeyframeNodeToMegatextures(
        highPriorityKeyframeNode,
        that.megatextures,
      );
      highPriorityKeyframeNode.state = KeyframeNode.LoadState.LOADED;
      keyframeNodesInMegatexture[addNodeIndex] = highPriorityKeyframeNode;
      that._primitive.tileLoad.raiseEvent();
    }
  }
}

function keyframeNodeSort(a, b) {
  if (a.highPriorityFrameNumber === b.highPriorityFrameNumber) {
    return b.priority - a.priority;
  }
  return b.highPriorityFrameNumber - a.highPriorityFrameNumber;
}

/**
 * Check if an array of metadata is of the expected type and size
 *
 * @param {TypedArray[]} metadata The metadata to validate
 * @param {VoxelTraversal} traversal The traversal to validate against
 * @returns {boolean} <code>true</code> if the metadata is valid, <code>false</code> otherwise
 *
 * @private
 */
function validateMetadata(metadata, traversal) {
  const length = traversal._primitive.provider.types.length;
  if (!Array.isArray(metadata) || metadata.length !== length) {
    return false;
  }
  const { megatextures } = traversal;
  for (let i = 0; i < length; i++) {
    const { voxelCountPerTile, channelCount } = megatextures[i];
    const { x, y, z } = voxelCountPerTile;
    const tileVoxelCount = x * y * z;

    const data = metadata[i];
    const expectedLength = tileVoxelCount * channelCount;
    if (data.length !== expectedLength) {
      return false;
    }
  }
  return true;
}

/**
 * @param {SpatialNode} spatialNode
 * @param {number} visibilityPlaneMask
 * @param {VoxelTraversal} that
 * @param {FrameState} frameState
 *
 * @private
 */
function addToQueueRecursive(
  spatialNode,
  visibilityPlaneMask,
  that,
  frameState,
) {
  const { camera, context, pixelRatio, frameNumber } = frameState;
  const { positionWC, frustum } = camera;
  const screenHeight = context.drawingBufferHeight / pixelRatio;
  const screenSpaceErrorMultiplier = screenHeight / frustum.sseDenominator;

  spatialNode.computeScreenSpaceError(positionWC, screenSpaceErrorMultiplier);

  visibilityPlaneMask = spatialNode.visibility(frameState, visibilityPlaneMask);
  if (visibilityPlaneMask === CullingVolume.MASK_OUTSIDE) {
    return;
  }
  spatialNode.visitedFrameNumber = frameNumber;

  const primitive = that._primitive;
  const shape = primitive._shape;
  const targetScreenSpaceError = primitive.screenSpaceError;
  const priorityQueue = that._priorityQueue;
  const keyframeCount = that._keyframeCount;
  const previousKeyframe = CesiumMath.clamp(
    Math.floor(that._keyframeLocation),
    0,
    keyframeCount - 2,
  );
  const nextKeyframe = previousKeyframe + 1;

  // Create keyframe nodes at the playhead.
  // If they already exist, nothing will be created.
  if (keyframeCount === 1) {
    spatialNode.createKeyframeNode(0);
  } else if (spatialNode.keyframeNodes.length !== keyframeCount) {
    for (let k = 0; k < keyframeCount; k++) {
      spatialNode.createKeyframeNode(k);
    }
  }
  const { screenSpaceError, keyframeNodes } = spatialNode;
  const ssePriority = mapInfiniteRangeToZeroOne(screenSpaceError);

  let hasLoadedKeyframe = false;
  for (let i = 0; i < keyframeNodes.length; i++) {
    const keyframeNode = keyframeNodes[i];

    keyframeNode.priority =
      10.0 * ssePriority +
      keyframePriority(
        previousKeyframe,
        keyframeNode.keyframe,
        nextKeyframe,
        that,
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

  if (screenSpaceError < targetScreenSpaceError || !hasLoadedKeyframe) {
    // Free up memory
    spatialNode.children = undefined;
    return;
  }

  if (!defined(spatialNode.children)) {
    spatialNode.constructChildNodes(shape);
  }
  for (let childIndex = 0; childIndex < 8; childIndex++) {
    const child = spatialNode.children[childIndex];
    addToQueueRecursive(child, visibilityPlaneMask, that, frameState);
  }
}

/**
 * Compute a priority for a keyframe node.
 *
 * @private
 * @param {number} previousKeyframe
 * @param {number} keyframe
 * @param {number} nextKeyframe
 * @param {VoxelTraversal} traversal
 * @returns {number} The computed priority
 */
function keyframePriority(previousKeyframe, keyframe, nextKeyframe, traversal) {
  const keyframeDifference = Math.min(
    Math.abs(keyframe - previousKeyframe),
    Math.abs(keyframe - nextKeyframe),
  );
  const maxKeyframeDifference = Math.max(
    previousKeyframe,
    traversal._keyframeCount - nextKeyframe - 1,
    1,
  );
  const keyframeFactor = Math.pow(
    1.0 - keyframeDifference / maxKeyframeDifference,
    4.0,
  );
  const binaryTreeFactor = Math.exp(
    -traversal._binaryTreeKeyframeWeighting[keyframe],
  );
  return CesiumMath.lerp(
    binaryTreeFactor,
    keyframeFactor,
    0.15 + 0.85 * keyframeFactor,
  );
}

/**
 * @function
 *
 * @param {VoxelTraversal} that
 *
 * @private
 */
function postPassesUpdate(
  that,
  frameState,
  loadAndUnloadTimeMs,
  generateOctreeTimeMs,
  totalTimeMs,
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
    const keyframeArray = new Array(keyframeCount).fill(0);
    loadStatesByKeyframe[loadStateIndex] = keyframeArray;
    loadStateByCount[loadStateIndex] = 0;
  }

  /**
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

  that._primitive.statistics.numberOfTilesWithContentReady =
    loadStateByCount[KeyframeNode.LoadState.LOADED];
  that._primitive.statistics.visited = nodeCountTotal;

  const numberOfPendingRequests =
    loadStateByCount[KeyframeNode.LoadState.RECEIVING];
  const numberOfTilesProcessing =
    loadStateByCount[KeyframeNode.LoadState.PROCESSING];

  const progressChanged =
    numberOfPendingRequests !==
      that._primitive.statistics.numberOfPendingRequests ||
    numberOfTilesProcessing !==
      that._primitive.statistics.numberOfTilesProcessing;

  if (progressChanged) {
    frameState.afterRender.push(function () {
      that._primitive.loadProgress.raiseEvent(
        numberOfPendingRequests,
        numberOfTilesProcessing,
      );

      return true;
    });
  }

  that._primitive.statistics.numberOfPendingRequests = numberOfPendingRequests;
  that._primitive.statistics.numberOfTilesProcessing = numberOfTilesProcessing;

  const tilesLoaded =
    numberOfPendingRequests === 0 && numberOfTilesProcessing === 0;

  // Events are raised (added to the afterRender queue) here since promises
  // may resolve outside of the update loop that then raise events, e.g.,
  // model's readyEvent
  if (progressChanged && tilesLoaded) {
    frameState.afterRender.push(function () {
      that._primitive.allTilesLoaded.raiseEvent();
      return true;
    });
    if (!that._initialTilesLoaded) {
      that._initialTilesLoaded = true;
      frameState.afterRender.push(function () {
        that._primitive.initialTilesLoaded.raiseEvent();
        return true;
      });
    }
  }

  if (!that._debugPrint) {
    return;
  }

  const loadedKeyframeStatistics = `KEYFRAMES: ${
    loadStatesByKeyframe[KeyframeNode.LoadState.LOADED]
  }`;
  const loadStateStatistics =
    `UNLOADED: ${loadStateByCount[KeyframeNode.LoadState.UNLOADED]} | ` +
    `RECEIVING: ${loadStateByCount[KeyframeNode.LoadState.RECEIVING]} | ` +
    `PROCESSING: ${loadStateByCount[KeyframeNode.LoadState.PROCESSING]} | ` +
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
    `${loadedKeyframeStatistics} || ${loadStateStatistics} || ${timerStatistics}`,
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
 * @param {number} sampleCount
 * @param {number} levelBlendFactor
 * @private
 */
function generateOctree(that, sampleCount, levelBlendFactor) {
  const targetSse = that._primitive._screenSpaceError;
  const keyframeLocation = that._keyframeLocation;
  const frameNumber = that._frameNumber;
  const useLeafNodes = sampleCount >= 2;

  let internalNodeCount = 0;
  let leafNodeCount = 0;
  const internalNodeOctreeData = [];
  const leafNodeOctreeData = [];

  /**
   * @param {SpatialNode} node
   * @param {number} childOctreeIndex
   * @param {number} childEntryIndex
   * @param {number} parentOctreeIndex
   * @param {number} parentEntryIndex
   */
  function buildOctree(
    node,
    childOctreeIndex,
    childEntryIndex,
    parentOctreeIndex,
    parentEntryIndex,
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
          parentEntryIndex + cc,
        );
      }
    } else {
      // Store the leaf node information instead
      // Recursion stops here because there are no renderable children
      that._primitive.tileVisible.raiseEvent();
      if (useLeafNodes) {
        const baseIdx = leafNodeCount * 5;
        const keyframeNode = node.renderableKeyframeNodePrevious;
        const levelDifference = node.level - keyframeNode.spatialNode.level;

        const parentNode = keyframeNode.spatialNode.parent;
        const parentKeyframeNode = defined(parentNode)
          ? parentNode.renderableKeyframeNodePrevious
          : keyframeNode;

        const lodLerp = getLodLerp(node, targetSse, levelBlendFactor);
        const levelDifferenceChild = levelDifference;
        const levelDifferenceParent = 1;
        const megatextureIndexChild = keyframeNode.megatextureIndex;
        const megatextureIndexParent = parentKeyframeNode.megatextureIndex;

        leafNodeOctreeData[baseIdx + 0] = lodLerp;
        leafNodeOctreeData[baseIdx + 1] = levelDifferenceChild;
        leafNodeOctreeData[baseIdx + 2] = levelDifferenceParent;
        leafNodeOctreeData[baseIdx + 3] = megatextureIndexChild;
        leafNodeOctreeData[baseIdx + 4] = megatextureIndexParent;

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

  copyToInternalNodeTexture(
    internalNodeOctreeData,
    9,
    that.internalNodeTilesPerRow,
    that.internalNodeTexture,
  );
  if (useLeafNodes) {
    copyToLeafNodeTexture(
      leafNodeOctreeData,
      2,
      that.leafNodeTilesPerRow,
      that.leafNodeTexture,
    );
  }
}

/**
 * Compute an interpolation factor between a node and its parent
 * @param {SpatialNode} node
 * @param {number} targetSse
 * @param {number} levelBlendFactor
 * @returns {number}
 * @private
 */
function getLodLerp(node, targetSse, levelBlendFactor) {
  if (node.parent === undefined) {
    return 0.0;
  }
  const sse = node.screenSpaceError;
  const parentSse = node.parent.screenSpaceError;
  const lodLerp = (targetSse - sse) / (parentSse - sse);
  const blended = (lodLerp + levelBlendFactor - 1.0) / levelBlendFactor;

  return CesiumMath.clamp(blended, 0.0, 1.0);
}

/**
 *
 * @param {number[]} data
 * @param {number} texelsPerTile
 * @param {number} tilesPerRow
 * @param {Texture} texture
 * @private
 */
function copyToInternalNodeTexture(data, texelsPerTile, tilesPerRow, texture) {
  const channelCount = PixelFormat.componentsLength(texture.pixelFormat);
  const tileCount = Math.ceil(data.length / texelsPerTile);
  const copyWidth = Math.max(
    1,
    texelsPerTile * Math.min(tileCount, tilesPerRow),
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
 *
 * @param {number[]} data
 * @param {number} texelsPerTile
 * @param {number} tilesPerRow
 * @param {Texture} texture
 * @private
 */
function copyToLeafNodeTexture(data, texelsPerTile, tilesPerRow, texture) {
  const channelCount = PixelFormat.componentsLength(texture.pixelFormat);
  const datasPerTile = 5;
  const tileCount = Math.ceil(data.length / datasPerTile);
  const copyWidth = Math.max(
    1,
    texelsPerTile * Math.min(tileCount, tilesPerRow),
  );
  const copyHeight = Math.max(1, Math.ceil(tileCount / tilesPerRow));

  const textureData = new Uint8Array(copyWidth * copyHeight * channelCount);
  for (let tileIndex = 0; tileIndex < tileCount; tileIndex++) {
    const timeLerp = data[tileIndex * datasPerTile + 0];
    const previousKeyframeLevelsAbove = data[tileIndex * datasPerTile + 1];
    const nextKeyframeLevelsAbove = data[tileIndex * datasPerTile + 2];
    const previousKeyframeMegatextureIndex = data[tileIndex * datasPerTile + 3];
    const nextKeyframeMegatextureIndex = data[tileIndex * datasPerTile + 4];

    const timeLerpCompressed = CesiumMath.clamp(
      Math.floor(65536 * timeLerp),
      0,
      65535,
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

/**
 * @param {number} tileCount
 * @param {Cartesian3} dimensions
 * @param {MetadataType[]} types
 * @param {MetadataComponentType[]} componentTypes
 * @private
 */
function getApproximateTextureMemoryByteLength(
  tileCount,
  dimensions,
  types,
  componentTypes,
) {
  let textureMemoryByteLength = 0;

  const length = types.length;
  for (let i = 0; i < length; i++) {
    const type = types[i];
    const componentType = componentTypes[i];
    const componentCount = MetadataType.getComponentCount(type);

    textureMemoryByteLength +=
      Megatexture.getApproximateTextureMemoryByteLength(
        tileCount,
        dimensions,
        componentCount,
        componentType,
      );
  }

  return textureMemoryByteLength;
}

export default VoxelTraversal;
