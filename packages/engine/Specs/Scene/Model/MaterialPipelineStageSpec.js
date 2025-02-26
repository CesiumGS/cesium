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
  ModelComponents,
  Pass,
  RenderState,
  Resource,
  ResourceCache,
  ShaderBuilder,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";

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

    async function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, scene);
      return gltfLoader;
    }

    const boomBox = "./Data/Models/glTF-2.0/BoomBox/glTF/BoomBox.gltf";
    const boomBoxSpecularGlossiness =
      "./Data/Models/glTF-2.0/BoomBox/glTF-pbrSpecularGlossiness/BoomBox.gltf";
    const boxUnlit = "./Data/Models/glTF-2.0/UnlitTest/glTF/UnlitTest.gltf";
    const boxNoNormals =
      "./Data/Models/glTF-2.0/BoxNoNormals/glTF/BoxNoNormals.gltf";
    const boxScaledNormalTexture =
      "./Data/Models/glTF-2.0/BoxScaledNormalTexture/glTF/BoxScaledNormalTexture.gltf";
    const triangle = "./Data/Models/glTF-2.0/Triangle/glTF/Triangle.gltf";
    const twoSidedPlane =
      "./Data/Models/glTF-2.0/TwoSidedPlane/glTF/TwoSidedPlane.gltf";
    const specularTestData =
      "./Data/Models/glTF-2.0/BoxSpecular/glTF/BoxSpecular.gltf";
    const anisotropyTestData =
      "./Data/Models/glTF-2.0/BoxAnisotropy/glTF/BoxAnisotropy.gltf";
    const clearcoatTestData =
      "./Data/Models/glTF-2.0/BoxClearcoat/glTF/BoxClearcoat.gltf";

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

    it("processes default material", async function () {
      const gltfLoader = await loadGltf(triangle);
      const primitive = gltfLoader.components.nodes[0].primitives[0];

      const renderResources = mockRenderResources();
      const { shaderBuilder, uniformMap } = renderResources;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "USE_METALLIC_ROUGHNESS",
      ]);

      const expectedUniforms = {};
      expectUniformMap(uniformMap, expectedUniforms);
    });

    it("adds material and metallic roughness uniforms", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const primitive = gltfLoader.components.nodes[0].primitives[0];
      const renderResources = mockRenderResources();
      const { shaderBuilder, uniformMap } = renderResources;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

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

    it("adds metallic roughness uniforms without defaults", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const primitive = gltfLoader.components.nodes[0].primitives[0];

      const metallicRoughness = primitive.material.metallicRoughness;
      metallicRoughness.baseColorFactor = new Cartesian4(0.5, 0.5, 0.5, 0.5);
      metallicRoughness.metallicFactor = 0.5;
      metallicRoughness.roughnessFactor = 0.5;

      const renderResources = mockRenderResources();
      const { shaderBuilder, uniformMap } = renderResources;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

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

    it("doesn't add emissive uniforms when emissive factor is default", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const primitive = gltfLoader.components.nodes[0].primitives[0];

      const material = primitive.material;
      material.emissiveFactor = Cartesian3.clone(
        ModelComponents.Material.DEFAULT_EMISSIVE_FACTOR,
      );
      const metallicRoughness = material.metallicRoughness;

      const renderResources = mockRenderResources();
      const { shaderBuilder, uniformMap } = renderResources;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform sampler2D u_baseColorTexture;",
        "uniform sampler2D u_metallicRoughnessTexture;",
        "uniform sampler2D u_normalTexture;",
        "uniform sampler2D u_occlusionTexture;",
      ]);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_BASE_COLOR_TEXTURE",
        "HAS_METALLIC_ROUGHNESS_TEXTURE",
        "HAS_NORMAL_TEXTURE",
        "HAS_OCCLUSION_TEXTURE",
        "TEXCOORD_BASE_COLOR v_texCoord_0",
        "TEXCOORD_METALLIC_ROUGHNESS v_texCoord_0",
        "TEXCOORD_NORMAL v_texCoord_0",
        "TEXCOORD_OCCLUSION v_texCoord_0",
        "USE_METALLIC_ROUGHNESS",
      ]);

      const expectedUniforms = {
        u_normalTexture: material.normalTexture.texture,
        u_occlusionTexture: material.occlusionTexture.texture,
        u_baseColorTexture: metallicRoughness.baseColorTexture.texture,
        u_metallicRoughnessTexture:
          metallicRoughness.metallicRoughnessTexture.texture,
      };
      expectUniformMap(uniformMap, expectedUniforms);
    });

    it("adds specular glossiness uniforms", async function () {
      const gltfLoader = await loadGltf(boomBoxSpecularGlossiness);
      const primitive = gltfLoader.components.nodes[0].primitives[0];
      const renderResources = mockRenderResources();
      const { shaderBuilder, uniformMap } = renderResources;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
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

    it("adds specular glossiness uniforms without defaults", async function () {
      const gltfLoader = await loadGltf(boomBoxSpecularGlossiness);
      const primitive = gltfLoader.components.nodes[0].primitives[0];

      const specularGlossiness = primitive.material.specularGlossiness;
      specularGlossiness.diffuseFactor = new Cartesian4(0.5, 0.5, 0.5, 0.5);
      specularGlossiness.specularFactor = new Cartesian3(0.5, 0.5, 0.5);

      const renderResources = mockRenderResources();
      const { shaderBuilder, uniformMap } = renderResources;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform float u_glossinessFactor;",
        "uniform sampler2D u_diffuseTexture;",
        "uniform sampler2D u_emissiveTexture;",
        "uniform sampler2D u_normalTexture;",
        "uniform sampler2D u_occlusionTexture;",
        "uniform sampler2D u_specularGlossinessTexture;",
        "uniform vec3 u_emissiveFactor;",
        "uniform vec3 u_legacySpecularFactor;",
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
        "HAS_LEGACY_SPECULAR_FACTOR",
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
        u_legacySpecularFactor: specularGlossiness.specularFactor,
        u_glossinessFactor: specularGlossiness.glossinessFactor,
      };
      expectUniformMap(uniformMap, expectedUniforms);
    });

    it("adds uniforms and defines for KHR_materials_specular", async function () {
      const gltfLoader = await loadGltf(specularTestData);

      const primitive = gltfLoader.components.nodes[1].primitives[0];

      const renderResources = mockRenderResources();
      const { shaderBuilder, uniformMap } = renderResources;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform float u_metallicFactor;",
        "uniform float u_specularFactor;",
        "uniform sampler2D u_baseColorTexture;",
        "uniform sampler2D u_specularColorTexture;",
        "uniform sampler2D u_specularTexture;",
        "uniform vec3 u_specularColorFactor;",
      ]);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_BASE_COLOR_TEXTURE",
        "HAS_METALLIC_FACTOR",
        "HAS_SPECULAR_COLOR_FACTOR",
        "HAS_SPECULAR_COLOR_TEXTURE",
        "HAS_SPECULAR_FACTOR",
        "HAS_SPECULAR_TEXTURE",
        "TEXCOORD_BASE_COLOR v_texCoord_0",
        "TEXCOORD_SPECULAR v_texCoord_0",
        "TEXCOORD_SPECULAR_COLOR v_texCoord_0",
        "USE_METALLIC_ROUGHNESS",
        "USE_SPECULAR",
      ]);

      const {
        specularFactor,
        specularTexture,
        specularColorFactor,
        specularColorTexture,
      } = primitive.material.specular;
      const expectedUniforms = {
        u_specularFactor: specularFactor,
        u_specularColorFactor: specularColorFactor,
        u_specularTexture: specularTexture.texture,
        u_specularColorTexture: specularColorTexture.texture,
      };
      expectUniformMap(uniformMap, expectedUniforms);
    });

    it("adds uniforms and defines for KHR_materials_anisotropy", async function () {
      const gltfLoader = await loadGltf(anisotropyTestData);

      const primitive = gltfLoader.components.nodes[1].primitives[0];
      const renderResources = mockRenderResources();
      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      const { shaderBuilder, uniformMap } = renderResources;

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform float u_metallicFactor;",
        "uniform sampler2D u_anisotropyTexture;",
        "uniform sampler2D u_baseColorTexture;",
        "uniform sampler2D u_normalTexture;",
        "uniform vec3 u_anisotropy;",
      ]);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_ANISOTROPY_TEXTURE",
        "HAS_BASE_COLOR_TEXTURE",
        "HAS_METALLIC_FACTOR",
        "HAS_NORMAL_TEXTURE",
        "TEXCOORD_ANISOTROPY v_texCoord_0",
        "TEXCOORD_BASE_COLOR v_texCoord_0",
        "TEXCOORD_NORMAL v_texCoord_0",
        "USE_ANISOTROPY",
        "USE_METALLIC_ROUGHNESS",
      ]);

      const { anisotropyStrength, anisotropyRotation, anisotropyTexture } =
        primitive.material.anisotropy;
      const expectedAnisotropy = Cartesian3.fromElements(
        Math.cos(anisotropyRotation),
        Math.sin(anisotropyRotation),
        anisotropyStrength,
      );
      const expectedUniforms = {
        u_anisotropy: expectedAnisotropy,
        u_anisotropyTexture: anisotropyTexture.texture,
      };
      expectUniformMap(uniformMap, expectedUniforms);
    });

    it("adds uniforms and defines for KHR_materials_clearcoat", async function () {
      const gltfLoader = await loadGltf(clearcoatTestData);

      const primitive = gltfLoader.components.nodes[1].primitives[0];
      const renderResources = mockRenderResources();
      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      const { shaderBuilder, uniformMap } = renderResources;

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform float u_metallicFactor;",
        "uniform float u_clearcoatFactor;",
        "uniform float u_clearcoatNormalTextureScale;",
        "uniform float u_clearcoatRoughnessFactor;",
        "uniform sampler2D u_baseColorTexture;",
        "uniform sampler2D u_clearcoatTexture;",
        "uniform sampler2D u_clearcoatRoughnessTexture;",
        "uniform sampler2D u_clearcoatNormalTexture;",
      ]);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_BASE_COLOR_TEXTURE",
        "HAS_CLEARCOAT_FACTOR",
        "HAS_CLEARCOAT_NORMAL_TEXTURE",
        "HAS_CLEARCOAT_NORMAL_TEXTURE_SCALE",
        "HAS_CLEARCOAT_ROUGHNESS_FACTOR",
        "HAS_CLEARCOAT_ROUGHNESS_TEXTURE",
        "HAS_CLEARCOAT_TEXTURE",
        "HAS_METALLIC_FACTOR",
        "TEXCOORD_CLEARCOAT v_texCoord_0",
        "TEXCOORD_CLEARCOAT_ROUGHNESS v_texCoord_0",
        "TEXCOORD_CLEARCOAT_NORMAL v_texCoord_0",
        "TEXCOORD_BASE_COLOR v_texCoord_0",
        "USE_CLEARCOAT",
        "USE_METALLIC_ROUGHNESS",
      ]);

      const {
        clearcoatFactor,
        clearcoatRoughnessFactor,
        clearcoatTexture,
        clearcoatRoughnessTexture,
        clearcoatNormalTexture,
      } = primitive.material.clearcoat;
      const expectedUniforms = {
        u_clearcoatFactor: clearcoatFactor,
        u_clearcoatRoughnessFactor: clearcoatRoughnessFactor,
        u_clearcoatTexture: clearcoatTexture.texture,
        u_clearcoatRoughnessTexture: clearcoatRoughnessTexture.texture,
        u_clearcoatNormalTexture: clearcoatNormalTexture.texture,
        u_clearcoatNormalTextureScale: clearcoatNormalTexture.scale,
      };
      expectUniformMap(uniformMap, expectedUniforms);
    });

    it("adds uniforms and defines for a normal texture scalar", async function () {
      const gltfLoader = await loadGltf(boxScaledNormalTexture);

      const primitive = gltfLoader.components.nodes[1].primitives[0];
      const renderResources = mockRenderResources();
      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      const { shaderBuilder, uniformMap } = renderResources;

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform float u_metallicFactor;",
        "uniform float u_normalTextureScale;",
        "uniform sampler2D u_baseColorTexture;",
        "uniform sampler2D u_normalTexture;",
      ]);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_BASE_COLOR_TEXTURE",
        "HAS_METALLIC_FACTOR",
        "HAS_NORMAL_TEXTURE",
        "HAS_NORMAL_TEXTURE_SCALE",
        "TEXCOORD_BASE_COLOR v_texCoord_0",
        "TEXCOORD_NORMAL v_texCoord_0",
        "USE_METALLIC_ROUGHNESS",
      ]);

      const { scale } = primitive.material.normalTexture;
      const expectedUniforms = {
        u_normalTextureScale: scale,
      };
      expectUniformMap(uniformMap, expectedUniforms);
    });

    it("doesn't add texture uniforms for classification models", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const primitive = gltfLoader.components.nodes[0].primitives[0];
      const renderResources = mockRenderResources(ClassificationType.BOTH);
      const { shaderBuilder, uniformMap } = renderResources;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

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

    it("doesn't add metallic roughness textures for classification models", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const primitive = gltfLoader.components.nodes[0].primitives[0];

      const metallicRoughness = primitive.material.metallicRoughness;
      metallicRoughness.baseColorFactor = new Cartesian4(0.5, 0.5, 0.5, 0.5);
      metallicRoughness.metallicFactor = 0.5;
      metallicRoughness.roughnessFactor = 0.5;

      const renderResources = mockRenderResources();
      const { shaderBuilder, uniformMap } = renderResources;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

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

    it("enables PBR lighting for metallic roughness materials", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const primitive = gltfLoader.components.nodes[0].primitives[0];
      const renderResources = mockRenderResources();
      const lightingOptions = renderResources.lightingOptions;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      expect(lightingOptions.lightingModel).toBe(LightingModel.PBR);
    });

    it("enables PBR lighting for specular glossiness materials", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const primitive = gltfLoader.components.nodes[0].primitives[0];
      const renderResources = mockRenderResources();
      const lightingOptions = renderResources.lightingOptions;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      expect(lightingOptions.lightingModel).toBe(LightingModel.PBR);
    });

    it("enables unlit lighting when KHR_materials_unlit is present", async function () {
      const gltfLoader = await loadGltf(boxUnlit);
      const primitive = gltfLoader.components.nodes[1].primitives[0];
      const renderResources = mockRenderResources();
      const lightingOptions = renderResources.lightingOptions;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      expect(lightingOptions.lightingModel).toBe(LightingModel.UNLIT);
    });

    it("enables unlit lighting for classification models", async function () {
      const gltfLoader = await loadGltf(boxUnlit);
      const primitive = gltfLoader.components.nodes[1].primitives[0];
      const renderResources = mockRenderResources(ClassificationType.BOTH);
      const lightingOptions = renderResources.lightingOptions;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      expect(lightingOptions.lightingModel).toBe(LightingModel.UNLIT);
    });

    it("gracefully falls back to unlit shading for models without normals", async function () {
      const gltfLoader = await loadGltf(boxNoNormals);
      const primitive = gltfLoader.components.nodes[1].primitives[0];
      const renderResources = mockRenderResources();
      const lightingOptions = renderResources.lightingOptions;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      expect(lightingOptions.lightingModel).toBe(LightingModel.UNLIT);
    });

    it("handles opaque material", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const primitive = gltfLoader.components.nodes[0].primitives[0];
      const renderResources = mockRenderResources();

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

      expect(renderResources.alphaOptions.pass).not.toBeDefined();
      expect(renderResources.alphaOptions.alphaCutoff).not.toBeDefined();
    });

    it("handles alpha mask material", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const cutoff = 0.6;
      const primitive = gltfLoader.components.nodes[0].primitives[0];
      primitive.material.alphaMode = AlphaMode.MASK;
      primitive.material.alphaCutoff = cutoff;

      const renderResources = mockRenderResources();
      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

      expect(renderResources.alphaOptions.pass).not.toBeDefined();
      expect(renderResources.alphaOptions.alphaCutoff).toBe(cutoff);
    });

    it("handles translucent material", async function () {
      const gltfLoader = await loadGltf(boomBox);
      const primitive = gltfLoader.components.nodes[0].primitives[0];
      primitive.material.alphaMode = AlphaMode.BLEND;

      const renderResources = mockRenderResources();
      renderResources.pass = Pass.OPAQUE;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

      expect(renderResources.alphaOptions.pass).toBe(Pass.TRANSLUCENT);
      expect(renderResources.alphaOptions.alphaCutoff).not.toBeDefined();
    });

    it("disables back-face culling if model.backFaceCulling is false", async function () {
      const gltfLoader = await loadGltf(boxUnlit);
      const primitive = gltfLoader.components.nodes[1].primitives[0];

      const renderResources = mockRenderResources();
      const renderStateOptions = renderResources.renderStateOptions;
      renderResources.model.backFaceCulling = false;
      renderResources.cull = true;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      expect(renderStateOptions.cull.enabled).toBe(false);
    });

    it("enables back-face culling if material is not double-sided", async function () {
      const gltfLoader = await loadGltf(boxUnlit);
      const primitive = gltfLoader.components.nodes[1].primitives[0];
      const renderResources = mockRenderResources();
      const renderStateOptions = renderResources.renderStateOptions;
      renderResources.model.backFaceCulling = true;
      renderResources.cull = true;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);
      expect(renderStateOptions.cull.enabled).toBe(true);
    });

    it("disables back-face culling if material is double-sided", async function () {
      const gltfLoader = await loadGltf(boxUnlit);
      const primitive = gltfLoader.components.nodes[1].primitives[0];
      const renderResources = mockRenderResources();
      renderResources.model.backFaceCulling = true;
      const renderStateOptions = renderResources.renderStateOptions;

      primitive.material.doubleSided = true;
      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

      expect(renderStateOptions.cull.enabled).toBe(false);
    });

    it("adds material stage functions to the fragment shader", async function () {
      const gltfLoader = await loadGltf(boxUnlit);
      const primitive = gltfLoader.components.nodes[1].primitives[0];
      primitive.material.doubleSided = true;

      const renderResources = mockRenderResources();
      const shaderBuilder = renderResources.shaderBuilder;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, []);
      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersMaterialStageFS,
      ]);
    });

    it("adds define to shader if material is double-sided", async function () {
      const gltfLoader = await loadGltf(twoSidedPlane);
      const primitive = gltfLoader.components.nodes[0].primitives[0];
      const renderResources = mockRenderResources();
      const shaderBuilder = renderResources.shaderBuilder;

      MaterialPipelineStage.process(renderResources, primitive, mockFrameState);

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
        "TEST",
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
        mockFrameState.context.defaultTexture,
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
        mockFrameState.context.defaultTexture,
      );

      expectUniformMap(uniformMap, {
        u_testTexture: mockTexture,
      });
    });
  },
  "WebGL",
);
