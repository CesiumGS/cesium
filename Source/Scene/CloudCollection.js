import BlendingState from "./BlendingState.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import ComputeCommand from "../Renderer/ComputeCommand.js";
import CloudType from "./CloudType.js";
import CloudCollectionFS from "../Shaders/CloudCollectionFS.js";
import CloudCollectionVS from "../Shaders/CloudCollectionVS.js";
import CloudNoiseFS from "../Shaders/CloudNoiseFS.js";
import CloudNoiseVS from "../Shaders/CloudNoiseVS.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import CumulusCloud from "./CumulusCloud.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Pass from "../Renderer/Pass.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import RenderState from "../Renderer/RenderState.js";
import Sampler from "../Renderer/Sampler.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import VertexArray from "../Renderer/VertexArray.js";
import VertexArrayFacade from "../Renderer/VertexArrayFacade.js";
import WebGLConstants from "../Core/WebGLConstants.js";

var attributeLocations;

var attributeLocationsBatched = {
  positionHighAndScaleX: 0,
  positionLowAndScaleY: 1,
  packedAttribute0: 2, // show, brightness, direction
  packedAttribute1: 3, // cloudSize, slice
};

var attributeLocationsInstanced = {
  direction: 0,
  positionHighAndScaleX: 1,
  positionLowAndScaleY: 2,
  packedAttribute0: 3, // show, brightness
  packedAttribute1: 4, // cloudSize, slice
};

var SHOW_INDEX = CumulusCloud.SHOW_INDEX;
var POSITION_INDEX = CumulusCloud.POSITION_INDEX;
var SCALE_INDEX = CumulusCloud.SCALE_INDEX;
var MAXIMUM_SIZE_INDEX = CumulusCloud.MAXIMUM_SIZE_INDEX;
var SLICE_INDEX = CumulusCloud.SLICE_INDEX;
var BRIGHTNESS_INDEX = CumulusCloud.BRIGHTNESS_INDEX;
var NUMBER_OF_PROPERTIES = CumulusCloud.NUMBER_OF_PROPERTIES;

/**
 * A renderable collection of clouds in the 3D scene.
 * <br /><br />
 * <div align='center'>
 * <img src='Images/CumulusCloud.png' width='400' height='300' /><br />
 * Example cumulus clouds
 * </div>
 * <br /><br />
 * Clouds are added and removed from the collection using {@link CloudCollection#add}
 * and {@link CloudCollection#remove}.
 * @alias CloudCollection
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.show=true] Whether to display the clouds.
 * @param {Number} [options.noiseDetail=16.0] Desired amount of detail in the noise texture.
 * @param {Number} [options.noiseOffset=Cartesian3.ZERO] Desired translation of data in noise texture.
 * @param {Boolean} [options.debugBillboards=false] For debugging only. Determines if the billboards are rendered with an opaque color.
 * @param {Boolean} [options.debugEllipsoids=false] For debugging only. Determines if the clouds will be rendered as opaque ellipsoids.
 * @see CloudCollection#add
 * @see CloudCollection#remove
 * @see CumulusCloud
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Clouds.html|Cesium Sandcastle Clouds Demo}
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Cloud%20Parameters.html|Cesium Sandcastle Cloud Parameters Demo}
 *
 * @example
 * // Create a cloud collection with two cumulus clouds
 * var clouds = scene.primitives.add(new Cesium.CloudCollection());
 * clouds.add({
 *   position : new Cesium.Cartesian3(1.0, 2.0, 3.0),
 *   maximumSize: new Cesium.Cartesian3(20.0, 12.0, 8.0)
 * });
 * clouds.add({
 *   position : new Cesium.Cartesian3(4.0, 5.0, 6.0),
 *   maximumSize: new Cesium.Cartesian3(15.0, 9.0, 9.0),
 *   slice: 0.5
 * });
 *
 */
