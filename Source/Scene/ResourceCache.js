import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import BufferLoader from "./BufferLoader.js";
import GltfBufferViewLoader from "./GltfBufferViewLoader.js";
import GltfDracoLoader from "./GltfDracoLoader.js";
import GltfImageLoader from "./GltfImageLoader.js";
import GltfIndexBufferLoader from "./GltfIndexBufferLoader.js";
import GltfJsonLoader from "./GltfJsonLoader.js";
import GltfTextureLoader from "./GltfTextureLoader.js";
import GltfVertexBufferLoader from "./GltfVertexBufferLoader.js";
import MetadataSchemaLoader from "./MetadataSchemaLoader.js";
import ResourceCacheKey from "./ResourceCacheKey.js";

/**
 * Cache for resources shared across 3D Tiles and glTF.
 *
 * @namespace ResourceCache
 *
 * @private
 */
function ResourceCache() {}

ResourceCache.cacheEntries = {};

/**
 * A reference-counted cache entry.
 *
 * @param {ResourceLoader} resourceLoader The resource.
 *
 * @alias CacheEntry
 * @constructor
 *
 * @private
 */
function CacheEntry(resourceLoader) {
  this.referenceCount = 1;
  this.resourceLoader = resourceLoader;
}

/**
 * Gets a resource from the cache. If the resource exists its reference count is
 * incremented. Otherwise, if no resource loader exists, undefined is returned.
 *
 * @param {String} cacheKey The cache key of the resource.
 *
 * @returns {ResourceLoader|undefined} The resource.
 * @private
 */
ResourceCache.get = function (cacheKey) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("cacheKey", cacheKey);
  //>>includeEnd('debug');

  var cacheEntry = ResourceCache.cacheEntries[cacheKey];
  if (defined(cacheEntry)) {
    ++cacheEntry.referenceCount;
    return cacheEntry.resourceLoader;
  }
  return undefined;
};

/**
 * Loads a resource and adds it to the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceLoader} options.resourceLoader The resource.
 *
 * @exception {DeveloperError} Resource with this cacheKey is already in the cach
 * @private
 */
ResourceCache.load = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceLoader = options.resourceLoader;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resourceLoader", resourceLoader);
  //>>includeEnd('debug');

  var cacheKey = resourceLoader.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.resourceLoader.cacheKey", cacheKey);

  if (defined(ResourceCache.cacheEntries[cacheKey])) {
    throw new DeveloperError(
      "Resource with this cacheKey is already in the cache: " + cacheKey
    );
  }
  //>>includeEnd('debug');

  ResourceCache.cacheEntries[cacheKey] = new CacheEntry(resourceLoader);

  resourceLoader.load();
};

/**
 * Unloads a resource from the cache. When the reference count hits zero the
 * resource is destroyed.
 *
 * @param {ResourceLoader} resourceLoader The resource.
 *
 * @exception {DeveloperError} Resource is not in the cache.
 * @exception {DeveloperError} Cannot unload resource that has no references.
 * @private
 */
ResourceCache.unload = function (resourceLoader) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("resourceLoader", resourceLoader);
  //>>includeEnd('debug');

  var cacheKey = resourceLoader.cacheKey;
  var cacheEntry = ResourceCache.cacheEntries[cacheKey];

  //>>includeStart('debug', pragmas.debug);
  if (!defined(cacheEntry)) {
    throw new DeveloperError("Resource is not in the cache: " + cacheKey);
  }
  //>>includeEnd('debug');

  --cacheEntry.referenceCount;

  if (cacheEntry.referenceCount === 0) {
    resourceLoader.destroy();
    delete ResourceCache.cacheEntries[cacheKey];
  }
};

/**
 * Loads a schema from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} [options.schema] An object that explicitly defines a schema JSON. Mutually exclusive with options.resource.
 * @param {Resource} [options.resource] The {@link Resource} pointing to the schema JSON. Mutually exclusive with options.schema.
 *
 * @returns {MetadataSchemaLoader} The schema resource.
 *
 * @exception {DeveloperError} One of options.schema and options.resource must be defined.
 * @private
 */
ResourceCache.loadSchema = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var schema = options.schema;
  var resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  if (defined(schema) === defined(resource)) {
    throw new DeveloperError(
      "One of options.schema and options.resource must be defined."
    );
  }
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getSchemaCacheKey({
    schema: schema,
    resource: resource,
  });

  var schemaLoader = ResourceCache.get(cacheKey);
  if (defined(schemaLoader)) {
    return schemaLoader;
  }

  schemaLoader = new MetadataSchemaLoader({
    schema: schema,
    resource: resource,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    resourceLoader: schemaLoader,
  });

  return schemaLoader;
};

