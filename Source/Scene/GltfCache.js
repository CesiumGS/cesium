import Check from "../Core/Check.js";
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
  this._cacheEntries = {};
}

function CacheEntry() {
  this.referenceCount = 1;
  this.contents = undefined;
  this.promise = undefined;
  this.parent = undefined;
}

function addCacheEntry(cache, cacheKey, contents, parentCacheEntry) {
  var cacheEntry = new CacheEntry();
  cacheEntry.contents = contents;
  cacheEntry.parent = parentCacheEntry;

  cache._cacheEntries[cacheKey] = cacheEntry;
}

function getDerivedResource(baseResource, uri) {
  return baseResource.getDerivedResource({
    url: uri,
  });
}

function loadFromCache(cache, cacheKey, parentCacheEntry, loadCallback) {
  var cacheEntries = cache._cacheEntries;
  var cacheEntry = cacheEntries[cacheKey];
  if (defined(cacheEntry)) {
    if (defined(cacheEntry.promise)) {
      return cacheEntry.promise.then(function (cacheKey) {
        ++cacheEntry.referenceCount;
        return cacheKey;
      });
    }
    ++cacheEntry.referenceCount;
    return when.resolve(cacheKey);
  }

  cacheEntry = new CacheEntry();
  cacheEntry.parent = parentCacheEntry;
  cacheEntries[cacheKey] = cacheEntry;

  if (!defined(loadCallback)) {
    return when.resolve(cacheKey);
  }

  cacheEntry.promise = loadCallback(cacheEntry)
    .then(function (contents) {
      cacheEntry.contents = contents;
      cacheEntry.promise = undefined;
      return cacheKey;
    })
    .otherwise(function (error) {
      delete cacheEntries[cacheKey];
      throw error;
    });

  return cacheEntry.promise;
}

function containsGltfMagic(uint8Array) {
  var magic = getMagic(uint8Array);
  return magic === "glTF";
}

function upgradeVersion(
  cache,
  gltf,
  gltfResource,
  baseResource,
  gltfCacheEntry
) {
  if (gltf.asset.version === "2.0") {
    return when.resolve();
  }

  // Load all buffers into memory. updateVersion will read and in some cases modify
  // the buffer data, which it accesses from buffer.extras._pipeline.source
  var promises = [];
  ForEach.buffer(gltf, function (buffer, bufferId) {
    if (!defined(buffer.extras._pipeline.source) && defined(buffer.uri)) {
      promises.push(
        cache
          .loadBuffer(
            buffer,
            bufferId,
            gltfResource,
            baseResource,
            gltfCacheEntry
          )
          .then(function (cacheKey) {
            buffer.extras._pipeline.source = cache.getBuffer(cacheKey);
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

function getEmbeddedBufferCacheKey(gltfResource, bufferId) {
  return getAbsoluteUri(gltfResource.url) + "-buffer-" + bufferId;
}

function cacheEmbeddedBuffers(cache, gltf, gltfResource, gltfCacheEntry) {
  ForEach.buffer(gltf, function (buffer, bufferId) {
    var source = buffer.extras._pipeline.source;
    if (defined(source) && !defined(buffer.uri)) {
      var cacheKey = getEmbeddedBufferCacheKey(gltfResource, bufferId);
      addCacheEntry(cache, cacheKey, source, gltfCacheEntry);
    }
  });
}

function processGltf(
  cache,
  arrayBuffer,
  gltfResource,
  baseResource,
  gltfCacheEntry
) {
  var uint8Array = new Uint8Array(arrayBuffer);

  var gltf;
  if (containsGltfMagic(uint8Array)) {
    gltf = parseGlb(uint8Array);
  } else {
    gltf = getJsonFromTypedArray(uint8Array);
  }

  addPipelineExtras(gltf);

  return decodeDataUris(gltf).then(function () {
    return upgradeVersion(
      cache,
      gltf,
      gltfResource,
      baseResource,
      gltfCacheEntry
    ).then(function () {
      addDefaults(gltf);
      cacheEmbeddedBuffers(cache, gltf, gltfResource, gltfCacheEntry);
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

var defaultAccept =
  "model/gltf-binary,model/gltf+json;q=0.8,application/json;q=0.2,*/*;q=0.01";

GltfCache.prototype.loadGltf = function (uri, basePath) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("uri", uri);
  //>>includeEnd('debug');

  // Create resource for the glTF file
  var resource = Resource.createIfNeeded(uri);

  // Add Accept header if we need it
  if (!defined(resource.headers.Accept)) {
    resource.headers.Accept = defaultAccept;
  }

  // Set up baseResource to get dependent files
  var baseResource = defined(basePath)
    ? Resource.createIfNeeded(basePath)
    : resource.clone();

  var cacheKey = getAbsoluteUri(resource.url);

  var that = this;
  return loadFromCache(this, cacheKey, undefined, function (gltfCacheEntry) {
    return resource.fetchArrayBuffer().then(function (arrayBuffer) {
      return processGltf(
        that,
        arrayBuffer,
        resource,
        baseResource,
        gltfCacheEntry
      );
    });
  }).otherwise(function (error) {
    throw new RuntimeError(getFailedLoadMessage(error, "glTF", resource.url));
  });
};

GltfCache.prototype.loadBuffer = function (
  buffer,
  bufferId,
  gltfResource,
  baseResource,
  gltfCacheEntry
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  Check.defined("bufferId", bufferId);
  Check.typeOf.object("gltfResource", gltfResource);
  Check.typeOf.object("baseResource", baseResource);
  Check.typeOf.object("gltfCacheEntry", gltfCacheEntry);
  //>>includeEnd('debug');

  var cacheKey;

  if (defined(buffer.uri)) {
    var resource = getDerivedResource(baseResource, buffer.uri);
    cacheKey = getAbsoluteUri(resource.url);
    return loadFromCache(this, cacheKey, gltfCacheEntry, function () {
      return resource.fetchArrayBuffer().then(function (arrayBuffer) {
        return new Uint8Array(arrayBuffer);
      });
    }).otherwise(function (error) {
      throw new RuntimeError(getFailedLoadMessage(error, "buffer", buffer.uri));
    });
  }

  cacheKey = getEmbeddedBufferCacheKey(gltfResource, bufferId);
  return loadFromCache(this, cacheKey, gltfCacheEntry);
};

GltfCache.prototype.getBuffer = function (cacheKey) {
  return this._cacheEntries[cacheKey].contents;
};

export default GltfCache;
