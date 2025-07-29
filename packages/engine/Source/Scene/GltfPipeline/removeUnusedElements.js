import ForEach from "./ForEach.js";
import forEachTextureInMaterial from "./forEachTextureInMaterial.js";
import usesExtension from "./usesExtension.js";
import defined from "../../Core/defined.js";

const allElementTypes = [
  "mesh",
  "node",
  "material",
  "accessor",
  "bufferView",
  "buffer",
  "texture",
  "sampler",
  "image",
];

/**
 * Removes unused elements from gltf.
 *
 * @param {object} gltf A javascript object containing a glTF asset.
 * @param {string[]} [elementTypes=['mesh', 'node', 'material', 'accessor', 'bufferView', 'buffer']] Element types to be removed. Needs to be a subset of ['mesh', 'node', 'material', 'accessor', 'bufferView', 'buffer'], other items will be ignored.
 *
 * @private
 */
function removeUnusedElements(gltf, elementTypes) {
  elementTypes = elementTypes ?? allElementTypes;
  allElementTypes.forEach(function (type) {
    if (elementTypes.indexOf(type) > -1) {
      removeUnusedElementsByType(gltf, type);
    }
  });
  return gltf;
}

const TypeToGltfElementName = {
  accessor: "accessors",
  buffer: "buffers",
  bufferView: "bufferViews",
  image: "images",
  node: "nodes",
  material: "materials",
  mesh: "meshes",
  sampler: "samplers",
  texture: "textures",
};

function removeUnusedElementsByType(gltf, type) {
  const name = TypeToGltfElementName[type];
  const arrayOfObjects = gltf[name];

  if (defined(arrayOfObjects)) {
    let removed = 0;
    const usedIds = getListOfElementsIdsInUse[type](gltf);
    const length = arrayOfObjects.length;

    for (let i = 0; i < length; ++i) {
      if (!usedIds[i]) {
        Remove[type](gltf, i - removed);
        removed++;
      }
    }
  }
}

/**
 * Contains functions for removing elements from a glTF hierarchy.
 * Since top-level glTF elements are arrays, when something is removed, referring
 * indices need to be updated.
 * @constructor
 *
 * @private
 */
function Remove() {}

Remove.accessor = function (gltf, accessorId) {
  const accessors = gltf.accessors;

  accessors.splice(accessorId, 1);

  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      // Update accessor ids for the primitives.
      ForEach.meshPrimitiveAttribute(
        primitive,
        function (attributeAccessorId, semantic) {
          if (attributeAccessorId > accessorId) {
            primitive.attributes[semantic]--;
          }
        },
      );

      // Update accessor ids for the targets.
      ForEach.meshPrimitiveTarget(primitive, function (target) {
        ForEach.meshPrimitiveTargetAttribute(
          target,
          function (attributeAccessorId, semantic) {
            if (attributeAccessorId > accessorId) {
              target[semantic]--;
            }
          },
        );
      });
      const indices = primitive.indices;
      if (defined(indices) && indices > accessorId) {
        primitive.indices--;
      }

      const ext = primitive.extensions;
      if (
        defined(ext) &&
        defined(ext.CESIUM_primitive_outline) &&
        ext.CESIUM_primitive_outline.indices > accessorId
      ) {
        --ext.CESIUM_primitive_outline.indices;
      }
    });
  });

  ForEach.skin(gltf, function (skin) {
    if (
      defined(skin.inverseBindMatrices) &&
      skin.inverseBindMatrices > accessorId
    ) {
      skin.inverseBindMatrices--;
    }
  });

  ForEach.animation(gltf, function (animation) {
    ForEach.animationSampler(animation, function (sampler) {
      if (defined(sampler.input) && sampler.input > accessorId) {
        sampler.input--;
      }
      if (defined(sampler.output) && sampler.output > accessorId) {
        sampler.output--;
      }
    });
  });
};

Remove.buffer = function (gltf, bufferId) {
  const buffers = gltf.buffers;

  buffers.splice(bufferId, 1);

  ForEach.bufferView(gltf, function (bufferView) {
    if (defined(bufferView.buffer) && bufferView.buffer > bufferId) {
      bufferView.buffer--;
    }

    if (
      defined(bufferView.extensions) &&
      defined(bufferView.extensions.EXT_meshopt_compression)
    ) {
      bufferView.extensions.EXT_meshopt_compression.buffer--;
    }
  });
};