function CloudCollection(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._clouds = [];
  this._cloudsToUpdate = [];
  this._cloudsToUpdateIndex = 0;
  this._cloudsRemoved = false;
  this._createVertexArray = false;

  this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);

  this._noiseTexture = undefined;
  this._noiseTextureLength = 128;

  /**
   * <p>
   * Controls the amount of detail captured in the precomputed noise texture
   * used to render the cumulus clouds. In order for the texture to be tileable,
   * this must be a power of two. For best results, set this to be a power of two
   * between <code>8.0</code> and <code>32.0</code> (inclusive).
   * </p>
   *
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'>
   *   <code>clouds.noiseDetail = 8.0;</code><br/>
   *   <img src='Images/CloudCollection.noiseDetail8.png' width='250' height='158' />
   * </td>
   * <td align='center'>
   *   <code>clouds.noiseDetail = 32.0;</code><br/>
   *   <img src='Images/CloudCollection.noiseDetail32.png' width='250' height='158' />
   * </td>
   * </tr></table>
   * </div>
   *
   * @type {Number}
   *
   * @default 16.0
   */
  this.noiseDetail = defaultValue(options.noiseDetail, 16.0);

  /**
   * <p>
   * Applies a translation to noise texture coordinates to generate different data.
   * This can be modified if the default noise does not generate good-looking clouds.
   * </p>
   *
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'>
   *   <code>default</code><br/>
   *   <img src='Images/CloudCollection.noiseOffsetdefault.png' width='250' height='158' />
   * </td>
   * <td align='center'>
   *   <code>clouds.noiseOffset = new Cesium.Cartesian3(10, 20, 10);</code><br/>
   *   <img src='Images/CloudCollection.noiseOffsetx10y20z10.png' width='250' height='158' />
   * </td>
   * </tr></table>
   * </div>
   * @type {Cartesian3}
   *
   * @default Cartesian3.ZERO
   */
  this.noiseOffset = Cartesian3.clone(
    defaultValue(options.noiseOffset, Cartesian3.ZERO)
  );

  this._loading = false;
  this._ready = false;

  var that = this;
  this._uniforms = {
    u_noiseTexture: function () {
      return that._noiseTexture;
    },
    u_noiseTextureLength: function () {
      return that._noiseTextureLength;
    },
    u_noiseDetail: function () {
      return that.noiseDetail;
    },
  };

  this._vaNoise = undefined;
  this._spNoise = undefined;

  this._spCreated = false;
  this._sp = undefined;
  this._rs = undefined;

  /**
   * Determines if billboards in this collection will be shown.
   *
   * @type {Boolean}
   * @default true
   */
  this.show = defaultValue(options.show, true);

  this._colorCommands = [];

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Renders the billboards with one opaque color for the sake of debugging.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugBillboards = defaultValue(options.debugBillboards, false);
  this._compiledDebugBillboards = false;

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the clouds as opaque, monochrome ellipsoids for the sake of debugging.
   * If <code>debugBillboards</code> is also true, then the ellipsoids will draw on top of the billboards.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugEllipsoids = defaultValue(options.debugEllipsoids, false);
  this._compiledDebugEllipsoids = false;
}

Object.defineProperties(CloudCollection.prototype, {
  /**
   * Returns the number of clouds in this collection.
   * @memberof CloudCollection.prototype
   * @type {Number}
   */
  length: {
    get: function () {
      removeClouds(this);
      return this._clouds.length;
    },
  },
});

function destroyClouds(clouds) {
  var length = clouds.length;
  for (var i = 0; i < length; ++i) {
    if (clouds[i]) {
      clouds[i]._destroy();
    }
  }
}

/**
 * Creates and adds a cloud with the specified initial properties to the collection.
 * The added cloud is returned so it can be modified or removed from the collection later.
 *
 * @param {Object}[options] A template describing the cloud's properties as shown in Example 1.
 * @returns {CumulusCloud} The cloud that was added to the collection.
 *
 * @performance Calling <code>add</code> is expected constant time.  However, the collection's vertex buffer
 * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
 * best performance, add as many clouds as possible before calling <code>update</code>.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * // Example 1:  Add a cumulus cloud, specifying all the default values.
 * var c = clouds.add({
 *   show : true,
 *   position : Cesium.Cartesian3.ZERO,
 *   scale : new Cesium.Cartesian2(20.0, 12.0),
 *   maximumSize: new Cesium.Cartesian3(20.0, 12.0, 12.0),
 *   slice: -1.0,
 *   cloudType : CloudType.CUMULUS
 * });
 *
 * @example
 * // Example 2:  Specify only the cloud's cartographic position.
 * var c = clouds.add({
 *   position : Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
 * });
 *
 * @see CloudCollection#remove
 * @see CloudCollection#removeAll
 */
