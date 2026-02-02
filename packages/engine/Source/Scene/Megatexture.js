import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import MetadataComponentType from "./MetadataComponentType.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import RuntimeError from "../Core/RuntimeError.js";
import Sampler from "../Renderer/Sampler.js";
import Texture3D from "../Renderer/Texture3D.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";

/**
 * @alias Megatexture
 * @constructor
 *
 * @param {Context} context The context in which to create GPU resources.
 * @param {Cartesian3} dimensions The number of voxels in each dimension of the tile.
 * @param {number} channelCount The number of channels in the metadata.
 * @param {MetadataComponentType} componentType The component type of the metadata.
 * @param {number} [availableTextureMemoryBytes=134217728] An upper limit on the texture memory size in bytes.
 *
 * @exception {RuntimeError} The GL context does not support a 3D texture large enough to contain a tile with the given dimensions.
 * @exception {RuntimeError} Not enough texture memory available to create a megatexture with the given tile dimensions.
 *
 * @private
 */
function Megatexture(
  context,
  dimensions,
  channelCount,
  componentType,
  availableTextureMemoryBytes = 134217728, // 128 MB
  tileCount,
) {
  // TODO there are a lot of texture packing rules, see https://github.com/CesiumGS/cesium/issues/9572
  const pixelDataType = getPixelDataType(componentType);
  const pixelFormat = getPixelFormat(channelCount);

  const bytesPerSample =
    channelCount * MetadataComponentType.getSizeInBytes(componentType);
  const textureDimension = Megatexture.get3DTextureDimension(
    dimensions,
    bytesPerSample,
    availableTextureMemoryBytes,
    tileCount,
  );

  const tileCounts = Cartesian3.divideComponents(
    textureDimension,
    dimensions,
    new Cartesian3(),
  );

  /**
   * @type {number}
   * @readonly
   */
  this.channelCount = channelCount;

  /**
   * @type {MetadataComponentType}
   * @readonly
   */
  this.componentType = componentType;

  /**
   * @type {number}
   * @readonly
   */
  this.textureMemoryByteLength =
    bytesPerSample *
    textureDimension.x *
    textureDimension.y *
    textureDimension.z;

  /**
   * @type {Cartesian3}
   * @readonly
   */
  this.tileCounts = Cartesian3.clone(tileCounts, new Cartesian3());

  /**
   * @type {Cartesian3}
   * @readonly
   */
  this.voxelCountPerTile = Cartesian3.clone(dimensions, new Cartesian3());

  /**
   * @type {number}
   * @readonly
   */
  this.maximumTileCount = tileCounts.x * tileCounts.y * tileCounts.z;

  /**
   * @type {Texture3D}
   * @readonly
   */
  this.texture = new Texture3D({
    context: context,
    pixelFormat: pixelFormat,
    pixelDatatype: pixelDataType,
    flipY: false,
    width: textureDimension.x,
    height: textureDimension.y,
    depth: textureDimension.z,
    sampler: new Sampler({
      wrapR: TextureWrap.CLAMP_TO_EDGE,
      wrapS: TextureWrap.CLAMP_TO_EDGE,
      wrapT: TextureWrap.CLAMP_TO_EDGE,
      minificationFilter: TextureMinificationFilter.LINEAR,
      magnificationFilter: TextureMagnificationFilter.LINEAR,
    }),
  });

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
   * @type {number}
   * @readonly
   */
  this.occupiedCount = 0;

  this._nearestSampling = false;
}

Object.defineProperties(Megatexture.prototype, {
  /**
   * Gets or sets the nearest sampling flag.
   * @type {boolean}
   */
  nearestSampling: {
    get: function () {
      return this._nearestSampling;
    },
    set: function (nearestSampling) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("nearestSampling", nearestSampling);
      //>>includeEnd('debug');
      if (this._nearestSampling === nearestSampling) {
        return;
      }
      if (nearestSampling) {
        this.texture.sampler = Sampler.NEAREST;
      } else {
        this.texture.sampler = new Sampler({
          wrapR: TextureWrap.CLAMP_TO_EDGE,
          wrapS: TextureWrap.CLAMP_TO_EDGE,
          wrapT: TextureWrap.CLAMP_TO_EDGE,
          minificationFilter: TextureMinificationFilter.LINEAR,
          magnificationFilter: TextureMagnificationFilter.LINEAR,
        });
      }
      this._nearestSampling = nearestSampling;
    },
  },
});

/**
 * Get the pixel data type to use in a megatexture.
 * TODO support more
 *
 * @param {MetadataComponentType} componentType The component type of the metadata.
 * @returns {PixelDatatype} The pixel datatype to use for a megatexture.
 *
 * @private
 */
function getPixelDataType(componentType) {
  if (
    componentType === MetadataComponentType.FLOAT32 ||
    componentType === MetadataComponentType.FLOAT64
  ) {
    return PixelDatatype.FLOAT;
  } else if (componentType === MetadataComponentType.UINT8) {
    return PixelDatatype.UNSIGNED_BYTE;
  }
}

/**
 * Get the pixel format to use for a megatexture.
 *
 * @param {number} channelCount The number of channels in the metadata. Must be 1 to 4.
 * @returns {PixelFormat} The pixel format to use for a megatexture.
 *
 * @private
 */
function getPixelFormat(channelCount) {
  switch (channelCount) {
    case 1:
      return PixelFormat.RED;
    case 2:
      return PixelFormat.RG;
    case 3:
      return PixelFormat.RGB;
    case 4:
      return PixelFormat.RGBA;
  }
}

