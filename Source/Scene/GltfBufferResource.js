import defined from "../Core/defined.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";

/**
 * A buffer resource
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.buffer The glTF buffer.
 * @param {Resource} options.baseResource The base resource that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key of the resource.
 * @param {Resource} [options.typedArray] The typed array of the buffer when the buffer is embedded in the glTF.
 *
 * @alias GltfBufferResource
 * @constructor
 *
 * @private
 */
function GltfBufferResource(options) {
  this._buffer = options.buffer;
  this._baseResource = options.baseResource;
  this._cacheKey = options.cacheKey;
  this._typedArray = options.typedArray;
  this._promise = undefined;
}

Object.defineProperties(GltfBufferResource.prototype, {
  promise: {
    get: function () {
      return this._promise;
    },
  },
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  typedArray: {
    get: function () {
      return this._typedArray;
    },
  },
});

GltfBufferResource.prototype.load = function () {
  var baseResource = this._baseResource;
  var buffer = this._buffer;

  if (defined(buffer.uri)) {
    this._promise = loadExternalBuffer(this, buffer, baseResource);
  } else {
    this._promise = when.resolve();
  }
};

function loadExternalBuffer(bufferResource, buffer, baseResource) {
  var resource = baseResource.getDerivedResource({
    url: buffer.uri,
  });
  return resource
    .fetchArrayBuffer()
    .then(function (arrayBuffer) {
      bufferResource._typedArray = new Uint8Array(arrayBuffer);
    })
    .otherwise(function (error) {
      var message = "Failed to load external buffer: " + buffer.uri;
      if (defined(error)) {
        message += "\n" + error.message;
      }
      throw new RuntimeError(message);
    });
}

export default GltfBufferResource;