CloudCollection.prototype.add = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var cloudType = defaultValue(options.cloudType, CloudType.CUMULUS);
  //>>includeStart('debug', pragmas.debug);
  if (!CloudType.validate(cloudType)) {
    throw new DeveloperError("invalid cloud type");
  }
  //>>includeEnd('debug');

  var cloud;
  if (cloudType === CloudType.CUMULUS) {
    cloud = new CumulusCloud(options, this);
    cloud._index = this._clouds.length;
    this._clouds.push(cloud);
    this._createVertexArray = true;
  }

  return cloud;
};

/**
 * Removes a cloud from the collection.
 *
 * @param {CumulusCloud} cloud The cloud to remove.
 * @returns {Boolean} <code>true</code> if the cloud was removed; <code>false</code> if the cloud was not found in the collection.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * var c = clouds.add(...);
 * clouds.remove(c);  // Returns true
 *
 * @see CloudCollection#add
 * @see CloudCollection#removeAll
 * @see CumulusCloud#show
 */
CloudCollection.prototype.remove = function (cloud) {
  if (this.contains(cloud)) {
    this._clouds[cloud._index] = undefined; // Removed later in removeClouds()
    this._cloudsRemoved = true;
    this._createVertexArray = true;
    cloud._destroy();
    return true;
  }

  return false;
};

/**
 * Removes all clouds from the collection.
 *
 * @performance <code>O(n)</code>.  It is more efficient to remove all the clouds
 * from a collection and then add new ones than to create a new collection entirely.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * clouds.add(...);
 * clouds.add(...);
 * clouds.removeAll();
 *
 * @see CloudCollection#add
 * @see CloudCollection#remove
 */
CloudCollection.prototype.removeAll = function () {
  destroyClouds(this._clouds);
  this._clouds = [];
  this._cloudsToUpdate = [];
  this._cloudsToUpdateIndex = 0;
  this._cloudsRemoved = false;

  this._createVertexArray = true;
};

function removeClouds(cloudCollection) {
  if (cloudCollection._cloudsRemoved) {
    cloudCollection._cloudsRemoved = false;

    var newClouds = [];
    var clouds = cloudCollection._clouds;
    var length = clouds.length;
    for (var i = 0, j = 0; i < length; ++i) {
      var cloud = clouds[i];
      if (defined(cloud)) {
        clouds._index = j++;
        newClouds.push(cloud);
      }
    }

    cloudCollection._clouds = newClouds;
  }
}

CloudCollection.prototype._updateCloud = function (cloud, propertyChanged) {
  if (!cloud._dirty) {
    this._cloudsToUpdate[this._cloudsToUpdateIndex++] = cloud;
  }

  ++this._propertiesChanged[propertyChanged];
};

/**
 * Check whether this collection contains a given cloud.
 *
 * @param {CumulusCloud} [cloud] The cloud to check for.
 * @returns {Boolean} true if this collection contains the cloud, false otherwise.
 *
 * @see CloudCollection#get
 */
CloudCollection.prototype.contains = function (cloud) {
  return defined(cloud) && cloud._cloudCollection === this;
};

/**
 * Returns the cloud in the collection at the specified index. Indices are zero-based
 * and increase as clouds are added. Removing a cloud shifts all clouds after
 * it to the left, changing their indices. This function is commonly used with
 * {@link CloudCollection#length} to iterate over all the clouds in the collection.
 *
 * @param {Number} index The zero-based index of the cloud.
 * @returns {CumulusCloud} The cloud at the specified index.
 *
 * @performance Expected constant time. If clouds were removed from the collection and
 * {@link CloudCollection#update} was not called, an implicit <code>O(n)</code>
 * operation is performed.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * // Toggle the show property of every cloud in the collection
 * var len = clouds.length;
 * for (var i = 0; i < len; ++i) {
 *   var c = clouds.get(i);
 *   c.show = !c.show;
 * }
 *
 * @see CloudCollection#length
 */
CloudCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  removeClouds(this);
  return this._clouds[index];
};

var texturePositions = new Float32Array([
  -1.0,
  -1.0,
  1.0,
  -1.0,
  1.0,
  1.0,
  -1.0,
  1.0,
]);

var textureIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);

function createTextureVA(context) {
  var positionBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: texturePositions,
    usage: BufferUsage.STATIC_DRAW,
  });
  var indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: textureIndices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: IndexDatatype.UNSIGNED_SHORT,
  });

  var attributes = [
    {
      index: 0,
      vertexBuffer: positionBuffer,
      componentsPerAttribute: 2,
      componentDatatype: ComponentDatatype.FLOAT,
    },
  ];

  return new VertexArray({
    context: context,
    attributes: attributes,
    indexBuffer: indexBuffer,
  });
}

var getIndexBuffer;

function getIndexBufferBatched(context) {
  var sixteenK = 16 * 1024;

  var indexBuffer = context.cache.cloudCollection_indexBufferBatched;
  if (defined(indexBuffer)) {
    return indexBuffer;
  }

  // Subtract 6 because the last index is reserved for primitive restart.
  // https://www.khronos.org/registry/webgl/specs/latest/2.0/#5.18
  var length = sixteenK * 6 - 6;
  var indices = new Uint16Array(length);
  for (var i = 0, j = 0; i < length; i += 6, j += 4) {
    indices[i] = j;
    indices[i + 1] = j + 1;
    indices[i + 2] = j + 2;

    indices[i + 3] = j;
    indices[i + 4] = j + 2;
    indices[i + 5] = j + 3;
  }

  indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: indices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: IndexDatatype.UNSIGNED_SHORT,
  });
  indexBuffer.vertexArrayDestroyable = false;
  context.cache.cloudCollection_indexBufferBatched = indexBuffer;
  return indexBuffer;
}

function getIndexBufferInstanced(context) {
  var indexBuffer = context.cache.cloudCollection_indexBufferInstanced;
  if (defined(indexBuffer)) {
    return indexBuffer;
  }

  indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: new Uint16Array([0, 1, 2, 0, 2, 3]),
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: IndexDatatype.UNSIGNED_SHORT,
  });

  indexBuffer.vertexArrayDestroyable = false;
  context.cache.cloudCollection_indexBufferInstanced = indexBuffer;
  return indexBuffer;
}

function getVertexBufferInstanced(context) {
  var vertexBuffer = context.cache.cloudCollection_vertexBufferInstanced;
  if (defined(vertexBuffer)) {
    return vertexBuffer;
  }

  vertexBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: new Float32Array([0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]),
    usage: BufferUsage.STATIC_DRAW,
  });

  vertexBuffer.vertexArrayDestroyable = false;
  context.cache.cloudCollection_vertexBufferInstanced = vertexBuffer;
  return vertexBuffer;
}

function createVAF(context, numberOfClouds, instanced) {
  var attributes = [
    {
      index: attributeLocations.positionHighAndScaleX,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      usage: BufferUsage.STATIC_DRAW,
    },
    {
      index: attributeLocations.positionLowAndScaleY,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      usage: BufferUsage.STATIC_DRAW,
    },
    {
      index: attributeLocations.packedAttribute0,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      usage: BufferUsage.STATIC_DRAW,
    },
    {
      index: attributeLocations.packedAttribute1,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      usage: BufferUsage.STATIC_DRAW,
    },
  ];

  if (instanced) {
    attributes.push({
      index: attributeLocations.direction,
      componentsPerAttribute: 2,
      componentDatatype: ComponentDatatype.FLOAT,
      vertexBuffer: getVertexBufferInstanced(context),
    });
  }

  var sizeInVertices = instanced ? numberOfClouds : 4 * numberOfClouds;
  return new VertexArrayFacade(context, attributes, sizeInVertices, instanced);
}

