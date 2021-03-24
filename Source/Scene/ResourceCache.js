import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import BufferCacheResource from "./BufferCacheResource.js";
import GltfCacheResource from "./GltfCacheResource.js";
import GltfBufferViewCacheResource from "./GltfBufferViewCacheResource.js";
import GltfDracoCacheResource from "./GltfDracoCacheResource.js";
import GltfImageCacheResource from "./GltfImageCacheResource.js";
import GltfIndexBufferCacheResource from "./GltfIndexBufferCacheResource.js";
import GltfTextureCacheResource from "./GltfTextureCacheResource.js";
import GltfVertexBufferCacheResource from "./GltfVertexBufferCacheResource.js";
import JsonCacheResource from "./JsonCacheResource.js";
import ResourceCacheKey from "./ResourceCacheKey.js";

/**
 * Resource cache shared across 3D Tiles and glTF.
 *
 * @namespace ResourceCache
 *
 * @private
 */
function ResourceCache() {}

ResourceCache.cacheEntries = {};

/**
 * TODO: doc
 *
 * @private
 */
function CacheEntry(options) {
  this.referenceCount = 1;
  this.cacheResource = options.cacheResource;
  this.keepResident = options.keepResident;
}

/**
 * Gets a resource from the cache. If the resource exists its reference count is
 * incremented. Otherwise, if no resource exists, undefined is returned.
 *
 * @param {String} cacheKey The cache key of the resource.
 *
 * @returns {CacheResource|undefined} The cache resource.
 */
ResourceCache.get = function (cacheKey) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("cacheKey", cacheKey);
  //>>includeEnd('debug');

  var cacheEntry = ResourceCache.cacheEntries[cacheKey];
  if (defined(cacheEntry)) {
    ++cacheEntry.referenceCount;
    return cacheEntry.cacheResource;
  }
  return undefined;
};

/**
 * Loads a cache resource and adds it to the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {CacheResource} options.cacheResource The cache resource.
 * @param {Boolean} [options.keepResident=false] Whether the cache resource should stay in the cache indefinitely.
 */
ResourceCache.load = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var cacheResource = options.cacheResource;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.cacheResource", cacheResource);
  //>>includeEnd('debug');

  var cacheKey = cacheResource.cacheKey;

  ResourceCache.cacheEntries[cacheKey] = new CacheEntry({
    cacheResource: cacheResource,
    keepResident: keepResident,
  });

  cacheResource.load();

  cacheResource.promise.otherwise(function () {
    // If the resource fails to load remove it from the cache
    delete ResourceCache.cacheEntries[cacheKey];
  });
};

/**
 * Unloads a resource from the cache. When the reference count hits zero the
 * resource's unload function is called.
 *
 * @param {CacheResource} cacheResource The cache resource.
 */
ResourceCache.unload = function (cacheResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cacheResource", cacheResource);
  //>>includeEnd('debug');

  var cacheKey = cacheResource.cacheKey;

  var cacheEntry = ResourceCache.cacheEntries[cacheKey];
  if (!defined(cacheEntry)) {
    return;
  }

  --cacheEntry.referenceCount;

  if (cacheEntry.referenceCount === 0 && !cacheEntry.keepResident) {
    if (defined(cacheResource.unload)) {
      cacheResource.unload();
    }
    delete ResourceCache.cacheEntries[cacheKey];
  }
};

/**
 * Loads a JSON from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the JSON file.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {JsonCacheResource} The JSON cache resource.
 */
ResourceCache.loadJson = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getJsonCacheKey({
    resource: resource,
  });

  var jsonCacheResource = ResourceCache.get(cacheKey);
  if (defined(jsonCacheResource)) {
    return jsonCacheResource;
  }

  jsonCacheResource = new JsonCacheResource({
    resource: resource,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    cacheResource: jsonCacheResource,
    keepResident: keepResident,
  });

  return jsonCacheResource;
};

/**
 * Loads a glTF from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {GltfCacheResource} The glTF cache resource.
 */
ResourceCache.loadGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getGltfCacheKey({
    gltfResource: gltfResource,
  });

  var gltfCacheResource = ResourceCache.get(cacheKey);
  if (defined(gltfCacheResource)) {
    return gltfCacheResource;
  }

  gltfCacheResource = new GltfCacheResource({
    resourceCache: ResourceCache,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
    keepResident: keepResident,
  });

  ResourceCache.load({
    cacheResource: gltfCacheResource,
    keepResident: keepResident,
  });

  return gltfCacheResource;
};

/**
 * Load an embedded buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.parentResource The {@link Resource} containing the embedded buffer.
 * @param {Number} options.bufferId A unique identifier of the embedded buffer within the parent resource.
 * @param {Uint8Array} [options.typedArray] The typed array containing the embedded buffer contents.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {BufferCacheResource} The buffer cache resource.
 */
