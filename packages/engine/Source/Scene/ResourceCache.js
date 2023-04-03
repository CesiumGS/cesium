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
import ResourceCacheStatistics from "./ResourceCacheStatistics.js";

/**
 * Cache for resources shared across 3D Tiles and glTF.
 *
 * @namespace ResourceCache
 *
 * @private
 */
function ResourceCache() {}

ResourceCache.cacheEntries = {};

// Statistics about binary data stored in the resource cache
ResourceCache.statistics = new ResourceCacheStatistics();

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

  // For unit testing only
  this._statisticsPromise = undefined;
}

/**
 * Gets a resource from the cache. If the resource exists its reference count is
 * incremented. Otherwise, if no resource loader exists, undefined is returned.
 *
 * @param {string} cacheKey The cache key of the resource.
 *
 * @returns {ResourceLoader|undefined} The resource.
 * @private
 */
ResourceCache.get = function (cacheKey) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("cacheKey", cacheKey);
  //>>includeEnd('debug');

  const cacheEntry = ResourceCache.cacheEntries[cacheKey];
  if (defined(cacheEntry)) {
    ++cacheEntry.referenceCount;
    return cacheEntry.resourceLoader;
  }
  return undefined;
};

/**
 * Adds it to the cache.
 *
 * @param {ResourceLoader} resourceLoader The resource.
 * @returns {ResourceLoader} The resource.
 *
 * @exception {DeveloperError} Resource with this cacheKey is already in the cache
 * @private
 */
ResourceCache.add = function (resourceLoader) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("resourceLoader", resourceLoader);
  //>>includeEnd('debug');

  const cacheKey = resourceLoader.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.resourceLoader.cacheKey", cacheKey);

  if (defined(ResourceCache.cacheEntries[cacheKey])) {
    throw new DeveloperError(
      `Resource with this cacheKey is already in the cache: ${cacheKey}`
    );
  }
  //>>includeEnd('debug');

  ResourceCache.cacheEntries[cacheKey] = new CacheEntry(resourceLoader);

  return resourceLoader;
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

  const cacheKey = resourceLoader.cacheKey;
  const cacheEntry = ResourceCache.cacheEntries[cacheKey];

  //>>includeStart('debug', pragmas.debug);
  if (!defined(cacheEntry)) {
    throw new DeveloperError(`Resource is not in the cache: ${cacheKey}`);
  }
  //>>includeEnd('debug');

  --cacheEntry.referenceCount;

  if (cacheEntry.referenceCount === 0) {
    ResourceCache.statistics.removeLoader(resourceLoader);
    resourceLoader.destroy();
    delete ResourceCache.cacheEntries[cacheKey];
  }
};

/**
 * Gets an existing schema loader from the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {object} [options.schema] An object that explicitly defines a schema JSON. Mutually exclusive with options.resource.
 * @param {Resource} [options.resource] The {@link Resource} pointing to the schema JSON. Mutually exclusive with options.schema.
 *
 * @returns {MetadataSchemaLoader} The cached schema resource.
 *
 * @exception {DeveloperError} One of options.schema and options.resource must be defined.
 * @private
 */
ResourceCache.getSchemaLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const schema = options.schema;
  const resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  if (defined(schema) === defined(resource)) {
    throw new DeveloperError(
      "One of options.schema and options.resource must be defined."
    );
  }
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getSchemaCacheKey({
    schema: schema,
    resource: resource,
  });

  let schemaLoader = ResourceCache.get(cacheKey);
  if (defined(schemaLoader)) {
    return schemaLoader;
  }

  schemaLoader = new MetadataSchemaLoader({
    schema: schema,
    resource: resource,
    cacheKey: cacheKey,
  });

  return ResourceCache.add(schemaLoader);
};

/**
 * Gets an existing embedded buffer loader from the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {Resource} options.parentResource The {@link Resource} containing the embedded buffer.
 * @param {number} options.bufferId A unique identifier of the embedded buffer within the parent resource.
 * @param {Uint8Array} [options.typedArray] The typed array containing the embedded buffer contents.
 *
 * @returns {BufferLoader} The cached buffer loader.
 * @private
 */
ResourceCache.getEmbeddedBufferLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const parentResource = options.parentResource;
  const bufferId = options.bufferId;
  const typedArray = options.typedArray;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.parentResource", parentResource);
  Check.typeOf.number("options.bufferId", bufferId);
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
    parentResource: parentResource,
    bufferId: bufferId,
  });

  let bufferLoader = ResourceCache.get(cacheKey);
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

  return ResourceCache.add(bufferLoader);
};

/**
 * Gets an existing external buffer from loader the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the external buffer.
 *
 * @returns {BufferLoader} The cached buffer loader.
 * @private
 */
ResourceCache.getExternalBufferLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
    resource: resource,
  });

  let bufferLoader = ResourceCache.get(cacheKey);
  if (defined(bufferLoader)) {
    return bufferLoader;
  }

  bufferLoader = new BufferLoader({
    resource: resource,
    cacheKey: cacheKey,
  });

  return ResourceCache.add(bufferLoader);
};