var writePositionScratch = new EncodedCartesian3();

function writePositionAndScale(cloudCollection, frameState, vafWriters, cloud) {
  var i;
  var positionHighWriter = vafWriters[attributeLocations.positionHighAndScaleX];
  var positionLowWriter = vafWriters[attributeLocations.positionLowAndScaleY];
  var position = cloud.position;

  EncodedCartesian3.fromCartesian(position, writePositionScratch);
  var scale = cloud.scale;

  var high = writePositionScratch.high;
  var low = writePositionScratch.low;

  if (cloudCollection._instanced) {
    i = cloud._index;
    positionHighWriter(i, high.x, high.y, high.z, scale.x);
    positionLowWriter(i, low.x, low.y, low.z, scale.y);
  } else {
    i = cloud._index * 4;
    positionHighWriter(i + 0, high.x, high.y, high.z, scale.x);
    positionHighWriter(i + 1, high.x, high.y, high.z, scale.x);
    positionHighWriter(i + 2, high.x, high.y, high.z, scale.x);
    positionHighWriter(i + 3, high.x, high.y, high.z, scale.x);

    positionLowWriter(i + 0, low.x, low.y, low.z, scale.y);
    positionLowWriter(i + 1, low.x, low.y, low.z, scale.y);
    positionLowWriter(i + 2, low.x, low.y, low.z, scale.y);
    positionLowWriter(i + 3, low.x, low.y, low.z, scale.y);
  }
}

function writePackedAttribute0(cloudCollection, frameState, vafWriters, cloud) {
  var i;
  var writer = vafWriters[attributeLocations.packedAttribute0];
  var show = cloud.show;
  var brightness = cloud.brightness;

  if (cloudCollection._instanced) {
    i = cloud._index;
    writer(i, show, brightness, 0.0, 0.0);
  } else {
    i = cloud._index * 4;
    writer(i + 0, show, brightness, 0.0, 0.0);
    writer(i + 1, show, brightness, 1.0, 0.0);
    writer(i + 2, show, brightness, 1.0, 1.0);
    writer(i + 3, show, brightness, 0.0, 1.0);
  }
}

function writePackedAttribute1(cloudCollection, frameState, vafWriters, cloud) {
  var i;
  var writer = vafWriters[attributeLocations.packedAttribute1];
  var maximumSize = cloud.maximumSize;
  var slice = cloud.slice;

  if (cloudCollection._instanced) {
    i = cloud._index;
    writer(i, maximumSize.x, maximumSize.y, maximumSize.z, slice);
  } else {
    i = cloud._index * 4;
    writer(i + 0, maximumSize.x, maximumSize.y, maximumSize.z, slice);
    writer(i + 1, maximumSize.x, maximumSize.y, maximumSize.z, slice);
    writer(i + 2, maximumSize.x, maximumSize.y, maximumSize.z, slice);
    writer(i + 3, maximumSize.x, maximumSize.y, maximumSize.z, slice);
  }
}

function writeCloud(cloudCollection, frameState, vafWriters, cloud) {
  writePositionAndScale(cloudCollection, frameState, vafWriters, cloud);
  writePackedAttribute0(cloudCollection, frameState, vafWriters, cloud);
  writePackedAttribute1(cloudCollection, frameState, vafWriters, cloud);
}

