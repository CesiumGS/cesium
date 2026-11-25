import { WebGLConstants, defined } from "@cesium/core";
import addToArray from "./addToArray.js";
import ForEach from "./ForEach.js";
import getAccessorByteStride from "./getAccessorByteStride.js";

/**
 * Adds default glTF values if they don't exist.
 *
 * @param {object} gltf A javascript object containing a glTF asset.
 * @returns {object} The modified glTF.
 *
 * @internal
 */
function addDefaults(gltf) {
  ForEach.accessor(gltf, function (accessor) {
    if (defined(accessor.bufferView)) {
      accessor.byteOffset = accessor.byteOffset ?? 0;
    }
  });

  ForEach.bufferView(gltf, function (bufferView) {
    if (defined(bufferView.buffer)) {
      bufferView.byteOffset = bufferView.byteOffset ?? 0;
    }
  });

  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      primitive.mode = primitive.mode ?? WebGLConstants.TRIANGLES;
      if (!defined(primitive.material)) {
        if (!defined(gltf.materials)) {
          gltf.materials = [];
        }
        const defaultMaterial = {
          name: "default",
        };
        primitive.material = addToArray(gltf.materials, defaultMaterial);
      }
    });
  });

  ForEach.accessorContainingVertexAttributeData(gltf, function (accessorId) {
    const accessor = gltf.accessors[accessorId];
    const bufferViewId = accessor.bufferView;
    accessor.normalized = accessor.normalized ?? false;
    if (defined(bufferViewId)) {
      const bufferView = gltf.bufferViews[bufferViewId];
      bufferView.byteStride = getAccessorByteStride(gltf, accessor);
      bufferView.target = WebGLConstants.ARRAY_BUFFER;
    }
  });

  ForEach.accessorContainingIndexData(gltf, function (accessorId) {
    const accessor = gltf.accessors[accessorId];
    const bufferViewId = accessor.bufferView;
    if (defined(bufferViewId)) {
      const bufferView = gltf.bufferViews[bufferViewId];
      bufferView.target = WebGLConstants.ELEMENT_ARRAY_BUFFER;
    }
  });

  ForEach.material(gltf, function (material) {
    const extensions = material.extensions ?? {};
    material.emissiveFactor = material.emissiveFactor ?? [0.0, 0.0, 0.0];
    material.alphaMode = material.alphaMode ?? "OPAQUE";
    material.doubleSided = material.doubleSided ?? false;

    if (material.alphaMode === "MASK") {
      material.alphaCutoff = material.alphaCutoff ?? 0.5;
    }

    addTextureDefaults(material.emissiveTexture);
    addTextureDefaults(material.normalTexture);
    addTextureDefaults(material.occlusionTexture);

    const pbrMetallicRoughness = material.pbrMetallicRoughness;
    if (defined(pbrMetallicRoughness)) {
      pbrMetallicRoughness.baseColorFactor =
        pbrMetallicRoughness.baseColorFactor ?? [1.0, 1.0, 1.0, 1.0];
      pbrMetallicRoughness.metallicFactor =
        pbrMetallicRoughness.metallicFactor ?? 1.0;
      pbrMetallicRoughness.roughnessFactor =
        pbrMetallicRoughness.roughnessFactor ?? 1.0;
      addTextureDefaults(pbrMetallicRoughness.baseColorTexture);
      addTextureDefaults(pbrMetallicRoughness.metallicRoughnessTexture);
    }

    const pbrSpecularGlossiness =
      extensions.KHR_materials_pbrSpecularGlossiness;
    if (defined(pbrSpecularGlossiness)) {
      pbrSpecularGlossiness.diffuseFactor =
        pbrSpecularGlossiness.diffuseFactor ?? [1.0, 1.0, 1.0, 1.0];
      pbrSpecularGlossiness.specularFactor =
        pbrSpecularGlossiness.specularFactor ?? [1.0, 1.0, 1.0];
      pbrSpecularGlossiness.glossinessFactor =
        pbrSpecularGlossiness.glossinessFactor ?? 1.0;
      addTextureDefaults(pbrSpecularGlossiness.specularGlossinessTexture);
    }
  });

  ForEach.animation(gltf, function (animation) {
    ForEach.animationSampler(animation, function (sampler) {
      sampler.interpolation = sampler.interpolation ?? "LINEAR";
    });
  });

  const animatedNodes = getAnimatedNodes(gltf);
  ForEach.node(gltf, function (node, id) {
    const animated = defined(animatedNodes[id]);
    if (
      animated ||
      defined(node.translation) ||
      defined(node.rotation) ||
      defined(node.scale)
    ) {
      node.translation = node.translation ?? [0.0, 0.0, 0.0];
      node.rotation = node.rotation ?? [0.0, 0.0, 0.0, 1.0];
      node.scale = node.scale ?? [1.0, 1.0, 1.0];
    } else {
      node.matrix = node.matrix ?? [
        1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0,
        0.0, 1.0,
      ];
    }
  });

  ForEach.sampler(gltf, function (sampler) {
    sampler.wrapS = sampler.wrapS ?? WebGLConstants.REPEAT;
    sampler.wrapT = sampler.wrapT ?? WebGLConstants.REPEAT;
  });

  if (defined(gltf.scenes) && !defined(gltf.scene)) {
    gltf.scene = 0;
  }

  return gltf;
}

function getAnimatedNodes(gltf) {
  const nodes = {};
  ForEach.animation(gltf, function (animation) {
    ForEach.animationChannel(animation, function (channel) {
      const target = channel.target;
      const nodeId = target.node;
      const path = target.path;
      // Ignore animations that target 'weights'
      if (path === "translation" || path === "rotation" || path === "scale") {
        nodes[nodeId] = true;
      }
    });
  });
  return nodes;
}

function addTextureDefaults(texture) {
  if (defined(texture)) {
    texture.texCoord = texture.texCoord ?? 0;
  }
}

export default addDefaults;
