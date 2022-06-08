import {
  Axis,
  Cartesian3,
  combine,
  GltfLoader,
  I3dmLoader,
  InstancingPipelineStage,
  Matrix4,
  Math as CesiumMath,
  ModelExperimentalUtility,
  ModelExperimentalStatistics,
  Resource,
  ResourceCache,
  ShaderBuilder,
  _shadersInstancingStageCommon,
  _shadersLegacyInstancingStageVS,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/InstancingPipelineStage", function () {
  const scratchMatrix4 = new Matrix4();

  const boxInstanced =
    "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
  const boxInstancedTranslation =
    "./Data/Models/GltfLoader/BoxInstancedTranslation/glTF/box-instanced-translation.gltf";
  const boxInstancedTranslationMinMax =
    "./Data/Models/GltfLoader/BoxInstancedTranslationWithMinMax/glTF/box-instanced-translation-min-max.gltf";
  const i3dmInstancedOrientation =
    "./Data/Cesium3DTiles/Instanced/InstancedOrientation/instancedOrientation.i3dm";

  let scene;
  let scene2D;
  const gltfLoaders = [];

  beforeAll(function () {
    scene = createScene();
    scene2D = createScene();
    scene2D.morphTo2D(0.0);
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

  function mockRenderResources() {
    return {
      attributeIndex: 1,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _modelResources: [],
        _resources: [],
        statistics: new ModelExperimentalStatistics(),
      },
      runtimeNode: {},
    };
  }

  function mockRenderResourcesFor2D() {
    return {
      attributeIndex: 1,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _modelResources: [],
        _resources: [],
        statistics: new ModelExperimentalStatistics(),
        _projectTo2D: true,
        sceneGraph: {
          computedModelMatrix: Matrix4.IDENTITY,
          axisCorrectionMatrix: Matrix4.IDENTITY,
        },
      },
      runtimeNode: {
        computedTransform: Matrix4.IDENTITY,
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

  function getI3dmOptions(gltfPath, options) {
    const resource = new Resource({
      url: gltfPath,
    });

    return combine(options, {
      i3dmResource: resource,
      incrementallyLoadTexture: false,
    });
  }

  function loadGltf(gltfPath, options) {
    const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
    gltfLoaders.push(gltfLoader);
    gltfLoader.load();

    return waitForLoaderProcess(gltfLoader, scene);
  }

  function loadI3dm(i3dmPath) {
    const result = Resource.fetchArrayBuffer(i3dmPath);

    return result.then(function (arrayBuffer) {
      const i3dmLoader = new I3dmLoader(
        getI3dmOptions(i3dmPath, { arrayBuffer: arrayBuffer })
      );
      gltfLoaders.push(i3dmLoader);
      i3dmLoader.load();
      return waitForLoaderProcess(i3dmLoader, scene);
    });
  }

  it("correctly computes instancing TRANSLATION min and max from typed arrays", function () {
    const renderResources = mockRenderResources();

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[0];

      scene.renderForSpecs();
      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      expect(renderResources.instancingTranslationMax).toEqual(
        new Cartesian3(2, 2, 0)
      );
      expect(renderResources.instancingTranslationMin).toEqual(
        new Cartesian3(-2, -2, 0)
      );
      expect(renderResources.attributes.length).toBe(4);
    });
  });

  it("sets instancing TRANSLATION min and max from attributes", function () {
    const renderResources = mockRenderResources();

    return loadGltf(boxInstancedTranslationMinMax).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[0];

      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      expect(renderResources.instancingTranslationMax).toEqual(
        new Cartesian3(2, 2, 0)
      );
      expect(renderResources.instancingTranslationMin).toEqual(
        new Cartesian3(-2, -2, 0)
      );
      expect(renderResources.attributes.length).toBe(1);
    });
  });

  it("creates instancing matrices vertex attributes when ROTATION is present", function () {
    const renderResources = mockRenderResources();

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[0];

      scene.renderForSpecs();
      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      expect(renderResources.attributes.length).toBe(4);

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_MATRICES",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_MATRICES",
      ]);
      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute vec4 a_instancingTransformRow0;",
        "attribute vec4 a_instancingTransformRow1;",
        "attribute vec4 a_instancingTransformRow2;",
        "attribute float a_instanceFeatureId_0;",
      ]);

      // The model has feature IDs, so a resource will also be created
      // for those.
      expect(renderResources.model._resources.length).toEqual(2);
      expect(renderResources.model._modelResources.length).toEqual(0);

      // Matrices are stored as 3 vec4s, so this is
      // 4 matrices * 12 floats/matrix * 4 bytes/float = 192
      const matrixSize = 192;
      // 4 floats
      const featureIdSize = 16;
      expect(renderResources.model.statistics.geometryByteLength).toBe(
        matrixSize + featureIdSize
      );
    });
  });

  it("creates instance matrices vertex attributes when TRANSLATION min and max are not present", function () {
    const renderResources = mockRenderResources();

    return loadGltf(boxInstancedTranslation).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[0];

      scene.renderForSpecs();
      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      expect(renderResources.attributes.length).toBe(3);

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_MATRICES",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_MATRICES",
      ]);
      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute vec4 a_instancingTransformRow0;",
        "attribute vec4 a_instancingTransformRow1;",
        "attribute vec4 a_instancingTransformRow2;",
      ]);

      expect(renderResources.model._resources.length).toEqual(1);
      expect(renderResources.model._modelResources.length).toEqual(0);

      // Matrices are stored as 3 vec4s, so this is
      // 4 matrices * 12 floats/matrix * 4 bytes/float = 192
      const matrixSize = 192;
      const featureIdSize = 0;
      expect(renderResources.model.statistics.geometryByteLength).toBe(
        matrixSize + featureIdSize
      );
    });
  });

  it("creates instancing matrices vertex attributes for 2D", function () {
    const renderResources = mockRenderResourcesFor2D();
    return loadGltf(boxInstanced, {
      loadAttributesFor2D: true,
    }).then(function (gltfLoader) {
      const components = gltfLoader.components;
      renderResources.model.sceneGraph.components = components;
      const node = components.nodes[0];
      const runtimeNode = renderResources.runtimeNode;
      runtimeNode.node = node;

      scene2D.renderForSpecs();
      InstancingPipelineStage.process(
        renderResources,
        node,
        scene2D.frameState
      );

      expect(renderResources.attributes.length).toBe(7);

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_MATRICES",
        "USE_2D_INSTANCING",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_MATRICES",
      ]);

      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute vec4 a_instancingTransformRow0;",
        "attribute vec4 a_instancingTransformRow1;",
        "attribute vec4 a_instancingTransformRow2;",
        "attribute vec4 a_instancingTransform2DRow0;",
        "attribute vec4 a_instancingTransform2DRow1;",
        "attribute vec4 a_instancingTransform2DRow2;",
        "attribute float a_instanceFeatureId_0;",
      ]);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform mat4 u_modelView2D;",
      ]);

      expect(renderResources.instancingReferencePoint2D).toBeDefined();
      const translationMatrix = Matrix4.fromTranslation(
        renderResources.instancingReferencePoint2D,
        scratchMatrix4
      );
      const expectedMatrix = Matrix4.multiplyTransformation(
        scene2D.context.uniformState.view,
        translationMatrix,
        scratchMatrix4
      );
      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_modelView2D()).toEqual(expectedMatrix);

      expect(runtimeNode.instancingTransformsBuffer2D).toBeDefined();
      expect(renderResources.model._resources.length).toEqual(2);
      expect(renderResources.model._modelResources.length).toEqual(1);

      // The 2D buffer will be counted by NodeStatisticsPipelineStage,
      // so the memory counted here should stay the same.
      const matrixSize = 192;
      const featureIdSize = 16;
      expect(renderResources.model.statistics.geometryByteLength).toBe(
        matrixSize + featureIdSize
      );
    });
  });

  it("correctly creates transform matrices", function () {
    const renderResources = mockRenderResources();

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[0];

      const expectedTransformsTypedArray = new Float32Array([
        0.5999999642372131,
        0,
        0,
        -2,
        0,
        0.4949747323989868,
        -0.7071067094802856,
        2,
        0,
        0.49497467279434204,
        0.7071067690849304,
        0,
        0.7071068286895752,
        4.174155421310388e-8,
        0.3535534143447876,
        -2,
        0.5,
        0.7071068286895752,
        -0.2500000298023224,
        -2,
        -0.5000000596046448,
        0.7071068286895752,
        0.25,
        0,
        0.375,
        -0.10000001639127731,
        0.3535534143447876,
        2,
        0.6401650905609131,
        0.029289301484823227,
        -0.2500000298023224,
        -2,
        0.10983504354953766,
        0.1707106977701187,
        0.25,
        0,
        0.4898979365825653,
        -0.3674234449863434,
        0.44999992847442627,
        2,
        0.5277916193008423,
        0.028420301154255867,
        -0.6749999523162842,
        2,
        0.3484765887260437,
        0.4734894633293152,
        0.3897113800048828,
        0,
      ]);
      const transforms = InstancingPipelineStage._getInstanceTransformsAsMatrices(
        node.instances,
        node.instances.attributes[0].count,
        renderResources
      );
      const transformsTypedArray = InstancingPipelineStage._transformsToTypedArray(
        transforms
      );

      expect(transformsTypedArray.length).toEqual(
        expectedTransformsTypedArray.length
      );
      for (let i = 0; i < expectedTransformsTypedArray.length; i++) {
        expect(transformsTypedArray[i]).toEqualEpsilon(
          expectedTransformsTypedArray[i],
          CesiumMath.EPSILON10
        );
      }
    });
  });

  it("creates TRANSLATION vertex attributes", function () {
    const renderResources = mockRenderResources();

    return loadGltf(boxInstancedTranslationMinMax).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[0];

      scene.renderForSpecs();
      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      expect(renderResources.attributes.length).toBe(1);

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_TRANSLATION",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_TRANSLATION",
      ]);

      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute vec3 a_instanceTranslation;",
      ]);

      // No additional buffer was created
      expect(renderResources.model._resources.length).toEqual(0);
      expect(renderResources.model._modelResources.length).toEqual(0);

      // Attributes with buffers already loaded in will be counted
      // in NodeStatisticsPipelineStage
      expect(renderResources.model.statistics.geometryByteLength).toBe(0);
    });
  });

  it("creates TRANSLATION vertex attributes for 2D", function () {
    const renderResources = mockRenderResourcesFor2D();

    return loadGltf(boxInstancedTranslationMinMax, {
      loadAttributesFor2D: true,
    }).then(function (gltfLoader) {
      const components = gltfLoader.components;
      renderResources.model.sceneGraph.components = components;
      const node = components.nodes[0];
      const runtimeNode = renderResources.runtimeNode;
      runtimeNode.node = node;

      scene2D.renderForSpecs();
      InstancingPipelineStage.process(
        renderResources,
        node,
        scene2D.frameState
      );

      expect(renderResources.attributes.length).toBe(2);

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_TRANSLATION",
        "USE_2D_INSTANCING",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_TRANSLATION",
      ]);

      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute vec3 a_instanceTranslation;",
        "attribute vec3 a_instanceTranslation2D;",
      ]);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform mat4 u_modelView2D;",
      ]);

      expect(renderResources.instancingReferencePoint2D).toBeDefined();
      const translationMatrix = Matrix4.fromTranslation(
        renderResources.instancingReferencePoint2D,
        scratchMatrix4
      );
      const expectedMatrix = Matrix4.multiplyTransformation(
        scene2D.context.uniformState.view,
        translationMatrix,
        scratchMatrix4
      );
      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_modelView2D()).toEqual(expectedMatrix);

      expect(runtimeNode.instancingTranslationBuffer2D).toBeDefined();
      expect(renderResources.model._resources.length).toEqual(0);
      expect(renderResources.model._modelResources.length).toEqual(1);

      // Both resources will be counted in NodeStatisticsPipelineStage
      expect(renderResources.model.statistics.geometryByteLength).toBe(0);
    });
  });

  it("adds uniforms for legacy instancing path", function () {
    const renderResources = {
      attributeIndex: 1,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
        _modelResources: [],
        statistics: new ModelExperimentalStatistics(),
        modelMatrix: Matrix4.fromUniformScale(2.0),
        sceneGraph: {
          axisCorrectionMatrix: ModelExperimentalUtility.getAxisCorrectionMatrix(
            Axis.Y,
            Axis.Z,
            new Matrix4()
          ),
        },
      },
      uniformMap: {},
      runtimeNode: {
        computedTransform: Matrix4.fromTranslation(
          new Cartesian3(0.0, 2.0, 0.0)
        ),
      },
    };

    return loadI3dm(i3dmInstancedOrientation, {
      i3dmResource: Resource.createIfNeeded(i3dmInstancedOrientation),
    }).then(function (i3dmLoader) {
      const components = i3dmLoader.components;
      const node = components.nodes[0];
      const shaderBuilder = renderResources.shaderBuilder;
      const runtimeNode = renderResources.runtimeNode;

      // Add the loaded components to the mocked render resources, as the
      // uniform callbacks need to access this.
      renderResources.model.sceneGraph.components = components;

      scene.renderForSpecs();
      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_INSTANCING",
        "HAS_INSTANCE_MATRICES",
        "USE_LEGACY_INSTANCING",
      ]);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform mat4 u_instance_modifiedModelView;",
        "uniform mat4 u_instance_nodeTransform;",
      ]);

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersInstancingStageCommon,
        _shadersLegacyInstancingStageVS,
      ]);

      const model = renderResources.model;
      const sceneGraph = model.sceneGraph;

      // For i3dm, the model view matrix chain has to be broken up so the shader
      // can insert the instancing transform attribute.
      //
      // modifiedModelView = view * modelMatrix * rtcTransform
      const view = scene.frameState.context.uniformState.view3D;
      const modelMatrix = model.modelMatrix;
      const rtcTransform = components.transform;
      let expectedModelView = Matrix4.multiplyTransformation(
        view,
        modelMatrix,
        new Matrix4()
      );
      expectedModelView = Matrix4.multiplyTransformation(
        expectedModelView,
        rtcTransform,
        expectedModelView
      );

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_instance_modifiedModelView()).toEqualEpsilon(
        expectedModelView,
        CesiumMath.EPSILON8
      );

      // The second part of the matrix.
      //
      // nodeTransform = axisCorrection * computedTransform
      const axisCorrection = sceneGraph.axisCorrectionMatrix;
      const computedTransform = runtimeNode.computedTransform;
      const expectedNodeTransform = Matrix4.multiplyTransformation(
        axisCorrection,
        computedTransform,
        new Matrix4()
      );
      expect(uniformMap.u_instance_nodeTransform()).toEqualEpsilon(
        expectedNodeTransform,
        CesiumMath.EPSILON8
      );

      // Matrices are stored as 3 vec4s, so this is
      // 25 matrices * 12 floats/matrix * 4 bytes/float = 1200
      const matrixSize = 1200;
      // 25 floats
      const featureIdSize = 100;
      expect(renderResources.model.statistics.geometryByteLength).toBe(
        matrixSize + featureIdSize
      );
    });
  });
});
