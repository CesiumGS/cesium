import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
import RuntimeError from "../Core/RuntimeError.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import when from "../ThirdParty/when.js";
import GltfCache from "./GltfCache.js";

var cache = new GltfCache();

var GltfLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};

/**
 * TODO: from ArrayBuffer
 * 
 * Loads a glTF model.
 * 
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.uri The uri to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until completion once all WebGL resources are created.
 * @param {Boolean} [options.keepResident=true] Whether the glTF JSON and other resources should stay in the cache indefinitely.
 *
 * @alias GltfLoader
 * @constructor
 *
 * @private
 */
function GltfLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  // Create resource for the glTF file
  var gltfResource = Resource.createIfNeeded(uri);

  // Add Accept header if we need it
  if (!defined(gltfResource.headers.Accept)) {
    gltfResource.headers.Accept = defaultAccept;
  }

  // Set up baseResource to get dependent files
  var baseResource = defined(basePath)
    ? Resource.createIfNeeded(basePath)
    : gltfResource.clone();

  this._uri = options.uri;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._keepResident = defaultValue(options.keepResident, true);
  this._asynchronous = defaultValue(options.asynchronous, true);
  this._gltf = undefined;
  this._gltfCacheKey = getAbsoluteUri(gltfResource.url);
  this._loadResource = new GltfLoadResources();
  this._error = undefined;
  this._state = GltfLoaderState.UNLOADED;
}

Object.defineProperties(GltfLoader.prototype, {
  /**
   * Whether the loader is ready.
   *
   * @memberof GltfLoader.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  ready: {
    get: function () {
      return this._state === GltfLoaderState.READY;
    },
  },
  /**
   * The error message if the glTF failed to load.
   *
   * @memberof GltfLoader.prototype
   * @type {Error}
   * @readonly
   * @private
   */
  error: {
    get: function () {
      return this._error;
    }
  }
});

function getBufferCacheKey(loader, buffer, bufferId) {
  if (defined(buffer.uri)) {
    return GltfCache.getExternalResourceCacheKey(loader._baseResource, buffer.uri);
  }
  return GltfCache.getEmbeddedBufferCacheKey(loader._gltfCacheKey, bufferId);
}

function getVertexBuffersToLoad(loader) {
  var gltf = loader._gltf;

  var bufferViewIds = {};
  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      var dracoAttributes = defaultValue.EMPTY_OBJECT;
      if (
        defined(primitive.extensions) &&
        defined(primitive.extensions.KHR_draco_mesh_compression)
      ) {
        dracoAttributes = primitive.extensions.KHR_draco_mesh_compression;
      }
      ForEach.meshPrimitiveAttribute(primitive, function (
        accessorId,
        semantic
      ) {
        // Ignore accessors that may contain uncompressed fallback data since we only care about the compressed data
        if (!defined(dracoAttributes[semantic])) {
          var accessor = gltf.accessors[accessorId];
          var bufferViewId = accessor.bufferView;
          if (defined(bufferViewId)) {
            bufferViewIds[bufferViewId] = true;
          }
        }
      });
      ForEach.meshPrimitiveTarget(primitive, function (target) {
        ForEach.meshPrimitiveTargetAttribute(target, function (accessorId) {
          var accessor = gltf.accessors[accessorId];
          var bufferViewId = accessor.bufferView;
          if (defined(bufferViewId)) {
            bufferViewIds[bufferViewId] = true;
          }
        });
      });
    });
  });

  // Need to load instancing vertex buffers

  var vertexBuffersToLoad = [];
  for (var bufferViewId in bufferViewIds) {
    if (bufferViewIds.hasOwnProperty(bufferViewId)) {
      var bufferView = gltf.bufferViews[bufferViewId];
      var bufferId = bufferView.buffer;
      var buffer = gltf.buffers[bufferId];
      var bufferCacheKey = getBufferCacheKey(loader, buffer, bufferId);
      var vertexBufferCacheKey = GltfCache.getVertexBufferCacheKey(bufferCacheKey, bufferViewId);
      vertexBuffersToLoad.push(new VertexBufferToLoad(vertexBufferCacheKey, bufferViewId)); 
    }
  }

  return vertexBuffersToLoad;
}

