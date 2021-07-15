import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import when from "../ThirdParty/when.js";
import JobType from "./JobType.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads an index buffer from a glTF accessor.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfIndexBufferLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {String} [options.cacheKey] The cache key of the resource.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 */
export default function GltfIndexBufferLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var accessorId = options.accessorId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var draco = options.draco;
  var cacheKey = options.cacheKey;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.accessorId", accessorId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var indexDatatype = gltf.accessors[accessorId].componentType;

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._accessorId = accessorId;
  this._indexDatatype = indexDatatype;
  this._draco = draco;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._bufferViewLoader = undefined;
  this._dracoLoader = undefined;
  this._typedArray = undefined;
  this._indexBuffer = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = when.defer();
}

if (defined(Object.create)) {
  GltfIndexBufferLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfIndexBufferLoader.prototype.constructor = GltfIndexBufferLoader;
}

Object.defineProperties(GltfIndexBufferLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfIndexBufferLoader.prototype
   *
   * @type {Promise.<GltfIndexBufferLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfIndexBufferLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The index buffer.
   *
   * @memberof GltfIndexBufferLoader.prototype
   *
   * @type {Buffer}
   * @readonly
   * @private
   */
  indexBuffer: {
    get: function () {
      return this._indexBuffer;
    },
  },
});

/**
 * Loads the resource.
 * @private
 */
GltfIndexBufferLoader.prototype.load = function () {
  if (defined(this._draco)) {
    loadFromDraco(this);
  } else {
    loadFromBufferView(this);
  }
};

function loadFromDraco(indexBufferLoader) {
  var resourceCache = indexBufferLoader._resourceCache;
  var dracoLoader = resourceCache.loadDraco({
    gltf: indexBufferLoader._gltf,
    draco: indexBufferLoader._draco,
    gltfResource: indexBufferLoader._gltfResource,
    baseResource: indexBufferLoader._baseResource,
  });

  indexBufferLoader._dracoLoader = dracoLoader;
  indexBufferLoader._state = ResourceLoaderState.LOADING;

  dracoLoader.promise
    .then(function () {
      if (indexBufferLoader.isDestroyed()) {
        return;
      }
      // Now wait for process() to run to finish loading
      indexBufferLoader._typedArray =
        dracoLoader.decodedData.indices.typedArray;
      indexBufferLoader._state = ResourceLoaderState.PROCESSING;
    })
    .otherwise(function (error) {
      if (indexBufferLoader.isDestroyed()) {
        return;
      }
      handleError(indexBufferLoader, error);
    });
}

function loadFromBufferView(indexBufferLoader) {
  var gltf = indexBufferLoader._gltf;
  var accessorId = indexBufferLoader._accessorId;
  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;

  var resourceCache = indexBufferLoader._resourceCache;
  var bufferViewLoader = resourceCache.loadBufferView({
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: indexBufferLoader._gltfResource,
    baseResource: indexBufferLoader._baseResource,
  });
  indexBufferLoader._state = ResourceLoaderState.LOADING;
  indexBufferLoader._bufferViewLoader = bufferViewLoader;

  bufferViewLoader.promise
    .then(function () {
      if (indexBufferLoader.isDestroyed()) {
        return;
      }
      // Now wait for process() to run to finish loading
      var bufferViewTypedArray = bufferViewLoader.typedArray;
      indexBufferLoader._typedArray = createIndicesTypedArray(
        indexBufferLoader,
        bufferViewTypedArray
      );
      indexBufferLoader._state = ResourceLoaderState.PROCESSING;
    })
    .otherwise(function (error) {
      if (indexBufferLoader.isDestroyed()) {
        return;
      }
      handleError(indexBufferLoader, error);
    });
}

function createIndicesTypedArray(indexBufferLoader, bufferViewTypedArray) {
  var gltf = indexBufferLoader._gltf;
  var accessorId = indexBufferLoader._accessorId;
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

function handleError(indexBufferLoader, error) {
  indexBufferLoader.unload();
  indexBufferLoader._state = ResourceLoaderState.FAILED;
  var errorMessage = "Failed to load index buffer";
  error = indexBufferLoader.getError(errorMessage, error);
  indexBufferLoader._promise.reject(error);
}

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
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfIndexBufferLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (defined(this._dracoLoader)) {
    this._dracoLoader.process(frameState);
  }

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
    indexBufferJob.set(
      this._typedArray,
      this._indexDatatype,
      frameState.context
    );
    var jobScheduler = frameState.jobScheduler;
    if (!jobScheduler.execute(indexBufferJob, JobType.BUFFER)) {
      // Job scheduler is full. Try again next frame.
      return;
    }
    indexBuffer = indexBufferJob.indexBuffer;
  } else {
    indexBuffer = createIndexBuffer(
      this._typedArray,
      this._indexDatatype,
      frameState.context
    );
  }

  // Unload everything except the index buffer
  this.unload();

  this._indexBuffer = indexBuffer;
  this._state = ResourceLoaderState.READY;
  this._promise.resolve(this);
};

/**
 * Unloads the resource.
 * @private
 */
GltfIndexBufferLoader.prototype.unload = function () {
  if (defined(this._indexBuffer)) {
    this._indexBuffer.destroy();
  }

  var resourceCache = this._resourceCache;

  if (defined(this._bufferViewLoader)) {
    resourceCache.unload(this._bufferViewLoader);
  }

  if (defined(this._dracoLoader)) {
    resourceCache.unload(this._dracoLoader);
  }

  this._bufferViewLoader = undefined;
  this._dracoLoader = undefined;
  this._typedArray = undefined;
  this._indexBuffer = undefined;
  this._gltf = undefined;
};
