import {
  Color,
  combine,
  ComponentDatatype,
  GltfLoader,
  PrimitiveOutlinePipelineStage,
  ShaderBuilder,
  _shadersPrimitiveOutlineStageVS,
  _shadersPrimitiveOutlineStageFS,
  Resource,
  ResourceCache,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";

describe(
  "Scene/Model/PrimitiveOutlinePipelineStage",
  function () {
    const boxWithPrimitiveOutline =
      "./Data/Models/glTF-2.0/BoxWithPrimitiveOutline/glTF/BoxWithPrimitiveOutline.gltf";

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

    async function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, scene);
      return gltfLoader;
    }

    function mockRenderResources() {
      return {
        model: {
          outlineColor: Color.RED,
          showOutline: false,
        },
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
        expect(uniformMap.model_outlineColor()).toBe(Color.RED);
        expect(uniformMap.model_showOutline()).toBe(false);

        const shaderBuilder = renderResources.shaderBuilder;

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_PRIMITIVE_OUTLINE",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_PRIMITIVE_OUTLINE",
        ]);
        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
          "in vec3 a_outlineCoordinates;",
        ]);
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "vec3 v_outlineCoordinates;",
        ]);
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform bool model_showOutline;",
          "uniform sampler2D model_outlineTexture;",
          "uniform vec4 model_outlineColor;",
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
  },
  "WebGL"
);
