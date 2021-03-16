import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";

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
  this._promise = undefined;
}

Object.defineProperties(GltfBufferCacheResource.prototype, {
  /**
   * A promise that resolves when the resource is ready.
   *
   * @memberof GltfBufferCacheResource.prototype
   *
   * @type {Promise}
   * @readonly
   *
   * @exception {DeveloperError} The resource is not loaded.
   */
  promise: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(this._promise)) {
        throw new DeveloperError("The resource is not loaded");
      }
      //>>includeEnd('debug');
      return this._promise;
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
   *
   * @exception {DeveloperError} The resource is not loaded.
   */
  typedArray: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(this._typedArray)) {
        throw new DeveloperError("The resource is not loaded");
      }
      //>>includeEnd('debug');
      return this._typedArray;
    },
  },
});

/**
 * Loads the resource.
 */
GltfBufferCacheResource.prototype.load = function () {
  var baseResource = this._baseResource;
  var buffer = this._buffer;

  var that = this;
  if (defined(buffer.uri)) {
    // External buffer
    var resource = baseResource.getDerivedResource({
      url: buffer.uri,
    });
    this._promise = resource
      .fetchArrayBuffer()
      .then(function (arrayBuffer) {
        that._typedArray = new Uint8Array(arrayBuffer);
      })
      .otherwise(function (error) {
        var message = "Failed to load external buffer: " + buffer.uri;
        if (defined(error)) {
          message += "\n" + error.message;
        }
        throw new RuntimeError(message);
      });
  } else {
    // Embedded buffer
    this._promise = when.resolve();
  }
};

export default GltfBufferCacheResource;
