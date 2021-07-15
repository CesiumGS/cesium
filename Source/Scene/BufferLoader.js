import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdPartyNpm/when.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads an embedded or external buffer.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias BufferLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {Uint8Array} [options.typedArray] The typed array containing the embedded buffer contents. Mutually exclusive with options.resource.
 * @param {Resource} [options.resource] The {@link Resource} pointing to the external buffer. Mutually exclusive with options.typedArray.
 * @param {String} [options.cacheKey] The cache key of the resource.
 *
 * @exception {DeveloperError} One of options.typedArray and options.resource must be defined.
 *
 * @private
 */
export default function BufferLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var typedArray = options.typedArray;
  var resource = options.resource;
  var cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  if (defined(typedArray) === defined(resource)) {
    throw new DeveloperError(
      "One of options.typedArray and options.resource must be defined."
    );
  }
  //>>includeEnd('debug');

  this._typedArray = typedArray;
  this._resource = resource;
  this._cacheKey = cacheKey;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = when.defer();
}

if (defined(Object.create)) {
  BufferLoader.prototype = Object.create(ResourceLoader.prototype);
  BufferLoader.prototype.constructor = BufferLoader;
}

Object.defineProperties(BufferLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof BufferLoader.prototype
   *
   * @type {Promise.<BufferLoader>}
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
   * @memberof BufferLoader.prototype
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
   * The typed array containing the embedded buffer contents.
   *
   * @memberof BufferLoader.prototype
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
 * @private
 */
BufferLoader.prototype.load = function () {
  if (defined(this._typedArray)) {
    this._promise.resolve(this);
    return;
  }

  loadExternalBuffer(this);
};

function loadExternalBuffer(bufferLoader) {
  var resource = bufferLoader._resource;
  bufferLoader._state = ResourceLoaderState.LOADING;
  BufferLoader._fetchArrayBuffer(resource)
    .then(function (arrayBuffer) {
      if (bufferLoader.isDestroyed()) {
        return;
      }
      bufferLoader._typedArray = new Uint8Array(arrayBuffer);
      bufferLoader._state = ResourceLoaderState.READY;
      bufferLoader._promise.resolve(bufferLoader);
    })
    .otherwise(function (error) {
      if (bufferLoader.isDestroyed()) {
        return;
      }
      bufferLoader._state = ResourceLoaderState.FAILED;
      var errorMessage = "Failed to load external buffer: " + resource.url;
      bufferLoader._promise.reject(bufferLoader.getError(errorMessage, error));
    });
}

/**
 * Exposed for testing
 * @private
 */
BufferLoader._fetchArrayBuffer = function (resource) {
  return resource.fetchArrayBuffer();
};

/**
 * Unloads the resource.
 * @private
 */
BufferLoader.prototype.unload = function () {
  this._typedArray = undefined;
};
