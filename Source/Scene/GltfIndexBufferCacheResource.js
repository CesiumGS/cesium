import Check from "./Check.js";
import IndexDatatype from "./IndexDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import RuntimeError from "../Core/RuntimeError.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import when from "../ThirdParty/when.js";
import JobType from "./JobType.js";

/**
 * An index buffer cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfIndexBufferCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfCache} options.gltfCache The {@link GltfCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key of the resource.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 */
function GltfIndexBufferCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfCache = options.gltfCache;
  var gltf = options.gltf;
  var accessorId = options.accessorId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfCache", gltfCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.accessorId", accessorId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView; // TODO: bufferView is not always defined
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];
  var byteOffset = bufferView.byteOffset + accessor.byteOffset;

  var count = accessor.count;
  var indexDatatype = accessor.componentType;

  this._gltfCache = gltfCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._buffer = buffer;
  this._bufferId = bufferId;
  this._byteOffset = byteOffset;
  this._count = count;
  this._indexDatatype = indexDatatype;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._typedArray = undefined;
  this._indexBuffer = undefined;
  this._indexBufferPromise = undefined;
  this._promise = undefined;
}

Object.defineProperties(GltfIndexBufferCacheResource.prototype, {
  /**
   * A promise that resolves when the resource is ready.
   *
   * @memberof GltfIndexBufferCacheResource.prototype
   *
   * @type {Promise}
   * @readonly
   *
   * @exception {DeveloperError} The resource is not loaded.
   */
  promise: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(this._promise)) {
        throw new DeveloperError("The resource is not loaded");
      }
      //>>includeEnd('debug');
      return this._promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfIndexBufferCacheResource.prototype
   *
   * @type {String}
   * @readonly
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
});

/**
 * Loads the resource.
 */
GltfIndexBufferCacheResource.prototype.load = function () {
  var gltfCache = this._gltfCache;
  var bufferCacheResource = gltfCache.loadBuffer({
    buffer: this._buffer,
    bufferId: this._bufferId,
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
    keepResident: false,
  });

  var that = this;

  this._promise = bufferCacheResource.promise
    .then(function () {
      // Got buffer from the cache
      var uint8Array = bufferCacheResource.typedArray;
      var arrayBuffer = uint8Array.buffer;
      var byteOffset = uint8Array.byteOffset + that._byteOffset;
      var indexDatatype = that._indexDatatype;
      var count = that._count;

      var typedArray;
      if (indexDatatype === IndexDatatype.UNSIGNED_BYTE) {
        typedArray = new Uint8Array(arrayBuffer, byteOffset, count);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
        typedArray = new Uint16Array(arrayBuffer, byteOffset, count);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_INT) {
        typedArray = new Uint32Array(arrayBuffer, byteOffset, count);
      }

      that._typedArray = typedArray;

      // Now wait for the GPU buffer to be created in the update loop
      that._indexBufferPromise = when.defer();

      // Unload the buffer when either
      // * The index buffer is created and the data is now on the GPU (resolves)
      // * The resource is unloaded from the cache before the index buffer is created (rejects)
      return that._indexBufferPromise.promise.always(function () {
        gltfCache.unloadBuffer(bufferCacheResource);
      });
    })
    .otherwise(function (error) {
      var message = "Failed to load index buffer";
      if (defined(error)) {
        message += "\n" + error.message;
      }
      throw new RuntimeError(message);
    });
};

/**
 * Unloads the resource.
 */
GltfIndexBufferCacheResource.prototype.unload = function () {
  if (defined(this._indexBuffer)) {
    // Destroy the GPU resources
    this._indexBuffer.destroy();
    this._indexBuffer = undefined;
  } else if (defined(this._indexBufferPromise)) {
    // Reject the index buffer promise, which unloads the buffer
    this._indexBufferPromise.reject();
  }
};

function CreateIndexBufferJob() {
  this.typedArray = undefined;
  this.indexDatatype = undefined;
  this.context = undefined;
  this.indexBuffer = undefined;
}

CreateIndexBufferJob.prototype.set = function (
  typedArray,
  indexDatatype,
  context
) {
  this.typedArray = typedArray;
  this.indexDatatype = indexDatatype;
  this.context = context;
};

CreateIndexBufferJob.prototype.execute = function () {
  this.indexBuffer = createIndexBuffer(
    this.typedArray,
    this.indexDatatype,
    this.context
  );
};

function createIndexBuffer(typedArray, indexDatatype, context) {
  var indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: typedArray,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: indexDatatype,
  });
  indexBuffer.vertexArrayDestroyable = false;
  return indexBuffer;
}

var scratchIndexBufferJob = new CreateIndexBufferJob();

/**
 * Updates the resource.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfIndexBufferCacheResource.prototype.update = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("frameState", frameState);
  //>>includeEnd('debug');

  if (defined(this._indexBuffer)) {
    // Already created index buffer
    return;
  }

  if (!defined(this._typedArray)) {
    // Not ready to create index buffer
    return;
  }

  var indexBuffer;

  if (this._asynchronous) {
    var indexBufferJob = scratchIndexBufferJob;
    indexBufferJob.set(this._typedArray, frameState.context);
    var jobScheduler = frameState.jobScheduler;
    if (!jobScheduler.execute(indexBufferJob, JobType.BUFFER)) {
      // Job scheduler is full. Try again next frame.
      return;
    }
    indexBuffer = indexBufferJob.indexBuffer;
  } else {
    indexBuffer = createIndexBuffer(this._typedArray, frameState.context);
  }

  this._typedArray = undefined;
  this._indexBuffer = indexBuffer;
  this._indexBufferPromise.resolve();
};
