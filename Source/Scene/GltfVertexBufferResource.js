import defined from "../Core/defined.js";
import RuntimeError from "../Core/RuntimeError.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import when from "../ThirdParty/when.js";
import JobType from "./JobType.js";

/**
 * A vertex buffer resource
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the vertex buffer.
 * @param {Resource} options.gltfResource The glTF resource.
 * @param {Resource} options.baseResource The base resource that paths in the glTF JSON are relative to.
 * @param {Boolean} options.asynchronous Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {String} options.cacheKey The cache key of the resource.
 *
 * @alias GltfVertexBufferResource
 * @constructor
 *
 * @private
 */
function GltfVertexBufferResource(options) {
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  this._gltfResource = options.gltfResource;
  this._baseResource = options.baseResource;
  this._buffer = buffer;
  this._bufferId = bufferId;
  this._byteOffset = bufferView.byteOffset;
  this._byteLength = bufferView.byteLength;
  this._cacheKey = options.cacheKey;
  this._asynchronous = options.asynchronous;
  this._typedArray = undefined;
  this._vertexBuffer = undefined;
  this._vertexBufferPromise = undefined;
  this._promise = undefined;
}

Object.defineProperties(GltfVertexBufferResource.prototype, {
  promise: {
    get: function () {
      return this._promise;
    },
  },
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
});

GltfVertexBufferResource.prototype.load = function (cache) {
  var bufferResource = cache.loadBuffer({
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
    buffer: this._buffer,
    bufferId: this._bufferId,
  });

  var that = this;

  this._promise = bufferResource.promise
    .then(function () {
      // Got buffer from the cache
      that._typedArray = new Uint8Array(
        bufferResource.typedArray.buffer,
        bufferResource.typedArray.byteOffset + that._byteOffset,
        that._byteLength
      );
      // Now wait for the GPU buffer to be created in the update loop
      that._vertexBufferPromise = when.defer();

      // Unload the buffer when either
      // * The vertex buffer is created and the data is now on the GPU (resolves)
      // * The resource is unloaded from the cache before the vertex buffer is created (rejects)
      return that._vertexBufferPromise.promise.always(function () {
        cache.unloadBuffer(bufferResource);
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

GltfVertexBufferResource.prototype.unload = function () {
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

GltfVertexBufferResource.prototype.update = function (frameState) {
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
