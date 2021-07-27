import BoundingSphere from "../Core/BoundingSphere.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import Cloud from "./Cloud.js";
import CloudCollectionFS from "../Shaders/CloudCollectionFS.js";
import CloudCollectionVS from "../Shaders/CloudCollectionVS.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Matrix4 from "../Core/Matrix4.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import VertexArrayFacade from "../Renderer/VertexArrayFacade.js";
import WebGLConstants from "../Core/WebGLConstants.js";

var attributeLocations;

var attributeLocationsBatched = {
  positionHighAndScaleX: 0,
  positionLowAndScaleY: 1,
  compressedAttribute: 2, // show, cloud type, texture coordinates
};

var attributeLocationsInstanced = {
  direction: 0,
  positionHighAndScaleX: 1,
  positionLowAndScaleY: 2,
  compressedAttribute: 3,
};

/**
 * A collection of clouds in the sky.
 *
 * @alias CloudCollection
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms each cloud from model to world coordinates.
 * @param {Boolean} [options.show=true] Whether to display the clouds.
 *
 */
function CloudCollection(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._clouds = [];
  this._cloudsRemoved = false;

  this._show = defaultValue(options.show, true);

  this._sp = undefined;
  this._rs = undefined;
  this._boundingVolume = new BoundingSphere();

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the bounding sphere for each draw command in the primitive.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );

  this._modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY);
  this._colorCommands = [];
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
 * @returns {Cloud} The cloud that was added to the collection.
 *
 * @performance Calling <code>add</code> is expected constant time.  However, the collection's vertex buffer
 * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
 * best performance, add as many clouds as possible before calling <code>update</code>.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * // Example 1:  Add a cloud, specifying all the default values.
 * var c = clouds.add({
 *   show : true,
 *   position : Cesium.Cartesian3.ZERO,
 *   scale : new Cesium.Cartesian2(1.0, 1.0),
 *   type : CloudType.CUMULUS
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
  var c = new Cloud(options, this);
  c._index = this._clouds.length;

  this._clouds.push(c);
  this._createVertexArray = true;

  return c;
};

/**
 * Removes a cloud from the collection.
 *
 * @param {Cloud} cloud The cloud to remove.
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
 * @see Cloud#show
 */
CloudCollection.prototype.remove = function (cloud) {
  if (this.contains(cloud)) {
    this._clouds[cloud._index] = null; // Removed later
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

/**
 * Check whether this collection contains a given cloud.
 *
 * @param {Billboard} [cloud] The cloud to check for.
 * @returns {Boolean} true if this collection contains the cloud, false otherwise.
 *
 * @see BillboardCollection#get
 */
CloudCollection.prototype.contains = function (cloud) {
  return defined(cloud) && cloud._cloudCollection === this;
};

/**
 * Returns the cloud in the collection at the specified index. Indices are zero-based
 * and increase as clouds are added. Removing a billboard shifts all clouds after
 * it to the left, changing their indices. This function is commonly used with
 * {@link CloudCollection#length} to iterate over all the clouds in the collection.
 *
 * @param {Number} index The zero-based index of the cloud.
 * @returns {Cloud} The cloud at the specified index.
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
      usage: BufferUsage.STATIC_DRAW, // this.autogenerate ? BufferUsage.DYNAMIC_DRAW : BufferUsage.STATIC_DRAW
    },
    {
      index: attributeLocations.positionLowAndScaleY,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      usage: BufferUsage.STATIC_DRAW, // this.autogenerate ? BufferUsage.DYNAMIC_DRAW : BufferUsage.STATIC_DRAW
    },
    {
      index: attributeLocations.compressedAttribute,
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

function writeCompressedAttribute(
  cloudCollection,
  frameState,
  vafWriters,
  cloud
) {
  var i;
  var writer = vafWriters[attributeLocations.compressedAttribute];
  var show = cloud.show;
  var cloudType = cloud.flat;

  if (cloudCollection._instanced) {
    i = cloud._index;
    writer(i, show, cloudType, 0.0, 0.0);
  } else {
    i = cloud._index * 4;
    writer(i + 0, show, cloudType, 0.0, 0.0);
    writer(i + 1, show, cloudType, 1.0, 0.0);
    writer(i + 2, show, cloudType, 1.0, 1.0);
    writer(i + 3, show, cloudType, 0.0, 1.0);
  }
}

function writeCloud(cloudCollection, frameState, vafWriters, cloud) {
  writePositionAndScale(cloudCollection, frameState, vafWriters, cloud);
  writeCompressedAttribute(cloudCollection, frameState, vafWriters, cloud);
}

/**
 * @private
 */
CloudCollection.prototype.update = function (frameState) {
  removeClouds(this);
  if (!this.show) {
    return;
  }

  var context = frameState.context;
  this._instanced = context.instancedArrays;
  attributeLocations = this._instanced
    ? attributeLocationsInstanced
    : attributeLocationsBatched;
  getIndexBuffer = this._instanced
    ? getIndexBufferInstanced
    : getIndexBufferBatched;

  var clouds = this._clouds;
  var cloudsLength = clouds.length;

  var vafWriters;
  var pass = frameState.passes;

  if (this._createVertexArray) {
    this._createVertexArray = false;
    console.log("Creating");
    this._vaf = this._vaf && this._vaf.destroy();
    if (cloudsLength > 0) {
      this._vaf = createVAF(context, cloudsLength, this._instanced);
      vafWriters = this._vaf.writers;

      // Rewrite entire buffer if clouds were added or removed.
      for (var i = 0; i < cloudsLength; ++i) {
        var cloud = this._clouds[i];
        writeCloud(this, frameState, vafWriters, cloud);
      }

      // Different cloud collections share the same index buffer.
      this._vaf.commit(getIndexBuffer(context));
    }
  }

  if (!defined(this._vaf) || !defined(this._vaf.va)) {
    return;
  }

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
      command.pass = Pass.OPAQUE;
      command.owner = this;

      command.count = va[j].indicesCount;
      command.shaderProgram = this._sp;
      command.vertexArray = va[j].va;
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
