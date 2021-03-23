import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import when from "../ThirdParty/when.js";
import CacheResource from "./CacheResource.js";
import CacheResourceState from "./CacheResourceState.js";

/**
 * A glTF Draco cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfDracoCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.draco The Draco extension object.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key of the resource.
 *
 * @private
 */
export default function GltfDracoCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var draco = options.draco;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.draco", draco);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._draco = draco;
  this._cacheKey = cacheKey;
  this._bufferViewCacheResource = undefined;
  this._typedArray = undefined;
  this._decodedData = undefined;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(GltfDracoCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfDracoCacheResource.prototype
   *
   * @type {Promise.<GltfDracoCacheResource>}
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
   * @memberof GltfDracoCacheResource.prototype
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
   * The decoded data.
   *
   * @memberof GltfDracoCacheResource.prototype
   *
   * @type {Object}
   * @readonly
   */
  decodedData: {
    get: function () {
      return this._decodedData;
    },
  },
});

/**
 * Loads the resource.
 */
GltfDracoCacheResource.prototype.load = function () {
  var resourceCache = this._resourceCache;
  var bufferViewCacheResource = resourceCache.loadBufferView({
    gltf: this._gltf,
    bufferViewId: this._draco.bufferView,
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
    keepResident: false,
  });

  this._bufferViewCacheResource = bufferViewCacheResource;
  this._state = CacheResourceState.LOADING;

  var that = this;

  bufferViewCacheResource.promise
    .then(function () {
      if (that._state === CacheResourceState.UNLOADED) {
        unload(that);
        return;
      }
      // Now wait for the Draco resources to be created in the update loop.
      var bufferViewTypedArray = bufferViewCacheResource.typedArray;
      that._typedArray = new Uint8Array(
        bufferViewTypedArray.buffer,
        bufferViewTypedArray.byteOffset + that._byteOffset,
        that._byteLength
      );
    })
    .otherwise(function (error) {
      handleError(that, error);
    });
};

function handleError(dracoCacheResource, error) {
  unload(dracoCacheResource);
  dracoCacheResource._state = CacheResourceState.FAILED;
  var errorMessage = "Failed to load Draco";
  error = CacheResource.getError(error, errorMessage);
  dracoCacheResource._promise.reject(error);
}

function unload(dracoCacheResource) {
  if (defined(dracoCacheResource._bufferViewCacheResource)) {
    var resourceCache = dracoCacheResource._resourceCache;
    resourceCache.unload(dracoCacheResource._bufferViewCacheResource);
  }

  dracoCacheResource._bufferViewCacheResource = undefined;
  dracoCacheResource._typedArray = undefined;
  dracoCacheResource._decodedData = undefined;
  dracoCacheResource._gltf = undefined;
}

/**
 * Unloads the resource.
 */
GltfDracoCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};

/**
 * Updates the resource.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfDracoCacheResource.prototype.update = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (!defined(this._typedArray)) {
    // Not ready to decode the Draco buffer
    return;
  }

  if (defined(this._decodePromise)) {
    // Currently decoding
    return;
  }

  var decodePromise = when.resolve(); // TODO
  if (!defined(decodePromise)) {
    // Cannot schedule task this frame
    return;
  }

  var that = this;
  this._decodePromise = decodePromise
    .then(function (decodedData) {
      unload(that);
      that._decodedData = decodedData;
      that._state = CacheResourceState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      handleError(that, error);
    });
};
