import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import BufferLoader from "./BufferLoader.js";
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
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @alias CacheEntry
 * @constructor
 *
 * @private
 */
function CacheEntry(options) {
  this.referenceCount = 1;
  this.resourceLoader = options.resourceLoader;
  this.keepResident = defaultValue(options.keepResident, false);
}

/**
 * Gets a resource from the cache. If the resource exists its reference count is
 * incremented. Otherwise, if no resource loader exists, undefined is returned.
 *
 * @param {String} cacheKey The cache key of the resource.
 *
 * @returns {ResourceLoader|undefined} The resource.
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
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @exception {DeveloperError} Resource with this cacheKey is already in the cache.
 */
ResourceCache.load = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceLoader = options.resourceLoader;
  var keepResident = defaultValue(options.keepResident, false);

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

  ResourceCache.cacheEntries[cacheKey] = new CacheEntry({
    resourceLoader: resourceLoader,
    keepResident: keepResident,
  });

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
  if (cacheEntry.referenceCount === 0) {
    throw new DeveloperError("Cannot unload resource that has no references.");
  }
  //>>includeEnd('debug');

  --cacheEntry.referenceCount;

  if (cacheEntry.referenceCount === 0 && !cacheEntry.keepResident) {
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
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {MetadataSchemaLoader} The schema resource.
 *
 * @exception {DeveloperError} One of options.schema and options.resource must be defined.
 */
ResourceCache.loadSchema = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var schema = options.schema;
  var resource = options.resource;
  var keepResident = defaultValue(options.keepResident, false);

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
    keepResident: keepResident,
  });

  return schemaLoader;
};

/**
 * Load an embedded buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.parentResource The {@link Resource} containing the embedded buffer.
 * @param {Number} options.bufferId A unique identifier of the embedded buffer within the parent resource.
 * @param {Uint8Array} options.typedArray The typed array containing the embedded buffer contents.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {BufferLoader} The buffer loader.
 */
ResourceCache.loadEmbeddedBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var parentResource = options.parentResource;
  var bufferId = options.bufferId;
  var typedArray = options.typedArray;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.parentResource", parentResource);
  Check.typeOf.number("options.bufferId", bufferId);
  Check.typeOf.object("options.typedArray", typedArray);
  //>>includeEnd('debug');

  var cacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
    parentResource: parentResource,
    bufferId: bufferId,
  });

  var bufferLoader = ResourceCache.get(cacheKey);
  if (defined(bufferLoader)) {
    return bufferLoader;
  }

  bufferLoader = new BufferLoader({
    cacheKey: cacheKey,
    typedArray: typedArray,
  });

  ResourceCache.load({
    resourceLoader: bufferLoader,
    keepResident: keepResident,
  });

  return bufferLoader;
};

/**
 * Loads an external buffer from the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the external buffer.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 *
 * @returns {BufferLoader} The buffer loader.
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

  var bufferLoader = ResourceCache.get(cacheKey);
  if (defined(bufferLoader)) {
    return bufferLoader;
  }

  bufferLoader = new BufferLoader({
    cacheKey: cacheKey,
    resource: resource,
  });

  ResourceCache.load({
    resourceLoader: bufferLoader,
    keepResident: keepResident,
  });

  return bufferLoader;
};

/**
 * Unload everything from the cache. This is used for unit testing.
 *
 * @private
 */
ResourceCache.clearForSpecs = function () {
  var cacheEntries = ResourceCache.cacheEntries;
  for (var cacheKey in cacheEntries) {
    if (cacheEntries.hasOwnProperty(cacheKey)) {
      var cacheEntry = cacheEntries[cacheKey];
      cacheEntry.resourceLoader.destroy();
      delete cacheEntries[cacheKey];
    }
  }
};

export default ResourceCache;
