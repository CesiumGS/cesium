import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";

var cache = GltfLoaderCache();

function GltfLoader(options) {}

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

function getLoadedBuffers(gltf) {
  // Get loaded buffers from buffer.extras._pipeline.source
  var loadedBuffers;
  var buffers = gltf.buffers;
  if (defined(buffers)) {
    var buffersLength = buffers.length;
    loadedBuffers = new Array(buffersLength);
    for (var i = 0; i < buffersLength; ++i) {
      var buffer = buffers[i];
      loadedBuffers[i] = buffer.extras._pipeline.source;
    }
  }
  removePipelineExtras(gltf);
  return loadedBuffers;
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
          loadedBuffers[i] = typedArray; // TODO: need closure
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

function loadGltfFromCache(uri) {
  if (!cache.getGltf(uri)) {
  }

  // TODO: data uri

  // The cache either has a promise to a "finished" glTF or a finished gltf
  // A finished gltf is just the gltf JSON, not the buffers/textures/shaders
}

var defaultModelAccept =
  "model/gltf-binary,model/gltf+json;q=0.8,application/json;q=0.2,*/*;q=0.01";

/**
 * Loads a glTF model from a uri.
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.uri The uri to the glTF file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 *
 * @returns {Model} The newly created model.
 */
GltfLoader.fromUri = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.uri;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.uri", uri);
  //>>includeEnd('debug');

  // Create resource for the model file
  var modelResource = Resource.createIfNeeded(uri);

  // Setup basePath to get dependent files
  var basePath = defined(options.basePath)
    ? options.basePath
    : modelResource.clone();
  var resource = Resource.createIfNeeded(basePath);

  // If no cache key is provided, use a GUID.
  // Check using a URI to GUID dictionary that we have not already added this model.
  var cacheKey = defaultValue(
    options.cacheKey,
    uriToGuid[getAbsoluteUri(modelResource.url)]
  );
  if (!defined(cacheKey)) {
    cacheKey = createGuid();
    uriToGuid[getAbsoluteUri(modelResource.url)] = cacheKey;
  }

  if (defined(options.basePath) && !defined(options.cacheKey)) {
    cacheKey += resource.url;
  }
  options.cacheKey = cacheKey;
  options.basePath = resource;

  var model = new Model(options);

  var cachedGltf = gltfCache[cacheKey];
  if (!defined(cachedGltf)) {
    cachedGltf = new CachedGltf({
      ready: false,
    });
    cachedGltf.count = 1;
    cachedGltf.modelsToLoad.push(model);
    setCachedGltf(model, cachedGltf);
    gltfCache[cacheKey] = cachedGltf;

    // Add Accept header if we need it
    if (!defined(modelResource.headers.Accept)) {
      modelResource.headers.Accept = defaultModelAccept;
    }

    modelResource
      .fetchArrayBuffer()
      .then(function (arrayBuffer) {
        var array = new Uint8Array(arrayBuffer);
        if (containsGltfMagic(array)) {
          // Load binary glTF
          var parsedGltf = parseGlb(array);
          cachedGltf.makeReady(parsedGltf);
        } else {
          // Load text (JSON) glTF
          var json = getStringFromTypedArray(array);
          cachedGltf.makeReady(JSON.parse(json));
        }

        var resourceCredits = model._resourceCredits;
        var credits = modelResource.credits;
        if (defined(credits)) {
          var length = credits.length;
          for (var i = 0; i < length; i++) {
            resourceCredits.push(credits[i]);
          }
        }
      })
      .otherwise(
        ModelUtility.getFailedLoadFunction(model, "model", modelResource.url)
      );
  } else if (!cachedGltf.ready) {
    // Cache hit but the fetchArrayBuffer() or fetchText() request is still pending
    ++cachedGltf.count;
    cachedGltf.modelsToLoad.push(model);
  }
  // else if the cached glTF is defined and ready, the
  // model constructor will pick it up using the cache key.

  return model;
};
