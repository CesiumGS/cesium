import {
  _shadersMaterialStageFS,
  AlphaMode,
  Cartesian4,
  Cartesian3,
  ClassificationType,
  combine,
  GltfLoader,
  LightingModel,
  Matrix3,
  MaterialPipelineStage,
  ModelAlphaOptions,
  ModelStatistics,
  ModelLightingOptions,
  Pass,
  RenderState,
  Resource,
  ResourceCache,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/Model/MaterialPipelineStage",
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

    function mockRenderResources(classificationType) {
      return {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: {},
        lightingOptions: new ModelLightingOptions(),
        alphaOptions: new ModelAlphaOptions(),
        renderStateOptions: RenderState.getState(RenderState.fromCache()),
        model: {
          statistics: new ModelStatistics(),
          classificationType: classificationType,
        },
      };
    }

    it("processes default material", function () {
      return loadGltf(triangle).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        const renderResources = mockRenderResources();
        const shaderBuilder = renderResources.shaderBuilder;
        const uniformMap = renderResources.uniformMap;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "USE_METALLIC_ROUGHNESS",
        ]);

        const expectedUniforms = {};
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("adds material and metallic roughness uniforms", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources();
        const shaderBuilder = renderResources.shaderBuilder;
        const uniformMap = renderResources.uniformMap;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform sampler2D u_baseColorTexture;",
          "uniform sampler2D u_emissiveTexture;",
          "uniform sampler2D u_metallicRoughnessTexture;",
          "uniform sampler2D u_normalTexture;",
          "uniform sampler2D u_occlusionTexture;",
          "uniform vec3 u_emissiveFactor;",
        ]);

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_BASE_COLOR_TEXTURE",
          "HAS_EMISSIVE_FACTOR",
          "HAS_EMISSIVE_TEXTURE",
          "HAS_METALLIC_ROUGHNESS_TEXTURE",
          "HAS_NORMAL_TEXTURE",
          "HAS_OCCLUSION_TEXTURE",
          "TEXCOORD_BASE_COLOR v_texCoord_0",
          "TEXCOORD_EMISSIVE v_texCoord_0",
          "TEXCOORD_METALLIC_ROUGHNESS v_texCoord_0",
          "TEXCOORD_NORMAL v_texCoord_0",
          "TEXCOORD_OCCLUSION v_texCoord_0",
          "USE_METALLIC_ROUGHNESS",
        ]);

        const metallicRoughness = primitive.material.metallicRoughness;
        const material = primitive.material;
        const expectedUniforms = {
          u_emissiveTexture: material.emissiveTexture.texture,
          u_emissiveFactor: material.emissiveFactor,
          u_normalTexture: material.normalTexture.texture,
          u_occlusionTexture: material.occlusionTexture.texture,
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

        const renderResources = mockRenderResources();
        const shaderBuilder = renderResources.shaderBuilder;
        const uniformMap = renderResources.uniformMap;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform float u_metallicFactor;",
          "uniform float u_roughnessFactor;",
          "uniform sampler2D u_baseColorTexture;",
          "uniform sampler2D u_emissiveTexture;",
          "uniform sampler2D u_metallicRoughnessTexture;",
          "uniform sampler2D u_normalTexture;",
          "uniform sampler2D u_occlusionTexture;",
          "uniform vec3 u_emissiveFactor;",
          "uniform vec4 u_baseColorFactor;",
        ]);

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_BASE_COLOR_FACTOR",
          "HAS_BASE_COLOR_TEXTURE",
          "HAS_EMISSIVE_FACTOR",
          "HAS_EMISSIVE_TEXTURE",
          "HAS_METALLIC_FACTOR",
          "HAS_METALLIC_ROUGHNESS_TEXTURE",
          "HAS_NORMAL_TEXTURE",
          "HAS_OCCLUSION_TEXTURE",
          "HAS_ROUGHNESS_FACTOR",
          "TEXCOORD_BASE_COLOR v_texCoord_0",
          "TEXCOORD_EMISSIVE v_texCoord_0",
          "TEXCOORD_METALLIC_ROUGHNESS v_texCoord_0",
          "TEXCOORD_NORMAL v_texCoord_0",
          "TEXCOORD_OCCLUSION v_texCoord_0",
          "USE_METALLIC_ROUGHNESS",
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
        const renderResources = mockRenderResources();
        const shaderBuilder = renderResources.shaderBuilder;
        const uniformMap = renderResources.uniformMap;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform float u_glossinessFactor;",
          "uniform sampler2D u_diffuseTexture;",
          "uniform sampler2D u_emissiveTexture;",
          "uniform sampler2D u_normalTexture;",
          "uniform sampler2D u_occlusionTexture;",
          "uniform sampler2D u_specularGlossinessTexture;",
          "uniform vec3 u_emissiveFactor;",
        ]);

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_DIFFUSE_TEXTURE",
          "HAS_EMISSIVE_FACTOR",
          "HAS_EMISSIVE_TEXTURE",
          "HAS_GLOSSINESS_FACTOR",
          "HAS_NORMAL_TEXTURE",
          "HAS_OCCLUSION_TEXTURE",
          "HAS_SPECULAR_GLOSSINESS_TEXTURE",
          "TEXCOORD_DIFFUSE v_texCoord_0",
          "TEXCOORD_EMISSIVE v_texCoord_0",
          "TEXCOORD_NORMAL v_texCoord_0",
          "TEXCOORD_OCCLUSION v_texCoord_0",
          "TEXCOORD_SPECULAR_GLOSSINESS v_texCoord_0",
          "USE_SPECULAR_GLOSSINESS",
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

        const renderResources = mockRenderResources();
        const shaderBuilder = renderResources.shaderBuilder;
        const uniformMap = renderResources.uniformMap;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform float u_glossinessFactor;",
          "uniform sampler2D u_diffuseTexture;",
          "uniform sampler2D u_emissiveTexture;",
          "uniform sampler2D u_normalTexture;",
          "uniform sampler2D u_occlusionTexture;",
          "uniform sampler2D u_specularGlossinessTexture;",
          "uniform vec3 u_emissiveFactor;",
          "uniform vec3 u_specularFactor;",
          "uniform vec4 u_diffuseFactor;",
        ]);

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_DIFFUSE_FACTOR",
          "HAS_DIFFUSE_TEXTURE",
          "HAS_EMISSIVE_FACTOR",
          "HAS_EMISSIVE_TEXTURE",
          "HAS_GLOSSINESS_FACTOR",
          "HAS_NORMAL_TEXTURE",
          "HAS_OCCLUSION_TEXTURE",
          "HAS_SPECULAR_FACTOR",
          "HAS_SPECULAR_GLOSSINESS_TEXTURE",
          "TEXCOORD_DIFFUSE v_texCoord_0",
          "TEXCOORD_EMISSIVE v_texCoord_0",
          "TEXCOORD_NORMAL v_texCoord_0",
          "TEXCOORD_OCCLUSION v_texCoord_0",
          "TEXCOORD_SPECULAR_GLOSSINESS v_texCoord_0",
          "USE_SPECULAR_GLOSSINESS",
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

    it("doesn't add texture uniforms for classification models", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources(ClassificationType.BOTH);
        const shaderBuilder = renderResources.shaderBuilder;
        const uniformMap = renderResources.uniformMap;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform vec3 u_emissiveFactor;",
        ]);

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_EMISSIVE_FACTOR",
          "USE_METALLIC_ROUGHNESS",
        ]);
        const material = primitive.material;
        const expectedUniforms = {
          u_emissiveFactor: material.emissiveFactor,
        };
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("doesn't add metallic roughness textures for classification models", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        const metallicRoughness = primitive.material.metallicRoughness;
        metallicRoughness.baseColorFactor = new Cartesian4(0.5, 0.5, 0.5, 0.5);
        metallicRoughness.metallicFactor = 0.5;
        metallicRoughness.roughnessFactor = 0.5;

        const renderResources = mockRenderResources();
        const shaderBuilder = renderResources.shaderBuilder;
        const uniformMap = renderResources.uniformMap;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform float u_metallicFactor;",
          "uniform float u_roughnessFactor;",
          "uniform sampler2D u_baseColorTexture;",
          "uniform sampler2D u_emissiveTexture;",
          "uniform sampler2D u_metallicRoughnessTexture;",
          "uniform sampler2D u_normalTexture;",
          "uniform sampler2D u_occlusionTexture;",
          "uniform vec3 u_emissiveFactor;",
          "uniform vec4 u_baseColorFactor;",
        ]);

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_BASE_COLOR_FACTOR",
          "HAS_BASE_COLOR_TEXTURE",
          "HAS_EMISSIVE_FACTOR",
          "HAS_EMISSIVE_TEXTURE",
          "HAS_METALLIC_FACTOR",
          "HAS_METALLIC_ROUGHNESS_TEXTURE",
          "HAS_NORMAL_TEXTURE",
          "HAS_OCCLUSION_TEXTURE",
          "HAS_ROUGHNESS_FACTOR",
          "TEXCOORD_BASE_COLOR v_texCoord_0",
          "TEXCOORD_EMISSIVE v_texCoord_0",
          "TEXCOORD_METALLIC_ROUGHNESS v_texCoord_0",
          "TEXCOORD_NORMAL v_texCoord_0",
          "TEXCOORD_OCCLUSION v_texCoord_0",
          "USE_METALLIC_ROUGHNESS",
        ]);

        const expectedUniforms = {
          u_baseColorFactor: metallicRoughness.baseColorFactor,
          u_metallicFactor: metallicRoughness.metallicFactor,
          u_roughnessFactor: metallicRoughness.roughnessFactor,
        };
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("enables PBR lighting for metallic roughness materials", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources();
        const lightingOptions = renderResources.lightingOptions;

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
        const renderResources = mockRenderResources();
        const lightingOptions = renderResources.lightingOptions;

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
        const renderResources = mockRenderResources();
        const lightingOptions = renderResources.lightingOptions;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(lightingOptions.lightingModel).toBe(LightingModel.UNLIT);
      });
    });

    it("enables unlit lighting for classification models", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderResources = mockRenderResources(ClassificationType.BOTH);
        const lightingOptions = renderResources.lightingOptions;

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
        const renderResources = mockRenderResources();
        const lightingOptions = renderResources.lightingOptions;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(lightingOptions.lightingModel).toBe(LightingModel.UNLIT);
      });
    });

    it("handles opaque material", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources();

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(renderResources.alphaOptions.pass).not.toBeDefined();
        expect(renderResources.alphaOptions.alphaCutoff).not.toBeDefined();
      });
    });

    it("handles alpha mask material", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const cutoff = 0.6;
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        primitive.material.alphaMode = AlphaMode.MASK;
        primitive.material.alphaCutoff = cutoff;

        const renderResources = mockRenderResources();
        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(renderResources.alphaOptions.pass).not.toBeDefined();
        expect(renderResources.alphaOptions.alphaCutoff).toBe(cutoff);
      });
    });

    it("handles translucent material", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        primitive.material.alphaMode = AlphaMode.BLEND;

        const renderResources = mockRenderResources();
        renderResources.pass = Pass.OPAQUE;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(renderResources.alphaOptions.pass).toBe(Pass.TRANSLUCENT);
        expect(renderResources.alphaOptions.alphaCutoff).not.toBeDefined();
      });
    });

    it("disables back-face culling if model.backFaceCulling is false", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];

        const renderResources = mockRenderResources();
        const renderStateOptions = renderResources.renderStateOptions;
        renderResources.model.backFaceCulling = false;
        renderResources.cull = true;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(renderStateOptions.cull.enabled).toBe(false);
      });
    });

    it("enables back-face culling if material is not double-sided", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderResources = mockRenderResources();
        const renderStateOptions = renderResources.renderStateOptions;
        renderResources.model.backFaceCulling = true;
        renderResources.cull = true;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );
        expect(renderStateOptions.cull.enabled).toBe(true);
      });
    });

    it("disables back-face culling if material is double-sided", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderResources = mockRenderResources();
        renderResources.model.backFaceCulling = true;
        const renderStateOptions = renderResources.renderStateOptions;

        primitive.material.doubleSided = true;
        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        expect(renderStateOptions.cull.enabled).toBe(false);
      });
    });

    it("adds material stage functions to the fragment shader", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        primitive.material.doubleSided = true;

        const renderResources = mockRenderResources();
        const shaderBuilder = renderResources.shaderBuilder;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, []);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersMaterialStageFS,
        ]);
      });
    });

    it("adds define to shader if material is double-sided", function () {
      return loadGltf(twoSidedPlane).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources();
        const shaderBuilder = renderResources.shaderBuilder;

        MaterialPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState
        );

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_DOUBLE_SIDED_MATERIAL",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_BASE_COLOR_TEXTURE",
          "HAS_DOUBLE_SIDED_MATERIAL",
          "HAS_METALLIC_ROUGHNESS_TEXTURE",
          "HAS_NORMAL_TEXTURE",
          "TEXCOORD_BASE_COLOR v_texCoord_0",
          "TEXCOORD_METALLIC_ROUGHNESS v_texCoord_0",
          "TEXCOORD_NORMAL v_texCoord_0",
          "USE_METALLIC_ROUGHNESS",
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

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_TEST_TEXTURE_TRANSFORM",
      ]);
      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
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

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_TEST_TEXTURE",
        "TEXCOORD_TEST v_texCoord_1",
        "HAS_TEST_TEXTURE_TRANSFORM",
      ]);
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
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
