import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
import CacheResourceState from "./CacheResourceState.js";
import ResourceCache from "./ResourceCache.js";

/**
 * A buffer cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias BufferCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.cacheKey The cache key of the resource.
 * @param {Resource} [options.resource] The {@link Resource} pointing to the external buffer.
 * @param {Uint8Array} [options.typedArray] The typed array containing the embedded buffer contents.
 *
 * @exception {DeveloperError} One of options.resource and options.typedArray must be defined.
 *
 * @private
 */
function BufferCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var cacheKey = options.cacheKey;
  var resource = options.resource;
  var typedArray = options.typedArray;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.cacheKey", cacheKey);
  var hasResource = defined(resource);
  var hasTypedArray = defined(typedArray);
  if (hasResource === hasTypedArray) {
    throw new DeveloperError(
      "One of options.resource and options.typedArray must be defined."
    );
  }
  //>>includeEnd('debug');

  this._cacheKey = cacheKey;
  this._resource = resource;
  this._typedArray = typedArray;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(BufferCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof BufferCacheResource.prototype
   *
   * @type {Promise.<BufferCacheResource>}
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
   * @memberof BufferCacheResource.prototype
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
   * The typed array containing buffer data.
   *
   * @memberof BufferCacheResource.prototype
   *
   * @type {Uint8Array}
   * @readonly
   */
  typedArray: {
    get: function () {
      return this._typedArray;
    },
  },
});

/**
 * Loads the resource.
 */
BufferCacheResource.prototype.load = function () {
  if (defined(this._typedArray)) {
    this._promise.resolve(this);
  } else {
    loadExternalBuffer(this);
  }
};

function loadExternalBuffer(bufferCacheResource) {
  var resource = bufferCacheResource._resource;
  bufferCacheResource._state = CacheResourceState.LOADING;
  resource
    .fetchArrayBuffer()
    .then(function (arrayBuffer) {
      if (bufferCacheResource._state === CacheResourceState.UNLOADED) {
        unload(bufferCacheResource);
        return;
      }
      unload(bufferCacheResource);
      bufferCacheResource._typedArray = new Uint8Array(arrayBuffer);
      bufferCacheResource._state = CacheResourceState.READY;
      bufferCacheResource._promise.resolve(bufferCacheResource);
    })
    .otherwise(function (error) {
      unload(bufferCacheResource);
      bufferCacheResource._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load external buffer: " + resource.url;
      bufferCacheResource._promise.reject(
        ResourceCache.getError(error, errorMessage)
      );
    });
}

function unload(bufferCacheResource) {
  bufferCacheResource._typedArray = undefined;
}

/**
 * Unloads the resource.
 */
BufferCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};

export default BufferCacheResource;
