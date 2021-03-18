import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import when from "../ThirdParty/when.js";
import CacheResourceState from "./CacheResourceState.js";
import JobType from "./JobType.js";
import ResourceCache from "./ResourceCache.js";

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
export default function GltfIndexBufferCacheResource(options) {
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
  this._bufferCacheResource = undefined;
  this._typedArray = undefined;
  this._indexBuffer = undefined;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(GltfIndexBufferCacheResource.prototype, {
  /**
   * A promise that resolves when the resource is ready.
   *
   * @memberof GltfIndexBufferCacheResource.prototype
   *
   * @type {Promise.<GltfIndexBufferCacheResource>}
   * @readonly
   */
  promise: {
    get: function () {
      return this._promise.promise;
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
  /**
   * The index buffer.
   *
   * @memberof GltfIndexBufferCacheResource.prototype
   *
   * @type {Buffer}
   * @readonly
   */
  indexBuffer: {
    get: function () {
      return this._indexBuffer;
    },
  },
});

/**
 * Loads the resource.
 */
GltfIndexBufferCacheResource.prototype.load = function () {
  var that = this;

  var bufferCacheResource = that._gltfCache.loadBuffer({
    buffer: that._buffer,
    bufferId: that._bufferId,
    gltfResource: that._gltfResource,
    baseResource: that._baseResource,
    keepResident: false,
  });
  that._bufferCacheResource = bufferCacheResource;
  that._state = CacheResourceState.LOADING;

  bufferCacheResource.promise
    .then(function () {
      if (that._state === CacheResourceState.UNLOADED) {
        return;
      }
      // Loaded buffer view from the cache.
      // Now wait for the GPU buffer to be created in the update loop.
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
    })
    .otherwise(function (error) {
      unload(that);
      that._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load index buffer";
      that._promise.reject(ResourceCache.getError(error, errorMessage));
    });
};

function unload(indexBufferCacheResource) {
  if (defined(indexBufferCacheResource._indexBuffer)) {
    // Destroy the GPU resources
    indexBufferCacheResource._indexBuffer.destroy();
  }

  if (defined(indexBufferCacheResource._bufferCacheResource)) {
    // Unload the buffer resource from the cache
    indexBufferCacheResource._gltfCache.unloadBuffer(
      indexBufferCacheResource._bufferCacheResource
    );
  }

  indexBufferCacheResource._bufferCacheResource = undefined;
  indexBufferCacheResource._typedArray = undefined;
  indexBufferCacheResource._indexBuffer = undefined;
}

/**
 * Unloads the resource.
 */
GltfIndexBufferCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
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

  this._gltfCache.unloadBuffer(this._bufferCacheResource);
  this._bufferCacheResource = undefined;
  this._typedArray = undefined;
  this._indexBuffer = indexBuffer;
  this._state = CacheResourceState.READY;
  this._promise.resolve(this);
};
