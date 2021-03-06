import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import getMagic from "../Core/getMagic.js";
import isDataUri from "../Core/isDataUri.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import addDefaults from "../ThirdParty/GltfPipeline/addDefaults.js";
import addPipelineExtras from "../ThirdParty/GltfPipeline/addPipelineExtras.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import parseGlb from "../ThirdParty/GltfPipeline/parseGlb.js";
import removePipelineExtras from "../ThirdParty/GltfPipeline/removePipelineExtras.js";
import updateVersion from "../ThirdParty/GltfPipeline/updateVersion.js";
import when from "../ThirdParty/when.js";

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
 * @param {GltfCache} options.gltfCache The {@link GltfCache} (to avoid circular dependencies).
 * @param {Resource} options.gltfResource The {@link Resource} pointing to the glTF file.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} options.cacheKey The cache key.
 * @param {Boolean} [options.keepResident=false] Whether the glTF JSON and embedded buffers should stay in the cache indefinitely.
 *
 * @private
 */
function GltfCacheResource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfCache = options.gltfCache;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;
  var keepResident = defaultValue(options.keepResident, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfCache", gltfCache);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.string("options.cacheKey", cacheKey);
  //>>includeEnd('debug');

  this._gltfCache = gltfCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._cacheKey = cacheKey;
  this._keepResident = keepResident;
  this._promise = undefined;
  this._gltf = undefined;
  this._bufferCacheResources = [];
}

Object.defineProperties(GltfCacheResource.prototype, {
  /**
   * A promise that resolves when the resource is ready.
   *
   * @memberof GltfCacheResource.prototype
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
   *
   * @exception {DeveloperError} The resource is not loaded.
   */
  gltf: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(this._gltf)) {
        throw new DeveloperError("The resource is not loaded");
      }
      //>>includeEnd('debug');
      return this._gltf;
    },
  },
});

/**
 * Loads the resource.
 */
GltfCacheResource.prototype.load = function () {
  var that = this;
  this._promise = this._gltfResource
    .fetchArrayBuffer()
    .then(function (arrayBuffer) {
      var typedArray = new Uint8Array(arrayBuffer);
      return processGltf(that, typedArray);
    })
    .then(function (gltf) {
      that._gltf = gltf;
    })
    .otherwise(function (error) {
      var message = "Failed to load glTF: " + that._gltfResource.url;
      if (defined(error)) {
        message += "\n" + error.message;
      }
      throw new RuntimeError(message);
    });
};

/**
 * Unloads the resource.
 */
GltfCacheResource.prototype.unload = function () {
  // TODO: only want to unload buffers that are in the GPU cache.
  // TODO: want to avoid double reference counting buffers
  var that = this;
  this._bufferCacheResources.forEach(function (bufferCacheResource) {
    that._gltfCache.unloadBuffer(bufferCacheResource);
  });
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
  ForEach.buffer(gltf, function (buffer, bufferId) {
    if (!defined(buffer.extras._pipeline.source) && defined(buffer.uri)) {
      var bufferCacheResource = gltfCacheResource._gltfCache.loadBuffer({
        buffer: buffer,
        bufferId: bufferId,
        gltfResource: gltfCacheResource._gltfResource,
        baseResource: gltfCacheResource._baseResource,
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

function cacheEmbeddedBuffers(gltfCacheResource, gltf) {
  var promises = [];
  ForEach.buffer(gltf, function (buffer, bufferId) {
    var source = buffer.extras._pipeline.source;
    if (defined(source) && !defined(buffer.uri)) {
      var bufferCacheResource = gltfCacheResource._gltfCache.loadBuffer({
        buffer: buffer,
        bufferId: bufferId,
        gltfResource: gltfCacheResource._gltfResource,
        baseResource: gltfCacheResource._baseResource,
        keepResident: gltfCacheResource._keepResident,
        typedArray: source,
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
      return cacheEmbeddedBuffers(gltfCacheResource, gltf).then(function () {
        removePipelineExtras(gltf);
        return gltf;
      });
    });
  });
}

export default GltfCacheResource;
