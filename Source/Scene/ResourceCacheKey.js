import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";

/**
 * Compute cache keys for resources in {@link ResourceCache}.
 *
 * @namespace ResourceCacheKey
 *
 * @private
 */
var ResourceCacheKey = {};

function getExternalResourceCacheKey(resource) {
  return getAbsoluteUri(resource.url);
}

/**
 * Gets the schema cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} [options.schema] An object that explicitly defines a schema JSON. Mutually exclusive with options.resource.
 * @param {Resource} [options.resource] The {@link Resource} pointing to the schema JSON. Mutually exclusive with options.schema.
 *
 * @returns {String} The schema cache key.
 *
 * @exception {DeveloperError} One of options.schema and options.resource must be defined.
 */
ResourceCacheKey.getSchemaCacheKey = function (options) {
  var schema = options.schema;
  var resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  if (defined(schema) === defined(resource)) {
    throw new DeveloperError(
      "One of options.schema and options.resource must be defined."
    );
  }
  //>>includeEnd('debug');

  if (defined(schema)) {
    return JSON.stringify(schema);
  }

  return getExternalResourceCacheKey(resource);
};

/**
 * Gets the external buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the external buffer.
 *
 * @returns {String} The external buffer cache key.
 */
ResourceCacheKey.getExternalBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  //>>includeEnd('debug');

  return getExternalResourceCacheKey(resource);
};

/**
 * Gets the embedded buffer cache key.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.parentResource The {@link Resource} containing the embedded buffer.
 * @param {Number} options.bufferId A unique identifier of the embedded buffer within the parent resource.
 *
 * @returns {String} The embedded buffer cache key.
 */
ResourceCacheKey.getEmbeddedBufferCacheKey = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var parentResource = options.parentResource;
  var bufferId = options.bufferId;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.parentResource", parentResource);
  Check.typeOf.number("options.bufferId", bufferId);
  //>>includeEnd('debug');

  var parentCacheKey = getExternalResourceCacheKey(parentResource);
  return parentCacheKey + "-buffer-" + bufferId;
};

export default ResourceCacheKey;
