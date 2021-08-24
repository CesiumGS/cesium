import {
  combine,
  GltfLoader,
  PickingPipelineStage,
  ShaderBuilder,
  Resource,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/PickingPipelineStage", function () {
  var boxVertexColors =
    "./Data/Models/GltfLoader/BoxVertexColors/glTF/BoxVertexColors.gltf";
  var boxInstanced =
    "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";

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

  it("sets the picking variables in render resources", function () {
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
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      var vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      var fragmentDefineLines =
        renderResources.shaderBuilder._fragmentShaderParts.defineLines;
      var fragmentUniformLines =
        renderResources.shaderBuilder._fragmentShaderParts.uniformLines;

      expect(vertexDefineLines[0]).toEqual("ALLOWS_PICKING");
      expect(fragmentDefineLines[0]).toEqual("ALLOWS_PICKING");
      expect(fragmentUniformLines[0]).toEqual("uniform vec4 czm_pickColor;");

      var pickObject = context._pickObjects["1"];
      expect(pickObject).toBeDefined();
      expect(pickObject.model).toBeDefined();
      expect(pickObject.node).toBeDefined();
      expect(pickObject.primitive).toBeDefined();

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
          instances: {},
        },
      },
      attributes: [],
    };

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      context._pickObjects = [];

      PickingPipelineStage.process(renderResources, primitive, frameState);

      var attributeLines = renderResources.shaderBuilder._attributeLines;
      var vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      var vertexVaryingLines =
        renderResources.shaderBuilder._vertexShaderParts.varyingLines;
      var fragmentDefineLines =
        renderResources.shaderBuilder._fragmentShaderParts.defineLines;
      var fragmentVaryingLines =
        renderResources.shaderBuilder._fragmentShaderParts.varyingLines;

      expect(attributeLines[0]).toEqual("attribute vec4 a_pickColor;");
      expect(vertexDefineLines[0]).toEqual("ALLOWS_PICKING");
      expect(fragmentDefineLines[0]).toEqual("ALLOWS_PICKING");
      expect(vertexVaryingLines[0]).toEqual("varying vec4 v_pickColor;");
      expect(fragmentVaryingLines[0]).toEqual("varying vec4 v_pickColor;");

      var i = 0;
      for (var key in context._pickObjects) {
        if (context._pickObjects.hasOwnProperty(key)) {
          var pickObject = context._pickObjects[key];
          expect(pickObject).toBeDefined();
          expect(pickObject.model).toBeDefined();
          expect(pickObject.node).toBeDefined();
          expect(pickObject.primitive).toBeDefined();
          expect(pickObject.instance).toBeDefined();
          expect(pickObject.instance.id).toEqual(i++);
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
});
