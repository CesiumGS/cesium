import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * Resource cache shared across 3D Tiles and glTF.
 *
 * @namespace ResourceCache
 *
 * @private
 */
function ResourceCache() {}

ResourceCache.cacheEntries = {};

function CacheEntry(options) {
  this.referenceCount = 1;
  this.resource = options.resource;
  this.keepResident = options.keepResident;
}

/**
 * Gets a resource from the cache. If the resource exists its reference count is
 * incremented. Otherwise, if no resource exists, undefined is returned.
 *
 * @param {String} cacheKey The cache key.
 *
 * @returns {CacheResource|undefined} The resource.
 */
ResourceCache.get = function (cacheKey) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("cacheKey", cacheKey);
  //>>includeEnd('debug');

  var cacheEntry = ResourceCache.cacheEntries[cacheKey];
  if (defined(cacheEntry)) {
    ++cacheEntry.referenceCount;
    return cacheEntry.resource;
  }
  return undefined;
};

/**
 * Loads a resource and adds it to the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {CacheResource} options.resource The resource.
 * @param {Boolean} [options.keepResident=false] Whether the resource should stay in the cache indefinitely.
 */
ResourceCache.load = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  //>>includeEnd('debug');

  var cacheKey = resource.cacheKey;

  ResourceCache.cacheEntries[cacheKey] = new CacheEntry({
    resource: resource,
    keepResident: keepResident,
  });

  resource.load();

  resource.promise.otherwise(function () {
    // If the resource fails to load remove it from the cache
    delete ResourceCache.cacheEntries[cacheKey];
  });
};

/**
 * Unloads a resource from the cache. When the reference count hits zero the
 * resource's unload function is called.
 *
 * @param {CacheResource} resource The resource.
 */
ResourceCache.unload = function (resource) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("resource", resource);
  //>>includeEnd('debug');

  var cacheKey = resource.cacheKey;

  var cacheEntry = ResourceCache.cacheEntries[cacheKey];
  --cacheEntry.referenceCount;

  if (cacheEntry.referenceCount === 0 && !cacheEntry.keepResident) {
    if (defined(resource.unload)) {
      resource.unload();
    }
    delete ResourceCache.cacheEntries[cacheKey];
  }
};

/**
 * TODO: doc
 */
ResourceCache.getError = function (error, errorMessage) {
  if (defined(error)) {
    errorMessage += "\n" + error.message;
  }
  return new RuntimeError(errorMessage);
};

export default ResourceCache;
