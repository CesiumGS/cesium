import {
  Cartesian3,
  combine,
  GltfLoader,
  I3dmLoader,
  InstancingPipelineStage,
  Resource,
  ResourceCache,
  ShaderBuilder,
  Matrix4,
  Math as CesiumMath,
  _shadersInstancingStageCommon,
  _shadersLegacyInstancingStageVS,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/InstancingPipelineStage", function () {
  const boxInstanced =
    "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
  const boxInstancedTranslation =
    "./Data/Models/GltfLoader/BoxInstancedTranslation/glTF/box-instanced-translation.gltf";
  const boxInstancedTranslationMinMax =
    "./Data/Models/GltfLoader/BoxInstancedTranslationWithMinMax/glTF/box-instanced-translation-min-max.gltf";
  const i3dmInstancedOrientation =
    "./Data/Cesium3DTiles/Instanced/InstancedOrientation/instancedOrientation.i3dm";

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
    const renderResources = {
      attributeIndex: 1,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
      },
    };

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
    const renderResources = {
      attributeIndex: 1,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
      },
    };

    return loadGltf(boxInstancedTranslationMinMax).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[0];

      InstancingPipelineStage.process(renderResources, node);

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
    const renderResources = {
      attributeIndex: 1,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
      },
    };

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

      const attributeLines = renderResources.shaderBuilder._attributeLines;
      const vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      const fragmentDefineLines =
        renderResources.shaderBuilder._fragmentShaderParts.defineLines;

      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[1]).toEqual("HAS_INSTANCE_MATRICES");
      expect(fragmentDefineLines[1]).toEqual("HAS_INSTANCE_MATRICES");
      expect(attributeLines[0]).toEqual(
        "attribute vec4 a_instancingTransformRow0;"
      );
      expect(attributeLines[1]).toEqual(
        "attribute vec4 a_instancingTransformRow1;"
      );
      expect(attributeLines[2]).toEqual(
        "attribute vec4 a_instancingTransformRow2;"
      );
    });
  });

  it("creates instance matrices vertex attributes when TRANSLATION min and max are not present", function () {
    const renderResources = {
      attributeIndex: 1,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
      },
    };

    return loadGltf(boxInstancedTranslation).then(function (gltfLoader) {
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
      expect(renderResources.attributes.length).toBe(3);

      const attributeLines = renderResources.shaderBuilder._attributeLines;
      const vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      const fragmentDefineLines =
        renderResources.shaderBuilder._fragmentShaderParts.defineLines;

      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[1]).toEqual("HAS_INSTANCE_MATRICES");
      expect(fragmentDefineLines[1]).toEqual("HAS_INSTANCE_MATRICES");

      expect(attributeLines[0]).toEqual(
        "attribute vec4 a_instancingTransformRow0;"
      );
      expect(attributeLines[1]).toEqual(
        "attribute vec4 a_instancingTransformRow1;"
      );
      expect(attributeLines[2]).toEqual(
        "attribute vec4 a_instancingTransformRow2;"
      );

      expect(renderResources.model._resources.length).toEqual(1);
    });
  });

  it("correctly creates transform matrices", function () {
    const renderResources = {
      attributeIndex: 1,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
      },
    };

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
      const transformsTypedArray = InstancingPipelineStage._getInstanceTransformsTypedArray(
        node.instances,
        node.instances.attributes[0].count,
        renderResources
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
    const renderResources = {
      attributeIndex: 1,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
      },
    };

    return loadGltf(boxInstancedTranslationMinMax).then(function (gltfLoader) {
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
      expect(renderResources.attributes.length).toBe(1);

      const attributeLines = renderResources.shaderBuilder._attributeLines;
      const vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      const fragmentDefineLines =
        renderResources.shaderBuilder._fragmentShaderParts.defineLines;

      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[1]).toEqual("HAS_INSTANCE_TRANSLATION");
      expect(fragmentDefineLines[1]).toEqual("HAS_INSTANCE_TRANSLATION");

      expect(attributeLines[0]).toEqual(
        "attribute vec3 a_instanceTranslation;"
      );
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
        sceneGraph: {
          components: {
            transform: Matrix4.ZERO,
          },
        },
      },
      uniformMap: {},
      runtimeNode: {
        axisCorrectedTransform: Matrix4.IDENTITY,
      },
    };

    return loadI3dm(i3dmInstancedOrientation, {
      i3dmResource: Resource.createIfNeeded(i3dmInstancedOrientation),
    }).then(function (i3dmLoader) {
      const components = i3dmLoader.components;
      const node = components.nodes[0];
      const shaderBuilder = renderResources.shaderBuilder;
      const uniformMap = renderResources.uniformMap;
      const runtimeNode = renderResources.runtimeNode;

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

      expect(uniformMap.u_instance_modifiedModelView()).toEqual(Matrix4.ZERO);

      expect(uniformMap.u_instance_nodeTransform()).toEqual(
        runtimeNode.axisCorrectedTransform
      );
    });
  });
});
