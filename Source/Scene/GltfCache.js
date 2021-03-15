import defined from "../Core/defined.js";
import GltfBufferResource from "./GltfBufferResource.js";
import GltfCacheKey from "./GltfCacheKey.js";
import GltfResource from "./GltfResource.js";
import GltfVertexBufferResource from "./GltfVertexBufferResource.js";

/**
 * Cache for glTF resources shared across models.
 *
 * @alias GltfCache
 * @constructor
 *
 * @private
 */
function GltfCache() {
  this._cacheEntries = {};
}

function CacheEntry(options) {
  this.referenceCount = 1;
  this.resource = options.resource;
  this.keepResident = options.keepResident;
}

function get(cache, cacheKey) {
  var cacheEntries = cache._cacheEntries;
  var cacheEntry = cacheEntries[cacheKey];
  if (defined(cacheEntry)) {
    ++cacheEntry.referenceCount;
    return cacheEntry.resource;
  }
}

function load(cache, options) {
  var resource = options.resource;
  var keepResident = options.keepResident;
  var cacheKey = resource.cacheKey;

  var cacheEntry = new CacheEntry({
    resource: resource,
    keepResident: keepResident,
  });

  var cacheEntries = cache._cacheEntries;
  cacheEntries[cacheKey] = cacheEntry;

  resource.load(cache);

  return resource.promise.otherwise(function () {
    delete cacheEntries[cacheKey];
  });
}

function unload(cache, resource) {
  var cacheKey = resource.cacheKey;

  var cacheEntries = cache._cacheEntries;
  var cacheEntry = cacheEntries[cacheKey];
  --cacheEntry.referenceCount;

  if (cacheEntry.referenceCount === 0 && !cacheEntry.keepResident) {
    if (defined(resource.unload)) {
      resource.unload();
    }
    delete cacheEntries[cacheKey];
  }
}

/**
 * Load a glTF from the cache. If the glTF is already in the cache its
 * reference count is incremented.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The glTF resource.
 * @param {Boolean} options.keepResident Whether the buffer should stay in the cache indefinitely.
 *
 * @returns {GltfResource} The glTF resource.
 *
 * @private
 */
GltfCache.prototype.loadGltf = function (options) {
  var cacheKey = GltfCacheKey.getGltfCacheKey({
    gltfResource: options.gltfResource,
  });

  var gltfResource = get(this, cacheKey);
  if (defined(gltfResource)) {
    return gltfResource;
  }

  gltfResource = new GltfResource({
    gltfResource: options.gltfResource,
  });

  load(this, {
    resource: gltfResource,
    keepResident: options.keepResident,
  });

  return gltfResource;
};

/**
 * Unload a glTF from the cache. If the reference count drops to zero the
 * glTF will be unloaded.
 *
 * @param {GltfResource} gltfResource The glTF resource.
 *
 * @private
 */
GltfCache.prototype.unloadGltf = function (gltfResource) {
  unload(this, gltfResource);
};

/**
 * Load a buffer from the cache. If the buffer is already in the cache its
 * reference count is incremented. Otherwise, a new buffer is created.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.buffer The glTF buffer.
 * @param {Number} options.bufferId The buffer ID.
 * @param {Resource} options.gltfResource The glTF resource.
 * @param {Resource} options.baseResource The base resource that paths in the glTF JSON are relative to.
 * @param {Boolean} options.keepResident Whether the buffer should stay in the cache indefinitely.
 * @param {Resource} [options.typedArray] The typed array of the buffer when the buffer is embedded in the glTF.
 *
 * @returns {GltfBufferResource} The buffer resource.
 *
 * @private
 */
GltfCache.prototype.loadBuffer = function (options) {
  var cacheKey = GltfCacheKey.getBufferCacheKey({
    buffer: options.buffer,
    bufferId: options.bufferId,
    gltfResource: options.gltfResource,
    baseResource: options.baseResource,
  });

  var bufferResource = get(this, cacheKey);
  if (defined(bufferResource)) {
    return bufferResource;
  }

  bufferResource = new GltfBufferResource({
    buffer: options.buffer,
    baseResource: options.basesResource,
    cacheKey: cacheKey,
    typedArray: options.typedArray,
  });

  load(this, {
    resource: bufferResource,
    keepResident: options.keepResident,
  });

  return bufferResource;
};

/**
 * Unload a buffer from the cache. If the reference count drops to zero the
 * buffer will be unloaded.
 *
 * @param {GltfBufferResource} bufferResource The buffer resource.
 *
 * @private
 */
GltfCache.prototype.unloadBuffer = function (bufferResource) {
  unload(this, bufferResource);
};

/**
 * Load a vertex buffer from the cache. If the vertex buffer is already in the
 * cache its reference count is incremented. Otherwise, a new vertex buffer is
 * created.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the vertex buffer.
 * @param {Resource} options.gltfResource The glTF resource.
 * @param {Resource} options.baseResource The base resource that paths in the glTF JSON are relative to.
 * @param {Boolean} options.asynchronous Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfVertexBufferResource} The vertex buffer resource.
 *
 * @private
 */
GltfCache.prototype.loadVertexBuffer = function (options) {
  var cacheKey = GltfCacheKey.getVertexBufferCacheKey({
    gltf: options.gltf,
    bufferViewId: options.bufferViewId,
    gltfResource: options.gltfResource,
    baseResource: options.baseResource,
  });

  var vertexBufferResource = get(this, cacheKey);
  if (defined(vertexBufferResource)) {
    return vertexBufferResource;
  }

  vertexBufferResource = new GltfVertexBufferResource({
    gltf: options.gltf,
    bufferViewId: options.bufferViewId,
    gltfResource: options.gltfResource,
    baseResource: options.baseResource,
    asynchronous: options.asynchronous,
    cacheKey: cacheKey,
  });

  load(this, {
    resource: vertexBufferResource,
    keepResident: false,
  });

  return vertexBufferResource;
};

/**
 * Unload a vertex buffer from the cache. If the reference count drops to zero
 * the vertex buffer will be unloaded.
 *
 * @param {GltfVertexBufferResource} vertexBufferResource The vertex buffer resource.
 *
 * @private
 */
GltfCache.prototype.unloadVertexBuffer = function (vertexBufferResource) {
  unload(this, vertexBufferResource);
};

export default GltfCache;
