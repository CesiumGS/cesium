import {
  combine,
  GltfLoader,
  FeatureIdPipelineStage,
  ShaderBuilder,
  ShaderDestination,
  Resource,
  ResourceCache,
  _shadersFeatureIdStageFS,
  _shadersFeatureIdStageVS,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/FeatureIdPipelineStage", function () {
  var buildingsMetadata =
    "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
  var microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
  var boxInstanced =
    "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";

  var scene;
  var gltfLoaders = [];

  var defaultShaderBuilder;

  beforeAll(function () {
    scene = createScene();
    defaultShaderBuilder = createDefaultShaderBuilder();
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

  function createDefaultShaderBuilder() {
    var shaderBuilder = new ShaderBuilder();
    shaderBuilder.addStruct(
      FeatureIdPipelineStage.STRUCT_ID_FEATURE,
      FeatureIdPipelineStage.STRUCT_NAME_FEATURE,
      ShaderDestination.BOTH
    );
    return shaderBuilder;
  }

  function verifyFeatureStruct(shaderBuilder) {
    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      FeatureIdPipelineStage.STRUCT_ID_FEATURE,
      FeatureIdPipelineStage.STRUCT_NAME_FEATURE,
      ["    int id;", "    vec2 st;", "    vec4 color;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      FeatureIdPipelineStage.STRUCT_ID_FEATURE,
      FeatureIdPipelineStage.STRUCT_NAME_FEATURE,
      ["    int id;", "    vec2 st;", "    vec4 color;"]
    );
  }

  function verifyFeatureStructFunctions(shaderBuilder) {
    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      FeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_VS,
      FeatureIdPipelineStage.FUNCTION_SIGNATURE_UPDATE_FEATURE,
      [
        "    v_activeFeatureId = float(feature.id);",
        "    v_activeFeatureSt = feature.st;",
        "    v_activeFeatureColor = feature.color;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      FeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_FS,
      FeatureIdPipelineStage.FUNCTION_SIGNATURE_UPDATE_FEATURE,
      [
        "    feature.id = int(v_activeFeatureId);",
        "    feature.st = v_activeFeatureSt;",
        "    feature.color = v_activeFeatureColor;",
      ]
    );
  }

  function getOptions(gltfPath, options) {
    var resource = new Resource({
      url: gltfPath,
    });

    return combine(options, {
      gltfResource: resource,
      incrementallyLoadTextures: false,
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

  it("processes primitive feature IDs from vertex attribute", function () {
    var renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdIndex: 0,
      },
      runtimeNode: { node: {} },
      hasFeatureIds: false,
      featureTableId: undefined,
    };

    return loadGltf(buildingsMetadata).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[1].primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      var shaderBuilder = renderResources.shaderBuilder;

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_FEATURES",
        "FEATURE_ID_ATTRIBUTE a_featureId_0",
      ]);

      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_FEATURES",
      ]);
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying float v_activeFeatureId;",
        "varying vec2 v_activeFeatureSt;",
        "varying vec4 v_activeFeatureColor;",
      ]);

      verifyFeatureStruct(shaderBuilder);
      verifyFeatureStructFunctions(shaderBuilder);

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageFS,
      ]);
    });
  });

  it("processes primitive implicit feature IDs", function () {
    var renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdIndex: 1,
        _resources: [],
      },
      attributeIndex: 4,
      attributes: [],
      runtimeNode: { node: {} },
      hasFeatureIds: false,
      propertyTableId: undefined,
      featureIdVertexAttributeSetIndex: 1,
    };

    return loadGltf(buildingsMetadata).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[1].primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      var shaderBuilder = renderResources.shaderBuilder;

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_FEATURES",
        "FEATURE_ID_ATTRIBUTE a_featureId_1",
      ]);

      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_FEATURES",
      ]);

      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute float a_featureId_1;",
      ]);
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying float v_activeFeatureId;",
        "varying vec2 v_activeFeatureSt;",
        "varying vec4 v_activeFeatureColor;",
      ]);

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageFS,
      ]);

      verifyFeatureStruct(shaderBuilder);
      verifyFeatureStructFunctions(shaderBuilder);

      expect(renderResources.featureIdVertexAttributeSetIndex).toEqual(2);

      var vertexBuffer = renderResources.model._resources[0];
      expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

      var vertexAttribute = renderResources.attributes[0];
      expect(vertexAttribute.instanceDivisor).toEqual(0);
      expect(vertexAttribute.vertexBuffer).toBe(vertexBuffer);
    });
  });

  it("processes primitive implicit feature ID constant only", function () {
    var renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdIndex: 2,
        _resources: [],
      },
      attributeIndex: 4,
      attributes: [],
      runtimeNode: { node: {} },
      hasFeatureIds: false,
      propertyTableId: undefined,
      featureIdVertexAttributeSetIndex: 1,
    };

    return loadGltf(buildingsMetadata).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[1].primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      var shaderBuilder = renderResources.shaderBuilder;

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_FEATURES",
        "FEATURE_ID_ATTRIBUTE a_featureId_1",
      ]);

      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_FEATURES",
      ]);

      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute float a_featureId_1;",
      ]);
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying float v_activeFeatureId;",
        "varying vec2 v_activeFeatureSt;",
        "varying vec4 v_activeFeatureColor;",
      ]);

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageFS,
      ]);

      verifyFeatureStruct(shaderBuilder);
      verifyFeatureStructFunctions(shaderBuilder);

      expect(renderResources.featureIdVertexAttributeSetIndex).toEqual(2);

      expect(renderResources.model._resources).toEqual([]);

      var vertexAttribute = renderResources.attributes[0];
      expect(vertexAttribute.instanceDivisor).toEqual(0);
      expect(vertexAttribute.buffer).not.toBeDefined();
      expect(vertexAttribute.value).toBe(3);
    });
  });

  it("processes instances feature IDs from vertex attribute", function () {
    var renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdIndex: 1,
      },
      runtimeNode: {},
      hasFeatureIds: false,
      propertyTableId: undefined,
    };

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var node = components.nodes[0];
      renderResources.runtimeNode.node = node;
      var primitive = node.primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      var shaderBuilder = renderResources.shaderBuilder;

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_FEATURES",
        "FEATURE_ID_ATTRIBUTE a_instanceFeatureId_0",
      ]);

      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_FEATURES",
      ]);

      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying float v_activeFeatureId;",
        "varying vec2 v_activeFeatureSt;",
        "varying vec4 v_activeFeatureColor;",
      ]);

      verifyFeatureStruct(shaderBuilder);
      verifyFeatureStructFunctions(shaderBuilder);

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageFS,
      ]);
    });
  });

  it("processes instance implicit feature IDs", function () {
    var renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdIndex: 0,
        _resources: [],
      },
      attributeIndex: 4,
      attributes: [],
      runtimeNode: { node: {} },
      hasFeatureIds: false,
      propertyTableId: undefined,
      featureIdVertexAttributeSetIndex: 1,
    };

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var node = components.nodes[0];
      renderResources.runtimeNode.node = node;
      var primitive = node.primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      var shaderBuilder = renderResources.shaderBuilder;

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_FEATURES",
        "FEATURE_ID_ATTRIBUTE a_instanceFeatureId_1",
      ]);

      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_FEATURES",
      ]);

      ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
        "attribute float a_instanceFeatureId_1;",
      ]);
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying float v_activeFeatureId;",
        "varying vec2 v_activeFeatureSt;",
        "varying vec4 v_activeFeatureColor;",
      ]);

      verifyFeatureStruct(shaderBuilder);
      verifyFeatureStructFunctions(shaderBuilder);

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureIdStageFS,
      ]);

      expect(renderResources.featureIdVertexAttributeSetIndex).toEqual(2);

      var vertexBuffer = renderResources.model._resources[0];
      expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

      var vertexAttribute = renderResources.attributes[0];
      expect(vertexAttribute.instanceDivisor).toEqual(1);
      expect(vertexAttribute.vertexBuffer).toBe(vertexBuffer);
    });
  });

  it("processes feature IDs from texture", function () {
    var renderResources = {
      attributeIndex: 1,
      hasFeatureIds: false,
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdIndex: 0,
      },
      uniformMap: {},
    };

    return loadGltf(microcosm).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[0].primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);
      expect(renderResources.hasFeatureIds).toBe(true);

      var shaderBuilder = renderResources.shaderBuilder;
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_FEATURES",
      ]);

      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_FEATURES",
        "FEATURE_ID_TEXTURE u_featureIdTexture_0",
        "FEATURE_ID_TEXCOORD v_texCoord_0",
        "FEATURE_ID_CHANNEL r",
      ]);

      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform sampler2D u_featureIdTexture_0;",
      ]);

      var expectedUniforms = {
        u_featureIdTexture_0:
          primitive.featureIdTextures[0].textureReader.texture,
      };

      expectUniformMap(renderResources.uniformMap, expectedUniforms);
    });
  });
});
