import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";

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

GltfLoader.loadGltf = function(gltf) {
  return cache.loadGltf({
    uri: options.uri,
    basePath: options.basePath,
  }).then(function(gltf) {
    
  }

};