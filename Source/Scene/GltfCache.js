import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import getMagic from "../Core/getMagic.js";
import isDataUri from "../Core/isDataUri.js";
import ManagedArray from "../Core/ManagedArray.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import addDefaults from "../ThirdParty/GltfPipeline/addDefaults.js";
import addPipelineExtras from "../ThirdParty/GltfPipeline/addPipelineExtras.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import parseGlb from "../ThirdParty/GltfPipeline/parseGlb.js";
import removePipelineExtras from "../ThirdParty/GltfPipeline/removePipelineExtras.js";
import updateVersion from "../ThirdParty/GltfPipeline/updateVersion.js";
import when from "../ThirdParty/when.js";
import JobType from "./JobType.js";

/**
 * Cache for glTF resources shared across models.
 *
 * @alias GltfCache
 * @constructor
 *
 * @private
 */
function GltfCache() {
  this._cacheEntries = {};
  this._vertexBuffersToLoad = {};

  this._allLoadResources = new ManagedArray();
}

function getDerivedResource(baseResource, uri) {
  return baseResource.getDerivedResource({
    url: uri,
  });
}

GltfCache.getGltfCacheKey = function (gltfResource) {
  return getAbsoluteUri(gltfResource.url);
};

GltfCache.getEmbeddedBufferCacheKey = function (gltfCacheKey, bufferId) {
  return gltfCacheKey + "-buffer-" + bufferId;
};

GltfCache.getExternalResourceCacheKey = function (baseResource, uri) {
  var resource = getDerivedResource(baseResource, uri);
  return getAbsoluteUri(resource.url);
};

GltfCache.getVertexBufferCacheKey = function (bufferCacheKey, bufferView) {
  var byteOffset = bufferView.byteOffset;
  var byteLength = bufferView.byteLength;
  var bufferViewKey = byteOffset + "-" + byteLength;
  return bufferCacheKey + "-vertex-buffer-" + bufferViewKey;
};

GltfCache.getDracoVertexBufferCacheKey = function (
  bufferCacheKey,
  bufferView,
  dracoAttributeId
) {
  var byteOffset = bufferView.byteOffset;
  var byteLength = bufferView.byteLength;
  var bufferViewKey = byteOffset + "-" + byteLength;
  var dracoKey = dracoAttributeId;

  return (
    bufferCacheKey + "-draco-vertex-buffer-" + dracoKey + "-" + bufferViewKey
  );
};

GltfCache.getIndexBufferCacheKey = function (
  bufferCacheKey,
  accessor,
  bufferView
) {
  var byteOffset = bufferView.byteOffset + accessor.byteOffset;
  var componentType = accessor.componentType;
  var type = accessor.type;
  var count = accessor.count;
  var accessorKey = componentType + "-" + type + "-" + count;
  return bufferCacheKey + "-index-buffer-" + byteOffset + "-" + accessorKey;
};

function CacheEntry() {
  this.referenceCount = 1;
  this.cacheKey = undefined;
  this.contents = undefined;
  this.promise = undefined;
  this.children = [];
  this.keepResident = undefined;
  this.unloadFunction = undefined;
}

function loadFromCache(
  cache,
  cacheKey,
  parentCacheKey,
  keepResident,
  contents, // TODO: usually undefined
  loadFunction,
  unloadFunction
) {
  var cacheEntries = cache._cacheEntries;
  var cacheEntry = cacheEntries[cacheKey];
  if (defined(cacheEntry)) {
    ++cacheEntry.referenceCount;
    if (defined(cacheEntry.promise)) {
      return cacheEntry.promise.then(function () {
        return cacheEntry.contents;
      });
    }
    return when.resolve(cacheEntry.contents);
  }

  cacheEntry = new CacheEntry();
  cacheEntries[cacheKey] = cacheEntry;

  if (defined(parentCacheKey)) {
    var parentCacheEntry = cacheEntries[parentCacheKey];
    keepResident = defaultValue(keepResident, parentCacheEntry.keepResident);
    parentCacheEntry.children.push(cacheEntry);
  }

  cacheEntry.cacheKey = cacheKey;
  cacheEntry.contents = contents;
  cacheEntry.keepResident = defaultValue(keepResident, false);
  cacheEntry.unloadFunction = unloadFunction;

  if (!defined(loadFunction)) {
    return when.resolve(contents);
  }

  cacheEntry.promise = loadFunction()
    .then(function (contents) {
      cacheEntry.contents = contents;
      cacheEntry.promise = undefined;
    })
    .otherwise(function (error) {
      delete cacheEntries[cacheKey];
      throw error;
    });

  return cacheEntry.promise;
}

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

