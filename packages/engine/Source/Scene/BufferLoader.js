import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
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
 * @param {object} options Object with the following properties:
 * @param {Uint8Array} [options.typedArray] The typed array containing the embedded buffer contents. Mutually exclusive with options.resource.
 * @param {Resource} [options.resource] The {@link Resource} pointing to the external buffer. Mutually exclusive with options.typedArray.
 * @param {string} [options.cacheKey] The cache key of the resource.
 *
 * @exception {DeveloperError} One of options.typedArray and options.resource must be defined.
 *
 * @private
 */
function BufferLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const typedArray = options.typedArray;
  const resource = options.resource;
  const cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  if (defined(typedArray) === defined(resource)) {
    throw new DeveloperError(
      "One of options.typedArray and options.resource must be defined.",
    );
  }
  //>>includeEnd('debug');

  this._typedArray = typedArray;
  this._resource = resource;
  this._cacheKey = cacheKey;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
}

if (defined(Object.create)) {
  BufferLoader.prototype = Object.create(ResourceLoader.prototype);
  BufferLoader.prototype.constructor = BufferLoader;
}

Object.defineProperties(BufferLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof BufferLoader.prototype
   *
   * @type {string}
   * @readonly
   * @private
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
   * @private
   */
  typedArray: {
    get: function () {
      return this._typedArray;
    },
  },
});

/**
 * Loads the resource.
 * @returns {Promise<BufferLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
BufferLoader.prototype.load = async function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  if (defined(this._typedArray)) {
    this._promise = Promise.resolve(this);
    return this._promise;
  }

  this._promise = loadExternalBuffer(this);
  return this._promise;
};

async function loadExternalBuffer(bufferLoader) {
  const resource = bufferLoader._resource;
  bufferLoader._state = ResourceLoaderState.LOADING;
  try {
    const arrayBuffer = await BufferLoader._fetchArrayBuffer(resource);
    if (bufferLoader.isDestroyed()) {
      return;
    }

    bufferLoader._typedArray = new Uint8Array(arrayBuffer);
    bufferLoader._state = ResourceLoaderState.READY;
    return bufferLoader;
  } catch (error) {
    if (bufferLoader.isDestroyed()) {
      return;
    }

    bufferLoader._state = ResourceLoaderState.FAILED;
    const errorMessage = `Failed to load external buffer: ${resource.url}`;
    throw bufferLoader.getError(errorMessage, error);
  }
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

export default BufferLoader;
