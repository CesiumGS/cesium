import {
  Cartesian3,
  combine,
  GltfLoader,
  RuntimeModelInstancingPipelineStage,
  ModelInstancesUpdateStage,
  Math as CesiumMath,
  Buffer,
  BufferUsage,
  ModelStatistics,
  Resource,
  ResourceCache,
  SceneMode,
  ShaderBuilder,
  ModelInstance,
  Transforms,
  HeadingPitchRoll,
  Ellipsoid,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

describe(
  "Scene/Model/RuntimeModelInstancingPipelineStage",
  function () {
    const sampleGltfUrl =
      "./Data/Models/glTF-2.0/CesiumMilkTruck/glTF/CesiumMilkTruck.glb";

    let scene;
    let scene2D;
    const gltfLoaders = [];

    beforeAll(function () {
      scene = createScene();
      scene.renderForSpecs();

      scene2D = createScene();
      scene2D.renderForSpecs();
    });

    afterAll(function () {
      scene = createScene();
      scene2D.destroyForSpecs();
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

    const samplePosition1 = new Cartesian3(10, 10, 10);
    const samplePosition2 = new Cartesian3(20, 20, 20);

    const headingPositionRoll = new HeadingPitchRoll();
    const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
      "north",
      "west",
    );
    const instanceModelMatrix1 = new Transforms.headingPitchRollToFixedFrame(
      samplePosition1,
      headingPositionRoll,
      Ellipsoid.WGS84,
      fixedFrameTransform,
    );

    const instanceModelMatrix2 = new Transforms.headingPitchRollToFixedFrame(
      samplePosition2,
      headingPositionRoll,
      Ellipsoid.WGS84,
      fixedFrameTransform,
    );

    const sampleInstance1 = new ModelInstance(instanceModelMatrix1);
    const sampleInstance2 = new ModelInstance(instanceModelMatrix2);

    function mockRenderResources(node) {
      return {
        attributeIndex: 1,
        attributes: [],
        instancingTranslationMax: undefined,
        instancingTranslationMin: undefined,
        shaderBuilder: new ShaderBuilder(),
        model: {
          _modelResources: [],
          _pipelineResources: [],
          statistics: new ModelStatistics(),
          sceneGraph: {
            modelInstances: [sampleInstance1, sampleInstance2],
          },
        },
        runtimeNode: {
          node: node,
          children: [],
        },
      };
    }

    function getOptions(gltfPath, options) {
      const resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTexture: false,
      });
    }

    async function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, scene);
      return gltfLoader;
    }

    it("creates instancing matrices vertex attributes", function () {
      return loadGltf(sampleGltfUrl).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const renderResources = mockRenderResources(node);
        const runtimeNode = renderResources.runtimeNode;

        scene.renderForSpecs();
        RuntimeModelInstancingPipelineStage.process(
          renderResources,
          node,
          scene.frameState,
        );

        expect(renderResources.attributes.length).toBe(5);

        const shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_INSTANCING",
          "USE_API_INSTANCING",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_INSTANCING",
        ]);
        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
          "in vec4 a_instancingTransformRow0;",
          "in vec4 a_instancingTransformRow1;",
          "in vec4 a_instancingTransformRow2;",
          "in vec3 a_instancingPositionHigh;",
          "in vec3 a_instancingPositionLow;",
        ]);

        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          "uniform mat4 u_instance_nodeTransform;",
        ]);

        expect(runtimeNode.instancingTransformsBuffer).toBeDefined();
        // The resource will be counted by NodeStatisticsPipelineStage.
        expect(renderResources.model.statistics.geometryByteLength).toBe(0);
      });
    });

    it("correctly creates transform matrices", function () {
      return loadGltf(sampleGltfUrl).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const renderResources = mockRenderResources(node);
        const modelInstances = renderResources.model.sceneGraph.modelInstances;

        const expectedTransformsTypedArray = new Float32Array([
          -0.410076379776001, 0.7071067690849304, 0.576053261756897, 0,
          -0.410076379776001, -0.7071067690849304, 0.576053261756897, 0,
          0.8146623373031616, 0, 0.5799355506896973, 0, 0, 0, 0, 10, 10, 10,
          -0.410076379776001, 0.7071067690849304, 0.576053261756897, 0,
          -0.410076379776001, -0.7071067690849304, 0.576053261756897, 0,
          0.8146623373031616, 0, 0.5799355506896973, 0, 0, 0, 0, 20, 20, 20,
        ]);
        const transformsTypedArray =
          RuntimeModelInstancingPipelineStage._getTransformsTypedArray(
            modelInstances,
          );

        expect(transformsTypedArray.length).toEqual(
          expectedTransformsTypedArray.length,
        );
        for (let i = 0; i < expectedTransformsTypedArray.length; i++) {
          expect(transformsTypedArray[i]).toEqualEpsilon(
            expectedTransformsTypedArray[i],
            CesiumMath.EPSILON10,
          );
        }
      });
    });

    it("model instances update stage updates transform vertex attributes", function () {
      return loadGltf(sampleGltfUrl).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const renderResources = mockRenderResources(node);
        const runtimeNode = renderResources.runtimeNode;
        const sceneGraph = renderResources.model.sceneGraph;

        scene.renderForSpecs();
        RuntimeModelInstancingPipelineStage.process(
          renderResources,
          node,
          scene.frameState,
        );

        const context = scene.frameState.context;
        const usage = BufferUsage.STATIC_DRAW;

        const expectedTransformsTypedArray = new Float32Array([
          -0.410076379776001, 0.7071067690849304, 0.576053261756897, 0,
          -0.410076379776001, -0.7071067690849304, 0.576053261756897, 0,
          0.8146623373031616, 0, 0.5799355506896973, 0, 0, 0, 0, 10, 10, 10,
          -0.410076379776001, 0.7071067690849304, 0.576053261756897, 0,
          -0.410076379776001, -0.7071067690849304, 0.576053261756897, 0,
          0.8146623373031616, 0, 0.5799355506896973, 0, 0, 0, 0, 20, 20, 20,
        ]);

        const expectedTransformsBuffer = Buffer.createVertexBuffer({
          context,
          usage,
          typedArray: expectedTransformsTypedArray,
        });
        expect(runtimeNode.instancingTransformsBuffer._buffer).toEqual(
          expectedTransformsBuffer._buffer,
        );

        const samplePosition3 = new Cartesian3(30, 30, 30);
        const samplePosition4 = new Cartesian3(40, 40, 40);

        const instanceModelMatrix3 =
          new Transforms.headingPitchRollToFixedFrame(
            samplePosition3,
            headingPositionRoll,
            Ellipsoid.WGS84,
            fixedFrameTransform,
          );

        const instanceModelMatrix4 =
          new Transforms.headingPitchRollToFixedFrame(
            samplePosition4,
            headingPositionRoll,
            Ellipsoid.WGS84,
            fixedFrameTransform,
          );

        const sampleInstance3 = new ModelInstance(instanceModelMatrix3);
        const sampleInstance4 = new ModelInstance(instanceModelMatrix4);

        sceneGraph.modelInstances = [sampleInstance3, sampleInstance4];
        runtimeNode._apiInstancesDirty = true;

        const frameState = {
          mode: SceneMode.SCENE3D,
        };

        ModelInstancesUpdateStage.update(runtimeNode, sceneGraph, frameState);

        const newExpectedTransformsTypedArray = new Float32Array([
          -0.410076379776001, 0.7071067690849304, 0.576053261756897, 0,
          -0.410076379776001, -0.7071067690849304, 0.576053261756897, 0,
          0.8146623373031616, 0, 0.5799355506896973, 0, 0, 0, 0, 30, 30, 30,
          -0.410076379776001, 0.7071067690849304, 0.576053261756897, 0,
          -0.410076379776001, -0.7071067690849304, 0.576053261756897, 0,
          0.8146623373031616, 0, 0.5799355506896973, 0, 0, 0, 0, 40, 40, 40,
        ]);

        const newExpectedTransformsBuffer = Buffer.createVertexBuffer({
          context,
          usage,
          typedArray: newExpectedTransformsTypedArray,
        });

        expect(runtimeNode._apiInstancesDirty).toBeFalse();
        expect(runtimeNode.instancingTransformsBuffer._buffer).toEqual(
          newExpectedTransformsBuffer._buffer,
        );
      });
    });
  },
  "WebGL",
);
