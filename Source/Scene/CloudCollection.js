import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import Cartesian3 from "../Core/Cartesian3.js";
import ComputeCommand from "../Renderer/ComputeCommand.js";
import CloudType from "./CloudType.js";
import CloudCollectionFS from "../Shaders/CloudCollectionFS.js";
import CloudCollectionVS from "../Shaders/CloudCollectionVS.js";
import CloudTextureFS from "../Shaders/CloudTextureFS.js";
import CloudTextureVS from "../Shaders/CloudTextureVS.js";
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
  compressedAttribute0: 2, // show, direction
  compressedAttribute1: 3, // cloudSize, slice
};

var attributeLocationsInstanced = {
  direction: 0,
  positionHighAndScaleX: 1,
  positionLowAndScaleY: 2,
  compressedAttribute0: 3, // show,
  compressedAttribute1: 4, // cloudSize, slice
};

var SHOW_INDEX = CumulusCloud.SHOW_INDEX;
var POSITION_INDEX = CumulusCloud.POSITION_INDEX;
var SCALE_INDEX = CumulusCloud.SCALE_INDEX;
var MAXIMUM_SIZE_INDEX = CumulusCloud.MAXIMUM_SIZE_INDEX;
var SLICE_INDEX = CumulusCloud.SLICE_INDEX;
var NUMBER_OF_PROPERTIES = CumulusCloud.NUMBER_OF_PROPERTIES;

