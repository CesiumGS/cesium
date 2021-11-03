import {
  combine,
  GltfLoader,
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
  var boxVertexColors =
    "./Data/Models/GltfLoader/BoxVertexColors/glTF/BoxVertexColors.gltf";
  var boxInstanced =
    "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
  var microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";

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
      incrementallyLoadTexture: false,
    });
  }

  function loadGltf(gltfPath, options) {
    var gltfLoader = new GltfLoader(getOptions(gltfPath, options));
    gltfLoaders.push(gltfLoader);
    gltfLoader.load();

    return waitForLoaderProcess(gltfLoader, scene);
  }

  function expectUniformMap(uniformMap, expected) {
    for (var key in expected) {
      if (expected.hasOwnProperty(key)) {
        var expectedValue = expected[key];
        var uniformFunction = uniformMap[key];
        expect(uniformFunction).toBeDefined();
        expect(uniformFunction()).toEqual(expectedValue);
      }
    }
  }

  function verifyPickObject(pickObject, renderResources, instanceId) {
    var model = renderResources.model;
    var content = model.content;

    expect(pickObject).toBeDefined();
    if (defined(content)) {
      // 3D Tiles case
      expect(pickObject.primitive).toEqual(content.tileset);
      expect(pickObject.content).toEqual(content);
    } else {
      // ModelExperimental case
      expect(pickObject.primitive).toEqual(model);
    }

    if (defined(instanceId)) {
      expect(pickObject.instanceId).toEqual(instanceId);
    }

    var detailPickObject = pickObject.detail;
    expect(detailPickObject).toBeDefined();
    expect(detailPickObject.model).toEqual(model);
    expect(detailPickObject.node).toEqual(renderResources.runtimeNode);
    expect(detailPickObject.primitive).toEqual(
      renderResources.runtimePrimitive
    );
  }

  it("sets the picking variables in render resources for 3D Tiles", function () {
    var renderResources = {
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
      },
      runtimePrimitive: {},
      runtimeNode: {
        node: {},
      },
      uniformMap: {},
    };

    return loadGltf(boxVertexColors).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      var shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform vec4 czm_pickColor;",
      ]);

      var pickObject =
        context._pickObjects[Object.keys(context._pickObjects)[0]];
      verifyPickObject(pickObject, renderResources);

      var uniformMap = renderResources.uniformMap;
      expect(uniformMap.czm_pickColor).toBeDefined();
      expect(uniformMap.czm_pickColor()).toBeDefined();

      expect(renderResources.model._resources.length).toEqual(1);

      expect(renderResources.pickId).toEqual("czm_pickColor");
    });
  });

  it("sets the picking variables in render resources for models", function () {
    var renderResources = {
      attributeIndex: 1,
      pickId: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
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
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      var shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform vec4 czm_pickColor;",
      ]);

      var pickObject =
        context._pickObjects[Object.keys(context._pickObjects)[0]];
      verifyPickObject(pickObject, renderResources);

      var uniformMap = renderResources.uniformMap;
      expect(uniformMap.czm_pickColor).toBeDefined();
      expect(uniformMap.czm_pickColor()).toBeDefined();

      expect(renderResources.model._resources.length).toEqual(1);

      expect(renderResources.pickId).toEqual("czm_pickColor");
    });
  });

  it("sets the picking variables in render resources with instancing", function () {
    var renderResources = {
      attributeIndex: 1,
      instanceCount: 4,
      pickId: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
      },
      runtimePrimitive: {
        primitive: {},
      },
      runtimeNode: {
        node: {
          instances: {
            featureIdAttributes: [{}, {}],
          },
        },
      },
      attributes: [],
    };

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];
      renderResources.runtimeNode.node = components.nodes[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      var shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute vec4 a_pickColor;",
      ]);
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying vec4 v_pickColor;",
      ]);

      var i = 0;
      for (var key in context._pickObjects) {
        if (context._pickObjects.hasOwnProperty(key)) {
          var pickObject = context._pickObjects[key];
          verifyPickObject(pickObject, renderResources, i++);
        }
      }

      var pickIdAttribute = renderResources.attributes[0];
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
    var mockModelFeatureTable = {
      batchTexture: {
        pickTexture: "mockPickTexture",
      },
    };

    var renderResources = {
      attributeIndex: 1,
      hasFeatureIds: true,
      pickId: undefined,
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: {
        featureIdTextureIndex: 0,
        _resources: [],
        featureTables: [mockModelFeatureTable],
      },
      runtimeNode: {
        node: {},
      },
    };

    return loadGltf(microcosm).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      var expectedUniforms = {
        model_pickTexture: mockModelFeatureTable.batchTexture.pickTexture,
      };
      expectUniformMap(renderResources.uniformMap, expectedUniforms);

      var shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform sampler2D model_pickTexture;",
      ]);

      expect(renderResources.pickId).toEqual(
        "((feature.id < int(model_featuresLength)) ? texture2D(model_pickTexture, feature.st) : vec4(0.0))"
      );
    });
  });
});
