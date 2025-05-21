import {
  GaussianSplatPipelineStage,
  combine,
  defined,
  ShaderBuilder,
  PrimitiveType,
  ModelType,
  ModelStatistics,
  GltfLoader,
  ResourceCache,
  Resource,
  BlendingState,
  Pass,
  Matrix4,
} from "../../../index.js";

import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";
import createContext from "../../../../../Specs/createContext.js";
import createScene from "../../../../../Specs/createScene.js";
import createFrameState from "../../../../../Specs/createFrameState.js";

describe(
  "Scene/Model/GaussianSplatPipelineStage",
  function () {
    const gaussianSplatUncompressed =
      "./Data/Cesium3DTiles/GaussianSplats/synthetic/0/0.gltf";

    let scene;
    let context;
    const gltfLoaders = [];

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

    function mockRenderResources(primitive) {
      const count = defined(primitive.indices)
        ? primitive.indices.count
        : primitive.attributes[0].count;

      return {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        count: count,
        model: {
          type: ModelType.TILE_GLTF,
          statistics: new ModelStatistics(),
          modelMatrix: new Matrix4(),
        },
        runtimeNode: {
          node: {},
        },
        alphaOptions: {
          pass: Pass.GAUSSIAN_SPLATS,
        },
        runtimePrimitive: {},
        renderStateOptions: {
          cull: {
            enabled: true,
          },
          depthMask: false,
          depthTest: {
            enabled: false,
          },
          blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
        },
        uniformMap: {
          u_tan_fovX: {},
          u_tan_fovY: {},
          u_focalX: {},
          u_focalY: {},
          u_splatScale: 1.0,
        },
      };
    }

    beforeAll(function () {
      scene = createScene();
      context = createContext();
    });

    afterAll(function () {
      scene.destroyForSpecs();
      context.destroyForSpecs();
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

    it("configures the render resources for Gaussian splats", function () {
      return loadGltf(gaussianSplatUncompressed, {
        generateGaussianSplatTexture: true,
      }).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const renderResources = mockRenderResources(primitive);

        const mockFrameState = createFrameState(context, scene.camera, 1);

        const shaderBuilder = renderResources.shaderBuilder;

        const originalCount = renderResources.count;
        GaussianSplatPipelineStage.process(
          renderResources,
          primitive,
          mockFrameState,
        );

        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_GAUSSIAN_SPLATS",
        ]);

        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_GAUSSIAN_SPLATS",
        ]);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          "uniform float u_tan_fovX;",
          "uniform float u_tan_fovY;",
          "uniform float u_focalX;",
          "uniform float u_focalY;",
          "uniform float u_splatScale;",
        ]);

        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "vec4 v_splatColor;",
          "vec2 v_vertPos;",
          "float v_splatOpacity;",
          "vec4 v_splatScale;",
          "vec4 v_splatRot;",
        ]);

        expect(renderResources.count).toEqual(4);
        expect(renderResources.instanceCount).toEqual(originalCount);
        expect(renderResources.primitiveType).toEqual(
          PrimitiveType.TRIANGLE_STRIP,
        );
      });
    });
  },
  "WebGL",
);
