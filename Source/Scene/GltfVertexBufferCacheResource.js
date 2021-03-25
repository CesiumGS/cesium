import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import when from "../ThirdParty/when.js";
import CacheResource from "./CacheResource.js";
import CacheResourceState from "./CacheResourceState.js";
import JobType from "./JobType.js";

/**
 * A glTF vertex buffer cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfVertexBufferCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key of the resource.
 * @param {Number} [options.bufferViewId] The bufferView ID corresponding to the vertex buffer.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {String} [options.dracoAttributeSemantic] The Draco attribute semantic, e.g. POSITION or NORMAL.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @exception {DeveloperError} One of options.bufferViewId and options.draco must be defined.
 * @exception {DeveloperError} When options.draco is defined options.dracoAttributeSemantic must also be defined.
 *
 * @private
 */
export default function GltfVertexBufferCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;
  var bufferViewId = options.bufferViewId;
  var draco = options.draco;
  var dracoAttributeSemantic = options.dracoAttributeSemantic;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.string("options.cacheKey", cacheKey);

  var hasBufferViewId = defined(bufferViewId);
  var hasDraco = defined(draco);
  var hasDracoAttributeSemantic = defined(dracoAttributeSemantic);

  if (hasBufferViewId === hasDraco) {
    throw new DeveloperError(
      "One of options.bufferViewId and options.draco must be defined."
    );
  }

  if (hasDraco && !hasDracoAttributeSemantic) {
    throw new DeveloperError(
      "When options.draco is defined options.dracoAttributeSemantic must also be defined."
    );
  }

  if (hasDraco) {
    Check.typeOf.object(draco);
    Check.typeOf.string(dracoAttributeSemantic);
  }
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._bufferViewId = bufferViewId;
  this._draco = draco;
  this._dracoAttributeSemantic = dracoAttributeSemantic;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._bufferViewCacheResource = undefined;
  this._dracoCacheResource = undefined;
  this._typedArray = undefined;
  this._vertexBuffer = undefined;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(GltfVertexBufferCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfVertexBufferCacheResource.prototype
   *
   * @type {Promise.<GltfVertexBufferCacheResource>}
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
  /**
   * The vertex buffer.
   *
   * @memberof GltfVertexBufferCacheResource.prototype
   *
   * @type {Buffer}
   * @readonly
   */
  vertexBuffer: {
    get: function () {
      return this._vertexBuffer;
    },
  },
});

/**
 * Loads the resource.
 */
GltfVertexBufferCacheResource.prototype.load = function () {
  if (defined(this._draco)) {
    loadFromDraco(this);
  } else {
    loadFromBufferView(this);
  }
};

function loadFromDraco(vertexBufferCacheResource) {
  var resourceCache = vertexBufferCacheResource._resourceCache;
  var dracoCacheResource = resourceCache.loadDraco({
    gltf: vertexBufferCacheResource._gltf,
    draco: vertexBufferCacheResource._draco,
    gltfResource: vertexBufferCacheResource._gltfResource,
    baseResource: vertexBufferCacheResource._baseResource,
    keepResident: false,
  });
  vertexBufferCacheResource._dracoCacheResource = dracoCacheResource;
  vertexBufferCacheResource._state = CacheResourceState.LOADING;

  dracoCacheResource.promise
    .then(function () {
      if (vertexBufferCacheResource._state === CacheResourceState.UNLOADED) {
        unload(vertexBufferCacheResource);
        return;
      }
      // Now wait for the GPU buffer to be created in the update loop.
      var decodedData = dracoCacheResource.decodedData;
      var dracoSemantic = vertexBufferCacheResource._dracoAttributeSemantic;
      vertexBufferCacheResource._typedArray = decodedData[dracoSemantic];
    })
    .otherwise(function (error) {
      handleError(vertexBufferCacheResource, error);
    });
}

function loadFromBufferView(vertexBufferCacheResource) {
  var resourceCache = vertexBufferCacheResource._resourceCache;
  var bufferViewCacheResource = resourceCache.loadBufferView({
    gltf: vertexBufferCacheResource._gltf,
    bufferViewId: vertexBufferCacheResource._bufferViewId,
    gltfResource: vertexBufferCacheResource._gltfResource,
    baseResource: vertexBufferCacheResource._baseResource,
    keepResident: false,
  });
  vertexBufferCacheResource._bufferViewCacheResource = bufferViewCacheResource;
  vertexBufferCacheResource._state = CacheResourceState.LOADING;

  bufferViewCacheResource.promise
    .then(function () {
      if (vertexBufferCacheResource._state === CacheResourceState.UNLOADED) {
        unload(vertexBufferCacheResource);
        return;
      }
      // Now wait for the GPU buffer to be created in the update loop.
      var bufferViewTypedArray = bufferViewCacheResource.typedArray;
      vertexBufferCacheResource._typedArray = bufferViewTypedArray;
    })
    .otherwise(function (error) {
      handleError(vertexBufferCacheResource, error);
    });
}

function handleError(vertexBufferCacheResource, error) {
  unload(vertexBufferCacheResource);
  vertexBufferCacheResource._state = CacheResourceState.FAILED;
  var errorMessage = "Failed to load vertex buffer";
  error = CacheResource.getError(error, errorMessage);
  vertexBufferCacheResource._promise.reject(error);
}

function unload(vertexBufferCacheResource) {
  if (defined(vertexBufferCacheResource._vertexBuffer)) {
    // Destroy the GPU resources
    vertexBufferCacheResource._vertexBuffer.destroy();
  }

  var resourceCache = vertexBufferCacheResource._resourceCache;

  if (defined(vertexBufferCacheResource._bufferViewCacheResource)) {
    resourceCache.unload(vertexBufferCacheResource._bufferViewCacheResource);
  }

  if (defined(vertexBufferCacheResource._dracoCacheResource)) {
    resourceCache.unload(vertexBufferCacheResource._dracoCacheResource);
  }

  vertexBufferCacheResource._bufferViewCacheResource = undefined;
  vertexBufferCacheResource._dracoCacheResource = undefined;
  vertexBufferCacheResource._typedArray = undefined;
  vertexBufferCacheResource._vertexBuffer = undefined;
  vertexBufferCacheResource._gltf = undefined;
}

/**
 * Unloads the resource.
 */
GltfVertexBufferCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
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
    typedArray: typedArray,
    context: context,
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
  Check.typeOf.object("frameState", frameState);
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

  unload(this);
  this._vertexBuffer = vertexBuffer;
  this._state = CacheResourceState.READY;
  this._promise.resolve(this);
};