/**
 * Load an embedded buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.parentResource The {@link Resource} containing the embedded buffer.
 * @param {Number} options.bufferId A unique identifier of the embedded buffer within the parent resource.
 * @param {Uint8Array} [options.typedArray] The typed array containing the embedded buffer contents.
 *
 * @returns {BufferLoader} The buffer loader.
 * @private
 */
ResourceCache.loadEmbeddedBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var parentResource = options.parentResource;
  var bufferId = options.bufferId;
  var typedArray = options.typedArray;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.parentResource", parentResource);
  Check.typeOf.number("options.bufferId", bufferId);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
    parentResource: parentResource,
    bufferId: bufferId,
  });

  var bufferLoader = ResourceCache.get(cacheKey);
  if (defined(bufferLoader)) {
    return bufferLoader;
  }

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.typedArray", typedArray);
  //>>includeEnd('debug');

  bufferLoader = new BufferLoader({
    typedArray: typedArray,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    resourceLoader: bufferLoader,
  });

  return bufferLoader;
};

/**
 * Loads an external buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the external buffer.
 *
 * @returns {BufferLoader} The buffer loader.
 * @private
 */
ResourceCache.loadExternalBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
    resource: resource,
  });

  var bufferLoader = ResourceCache.get(cacheKey);
  if (defined(bufferLoader)) {
    return bufferLoader;
  }

  bufferLoader = new BufferLoader({
    resource: resource,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    resourceLoader: bufferLoader,
  });

  return bufferLoader;
};

/**
 * Loads a glTF JSON from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Uint8Array} [options.typedArray] The typed array containing the glTF contents.
 *
 * @returns {GltfJsonLoader} The glTF JSON.
 * @private
 */
ResourceCache.loadGltfJson = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var typedArray = options.typedArray;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getGltfCacheKey({
    gltfResource: gltfResource,
  });

  var gltfJsonLoader = ResourceCache.get(cacheKey);
  if (defined(gltfJsonLoader)) {
    return gltfJsonLoader;
  }

  gltfJsonLoader = new GltfJsonLoader({
    resourceCache: ResourceCache,
    gltfResource: gltfResource,
    baseResource: baseResource,
    typedArray: typedArray,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    resourceLoader: gltfJsonLoader,
  });

  return gltfJsonLoader;
};

/**
 * Loads a glTF buffer view from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The bufferView ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {GltfBufferViewLoader} The buffer view loader.
 * @private
 */
ResourceCache.loadBufferView = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;

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

  var bufferViewLoader = ResourceCache.get(cacheKey);
  if (defined(bufferViewLoader)) {
    return bufferViewLoader;
  }

  bufferViewLoader = new GltfBufferViewLoader({
    resourceCache: ResourceCache,
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    resourceLoader: bufferViewLoader,
  });

  return bufferViewLoader;
};

/**
 * Loads Draco data from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.draco The Draco extension object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {GltfDracoLoader} The Draco loader.
 * @private
 */
ResourceCache.loadDraco = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var draco = options.draco;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;

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

  var dracoLoader = ResourceCache.get(cacheKey);
  if (defined(dracoLoader)) {
    return dracoLoader;
  }

  dracoLoader = new GltfDracoLoader({
    resourceCache: ResourceCache,
    gltf: gltf,
    draco: draco,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    resourceLoader: dracoLoader,
  });

  return dracoLoader;
};

/**
 * Loads a glTF vertex buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Number} [options.bufferViewId] The bufferView ID corresponding to the vertex buffer.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {String} [options.dracoAttributeSemantic] The Draco attribute semantic, e.g. POSITION or NORMAL.
 * @param {Number} [options.dracoAccessorId] The Draco accessor ID.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @exception {DeveloperError} One of options.bufferViewId and options.draco must be defined.
 * @exception {DeveloperError} When options.draco is defined options.dracoAttributeSemantic must also be defined.
 * @exception {DeveloperError} When options.draco is defined options.dracoAccessorId must also be defined.
 *
 * @returns {GltfVertexBufferLoader} The vertex buffer loader.
 * @private
 */