function getIndexBuffersToLoad(loader) {
  var gltf = loader._gltf;

  var accessorIds = {};
  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      var hasDracoExtension = defined(primitive.extensions) && defined(primitive.extensions.KHR_draco_mesh_compression);
      if (!hasDracoExtension && defined(primitive.indices)) {
        // Ignore accessors that may contain uncompressed fallback data since we only care about the compressed data
        accessorIds[primitive.indices]
      }
    });
  });

  var indexBuffersToLoad = [];
  for (var accessorId in accessorIds) {
    if (accessorIds.hasOwnProperty(accessorId)) {
      var accessor = gltf.accessors[accessorId];
      var bufferViewId = accessor.bufferViewId;
      if (defined(bufferViewId)) {
        var bufferView = gltf.bufferViews[bufferViewId];
        var bufferId = bufferView.buffer;
        var buffer = gltf.buffers[bufferId];
        var bufferCacheKey = getBufferCacheKey(loader, buffer, bufferId);
        var indexBufferCacheKey = GltfCache.getIndexBufferCacheKey(bufferCacheKey, accessorId);
        indexBuffersToLoad.push(new IndexBufferToLoad(indexBufferCacheKey, bufferViewId)); 
      }
    }
  }

  return indexBuffersToLoad;
}

function parseGltf(loader) {
  var loadResources = new GltfLoadResources(loader._asynchronous);
  load._loadResources = loadResources;

  loadResources._vertexBuffersToLoad = getVertexBuffersToLoad(loader);
  loadResources._indexBuffersToLoad = getIndexBuffersToLoad(loader);

  cache.enqueueLoadResources(loadResources);
}

function handleModelDestroyed(loader, model) {
  if (model.isDestroyed()) {
    cache.release(loader._gltfCacheKey);
    loader._state = GltfLoaderState.FAILED;
    return true;
  }
  return false;
}

function loadGltf(loader, model) {
  cache
  .loadGltf(loader._gltfCacheKey, loader._gltfResource, loader._baseResource, loader._keepResident)
  .then(function (gltf) {
    if (handleModelDestroyed(loader, model)) {
      return;
    }
    loader._gltf = gltf;
    parseGltf(loader);
    loader._state = GltfLoaderState.PROCESSING;
  }).otherwise(function (error) {
    loader._error = error;
    loader._state = GltfLoaderState.FAILED;
  });
}

function processGltf(loader, model, frameState) {
  var vertexBuffersToLoad = this._vertexBuffersToLoad;
  var indexBuffersToLoad = this._indexBuffersToLoad;

  var vertexBuffersToLoadLength = vertexBuffersToLoad.length;
  var indexBuffersToLoadLength = indexBuffersToLoad.length;

  for (var i = 0; i < vertexBuffersToLoadLength; ++i) {
    var vertexBufferToLoad = vertexBuffersToLoad[i];
    var vertexBufferCacheKey = vertexBufferToLoad.cacheKey;
    var vertexBuffer = cache.getContents(vertexBufferCacheKey);
    if (defined(vertexBuffer)) {
      vertexBufferToLoad.vertexBuffer = vertexBuffer;
    }



    if (!defined(vertexBufferToLoad.loadBufferPromise)) {
      vertexBufferToLoad.loadBufferPromise = cache.loadBuffer()
    }

    if (!defined(vertexBufferToLoad.loadBufferPromise)) {
      vertexBufferToLoad.loadBufferPromise = when.defer();
    }
  }
}

GltfLoader.prototype.update = function(model, frameState) {
  if (!FeatureDetection.supportsWebP.initialized) {
    FeatureDetection.supportsWebP.initialize();
    return;
  }
  var supportsWebP = FeatureDetection.supportsWebP();

  if (this._state === GltfLoaderState.UNLOADED) {
    loadGltf(this, model);
    this._state = GltfLoaderState.LOADING;
  }

  if (this._state === GltfLoaderState.PROCESSING) {
    processGltf(this, model, frameState);
  }
};

