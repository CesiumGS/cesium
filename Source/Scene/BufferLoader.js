import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
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
  resource
    .fetchArrayBuffer()
    .then(function (arrayBuffer) {
      if (bufferLoader._state === ResourceLoaderState.DESTROYED) {
        return;
      }
      bufferLoader._typedArray = new Uint8Array(arrayBuffer);
      bufferLoader._state = ResourceLoaderState.READY;
      bufferLoader._promise.resolve(bufferLoader);
    })
    .otherwise(function (error) {
      bufferLoader._state = ResourceLoaderState.FAILED;
      var errorMessage = "Failed to load external buffer: " + resource.url;
      bufferLoader._promise.reject(
        ResourceLoader.getError(errorMessage, error)
      );
    });
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see BufferLoader#destroy
 */
BufferLoader.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the loaded resource.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * bufferLoader = bufferLoader && bufferLoader.destroy();
 *
 * @see BufferLoader#isDestroyed
 */
BufferLoader.prototype.destroy = function () {
  this._typedArray = undefined;
  this._state = ResourceLoaderState.DESTROYED;

  return destroyObject(this);
};