ResourceCache.loadVertexBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var bufferViewId = options.bufferViewId;
  var draco = options.draco;
  var dracoAttributeSemantic = options.dracoAttributeSemantic;
  var dracoAccessorId = options.dracoAccessorId;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);

  var hasBufferViewId = defined(bufferViewId);
  var hasDraco = defined(draco);
  var hasDracoAttributeSemantic = defined(dracoAttributeSemantic);
  var hasDracoAccessorId = defined(dracoAccessorId);

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

  if (hasDraco && !hasDracoAccessorId) {
    throw new DeveloperError(
      "When options.draco is defined options.hasDracoAccessorId must also be defined."
    );
  }

  if (hasDraco) {
    Check.typeOf.object("options.draco", draco);
    Check.typeOf.string(
      "options.dracoAttributeSemantic",
      dracoAttributeSemantic
    );
    Check.typeOf.number("options.dracoAccessorId", dracoAccessorId);
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

  var vertexBufferLoader = ResourceCache.get(cacheKey);
  if (defined(vertexBufferLoader)) {
    return vertexBufferLoader;
  }

  vertexBufferLoader = new GltfVertexBufferLoader({
    resourceCache: ResourceCache,
    gltf: gltf,
    gltfResource: gltfResource,
    baseResource: baseResource,
    bufferViewId: bufferViewId,
    draco: draco,
    dracoAttributeSemantic: dracoAttributeSemantic,
    dracoAccessorId: dracoAccessorId,
    cacheKey: cacheKey,
    asynchronous: asynchronous,
  });

  ResourceCache.load({
    resourceLoader: vertexBufferLoader,
  });

  return vertexBufferLoader;
};

/**
 * Loads a glTF index buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfIndexBufferLoader} The index buffer loader.
 * @private
 */
ResourceCache.loadIndexBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var accessorId = options.accessorId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var draco = options.draco;
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

  var indexBufferLoader = ResourceCache.get(cacheKey);
  if (defined(indexBufferLoader)) {
    return indexBufferLoader;
  }

  indexBufferLoader = new GltfIndexBufferLoader({
    resourceCache: ResourceCache,
    gltf: gltf,
    accessorId: accessorId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    draco: draco,
    cacheKey: cacheKey,
    asynchronous: asynchronous,
  });

  ResourceCache.load({
    resourceLoader: indexBufferLoader,
  });

  return indexBufferLoader;
};

/**
 * Loads a glTF image from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.imageId The image ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 *
 * @returns {GltfImageLoader} The image loader.
 * @private
 */
ResourceCache.loadImage = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var imageId = options.imageId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var supportedImageFormats = options.supportedImageFormats;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.imageId", imageId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getImageCacheKey({
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    supportedImageFormats: supportedImageFormats,
  });

  var imageLoader = ResourceCache.get(cacheKey);
  if (defined(imageLoader)) {
    return imageLoader;
  }

  imageLoader = new GltfImageLoader({
    resourceCache: ResourceCache,
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    supportedImageFormats: supportedImageFormats,
    cacheKey: cacheKey,
  });

  ResourceCache.load({
    resourceLoader: imageLoader,
  });

  return imageLoader;
};

/**
 * Loads a glTF texture from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.textureInfo The texture info object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfTextureLoader} The texture loader.
 * @private
 */
ResourceCache.loadTexture = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var textureInfo = options.textureInfo;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var supportedImageFormats = options.supportedImageFormats;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getTextureCacheKey({
    gltf: gltf,
    textureInfo: textureInfo,
    gltfResource: gltfResource,
    baseResource: baseResource,
    supportedImageFormats: supportedImageFormats,
  });

  var textureLoader = ResourceCache.get(cacheKey);
  if (defined(textureLoader)) {
    return textureLoader;
  }

  textureLoader = new GltfTextureLoader({
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
    resourceLoader: textureLoader,
  });

  return textureLoader;
};

/**
 * Unload everything from the cache. This is used for unit testing.
 *
 * @private
 */
ResourceCache.clearForSpecs = function () {
  // Unload in the order below. This prevents an unload function from unloading
  // a resource that has already been unloaded.
  var precedence = [
    GltfVertexBufferLoader,
    GltfIndexBufferLoader,
    GltfDracoLoader,
    GltfTextureLoader,
    GltfImageLoader,
    GltfBufferViewLoader,
    BufferLoader,
    MetadataSchemaLoader,
    GltfJsonLoader,
  ];

  var cacheKey;
  var cacheEntries = ResourceCache.cacheEntries;

  var cacheEntriesSorted = [];
  for (cacheKey in cacheEntries) {
    if (cacheEntries.hasOwnProperty(cacheKey)) {
      cacheEntriesSorted.push(cacheEntries[cacheKey]);
    }
  }

  cacheEntriesSorted.sort(function (a, b) {
    var indexA = precedence.indexOf(a.resourceLoader.constructor);
    var indexB = precedence.indexOf(b.resourceLoader.constructor);
    return indexA - indexB;
  });

  var cacheEntriesLength = cacheEntriesSorted.length;
  for (var i = 0; i < cacheEntriesLength; ++i) {
    var cacheEntry = cacheEntriesSorted[i];
    cacheKey = cacheEntry.resourceLoader.cacheKey;
    if (defined(cacheEntries[cacheKey])) {
      cacheEntry.resourceLoader.destroy();
      delete cacheEntries[cacheKey];
    }
  }
};

export default ResourceCache;
