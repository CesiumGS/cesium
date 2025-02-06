import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import CesiumMath from "../Core/Math.js";
import MetadataComponentType from "./MetadataComponentType.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import RuntimeError from "../Core/RuntimeError.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import VoxelContent from "./VoxelContent.js";

/**
 * @alias Megatexture
 * @constructor
 *
 * @param {Context} context
 * @param {Cartesian3} dimensions
 * @param {number} channelCount
 * @param {MetadataComponentType} componentType
 * @param {number} [textureMemoryByteLength]
 *
 * @private
 */
function Megatexture(
  context,
  dimensions,
  channelCount,
  componentType,
  textureMemoryByteLength,
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
    pixelFormat = context.webgl2 ? PixelFormat.RED : PixelFormat.LUMINANCE;
  } else if (channelCount === 2) {
    pixelFormat = context.webgl2 ? PixelFormat.RG : PixelFormat.LUMINANCE_ALPHA;
  } else if (channelCount === 3) {
    pixelFormat = PixelFormat.RGB;
  } else if (channelCount === 4) {
    pixelFormat = PixelFormat.RGBA;
  }

  const maximumTextureMemoryByteLength = 512 * 1024 * 1024;
  const defaultTextureMemoryByteLength = 128 * 1024 * 1024;
  textureMemoryByteLength = Math.min(
    defaultValue(textureMemoryByteLength, defaultTextureMemoryByteLength),
    maximumTextureMemoryByteLength,
  );
  const maximumTextureDimensionContext = ContextLimits.maximumTextureSize;
  const componentTypeByteLength =
    MetadataComponentType.getSizeInBytes(componentType);
  const texelCount = Math.floor(
    textureMemoryByteLength / (channelCount * componentTypeByteLength),
  );
  const textureDimension = Math.min(
    maximumTextureDimensionContext,
    CesiumMath.previousPowerOfTwo(Math.floor(Math.sqrt(texelCount))),
  );

  const sliceCountPerRegionX = Math.ceil(Math.sqrt(dimensions.x));
  const sliceCountPerRegionY = Math.ceil(dimensions.z / sliceCountPerRegionX);
  const voxelCountPerRegionX = sliceCountPerRegionX * dimensions.x;
  const voxelCountPerRegionY = sliceCountPerRegionY * dimensions.y;
  const regionCountPerMegatextureX = Math.floor(
    textureDimension / voxelCountPerRegionX,
  );
  const regionCountPerMegatextureY = Math.floor(
    textureDimension / voxelCountPerRegionY,
  );

  if (regionCountPerMegatextureX === 0 || regionCountPerMegatextureY === 0) {
    throw new RuntimeError("Tileset is too large to fit into megatexture");
  }

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
   * @type {Cartesian3}
   * @readonly
   */
  this.voxelCountPerTile = Cartesian3.clone(dimensions, new Cartesian3());

  /**
   * @type {number}
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
    regionCountPerMegatextureY,
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.voxelCountPerRegion = new Cartesian2(
    voxelCountPerRegionX,
    voxelCountPerRegionY,
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.sliceCountPerRegion = new Cartesian2(
    sliceCountPerRegionX,
    sliceCountPerRegionY,
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.voxelSizeUv = new Cartesian2(
    1.0 / textureDimension,
    1.0 / textureDimension,
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.sliceSizeUv = new Cartesian2(
    dimensions.x / textureDimension,
    dimensions.y / textureDimension,
  );

  /**
   * @type {Cartesian2}
   * @readonly
   */
  this.regionSizeUv = new Cartesian2(
    voxelCountPerRegionX / textureDimension,
    voxelCountPerRegionY / textureDimension,
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

  const componentDatatype =
    MetadataComponentType.toComponentDatatype(componentType);

  /**
   * @type {Array}
   */
  this.tileVoxelDataTemp = ComponentDatatype.createTypedArray(
    componentDatatype,
    voxelCountPerRegionX * voxelCountPerRegionY * channelCount,
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
   * @type {number}
   * @readonly
   */
  this.occupiedCount = 0;
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
 * @param {VoxelContent.MetadataOrder} [order=VoxelContent.MetadataOrder.XYZ] The ordering of the data in the array.
 * @returns {number} The index of the tile's location in the megatexture.
 */
Megatexture.prototype.add = function (data, order) {
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
  this.writeDataToTexture(index, data, order);

  this.occupiedCount++;
  return index;
};

/**
 * @param {number} index
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
 * @param {number} tileCount
 * @param {Cartesian3} dimensions
 * @param {number} channelCount number of channels in the metadata. Must be 1 to 4.
 * @param {MetadataComponentType} componentType
 * @returns {number}
 */
Megatexture.getApproximateTextureMemoryByteLength = function (
  tileCount,
  dimensions,
  channelCount,
  componentType,
) {
  // TODO there's a lot of code duplicate with Megatexture constructor

  // Unsigned short textures not allowed in webgl 1, so treat as float
  if (componentType === MetadataComponentType.UNSIGNED_SHORT) {
    componentType = MetadataComponentType.FLOAT32;
  }

  const datatypeSizeInBytes =
    MetadataComponentType.getSizeInBytes(componentType);
  const voxelCountTotal =
    tileCount * dimensions.x * dimensions.y * dimensions.z;

  const sliceCountPerRegionX = Math.ceil(Math.sqrt(dimensions.x));
  const sliceCountPerRegionY = Math.ceil(dimensions.z / sliceCountPerRegionX);
  const voxelCountPerRegionX = sliceCountPerRegionX * dimensions.x;
  const voxelCountPerRegionY = sliceCountPerRegionY * dimensions.y;

  // Find the power of two that can fit all tile data, accounting for slices.
  // There's probably a non-iterative solution for this, but this is good enough for now.
  let textureDimension = CesiumMath.previousPowerOfTwo(
    Math.floor(Math.sqrt(voxelCountTotal)),
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
 * Write an array of tile metadata to the megatexture.
 * @param {number} index The index of the tile's location in the megatexture.
 * @param {Float32Array|Uint16Array|Uint8Array} data The data to be written.
 * @param {VoxelContent.MetadataOrder} [order=VoxelContent.MetadataOrder.XYZ] The ordering of the data in the array
 */
Megatexture.prototype.writeDataToTexture = function (index, data, order) {
  // Unsigned short textures not allowed in webgl 1, so treat as float
  const tileData =
    data.constructor === Uint16Array ? new Float32Array(data) : data;

  const {
    tileVoxelDataTemp,
    voxelCountPerTile,
    sliceCountPerRegion,
    voxelCountPerRegion,
    channelCount,
    regionCountPerMegatexture,
  } = this;

  for (let z = 0; z < voxelCountPerTile.z; z++) {
    const sliceVoxelOffsetX = (z % sliceCountPerRegion.x) * voxelCountPerTile.x;
    const sliceVoxelOffsetY =
      Math.floor(z / sliceCountPerRegion.x) * voxelCountPerTile.y;
    for (let y = 0; y < voxelCountPerTile.y; y++) {
      const readOffset =
        order === VoxelContent.MetadataOrder.GLTF
          ? (y * voxelCountPerTile.z + z) * voxelCountPerTile.x
          : (z * voxelCountPerTile.y + y) * voxelCountPerTile.x;
      const writeOffset =
        (sliceVoxelOffsetY + y) * voxelCountPerRegion.x + sliceVoxelOffsetX;
      for (let x = 0; x < voxelCountPerTile.x; x++) {
        const readIndex = readOffset + x;
        const writeIndex = writeOffset + x;
        for (let c = 0; c < channelCount; c++) {
          tileVoxelDataTemp[writeIndex * channelCount + c] =
            tileData[readIndex * channelCount + c];
        }
      }
    }
  }

  const voxelOffsetX =
    (index % regionCountPerMegatexture.x) * voxelCountPerRegion.x;
  const voxelOffsetY =
    Math.floor(index / regionCountPerMegatexture.x) * voxelCountPerRegion.y;

  const source = {
    arrayBufferView: tileVoxelDataTemp,
    width: voxelCountPerRegion.x,
    height: voxelCountPerRegion.y,
  };

  const copyOptions = {
    source: source,
    xOffset: voxelOffsetX,
    yOffset: voxelOffsetY,
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
