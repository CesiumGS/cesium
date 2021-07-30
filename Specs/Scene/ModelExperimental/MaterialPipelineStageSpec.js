import {
  combine,
  GltfLoader,
  LightingModel,
  MaterialPipelineStage,
  Resource,
  ResourceCache,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import ModelLightingOptions from "../../../Source/Scene/ModelExperimental/ModelLightingOptions.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/MaterialPipelineStage", function () {
  var scene;
  var gltfLoaders = [];

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    var gltfLoadersLength = gltfLoaders.length;
    for (var i = 0; i < gltfLoadersLength; ++i) {
      var gltfLoader = gltfLoaders[i];
      if (!gltfLoader.isDestroyed()) {
        gltfLoader.destroy();
      }
    }
    gltfLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  function getOptions(gltfPath, options) {
    var resource = new Resource({
      url: gltfPath,
    });

    return combine(options, {
      gltfResource: resource,
      incrementallyLoadTextures: false, // Default to false if not supplied
    });
  }

  function loadGltf(gltfPath, options) {
    var gltfLoader = new GltfLoader(getOptions(gltfPath, options));
    gltfLoaders.push(gltfLoader);
    gltfLoader.load();

    return waitForLoaderProcess(gltfLoader, scene);
  }

  var boomBox = "./Data/Models/PBR/BoomBox/BoomBox.gltf";
  var boomBoxSpecularGlossiness =
    "./Data/Models/PBR/BoomBoxSpecularGlossiness/BoomBox.gltf";
  var boxUnlit = "./Data/Models/PBR/BoxUnlit/BoxUnlit.gltf";

  function expectShaderLines(shaderLines, expected) {
    for (var i = 0; i < expected.length; i++) {
      expect(shaderLines.indexOf(expected[i])).not.toBe(-1);
    }
  }

  function expectUniformMap(uniformMap, expected) {
    for (var key in expected) {
      if (expected.hasOwnProperty(key)) {
        var expectedValue = expected[key];
        var uniformFunction = uniformMap[key];
        expect(uniformFunction).toBeDefined();
        expect(uniformFunction()).toEqual(expectedValue);
      }
    }
  }

  it("adds material uniforms", function () {
    return loadGltf(boomBox).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];
      var shaderBuilder = new ShaderBuilder();
      var uniformMap = {};
      var renderResources = {
        shaderBuilder: shaderBuilder,
        uniformMap: uniformMap,
        lightingOptions: new ModelLightingOptions(),
        renderStateOptions: {},
      };

      MaterialPipelineStage.process(renderResources, primitive);

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

      var material = primitive.material;
      var expectedUniforms = {
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
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];
      var shaderBuilder = new ShaderBuilder();
      var uniformMap = {};
      var renderResources = {
        shaderBuilder: shaderBuilder,
        uniformMap: uniformMap,
        lightingOptions: new ModelLightingOptions(),
        renderStateOptions: {},
      };

      MaterialPipelineStage.process(renderResources, primitive);

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

      var metallicRoughness = primitive.material.metallicRoughness;
      var expectedUniforms = {
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
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];
      var shaderBuilder = new ShaderBuilder();
      var uniformMap = {};
      var renderResources = {
        shaderBuilder: shaderBuilder,
        uniformMap: uniformMap,
        lightingOptions: new ModelLightingOptions(),
        renderStateOptions: {},
      };

      MaterialPipelineStage.process(renderResources, primitive);
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

      var specularGlossiness = primitive.material.specularGlossiness;
      var expectedUniforms = {
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
    fail();
  });

  it("enables PBR lighting for specular glossiness materials", function () {
    fail();
  });

  it("enables unlit lighting when KHR_materials_unlit is present", function () {
    return loadGltf(boxUnlit).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[1].primitives[0];
      var shaderBuilder = new ShaderBuilder();
      var lightingOptions = new ModelLightingOptions();
      var uniformMap = {};
      var renderResources = {
        shaderBuilder: shaderBuilder,
        uniformMap: uniformMap,
        lightingOptions: lightingOptions,
        renderStateOptions: {},
      };

      MaterialPipelineStage.process(renderResources, primitive);
      expect(lightingOptions.lightingModel).toBe(LightingModel.UNLIT);
    });
  });

  it("configures alpha settings", function () {
    fail();
  });

  it("adds material stage functions to the fragment shader", function () {
    fail();
  });

  it("enables culling if material is not double-sided", function () {
    fail();
  });

  it("disables culling if material is double-sided", function () {
    fail();
  });
});