function createNoiseTexture(cloudCollection, frameState, vsSource, fsSource) {
  var that = cloudCollection;
  var context = frameState.context;
  that._vaNoise = createTextureVA(context);
  that._spNoise = ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vsSource,
    fragmentShaderSource: fsSource,
    attributeLocations: {
      position: 0,
    },
  });

  var noiseTextureLength = that._noiseTextureLength;
  var noiseDetail = that.noiseDetail;
  var noiseOffset = that.noiseOffset;

  that._noiseTexture = new Texture({
    context: context,
    width: noiseTextureLength * noiseTextureLength,
    height: noiseTextureLength,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    pixelFormat: PixelFormat.RGBA,
    sampler: new Sampler({
      wrapS: TextureWrap.REPEAT,
      wrapT: TextureWrap.REPEAT,
      minificationFilter: TextureMinificationFilter.NEAREST,
      magnificationFilter: TextureMagnificationFilter.NEAREST,
    }),
  });

  var textureCommand = new ComputeCommand({
    vertexArray: that._vaNoise,
    shaderProgram: that._spNoise,
    outputTexture: that._noiseTexture,
    uniformMap: {
      u_noiseTextureLength: function () {
        return noiseTextureLength;
      },
      u_noiseDetail: function () {
        return noiseDetail;
      },
      u_noiseOffset: function () {
        return noiseOffset;
      },
    },
    persists: false,
    owner: cloudCollection,
    postExecute: function (texture) {
      that._ready = true;
      that._loading = false;
    },
  });

  frameState.commandList.push(textureCommand);
  that._loading = true;
}

function createVertexArray(cloudCollection, frameState) {
  var that = cloudCollection;
  var context = frameState.context;
  that._createVertexArray = false;
  that._vaf = that._vaf && that._vaf.destroy();

  var clouds = cloudCollection._clouds;
  var cloudsLength = clouds.length;
  if (cloudsLength > 0) {
    that._vaf = createVAF(context, cloudsLength, that._instanced);
    var vafWriters = that._vaf.writers;

    var i;
    // Rewrite entire buffer if clouds were added or removed.
    for (i = 0; i < cloudsLength; ++i) {
      var cloud = clouds[i];
      writeCloud(cloudCollection, frameState, vafWriters, cloud);
    }

    // Different cloud collections share the same index buffer.
    that._vaf.commit(getIndexBuffer(context));
  }
}

var scratchWriterArray = [];

function updateClouds(cloudCollection, frameState) {
  var context = frameState.context;
  var that = cloudCollection;
  var clouds = that._clouds;
  var cloudsLength = clouds.length;
  var cloudsToUpdate = that._cloudsToUpdate;
  var cloudsToUpdateLength = that._cloudsToUpdateIndex;

  var properties = that._propertiesChanged;

  var writers = scratchWriterArray;
  writers.length = 0;

  if (properties[POSITION_INDEX] || properties[SCALE_INDEX]) {
    writers.push(writePositionAndScale);
  }

  if (properties[SHOW_INDEX] || properties[BRIGHTNESS_INDEX]) {
    writers.push(writePackedAttribute0);
  }

  if (properties[MAXIMUM_SIZE_INDEX] || properties[SLICE_INDEX]) {
    writers.push(writePackedAttribute1);
  }

  var numWriters = writers.length;
  var vafWriters = that._vaf.writers;

  var i, c, w;
  if (cloudsToUpdateLength / cloudsLength > 0.1) {
    // Like BillboardCollection, if more than 10% of clouds change,
    // rewrite the entire buffer.

    for (i = 0; i < cloudsToUpdateLength; ++i) {
      c = cloudsToUpdate[i];
      c._dirty = false;

      for (w = 0; w < numWriters; ++w) {
        writers[w](cloudCollection, frameState, vafWriters, c);
      }
    }

    that._vaf.commit(getIndexBuffer(context));
  } else {
    for (i = 0; i < cloudsToUpdateLength; ++i) {
      c = cloudsToUpdate[i];
      c._dirty = false;

      for (w = 0; w < numWriters; ++w) {
        writers[w](cloudCollection, frameState, vafWriters, c);
      }

      if (that._instanced) {
        that._vaf.subCommit(c._index, 1);
      } else {
        that._vaf.subCommit(c._index * 4, 4);
      }
    }
    that._vaf.endSubCommits();
  }

  that._cloudsToUpdateIndex = 0;
}

