import {
  _shadersMaterialStageFS,
  AlphaMode,
  combine,
  GltfLoader,
  LightingModel,
  Matrix3,
  MaterialPipelineStage,
  ModelAlphaOptions,
  ModelLightingOptions,
  Pass,
  Resource,
  ResourceCache,
  ShaderBuilder,
  Cartesian4,
  Cartesian3,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/ModelExperimental/MaterialPipelineStage",
  function () {
    var scene;
    var gltfLoaders = [];

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    var mockFrameState = {
      context: {
        defaultTexture: {},
        defaultNormalTexture: {},
        defaultEmissiveTexture: {},
      },
    };

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
    var boxUnlit = "./Data/Models/GltfLoader/UnlitTest/glTF/UnlitTest.gltf";

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
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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

        var metallicRoughness = primitive.material.metallicRoughness;
        var expectedUniforms = {
          u_baseColorTexture: metallicRoughness.baseColorTexture.texture,
          u_metallicRoughnessTexture:
            metallicRoughness.metallicRoughnessTexture.texture,
        };
        expectUniformMap(uniformMap, expectedUniforms);
      });
    });

    it("adds metallic roughness uniforms without defaults", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];

        // Alter PBR parameters so that defaults are not used.
        var metallicRoughness = primitive.material.metallicRoughness;
        metallicRoughness.baseColorFactor = new Cartesian4(0.5, 0.5, 0.5, 0.5);
        metallicRoughness.metallicFactor = 0.5;
        metallicRoughness.roughnessFactor = 0.5;

        var shaderBuilder = new ShaderBuilder();
        var uniformMap = {};
        var renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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

        var specularGlossiness = primitive.material.specularGlossiness;
        var expectedUniforms = {
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
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];

        // Alter PBR parameters so that defaults are not used.
        var specularGlossiness = primitive.material.specularGlossiness;
        specularGlossiness.diffuseFactor = new Cartesian4(0.5, 0.5, 0.5, 0.5);
        specularGlossiness.specularFactor = new Cartesian3(0.5, 0.5, 0.5);

        var shaderBuilder = new ShaderBuilder();
        var uniformMap = {};
        var renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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
      return loadGltf(boomBox).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];
        var lightingOptions = new ModelLightingOptions();
        var renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: lightingOptions,
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];
        var lightingOptions = new ModelLightingOptions();
        var renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: lightingOptions,
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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
        var components = gltfLoader.components;
        var primitive = components.nodes[1].primitives[0];
        var lightingOptions = new ModelLightingOptions();
        var renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: lightingOptions,
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];
        var shaderBuilder = new ShaderBuilder();
        var renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];
        var shaderBuilder = new ShaderBuilder();
        var uniformMap = {};
        var renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: uniformMap,
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
        };

        var cutoff = 0.6;
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
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];
        var shaderBuilder = new ShaderBuilder();
        var renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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

    it("enables back-face culling if material is not double-sided", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[1].primitives[0];
        var renderStateOptions = {};
        var renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: renderStateOptions,
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
        var components = gltfLoader.components;
        var primitive = components.nodes[1].primitives[0];
        var renderStateOptions = {};
        var renderResources = {
          shaderBuilder: new ShaderBuilder(),
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: renderStateOptions,
          cull: true,
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

    it("adds material stage functions to the fragment shader", function () {
      return loadGltf(boxUnlit).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[1].primitives[0];
        var shaderBuilder = new ShaderBuilder();
        var renderResources = {
          shaderBuilder: shaderBuilder,
          uniformMap: {},
          lightingOptions: new ModelLightingOptions(),
          alphaOptions: new ModelAlphaOptions(),
          renderStateOptions: {},
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

    it("_processTextureTransform updates the shader and uniform map", function () {
      var shaderBuilder = new ShaderBuilder();
      var uniformMap = {};
      var matrix = new Matrix3(0.5, 0, 0.5, 0, 0.5, 0, 0, 0, 1);
      var textureReader = {
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
      var shaderBuilder = new ShaderBuilder();
      var uniformMap = {};
      var matrix = new Matrix3(0.5, 0, 0.5, 0, 0.5, 0, 0, 0, 1);
      var mockTexture = {};
      var textureReader = {
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
      var shaderBuilder = new ShaderBuilder();
      var uniformMap = {};
      var matrix = new Matrix3(0.5, 0, 0.5, 0, 0.5, 0, 0, 0, 1);
      var mockTexture = {};
      var textureReader = {
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
  "WEBGL"
);
