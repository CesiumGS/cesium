import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import when from "../ThirdPartyNpm/when.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads a glTF buffer view.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfBufferViewLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The buffer view ID.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} [options.cacheKey] The cache key of the resource.
 *
 * @private
 */
export default function GltfBufferViewLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.bufferViewId", bufferViewId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._buffer = buffer;
  this._bufferId = bufferId;
  this._byteOffset = bufferView.byteOffset;
  this._byteLength = bufferView.byteLength;
  this._cacheKey = cacheKey;
  this._bufferLoader = undefined;
  this._typedArray = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = when.defer();
}

if (defined(Object.create)) {
  GltfBufferViewLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfBufferViewLoader.prototype.constructor = GltfBufferViewLoader;
}

Object.defineProperties(GltfBufferViewLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfBufferViewLoader.prototype
   *
   * @type {Promise.<GltfBufferViewLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfBufferViewLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The typed array containing buffer view data.
   *
   * @memberof GltfBufferViewLoader.prototype
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
 * @private
 */
GltfBufferViewLoader.prototype.load = function () {
  var bufferLoader = getBufferLoader(this);
  this._bufferLoader = bufferLoader;
  this._state = ResourceLoaderState.LOADING;

  var that = this;

  bufferLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }
      var bufferTypedArray = bufferLoader.typedArray;
      var bufferViewTypedArray = new Uint8Array(
        bufferTypedArray.buffer,
        bufferTypedArray.byteOffset + that._byteOffset,
        that._byteLength
      );

      // Unload the buffer
      that.unload();

      that._typedArray = bufferViewTypedArray;
      that._state = ResourceLoaderState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      that.unload();
      that._state = ResourceLoaderState.FAILED;
      var errorMessage = "Failed to load buffer view";
      that._promise.reject(that.getError(errorMessage, error));
    });
};

function getBufferLoader(bufferViewLoader) {
  var resourceCache = bufferViewLoader._resourceCache;
  var buffer = bufferViewLoader._buffer;
  if (defined(buffer.uri)) {
    var baseResource = bufferViewLoader._baseResource;
    var resource = baseResource.getDerivedResource({
      url: buffer.uri,
    });
    return resourceCache.loadExternalBuffer({
      resource: resource,
    });
  }
  return resourceCache.loadEmbeddedBuffer({
    parentResource: bufferViewLoader._gltfResource,
    bufferId: bufferViewLoader._bufferId,
  });
}

/**
 * Unloads the resource.
 * @private
 */
GltfBufferViewLoader.prototype.unload = function () {
  if (defined(this._bufferLoader)) {
    this._resourceCache.unload(this._bufferLoader);
  }

  this._bufferLoader = undefined;
  this._typedArray = undefined;
};