function createShaderProgram(cloudCollection, frameState, vsSource, fsSource) {
  var context = frameState.context;
  var that = cloudCollection;
  var vs = new ShaderSource({
    defines: [],
    sources: [vsSource],
  });

  if (that._instanced) {
    vs.defines.push("INSTANCED");
  }

  var fs = new ShaderSource({
    defines: [],
    sources: [fsSource],
  });

  if (that.debugBillboards) {
    fs.defines.push("DEBUG_BILLBOARDS");
  }

  if (that.debugEllipsoids) {
    fs.defines.push("DEBUG_ELLIPSOIDS");
  }

  that._sp = ShaderProgram.replaceCache({
    context: context,
    shaderProgram: that._sp,
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });

  that._rs = RenderState.fromCache({
    depthTest: {
      enabled: true,
      func: WebGLConstants.LESS,
    },
    depthMask: false,
    blending: BlendingState.ALPHA_BLEND,
  });

  that._spCreated = true;
  that._compiledDebugBillboards = that.debugBillboards;
  that._compiledDebugEllipsoids = that.debugEllipsoids;
}

function createDrawCommands(cloudCollection, frameState) {
  var that = cloudCollection;
  var pass = frameState.passes;
  var uniforms = that._uniforms;
  var commandList = frameState.commandList;
  if (pass.render) {
    var colorList = that._colorCommands;

    var va = that._vaf.va;
    var vaLength = va.length;
    colorList.length = vaLength;
    for (var i = 0; i < vaLength; i++) {
      var command = colorList[i];
      if (!defined(command)) {
        command = colorList[i] = new DrawCommand();
      }
      command.pass = Pass.TRANSLUCENT;
      command.owner = cloudCollection;
      command.uniformMap = uniforms;
      command.count = va[i].indicesCount;
      command.vertexArray = va[i].va;
      command.shaderProgram = that._sp;
      command.renderState = that._rs;
      if (that._instanced) {
        command.count = 6;
        command.instanceCount = that._clouds.length;
      }

      commandList.push(command);
    }
  }
}

/**
 * @private
 */
CloudCollection.prototype.update = function (frameState) {
  removeClouds(this);
  if (!this.show) {
    return;
  }

  var debugging = this.debugBillboards || this.debugEllipsoids;
  this._ready = debugging ? true : defined(this._noiseTexture);

  if (!this._ready && !this._loading && !debugging) {
    createNoiseTexture(this, frameState, CloudNoiseVS, CloudNoiseFS);
  }

  this._instanced = frameState.context.instancedArrays;
  attributeLocations = this._instanced
    ? attributeLocationsInstanced
    : attributeLocationsBatched;
  getIndexBuffer = this._instanced
    ? getIndexBufferInstanced
    : getIndexBufferBatched;

  var clouds = this._clouds;
  var cloudsLength = clouds.length;
  var cloudsToUpdate = this._cloudsToUpdate;
  var cloudsToUpdateLength = this._cloudsToUpdateIndex;

  if (this._createVertexArray) {
    createVertexArray(this, frameState);
  } else if (cloudsToUpdateLength > 0) {
    // Clouds were modified, but none were added or removed.
    updateClouds(this, frameState);
  }

  // If the number of total clouds ever shrinks considerably,
  // truncate cloudsToUpdate so that we free memory that
  // we are no longer using.
  if (cloudsToUpdateLength > cloudsLength * 1.5) {
    cloudsToUpdate.length = cloudsLength;
  }

  if (
    !defined(this._vaf) ||
    !defined(this._vaf.va) ||
    !this._ready & !debugging
  ) {
    return;
  }

  if (
    !this._spCreated ||
    this.debugBillboards !== this._compiledDebugBillboards ||
    this.debugEllipsoids !== this._compiledDebugEllipsoids
  ) {
    createShaderProgram(this, frameState, CloudCollectionVS, CloudCollectionFS);
  }

  createDrawCommands(this, frameState);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see CloudCollection#destroy
 */
CloudCollection.prototype.isDestroyed = function () {
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
 *
 * @example
 * clouds = clouds && clouds.destroy();
 *
 * @see CloudCollection#isDestroyed
 */
CloudCollection.prototype.destroy = function () {
  this._noiseTexture = this._noiseTexture && this._noiseTexture.destroy();
  this._sp = this._sp && this._sp.destroy();
  this._vaf = this._vaf && this._vaf.destroy();

  destroyClouds(this._clouds);

  return destroyObject(this);
};

export default CloudCollection;