function loadShaders(promises) {
  ForEach.shader(gltf, function (shader) {
    var promise = cache
      .loadShader(shader.uri)
      .then(function (text) {
        shader.extras._pipeline.source = text;
      })
      .otherwise(function (error) {
        throw new RuntimeError(
          getFailedLoadMessage(error, "shader", shader.uri)
        );
      });
    promises.push(promise);
  });
}

function loadTextures(promises) {
  ForEach.image(gltf, function (image) {
    var promise = cache
      .loadImage(image.uri)
      .then(function (text) {
        image.extras._pipeline.source = text;
      })
      .otherwise(function (error) {
        throw new RuntimeError(getFailedLoadMessage(error, "image", image.uri));
      });
    promises.push(promise);
  });
}

function getVertexBuffers() {
  var vertexBufferViewIds = {};
  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      var dracoAttributes = defaultValue.EMPTY_OBJECT;
      if (
        defined(primitive.extensions) &&
        defined(primitive.extensions.KHR_draco_mesh_compression)
      ) {
        dracoAttributes = primitive.extensions.KHR_draco_mesh_compression;
      }
      ForEach.meshPrimitiveAttribute(primitive, function (
        accessorId,
        semantic
      ) {
        // Ignore accessors that may contain uncompressed fallback data since we only care about the compressed data
        if (!defined(dracoAttributes[semantic])) {
          var accessor = gltf.accessors[accessorId];
          var bufferViewId = accessor.bufferView;
          if (defined(bufferViewId)) {
            vertexBufferViewIds[bufferViewId] = true;
          }
        }
      });
      ForEach.meshPrimitiveTarget(primitive, function (target) {
        ForEach.meshPrimitiveTargetAttribute(target, function (accessorId) {
          var accessor = gltf.accessors[accessorId];
          var bufferViewId = accessor.bufferView;
          if (defined(bufferViewId)) {
            vertexBufferViewIds[bufferViewId] = true;
          }
        });
      });
    });
  });
}

function getUsedAccessorIds(gltf) {
  var usedAccessorIds = {};

  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      var dracoAttributes = defaultValue.EMPTY_OBJECT;
      if (
        defined(primitive.extensions) &&
        defined(primitive.extensions.KHR_draco_mesh_compression)
      ) {
        dracoAttributes = primitive.extensions.KHR_draco_mesh_compression;
      }
      ForEach.meshPrimitiveAttribute(primitive, function (
        accessorId,
        semantic
      ) {
        // Ignore accessors that may contain uncompressed fallback data since we only care about the compressed data
        if (!defined(dracoAttributes[semantic])) {
          usedAccessorIds[accessorId] = true;
        }
      });
      ForEach.meshPrimitiveTarget(primitive, function (target) {
        ForEach.meshPrimitiveTargetAttribute(target, function (accessorId) {
          usedAccessorIds[accessorId] = true;
        });
      });
      var indices = primitive.indices;
      if (defined(indices)) {
        usedAccessorIds[indices] = true;
      }
    });
  });

  ForEach.skin(gltf, function (skin) {
    if (defined(skin.inverseBindMatrices)) {
      usedAccessorIds[skin.inverseBindMatrices] = true;
    }
  });

  ForEach.animation(gltf, function (animation) {
    ForEach.animationSampler(animation, function (sampler) {
      if (defined(sampler.input)) {
        usedAccessorIds[sampler.input] = true;
      }
      if (defined(sampler.output)) {
        usedAccessorIds[sampler.output] = true;
      }
    });
  });

  if (hasExtension(gltf, "EXT_mesh_gpu_instancing")) {
    ForEach.node(gltf, function (node) {
      var extensions = node.extensions;
      if (defined(extensions) && defined(extensions.EXT_mesh_gpu_instancing)) {
        var attributes = extensions.EXT_mesh_gpu_instancing.attributes;
        if (defined(attributes)) {
          for (var attributeName in attributes) {
            if (attributes.hasOwnProperty(attributeName)) {
              usedAccessorIds[attributes[attributeName]] = true;
            }
          }
        }
      }
    });
  }

  return Object.keys(usedAccessorIds);
}

