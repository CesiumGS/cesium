import {
  combine,
  DequantizationPipelineStage,
  GltfLoader,
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