Remove.bufferView = function (gltf, bufferViewId) {
  const bufferViews = gltf.bufferViews;

  bufferViews.splice(bufferViewId, 1);

  ForEach.accessor(gltf, function (accessor) {
    if (defined(accessor.bufferView) && accessor.bufferView > bufferViewId) {
      accessor.bufferView--;
    }
  });

  ForEach.shader(gltf, function (shader) {
    if (defined(shader.bufferView) && shader.bufferView > bufferViewId) {
      shader.bufferView--;
    }
  });

  ForEach.image(gltf, function (image) {
    if (defined(image.bufferView) && image.bufferView > bufferViewId) {
      image.bufferView--;
    }
  });

  if (usesExtension(gltf, "KHR_draco_mesh_compression")) {
    ForEach.mesh(gltf, function (mesh) {
      ForEach.meshPrimitive(mesh, function (primitive) {
        if (
          defined(primitive.extensions) &&
          defined(primitive.extensions.KHR_draco_mesh_compression)
        ) {
          if (
            primitive.extensions.KHR_draco_mesh_compression.bufferView >
            bufferViewId
          ) {
            primitive.extensions.KHR_draco_mesh_compression.bufferView--;
          }
        }
      });
    });
  }

  if (usesExtension(gltf, "EXT_feature_metadata")) {
    const extension = gltf.extensions.EXT_feature_metadata;
    const featureTables = extension.featureTables;
    for (const featureTableId in featureTables) {
      if (featureTables.hasOwnProperty(featureTableId)) {
        const featureTable = featureTables[featureTableId];
        const properties = featureTable.properties;
        if (defined(properties)) {
          for (const propertyId in properties) {
            if (properties.hasOwnProperty(propertyId)) {
              const property = properties[propertyId];
              if (
                defined(property.bufferView) &&
                property.bufferView > bufferViewId
              ) {
                property.bufferView--;
              }
              if (
                defined(property.arrayOffsetBufferView) &&
                property.arrayOffsetBufferView > bufferViewId
              ) {
                property.arrayOffsetBufferView--;
              }
              if (
                defined(property.stringOffsetBufferView) &&
                property.stringOffsetBufferView > bufferViewId
              ) {
                property.stringOffsetBufferView--;
              }
            }
          }
        }
      }
    }
  }

  if (usesExtension(gltf, "EXT_structural_metadata")) {
    const extension = gltf.extensions.EXT_structural_metadata;
    const propertyTables = extension.propertyTables;
    if (defined(propertyTables)) {
      const propertyTablesLength = propertyTables.length;
      for (let i = 0; i < propertyTablesLength; ++i) {
        const propertyTable = propertyTables[i];
        const properties = propertyTable.properties;
        for (const propertyId in properties) {
          if (properties.hasOwnProperty(propertyId)) {
            const property = properties[propertyId];
            if (defined(property.values) && property.values > bufferViewId) {
              property.values--;
            }
            if (
              defined(property.arrayOffsets) &&
              property.arrayOffsets > bufferViewId
            ) {
              property.arrayOffsets--;
            }
            if (
              defined(property.stringOffsets) &&
              property.stringOffsets > bufferViewId
            ) {
              property.stringOffsets--;
            }
          }
        }
      }
    }
  }
};

Remove.image = function (gltf, imageId) {
  const images = gltf.images;
  images.splice(imageId, 1);

  ForEach.texture(gltf, function (texture) {
    if (defined(texture.source)) {
      if (texture.source > imageId) {
        --texture.source;
      }
    }
    const ext = texture.extensions;
    if (
      defined(ext) &&
      defined(ext.EXT_texture_webp) &&
      ext.EXT_texture_webp.source > imageId
    ) {
      --texture.extensions.EXT_texture_webp.source;
    } else if (
      defined(ext) &&
      defined(ext.KHR_texture_basisu) &&
      ext.KHR_texture_basisu.source > imageId
    ) {
      --texture.extensions.KHR_texture_basisu.source;
    }
  });
};