function getUsedBufferViewIds(gltf) {
  var usedBufferViewIds = [];

  var usedAccessorIds = getUsedAccessorIds(gltf);
  var usedAccessorsLength = usedAccessorIds.length;

  for (var i = 0; i < usedAccessorsLength; ++i) {
    var accessorId = usedAccessorIds[i];
    var accessor = gltf.accessors[accessorId];
    if (defined(accessor.bufferView)) {
      usedBufferViewIds[accessor.bufferView] = true;
    }
  }

  ForEach.shader(gltf, function (shader) {
    if (defined(shader.bufferView)) {
      usedBufferViewIds[shader.bufferView] = true;
    }
  });

  ForEach.image(gltf, function (image) {
    if (defined(image.bufferView)) {
      usedBufferViewIds[image.bufferView] = true;
    }
  });

  if (hasExtension(gltf, "KHR_draco_mesh_compression")) {
    ForEach.mesh(gltf, function (mesh) {
      ForEach.meshPrimitive(mesh, function (primitive) {
        if (
          defined(primitive.extensions) &&
          defined(primitive.extensions.KHR_draco_mesh_compression)
        ) {
          usedBufferViewIds[
            primitive.extensions.KHR_draco_mesh_compression.bufferView
          ] = true;
        }
      });
    });
  }

  if (hasExtension(gltf, "EXT_feature_metadata")) {
    var extension = gltf.extensions.EXT_feature_metadata;
    for (var featureTableId in extension.featureTables) {
      if (extension.featureTables.hasOwnProperty(featureTableId)) {
        var featureTable = extension.featureTables[featureTableId];
        var properties = featureTable.properties;
        if (defined(properties)) {
          for (var propertyId in properties) {
            if (properties.hasOwnProperty(propertyId)) {
              var property = properties[propertyId];
              usedBufferViewIds[property.bufferView] = true;
              if (defined(property.arrayOffsetBufferView)) {
                usedBufferViewIds[property.arrayOffsetBufferView] = true;
              }
              if (defined(property.stringOffsetBufferView)) {
                usedBufferViewIds[property.stringOffsetBufferView] = true;
              }
            }
          }
        }
      }
    }
  }

  return Object.keys(usedBufferViewIds);
}

function getUsedBufferIds(gltf) {
  var usedBufferIds = {};

  var usedBufferViewIds = getUsedBufferViewIds(gltf);
  var usedBufferViewsLength = usedBufferViewIds.length;

  for (var i = 0; i < usedBufferViewsLength; ++i) {
    var bufferViewId = usedBufferViewIds[i];
    var bufferView = gltf.bufferViews[bufferViewId];
    if (defined(bufferView)) {
      usedBufferIds[bufferView.buffer] = true;
    }
  }

  return Object.keys(usedBufferIds);
}

function loadBuffers(gltf) {
  var promises = [];
  var loadedBuffers = getLoadedBuffers(gltf);
  var usedBufferIds = getUsedBufferIds();
  var usedBuffersLength = usedBufferIds.length;
  for (var i = 0; i < usedBuffersLength; ++i) {
    var bufferId = usedBufferIds[i];
    if (!defined(loadedBuffers[bufferId])) {
      var buffer = gltf.buffers[bufferId];
      var promise = cache
        .loadBuffer(buffer.uri)
        .then(function (typedArray) {
          loadedBuffers[i] = typedArray;
        })
        .otherwise(function (error) {
          throw new RuntimeError(
            getFailedLoadMessage(error, "buffer", buffer.uri)
          );
        });
      promises.push(promise);
    }
  }

  return when.all(promises).then(function () {
    return loadedBuffers;
  });
}

GltfLoader.load = function(gltf, model) {
  return loadBuffers(gltf).then(function(loadedBuffers) {
    return when.all([
      loadTextures(gltf),
      loadShaders(gltf)
    ]).then(function(loadedTextures, loadedShaders))
  });

};