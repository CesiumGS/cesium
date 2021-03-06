import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import RuntimeError from "../Core/RuntimeError.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import when from "../ThirdParty/when.js";
import JobType from "./JobType.js";

/**
 * A vertex buffer cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfVertexBufferCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfCache} options.gltfCache The {@link GltfCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the vertex buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key of the resource.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 */
function GltfVertexBufferCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfCache = options.gltfCache;
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfCache", gltfCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.bufferViewId", bufferViewId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  this._gltfCache = gltfCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._buffer = buffer;
  this._bufferId = bufferId;
  this._byteOffset = bufferView.byteOffset;
  this._byteLength = bufferView.byteLength;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._typedArray = undefined;
  this._vertexBuffer = undefined;
  this._vertexBufferPromise = undefined;
  this._promise = undefined;
}

Object.defineProperties(GltfVertexBufferCacheResource.prototype, {
  /**
   * A promise that resolves when the resource is ready.
   *
   * @memberof GltfVertexBufferCacheResource.prototype
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
   * @memberof GltfVertexBufferCacheResource.prototype
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
GltfVertexBufferCacheResource.prototype.load = function () {
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
      that._typedArray = new Uint8Array(
        bufferCacheResource.typedArray.buffer,
        bufferCacheResource.typedArray.byteOffset + that._byteOffset,
        that._byteLength
      );
      // Now wait for the GPU buffer to be created in the update loop
      that._vertexBufferPromise = when.defer();

      // Unload the buffer when either
      // * The vertex buffer is created and the data is now on the GPU (resolves)
      // * The resource is unloaded from the cache before the vertex buffer is created (rejects)
      return that._vertexBufferPromise.promise.always(function () {
        gltfCache.unloadBuffer(bufferCacheResource);
      });
    })
    .otherwise(function (error) {
      var message = "Failed to load vertex buffer";
      if (defined(error)) {
        message += "\n" + error.message;
      }
      throw new RuntimeError(message);
    });
};

/**
 * Unloads the resource.
 */
GltfVertexBufferCacheResource.prototype.unload = function () {
  if (defined(this._vertexBuffer)) {
    // Destroy the GPU resources
    this._vertexBuffer.destroy();
    this._vertexBuffer = undefined;
  } else if (defined(this._vertexBufferPromise)) {
    // Reject the vertex buffer promise, which unloads the buffer
    this._vertexBufferPromise.reject();
  }
};

function CreateVertexBufferJob() {
  this.typedArray = undefined;
  this.context = undefined;
  this.vertexBuffer = undefined;
}

CreateVertexBufferJob.prototype.set = function (typedArray, context) {
  this.typedArray = typedArray;
  this.context = context;
};

CreateVertexBufferJob.prototype.execute = function () {
  this.vertexBuffer = createVertexBuffer(this.typedArray, this.context);
};

function createVertexBuffer(typedArray, context) {
  var vertexBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: typedArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  vertexBuffer.vertexArrayDestroyable = false;
  return vertexBuffer;
}

var scratchVertexBufferJob = new CreateVertexBufferJob();

/**
 * Updates the resource.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfVertexBufferCacheResource.prototype.update = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("frameState", frameState);
  //>>includeEnd('debug');

  if (defined(this._vertexBuffer)) {
    // Already created vertex buffer
    return;
  }

  if (!defined(this._typedArray)) {
    // Not ready to create vertex buffer
    return;
  }

  var vertexBuffer;

  if (this._asynchronous) {
    var vertexBufferJob = scratchVertexBufferJob;
    vertexBufferJob.set(this._typedArray, frameState.context);
    var jobScheduler = frameState.jobScheduler;
    if (!jobScheduler.execute(vertexBufferJob, JobType.BUFFER)) {
      // Job scheduler is full. Try again next frame.
      return;
    }
    vertexBuffer = vertexBufferJob.vertexBuffer;
  } else {
    vertexBuffer = createVertexBuffer(this._typedArray, frameState.context);
  }

  this._typedArray = undefined;
  this._vertexBuffer = vertexBuffer;
  this._vertexBufferPromise.resolve();
};