Remove.mesh = function (gltf, meshId) {
  const meshes = gltf.meshes;
  meshes.splice(meshId, 1);

  ForEach.node(gltf, function (node) {
    if (defined(node.mesh)) {
      if (node.mesh > meshId) {
        node.mesh--;
      } else if (node.mesh === meshId) {
        // Remove reference to deleted mesh
        delete node.mesh;
      }
    }
  });
};

Remove.node = function (gltf, nodeId) {
  const nodes = gltf.nodes;
  nodes.splice(nodeId, 1);

  // Shift all node references
  ForEach.skin(gltf, function (skin) {
    if (defined(skin.skeleton) && skin.skeleton > nodeId) {
      skin.skeleton--;
    }

    skin.joints = skin.joints.map(function (x) {
      return x > nodeId ? x - 1 : x;
    });
  });
  ForEach.animation(gltf, function (animation) {
    ForEach.animationChannel(animation, function (channel) {
      if (
        defined(channel.target) &&
        defined(channel.target.node) &&
        channel.target.node > nodeId
      ) {
        channel.target.node--;
      }
    });
  });
  ForEach.technique(gltf, function (technique) {
    ForEach.techniqueUniform(technique, function (uniform) {
      if (defined(uniform.node) && uniform.node > nodeId) {
        uniform.node--;
      }
    });
  });
  ForEach.node(gltf, function (node) {
    if (!defined(node.children)) {
      return;
    }

    node.children = node.children
      .filter(function (x) {
        return x !== nodeId; // Remove
      })
      .map(function (x) {
        return x > nodeId ? x - 1 : x; // Shift indices
      });
  });
  ForEach.scene(gltf, function (scene) {
    scene.nodes = scene.nodes
      .filter(function (x) {
        return x !== nodeId; // Remove
      })
      .map(function (x) {
        return x > nodeId ? x - 1 : x; // Shift indices
      });
  });
};

Remove.material = function (gltf, materialId) {
  const materials = gltf.materials;
  materials.splice(materialId, 1);

  // Shift other material ids
  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      if (defined(primitive.material) && primitive.material > materialId) {
        primitive.material--;
      }
    });
  });
};

Remove.sampler = function (gltf, samplerId) {
  const samplers = gltf.samplers;
  samplers.splice(samplerId, 1);

  ForEach.texture(gltf, function (texture) {
    if (defined(texture.sampler)) {
      if (texture.sampler > samplerId) {
        --texture.sampler;
      }
    }
  });
};

Remove.texture = function (gltf, textureId) {
  const textures = gltf.textures;
  textures.splice(textureId, 1);

  ForEach.material(gltf, function (material) {
    forEachTextureInMaterial(material, function (textureIndex, textureInfo) {
      if (textureInfo.index > textureId) {
        --textureInfo.index;
      }
    });
  });

  if (usesExtension(gltf, "EXT_feature_metadata")) {
    ForEach.mesh(gltf, function (mesh) {
      ForEach.meshPrimitive(mesh, function (primitive) {
        const extensions = primitive.extensions;
        if (defined(extensions) && defined(extensions.EXT_feature_metadata)) {
          const extension = extensions.EXT_feature_metadata;
          const featureIdTextures = extension.featureIdTextures;
          if (defined(featureIdTextures)) {
            const featureIdTexturesLength = featureIdTextures.length;
            for (let i = 0; i < featureIdTexturesLength; ++i) {
              const featureIdTexture = featureIdTextures[i];
              const textureInfo = featureIdTexture.featureIds.texture;
              if (textureInfo.index > textureId) {
                --textureInfo.index;
              }
            }
          }
        }
      });
    });

    const extension = gltf.extensions.EXT_feature_metadata;
    const featureTextures = extension.featureTextures;
    for (const featureTextureId in featureTextures) {
      if (featureTextures.hasOwnProperty(featureTextureId)) {
        const featureTexture = featureTextures[featureTextureId];
        const properties = featureTexture.properties;
        if (defined(properties)) {
          for (const propertyId in properties) {
            if (properties.hasOwnProperty(propertyId)) {
              const property = properties[propertyId];
              const textureInfo = property.texture;
              if (textureInfo.index > textureId) {
                --textureInfo.index;
              }
            }
          }
        }
      }
    }
  }

  if (usesExtension(gltf, "EXT_mesh_features")) {
    ForEach.mesh(gltf, function (mesh) {
      ForEach.meshPrimitive(mesh, function (primitive) {
        const extensions = primitive.extensions;
        if (defined(extensions) && defined(extensions.EXT_mesh_features)) {
          const extension = extensions.EXT_mesh_features;
          const featureIds = extension.featureIds;
          if (defined(featureIds)) {
            const featureIdsLength = featureIds.length;
            for (let i = 0; i < featureIdsLength; ++i) {
              const featureId = featureIds[i];
              if (defined(featureId.texture)) {
                if (featureId.texture.index > textureId) {
                  --featureId.texture.index;
                }
              }
            }
          }
        }
      });
    });
  }

  if (usesExtension(gltf, "EXT_structural_metadata")) {
    const extension = gltf.extensions.EXT_structural_metadata;
    const propertyTextures = extension.propertyTextures;
    if (defined(propertyTextures)) {
      const propertyTexturesLength = propertyTextures.length;
      for (let i = 0; i < propertyTexturesLength; ++i) {
        const propertyTexture = propertyTextures[i];
        const properties = propertyTexture.properties;
        for (const propertyId in properties) {
          if (properties.hasOwnProperty(propertyId)) {
            const property = properties[propertyId];
            if (property.index > textureId) {
              --property.index;
            }
          }
        }
      }
    }
  }
};

