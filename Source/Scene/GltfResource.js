import defined from "../Core/defined.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
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
 * A glTF resource.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The glTF resource.
 *
 * @alias GltfResource
 * @constructor
 *
 * @private
 */
function GltfResource(options) {
  var cache = options.cache;
  var gltfResource = options.gltfResource;

  var loadFunction = function () {
    return gltfResource.fetchArrayBuffer().then(function (arrayBuffer) {
      var typedArray = new Uint8Array(arrayBuffer);
      return processGltf(that, typedArray, cacheKey, baseResource);
    });
  };

  return loadFromCache(
    this,
    cacheKey,
    undefined,
    keepResident,
    loadFunction,
    undefined
  ).otherwise(function (error) {
    throw new RuntimeError(getFailedLoadMessage(error, "glTF", resource.url));
  });

  this._promise = promise;
  this._gltf = undefined;
}

GltfResource.getCacheKey = getGltfCacheKey;

GltfResource.load = function (options) {
  var cache = options.cache;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var buffer = options.buffer;
  var bufferId = options.bufferId;

  var cacheKey = getGltfCacheKey(gltfResource, baseResource, buffer, bufferId);
  var bufferResource = cache.get(cacheKey);
  if (defined(bufferResource)) {
    return bufferResource;
  }

  return new GltfBufferResource(options);
};

function containsGltfMagic(typedArray) {
  var magic = getMagic(typedArray);
  return magic === "glTF";
}

function upgradeVersion(cache, gltf, baseResource, gltfCacheKey) {
  if (gltf.asset.version === "2.0") {
    return when.resolve();
  }

  // Load all buffers into memory. updateVersion will read and in some cases modify
  // the buffer data, which it accesses from buffer.extras._pipeline.source
  var promises = [];
  ForEach.buffer(gltf, function (buffer) {
    if (!defined(buffer.extras._pipeline.source) && defined(buffer.uri)) {
      var bufferCacheKey = GltfCache.getExternalResourceCacheKey(
        baseResource,
        buffer.uri
      );
      promises.push(
        cache
          .loadBuffer(cache, bufferCacheKey, buffer, baseResource, gltfCacheKey)
          .then(function (typedArray) {
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

function cacheEmbeddedBuffers(cache, gltf, gltfCacheKey) {
  var promises = [];
  ForEach.buffer(gltf, function (buffer, bufferId) {
    var source = buffer.extras._pipeline.source;
    if (defined(source) && !defined(buffer.uri)) {
      var cacheKey = GltfCache.getEmbeddedBufferCacheKey(
        gltfCacheKey,
        bufferId
      );
      promises.push(
        loadFromCache(
          cache,
          cacheKey,
          gltfCacheKey,
          undefined,
          source,
          undefined,
          undefined
        )
      );
    }
  });
  return when.all(promises);
}

function processGltf(
  gltfResource,
  cache,
  typedArray,
  gltfCacheKey,
  baseResource
) {
  var gltf;
  if (containsGltfMagic(typedArray)) {
    gltf = parseGlb(typedArray);
  } else {
    gltf = getJsonFromTypedArray(typedArray);
  }

  addPipelineExtras(gltf);

  return decodeDataUris(gltf).then(function () {
    return upgradeVersion(cache, gltf, baseResource, gltfCacheKey).then(
      function () {
        addDefaults(gltf);
        return cacheEmbeddedBuffers(cache, gltf, gltfCacheKey).then(
          function () {
            removePipelineExtras(gltf);
            return gltfResource;
          }
        );
      }
    );
  });
}

export default GltfResource;
