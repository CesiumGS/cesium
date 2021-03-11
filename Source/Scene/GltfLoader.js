import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import RuntimeError from "../Core/RuntimeError.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import when from "../ThirdParty/when.js";

var cache = new GltfCache();

var GltfLoaderState = {
  UNLOADED: 0,
  LOADING_GLTF: 1,
  PARSING_GLTF: 2,
  LOADING_RESOURCES: 3,
  READY: 4,
  FAILED: 5,
};

/**
 * Loads a glTF model.
 * 
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.uri The uri to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
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
  var resource = Resource.createIfNeeded(uri);

  // Add Accept header if we need it
  if (!defined(resource.headers.Accept)) {
    resource.headers.Accept = defaultAccept;
  }

  // Set up baseResource to get dependent files
  var baseResource = defined(basePath)
    ? Resource.createIfNeeded(basePath)
    : resource.clone();

  var gltfCacheKey = getAbsoluteUri(resource.url);
  








  this._uri = options.uri;
  this._basePath = options.basePath;
  this._keepResident = defaultValue(options.keepResident, true);
  this._gltf = undefined;
  this._gltfCacheKey = undefined;
  this._error = undefined;
  this._state = GltfLoaderState.NEEDS_LOAD;

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
   * The error message when the glTF failed to load.
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

function handleModelDestroyed(loader, model) {
  if (model.isDestroyed()) {
    cache.release(loader._gltfCacheKey);
    loader._state = GltfLoaderState.FAILED;
    return true;
  }
  return false;
}

function loadGltf(loader, model) {
  var that = this;

  cache
  .loadGltf(this._uri, this._basePath, this._keepResident)
  .then(function (cacheKey) {
    if (handleModelDestroyed(that, model)) {
      return;
    }
    that._gltf = cache.getContents(cacheKey);
    that._gltfCacheKey = cacheKey;
    that._state = GltfLoaderState.PARSING_GLTF;
  }).otherwise(function (error) {
    that._state = GltfLoaderState.FAILED;
    that._error = error;
  });
}

function parseGltf(loader, model, frameState) {
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

// function parseGltf(loader, model, frameState) {





//   // var gltf = model._gltf;
//   // forEachVertexBuffer()
  
//   // ForEach.buffer(gltf, function(buffer, bufferId) {
//   //   // Look for vertex buffer promises...
//   //   // Data needs to be available and is async
//   //   // Main thread needs to move along job scheduler



//   //   // if (defined(cache.getContents

//   //   // Try to load from the GPU cache. Check if a promise already exist.
//   // });

//   // context.cache.modelRendererResourceCache = defaultValue(
//   //   context.cache.modelRendererResourceCache,
//   //   {}
//   // );
//   // var modelCaches = context.cache.modelRendererResourceCache;


//   // return loadBuffers(gltf).then(function(loadedBuffers) {
//   //   return when.all([
//   //     loadTextures(gltf),
//   //     loadShaders(gltf)
//   //   ]).then(function(loadedTextures, loadedShaders))
//   // });


// }


function getVertexBufferCacheKey() {
  // For embedded buffers: absolute uri of gltf resource + 
  // For external buffer: absolute uri of base resource + external file +

  // For quantized/uncompressed data (interleaved or not): + buffer view ID
  // For Draco: + Draco buffer view ID + unique identifier
}

GltfLoader.prototype.update = function(model, frameState) {
  if (!FeatureDetection.supportsWebP.initialized) {
    FeatureDetection.supportsWebP.initialize();
    return;
  }
  var supportsWebP = FeatureDetection.supportsWebP();

  if (this._state === ModelState.UNLOADED) {
    loadGltf(this, model);
    this._state = ModelState.LOADING_GLTF;
  }

  if (this._state === ModelState.PARSING_GLTF) {
    parseGltf(this, model, frameState);
    this._state = ModelState.LOADING_RESOURCES;
  }

  if (this._state === ModelState.LOADING_RESOURCES) {
    
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