ResourceCache.loadEmbeddedBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var parentResource = options.parentResource;
  var bufferId = options.bufferId;
  var typedArray = options.typedArray;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.parentResource", parentResource);
  Check.typeOf.object("options.bufferId", bufferId);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
    parentResource: parentResource,
    bufferId: bufferId,
  });

  var bufferCacheResource = ResourceCache.get(cacheKey);
  if (defined(bufferCacheResource)) {
    return bufferCacheResource;
  }

  bufferCacheResource = new BufferCacheResource({
    cacheKey: cacheKey,
    typedArray: typedArray,
  });

  ResourceCache.load({
    cacheResource: bufferCacheResource,
    keepResident: keepResident,
  });

  return bufferCacheResource;
};

/**
 * Loads an external buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the external buffer.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {BufferCacheResource} The buffer cache resource.
 */
ResourceCache.loadExternalBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
    resource: resource,
  });

  var bufferCacheResource = ResourceCache.get(cacheKey);
  if (defined(bufferCacheResource)) {
    return bufferCacheResource;
  }

  bufferCacheResource = new BufferCacheResource({
    cacheKey: cacheKey,
    resource: resource,
  });

  ResourceCache.load({
    cacheResource: bufferCacheResource,
    keepResident: keepResident,
  });

  return bufferCacheResource;
};

/**
 * Loads a glTF buffer view from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID corresponding to the vertex buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {GltfBufferViewCacheResource} The buffer view cache resource.
 */
ResourceCache.loadBufferView = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.bufferViewId", bufferViewId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getBufferViewCacheKey({
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var bufferViewCacheResource = ResourceCache.get(cacheKey);
  if (defined(bufferViewCacheResource)) {
    return bufferViewCacheResource;
  }

  bufferViewCacheResource = new GltfBufferViewCacheResource({
    resourceCache: ResourceCache,
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    cacheResource: bufferViewCacheResource,
    keepResident: keepResident,
  });

  return bufferViewCacheResource;
};

/**
 * Loads Draco data from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.draco The Draco extension object.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {GltfDracoCacheResource} The Draco cache resource.
 */
ResourceCache.loadDraco = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var draco = options.draco;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.draco", draco);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getDracoCacheKey({
    gltf: gltf,
    draco: draco,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var dracoCacheResource = ResourceCache.get(cacheKey);
  if (defined(dracoCacheResource)) {
    return dracoCacheResource;
  }

  dracoCacheResource = new GltfDracoCacheResource({
    resourceCache: ResourceCache,
    gltf: gltf,
    draco: draco,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    cacheResource: dracoCacheResource,
    keepResident: keepResident,
  });

  return dracoCacheResource;
};

/**
 * Loads a glTF vertex buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Number} [options.bufferViewId] The bufferView ID corresponding to the vertex buffer.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {String} [options.dracoAttributeSemantic] The Draco attribute semantic, e.g. POSITION or NORMAL.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @exception {DeveloperError} One of options.bufferViewId and options.draco must be defined.
 * @exception {DeveloperError} When options.draco is defined options.dracoAttributeSemantic must also be defined.
 *
 * @returns {GltfVertexBufferCacheResource} The vertex buffer cache resource.
 */
ResourceCache.loadVertexBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var bufferViewId = options.bufferViewId;
  var draco = options.draco;
  var dracoAttributeSemantic = options.dracoAttributeSemantic;
  var keepResident = defaultValue(options.keepResident, false);
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);

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

  var cacheKey = ResourceCacheKey.getVertexBufferCacheKey({
    gltf: gltf,
    gltfResource: gltfResource,
    baseResource: baseResource,
    bufferViewId: bufferViewId,
    draco: draco,
    dracoAttributeSemantic: dracoAttributeSemantic,
  });

  var vertexBufferCacheResource = ResourceCache.get(cacheKey);
  if (defined(vertexBufferCacheResource)) {
    return vertexBufferCacheResource;
  }

  vertexBufferCacheResource = new GltfVertexBufferCacheResource({
    resourceCache: ResourceCache,
    gltf: gltf,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
    bufferViewId: bufferViewId,
    draco: draco,
    dracoAttributeSemantic: dracoAttributeSemantic,
    asynchronous: asynchronous,
  });

  ResourceCache.load({
    cacheResource: vertexBufferCacheResource,
    keepResident: keepResident,
  });

  return vertexBufferCacheResource;
};

/**
 * Loads a glTF index buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfIndexBufferCacheResource} The index buffer cache resource.
 */
ResourceCache.loadIndexBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var accessorId = options.accessorId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var draco = options.draco;
  var keepResident = defaultValue(options.keepResident, false);
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.accessorId", accessorId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getIndexBufferCacheKey({
    gltf: gltf,
    accessorId: accessorId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    draco: draco,
  });

  var indexBufferCacheResource = ResourceCache.get(cacheKey);
  if (defined(indexBufferCacheResource)) {
    return indexBufferCacheResource;
  }

  indexBufferCacheResource = new GltfIndexBufferCacheResource({
    resourceCache: ResourceCache,
    gltf: gltf,
    accessorId: accessorId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
    draco: draco,
    asynchronous: asynchronous,
  });

  ResourceCache.load({
    cacheResource: indexBufferCacheResource,
    keepResident: keepResident,
  });

  return indexBufferCacheResource;
};

