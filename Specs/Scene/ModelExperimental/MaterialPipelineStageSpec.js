import {
  _shadersMaterialStageFS,
  AlphaMode,
  combine,
  GltfLoader,
  LightingModel,
  Matrix3,
  MaterialPipelineStage,
  ModelAlphaOptions,
  ModelExperimentalStatistics,
  ModelLightingOptions,
  Pass,
  Resource,
  ResourceCache,
  ShaderBuilder,
  Cartesian4,
  Cartesian3,
  Color,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/ModelExperimental/MaterialPipelineStage",
  function () {
    let scene;
    const gltfLoaders = [];

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    const mockFrameState = {
      context: {
        defaultTexture: {},
        defaultNormalTexture: {},
        defaultEmissiveTexture: {},
      },
    };

    afterEach(function () {
      const gltfLoadersLength = gltfLoaders.length;
      for (let i = 0; i < gltfLoadersLength; ++i) {
        const gltfLoader = gltfLoaders[i];
        if (!gltfLoader.isDestroyed()) {
          gltfLoader.destroy();
        }
      }
      gltfLoaders.length = 0;
      ResourceCache.clearForSpecs();
    });

    function getOptions(gltfPath, options) {
      const resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTextures: false, // Default to false if not supplied
      });
    }

    function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      gltfLoader.load();

      return waitForLoaderProcess(gltfLoader, scene);
    }

    const boomBox = "./Data/Models/PBR/BoomBox/BoomBox.gltf";
    const boomBoxSpecularGlossiness =
      "./Data/Models/PBR/BoomBoxSpecularGlossiness/BoomBox.gltf";
    const boxUnlit = "./Data/Models/GltfLoader/UnlitTest/glTF/UnlitTest.gltf";
    const boxNoNormals =
      "./Data/Models/GltfLoader/BoxNoNormals/glTF/BoxNoNormals.gltf";
    const triangle = "./Data/Models/GltfLoader/Triangle/glTF/Triangle.gltf";
    const twoSidedPlane =
      "./Data/Models/GltfLoader/TwoSidedPlane/glTF/TwoSidedPlane.gltf";

    function expectShaderLines(shaderLines, expected) {
      for (let i = 0; i < expected.length; i++) {
        expect(shaderLines.indexOf(expected[i])).not.toBe(-1);
      }
    }

    function expectUniformMap(uniformMap, expected) {
      for (const key in expected) {
        if (expected.hasOwnProperty(key)) {
          const expectedValue = expected[key];
          const uniformFunction = uniformMap[key];
          expect(uniformFunction).toBeDefined();
          expect(uniformFunction()).toEqual(expectedValue);
        }
      }
    }

    it("processes default material", function () {
      return loadGltf(triangle).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const uniformMap = {};
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(shaderBuilder._vertexShaderParts.uniformLines).toEqual([]);
        expectShaderLines(shaderBuilder._fragmentShaderParts.uniformLines, []);

        expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, []);

        const expectedUniforms = {};
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("adds material uniforms", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const uniformMap = {};
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(shaderBuilder._vertexShaderParts.uniformLines).toEqual([]);
        expectShaderLines(shaderBuilder._fragmentShaderParts.uniformLines, [
          "uniform sampler2D u_emissiveTexture;",
          "uniform vec3 u_emissiveFactor;",
          "uniform sampler2D u_normalTexture;",
          "uniform sampler2D u_occlusionTexture;",
        ]);

        expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, [
          "HAS_EMISSIVE_TEXTURE",
          "TEXCOORD_EMISSIVE v_texCoord_0",
          "HAS_EMISSIVE_FACTOR",
          "HAS_NORMAL_TEXTURE",
          "TEXCOORD_NORMAL v_texCoord_0",
          "HAS_OCCLUSION_TEXTURE",
          "TEXCOORD_OCCLUSION v_texCoord_0",
        ]);

        const material = primitive.material;
        const expectedUniforms = {
          u_emissiveTexture: material.emissiveTexture.texture,
          u_emissiveFactor: material.emissiveFactor,
          u_normalTexture: material.normalTexture.texture,
          u_occlusionTexture: material.occlusionTexture.texture,
        };
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("adds metallic roughness uniforms", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const uniformMap = {};
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: {
            statistics: new ModelExperimentalStatistics(),
          },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expectShaderLines(shaderBuilder._fragmentShaderParts.uniformLines, [
          "uniform sampler2D u_baseColorTexture;",
          "uniform sampler2D u_metallicRoughnessTexture;",
        ]);

        expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, [
          "HAS_BASE_COLOR_TEXTURE",
          "TEXCOORD_BASE_COLOR v_texCoord_0",
          "HAS_METALLIC_ROUGHNESS_TEXTURE",
          "TEXCOORD_METALLIC_ROUGHNESS v_texCoord_0",
        ]);

        const metallicRoughness = primitive.material.metallicRoughness;
        const expectedUniforms = {
          u_baseColorTexture: metallicRoughness.baseColorTexture.texture,
          u_metallicRoughnessTexture:
            metallicRoughness.metallicRoughnessTexture.texture,
        };
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("adds metallic roughness uniforms without defaults", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        const metallicRoughness = primitive.material.metallicRoughness;
        metallicRoughness.baseColorFactor = new Cartesian4(0.5, 0.5, 0.5, 0.5);
        metallicRoughness.metallicFactor = 0.5;
        metallicRoughness.roughnessFactor = 0.5;

        const shaderBuilder = new ShaderBuilder();
        const uniformMap = {};
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expectShaderLines(shaderBuilder._fragmentShaderParts.uniformLines, [
          "uniform sampler2D u_baseColorTexture;",
          "uniform vec4 u_baseColorFactor;",
          "uniform sampler2D u_metallicRoughnessTexture;",
          "uniform float u_metallicFactor;",
          "uniform float u_roughnessFactor;",
        ]);

        expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, [
          "HAS_BASE_COLOR_TEXTURE",
          "TEXCOORD_BASE_COLOR v_texCoord_0",
          "HAS_BASE_COLOR_FACTOR",
          "HAS_METALLIC_ROUGHNESS_TEXTURE",
          "TEXCOORD_METALLIC_ROUGHNESS v_texCoord_0",
          "HAS_METALLIC_FACTOR",
          "HAS_ROUGHNESS_FACTOR",
        ]);

        const expectedUniforms = {
          u_baseColorTexture: metallicRoughness.baseColorTexture.texture,
          u_baseColorFactor: metallicRoughness.baseColorFactor,
          u_metallicRoughnessTexture:
            metallicRoughness.metallicRoughnessTexture.texture,
          u_metallicFactor: metallicRoughness.metallicFactor,
          u_roughnessFactor: metallicRoughness.roughnessFactor,
        };
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("adds specular glossiness uniforms", function () {
      return loadGltf(boomBoxSpecularGlossiness).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const uniformMap = {};
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expectShaderLines(shaderBuilder._fragmentShaderParts.uniformLines, [
          "uniform sampler2D u_diffuseTexture;",
          "uniform sampler2D u_specularGlossinessTexture;",
          "uniform float u_glossinessFactor;",
        ]);

        expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, [
          "USE_SPECULAR_GLOSSINESS",
          "HAS_DIFFUSE_TEXTURE",
          "TEXCOORD_DIFFUSE v_texCoord_0",
          "HAS_SPECULAR_GLOSSINESS_TEXTURE",
          "TEXCOORD_SPECULAR_GLOSSINESS v_texCoord_0",
          "HAS_GLOSSINESS_FACTOR",
        ]);

        const specularGlossiness = primitive.material.specularGlossiness;
        const expectedUniforms = {
          u_diffuseTexture: specularGlossiness.diffuseTexture.texture,
          u_specularGlossinessTexture:
            specularGlossiness.specularGlossinessTexture.texture,
          u_glossinessFactor: specularGlossiness.glossinessFactor,
        };
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("adds specular glossiness uniforms without defaults", function () {
      return loadGltf(boomBoxSpecularGlossiness).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        const specularGlossiness = primitive.material.specularGlossiness;
        specularGlossiness.diffuseFactor = new Cartesian4(0.5, 0.5, 0.5, 0.5);
        specularGlossiness.specularFactor = new Cartesian3(0.5, 0.5, 0.5);

        const shaderBuilder = new ShaderBuilder();
        const uniformMap = {};
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expectShaderLines(shaderBuilder._fragmentShaderParts.uniformLines, [
          "uniform sampler2D u_diffuseTexture;",
          "uniform vec4 u_diffuseFactor;",
          "uniform sampler2D u_specularGlossinessTexture;",
          "uniform vec3 u_specularFactor;",
          "uniform float u_glossinessFactor;",
        ]);

        expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, [
          "USE_SPECULAR_GLOSSINESS",
          "HAS_DIFFUSE_TEXTURE",
          "TEXCOORD_DIFFUSE v_texCoord_0",
          "HAS_DIFFUSE_FACTOR",
          "HAS_SPECULAR_GLOSSINESS_TEXTURE",
          "TEXCOORD_SPECULAR_GLOSSINESS v_texCoord_0",
          "HAS_SPECULAR_FACTOR",
          "HAS_GLOSSINESS_FACTOR",
        ]);

        const expectedUniforms = {
          u_diffuseTexture: specularGlossiness.diffuseTexture.texture,
          u_diffuseFactor: specularGlossiness.diffuseFactor,
          u_specularGlossinessTexture:
            specularGlossiness.specularGlossinessTexture.texture,
          u_specularFactor: specularGlossiness.specularFactor,
          u_glossinessFactor: specularGlossiness.glossinessFactor,
        };
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("enables PBR lighting for metallic roughness materials", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const lightingOptions = new ModelLightingOptions();
        const renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: lightingOptions,
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(lightingOptions.lightingModel).toBe(LightingModel.PBR);
      });
    });

    it("enables PBR lighting for specular glossiness materials", function () {
      return loadGltf(boomBoxSpecularGlossiness).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const lightingOptions = new ModelLightingOptions();
        const renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: lightingOptions,
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(lightingOptions.lightingModel).toBe(LightingModel.PBR);
      });
    });

    it("enables unlit lighting when KHR_materials_unlit is present", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const lightingOptions = new ModelLightingOptions();
        const renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: lightingOptions,
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(lightingOptions.lightingModel).toBe(LightingModel.UNLIT);
      });
    });

    it("gracefully falls back to unlit shading for models without normals", function () {
      return loadGltf(boxNoNormals).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const lightingOptions = new ModelLightingOptions();
        const renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: lightingOptions,
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(lightingOptions.lightingModel).toBe(LightingModel.UNLIT);
      });
    });

    it("handles alphaMode = OPAQUE", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(renderResources.alphaOptions.pass).not.toBeDefined();
        expect(renderResources.alphaOptions.alphaMode).toBe(AlphaMode.OPAQUE);
        expect(renderResources.alphaOptions.alphaCutoff).not.toBeDefined();
      });
    });

    it("handles alphaMode = MASK", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const uniformMap = {};
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        const cutoff = 0.6;
        primitive.material.alphaMode = AlphaMode.MASK;
        primitive.material.alphaCutoff = cutoff;
        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(renderResources.alphaOptions.pass).not.toBeDefined();
        expect(renderResources.alphaOptions.alphaMode).toBe(AlphaMode.MASK);
        expect(renderResources.alphaOptions.alphaCutoff).toBe(cutoff);
      });
    });

    it("handles alphaMode = BLEND", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
          pass: Pass.OPAQUE,
        };

        primitive.material.alphaMode = AlphaMode.BLEND;
        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(renderResources.alphaOptions.pass).toBe(Pass.TRANSLUCENT);
        expect(renderResources.alphaOptions.alphaMode).toBe(AlphaMode.BLEND);
        expect(renderResources.alphaOptions.alphaCutoff).not.toBeDefined();
      });
    });

    it("disables back-face culling if model.backFaceCulling is false", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderStateOptions = {};
        const renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: renderStateOptions,
          model: {
            statistics: new ModelExperimentalStatistics(),
            backFaceCulling: false,
          },
          cull: true,
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(renderStateOptions).toEqual({
          cull: {
            enabled: false,
          },
        });
      });
    });

    it("enables back-face culling if material is not double-sided", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderStateOptions = {};
        const renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: renderStateOptions,
          model: {
            statistics: new ModelExperimentalStatistics(),
            backFaceCulling: true,
          },
          cull: true,
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(renderStateOptions).toEqual({
          cull: {
            enabled: true,
          },
        });
      });
    });

    it("disables back-face culling if material is double-sided", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderStateOptions = {};
        const renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: renderStateOptions,
          model: {
            statistics: new ModelExperimentalStatistics(),
            backFaceCulling: true,
          },
        };

        primitive.material.doubleSided = true;
        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(renderStateOptions).toEqual({
          cull: {
            enabled: false,
          },
        });
      });
    });

    it("disables back-face culling if model color is translucent", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderStateOptions = {};
        const renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: renderStateOptions,
          model: {
            statistics: new ModelExperimentalStatistics(),
            color: new Color(0, 0, 1, 0.5),
            backFaceCulling: true,
          },
          cull: true,
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(renderStateOptions).toEqual({
          cull: {
            enabled: false,
          },
        });
      });
    });

    it("adds material stage functions to the fragment shader", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: { statistics: new ModelExperimentalStatistics() },
        };

        primitive.material.doubleSided = true;
        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(shaderBuilder._vertexShaderParts.shaderLines).toEqual([]);
        expect(shaderBuilder._fragmentShaderParts.shaderLines).toEqual([
          _shadersMaterialStageFS,
        ]);
      });
    });

    it("adds define to shader if wireframe is enabled", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const uniformMap = {};
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: {
            statistics: new ModelExperimentalStatistics(),
            debugWireframe: true,
          },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, [
          "USE_WIREFRAME",
        ]);
      });
    });

    it("adds define to shader if material is double-sided", function () {
      return loadGltf(twoSidedPlane).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const shaderBuilder = new ShaderBuilder();
        const uniformMap = {};
        const renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
          model: {
            statistics: new ModelExperimentalStatistics(),
            debugWireframe: true,
          },
        };

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, [
          "HAS_DOUBLE_SIDED_MATERIAL",
        ]);
      });
    });

    it("_processTextureTransform updates the shader and uniform map", function () {
      const shaderBuilder = new ShaderBuilder();
      const uniformMap = {};
      const matrix = new Matrix3(0.5, 0, 0.5, 0, 0.5, 0, 0, 0, 1);
      const textureReader = {
        transform: matrix,
      };
      MaterialPipelineStage._processTextureTransform(
        shaderBuilder,
        uniformMap,
        textureReader,
        "u_testTexture",
        "TEST"
      );

      expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, [
        "HAS_TEST_TEXTURE_TRANSFORM",
      ]);
      expectShaderLines(shaderBuilder._fragmentShaderParts.uniformLines, [
        "uniform mat3 u_testTextureTransform;",
      ]);
      expectUniformMap(uniformMap, {
        u_testTextureTransform: matrix,
      });
    });

    it("_processTexture processes texture transforms if present", function () {
      const shaderBuilder = new ShaderBuilder();
      const uniformMap = {};
      const matrix = new Matrix3(0.5, 0, 0.5, 0, 0.5, 0, 0, 0, 1);
      const mockTexture = {};
      const textureReader = {
        transform: matrix,
        texture: mockTexture,
        texCoord: 1,
      };
      MaterialPipelineStage._processTexture(
        shaderBuilder,
        uniformMap,
        textureReader,
        "u_testTexture",
        "TEST",
        mockFrameState.context.defaultTexture
      );

      expectShaderLines(shaderBuilder._fragmentShaderParts.defineLines, [
        "HAS_TEST_TEXTURE",
        "TEXCOORD_TEST v_texCoord_1",
        "HAS_TEST_TEXTURE_TRANSFORM",
      ]);
      expectShaderLines(shaderBuilder._fragmentShaderParts.uniformLines, [
        "uniform sampler2D u_testTexture;",
        "uniform mat3 u_testTextureTransform;",
      ]);
      expectUniformMap(uniformMap, {
        u_testTextureTransform: matrix,
      });
    });

    it("_processTexture creates texture uniforms with a default value", function () {
      const shaderBuilder = new ShaderBuilder();
      const uniformMap = {};
      const matrix = new Matrix3(0.5, 0, 0.5, 0, 0.5, 0, 0, 0, 1);
      const mockTexture = {};
      const textureReader = {
        transform: matrix,
        texture: mockTexture,
        texCoord: 1,
      };
      MaterialPipelineStage._processTexture(
        shaderBuilder,
        uniformMap,
        textureReader,
        "u_testTexture",
        "TEST",
        mockFrameState.context.defaultTexture
      );

      expectUniformMap(uniformMap, {
        u_testTexture: mockTexture,
      });
    });
  },
  "WebGL"
);
