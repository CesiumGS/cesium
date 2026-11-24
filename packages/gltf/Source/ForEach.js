// @ts-check

import { defined } from "@cesium/core";

/** @import { ForEachElementHandler } from "./ForEachElementHandler.js"; */
/** @import { ForEachIdHandler } from "./ForEachIdHandler.js"; */
/** @import { ForEachNamedHandler } from "./ForEachNamedHandler.js"; */

/**
 * Contains traversal functions for processing elements of the glTF hierarchy.
 * @namespace ForEach
 *
 * @private
 */
const ForEach = {};

/**
 * Fallback for glTF 1.0
 *
 * @param {Object<string, object>|undefined} objects The id-keyed objects to iterate over.
 * @param {ForEachElementHandler} handler Called with each object and its id.
 * @returns {*} The first defined value returned by the handler.
 *
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
 * @param {object[]|undefined} arrayOfObjects The objects to iterate over.
 * @param {ForEachElementHandler} handler Called with each object and its index.
 * @returns {*} The first defined value returned by the handler.
 *
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
 *
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {string} name The name of the top-level glTF property.
 * @param {ForEachElementHandler} handler Called with each element and its index or id.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.topLevel = function (gltf, name, handler) {
  const gltfProperty = gltf[name];
  if (defined(gltfProperty) && !Array.isArray(gltfProperty)) {
    return ForEach.objectLegacy(gltfProperty, handler);
  }

  return ForEach.object(gltfProperty, handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each accessor.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.accessor = function (gltf, handler) {
  return ForEach.topLevel(gltf, "accessors", handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {string} semantic The attribute semantic prefix to match.
 * @param {ForEachIdHandler} handler Called once with each matching accessor id.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.accessorWithSemantic = function (gltf, semantic, handler) {
  /** @type {Object<number, boolean>} */
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

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachIdHandler} handler Called once with each accessor id used by a vertex attribute.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.accessorContainingVertexAttributeData = function (gltf, handler) {
  /** @type {Object<number, boolean>} */
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

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachIdHandler} handler Called once with each accessor id used for indices.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.accessorContainingIndexData = function (gltf, handler) {
  /** @type {Object<number, boolean>} */
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

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each animation.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.animation = function (gltf, handler) {
  return ForEach.topLevel(gltf, "animations", handler);
};

/**
 * @param {*} animation A glTF animation.
 * @param {ForEachElementHandler} handler Called with each channel.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.animationChannel = function (animation, handler) {
  const channels = animation.channels;
  return ForEach.object(channels, handler);
};

/**
 * @param {*} animation A glTF animation.
 * @param {ForEachElementHandler} handler Called with each sampler.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.animationSampler = function (animation, handler) {
  const samplers = animation.samplers;
  return ForEach.object(samplers, handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each buffer.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.buffer = function (gltf, handler) {
  return ForEach.topLevel(gltf, "buffers", handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each buffer view.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.bufferView = function (gltf, handler) {
  return ForEach.topLevel(gltf, "bufferViews", handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each camera.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.camera = function (gltf, handler) {
  return ForEach.topLevel(gltf, "cameras", handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each image.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.image = function (gltf, handler) {
  return ForEach.topLevel(gltf, "images", handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each material.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.material = function (gltf, handler) {
  return ForEach.topLevel(gltf, "materials", handler);
};

/**
 * @param {*} material A glTF material.
 * @param {ForEachNamedHandler} handler Called with each material value and its name.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.materialValue = function (material, handler) {
  const values = material.values;
  for (const name in values) {
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      const value = handler(values[name], name);

      if (defined(value)) {
        return value;
      }
    }
  }
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each mesh.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.mesh = function (gltf, handler) {
  return ForEach.topLevel(gltf, "meshes", handler);
};

/**
 * @param {*} mesh A glTF mesh.
 * @param {ForEachElementHandler} handler Called with each primitive.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
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

/**
 * @param {*} primitive A glTF mesh primitive.
 * @param {ForEachNamedHandler} handler Called with each attribute's accessor id and semantic.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
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

/**
 * @param {*} primitive A glTF mesh primitive.
 * @param {ForEachElementHandler} handler Called with each morph target.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
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

/**
 * @param {Object<string, number>} target A glTF morph target.
 * @param {ForEachNamedHandler} handler Called with each attribute's accessor id and semantic.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
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

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each node.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.node = function (gltf, handler) {
  return ForEach.topLevel(gltf, "nodes", handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each sampler.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.sampler = function (gltf, handler) {
  return ForEach.topLevel(gltf, "samplers", handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each scene.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.scene = function (gltf, handler) {
  return ForEach.topLevel(gltf, "scenes", handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each skin.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.skin = function (gltf, handler) {
  return ForEach.topLevel(gltf, "skins", handler);
};

/**
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each texture.
 * @returns {*} The first defined value returned by the handler.
 *
 * @private
 */
ForEach.texture = function (gltf, handler) {
  return ForEach.topLevel(gltf, "textures", handler);
};

export default ForEach;
