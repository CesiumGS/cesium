import {
  combine,
  GltfLoader,
  ModelStatistics,
  ModelType,
  PickingPipelineStage,
  ShaderBuilder,
  Resource,
  ResourceCache,
  defined,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/Model/PickingPipelineStage",
  function () {
    const boxVertexColors =
      "./Data/Models/GltfLoader/BoxVertexColors/glTF/BoxVertexColors.gltf";
    const boxInstanced =
      "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
    const microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";

    const mockIdObject = {};

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

    function mockRenderResources() {
      return {
        attributes: [],
        attributeIndex: 1,
        pickId: undefined,
        shaderBuilder: new ShaderBuilder(),
        model: {
          _pipelineResources: [],
          _pickIds: [],
          statistics: new ModelStatistics(),
          type: ModelType.GLTF,
        },
        runtimePrimitive: {
          primitive: {},
        },
        runtimeNode: {
          node: {},
        },
        uniformMap: {},
      };
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

      if (ModelType.is3DTiles(model.type)) {
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
      const renderResources = mockRenderResources();
      renderResources.model.type = ModelType.TILE_GLTF;

      // Setting the content property makes PickingPipelineStage handle this
      // as part of a tileset.
      renderResources.model.content = {
        tileset: {},
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

        expect(renderResources.model._pipelineResources.length).toEqual(1);
        expect(renderResources.model._pickIds.length).toEqual(1);

        expect(renderResources.pickId).toEqual("czm_pickColor");
      });
    });

    it("sets the picking variables in render resources for models", function () {
      const renderResources = mockRenderResources();

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

        expect(renderResources.model._pipelineResources.length).toEqual(1);
        expect(renderResources.model._pickIds.length).toEqual(1);

        expect(renderResources.pickId).toEqual("czm_pickColor");
      });
    });

    it("sets value for pick object id if model has an id defined", function () {
      const renderResources = mockRenderResources();
      renderResources.model.id = mockIdObject;

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
        verifyPickObject(pickObject, renderResources, undefined);
        expect(pickObject.id).toBe(mockIdObject);

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.czm_pickColor).toBeDefined();
        expect(uniformMap.czm_pickColor()).toBeDefined();

        expect(renderResources.model._pipelineResources.length).toEqual(1);
        expect(renderResources.model._pickIds.length).toEqual(1);

        expect(renderResources.pickId).toEqual("czm_pickColor");
      });
    });

    it("sets the picking variables in render resources with instancing", function () {
      const renderResources = mockRenderResources();
      renderResources.instanceCount = 4;
      renderResources.runtimeNode.node.instances = {
        featureIds: [{}, {}],
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
        expect(pickIdAttribute.vertexBuffer.sizeInBytes).toEqual(
          renderResources.instanceCount * 4
        );
        expect(pickIdAttribute.instanceDivisor).toEqual(1);

        expect(renderResources.model._pipelineResources.length).toEqual(5);
        expect(renderResources.model._pickIds.length).toEqual(4);

        const statistics = renderResources.model.statistics;
        expect(statistics.geometryByteLength).toBe(
          renderResources.instanceCount * 4
        );

        expect(renderResources.pickId).toEqual("v_pickColor");
      });
    });

    it("sets the picking variables in render resources with feature ID textures", function () {
      const mockModelFeatureTable = {
        batchTexture: {
          pickTexture: "mockPickTexture",
        },
      };

      const renderResources = mockRenderResources();
      renderResources.hasPropertyTable = true;
      renderResources.model.featureIdLabel = "featureId_0";
      renderResources.model.featureTables = [mockModelFeatureTable];

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
  },
  "WebGL"
);
