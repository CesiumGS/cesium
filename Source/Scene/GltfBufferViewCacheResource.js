import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import when from "../ThirdParty/when.js";
import CacheResourceState from "./CacheResourceState.js";
import ResourceCache from "./ResourceCache.js";

/**
 * A glTF buffer view cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfBufferViewCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.bufferViewId The buffer view ID.
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key of the resource.
 *
 * @private
 */
export default function GltfBufferViewCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.bufferViewId", bufferViewId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.string("options.cacheKey", cacheKey);
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
  this._bufferCacheResource = undefined;
  this._typedArray = undefined;
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(GltfBufferViewCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfBufferViewCacheResource.prototype
   *
   * @type {Promise.<GltfBufferViewCacheResource>}
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
   * @memberof GltfBufferViewCacheResource.prototype
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
   * The typed array containing buffer view data.
   *
   * @memberof GltfBufferViewCacheResource.prototype
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
GltfBufferViewCacheResource.prototype.load = function () {
  var bufferCacheResource = getBufferCacheResource(this);
  this._bufferCacheResource = bufferCacheResource;
  this._state = CacheResourceState.LOADING;

  var that = this;

  bufferCacheResource.promise
    .then(function () {
      if (that._state === CacheResourceState.UNLOADED) {
        unload(that);
        return;
      }
      var bufferTypedArray = bufferCacheResource.typedArray;
      var typedArray = new Uint8Array(
        bufferTypedArray.buffer,
        bufferTypedArray.byteOffset + that._byteOffset,
        that._byteLength
      );
      unload(that);
      that._typedArray = typedArray;
      that._state = CacheResourceState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      unload(that);
      that._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load buffer view";
      that._promise.reject(ResourceCache.getError(error, errorMessage));
    });
};

function getBufferCacheResource(bufferViewCacheResource) {
  var resourceCache = bufferViewCacheResource._resourceCache;
  var buffer = bufferViewCacheResource._buffer;
  if (defined(buffer.uri)) {
    var baseResource = bufferViewCacheResource._baseResource;
    var resource = baseResource.getDerivedResource({
      url: buffer.uri,
    });
    return resourceCache.loadExternalBuffer({
      resource: resource,
      keepResident: false,
    });
  }
  return resourceCache.loadEmbeddedBuffer({
    parentResource: bufferViewCacheResource._gltfResource,
    bufferId: bufferViewCacheResource._bufferId,
    keepResident: false,
  });
}

function unload(bufferViewCacheResource) {
  if (defined(bufferViewCacheResource._bufferCacheResource)) {
    var resourceCache = bufferViewCacheResource._resourceCache;
    resourceCache.unload(bufferViewCacheResource._bufferCacheResource);
  }

  bufferViewCacheResource._bufferCacheResource = undefined;
  bufferViewCacheResource._typedArray = undefined;
}

/**
 * Unloads the resource.
 */
GltfBufferViewCacheResource.prototype.unload = function () {
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};