/**
 * @alias MegatextureNode
 * @constructor
 *
 * @param {number} index
 *
 * @private
 */
function MegatextureNode(index) {
  /**
   * @type {number}
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
 * Add an array of tile metadata to the megatexture.
 * @param {Array} data The data to be added.
 * @returns {number} The index of the tile's location in the megatexture.
 *
 * @exception {DeveloperError} Trying to add when there are no empty spots.
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
 * @param {number} index
 * @exception {DeveloperError} Megatexture index out of bounds.
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
 * @returns {boolean}
 */
Megatexture.prototype.isFull = function () {
  return this.emptyList === undefined;
};

/**
 * Compute a 3D texture dimension that contains the given number of tiles, or as many tiles as can fit within the available texture memory.
 * Not used outside the class, but exposed for testing.
 * @param {Cartesian3} tileDimensions The dimensions of one tile in number of voxels.
 * @param {number} bytesPerSample The number of bytes per voxel sample.
 * @param {number} availableTextureMemoryBytes An upper limit on the texture memory size in bytes.
 * @param {number} [tileCount] The total number of tiles in the tileset.
 * @returns {Cartesian3} The computed 3D texture dimensions.
 *
 * @exception {RuntimeError} The GL context does not support a 3D texture large enough to contain a tile with the given dimensions.
 * @exception {RuntimeError} Not enough texture memory available to create a megatexture with the given tile dimensions.
 * @private
 */
Megatexture.get3DTextureDimension = function (
  tileDimensions,
  bytesPerSample,
  availableTextureMemoryBytes,
  tileCount,
) {
  const { maximum3DTextureSize } = ContextLimits;
  if (Cartesian3.maximumComponent(tileDimensions) > maximum3DTextureSize) {
    throw new RuntimeError(
      "The GL context does not support a 3D texture large enough to contain a tile with the given dimensions.",
    );
  }

  // Find the number of tiles we can fit.
  const tileSizeInBytes =
    bytesPerSample * tileDimensions.x * tileDimensions.y * tileDimensions.z;
  const maxTileCount = Math.floor(
    availableTextureMemoryBytes / tileSizeInBytes,
  );
  if (maxTileCount < 1) {
    throw new RuntimeError(
      "Not enough texture memory available to create a megatexture with the given tile dimensions.",
    );
  }

  if (defined(tileCount)) {
    tileCount = Math.min(tileCount, maxTileCount);
  } else {
    tileCount = maxTileCount;
  }

  // Sort the tile dimensions from largest to smallest.
  const sortedDimensions = Object.entries(tileDimensions).sort(
    (a, b) => b[1] - a[1],
  );

  // Compute the number of tiles that we can fit along each axis of a 3D texture,
  // starting from the largest texture the context can support
  const tilesPerDimension = sortedDimensions.map(([axis, dimension]) =>
    Math.floor(maximum3DTextureSize / dimension),
  );

  // Reduce the number of tiles along each dimension until the total number of
  // tiles is close to but not less than tileCount.
  // Start from the dimension along which the tiles are largest, since
  // along this dimension each removed slice will contain the most tiles.
  for (let i = 0; i < 3; i++) {
    const currentTileCount = getVolume(tilesPerDimension);
    if (currentTileCount < tileCount) {
      break;
    }
    const sliceDimensions = tilesPerDimension.slice();
    sliceDimensions.splice(i, 1);
    const tilesPerSlice = sliceDimensions[0] * sliceDimensions[1];
    const excessTiles = currentTileCount - tileCount;
    const slicesToRemove = Math.floor(excessTiles / tilesPerSlice);
    tilesPerDimension[i] -= slicesToRemove;
  }

  // Make sure we are less than maximumTileCount (to fit within memory)
  if (getVolume(tilesPerDimension) > maxTileCount) {
    tilesPerDimension[2] = Math.floor(
      maxTileCount / (tilesPerDimension[0] * tilesPerDimension[1]),
    );
  }

  // Compute the final texture dimensions
  const textureDimension = new Cartesian3();
  for (let i = 0; i < 3; i++) {
    const [axis, dimension] = sortedDimensions[i];
    textureDimension[axis] = tilesPerDimension[i] * dimension;
  }

  return textureDimension;
};

function getVolume(dimensionsArray) {
  return dimensionsArray.reduce((p, d) => p * d);
}

/**
 * Write an array of tile metadata to the megatexture.
 * @param {number} index The index of the tile's location in the megatexture.
 * @param {Float32Array|Uint16Array|Uint8Array} tileData The data to be written.
 */
Megatexture.prototype.writeDataToTexture = function (index, tileData) {
  const { tileCounts, voxelCountPerTile } = this;

  const source = {
    arrayBufferView: tileData,
    width: voxelCountPerTile.x,
    height: voxelCountPerTile.y,
    depth: voxelCountPerTile.z,
  };

  const tilesPerZ = tileCounts.x * tileCounts.y;
  const iz = Math.floor(index / tilesPerZ);
  const remainder = index - iz * tilesPerZ;
  const iy = Math.floor(remainder / tileCounts.x);
  const ix = remainder - iy * tileCounts.x;

  const copyOptions = {
    source: source,
    xOffset: ix * voxelCountPerTile.x,
    yOffset: iy * voxelCountPerTile.y,
    zOffset: iz * voxelCountPerTile.z,
  };

  this.texture.copyFrom(copyOptions);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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

export default Megatexture;
