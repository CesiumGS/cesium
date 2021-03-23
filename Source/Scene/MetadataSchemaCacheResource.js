import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
import CacheResourceState from "./CacheResourceState.js";
import CacheResource from "./CacheResource.js";
import MetadataSchema from "./MetadataSchema.js";

/**
 * A cache resource for {@link MetadataSchema} objects, as these may be shared
 * between different objects that support the <code>3DTILES_metadata</code>
 * extension.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias MetadataSchemaCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} [options.resource] The {@link Resource} pointing to the schema JSON. Mutually exclusive with options.schema
 * @param {Object} [options.schema] An object that explicitly defines a schema JSON. Mutually exclusive with options.resource
 * @param {String} options.cacheKey The cache key of the resource.
 *
 * @private
 */
function MetadataSchemaCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;
  var cacheKey = options.cacheKey;
  var schema = options.schema;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.cacheKey", cacheKey);
  var hasResource = defined(resource);
  var hasSchema = defined(schema);
  if (hasResource === hasSchema) {
    throw new DeveloperError(
      "One of options.resource and options.schema must be defined."
    );
  }
  //>>includeEnd('debug');

  this._schema = defined(schema) ? new MetadataSchema(schema) : undefined;
  this._resource = resource;
  this._cacheKey = cacheKey;
  this._schema = schema;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(MetadataSchemaCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof MetadataSchemaCacheResource.prototype
   *
   * @type {Promise.<MetadataSchemaCacheResource>}
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
   * @memberof MetadataSchemaCacheResource.prototype
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
   * The metadata schema object
   *
   * @memberof MetadataSchemaCacheResource.prototype
   *
   * @type {Object}
   * @readonly
   */
  schema: {
    get: function () {
      return this._schema;
    },
  },
});

/**
 * Loads the resource.
 */
MetadataSchemaCacheResource.prototype.load = function () {
  if (defined(this._schema)) {
    this._promise.resolve(this);
    return;
  }

  var that = this;
  this._state = CacheResourceState.LOADING;
  this._resource
    .fetchJson()
    .then(function (json) {
      if (that._state === CacheResourceState.UNLOADED) {
        unload(that);
        return;
      }
      that._schema = new MetadataSchema(json);
      that._state = CacheResourceState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      unload(that);
      that._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load JSON: " + that._resource.url;
      that._promise.reject(CacheResource.getError(error, errorMessage));
    });
};

function unload(schemaCacheResource) {
  schemaCacheResource._schema = undefined;
}

/**
 * Unloads the resource.
 */
MetadataSchemaCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};

export default MetadataSchemaCacheResource;