function processGltf(cache, typedArray, gltfCacheKey, baseResource) {
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
            return gltf;
          }
        );
      }
    );
  });
}

function getFailedLoadMessage(error, type, path) {
  var message = "Failed to load " + type + ": " + path;
  if (defined(error)) {
    message += "\n" + error.message;
  }
  return message;
}

GltfCache.prototype.loadGltf = function (
  cacheKey,
  resource,
  baseResource,
  keepResident
) {
  var that = this;
  var loadFunction = function () {
    return resource.fetchArrayBuffer().then(function (arrayBuffer) {
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
};

function loadBuffer(cache, cacheKey, buffer, baseResource, gltfCacheKey) {
  // Is external buffer
  if (defined(buffer.uri)) {
    var loadFunction = function () {
      var resource = getDerivedResource(baseResource, buffer.uri);
      return resource.fetchArrayBuffer().then(function (arrayBuffer) {
        return new Uint8Array(arrayBuffer);
      });
    };
    return loadFromCache(
      cache,
      cacheKey,
      undefined,
      false,
      loadFunction,
      undefined
    ).otherwise(function (error) {
      throw new RuntimeError(getFailedLoadMessage(error, "buffer", buffer.uri));
    });
  }

  // Is embedded buffer. Already in the cache so don't pass in keepResident or loadFunction.
  return loadFromCache(
    cache,
    cacheKey,
    gltfCacheKey,
    undefined,
    undefined,
    undefined
  );
}

function VertexBufferToLoad(options) {
  this.byteOffset = options.byteOffset;
  this.byteLength = options.byteLength;
  this.bufferUri = options.bufferUri;
  this.cacheKey = options.cacheKey;
  this.bufferCacheKey = options.bufferCacheKey;

  this.typedArray = undefined;
  this.vertexBuffer = undefined;
  this.vertexBufferPromise = undefined;
}

function CreateVertexBufferJob() {
  this.typedArray = undefined;
  this.context = undefined;
  this.vertexBuffer = undefined;
}

CreateVertexBufferJob.prototype.set = function (typedArray, context) {
  this.typedArray = typedArray;
  this.context = context;
};

CreateVertexBufferJob.prototype.execute = function () {
  this.vertexBuffer = createVertexBuffer(this.typedArray, this.context);
};

function createVertexBuffer(typedArray, context) {
  var vertexBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: typedArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  vertexBuffer.vertexArrayDestroyable = false;
  return vertexBuffer;
}

var scratchVertexBufferJob = new CreateVertexBufferJob();

function updateVertexBuffer(loadResources, vertexBufferToLoad, frameState) {
  if (defined(vertexBufferToLoad.vertexBuffer)) {
    // Already created vertex buffer
    return;
  }

  if (!defined(vertexBufferToLoad.typedArray)) {
    // Not ready to create vertex buffer
    return;
  }

  var vertexBuffer;

  if (loadResources.asynchronous) {
    var vertexBufferJob = scratchVertexBufferJob;
    vertexBufferJob.set(vertexBufferToLoad.typedArray, frameState.context);
    var jobScheduler = frameState.jobScheduler;
    if (!jobScheduler.execute(vertexBufferJob, JobType.BUFFER)) {
      // Job scheduler is full. Try again next frame.
      return;
    }
    vertexBuffer = vertexBufferJob.vertexBuffer;
  } else {
    vertexBuffer = createVertexBuffer(
      vertexBufferToLoad.typedArray,
      frameState.context
    );
  }

  vertexBufferToLoad.typedArray = undefined;
  vertexBufferToLoad.vertexBuffer = vertexBuffer;
  vertexBufferToLoad.vertexBufferPromise.resolve();
}

function getBufferCacheKey(gltfResource, baseResource, buffer, bufferId) {
  if (defined(buffer.uri)) {
    return GltfCache.getExternalResourceCacheKey(baseResource, buffer.uri);
  }
  var gltfCacheKey = GltfCache.getGltfCacheKey(gltfResource);
  return GltfCache.getEmbeddedBufferCacheKey(gltfCacheKey, bufferId);
}

GltfCache.prototype.loadVertexBuffer = function (options) {
  var bufferViewId = options.bufferViewId;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var gltf = options.gltf;

  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];
  var bufferCacheKey = getBufferCacheKey(
    gltfResource,
    baseResource,
    buffer,
    bufferId
  );
  var vertexBufferCacheKey = GltfCache.getVertexBufferCacheKey(
    bufferCacheKey,
    bufferView
  );

  var cacheEntry = this._cacheEntries[vertexBufferCacheKey];
  var vertexBufferToLoad;
  if (defined(cacheEntry)) {
    vertexBufferToLoad = cacheEntry.contents;
  } else {
    vertexBufferToLoad = new VertexBufferToLoad({
      byteOffset: bufferView.byteOffset,
      byteLength: bufferView.byteLength,
      bufferUri: buffer.uri,
      cacheKey: vertexBufferCacheKey,
      bufferCacheKey: bufferCacheKey,
    });
  }

  var that = this;

  var loadFunction = function () {
    return loadBuffer(
      that,
      vertexBufferToLoad.bufferCacheKey,
      vertexBufferToLoad.buffer,
      vertexBufferToLoad.baseResource,
      vertexBufferToLoad.gltfCacheKey
    ).then(function (bufferTypedArray) {
      // Got buffer from the cache
      var bufferView = vertexBufferToLoad.bufferView;
      var byteOffset = bufferView.byteOffset;
      var byteLength = bufferView.byteLength;
      var vertexBufferTypedArray = new Uint8Array(
        bufferTypedArray.buffer,
        bufferTypedArray.byteOffset + byteOffset,
        byteLength
      );
      // Now wait for the GPU buffer to be created in the update loop
      var vertexBufferPromise = when.defer();
      vertexBufferToLoad.vertexBufferPromise = vertexBufferPromise;
      vertexBufferToLoad.typedArray = vertexBufferTypedArray;
      return vertexBufferPromise.promise.then(function () {
        // TODO: make sure that this gets garbage collected
        // TODO: the bufferCache should really be a parent of this cache, but not the reverse
        // Release the reference to the buffer now that the data is on the GPU
        that.release(vertexBufferToLoad.bufferCacheKey);
        return vertexBufferToLoad;
      });
    });
  };

  var unloadFunction = function (vertexBufferToLoad) {
    var vertexBuffer = vertexBufferToLoad.vertexBuffer;
    var vertexBufferPromise = vertexBufferToLoad.vertexBufferPromise;

    if (defined(vertexBuffer)) {
      vertexBuffer.destroy();
    } else if (defined(vertexBufferPromise)) {
      // Force the promise to resolve so the bufferCacheKey
      vertexBufferPromise.resolve();
    }
  };

  return loadFromCache(
    cache,
    vertexBufferCacheKey,
    undefined,
    false,
    vertexBufferToLoad,
    loadFunction,
    unloadFunction
  );
};

GltfCache.prototype.update = function (frameState) {
  var i;
  var j;

  var readyCount = 0;

  var allLoadResources = this._allLoadResources;
  var allLoadResourcesLength = allLoadResources.length;

  for (i = 0; i < allLoadResourcesLength; ++i) {
    var ready = true;
    var loadResources = allLoadResources.get(i);
    var vertexBuffersToLoad = loadResources.vertexBuffersToLoad;
    var indexBuffersToLoad = loadResources.indexBuffersToLoad;
    var vertexBuffersToLoadLength = vertexBuffersToLoad.length;
    var indexBuffersToLoadLength = indexBuffersToLoad.length;

    for (j = 0; j < vertexBuffersToLoadLength; ++j) {
      var vertexBufferToLoad = vertexBuffersToLoad[j];
      updateVertexBuffer(vertexBufferToLoad);
      var vertexBufferReady = defined(vertexBufferToLoad.vertexBuffer);
      ready = ready && vertexBufferReady;
    }

    for (j = 0; j < indexBuffersToLoadLength; ++j) {
      var indexBufferToLoad = indexBuffersToLoad[j];
      updateIndexBuffer(indexBufferToLoad);
      var indexBufferReady = defined(indexBufferToLoad.indexBuffer);
      ready = ready && indexBufferReady;
    }

    if (ready) {
      ++readyCount;
      continue;
    }

    if (readyCount > 0) {
      // Shift back to fill in vacated slots
      allLoadResources.set(i - readyCount, loadResources);
    }
  }

  allLoadResources.resize(allLoadResourcesLength - readyCount);
};

GltfCache.prototype.loadResources = function (loadResources) {
  var i;

  var promises = [];

  var vertexBuffersToLoad = loadResources.vertexBuffersToLoad;
  var indexBuffersToLoad = loadResources.indexBuffersToLoad;
  var vertexBuffersToLoadLength = vertexBuffersToLoad.length;
  var indexBuffersToLoadLength = indexBuffersToLoad.length;

  for (i = 0; i < vertexBuffersToLoadLength; ++i) {
    promises.push(loadVertexBuffer(this, vertexBuffersToLoad[i]));
  }

  for (i = 0; i < indexBuffersToLoadLength; ++i) {
    promises.push(loadIndexBuffer(this, indexBuffersToLoad[i]));
  }

  this._allLoadResources.push(loadResources);

  return when.all(promises);
};

GltfCache.prototype.unloadResources = function (loadResources) {
  // TODO: need to watch out for promises that are still in flight.
  // E.g. some things are waiting on promises for resources they don't even control

  var i;

  var vertexBuffersToLoad = loadResources.vertexBuffersToLoad;
  var indexBuffersToLoad = loadResources.indexBuffersToLoad;
  var vertexBuffersToLoadLength = vertexBuffersToLoad.length;
  var indexBuffersToLoadLength = indexBuffersToLoad.length;

  for (i = 0; i < vertexBuffersToLoadLength; ++i) {
    promises.push(loadVertexBuffer(this, vertexBuffersToLoad[i]));
  }

  for (i = 0; i < indexBuffersToLoadLength; ++i) {
    promises.push(loadIndexBuffer(this, indexBuffersToLoad[i]));
  }

  this._allLoadResources.push(loadResources);

  return when.all(promises);
};

function releaseCacheEntry(cache, cacheEntry) {
  --cacheEntry.referenceCount;

  if (cacheEntry.referenceCount === 0) {
    var children = cacheEntry.children;
    var childrenLength = children.length;
    for (var i = 0; i < childrenLength; ++i) {
      releaseCacheEntry(cache, children[i]);
    }
    if (!cacheEntry.keepResident) {
      if (defined(cacheEntry.unloadFunction)) {
        cacheEntry.unloadFunction(cacheEntry.contents);
      }
      delete cache._cacheEntries[cacheEntry.cacheKey];
    }
  }
}

GltfCache.prototype.release = function (cacheKey) {
  var cacheEntry = this._cacheEntries[cacheKey];
  releaseCacheEntry(this, cacheEntry);
};

export default GltfCache;
