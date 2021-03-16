import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import GltfBufferCacheResource from "./GltfBufferCacheResource.js";
import GltfCacheKey from "./GltfCacheKey.js";
import GltfCacheResource from "./GltfCacheResource.js";
import GltfVertexBufferCacheResource from "./GltfVertexBufferCacheResource.js";
import ResourceCache from "./ResourceCache.js";

/**
 * Functions for caching resources shared across glTF models.
 *
 * @namespace GltfCache
 *
 * @private
 */
function GltfCache() {}

/**
 * Loads a glTF from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.keepResident=false] Whether the glTF JSON and embedded buffers should stay in the cache indefinitely.
 *
 * @returns {GltfCacheResource} The glTF cache resource.
 */
GltfCache.loadGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = GltfCacheKey.getGltfCacheKey({
    gltfResource: gltfResource,
  });

  var gltfCacheResource = ResourceCache.get(cacheKey);
  if (defined(gltfCacheResource)) {
    return gltfCacheResource;
  }

  gltfCacheResource = new GltfCacheResource({
    gltfCache: GltfCache,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
    keepResident: keepResident,
  });

  ResourceCache.load({
    resource: gltfCacheResource,
    keepResident: keepResident,
  });

  return gltfCacheResource;
};

/**
 * Unloads a glTF from the cache.
 *
 * @param {GltfCacheResource} gltfCacheResource The glTF cache resource.
 */
GltfCache.unloadGltf = function (gltfCacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("gltfCacheResource", gltfCacheResource);
  //>>includeEnd('debug');

  ResourceCache.unload(gltfCacheResource);
};

/**
 * Loads a buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.buffer The glTF buffer.
 * @param {Number} options.bufferId The buffer ID.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.keepResident=false] Whether the buffer should stay in the cache indefinitely.
 * @param {Uint8Array} [options.typedArray] A typed array containing buffer data. Only defined for buffers embedded in the glTF.
 *
 * @returns {GltfBufferCacheResource} The buffer cache resource.
 */
GltfCache.loadBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var buffer = options.buffer;
  var bufferId = options.bufferId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var keepResident = defaultValue(options.keepResident, false);
  var typedArray = options.typedArray;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.buffer", buffer);
  Check.typeOf.number("options.bufferId", bufferId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = GltfCacheKey.getBufferCacheKey({
    buffer: buffer,
    bufferId: bufferId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var bufferCacheResource = ResourceCache.get(cacheKey);
  if (defined(bufferCacheResource)) {
    return bufferCacheResource;
  }

  bufferCacheResource = new GltfBufferCacheResource({
    buffer: buffer,
    baseResource: baseResource,
    cacheKey: cacheKey,
    typedArray: typedArray,
  });

  ResourceCache.load({
    resource: bufferCacheResource,
    keepResident: keepResident,
  });

  return bufferCacheResource;
};

/**
 * Unloads a buffer from the cache.
 *
 * @param {GltfBufferCacheResource} bufferCacheResource The buffer cache resource.
 */
GltfCache.prototype.unloadBuffer = function (bufferCacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("bufferCacheResource", bufferCacheResource);
  //>>includeEnd('debug');

  ResourceCache.unload(bufferCacheResource);
};

/**
 * Load a vertex buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the vertex buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfVertexBufferCacheResource} The vertex buffer cache resource.
 */
GltfCache.prototype.loadVertexBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.bufferViewId", bufferViewId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = GltfCacheKey.getVertexBufferCacheKey({
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var vertexBufferCacheResource = ResourceCache.get(cacheKey);
  if (defined(vertexBufferCacheResource)) {
    return vertexBufferCacheResource;
  }

  vertexBufferCacheResource = new GltfVertexBufferCacheResource({
    gltfCache: GltfCache,
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
    asynchronous: asynchronous,
  });

  ResourceCache.load({
    resource: vertexBufferCacheResource,
    keepResident: false,
  });

  return vertexBufferCacheResource;
};

/**
 * Unload a vertex buffer from the cache.
 *
 * @param {GltfVertexBufferCacheResource} vertexBufferCacheResource The vertex buffer cache resource.
 */
GltfCache.prototype.unloadVertexBuffer = function (vertexBufferCacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("vertexBufferCacheResource", vertexBufferCacheResource);
  //>>includeEnd('debug');

  ResourceCache.unload(vertexBufferCacheResource);
};

export default GltfCache;