/**
 * Loads a glTF image from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.imageId The image ID.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object.<String, Boolean>} options.supportedImageFormats The supported image formats.
 * @param {Boolean} options.supportedImageFormats.webp Whether the browser supports WebP images.
 * @param {Boolean} options.supportedImageFormats.s3tc Whether the browser supports s3tc compressed images.
 * @param {Boolean} options.supportedImageFormats.pvrtc Whether the browser supports pvrtc compressed images.
 * @param {Boolean} options.supportedImageFormats.etc1 Whether the browser supports etc1 compressed images.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {GltfImageCacheResource} The image cache resource.
 */
ResourceCache.loadImage = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var imageId = options.imageId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var supportedImageFormats = defaultValue(
    options.supportedImageFormats,
    defaultValue.EMPTY_OBJECT
  );
  var supportsWebP = supportedImageFormats.webp;
  var supportsS3tc = supportedImageFormats.s3tc;
  var supportsPvrtc = supportedImageFormats.pvrtc;
  var supportsEtc1 = supportedImageFormats.etc1;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.imageId", imageId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.boolean("options.supportedImageFormats.webp", supportsWebP);
  Check.typeOf.boolean("options.supportedImageFormats.s3tc", supportsS3tc);
  Check.typeOf.boolean("options.supportedImageFormats.pvrtc", supportsPvrtc);
  Check.typeOf.boolean("options.supportedImageFormats.etc1", supportsEtc1);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getImageCacheKey({
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  var imageCacheResource = ResourceCache.get(cacheKey);
  if (defined(imageCacheResource)) {
    return imageCacheResource;
  }

  imageCacheResource = new GltfImageCacheResource({
    resourceCache: ResourceCache,
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    supportedImageFormats: supportedImageFormats,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    cacheResource: imageCacheResource,
    keepResident: keepResident,
  });

  return imageCacheResource;
};

/**
 * Loads a glTF texture from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.textureInfo The texture info object.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object.<String, Boolean>} options.supportedImageFormats The supported image formats.
 * @param {Boolean} options.supportedImageFormats.webp Whether the browser supports WebP images.
 * @param {Boolean} options.supportedImageFormats.s3tc Whether the browser supports s3tc compressed images.
 * @param {Boolean} options.supportedImageFormats.pvrtc Whether the browser supports pvrtc compressed images.
 * @param {Boolean} options.supportedImageFormats.etc1 Whether the browser supports etc1 compressed images.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfTextureCacheResource} The texture cache resource.
 */
ResourceCache.loadTexture = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var textureInfo = options.textureInfo;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var supportedImageFormats = defaultValue(
    options.supportedImageFormats,
    defaultValue.EMPTY_OBJECT
  );
  var supportsWebP = supportedImageFormats.webp;
  var supportsS3tc = supportedImageFormats.s3tc;
  var supportsPvrtc = supportedImageFormats.pvrtc;
  var supportsEtc1 = supportedImageFormats.etc1;
  var keepResident = defaultValue(options.keepResident, false);
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.boolean("options.supportedImageFormats.webp", supportsWebP);
  Check.typeOf.boolean("options.supportedImageFormats.s3tc", supportsS3tc);
  Check.typeOf.boolean("options.supportedImageFormats.pvrtc", supportsPvrtc);
  Check.typeOf.boolean("options.supportedImageFormats.etc1", supportsEtc1);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getTextureCacheKey({
    gltf: gltf,
    textureInfo: textureInfo,
    gltfResource: gltfResource,
    baseResource: baseResource,
    supportedImageFormats: supportedImageFormats,
  });

  var textureCacheResource = ResourceCache.get(cacheKey);
  if (defined(textureCacheResource)) {
    return textureCacheResource;
  }

  textureCacheResource = new GltfTextureCacheResource({
    resourceCache: ResourceCache,
    gltf: gltf,
    textureInfo: textureInfo,
    gltfResource: gltfResource,
    baseResource: baseResource,
    supportedImageFormats: supportedImageFormats,
    cacheKey: cacheKey,
    asynchronous: asynchronous,
  });

  ResourceCache.load({
    cacheResource: textureCacheResource,
    keepResident: keepResident,
  });

  return textureCacheResource;
};

/**
 * Unload everything from the cache. This is used for unit testing.
 * @private
 */
ResourceCache.clearForSpecs = function () {
  var cacheEntries = ResourceCache.cacheEntries;
  for (var key in cacheEntries) {
    if (cacheEntries.hasOwnProperty(key)) {
      var cacheEntry = cacheEntries[key];
      if (defined(cacheEntry) && defined(cacheEntry.unload)) {
        cacheEntry.unload();
      }
      delete cacheEntries[key];
    }
  }
};

export default ResourceCache;
