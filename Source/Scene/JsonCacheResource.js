import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import when from "../ThirdParty/when.js";
import CacheResource from "./CacheResource.js";
import CacheResourceState from "./CacheResourceState.js";

/**
 * A JSON cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias JsonCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The {@link Resource} pointing to the JSON file.
 * @param {String} options.cacheKey The cache key of the resource.
 *
 * @private
 */
function JsonCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;
  var cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  this._resource = resource;
  this._cacheKey = cacheKey;
  this._json = undefined;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(JsonCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof JsonCacheResource.prototype
   *
   * @type {Promise.<JsonCacheResource>}
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
   * @memberof JsonCacheResource.prototype
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
   * The JSON object.
   *
   * @memberof JsonCacheResource.prototype
   *
   * @type {Object}
   * @readonly
   */
  json: {
    get: function () {
      return this._json;
    },
  },
});

/**
 * Loads the resource.
 */
JsonCacheResource.prototype.load = function () {
  var that = this;
  this._state = CacheResourceState.LOADING;
  this._resource
    .fetchJson()
    .then(function (json) {
      if (that._state === CacheResourceState.UNLOADED) {
        unload(that);
        return;
      }
      unload(that);
      that._json = json;
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

function unload(jsonCacheResource) {
  jsonCacheResource._json = undefined;
}

/**
 * Unloads the resource.
 */
JsonCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};

export default JsonCacheResource;
