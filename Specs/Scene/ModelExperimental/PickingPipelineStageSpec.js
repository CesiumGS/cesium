import {
  combine,
  GltfLoader,
  ModelExperimentalType,
  PickingPipelineStage,
  ShaderBuilder,
  Resource,
  ResourceCache,
  defined,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/PickingPipelineStage", function () {
  const boxVertexColors =
    "./Data/Models/GltfLoader/BoxVertexColors/glTF/BoxVertexColors.gltf";
  const boxInstanced =
    "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
  const microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";

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

  function loadGltf(gltfPath, options) {
    const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
    gltfLoaders.push(gltfLoader);
    gltfLoader.load();

    return waitForLoaderProcess(gltfLoader, scene);
  }

  function expectUniformMap(uniformMap, expected) {
    for (const key in expected) {
      if (expected.hasOwnProperty(key)) {
        const expectedValue = expected[key];
        const uniformFunction = uniformMap[key];
        expect(uniformFunction).toBeDefined();
        expect(uniformFunction()).toEqual(expectedValue);
      }
    }
  }

  function verifyPickObject(pickObject, renderResources, instanceId) {
    const model = renderResources.model;

    expect(pickObject).toBeDefined();
    if (ModelExperimentalType.is3DTiles(model.type)) {
      const content = model.content;
      expect(pickObject.primitive).toEqual(content.tileset);
      expect(pickObject.content).toEqual(content);
    } else {
      expect(pickObject.primitive).toEqual(model);
    }

    if (defined(instanceId)) {
      expect(pickObject.instanceId).toEqual(instanceId);
    }

    const detailPickObject = pickObject.detail;
    expect(detailPickObject).toBeDefined();
    expect(detailPickObject.model).toEqual(model);
    expect(detailPickObject.node).toEqual(renderResources.runtimeNode);
    expect(detailPickObject.primitive).toEqual(
      renderResources.runtimePrimitive
    );
  }

  it("sets the picking variables in render resources for 3D Tiles", function () {
    const renderResources = {
      attributeIndex: 1,
      pickId: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
        // Setting the content property here makes PickingPipelineStage handle this
        // as part of a tileset.
        content: {
          tileset: {},
        },
        type: ModelExperimentalType.TILE_GLTF,
      },
      runtimePrimitive: {},
      runtimeNode: {
        node: {},
      },
      uniformMap: {},
    };

    return loadGltf(boxVertexColors).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform vec4 czm_pickColor;",
      ]);

      const pickObject =
        context._pickObjects[Object.keys(context._pickObjects)[0]];
      verifyPickObject(pickObject, renderResources);

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.czm_pickColor).toBeDefined();
      expect(uniformMap.czm_pickColor()).toBeDefined();

      expect(renderResources.model._resources.length).toEqual(1);

      expect(renderResources.pickId).toEqual("czm_pickColor");
    });
  });

  it("sets the picking variables in render resources for models", function () {
    const renderResources = {
      attributeIndex: 1,
      pickId: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
        type: ModelExperimentalType.GLTF,
      },
      runtimePrimitive: {
        primitive: {},
      },
      runtimeNode: {
        node: {},
      },
      uniformMap: {},
    };

    return loadGltf(boxVertexColors).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform vec4 czm_pickColor;",
      ]);

      const pickObject =
        context._pickObjects[Object.keys(context._pickObjects)[0]];
      verifyPickObject(pickObject, renderResources);

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.czm_pickColor).toBeDefined();
      expect(uniformMap.czm_pickColor()).toBeDefined();

      expect(renderResources.model._resources.length).toEqual(1);

      expect(renderResources.pickId).toEqual("czm_pickColor");
    });
  });

  it("sets the picking variables in render resources with instancing", function () {
    const renderResources = {
      attributeIndex: 1,
      instanceCount: 4,
      pickId: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
        type: ModelExperimentalType.GLTF,
      },
      runtimePrimitive: {
        primitive: {},
      },
      runtimeNode: {
        node: {
          instances: {
            featureIds: [{}, {}],
          },
        },
      },
      attributes: [],
    };

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];
      renderResources.runtimeNode.node = components.nodes[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute vec4 a_pickColor;",
      ]);
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying vec4 v_pickColor;",
      ]);

      let i = 0;
      for (const key in context._pickObjects) {
        if (context._pickObjects.hasOwnProperty(key)) {
          const pickObject = context._pickObjects[key];
          verifyPickObject(pickObject, renderResources, i++);
        }
      }

      const pickIdAttribute = renderResources.attributes[0];
      expect(pickIdAttribute).toBeDefined();
      expect(pickIdAttribute.index).toEqual(1);
      // Each time an attribute is added, the attribute index should be incremented.
      expect(renderResources.attributeIndex).toEqual(2);
      expect(pickIdAttribute.vertexBuffer).toBeDefined();
      expect(pickIdAttribute.vertexBuffer._sizeInBytes).toEqual(
        renderResources.instanceCount * 4
      );
      expect(pickIdAttribute.instanceDivisor).toEqual(1);

      expect(renderResources.model._resources.length).toEqual(5);

      expect(renderResources.pickId).toEqual("v_pickColor");
    });
  });

  it("sets the picking variables in render resources with feature ID textures", function () {
    const mockModelFeatureTable = {
      batchTexture: {
        pickTexture: "mockPickTexture",
      },
    };

    const renderResources = {
      attributeIndex: 1,
      hasPropertyTable: true,
      pickId: undefined,
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: {
        featureIdLabel: 0,
        type: ModelExperimentalType.GLTF,
        _resources: [],
        featureTables: [mockModelFeatureTable],
      },
      runtimeNode: {
        node: {},
      },
    };

    return loadGltf(microcosm).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      const expectedUniforms = {
        model_pickTexture: mockModelFeatureTable.batchTexture.pickTexture,
      };
      expectUniformMap(renderResources.uniformMap, expectedUniforms);

      const shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform sampler2D model_pickTexture;",
      ]);

      expect(renderResources.pickId).toEqual(
        "((selectedFeature.id < int(model_featuresLength)) ? texture2D(model_pickTexture, selectedFeature.st) : vec4(0.0))"
      );
    });
  });
});
