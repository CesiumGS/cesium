import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "../Core/defined.js";
import when from "../ThirdParty/when.js";
import CacheResourceState from "./CacheResourceState.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";

/**
 * A glTF buffer cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfBufferCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.buffer The glTF buffer.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key.
 * @param {Uint8Array} [options.typedArray] A typed array containing buffer data. Only defined for buffers embedded in the glTF.
 *
 * @private
 */
function GltfBufferCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var buffer = options.buffer;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;
  var typedArray = options.typedArray;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.buffer", buffer);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  this._buffer = buffer;
  this._baseResource = baseResource;
  this._cacheKey = cacheKey;
  this._typedArray = typedArray;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(GltfBufferCacheResource.prototype, {
  /**
   * A promise that resolves when the resource is ready.
   *
   * @memberof GltfBufferCacheResource.prototype
   *
   * @type {Promise.<GltfBufferCacheResource>}
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
   * @memberof GltfBufferCacheResource.prototype
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
   * @memberof GltfBufferCacheResource.prototype
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
GltfBufferCacheResource.prototype.load = function () {
  if (defined(this._typedArray)) {
    this._promise.resolve(this);
  } else {
    loadExternalBuffer(this);
  }
};

function loadExternalBuffer(bufferCacheResource) {
  var baseResource = bufferCacheResource._baseResource;
  var buffer = bufferCacheResource._buffer;
  var resource = baseResource.getDerivedResource({
    url: buffer.uri,
  });
  bufferCacheResource._state = CacheResourceState.LOADING;
  resource
    .fetchArrayBuffer()
    .then(function (arrayBuffer) {
      if (bufferCacheResource._state === CacheResourceState.UNLOADED) {
        return;
      }

      bufferCacheResource._typedArray = new Uint8Array(arrayBuffer);
      bufferCacheResource._state = CacheResourceState.READY;
      bufferCacheResource._promise.resolve(bufferCacheResource);
    })
    .otherwise(function (error) {
      unload(bufferCacheResource);
      bufferCacheResource._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load external buffer: " + buffer.uri;
      bufferCacheResource._promise.reject(
        GltfLoaderUtil.getError(error, errorMessage)
      );
    });
}

function unload(bufferCacheResource) {
  bufferCacheResource._typedArray = undefined;
}

/**
 * Unloads the resource.
 */
GltfBufferCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};

export default GltfBufferCacheResource;
