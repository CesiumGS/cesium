"use strict";
const Cesium = require("cesium");
const { moveTechniqueRenderStates } = require("@gltf-pipeline/core");

const WebGLConstants = Cesium.WebGLConstants;

const gltf = {
  programs: {
    program_0: {
      attributes: ["a_normal", "a_position", "a_texcoord0"],
      fragmentShader: "BoxTextured0FS",
      vertexShader: "BoxTextured0VS",
    },
  },
  shaders: {
    BoxTextured0FS: {
      type: WebGLConstants.FRAGMENT_SHADER,
      uri: "BoxTextured0FS.glsl",
    },
    BoxTextured0VS: {
      type: WebGLConstants.VERTEX_SHADER,
      uri: "BoxTextured0VS.glsl",
    },
  },
  techniques: {
    technique0: {
      states: {
        enable: [
          WebGLConstants.DEPTH_TEST,
          WebGLConstants.BLEND,
          WebGLConstants.CULL_FACE,
        ],
      },
    },
  },
  materials: [
    {
      technique: "technique0",
    },
  ],
};

describe("moveTechniqueRenderStates", () => {
  it("sets material.doubleSided property if CULL_FACE is not enabled", () => {
    const baseGltf = JSON.parse(JSON.stringify(gltf));
    let gltfWithUpdatedMaterials = moveTechniqueRenderStates(baseGltf);
    let material = gltfWithUpdatedMaterials.materials[0];
    expect(material.doubleSided).toBeUndefined();

    const gltfDoubleSided = JSON.parse(JSON.stringify(gltf));
    gltfDoubleSided.techniques.technique0.states = {
      enable: [WebGLConstants.DEPTH_TEST, WebGLConstants.BLEND],
    };

    gltfWithUpdatedMaterials = moveTechniqueRenderStates(gltfDoubleSided);
    material = gltfWithUpdatedMaterials.materials[0];
    expect(material.doubleSided).toBe(true);
  });

  it("sets alphaMode and moves technique render state blending functions to material KHR_blend extension", () => {
    const gltfWithBlendFunctions = JSON.parse(JSON.stringify(gltf));

    gltfWithBlendFunctions.techniques.technique0.states = {
      enable: [
        WebGLConstants.DEPTH_TEST,
        WebGLConstants.BLEND,
        WebGLConstants.CULL_FACE,
      ],
      functions: {
        blendEquationSeparate: [
          WebGLConstants.FUNC_ADD,
          WebGLConstants.FUNC_ADD,
        ],
        blendFuncSeparate: [
          WebGLConstants.ONE,
          WebGLConstants.ONE_MINUS_SRC_ALPHA,
          WebGLConstants.ONE,
          WebGLConstants.ONE_MINUS_SRC_ALPHA,
        ],
      },
    };

    const gltfWithBlendExtension = moveTechniqueRenderStates(
      gltfWithBlendFunctions,
    );
    expect(
      gltfWithBlendExtension.extensionsUsed.indexOf("KHR_blend"),
    ).toBeGreaterThan(-1);
    expect(gltfWithBlendExtension.extensionsRequired).toBeUndefined();

    const material = gltfWithBlendExtension.materials[0];
    expect(material.alphaMode).toBe("BLEND");
    expect(material.extensions).toBeDefined();
    const materialBlending = material.extensions.KHR_blend;
    expect(materialBlending).toBeDefined();
    expect(materialBlending.blendEquation).toEqual([
      WebGLConstants.FUNC_ADD,
      WebGLConstants.FUNC_ADD,
    ]);
    expect(materialBlending.blendFactors).toEqual([
      WebGLConstants.ONE,
      WebGLConstants.ONE_MINUS_SRC_ALPHA,
      WebGLConstants.ONE,
      WebGLConstants.ONE_MINUS_SRC_ALPHA,
    ]);
  });

  it("provides defaults for extension properties if not provided", () => {
    const gltfWithBlendFunctions = JSON.parse(JSON.stringify(gltf));
    gltfWithBlendFunctions.techniques.technique0.states = {
      enable: [
        WebGLConstants.DEPTH_TEST,
        WebGLConstants.BLEND,
        WebGLConstants.CULL_FACE,
      ],
      functions: {
        blendFuncSeparate: [
          WebGLConstants.ONE,
          WebGLConstants.ONE_MINUS_SRC_ALPHA,
          WebGLConstants.ONE,
          WebGLConstants.ONE_MINUS_SRC_ALPHA,
        ],
      },
    };

    let gltfWithBlendExtension = moveTechniqueRenderStates(
      gltfWithBlendFunctions,
    );
    let materialBlending =
      gltfWithBlendExtension.materials[0].extensions.KHR_blend;
    expect(materialBlending).toBeDefined();
    expect(materialBlending.blendEquation).toEqual([
      WebGLConstants.FUNC_ADD,
      WebGLConstants.FUNC_ADD,
    ]);
    expect(materialBlending.blendFactors).toEqual([
      WebGLConstants.ONE,
      WebGLConstants.ONE_MINUS_SRC_ALPHA,
      WebGLConstants.ONE,
      WebGLConstants.ONE_MINUS_SRC_ALPHA,
    ]);

    gltfWithBlendFunctions.techniques.technique0.states = {
      enable: [
        WebGLConstants.DEPTH_TEST,
        WebGLConstants.BLEND,
        WebGLConstants.CULL_FACE,
      ],
      functions: {
        blendEquationSeparate: [
          WebGLConstants.FUNC_ADD,
          WebGLConstants.FUNC_ADD,
        ],
      },
    };

    gltfWithBlendExtension = moveTechniqueRenderStates(gltfWithBlendFunctions);
    materialBlending = gltfWithBlendExtension.materials[0].extensions.KHR_blend;
    expect(materialBlending).toBeDefined();
    expect(materialBlending.blendEquation).toEqual([
      WebGLConstants.FUNC_ADD,
      WebGLConstants.FUNC_ADD,
    ]);
    expect(materialBlending.blendFactors).toEqual([
      WebGLConstants.ONE,
      WebGLConstants.ZERO,
      WebGLConstants.ONE,
      WebGLConstants.ZERO,
    ]);
  });

  it("falls back to default blending factors if unsupported factor is found", () => {
    const gltfWithBlendFunctions = JSON.parse(JSON.stringify(gltf));
    gltfWithBlendFunctions.techniques.technique0.states = {
      enable: [
        WebGLConstants.DEPTH_TEST,
        WebGLConstants.BLEND,
        WebGLConstants.CULL_FACE,
      ],
      functions: {
        blendFuncSeparate: [
          WebGLConstants.SRC_ALPHA_SATURATE,
          WebGLConstants.ONE_MINUS_SRC_ALPHA,
          WebGLConstants.SRC_ALPHA_SATURATE,
          WebGLConstants.ONE_MINUS_SRC_ALPHA,
        ],
      },
    };

    const gltfWithBlendExtension = moveTechniqueRenderStates(
      gltfWithBlendFunctions,
    );

    const materialBlending =
      gltfWithBlendExtension.materials[0].extensions.KHR_blend;
    expect(materialBlending).toBeDefined();
    expect(materialBlending.blendFactors).toEqual([
      WebGLConstants.ONE,
      WebGLConstants.ZERO,
      WebGLConstants.ONE,
      WebGLConstants.ZERO,
    ]);
  });

  it("does not set alphaMode or add KHR_blend if no blending is found in render states", () => {
    const gltfWithoutBlending = JSON.parse(JSON.stringify(gltf));
    gltfWithoutBlending.techniques.technique0.states.enable = [
      WebGLConstants.DEPTH_TEST,
      WebGLConstants.CULL_FACE,
    ];

    const updatedGltf = moveTechniqueRenderStates(gltfWithoutBlending);
    expect(updatedGltf.extensionsUsed).toBeUndefined();
    expect(updatedGltf.extensionsRequired).toBeUndefined();

    const material = updatedGltf.materials[0];
    expect(material.alphaMode).toBeUndefined();
    expect(material.extensions).toBeUndefined();
  });
});