/**
 * Contains functions for getting a list of element ids in use by the glTF asset.
 * @constructor
 *
 * @private
 */
function getListOfElementsIdsInUse() {}

getListOfElementsIdsInUse.accessor = function (gltf) {
  // Calculate accessor's that are currently in use.
  const usedAccessorIds = {};

  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      ForEach.meshPrimitiveAttribute(primitive, function (accessorId) {
        usedAccessorIds[accessorId] = true;
      });
      ForEach.meshPrimitiveTarget(primitive, function (target) {
        ForEach.meshPrimitiveTargetAttribute(target, function (accessorId) {
          usedAccessorIds[accessorId] = true;
        });
      });
      const indices = primitive.indices;
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

  if (usesExtension(gltf, "EXT_mesh_gpu_instancing")) {
    ForEach.node(gltf, function (node) {
      if (
        defined(node.extensions) &&
        defined(node.extensions.EXT_mesh_gpu_instancing)
      ) {
        Object.keys(node.extensions.EXT_mesh_gpu_instancing.attributes).forEach(
          function (key) {
            const attributeAccessorId =
              node.extensions.EXT_mesh_gpu_instancing.attributes[key];
            usedAccessorIds[attributeAccessorId] = true;
          },
        );
      }
    });
  }

  if (usesExtension(gltf, "CESIUM_primitive_outline")) {
    ForEach.mesh(gltf, function (mesh) {
      ForEach.meshPrimitive(mesh, function (primitive) {
        const extensions = primitive.extensions;
        if (
          defined(extensions) &&
          defined(extensions.CESIUM_primitive_outline)
        ) {
          const extension = extensions.CESIUM_primitive_outline;
          const indicesAccessorId = extension.indices;
          if (defined(indicesAccessorId)) {
            usedAccessorIds[indicesAccessorId] = true;
          }
        }
      });
    });
  }

  return usedAccessorIds;
};

getListOfElementsIdsInUse.buffer = function (gltf) {
  // Calculate buffer's that are currently in use.
  const usedBufferIds = {};

  ForEach.bufferView(gltf, function (bufferView) {
    if (defined(bufferView.buffer)) {
      usedBufferIds[bufferView.buffer] = true;
    }
    if (
      defined(bufferView.extensions) &&
      defined(bufferView.extensions.EXT_meshopt_compression)
    ) {
      usedBufferIds[bufferView.extensions.EXT_meshopt_compression.buffer] =
        true;
    }
  });

  return usedBufferIds;
};