/**
 * Gets an existing glTF JSON loader from the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Uint8Array} [options.typedArray] The typed array containing the glTF contents.
 * @param {object} [options.gltfJson] The parsed glTF JSON contents.
 *
 * @returns {GltfJsonLoader} The cached glTF JSON loader.
 * @private
 */
ResourceCache.getGltfJsonLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const typedArray = options.typedArray;
  const gltfJson = options.gltfJson;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getGltfCacheKey({
    gltfResource: gltfResource,
  });

  let gltfJsonLoader = ResourceCache.get(cacheKey);
  if (defined(gltfJsonLoader)) {
    return gltfJsonLoader;
  }

  gltfJsonLoader = new GltfJsonLoader({
    resourceCache: ResourceCache,
    gltfResource: gltfResource,
    baseResource: baseResource,
    typedArray: typedArray,
    gltfJson: gltfJson,
    cacheKey: cacheKey,
  });

  return ResourceCache.add(gltfJsonLoader);
};

/**
 * Gets an existing glTF buffer view from the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {number} options.bufferViewId The bufferView ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {GltfBufferViewLoader} The cached buffer view loader.
 * @private
 */
ResourceCache.getBufferViewLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltf = options.gltf;
  const bufferViewId = options.bufferViewId;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.bufferViewId", bufferViewId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getBufferViewCacheKey({
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  let bufferViewLoader = ResourceCache.get(cacheKey);
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

  return ResourceCache.add(bufferViewLoader);
};

/**
 * Gets an existing Draco data from the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {object} options.draco The Draco extension object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {GltfDracoLoader} The cached Draco loader.
 * @private
 */
ResourceCache.getDracoLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltf = options.gltf;
  const draco = options.draco;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.draco", draco);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getDracoCacheKey({
    gltf: gltf,
    draco: draco,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  let dracoLoader = ResourceCache.get(cacheKey);
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

  return ResourceCache.add(dracoLoader);
};

/**
 * Gets an existing glTF vertex buffer from the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {FrameState} options.frameState The frame state.
 * @param {number} [options.bufferViewId] The bufferView ID corresponding to the vertex buffer.
 * @param {object} [options.draco] The Draco extension object.
 * @param {string} [options.attributeSemantic] The attribute semantic, e.g. POSITION or NORMAL.
 * @param {number} [options.accessorId] The accessor ID.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {boolean} [options.dequantize=false] Determines whether or not the vertex buffer will be dequantized on the CPU.
 * @param {boolean} [options.loadBuffer=false] Load vertex buffer as a GPU vertex buffer.
 * @param {boolean} [options.loadTypedArray=false] Load vertex buffer as a typed array.
 * @exception {DeveloperError} One of options.bufferViewId and options.draco must be defined.
 * @exception {DeveloperError} When options.draco is defined options.attributeSemantic must also be defined.
 * @exception {DeveloperError} When options.draco is defined options.accessorId must also be defined.
 *
 * @returns {GltfVertexBufferLoader} The cached vertex buffer loader.
 * @private
 */
ResourceCache.getVertexBufferLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltf = options.gltf;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const frameState = options.frameState;
  const bufferViewId = options.bufferViewId;
  const draco = options.draco;
  const attributeSemantic = options.attributeSemantic;
  const accessorId = options.accessorId;
  const asynchronous = defaultValue(options.asynchronous, true);
  const dequantize = defaultValue(options.dequantize, false);
  const loadBuffer = defaultValue(options.loadBuffer, false);
  const loadTypedArray = defaultValue(options.loadTypedArray, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.frameState", frameState);
  if (!loadBuffer && !loadTypedArray) {
    throw new DeveloperError(
      "At least one of loadBuffer and loadTypedArray must be true."
    );
  }

  const hasBufferViewId = defined(bufferViewId);
  const hasDraco = hasDracoCompression(draco, attributeSemantic);
  const hasAttributeSemantic = defined(attributeSemantic);
  const hasAccessorId = defined(accessorId);

  if (hasBufferViewId === hasDraco) {
    throw new DeveloperError(
      "One of options.bufferViewId and options.draco must be defined."
    );
  }

  if (hasDraco && !hasAttributeSemantic) {
    throw new DeveloperError(
      "When options.draco is defined options.attributeSemantic must also be defined."
    );
  }

  if (hasDraco && !hasAccessorId) {
    throw new DeveloperError(
      "When options.draco is defined options.haAccessorId must also be defined."
    );
  }

  if (hasDraco) {
    Check.typeOf.object("options.draco", draco);
    Check.typeOf.string("options.attributeSemantic", attributeSemantic);
    Check.typeOf.number("options.accessorId", accessorId);
  }
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getVertexBufferCacheKey({
    gltf: gltf,
    gltfResource: gltfResource,
    baseResource: baseResource,
    frameState: frameState,
    bufferViewId: bufferViewId,
    draco: draco,
    attributeSemantic: attributeSemantic,
    dequantize: dequantize,
    loadBuffer: loadBuffer,
    loadTypedArray: loadTypedArray,
  });

  let vertexBufferLoader = ResourceCache.get(cacheKey);
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
    attributeSemantic: attributeSemantic,
    accessorId: accessorId,
    cacheKey: cacheKey,
    asynchronous: asynchronous,
    dequantize: dequantize,
    loadBuffer: loadBuffer,
    loadTypedArray: loadTypedArray,
  });

  return ResourceCache.add(vertexBufferLoader);
};

