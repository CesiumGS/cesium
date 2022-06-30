import {
  combine,
  ComponentDatatype,
  GltfLoader,
  PrimitiveOutlinePipelineStage,
  ShaderBuilder,
  _shadersPrimitiveOutlineStageVS,
  _shadersPrimitiveOutlineStageFS,
  Resource,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/PrimitiveOutlinePipelineStage", function () {
  const boxWithPrimitiveOutline =
    "./Data/Models/GltfLoader/BoxWithPrimitiveOutline/glTF/BoxWithPrimitiveOutline.gltf";

  let scene;
  const gltfLoaders = [];
  const resources = [];

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  function cleanup(resourcesArray) {
    for (let i = 0; i < resourcesArray.length; i++) {
      const resource = resourcesArray[i];
      if (!resource.isDestroyed()) {
        resource.destroy();
      }
    }
    resourcesArray.length = 0;
  }

  afterEach(function () {
    cleanup(resources);
    cleanup(gltfLoaders);
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

  function mockRenderResources() {
    return {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      attributes: [],
      attributeIndex: 1,
    };
  }

  it("Processes model with CESIUM_primitive_outline extension", function () {
    return loadGltf(boxWithPrimitiveOutline).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const [node] = components.nodes;
      const [primitive] = node.primitives;
      const frameState = scene.frameState;
      const renderResources = mockRenderResources();

      PrimitiveOutlinePipelineStage.process(
        renderResources,
        primitive,
        frameState
      );

      const context = frameState.context;
      const outlineTexture = context.cache.modelOutliningCache.outlineTexture;

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.model_outlineTexture()).toBe(outlineTexture);

      const shaderBuilder = renderResources.shaderBuilder;

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_PRIMITIVE_OUTLINE",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_PRIMITIVE_OUTLINE",
      ]);
      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute vec3 a_outlineCoordinates;",
      ]);
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying vec3 v_outlineCoordinates;",
      ]);
      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform sampler2D model_outlineTexture;",
      ]);
      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersPrimitiveOutlineStageVS,
      ]);
      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersPrimitiveOutlineStageFS,
      ]);

      const attributes = renderResources.attributes;
      expect(attributes.length).toBe(1);
      const [outlineCoordinates] = attributes;

      expect(outlineCoordinates.index).toBe(1);
      expect(outlineCoordinates.vertexBuffer).toBe(
        primitive.outlineCoordinates.buffer
      );
      expect(outlineCoordinates.componentsPerAttribute).toBe(3);
      expect(outlineCoordinates.componentDatatype).toBe(
        ComponentDatatype.FLOAT
      );
      expect(outlineCoordinates.offsetInBytes).toBe(0);
      expect(outlineCoordinates.strideInBytes).not.toBeDefined();
      expect(outlineCoordinates.normalize).toBe(false);
    });
  });
});