getListOfElementsIdsInUse.bufferView = function (gltf) {
  // Calculate bufferView's that are currently in use.
  const usedBufferViewIds = {};

  ForEach.accessor(gltf, function (accessor) {
    if (defined(accessor.bufferView)) {
      usedBufferViewIds[accessor.bufferView] = true;
    }
  });

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

  if (usesExtension(gltf, "KHR_draco_mesh_compression")) {
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

  if (usesExtension(gltf, "EXT_feature_metadata")) {
    const extension = gltf.extensions.EXT_feature_metadata;
    const featureTables = extension.featureTables;
    for (const featureTableId in featureTables) {
      if (featureTables.hasOwnProperty(featureTableId)) {
        const featureTable = featureTables[featureTableId];
        const properties = featureTable.properties;
        if (defined(properties)) {
          for (const propertyId in properties) {
            if (properties.hasOwnProperty(propertyId)) {
              const property = properties[propertyId];
              if (defined(property.bufferView)) {
                usedBufferViewIds[property.bufferView] = true;
              }
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

  if (usesExtension(gltf, "EXT_structural_metadata")) {
    const extension = gltf.extensions.EXT_structural_metadata;
    const propertyTables = extension.propertyTables;
    if (defined(propertyTables)) {
      const propertyTablesLength = propertyTables.length;
      for (let i = 0; i < propertyTablesLength; ++i) {
        const propertyTable = propertyTables[i];
        const properties = propertyTable.properties;
        for (const propertyId in properties) {
          if (properties.hasOwnProperty(propertyId)) {
            const property = properties[propertyId];
            if (defined(property.values)) {
              usedBufferViewIds[property.values] = true;
            }
            if (defined(property.arrayOffsets)) {
              usedBufferViewIds[property.arrayOffsets] = true;
            }
            if (defined(property.stringOffsets)) {
              usedBufferViewIds[property.stringOffsets] = true;
            }
          }
        }
      }
    }
  }

  return usedBufferViewIds;
};

getListOfElementsIdsInUse.image = function (gltf) {
  const usedImageIds = {};

  ForEach.texture(gltf, function (texture) {
    if (defined(texture.source)) {
      usedImageIds[texture.source] = true;
    }

    if (
      defined(texture.extensions) &&
      defined(texture.extensions.EXT_texture_webp)
    ) {
      usedImageIds[texture.extensions.EXT_texture_webp.source] = true;
    } else if (
      defined(texture.extensions) &&
      defined(texture.extensions.KHR_texture_basisu)
    ) {
      usedImageIds[texture.extensions.KHR_texture_basisu.source] = true;
    }
  });
  return usedImageIds;
};

getListOfElementsIdsInUse.mesh = function (gltf) {
  const usedMeshIds = {};
  ForEach.node(gltf, function (node) {
    if (defined(node.mesh && defined(gltf.meshes))) {
      const mesh = gltf.meshes[node.mesh];
      if (
        defined(mesh) &&
        defined(mesh.primitives) &&
        mesh.primitives.length > 0
      ) {
        usedMeshIds[node.mesh] = true;
      }
    }
  });

  return usedMeshIds;
};

// Check if node is empty. It is considered empty if neither referencing
// mesh, camera, extensions and has no children
function nodeIsEmpty(gltf, nodeId, usedNodeIds) {
  const node = gltf.nodes[nodeId];
  if (
    defined(node.mesh) ||
    defined(node.camera) ||
    defined(node.skin) ||
    defined(node.weights) ||
    defined(node.extras) ||
    (defined(node.extensions) && Object.keys(node.extensions).length !== 0) ||
    defined(usedNodeIds[nodeId])
  ) {
    return false;
  }

  // Empty if no children or children are all empty nodes
  return (
    !defined(node.children) ||
    node.children.filter(function (n) {
      return !nodeIsEmpty(gltf, n, usedNodeIds);
    }).length === 0
  );
}

getListOfElementsIdsInUse.node = function (gltf) {
  const usedNodeIds = {};
  ForEach.skin(gltf, function (skin) {
    if (defined(skin.skeleton)) {
      usedNodeIds[skin.skeleton] = true;
    }

    ForEach.skinJoint(skin, function (joint) {
      usedNodeIds[joint] = true;
    });
  });
  ForEach.animation(gltf, function (animation) {
    ForEach.animationChannel(animation, function (channel) {
      if (defined(channel.target) && defined(channel.target.node)) {
        usedNodeIds[channel.target.node] = true;
      }
    });
  });
  ForEach.technique(gltf, function (technique) {
    ForEach.techniqueUniform(technique, function (uniform) {
      if (defined(uniform.node)) {
        usedNodeIds[uniform.node] = true;
      }
    });
  });
  ForEach.node(gltf, function (node, nodeId) {
    if (!nodeIsEmpty(gltf, nodeId, usedNodeIds)) {
      usedNodeIds[nodeId] = true;
    }
  });

  return usedNodeIds;
};

getListOfElementsIdsInUse.material = function (gltf) {
  const usedMaterialIds = {};

  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      if (defined(primitive.material)) {
        usedMaterialIds[primitive.material] = true;
      }
    });
  });

  return usedMaterialIds;
};

getListOfElementsIdsInUse.texture = function (gltf) {
  const usedTextureIds = {};

  ForEach.material(gltf, function (material) {
    forEachTextureInMaterial(material, function (textureId) {
      usedTextureIds[textureId] = true;
    });
  });

  if (usesExtension(gltf, "EXT_feature_metadata")) {
    ForEach.mesh(gltf, function (mesh) {
      ForEach.meshPrimitive(mesh, function (primitive) {
        const extensions = primitive.extensions;
        if (defined(extensions) && defined(extensions.EXT_feature_metadata)) {
          const extension = extensions.EXT_feature_metadata;
          const featureIdTextures = extension.featureIdTextures;
          if (defined(featureIdTextures)) {
            const featureIdTexturesLength = featureIdTextures.length;
            for (let i = 0; i < featureIdTexturesLength; ++i) {
              const featureIdTexture = featureIdTextures[i];
              const textureInfo = featureIdTexture.featureIds.texture;
              usedTextureIds[textureInfo.index] = true;
            }
          }
        }
      });
    });

    const extension = gltf.extensions.EXT_feature_metadata;
    const featureTextures = extension.featureTextures;
    for (const featureTextureId in featureTextures) {
      if (featureTextures.hasOwnProperty(featureTextureId)) {
        const featureTexture = featureTextures[featureTextureId];
        const properties = featureTexture.properties;
        if (defined(properties)) {
          for (const propertyId in properties) {
            if (properties.hasOwnProperty(propertyId)) {
              const property = properties[propertyId];
              const textureInfo = property.texture;
              usedTextureIds[textureInfo.index] = true;
            }
          }
        }
      }
    }
  }

  if (usesExtension(gltf, "EXT_mesh_features")) {
    ForEach.mesh(gltf, function (mesh) {
      ForEach.meshPrimitive(mesh, function (primitive) {
        const extensions = primitive.extensions;
        if (defined(extensions) && defined(extensions.EXT_mesh_features)) {
          const extension = extensions.EXT_mesh_features;
          const featureIds = extension.featureIds;
          if (defined(featureIds)) {
            const featureIdsLength = featureIds.length;
            for (let i = 0; i < featureIdsLength; ++i) {
              const featureId = featureIds[i];
              if (defined(featureId.texture)) {
                usedTextureIds[featureId.texture.index] = true;
              }
            }
          }
        }
      });
    });
  }

  if (usesExtension(gltf, "EXT_structural_metadata")) {
    const extension = gltf.extensions.EXT_structural_metadata;
    const propertyTextures = extension.propertyTextures;
    if (defined(propertyTextures)) {
      const propertyTexturesLength = propertyTextures.length;
      for (let i = 0; i < propertyTexturesLength; ++i) {
        const propertyTexture = propertyTextures[i];
        const properties = propertyTexture.properties;
        for (const propertyId in properties) {
          if (properties.hasOwnProperty(propertyId)) {
            const property = properties[propertyId];
            usedTextureIds[property.index] = true;
          }
        }
      }
    }
  }

  return usedTextureIds;
};

getListOfElementsIdsInUse.sampler = function (gltf) {
  const usedSamplerIds = {};

  ForEach.texture(gltf, function (texture) {
    if (defined(texture.sampler)) {
      usedSamplerIds[texture.sampler] = true;
    }
  });

  return usedSamplerIds;
};

export default removeUnusedElements;