/**
 * A collection of clouds in the sky.
 *
 * @alias CloudCollection
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.show=true] Whether to display the clouds.
 * @param {Boolean} [options.debugBillboards=false] For debugging only. Determines if the billboards are rendered with an opaque color.
 * @param {Boolean} [options.debugEllipsoids=false] For debugging only. Determines if the clouds will be rendered as opaque ellipsoids.
 * @see CloudCollection#add
 * @see CloudCollection#remove
 * @see CumulusCloud
 *
 * @example
 * // Create a billboard collection with two cumulus clouds
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
  this._noiseDetail = 16.0; // must be a power of two
  this._noiseOffset = Cartesian3.ZERO;
  this._loading = false;
  this._ready = true;

  var that = this;
  this._uniforms = {
    u_noiseTexture: function () {
      return that._noiseTexture;
    },
    u_noiseTextureLength: function () {
      return that._noiseTextureLength;
    },
    u_noiseDetail: function () {
      return that._noiseDetail;
    },
  };

  this._vaNoise = undefined;
  this._spNoise = undefined;

  this._sp = undefined;
  this._rs = undefined;

  this._show = defaultValue(options.show, true);
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

  /**
   * Determines if this collection of clouds will be shown.
   * @memberof CloudCollection.prototype
   * @type {Boolean}
   * @default true
   */
  show: {
    get: function () {
      return this._show;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._show !== value) {
        this._show = value;
      }
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
 *   slice: 0.0,
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
  var cloudType;
  if (defined(options)) {
    cloudType = defaultValue(options.cloudType, CloudType.CUMULUS);
  } else {
    cloudType = CloudType.CUMULUS;
  }

  var c;
  if (cloudType === CloudType.CUMULUS) {
    c = new CumulusCloud(options, this);
    c._index = this._clouds.length;
    this._clouds.push(c);
    this._createVertexArray = true;
  }

  return c;
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
    this._clouds[cloud._index] = null; // Removed later in removeClouds()
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
      if (cloud) {
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
  if (!defined(index)) {
    throw new DeveloperError("index is required.");
  }
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
      index: attributeLocations.compressedAttribute0,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      usage: BufferUsage.STATIC_DRAW,
    },
    {
      index: attributeLocations.compressedAttribute1,
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

function writeCompressedAttribute0(
  cloudCollection,
  frameState,
  vafWriters,
  cloud
) {
  var i;
  var writer = vafWriters[attributeLocations.compressedAttribute0];
  var show = cloud.show;

  if (cloudCollection._instanced) {
    i = cloud._index;
    writer(i, show, 0.0, 0.0, 0.0);
  } else {
    i = cloud._index * 4;
    writer(i + 0, show, 0.0, 0.0, 0.0);
    writer(i + 1, show, 0.0, 1.0, 0.0);
    writer(i + 2, show, 0.0, 1.0, 1.0);
    writer(i + 3, show, 0.0, 0.0, 1.0);
  }
}

function writeCompressedAttribute1(
  cloudCollection,
  frameState,
  vafWriters,
  cloud
) {
  var i;
  var writer = vafWriters[attributeLocations.compressedAttribute1];
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
  writeCompressedAttribute0(cloudCollection, frameState, vafWriters, cloud);
  writeCompressedAttribute1(cloudCollection, frameState, vafWriters, cloud);
}

var scratchWriterArray = [];

/**
 * @private
 */
CloudCollection.prototype.update = function (frameState) {
  removeClouds(this);
  if (!this.show) {
    return;
  }

  var context = frameState.context;
  var debugging = this.debugBillboards || this.debugEllipsoids;
  if (!defined(this._texture) && !this._loading && !debugging) {
    this._vaNoise = createTextureVA(context);
    this._spNoise = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: CloudTextureVS,
      fragmentShaderSource: CloudTextureFS,
      attributeLocations: {
        position: 0,
      },
    });

    var noiseTextureLength = this._noiseTextureLength;
    var noiseDetail = this._noiseDetail;
    var noiseOffset = this._noiseOffset;

    this._noiseTexture = new Texture({
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
      vertexArray: this._vaNoise,
      shaderProgram: this._spNoise,
      outputTexture: this._noiseTexture,
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
      owner: this,
      postExecute: function (texture) {
        this._ready = true;
        this._loading = false;
      },
    });

    frameState.commandList.push(textureCommand);
    this._loading = true;
  }

  this._instanced = context.instancedArrays;
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

  var properties = this._propertiesChanged;

  var vafWriters;
  var pass = frameState.passes;

  var i;
  if (this._createVertexArray) {
    this._createVertexArray = false;
    this._vaf = this._vaf && this._vaf.destroy();
    if (cloudsLength > 0) {
      this._vaf = createVAF(context, cloudsLength, this._instanced);
      vafWriters = this._vaf.writers;

      // Rewrite entire buffer if clouds were added or removed.
      for (i = 0; i < cloudsLength; ++i) {
        var cloud = clouds[i];
        writeCloud(this, frameState, vafWriters, cloud);
      }

      // Different cloud collections share the same index buffer.
      this._vaf.commit(getIndexBuffer(context));
    }
  } else if (cloudsToUpdateLength > 0) {
    // Clouds were modified, but none were added or removed.
    var writers = scratchWriterArray;
    writers.length = 0;

    if (properties[POSITION_INDEX] || properties[SCALE_INDEX]) {
      writers.push(writePositionAndScale);
    }

    if (properties[SHOW_INDEX]) {
      writers.push(writeCompressedAttribute0);
    }

    if (properties[MAXIMUM_SIZE_INDEX] || properties[SLICE_INDEX]) {
      writers.push(writeCompressedAttribute1);
    }

    var numWriters = writers.length;
    vafWriters = this._vaf.writers;

    var c;
    var w;
    if (cloudsToUpdateLength / cloudsLength > 0.1) {
      // Like BillboardCollection, if more than 10% of clouds change,
      // rewrite the entire buffer.

      for (i = 0; i < cloudsToUpdateLength; ++i) {
        c = cloudsToUpdate[i];
        c._dirty = false;

        for (w = 0; w < numWriters; ++w) {
          writers[w](this, frameState, vafWriters, c);
        }
      }
      this._vaf.commit(getIndexBuffer(context));
    } else {
      for (i = 0; i < cloudsToUpdateLength; ++i) {
        c = cloudsToUpdate[i];
        c._dirty = false;

        for (w = 0; w < numWriters; ++w) {
          writers[w](this, frameState, vafWriters, c);
        }

        if (this._instanced) {
          this._vaf.subCommit(c._index, 1);
        } else {
          this._vaf.subCommit(c._index * 4, 4);
        }
      }
      this._vaf.endSubCommits();
    }

    this._cloudsToUpdateIndex = 0;
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

  var uniforms = this._uniforms;
  var vsSource = CloudCollectionVS;
  var fsSource = CloudCollectionFS;

  var vs = new ShaderSource({
    defines: [],
    sources: [vsSource],
  });

  if (this._instanced) {
    vs.defines.push("INSTANCED");
  }

  var fs = new ShaderSource({
    defines: [],
    sources: [fsSource],
  });

  if (this.debugBillboards) {
    fs.defines.push("DEBUG_BILLBOARDS");
  }

  if (this.debugEllipsoids) {
    fs.defines.push("DEBUG_ELLIPSOIDS");
  }

  this._sp = ShaderProgram.replaceCache({
    context: context,
    shaderProgram: this._sp,
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });

  this._rs = RenderState.fromCache({
    depthTest: {
      enabled: true,
      func: WebGLConstants.LESS,
    },
    depthMask: true,
  });

  var commandList = frameState.commandList;
  if (pass.render) {
    var colorList = this._colorCommands;

    var va = this._vaf.va;
    var vaLength = va.length;
    colorList.length = vaLength;
    var command;
    for (var j = 0; j < vaLength; j++) {
      command = colorList[j] = new DrawCommand();
      command.pass = Pass.TRANSLUCENT;
      command.owner = this;
      command.uniformMap = uniforms;
      command.count = va[j].indicesCount;
      command.vertexArray = va[j].va;
      command.shaderProgram = this._sp;
      command.renderState = this._rs;
      if (this._instanced) {
        command.count = 6;
        command.instanceCount = cloudsLength;
      }

      commandList.push(command);
    }
  }
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
  destroyClouds(this._clouds);

  return destroyObject(this);
};

export default CloudCollection;
