"use strict";
const Cesium = require("cesium");
const { addDefaults } = require("@gltf-pipeline/core");

const WebGLConstants = Cesium.WebGLConstants;

describe("addDefaults", () => {
  it("adds mesh, accessor, and bufferView defaults", () => {
    const gltf = {
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
              },
              indices: 2,
              targets: [
                {
                  POSITION: 1,
                },
              ],
            },
          ],
        },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: WebGLConstants.FLOAT,
          count: 24,
          type: "VEC3",
          min: [-1.0, -1.0, -1.0],
          max: [1.0, 1.0, 1.0],
        },
        {
          bufferView: 1,
          componentType: WebGLConstants.FLOAT,
          count: 24,
          type: "VEC3",
          min: [-1.0, -1.0, -1.0],
          max: [1.0, 1.0, 1.0],
        },
        {
          bufferView: 2,
          componentType: WebGLConstants.UNSIGNED_SHORT,
          count: 36,
          type: "SCALAR",
          min: [0],
          max: [24],
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteLength: 288,
        },
        {
          buffer: 0,
          byteLength: 288,
          byteOffset: 288,
        },
        {
          buffer: 0,
          byteLength: 72,
          byteOffset: 576,
        },
        {
          buffer: 0,
          byteLength: 10,
          byteOffset: 648,
        },
      ],
    };

    const gltfWithDefaults = addDefaults(gltf);
    const primitive = gltfWithDefaults.meshes[0].primitives[0];
    const material = gltfWithDefaults.materials[0];
    const positionAccessor = gltfWithDefaults.accessors[0];
    const positionTargetAccessor = gltfWithDefaults.accessors[1];
    const indicesAccessor = gltfWithDefaults.accessors[2];
    const positionBufferView = gltfWithDefaults.bufferViews[0];
    const positionTargetBufferView = gltfWithDefaults.bufferViews[1];
    const indicesBufferView = gltfWithDefaults.bufferViews[2];
    const otherBufferView = gltfWithDefaults.bufferViews[3];

    expect(primitive.mode).toBe(WebGLConstants.TRIANGLES);
    expect(primitive.material).toBe(0);

    expect(material.emissiveFactor).toEqual([0.0, 0.0, 0.0]);
    expect(material.alphaMode).toBe("OPAQUE");
    expect(material.doubleSided).toBe(false);
    expect(material.name).toBe("default");

    expect(positionAccessor.byteOffset).toBe(0);
    expect(positionAccessor.normalized).toBe(false);
    expect(positionBufferView.byteOffset).toBe(0);
    expect(positionBufferView.byteStride).toBe(12);
    expect(positionBufferView.target).toBe(WebGLConstants.ARRAY_BUFFER);

    expect(positionTargetAccessor.byteOffset).toBe(0);
    expect(positionTargetAccessor.normalized).toBe(false);
    expect(positionTargetBufferView.byteStride).toBe(12);

    expect(indicesAccessor.byteOffset).toBe(0);
    expect(indicesAccessor.normalized).toBeUndefined();
    expect(indicesBufferView.byteStride).toBeUndefined();
    expect(indicesBufferView.target).toBe(WebGLConstants.ELEMENT_ARRAY_BUFFER);

    expect(otherBufferView.target).toBeUndefined();
  });

  it("adds material defaults", () => {
    const gltf = {
      materials: [
        {
          emissiveTexture: {
            index: 0,
          },
          normalTexture: {
            index: 1,
          },
          occlusionTexture: {
            index: 2,
          },
        },
        {
          alphaMode: "MASK",
        },
        {
          extensions: {
            KHR_techniques_webgl: {
              values: {
                u_custom: {
                  index: 3,
                },
              },
            },
          },
        },
      ],
    };

    const gltfWithDefaults = addDefaults(gltf);
    const materialOpaque = gltfWithDefaults.materials[0];
    const materialAlphaMask = gltfWithDefaults.materials[1];
    const materialTechnique =
      gltfWithDefaults.materials[2].extensions.KHR_techniques_webgl;

    expect(materialOpaque.emissiveFactor).toEqual([0.0, 0.0, 0.0]);
    expect(materialOpaque.alphaMode).toBe("OPAQUE");
    expect(materialOpaque.doubleSided).toBe(false);

    expect(materialOpaque.emissiveTexture.texCoord).toBe(0);
    expect(materialOpaque.normalTexture.texCoord).toBe(0);
    expect(materialOpaque.occlusionTexture.texCoord).toBe(0);

    expect(materialAlphaMask.alphaCutoff).toBe(0.5);

    expect(materialTechnique.values.u_custom.texCoord).toBe(0);
  });

  it("adds metallic roughness defaults", () => {
    const gltf = {
      materials: [
        {
          pbrMetallicRoughness: {
            baseColorTexture: {
              index: 0,
            },
            metallicRoughnessTexture: {
              index: 1,
            },
          },
        },
      ],
    };
    const gltfWithDefaults = addDefaults(gltf);
    const pbrMetallicRoughness =
      gltfWithDefaults.materials[0].pbrMetallicRoughness;

    expect(pbrMetallicRoughness.baseColorFactor).toEqual([1.0, 1.0, 1.0, 1.0]);
    expect(pbrMetallicRoughness.metallicFactor).toBe(1.0);
    expect(pbrMetallicRoughness.roughnessFactor).toBe(1.0);
    expect(pbrMetallicRoughness.baseColorTexture.texCoord).toBe(0);
    expect(pbrMetallicRoughness.metallicRoughnessTexture.texCoord).toBe(0);
  });

  it("adds spec gloss defaults", () => {
    const gltf = {
      materials: [
        {
          extensions: {
            KHR_materials_pbrSpecularGlossiness: {
              specularGlossinessTexture: {
                index: 0,
              },
            },
          },
        },
      ],
    };
    const gltfWithDefaults = addDefaults(gltf);
    const pbrSpecularGlossiness =
      gltfWithDefaults.materials[0].extensions
        .KHR_materials_pbrSpecularGlossiness;

    expect(pbrSpecularGlossiness.diffuseFactor).toEqual([1.0, 1.0, 1.0, 1.0]);
    expect(pbrSpecularGlossiness.specularFactor).toEqual([1.0, 1.0, 1.0]);
    expect(pbrSpecularGlossiness.glossinessFactor).toBe(1.0);
    expect(pbrSpecularGlossiness.specularGlossinessTexture.texCoord).toBe(0);
  });

  it("adds materials common defaults", () => {
    const gltf = {
      materials: [
        {
          extensions: {
            KHR_materials_common: {
              technique: "BLINN",
            },
          },
        },
        {
          extensions: {
            KHR_materials_common: {
              technique: "CONSTANT",
            },
          },
        },
        {
          extensions: {
            KHR_materials_common: {
              technique: "LAMBERT",
            },
          },
        },
      ],
    };

    const gltfWithDefaults = addDefaults(gltf);
    const materialsCommonBlinn =
      gltfWithDefaults.materials[0].extensions.KHR_materials_common;
    const materialsCommonConstant =
      gltfWithDefaults.materials[1].extensions.KHR_materials_common;
    const materialsCommonLambert =
      gltfWithDefaults.materials[2].extensions.KHR_materials_common;

    expect(materialsCommonBlinn.values.ambient).toEqual([0.0, 0.0, 0.0, 1.0]);
    expect(materialsCommonBlinn.values.diffuse).toEqual([0.0, 0.0, 0.0, 1.0]);
    expect(materialsCommonBlinn.values.emission).toEqual([0.0, 0.0, 0.0, 1.0]);
    expect(materialsCommonBlinn.values.specular).toEqual([0.0, 0.0, 0.0, 1.0]);
    expect(materialsCommonBlinn.values.shininess).toBe(0.0);
    expect(materialsCommonBlinn.values.transparency).toBe(1.0);
    expect(materialsCommonBlinn.transparent).toBe(false);
    expect(materialsCommonBlinn.doubleSided).toBe(false);

    expect(materialsCommonConstant.values.diffuse).toBeUndefined();
    expect(materialsCommonConstant.values.specular).toBeUndefined();
    expect(materialsCommonConstant.values.shininess).toBeUndefined();

    expect(materialsCommonLambert.values.specular).toBeUndefined();
    expect(materialsCommonLambert.values.shininess).toBeUndefined();
  });

  it("adds sampler defaults", () => {
    const gltf = {
      samplers: [
        {
          // Intentionally empty
        },
      ],
    };

    const gltfWithDefaults = addDefaults(gltf);
    const sampler = gltfWithDefaults.samplers[0];
    expect(sampler.wrapS).toBe(WebGLConstants.REPEAT);
    expect(sampler.wrapT).toBe(WebGLConstants.REPEAT);
  });

  it("adds node defaults", () => {
    const gltf = {
      animations: [
        {
          channels: [
            {
              sampler: 0,
              target: {
                node: 0,
                path: "rotation",
              },
            },
          ],
          samplers: [
            {
              input: 0,
              output: 1,
            },
          ],
        },
      ],
      nodes: [
        {
          mesh: 0,
        },
        {
          mesh: 1,
        },
        {
          mesh: 2,
          translation: [1.0, 0.0, 0.0],
        },
      ],
    };

    const gltfWithDefaults = addDefaults(gltf);
    const animatedNode = gltfWithDefaults.nodes[0];
    const staticNode1 = gltfWithDefaults.nodes[1];
    const staticNode2 = gltfWithDefaults.nodes[2];

    expect(gltfWithDefaults.animations[0].samplers[0].interpolation).toBe(
      "LINEAR",
    );

    expect(animatedNode.matrix).toBeUndefined();
    expect(animatedNode.translation).toEqual([0.0, 0.0, 0.0]);
    expect(animatedNode.rotation).toEqual([0.0, 0.0, 0.0, 1.0]);
    expect(animatedNode.scale).toEqual([1.0, 1.0, 1.0]);

    expect(staticNode1.matrix).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    expect(staticNode1.translation).toBeUndefined();
    expect(staticNode1.rotation).toBeUndefined();
    expect(staticNode1.scale).toBeUndefined();

    expect(staticNode2.matrix).toBeUndefined();
    expect(staticNode2.translation).toEqual([1.0, 0.0, 0.0]);
    expect(staticNode2.rotation).toEqual([0.0, 0.0, 0.0, 1.0]);
    expect(staticNode2.scale).toEqual([1.0, 1.0, 1.0]);
  });

  it("adds scene defaults", () => {
    const gltf = {
      scenes: [
        {
          nodes: [0],
        },
      ],
    };

    const gltfWithDefaults = addDefaults(gltf);
    expect(gltfWithDefaults.scene).toBe(0);
  });
});
