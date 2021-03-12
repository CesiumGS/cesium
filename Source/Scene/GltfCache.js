import Check from "../Core/Check.js";
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

function GltfCache() {
  this._cacheEntries = {};
  this._allLoadResources = new ManagedArray();
}

function CacheEntry() {
  this.referenceCount = 1;
  this.cacheKey = undefined;
  this.contents = undefined;
  this.promise = undefined;
  this.parent = undefined;
  this.children = [];
}

function addCacheEntry(
  cache,
  cacheKey,
  contents,
  parentCacheEntry,
  keepResident
) {
  var cacheEntry = new CacheEntry();
  cacheEntry.cacheKey = cacheKey;
  cacheEntry.contents = contents;
  cacheEntry.keepResident = keepResident;

  if (defined(parentCacheEntry)) {
    cacheEntry.parent = parentCacheEntry;
    parentCacheEntry.children.push(cacheEntry);
  }

  cache._cacheEntries[cacheKey] = cacheEntry;
  return cacheEntry;
}

function getDerivedResource(baseResource, uri) {
  return baseResource.getDerivedResource({
    url: uri,
  });
}

function loadFromCache(
  cache,
  cacheKey,
  parentCacheEntry,
  keepResident,
  loadCallback
) {
  var cacheEntries = cache._cacheEntries;
  var cacheEntry = cacheEntries[cacheKey];
  if (defined(cacheEntry)) {
    if (defined(cacheEntry.promise)) {
      return cacheEntry.promise.then(function () {
        ++cacheEntry.referenceCount;
        return cacheEntry.contents;
      });
    }
    ++cacheEntry.referenceCount;
    return when.resolve(cacheEntry.contents);
  }

  cacheEntry = addCacheEntry(
    cache,
    cacheKey,
    undefined,
    parentCacheEntry,
    keepResident
  );

  if (!defined(loadCallback)) {
    return when.resolve(undefined);
  }

  cacheEntry.promise = loadCallback(cacheEntry)
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
            buffer.extras._pipeline.source = cache.getContents(cacheKey);
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

GltfCache.getVertexBufferCacheKey = function (bufferCacheKey, bufferViewId) {
  return bufferCacheKey + "-vertex-buffer-" + bufferViewId;
};

GltfCache.getDracoVertexBufferCacheKey = function (
  bufferCacheKey,
  dracoAttributeId
) {
  return bufferCacheKey + "-draco-vertex-buffer-" + dracoAttributeId;
};

GltfCache.getIndexBufferCacheKey = function (bufferCacheKey, accessorId) {
  return bufferCacheKey + "-index-buffer-" + accessorId;
};

GltfCache.getBufferCacheKey = function (
  gltfResource,
  bufferResource,
  buffer,
  bufferId
) {
  if (defined(buffer.uri)) {
    return GltfCache.getGltfCacheKey(gltfResource) + "-buffer-" + bufferId;
  }

  var resource = getDerivedResource(baseResource, uri);

  return getAbsoluteUri(bufferResource.url);
};

GltfCache.getEmbeddedBufferCacheKey = function (bufferResource) {
  return getAbsoluteUri(bufferResource.url);
};

function getExternalResourceCacheKey(baseResource, uri) {
  var resource = getDerivedResource(baseResource, uri);
  cacheKey = getAbsoluteUri(resource.url);
}

function cacheEmbeddedBuffers(
  cache,
  gltf,
  gltfResource,
  gltfCacheEntry,
  keepResident
) {
  ForEach.buffer(gltf, function (buffer, bufferId) {
    var source = buffer.extras._pipeline.source;
    if (defined(source) && !defined(buffer.uri)) {
      var cacheKey = getEmbeddedBufferCacheKey(gltfResource, bufferId);
      addCacheEntry(cache, cacheKey, source, gltfCacheEntry, keepResident);
    }
  });
}

function processGltf(
  cache,
  arrayBuffer,
  gltfResource,
  baseResource,
  gltfCacheEntry,
  keepResident
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
      cacheEmbeddedBuffers(
        cache,
        gltf,
        gltfResource,
        gltfCacheEntry,
        keepResident
      );
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

GltfCache.prototype.loadGltf = function (
  cacheKey,
  resource,
  baseResource,
  keepResident
) {
  var that = this;
  return loadFromCache(this, cacheKey, undefined, keepResident, function (
    gltfCacheEntry
  ) {
    return resource.fetchArrayBuffer().then(function (arrayBuffer) {
      return processGltf(
        that,
        arrayBuffer,
        resource,
        baseResource,
        gltfCacheEntry,
        keepResident
      );
    });
  }).otherwise(function (error) {
    throw new RuntimeError(getFailedLoadMessage(error, "glTF", resource.url));
  });
};

GltfCache.prototype.loadBuffer = function (
  cacheKey,
  buffer,
  baseResource,
  gltfCacheKey
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

GltfCache.prototype.loadVertexBuffer = function (cacheKey, loadPromise) {
  return loadFromCache(this, cacheKey, undefined, false, function () {
    return loadPromise;
  });
};

GltfCache.prototype.getContents = function (cacheKey) {
  return this._cacheEntries[cacheKey].contents;
};

function getVertexBufferCacheKey(gltfResource, buffer) {
  // Needs to be globally identifiable... depends if it's embedded or not
  // If the buffer is a uri the key can be related to the buffer uri and offset/range
  // If the buffer is embedded the key is related to the glTF file name + offset/range
  // Note that the uri won't always exist like for b3dm, i3dm, etc
  return getAbsoluteUri(gltfResource.url) + "-buffer-" + bufferId;
}

GltfCache.prototype.getBufferView = function () {
  // TODO:
};

GltfCache.prototype.getContents = function (cacheKey) {
  return this._cacheEntries[cacheKey];
};

GltfCache.prototype.getVertexBuffer = function (cacheKey, gltf, bufferView) {
  var bufferId = bufferView;
  var buffer = gltf.buffers[bufferId];

  var cacheKey = getVertexBufferCacheKey(this, bufferViewId);
  return this._cacheEntries[cacheKey];
};

GltfCache.prototype.getIndexBuffer = function (cacheKey, accessorId) {
  var cacheKey = get;
  return this._cacheEntries[cacheKey];
};

function releaseCacheEntry(cache, cacheEntry) {
  // Keep resident even if there are no active users TODO

  --cacheEntry.referenceCount;

  if (cacheEntry.referenceCount === 0) {
    var children = cacheEntry.children;
    var childrenLength = children.length;
    for (var i = 0; i < childrenLength; ++i) {
      releaseCacheEntry(cache, children[i]);
    }
    if (defined(cacheEntry.parent)) {
      releaseCacheEntry(cache, cacheEntry.parent);
    }
    delete cache._cacheEntries[cacheEntry.cacheKey];
  }
}

var CreateVertexBufferJob = function () {
  this.typedArray = undefined;
  this.context = undefined;
  this.vertexBuffer = undefined;
};

CreateIndexBufferJob.prototype.set = function (typedArray, context) {
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

function loadVertexBuffer(
  cache,
  loadResources,
  vertexBufferToLoad,
  frameState
) {
  if (defined(vertexBufferToLoad.typedArray)) {
    // Create the GPU vertex buffer once the buffer contents are loaded into memory
    if (loadResources.asynchronous) {
      scratchVertexBufferJob.set(
        vertexBufferToLoad.typedArray,
        frameState.context
      );
      var jobScheduler = frameState.jobScheduler;
      if (!jobScheduler.execute(scratchVertexBufferJob, JobType.BUFFER)) {
        return;
      }
      vertexBufferToLoad.vertexBuffer = scratchVertexBufferJob.vertexBuffer;
    } else {
      vertexBufferToLoad.vertexBuffer = createVertexBuffer(
        vertexBufferToLoad.typedArray,
        frameState.context
      );
    }

    vertexBufferToLoad.typedArray = undefined;
    vertexBufferToLoad.ready = true;
    cache.release(vertexBufferToLoad.bufferCacheKey);
    return;
  }

  if (!defined(vertexBufferToLoad.bufferPromise)) {
    // Load the buffer that this vertex buffer references
    vertexBufferToLoad.bufferPromise = this.loadBuffer(
      vertexBufferToLoad.bufferCacheKey,
      vertexBufferToLoad.buffer,
      vertexBufferToLoad.baseResource,
      vertexBufferToLoad.gltfCacheKey
    ).then(function (bufferTypedArray) {
      var bufferView = vertexBufferToLoad.bufferView;
      var byteOffset = bufferView.byteOffset;
      var byteLength = bufferView.byteLength;
      vertexBufferToLoad.typedArray = new Uint8Array(
        bufferTypedArray.buffer,
        bufferTypedArray.byteOffset + byteOffset,
        byteLength
      );
      vertexBufferToLoad.bufferPromise = undefined;
    });
  }
}

// var CreateIndexBufferJob = function () {
//   this.typedArray = undefined;
//   this.context = undefined;
//   this.indexBuffer = undefined;
// };

// CreateIndexBufferJob.prototype.set = function (typedArray, context) {
//   this.typedArray = typedArray;
//   this.context = context;
// };

// CreateIndexBufferJob.prototype.execute = function () {
//   this.indexBuffer = createIndexBuffer(this.typedArray, this.context);
// };

// function createIndexBuffer(typedArray, context) {
//   var indexBuffer = Buffer.createIndexBuffer({
//     context: context,
//     typedArray: typedArray,
//     usage: BufferUsage.STATIC_DRAW,
//     indexDatatype: ComponentDatatype.fromTypedArray(typedArray),
//   });
//   indexBuffer.vertexArrayDestroyable = false;
//   return indexBuffer;
// }

// var scratchIndexBufferJob = new CreateIndexBufferJob();

// function loadIndexBuffer(cache, loadResources, indexBufferToLoad, frameState) {
//   if (defined(indexBufferToLoad.indexBuffer)) {
//     return;
//   }
//   if (!defined(indexBufferToLoad.bufferPromise)) {
//     indexBufferToLoad.bufferPromise = this.loadBuffer(
//       indexBufferToLoad.cacheKey,
//       indexBufferToLoad.buffer,
//       indexBufferToLoad.baseResource,
//       indexBufferToLoad.gltfCacheKey
//     ).then(function (bufferTypedArray) {
//       var bufferView = indexBufferToLoad.bufferView;
//       var byteOffset = bufferView.byteOffset;
//       var byteLength = bufferView.byteLength;
//       indexBufferToLoad.typedArray = new Uint8Array(
//         bufferTypedArray.buffer,
//         bufferTypedArray.byteOffset + byteOffset,
//         byteLength
//       );
//     });
//   }

//   if (defined(indexBufferToLoad.typedArray)) {
//     if (loadResources.asynchronous) {
//       scratchIndexBufferJob.set(indexBufferToLoad.typedArray, frameState.context);
//       var jobScheduler = frameState.jobScheduler;
//       if (!jobScheduler.execute(scratchIndexBufferJob, JobType.BUFFER)) {
//         return;
//       }
//       indexBufferToLoad.indexBuffer = scratchIndexBufferJob.indexBuffer;
//       cache.release(indexBufferToLoad.cacheKey);
//     } else {
//       indexBufferToLoad.indexBuffer = createIndexBuffer(indexBufferToLoad.typedArray, frameState.context);
//     }
//   }
// }

GltfCache.prototype.update = function (frameState) {
  var i;
  var j;

  var readyCount = 0;

  var allLoadResources = this._allLoadResources;
  var allLoadResourcesLength = allLoadResources.length;

  for (i = 0; i < allLoadResourcesLength; ++i) {
    var ready = false;
    var loadResources = allLoadResources.get(i);
    var vertexBuffersToLoad = loadResources.vertexBuffersToLoad;
    var indexBuffersToLoad = loadResources.indexBuffersToLoad;
    var vertexBuffersToLoadLength = vertexBuffersToLoad.length;
    var indexBuffersToLoadLength = indexBuffersToLoad.length;

    for (j = 0; j < vertexBuffersToLoadLength; ++j) {
      var vertexBufferToLoad = vertexBuffersToLoad[j];
      if (!vertexBufferToLoad.ready) {
        loadVertexBuffer(vertexBuffersToLoad[j]);
        ready = ready && vertexBufferToLoad.ready;
      }
    }

    loadResources.ready = ready;

    if (ready) {
      ++readyCount;
      continue;
    }

    if (readyCount > 0) {
      // Shift back to fill in vacated slots from ready GltfLoadSource objects
      allLoadResources.set(i - readyCount, loadResources);
    }
  }

  allLoadResources.resize(allLoadResourcesLength - readyCount);
};

GltfCache.prototype.enqueueLoadResources = function (loadResources) {
  this._allLoadResources.push(loadResources);
};

GltfCache.prototype.release = function (cacheKey) {
  var cacheEntry = this._cacheEntries[cacheKey];
  releaseCacheEntry(this, cacheEntry);
};

export default GltfCache;
