import Check from "../Core/Check.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
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

function GltfCache() {
  this._cache = {};
  this._promiseCache = {};
}

function CacheItem(options) {
  this.referenceCount = 1;
  this.contents = options.contents;
  this.cacheKey = options.cacheKey;
  this.childCacheItem = options.childCacheItem;
}

function addCacheItem(cache, options) {
  cache._cache[options.cacheKey] = new CacheItem(options);
}

function getDerivedResource(baseResource, uri) {
  return baseResource.getDerivedResource({
    url: uri,
  });
}

function getCacheItem(loaderCache, cacheKey, childCacheItem, fetchCallback) {
  var cache = loaderCache._cache;
  var promiseCache = loaderCache._promiseCache;

  if (defined(cache[cacheKey])) {
    return when.resolve(cache[cacheKey]);
  }

  if (!defined(promiseCache[cacheKey])) {
    promiseCache[cacheKey] = fetchCallback();
  }

  return promiseCache[cacheKey]
    .then(function (contents) {
      if (defined(promiseCache[cacheKey])) {
        cache[cacheKey] = new CacheItem({
          contents: contents,
          cacheKey: cacheKey,
          childCacheItem: childCacheItem,
        });
        delete promiseCache[cacheKey];
      } else {
        ++cache[cacheKey].referenceCount;
      }
      return cache[cacheKey];
    })
    .otherwise(function (error) {
      if (defined(promiseCache[cacheKey])) {
        delete promiseCache[cacheKey];
      }
      throw error;
    });
}

function containsGltfMagic(uint8Array) {
  var magic = getMagic(uint8Array);
  return magic === "glTF";
}

function loadLegacyBuffer(cache, buffer, baseResource) {
  return cache
    .loadBuffer(cache, buffer, baseResource)
    .then(function (uint8Array) {
      buffer.extras._pipeline.source = uint8Array;
    });
}

function upgradeVersion(cache, gltf, baseResource) {
  if (gltf.asset.version === "2.0") {
    return when.resolve();
  }

  // Load all buffers into memory. updateVersion will read and in some cases modify
  // the buffer data, which it accesses from buffer.extras._pipeline.source
  var promises = [];
  var buffers = gltf.buffers;
  if (defined(buffers)) {
    for (var bufferId in buffers) {
      if (buffers.hasOwnProperty(buffers, bufferId)) {
        var buffer = buffers[bufferId];
        if (!defined(buffer.extras._pipeline.source) && defined(buffer.uri)) {
          promises.push(loadLegacyBuffer(cache, buffer, baseResource));
        }
      }
    }
  }

  return when.all(promises).then(function () {
    updateVersion(gltf);
  });
}

function decodeDataUris(gltf) {
  var promises = [];

  // ForEach is used here because it works for both glTF 1.0 and 2.0.
  // Note that decodeDataUris is called before updateGltf.
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

function getEmbeddedBufferCacheKey(baseResource, bufferId) {
  return baseResource.url + "-buffer-" + bufferId;
}

function cacheEmbeddedBuffers(cache, gltf, baseResource) {
  var buffers = gltf.buffers;
  if (defined(buffers)) {
    var buffersLength = buffers.length;
    for (var i = 0; i < buffersLength; ++i) {
      var buffer = buffers[i];
      var source = buffer.extras._pipeline.source;
      if (defined(source) && !defined(buffer.uri)) {
        var cacheKey = getEmbeddedBufferCacheKey(baseResource, i);
        addCacheItem(cache, {
          contents: source,
          cacheKey: cacheKey,
        });
      }
    }
  }
}

function processGltf(cache, arrayBuffer, baseResource) {
  var uint8Array = new Uint8Array(arrayBuffer);

  var gltf;
  if (containsGltfMagic(uint8Array)) {
    gltf = parseGlb(uint8Array);
  } else {
    gltf = getJsonFromTypedArray(uint8Array);
  }

  addPipelineExtras(gltf);

  return decodeDataUris(gltf).then(function () {
    return upgradeVersion(cache, gltf, baseResource).then(function () {
      addDefaults(gltf);
      cacheEmbeddedBuffers(cache, gltf, baseResource);
      removePipelineExtras(gltf);
      return gltf;
    });
  });
}

function getFailedLoadMessage(error, type, path) {
  var message = "Failed to load " + type + ": " + path;
  if (defined(error)) {
    message += "\n" + error.message;
  }
  return message;
}

var uriToGuid = {};

GltfCache.prototype.loadGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resource = options.resource;
  var baseResource = options.baseResource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.resource", resource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  // Check using a URI to GUID dictionary that we have not already added this glTF
  var cacheKey = uriToGuid[getAbsoluteUri(resource.url)];

  if (!defined(cacheKey)) {
    cacheKey = createGuid();
    uriToGuid[getAbsoluteUri(resource.url)] = cacheKey;
  }

  var that = this;
  return getCacheItem(this, cacheKey, undefined, function () {
    return resource.fetchArrayBuffer().then(function (arrayBuffer) {
      return processGltf(that, arrayBuffer, baseResource);
    });
  }).otherwise(function (error) {
    throw new RuntimeError(getFailedLoadMessage(error, "glTF", resource.url));
  });
};

GltfCache.prototype.loadBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.uri;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.uri", uri);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  var resource = getDerivedResource(baseResource, uri);
  cacheKey = defaultValue(cacheKey, resource.url);

  return getCacheItem(this, cacheKey, undefined, function () {
    return resource.fetchArrayBuffer().then(function (arrayBuffer) {
      return new Uint8Array(arrayBuffer);
    });
  }).otherwise(function (error) {
    throw new RuntimeError(getFailedLoadMessage(error, "buffer", uri));
  });
};

export default GltfCache;