function hasDracoCompression(draco, semantic) {
  return (
    defined(draco) &&
    defined(draco.attributes) &&
    defined(draco.attributes[semantic])
  );
}

/**
 * Gets an existing glTF index buffer from the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {FrameState} options.frameState The frame state.
 * @param {object} [options.draco] The Draco extension object.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {boolean} [options.loadBuffer=false] Load index buffer as a GPU index buffer.
 * @param {boolean} [options.loadTypedArray=false] Load index buffer as a typed array.
 * @returns {GltfIndexBufferLoader} The cached index buffer loader.
 * @private
 */
ResourceCache.getIndexBufferLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltf = options.gltf;
  const accessorId = options.accessorId;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const frameState = options.frameState;
  const draco = options.draco;
  const asynchronous = defaultValue(options.asynchronous, true);
  const loadBuffer = defaultValue(options.loadBuffer, false);
  const loadTypedArray = defaultValue(options.loadTypedArray, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.accessorId", accessorId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.frameState", frameState);
  if (!loadBuffer && !loadTypedArray) {
    throw new DeveloperError(
      "At least one of loadBuffer and loadTypedArray must be true."
    );
  }
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getIndexBufferCacheKey({
    gltf: gltf,
    accessorId: accessorId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    frameState: frameState,
    draco: draco,
    loadBuffer: loadBuffer,
    loadTypedArray: loadTypedArray,
  });

  let indexBufferLoader = ResourceCache.get(cacheKey);
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
    loadBuffer: loadBuffer,
    loadTypedArray: loadTypedArray,
  });

  return ResourceCache.add(indexBufferLoader);
};

/**
 * Gets an existing glTF image from the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {number} options.imageId The image ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 *
 * @returns {GltfImageLoader} The cached image loader.
 * @private
 */
ResourceCache.getImageLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltf = options.gltf;
  const imageId = options.imageId;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.imageId", imageId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getImageCacheKey({
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  let imageLoader = ResourceCache.get(cacheKey);
  if (defined(imageLoader)) {
    return imageLoader;
  }

  imageLoader = new GltfImageLoader({
    resourceCache: ResourceCache,
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    cacheKey: cacheKey,
  });

  return ResourceCache.add(imageLoader);
};

/**
 * Gets an existing glTF texture from the cache, or creates a new loader if one does not already exist.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {object} options.textureInfo The texture info object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 * @param {FrameState} options.frameState The frame state.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @returns {GltfTextureLoader} The cached texture loader.
 * @private
 */
ResourceCache.getTextureLoader = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltf = options.gltf;
  const textureInfo = options.textureInfo;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const supportedImageFormats = options.supportedImageFormats;
  const frameState = options.frameState;
  const asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  Check.typeOf.object("options.frameState", frameState);
  //>>includeEnd('debug');

  const cacheKey = ResourceCacheKey.getTextureCacheKey({
    gltf: gltf,
    textureInfo: textureInfo,
    gltfResource: gltfResource,
    baseResource: baseResource,
    supportedImageFormats: supportedImageFormats,
    frameState: frameState,
  });

  let textureLoader = ResourceCache.get(cacheKey);
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

  return ResourceCache.add(textureLoader);
};

/**
 * Unload everything from the cache. This is used for unit testing.
 *
 * @private
 */
ResourceCache.clearForSpecs = function () {
  // Unload in the order below. This prevents an unload function from unloading
  // a resource that has already been unloaded.
  const precedence = [
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

  let cacheKey;
  const cacheEntries = ResourceCache.cacheEntries;

  const cacheEntriesSorted = [];
  for (cacheKey in cacheEntries) {
    if (cacheEntries.hasOwnProperty(cacheKey)) {
      cacheEntriesSorted.push(cacheEntries[cacheKey]);
    }
  }

  cacheEntriesSorted.sort(function (a, b) {
    const indexA = precedence.indexOf(a.resourceLoader.constructor);
    const indexB = precedence.indexOf(b.resourceLoader.constructor);
    return indexA - indexB;
  });

  const cacheEntriesLength = cacheEntriesSorted.length;
  for (let i = 0; i < cacheEntriesLength; ++i) {
    const cacheEntry = cacheEntriesSorted[i];
    cacheKey = cacheEntry.resourceLoader.cacheKey;
    if (defined(cacheEntries[cacheKey])) {
      cacheEntry.resourceLoader.destroy();
      delete cacheEntries[cacheKey];
    }
  }

  ResourceCache.statistics.clear();
};

export default ResourceCache;
