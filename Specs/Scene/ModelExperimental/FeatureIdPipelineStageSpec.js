import {
  combine,
  GltfLoader,
  FeatureIdPipelineStage,
  ShaderBuilder,
  ShaderDestination,
  Resource,
  ResourceCache,
  _shadersFeatureStageCommon,
  _shadersFeatureStageFS,
  _shadersFeatureStageVS,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/FeatureIdPipelineStage", function () {
  const buildingsMetadata =
    "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
  const microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
  const boxInstanced =
    "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";

  let scene;
  const gltfLoaders = [];

  let defaultShaderBuilder;

  beforeAll(function () {
    scene = createScene();
    defaultShaderBuilder = createDefaultShaderBuilder();
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

  function createDefaultShaderBuilder() {
    const shaderBuilder = new ShaderBuilder();
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
    const resource = new Resource({
      url: gltfPath,
    });

    return combine(options, {
      gltfResource: resource,
      incrementallyLoadTextures: false,
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

  it("processes primitive feature IDs from vertex attribute", function () {
    const renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdAttributeIndex: 0,
      },
      runtimeNode: { node: {} },
      hasFeatureIds: false,
      featureTableId: undefined,
    };

    return loadGltf(buildingsMetadata).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[1].primitives[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      const shaderBuilder = renderResources.shaderBuilder;

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
        _shadersFeatureStageCommon,
        _shadersFeatureStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureStageCommon,
        _shadersFeatureStageFS,
      ]);
    });
  });

  it("processes primitive implicit feature IDs", function () {
    const renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdAttributeIndex: 1,
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
      const components = gltfLoader.components;
      const primitive = components.nodes[1].primitives[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      const shaderBuilder = renderResources.shaderBuilder;

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
        _shadersFeatureStageCommon,
        _shadersFeatureStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureStageCommon,
        _shadersFeatureStageFS,
      ]);

      verifyFeatureStruct(shaderBuilder);
      verifyFeatureStructFunctions(shaderBuilder);

      expect(renderResources.featureIdVertexAttributeSetIndex).toEqual(2);

      const vertexBuffer = renderResources.model._resources[0];
      expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

      const vertexAttribute = renderResources.attributes[0];
      expect(vertexAttribute.instanceDivisor).toEqual(0);
      expect(vertexAttribute.vertexBuffer).toBe(vertexBuffer);
    });
  });

  it("processes primitive implicit feature ID constant only", function () {
    const renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdAttributeIndex: 2,
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
      const components = gltfLoader.components;
      const primitive = components.nodes[1].primitives[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      const shaderBuilder = renderResources.shaderBuilder;

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
        _shadersFeatureStageCommon,
        _shadersFeatureStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureStageCommon,
        _shadersFeatureStageFS,
      ]);

      verifyFeatureStruct(shaderBuilder);
      verifyFeatureStructFunctions(shaderBuilder);

      expect(renderResources.featureIdVertexAttributeSetIndex).toEqual(2);

      expect(renderResources.model._resources).toEqual([]);

      const vertexAttribute = renderResources.attributes[0];
      expect(vertexAttribute.instanceDivisor).toEqual(0);
      expect(vertexAttribute.buffer).not.toBeDefined();
      expect(vertexAttribute.value).toBe(3);
    });
  });

  it("processes instances feature IDs from vertex attribute", function () {
    const renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdAttributeIndex: 1,
      },
      runtimeNode: {},
      hasFeatureIds: false,
      propertyTableId: undefined,
    };

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[0];
      renderResources.runtimeNode.node = node;
      const primitive = node.primitives[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      const shaderBuilder = renderResources.shaderBuilder;

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
        _shadersFeatureStageCommon,
        _shadersFeatureStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureStageCommon,
        _shadersFeatureStageFS,
      ]);
    });
  });

  it("processes instance implicit feature IDs", function () {
    const renderResources = {
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdAttributeIndex: 0,
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
      const components = gltfLoader.components;
      const node = components.nodes[0];
      renderResources.runtimeNode.node = node;
      const primitive = node.primitives[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);

      expect(renderResources.hasFeatureIds).toBe(true);

      const shaderBuilder = renderResources.shaderBuilder;

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
        _shadersFeatureStageCommon,
        _shadersFeatureStageVS,
      ]);

      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersFeatureStageCommon,
        _shadersFeatureStageFS,
      ]);

      expect(renderResources.featureIdVertexAttributeSetIndex).toEqual(2);

      const vertexBuffer = renderResources.model._resources[0];
      expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

      const vertexAttribute = renderResources.attributes[0];
      expect(vertexAttribute.instanceDivisor).toEqual(1);
      expect(vertexAttribute.vertexBuffer).toBe(vertexBuffer);
    });
  });

  it("processes feature IDs from texture", function () {
    const renderResources = {
      attributeIndex: 1,
      hasFeatureIds: false,
      shaderBuilder: defaultShaderBuilder.clone(),
      model: {
        featureIdTextureIndex: 0,
      },
      uniformMap: {},
    };

    return loadGltf(microcosm).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      const frameState = scene.frameState;
      const context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeatureIdPipelineStage.process(renderResources, primitive, frameState);
      expect(renderResources.hasFeatureIds).toBe(true);

      const shaderBuilder = renderResources.shaderBuilder;
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

      const expectedUniforms = {
        u_featureIdTexture_0:
          primitive.featureIdTextures[0].textureReader.texture,
      };

      expectUniformMap(renderResources.uniformMap, expectedUniforms);
    });
  });
});
