import usesExtension from "./usesExtension.js";
import defined from "../../Core/defined.js";

/**
 * Contains traversal functions for processing elements of the glTF hierarchy.
 * @constructor
 *
 * @private
 */
function ForEach() {}

/**
 * Fallback for glTF 1.0
 * @private
 */
ForEach.objectLegacy = function (objects, handler) {
  if (defined(objects)) {
    for (const objectId in objects) {
      if (Object.prototype.hasOwnProperty.call(objects, objectId)) {
        const object = objects[objectId];
        const value = handler(object, objectId);

        if (defined(value)) {
          return value;
        }
      }
    }
  }
};

/**
 * @private
 */
ForEach.object = function (arrayOfObjects, handler) {
  if (defined(arrayOfObjects)) {
    const length = arrayOfObjects.length;
    for (let i = 0; i < length; i++) {
      const object = arrayOfObjects[i];
      const value = handler(object, i);

      if (defined(value)) {
        return value;
      }
    }
  }
};

/**
 * Supports glTF 1.0 and 2.0
 * @private
 */
ForEach.topLevel = function (gltf, name, handler) {
  const gltfProperty = gltf[name];
  if (defined(gltfProperty) && !Array.isArray(gltfProperty)) {
    return ForEach.objectLegacy(gltfProperty, handler);
  }

  return ForEach.object(gltfProperty, handler);
};

ForEach.accessor = function (gltf, handler) {
  return ForEach.topLevel(gltf, "accessors", handler);
};

ForEach.accessorWithSemantic = function (gltf, semantic, handler) {
  const visited = {};
  return ForEach.mesh(gltf, function (mesh) {
    return ForEach.meshPrimitive(mesh, function (primitive) {
      const valueForEach = ForEach.meshPrimitiveAttribute(
        primitive,
        function (accessorId, attributeSemantic) {
          if (
            attributeSemantic.indexOf(semantic) === 0 &&
            !defined(visited[accessorId])
          ) {
            visited[accessorId] = true;
            const value = handler(accessorId);

            if (defined(value)) {
              return value;
            }
          }
        },
      );

      if (defined(valueForEach)) {
        return valueForEach;
      }

      return ForEach.meshPrimitiveTarget(primitive, function (target) {
        return ForEach.meshPrimitiveTargetAttribute(
          target,
          function (accessorId, attributeSemantic) {
            if (
              attributeSemantic.indexOf(semantic) === 0 &&
              !defined(visited[accessorId])
            ) {
              visited[accessorId] = true;
              const value = handler(accessorId);

              if (defined(value)) {
                return value;
              }
            }
          },
        );
      });
    });
  });
};

ForEach.accessorContainingVertexAttributeData = function (gltf, handler) {
  const visited = {};
  return ForEach.mesh(gltf, function (mesh) {
    return ForEach.meshPrimitive(mesh, function (primitive) {
      const valueForEach = ForEach.meshPrimitiveAttribute(
        primitive,
        function (accessorId) {
          if (!defined(visited[accessorId])) {
            visited[accessorId] = true;
            const value = handler(accessorId);

            if (defined(value)) {
              return value;
            }
          }
        },
      );

      if (defined(valueForEach)) {
        return valueForEach;
      }

      return ForEach.meshPrimitiveTarget(primitive, function (target) {
        return ForEach.meshPrimitiveTargetAttribute(
          target,
          function (accessorId) {
            if (!defined(visited[accessorId])) {
              visited[accessorId] = true;
              const value = handler(accessorId);

              if (defined(value)) {
                return value;
              }
            }
          },
        );
      });
    });
  });
};

ForEach.accessorContainingIndexData = function (gltf, handler) {
  const visited = {};
  return ForEach.mesh(gltf, function (mesh) {
    return ForEach.meshPrimitive(mesh, function (primitive) {
      const indices = primitive.indices;
      if (defined(indices) && !defined(visited[indices])) {
        visited[indices] = true;
        const value = handler(indices);

        if (defined(value)) {
          return value;
        }
      }
    });
  });
};

ForEach.animation = function (gltf, handler) {
  return ForEach.topLevel(gltf, "animations", handler);
};

ForEach.animationChannel = function (animation, handler) {
  const channels = animation.channels;
  return ForEach.object(channels, handler);
};

ForEach.animationSampler = function (animation, handler) {
  const samplers = animation.samplers;
  return ForEach.object(samplers, handler);
};

ForEach.buffer = function (gltf, handler) {
  return ForEach.topLevel(gltf, "buffers", handler);
};

ForEach.bufferView = function (gltf, handler) {
  return ForEach.topLevel(gltf, "bufferViews", handler);
};

ForEach.camera = function (gltf, handler) {
  return ForEach.topLevel(gltf, "cameras", handler);
};

ForEach.image = function (gltf, handler) {
  return ForEach.topLevel(gltf, "images", handler);
};

ForEach.material = function (gltf, handler) {
  return ForEach.topLevel(gltf, "materials", handler);
};

ForEach.materialValue = function (material, handler) {
  let values = material.values;
  if (
    defined(material.extensions) &&
    defined(material.extensions.KHR_techniques_webgl)
  ) {
    values = material.extensions.KHR_techniques_webgl.values;
  }

  for (const name in values) {
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      const value = handler(values[name], name);

      if (defined(value)) {
        return value;
      }
    }
  }
};

