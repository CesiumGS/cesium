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
 * A glTF index buffer cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfIndexBufferCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key of the resource.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 */
export default function GltfIndexBufferCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var accessorId = options.accessorId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;
  var draco = options.draco;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.accessorId", accessorId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._accessorId = accessorId;
  this._draco = draco;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._bufferViewCacheResource = undefined;
  this._dracoCacheResource = undefined;
  this._typedArray = undefined;
  this._indexBuffer = undefined;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(GltfIndexBufferCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
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
  if (defined(this._draco)) {
    loadFromDraco(this);
  } else {
    loadFromBufferView(this);
  }
};

function loadFromDraco(indexBufferCacheResource) {
  var resourceCache = indexBufferCacheResource._resourceCache;
  var dracoCacheResource = resourceCache.loadDraco({
    gltf: indexBufferCacheResource._gltf,
    draco: indexBufferCacheResource._draco,
    gltfResource: indexBufferCacheResource._gltfResource,
    baseResource: indexBufferCacheResource._baseResource,
    keepResident: false,
  });
  indexBufferCacheResource._dracoCacheResource = dracoCacheResource;
  indexBufferCacheResource._state = CacheResourceState.LOADING;

  dracoCacheResource.promise
    .then(function () {
      if (indexBufferCacheResource._state === CacheResourceState.UNLOADED) {
        unload(indexBufferCacheResource);
        return;
      }
      // Now wait for the GPU buffer to be created in the update loop.
      var decodedIndices = dracoCacheResource.decodedData.indices;
      indexBufferCacheResource._typedArray = createIndicesTypedArray(
        indexBufferCacheResource,
        decodedIndices
      );
    })
    .otherwise(function (error) {
      handleError(indexBufferCacheResource, error);
    });
}

function loadFromBufferView(indexBufferCacheResource) {
  var gltf = indexBufferCacheResource._gltf;
  var accessorId = indexBufferCacheResource._accessorId;
  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;

  var resourceCache = indexBufferCacheResource._resourceCache;
  var bufferViewCacheResource = resourceCache.loadBufferView({
    gltf: indexBufferCacheResource._gltf,
    bufferViewId: bufferViewId,
    gltfResource: indexBufferCacheResource._gltfResource,
    baseResource: indexBufferCacheResource._baseResource,
    keepResident: false,
  });
  indexBufferCacheResource._bufferViewCacheResource = bufferViewCacheResource;
  indexBufferCacheResource._state = CacheResourceState.LOADING;

  bufferViewCacheResource.promise
    .then(function () {
      if (indexBufferCacheResource._state === CacheResourceState.UNLOADED) {
        unload(indexBufferCacheResource);
        return;
      }
      // Now wait for the GPU buffer to be created in the update loop.
      var bufferViewTypedArray = bufferViewCacheResource.typedArray;
      indexBufferCacheResource._typedArray = createIndicesTypedArray(
        indexBufferCacheResource,
        bufferViewTypedArray
      );
    })
    .otherwise(function (error) {
      handleError(indexBufferCacheResource, error);
    });
}

function createIndicesTypedArray(
  indexBufferCacheResource,
  bufferViewTypedArray
) {
  var gltf = indexBufferCacheResource._gltf;
  var accessorId = indexBufferCacheResource._accessorId;
  var accessor = gltf.accessors[accessorId];
  var count = accessor.count;
  var indexDatatype = accessor.componentType;

  var arrayBuffer = bufferViewTypedArray.buffer;
  var byteOffset = bufferViewTypedArray.byteOffset + accessor.byteOffset;

  var typedArray;
  if (indexDatatype === IndexDatatype.UNSIGNED_BYTE) {
    typedArray = new Uint8Array(arrayBuffer, byteOffset, count);
  } else if (indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
    typedArray = new Uint16Array(arrayBuffer, byteOffset, count);
  } else if (indexDatatype === IndexDatatype.UNSIGNED_INT) {
    typedArray = new Uint32Array(arrayBuffer, byteOffset, count);
  }

  return typedArray;
}

function handleError(indexBufferCacheResource, error) {
  unload(indexBufferCacheResource);
  indexBufferCacheResource._state = CacheResourceState.FAILED;
  var errorMessage = "Failed to load index buffer";
  error = ResourceCache.getError(error, errorMessage);
  indexBufferCacheResource._promise.reject(error);
}

function unload(indexBufferCacheResource) {
  if (defined(indexBufferCacheResource._indexBuffer)) {
    // Destroy the GPU resources
    indexBufferCacheResource._indexBuffer.destroy();
  }

  var resourceCache = indexBufferCacheResource._resourceCache;

  if (defined(indexBufferCacheResource._bufferViewCacheResource)) {
    resourceCache.unload(indexBufferCacheResource._bufferViewCacheResource);
  }

  if (defined(indexBufferCacheResource._dracoCacheResource)) {
    resourceCache.unload(indexBufferCacheResource._dracoCacheResource);
  }

  indexBufferCacheResource._bufferViewCacheResource = undefined;
  indexBufferCacheResource._dracoCacheResource = undefined;
  indexBufferCacheResource._typedArray = undefined;
  indexBufferCacheResource._indexBuffer = undefined;
  indexBufferCacheResource._gltf = undefined;
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
    typedArray: typedArray,
    context: context,
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
  Check.typeOf.object("frameState", frameState);
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

  unload(this);
  this._indexBuffer = indexBuffer;
  this._state = CacheResourceState.READY;
  this._promise.resolve(this);
};
