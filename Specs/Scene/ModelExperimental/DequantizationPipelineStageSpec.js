import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  combine,
  DequantizationPipelineStage,
  GltfLoader,
  Math as CesiumMath,
  Resource,
  ResourceCache,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/DequantizationPipelineStage", function () {
  var boxUncompressed =
    "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
  var boxWithLines =
    "./Data/Models/DracoCompression/BoxWithLines/BoxWithLines.gltf";
  var milkTruck =
    "./Data/Models/DracoCompression/CesiumMilkTruck/CesiumMilkTruck.gltf";
  var boxDracoRGBColors =
    "./Data/Models/DracoCompression/BoxVertexColorsDracoRGB.gltf";

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

  it("adds a dequantization function", function () {
    var uniformMap = {};
    var shaderBuilder = new ShaderBuilder();
    var renderResources = {
      uniformMap: uniformMap,
      shaderBuilder: shaderBuilder,
    };
    return loadGltf(boxWithLines).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[1].primitives[0];
      DequantizationPipelineStage.process(renderResources, primitive);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "USE_DEQUANTIZATION",
      ]);
      ShaderBuilderTester.expectHasVertexFunction(
        shaderBuilder,
        DequantizationPipelineStage.FUNCTION_ID_DEQUANTIZATION_STAGE_VS,
        DequantizationPipelineStage.FUNCTION_SIGNATURE_DEQUANTIZATION_STAGE_VS,
        [
          "    attributes.normalMC = czm_octDecode(a_quantized_normalMC, model_normalizationRange_normalMC).zxy;",
          "    attributes.positionMC = model_quantizedVolumeOffset_positionMC + a_quantized_positionMC * model_quantizedVolumeStepSize_positionMC;",
        ]
      );
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
      expect(shaderBuilder._fragmentShaderParts.functionIds).toEqual([]);
    });
  });

  it("adds dequantization uniforms", function () {
    var uniformMap = {};
    var shaderBuilder = new ShaderBuilder();
    var renderResources = {
      uniformMap: uniformMap,
      shaderBuilder: shaderBuilder,
    };

    return loadGltf(milkTruck).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];
      DequantizationPipelineStage.process(renderResources, primitive);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform float model_normalizationRange_normalMC;",
        "uniform vec2 model_quantizedVolumeOffset_texCoord_0;",
        "uniform vec2 model_quantizedVolumeStepSize_texCoord_0;",
        "uniform vec3 model_quantizedVolumeOffset_positionMC;",
        "uniform vec3 model_quantizedVolumeStepSize_positionMC;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

      var uniformValues = {
        normalRange: uniformMap.model_normalizationRange_normalMC(),
        positionOffset: uniformMap.model_quantizedVolumeOffset_positionMC(),
        positionStepSize: uniformMap.model_quantizedVolumeStepSize_positionMC(),
        texCoordOffset: uniformMap.model_quantizedVolumeOffset_texCoord_0(),
        texCoordStepSize: uniformMap.model_quantizedVolumeStepSize_texCoord_0(),
      };

      var expected = {
        normalRange: 1023,
        positionOffset: new Cartesian3(
          -2.430910110473633,
          0.2667999863624573,
          -1.3960000276565552
        ),
        positionStepSize: new Cartesian3(
          0.0002971928118058615,
          0.0002971928118058615,
          0.0002971928118058615
        ),
        texCoordOffset: new Cartesian2(
          0.0029563899151980877,
          0.015672028064727783
        ),
        texCoordStepSize: new Cartesian2(
          0.0002397004064622816,
          0.0002397004064622816
        ),
      };

      expect(uniformValues).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });
  });

  it("promotes vertex color dequantization uniforms to vec4", function () {
    var uniformMap = {};
    var shaderBuilder = new ShaderBuilder();
    var renderResources = {
      uniformMap: uniformMap,
      shaderBuilder: shaderBuilder,
    };

    return loadGltf(boxDracoRGBColors).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[2].primitives[0];
      DequantizationPipelineStage.process(renderResources, primitive);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform float model_normalizationRange_normalMC;",
        "uniform vec2 model_quantizedVolumeOffset_texCoord_0;",
        "uniform vec2 model_quantizedVolumeStepSize_texCoord_0;",
        "uniform vec3 model_quantizedVolumeOffset_positionMC;",
        "uniform vec3 model_quantizedVolumeStepSize_positionMC;",
        "uniform vec4 model_quantizedVolumeOffset_color_0;",
        "uniform vec4 model_quantizedVolumeStepSize_color_0;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

      var uniformValues = {
        normalRange: uniformMap.model_normalizationRange_normalMC(),
        texCoordOffset: uniformMap.model_quantizedVolumeOffset_texCoord_0(),
        texCoordStepSize: uniformMap.model_quantizedVolumeStepSize_texCoord_0(),
        positionOffset: uniformMap.model_quantizedVolumeOffset_positionMC(),
        positionStepSize: uniformMap.model_quantizedVolumeStepSize_positionMC(),
        colorOffset: uniformMap.model_quantizedVolumeOffset_color_0(),
        colorStepSize: uniformMap.model_quantizedVolumeStepSize_color_0(),
      };

      var expected = {
        normalRange: 1023,
        positionOffset: new Cartesian3(-0.5, -0.5, -0.5),
        positionStepSize: new Cartesian3(
          0.00006103888176768602,
          0.00006103888176768602,
          0.00006103888176768602
        ),
        texCoordOffset: new Cartesian2(0, 0),
        texCoordStepSize: new Cartesian2(
          0.0002442002442002442,
          0.0002442002442002442
        ),
        colorOffset: new Cartesian4(
          4.908018991223173e-10,
          0.0006933663971722126,
          0.000028382812160998583,
          0
        ),
        colorStepSize: new Cartesian4(
          0.00392145689795999,
          0.00392145689795999,
          0.00392145689795999,
          1
        ),
      };

      expect(uniformValues).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });
  });

  it("skips non-quantized attributes", function () {
    var uniformMap = {};
    var shaderBuilder = new ShaderBuilder();
    var renderResources = {
      uniformMap: uniformMap,
      shaderBuilder: shaderBuilder,
    };

    return loadGltf(boxUncompressed).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[1].primitives[0];
      DequantizationPipelineStage.process(renderResources, primitive);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
      expect(uniformMap).toEqual({});

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "USE_DEQUANTIZATION",
      ]);
      ShaderBuilderTester.expectHasVertexFunction(
        shaderBuilder,
        DequantizationPipelineStage.FUNCTION_ID_DEQUANTIZATION_STAGE_VS,
        DequantizationPipelineStage.FUNCTION_SIGNATURE_DEQUANTIZATION_STAGE_VS,
        []
      );
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
      expect(shaderBuilder._fragmentShaderParts.functionIds).toEqual([]);
    });
  });
});
