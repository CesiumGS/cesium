import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import getMagic from "../Core/getMagic.js";
import isDataUri from "../Core/isDataUri.js";
import Resource from "../Core/Resource.js";
import addDefaults from "../ThirdParty/GltfPipeline/addDefaults.js";
import addPipelineExtras from "../ThirdParty/GltfPipeline/addPipelineExtras.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import parseGlb from "../ThirdParty/GltfPipeline/parseGlb.js";
import removePipelineExtras from "../ThirdParty/GltfPipeline/removePipelineExtras.js";
import updateVersion from "../ThirdParty/GltfPipeline/updateVersion.js";
import when from "../ThirdParty/when.js";
import CacheResource from "./CacheResource.js";
import CacheResourceState from "./CacheResourceState.js";

/**
 * A glTF cache resource.
 * <p>
 * Implements the {@link CacheResource} interface.
 * </p>
 *
 * @alias GltfCacheResource
 * @constructor
 * @augments CacheResource
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key of the resource.
 * @param {Boolean} [options.keepResident=false] Whether the glTF JSON and embedded buffers should stay in the cache indefinitely.
 *
 * @private
 */
function GltfCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._cacheKey = cacheKey;
  this._keepResident = keepResident;
  this._gltf = undefined;
  this._bufferCacheResources = [];
  this._state = CacheResourceState.UNLOADED;
  this._promise = when.defer();
}

Object.defineProperties(GltfCacheResource.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfCacheResource.prototype
   *
   * @type {Promise.<GltfCacheResource>}
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
   * @memberof GltfCacheResource.prototype
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
   * The glTF JSON.
   *
   * @memberof GltfCacheResource.prototype
   *
   * @type {Object}
   * @readonly
   */
  gltf: {
    get: function () {
      return this._gltf;
    },
  },
});

/**
 * Loads the resource.
 */
GltfCacheResource.prototype.load = function () {
  var that = this;
  this._state = CacheResourceState.LOADING;
  this._gltfResource
    .fetchArrayBuffer()
    .then(function (arrayBuffer) {
      if (that._state === CacheResourceState.UNLOADED) {
        unload(that);
        return;
      }
      var typedArray = new Uint8Array(arrayBuffer);
      return processGltf(that, typedArray);
    })
    .then(function (gltf) {
      if (that._state === CacheResourceState.UNLOADED) {
        unload(that);
        return;
      }
      unload(that);
      that._gltf = gltf;
      that._state = CacheResourceState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      unload(that);
      that._state = CacheResourceState.FAILED;
      var errorMessage = "Failed to load glTF: " + that._gltfResource.url;
      that._promise.reject(CacheResource.getError(error, errorMessage));
    });
};

function unload(gltfCacheResource) {
  gltfCacheResource._gltf = undefined;
  var bufferCacheResources = gltfCacheResource._bufferCacheResources;
  bufferCacheResources.forEach(function (bufferCacheResource) {
    gltfCacheResource._resourceCache.unload(bufferCacheResource);
  });
  gltfCacheResource._bufferCacheResource = [];
}

/**
 * Unloads the resource.
 */
GltfCacheResource.prototype.unload = function () {
  // TODO: only want to unload buffers that are in the GPU cache.
  // TODO: want to avoid double reference counting buffers
  unload(this);
  this._state = CacheResourceState.UNLOADED;
};

function containsGltfMagic(typedArray) {
  var magic = getMagic(typedArray);
  return magic === "glTF";
}

function upgradeVersion(gltfCacheResource, gltf) {
  if (gltf.asset.version === "2.0") {
    return when.resolve();
  }

  // Load all buffers into memory. updateVersion will read and in some cases modify
  // the buffer data, which it accesses from buffer.extras._pipeline.source
  var promises = [];
  ForEach.buffer(gltf, function (buffer) {
    if (!defined(buffer.extras._pipeline.source) && defined(buffer.uri)) {
      var resource = gltfCacheResource._baseResource.getDerivedResource({
        url: buffer.uri,
      });
      var resourceCache = gltfCacheResource._resourceCache;
      var bufferCacheResource = resourceCache.loadExternalBuffer({
        resource: resource,
        keepResident: false, // External buffers don't need to stay resident
      });

      gltfCacheResource._bufferCacheResources.push(bufferCacheResource);

      promises.push(
        bufferCacheResource.promise.then(function (typedArray) {
          buffer.extras._pipeline.source = typedArray;
        })
      );
    }
  });

  return when.all(promises).then(function () {
    updateVersion(gltf);
  });
}

function decodeDataUris(gltf) {
  var promises = [];
  ForEach.buffer(gltf, function (buffer) {
    var bufferUri = buffer.uri;
    if (defined(bufferUri) && isDataUri(bufferUri)) {
      delete buffer.uri; // Delete the data URI to keep the cached glTF JSON small
      promises.push(
        Resource.fetchArrayBuffer(bufferUri).then(function (arrayBuffer) {
          buffer.extras._pipeline.source = new Uint8Array(arrayBuffer);
        })
      );
    }
  });
  return when.all(promises);
}

function loadEmbeddedBuffers(gltfCacheResource, gltf) {
  var promises = [];
  ForEach.buffer(gltf, function (buffer, bufferId) {
    var source = buffer.extras._pipeline.source;
    if (defined(source) && !defined(buffer.uri)) {
      var resourceCache = gltfCacheResource._resourceCache;
      var bufferCacheResource = resourceCache.loadEmbeddedBuffer({
        parentResource: gltfCacheResource._gltfResource,
        bufferId: bufferId,
        typedArray: source,
        keepResident: gltfCacheResource._keepResident,
      });

      gltfCacheResource._bufferCacheResources.push(bufferCacheResource);
      promises.push(bufferCacheResource.promise);
    }
  });
  return when.all(promises);
}

function processGltf(gltfCacheResource, typedArray) {
  var gltf;
  if (containsGltfMagic(typedArray)) {
    gltf = parseGlb(typedArray);
  } else {
    gltf = getJsonFromTypedArray(typedArray);
  }

  addPipelineExtras(gltf);

  return decodeDataUris(gltf).then(function () {
    return upgradeVersion(gltfCacheResource, gltf).then(function () {
      addDefaults(gltf);
      return loadEmbeddedBuffers(gltfCacheResource, gltf).then(function () {
        removePipelineExtras(gltf);
        return gltf;
      });
    });
  });
}

export default GltfCacheResource;
