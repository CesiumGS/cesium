import {
  Cartesian3,
  Matrix4,
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
  ModelSceneGraph,
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
          sceneGraph: new ModelSceneGraph(),
          scale: 1,
          minimumPixelSize: 0,
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

    it("creates instancing matrices vertex attributes", async function () {
      const gltfLoader = await loadGltf(sampleGltfUrl);
      const components = gltfLoader.components;
      const node = components.nodes[0];
      const renderResources = mockRenderResources(node);
      renderResources.model.sceneGraph.modelInstances._instances = [
        sampleInstance1,
        sampleInstance2,
      ];
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
        "HAS_INSTANCE_MATRICES",
        "HAS_INSTANCING",
        "USE_API_INSTANCING",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_INSTANCE_MATRICES",
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

    it("correctly creates transform matrices", async function () {
      const gltfLoader = await loadGltf(sampleGltfUrl);

      const components = gltfLoader.components;
      const node = components.nodes[0];
      const renderResources = mockRenderResources(node);
      renderResources.model.sceneGraph.modelInstances._instances = [
        sampleInstance1,
        sampleInstance2,
      ];
      const modelInstances =
        renderResources.model.sceneGraph.modelInstances._instances;

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
          renderResources.model,
          scene.frameState,
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

    it("model instances update stage updates transform vertex attributes", async function () {
      const gltfLoader = await loadGltf(sampleGltfUrl);
      const components = gltfLoader.components;
      const node = components.nodes[0];
      const renderResources = mockRenderResources(node);
      renderResources.model.sceneGraph.modelInstances._instances = [
        sampleInstance1,
        sampleInstance2,
      ];
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

      // update translation
      const samplePosition3 = new Cartesian3(30, 30, 30);
      const samplePosition4 = new Cartesian3(40, 40, 40);

      let instanceModelMatrix3 = new Transforms.headingPitchRollToFixedFrame(
        samplePosition3,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      let instanceModelMatrix4 = new Transforms.headingPitchRollToFixedFrame(
        samplePosition4,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      // update scale
      const scale = new Cartesian3(2.0, 2.0, 2.0); // Uniform 2x scale
      const scaleMatrix = Matrix4.fromScale(scale);

      instanceModelMatrix3 = Matrix4.multiply(
        instanceModelMatrix3,
        scaleMatrix,
        instanceModelMatrix3,
      );

      instanceModelMatrix4 = Matrix4.multiply(
        instanceModelMatrix4,
        scaleMatrix,
        instanceModelMatrix4,
      );

      const sampleInstance3 = new ModelInstance(instanceModelMatrix3);
      const sampleInstance4 = new ModelInstance(instanceModelMatrix4);

      // mock resources for ModelInstancesUpdateStage
      sceneGraph.modelInstances._instances = [sampleInstance3, sampleInstance4];
      sceneGraph._model = {
        minimumPixelSize: 0,
      };
      const frameState = {
        mode: SceneMode.SCENE3D,
      };

      ModelInstancesUpdateStage.update(runtimeNode, sceneGraph, frameState);

      const newExpectedTransformsTypedArray = new Float32Array([
        -0.8201527548778271, 1.414213562373095, 1.1521065309537615, 0,
        -0.8201527548778271, -1.414213562373095, 1.1521065309537615, 0,
        1.6293246813734275, 0, 1.1598711491658797, 0, 0, 0, 0, 30, 30, 30,
        -0.8201527548778271, 1.414213562373095, 1.1521065309537615, 0,
        -0.8201527548778271, -1.4142135623730954, 1.1521065309537615, 0,
        1.6293246813734275, 0, 1.1598711491658797, 0, 0, 0, 0, 40, 40, 40,
      ]);

      const newTransformsTypedArray =
        RuntimeModelInstancingPipelineStage._getTransformsTypedArray(
          [sampleInstance3, sampleInstance4],
          renderResources.model,
          scene.frameState,
        );

      expect(newTransformsTypedArray.length).toEqual(
        newExpectedTransformsTypedArray.length,
      );
      for (let i = 0; i < newExpectedTransformsTypedArray.length; i++) {
        expect(newTransformsTypedArray[i]).toEqualEpsilon(
          newExpectedTransformsTypedArray[i],
          CesiumMath.EPSILON10,
        );
      }

      expect(runtimeNode.instancingTransformsBuffer.usage).toEqual(
        BufferUsage.STATIC_DRAW,
      );
      expect(runtimeNode.instancingTransformsBuffer.sizeInBytes).toEqual(144);
    });
  },
  "WebGL",
);