ForEach.mesh = function (gltf, handler) {
  return ForEach.topLevel(gltf, "meshes", handler);
};

ForEach.meshPrimitive = function (mesh, handler) {
  const primitives = mesh.primitives;
  if (defined(primitives)) {
    const primitivesLength = primitives.length;
    for (let i = 0; i < primitivesLength; i++) {
      const primitive = primitives[i];
      const value = handler(primitive, i);

      if (defined(value)) {
        return value;
      }
    }
  }
};

ForEach.meshPrimitiveAttribute = function (primitive, handler) {
  const attributes = primitive.attributes;
  for (const semantic in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, semantic)) {
      const value = handler(attributes[semantic], semantic);

      if (defined(value)) {
        return value;
      }
    }
  }
};

ForEach.meshPrimitiveTarget = function (primitive, handler) {
  const targets = primitive.targets;
  if (defined(targets)) {
    const length = targets.length;
    for (let i = 0; i < length; ++i) {
      const value = handler(targets[i], i);

      if (defined(value)) {
        return value;
      }
    }
  }
};

ForEach.meshPrimitiveTargetAttribute = function (target, handler) {
  for (const semantic in target) {
    if (Object.prototype.hasOwnProperty.call(target, semantic)) {
      const accessorId = target[semantic];
      const value = handler(accessorId, semantic);

      if (defined(value)) {
        return value;
      }
    }
  }
};

ForEach.node = function (gltf, handler) {
  return ForEach.topLevel(gltf, "nodes", handler);
};

ForEach.nodeInTree = function (gltf, nodeIds, handler) {
  const nodes = gltf.nodes;
  if (defined(nodes)) {
    const length = nodeIds.length;
    for (let i = 0; i < length; i++) {
      const nodeId = nodeIds[i];
      const node = nodes[nodeId];
      if (defined(node)) {
        let value = handler(node, nodeId);

        if (defined(value)) {
          return value;
        }

        const children = node.children;
        if (defined(children)) {
          value = ForEach.nodeInTree(gltf, children, handler);

          if (defined(value)) {
            return value;
          }
        }
      }
    }
  }
};

ForEach.nodeInScene = function (gltf, scene, handler) {
  const sceneNodeIds = scene.nodes;
  if (defined(sceneNodeIds)) {
    return ForEach.nodeInTree(gltf, sceneNodeIds, handler);
  }
};

ForEach.program = function (gltf, handler) {
  if (usesExtension(gltf, "KHR_techniques_webgl")) {
    return ForEach.object(
      gltf.extensions.KHR_techniques_webgl.programs,
      handler,
    );
  }

  return ForEach.topLevel(gltf, "programs", handler);
};

ForEach.sampler = function (gltf, handler) {
  return ForEach.topLevel(gltf, "samplers", handler);
};

ForEach.scene = function (gltf, handler) {
  return ForEach.topLevel(gltf, "scenes", handler);
};

ForEach.shader = function (gltf, handler) {
  if (usesExtension(gltf, "KHR_techniques_webgl")) {
    return ForEach.object(
      gltf.extensions.KHR_techniques_webgl.shaders,
      handler,
    );
  }

  return ForEach.topLevel(gltf, "shaders", handler);
};

ForEach.skin = function (gltf, handler) {
  return ForEach.topLevel(gltf, "skins", handler);
};

ForEach.skinJoint = function (skin, handler) {
  const joints = skin.joints;
  if (defined(joints)) {
    const jointsLength = joints.length;
    for (let i = 0; i < jointsLength; i++) {
      const joint = joints[i];
      const value = handler(joint);

      if (defined(value)) {
        return value;
      }
    }
  }
};

ForEach.techniqueAttribute = function (technique, handler) {
  const attributes = technique.attributes;
  for (const attributeName in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, attributeName)) {
      const value = handler(attributes[attributeName], attributeName);

      if (defined(value)) {
        return value;
      }
    }
  }
};

ForEach.techniqueUniform = function (technique, handler) {
  const uniforms = technique.uniforms;
  for (const uniformName in uniforms) {
    if (Object.prototype.hasOwnProperty.call(uniforms, uniformName)) {
      const value = handler(uniforms[uniformName], uniformName);

      if (defined(value)) {
        return value;
      }
    }
  }
};

ForEach.techniqueParameter = function (technique, handler) {
  const parameters = technique.parameters;
  for (const parameterName in parameters) {
    if (Object.prototype.hasOwnProperty.call(parameters, parameterName)) {
      const value = handler(parameters[parameterName], parameterName);

      if (defined(value)) {
        return value;
      }
    }
  }
};

ForEach.technique = function (gltf, handler) {
  if (usesExtension(gltf, "KHR_techniques_webgl")) {
    return ForEach.object(
      gltf.extensions.KHR_techniques_webgl.techniques,
      handler,
    );
  }

  return ForEach.topLevel(gltf, "techniques", handler);
};

ForEach.texture = function (gltf, handler) {
  return ForEach.topLevel(gltf, "textures", handler);
};

export default ForEach;
