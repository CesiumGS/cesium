import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  ClassificationType,
  combine,
  DequantizationPipelineStage,
  GltfLoader,
  Math as CesiumMath,
  Resource,
  ResourceCache,
  ShaderBuilder,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

describe(
  "Scene/Model/DequantizationPipelineStage",
  function () {
    const boxUncompressed =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";
    const boxWithLines =
      "./Data/Models/glTF-2.0/BoxWithLines/glTF-Draco/BoxWithLines.gltf";
    const milkTruck =
      "./Data/Models/glTF-2.0/CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf";
    const boxDracoRGBColors =
      "./Data/Models/glTF-2.0/BoxVertexColorsDracoRGB/glTF-Draco/BoxVertexColorsDracoRGB.gltf";

    let scene;
    const gltfLoaders = [];

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

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

    function mockRenderResources() {
      return {
        uniformMap: {},
        shaderBuilder: new ShaderBuilder(),
        model: {},
      };
    }

    it("adds a dequantization function", function () {
      const renderResources = mockRenderResources();
      const shaderBuilder = renderResources.shaderBuilder;

      return loadGltf(boxWithLines).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        DequantizationPipelineStage.process(renderResources, primitive);

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "USE_DEQUANTIZATION",
        ]);
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          DequantizationPipelineStage.FUNCTION_ID_DEQUANTIZATION_STAGE_VS,
          DequantizationPipelineStage.FUNCTION_SIGNATURE_DEQUANTIZATION_STAGE_VS,
          [
            "    attributes.normalMC = czm_octDecode(a_quantized_normalMC, model_normalizationRange_normalMC).zxy;",
            "    attributes.positionMC = model_quantizedVolumeOffset_positionMC + a_quantized_positionMC * model_quantizedVolumeStepSize_positionMC;",
          ],
        );
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentFunctionIds(shaderBuilder, []);
      });
    });

    it("adds dequantization uniforms", function () {
      const renderResources = mockRenderResources();
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      return loadGltf(milkTruck).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        DequantizationPipelineStage.process(renderResources, primitive);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          "uniform float model_normalizationRange_normalMC;",
          "uniform vec2 model_quantizedVolumeOffset_texCoord_0;",
          "uniform vec2 model_quantizedVolumeStepSize_texCoord_0;",
          "uniform vec3 model_quantizedVolumeOffset_positionMC;",
          "uniform vec3 model_quantizedVolumeStepSize_positionMC;",
        ]);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

        const uniformValues = {
          normalRange: uniformMap.model_normalizationRange_normalMC(),
          positionOffset: uniformMap.model_quantizedVolumeOffset_positionMC(),
          positionStepSize:
            uniformMap.model_quantizedVolumeStepSize_positionMC(),
          texCoordOffset: uniformMap.model_quantizedVolumeOffset_texCoord_0(),
          texCoordStepSize:
            uniformMap.model_quantizedVolumeStepSize_texCoord_0(),
        };

        const expected = {
          normalRange: 1023,
          positionOffset: new Cartesian3(
            -2.430910110473633,
            0.2667999863624573,
            -1.3960000276565552,
          ),
          positionStepSize: new Cartesian3(
            0.0002971928118058615,
            0.0002971928118058615,
            0.0002971928118058615,
          ),
          texCoordOffset: new Cartesian2(
            0.0029563899151980877,
            0.015672028064727783,
          ),
          texCoordStepSize: new Cartesian2(
            0.0002397004064622816,
            0.0002397004064622816,
          ),
        };

        expect(uniformValues).toEqualEpsilon(expected, CesiumMath.EPSILON15);
      });
    });

    it("promotes vertex color dequantization uniforms to vec4", function () {
      const renderResources = mockRenderResources();
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      return loadGltf(boxDracoRGBColors).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[2].primitives[0];
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

        const uniformValues = {
          normalRange: uniformMap.model_normalizationRange_normalMC(),
          texCoordOffset: uniformMap.model_quantizedVolumeOffset_texCoord_0(),
          texCoordStepSize:
            uniformMap.model_quantizedVolumeStepSize_texCoord_0(),
          positionOffset: uniformMap.model_quantizedVolumeOffset_positionMC(),
          positionStepSize:
            uniformMap.model_quantizedVolumeStepSize_positionMC(),
          colorOffset: uniformMap.model_quantizedVolumeOffset_color_0(),
          colorStepSize: uniformMap.model_quantizedVolumeStepSize_color_0(),
        };

        const expected = {
          normalRange: 1023,
          positionOffset: new Cartesian3(-0.5, -0.5, -0.5),
          positionStepSize: new Cartesian3(
            0.00006103888176768602,
            0.00006103888176768602,
            0.00006103888176768602,
          ),
          texCoordOffset: new Cartesian2(0, 0),
          texCoordStepSize: new Cartesian2(
            0.0002442002442002442,
            0.0002442002442002442,
          ),
          colorOffset: new Cartesian4(
            4.908018991223173e-10,
            0.0006933663971722126,
            0.000028382812160998583,
            0,
          ),
          colorStepSize: new Cartesian4(
            0.00392145689795999,
            0.00392145689795999,
            0.00392145689795999,
            1,
          ),
        };

        expect(uniformValues).toEqualEpsilon(expected, CesiumMath.EPSILON15);
      });
    });

    it("only dequantizes position and texcoords for classification models", function () {
      const renderResources = mockRenderResources();
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      renderResources.model.classificationType = ClassificationType.BOTH;

      return loadGltf(boxDracoRGBColors).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[2].primitives[0];
        DequantizationPipelineStage.process(renderResources, primitive);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          "uniform vec2 model_quantizedVolumeOffset_texCoord_0;",
          "uniform vec2 model_quantizedVolumeStepSize_texCoord_0;",
          "uniform vec3 model_quantizedVolumeOffset_positionMC;",
          "uniform vec3 model_quantizedVolumeStepSize_positionMC;",
        ]);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

        const uniformValues = {
          texCoordOffset: uniformMap.model_quantizedVolumeOffset_texCoord_0(),
          texCoordStepSize:
            uniformMap.model_quantizedVolumeStepSize_texCoord_0(),
          positionOffset: uniformMap.model_quantizedVolumeOffset_positionMC(),
          positionStepSize:
            uniformMap.model_quantizedVolumeStepSize_positionMC(),
        };

        const expected = {
          texCoordOffset: new Cartesian2(0, 0),
          texCoordStepSize: new Cartesian2(
            0.0002442002442002442,
            0.0002442002442002442,
          ),
          positionOffset: new Cartesian3(-0.5, -0.5, -0.5),
          positionStepSize: new Cartesian3(
            0.00006103888176768602,
            0.00006103888176768602,
            0.00006103888176768602,
          ),
        };

        expect(uniformValues).toEqualEpsilon(expected, CesiumMath.EPSILON15);
      });
    });

    it("skips non-quantized attributes", function () {
      const renderResources = mockRenderResources();
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;

      return loadGltf(boxUncompressed).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        DequantizationPipelineStage.process(renderResources, primitive);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
        expect(uniformMap).toEqual({});

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "USE_DEQUANTIZATION",
        ]);
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          DequantizationPipelineStage.FUNCTION_ID_DEQUANTIZATION_STAGE_VS,
          DequantizationPipelineStage.FUNCTION_SIGNATURE_DEQUANTIZATION_STAGE_VS,
          [],
        );
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentFunctionIds(shaderBuilder, []);
      });
    });
  },
  "WebGL",
);
