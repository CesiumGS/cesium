import {
  combine,
  GltfLoader,
  FeatureIdPipelineStage,
  ShaderBuilder,
  Resource,
  ResourceCache,
  _shadersFeatureStageCommon,
  _shadersFeatureStageFS,
  _shadersFeatureStageVS,
} from "../../../Source/Cesium.js";
import Buffer from "../../../Source/Renderer/Buffer.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/FeatureIdPipelineStage", function () {
  var buildingsMetadata =
    "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
  var microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
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
      shaderBuilder: new ShaderBuilder(),
      model: {
        featureIdAttributeIndex: 0,
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
      var vertexDefineLines = shaderBuilder._vertexShaderParts.defineLines;
      var vertexShaderLines = shaderBuilder._vertexShaderParts.shaderLines;
      var vertexVaryingLines = shaderBuilder._vertexShaderParts.varyingLines;

      var fragmentDefineLines = shaderBuilder._fragmentShaderParts.defineLines;
      var fragmentShaderLines = shaderBuilder._fragmentShaderParts.shaderLines;
      var fragmentVaryingLines =
        shaderBuilder._fragmentShaderParts.varyingLines;

      expect(vertexDefineLines[0]).toEqual("HAS_FEATURES");
      expect(fragmentDefineLines[0]).toEqual("HAS_FEATURES");

      expect(renderResources.featureTableId).toEqual("buildings");

      expect(vertexDefineLines[1]).toEqual(
        "FEATURE_ID_ATTRIBUTE a_featureId_0"
      );

      expect(vertexVaryingLines[0]).toEqual("varying float model_featureId;");
      expect(vertexVaryingLines[1]).toEqual("varying vec2 model_featureSt;");

      expect(fragmentVaryingLines[0]).toEqual("varying float model_featureId;");
      expect(fragmentVaryingLines[1]).toEqual("varying vec2 model_featureSt;");

      expect(vertexShaderLines[0]).toEqual(_shadersFeatureStageCommon);
      expect(vertexShaderLines[1]).toEqual(_shadersFeatureStageVS);
      expect(fragmentShaderLines[0]).toEqual(_shadersFeatureStageCommon);
      expect(fragmentShaderLines[1]).toEqual(_shadersFeatureStageFS);
    });
  });

  it("processes primitive implicit feature IDs", function () {
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      model: {
        featureIdAttributeIndex: 1,
        _resources: [],
      },
      attributeIndex: 4,
      attributes: [],
      runtimeNode: { node: {} },
      hasFeatureIds: false,
      featureTableId: undefined,
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
      var attributeLines = shaderBuilder._attributeLines;
      var vertexDefineLines = shaderBuilder._vertexShaderParts.defineLines;
      var vertexShaderLines = shaderBuilder._vertexShaderParts.shaderLines;
      var vertexVaryingLines = shaderBuilder._vertexShaderParts.varyingLines;

      var fragmentDefineLines = shaderBuilder._fragmentShaderParts.defineLines;
      var fragmentShaderLines = shaderBuilder._fragmentShaderParts.shaderLines;
      var fragmentVaryingLines =
        shaderBuilder._fragmentShaderParts.varyingLines;

      expect(vertexDefineLines[0]).toEqual("HAS_FEATURES");
      expect(fragmentDefineLines[0]).toEqual("HAS_FEATURES");

      expect(renderResources.featureTableId).toEqual("buildings");
      expect(renderResources.featureIdVertexAttributeSetIndex).toEqual(2);

      var vertexBuffer = renderResources.model._resources[0];
      expect(vertexBuffer).toBeInstanceOf(Buffer);
      expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

      var vertexAttribute = renderResources.attributes[0];
      expect(vertexAttribute.instanceDivisor).toEqual(0);
      expect(vertexAttribute.vertexBuffer).toBe(vertexBuffer);

      expect(attributeLines[0]).toEqual("attribute float a_featureId_1;");

      expect(vertexDefineLines[1]).toEqual(
        "FEATURE_ID_ATTRIBUTE a_featureId_1"
      );

      expect(vertexVaryingLines[0]).toEqual("varying float model_featureId;");
      expect(vertexVaryingLines[1]).toEqual("varying vec2 model_featureSt;");

      expect(fragmentVaryingLines[0]).toEqual("varying float model_featureId;");
      expect(fragmentVaryingLines[1]).toEqual("varying vec2 model_featureSt;");

      expect(vertexShaderLines[0]).toEqual(_shadersFeatureStageCommon);
      expect(vertexShaderLines[1]).toEqual(_shadersFeatureStageVS);
      expect(fragmentShaderLines[0]).toEqual(_shadersFeatureStageCommon);
      expect(fragmentShaderLines[1]).toEqual(_shadersFeatureStageFS);
    });
  });

  it("processes instances feature IDs from vertex attribute", function () {
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      model: {
        featureIdAttributeIndex: 1,
      },
      runtimeNode: {},
      hasFeatureIds: false,
      featureTableId: undefined,
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
      var vertexDefineLines = shaderBuilder._vertexShaderParts.defineLines;
      var vertexShaderLines = shaderBuilder._vertexShaderParts.shaderLines;
      var vertexVaryingLines = shaderBuilder._vertexShaderParts.varyingLines;

      var fragmentDefineLines = shaderBuilder._fragmentShaderParts.defineLines;
      var fragmentShaderLines = shaderBuilder._fragmentShaderParts.shaderLines;
      var fragmentVaryingLines =
        shaderBuilder._fragmentShaderParts.varyingLines;

      expect(vertexDefineLines[0]).toEqual("HAS_FEATURES");
      expect(fragmentDefineLines[0]).toEqual("HAS_FEATURES");

      expect(renderResources.featureTableId).toEqual("sectionTable");

      expect(vertexDefineLines[1]).toEqual(
        "FEATURE_ID_ATTRIBUTE a_instanceFeatureId_0"
      );

      expect(vertexVaryingLines[0]).toEqual("varying float model_featureId;");
      expect(vertexVaryingLines[1]).toEqual("varying vec2 model_featureSt;");

      expect(fragmentVaryingLines[0]).toEqual("varying float model_featureId;");
      expect(fragmentVaryingLines[1]).toEqual("varying vec2 model_featureSt;");

      expect(vertexShaderLines[0]).toEqual(_shadersFeatureStageCommon);
      expect(vertexShaderLines[1]).toEqual(_shadersFeatureStageVS);
      expect(fragmentShaderLines[0]).toEqual(_shadersFeatureStageCommon);
      expect(fragmentShaderLines[1]).toEqual(_shadersFeatureStageFS);
    });
  });

  it("processes instance implicit feature IDs", function () {
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      model: {
        featureIdAttributeIndex: 0,
        _resources: [],
      },
      attributeIndex: 4,
      attributes: [],
      runtimeNode: { node: {} },
      hasFeatureIds: false,
      featureTableId: undefined,
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
      var attributeLines = shaderBuilder._attributeLines;
      var vertexDefineLines = shaderBuilder._vertexShaderParts.defineLines;
      var vertexShaderLines = shaderBuilder._vertexShaderParts.shaderLines;
      var vertexVaryingLines = shaderBuilder._vertexShaderParts.varyingLines;

      var fragmentDefineLines = shaderBuilder._fragmentShaderParts.defineLines;
      var fragmentShaderLines = shaderBuilder._fragmentShaderParts.shaderLines;
      var fragmentVaryingLines =
        shaderBuilder._fragmentShaderParts.varyingLines;

      expect(vertexDefineLines[0]).toEqual("HAS_FEATURES");
      expect(fragmentDefineLines[0]).toEqual("HAS_FEATURES");

      expect(renderResources.featureTableId).toEqual("boxTable");
      expect(renderResources.featureIdVertexAttributeSetIndex).toEqual(2);

      var vertexBuffer = renderResources.model._resources[0];
      expect(vertexBuffer).toBeInstanceOf(Buffer);
      expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

      var vertexAttribute = renderResources.attributes[0];
      expect(vertexAttribute.instanceDivisor).toEqual(1);
      expect(vertexAttribute.vertexBuffer).toBe(vertexBuffer);

      expect(attributeLines[0]).toEqual(
        "attribute float a_instanceFeatureId_1;"
      );

      expect(vertexDefineLines[1]).toEqual(
        "FEATURE_ID_ATTRIBUTE a_instanceFeatureId_1"
      );

      expect(vertexVaryingLines[0]).toEqual("varying float model_featureId;");
      expect(vertexVaryingLines[1]).toEqual("varying vec2 model_featureSt;");

      expect(fragmentVaryingLines[0]).toEqual("varying float model_featureId;");
      expect(fragmentVaryingLines[1]).toEqual("varying vec2 model_featureSt;");

      expect(vertexShaderLines[0]).toEqual(_shadersFeatureStageCommon);
      expect(vertexShaderLines[1]).toEqual(_shadersFeatureStageVS);
      expect(fragmentShaderLines[0]).toEqual(_shadersFeatureStageCommon);
      expect(fragmentShaderLines[1]).toEqual(_shadersFeatureStageFS);
    });
  });

  it("processes feature IDs from texture", function () {
    var renderResources = {
      attributeIndex: 1,
      hasFeatureIds: false,
      shaderBuilder: new ShaderBuilder(),
      model: {
        featureIdTextureIndex: 0,
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

      var vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      var fragmentDefineLines =
        renderResources.shaderBuilder._fragmentShaderParts.defineLines;
      var fragmentUniformLines =
        renderResources.shaderBuilder._fragmentShaderParts.uniformLines;

      expect(vertexDefineLines[0]).toEqual("HAS_FEATURES");
      expect(fragmentDefineLines[0]).toEqual("HAS_FEATURES");

      expect(renderResources.featureTableId).toEqual("landCoverTable");

      expect(fragmentDefineLines[1]).toEqual(
        "FEATURE_ID_TEXTURE u_featureIdTexture_0"
      );
      expect(vertexDefineLines[1]).toEqual("FEATURE_ID_TEXCOORD a_texCoord_0");
      expect(fragmentDefineLines[2]).toEqual(
        "FEATURE_ID_TEXCOORD v_texCoord_0"
      );
      expect(fragmentDefineLines[3]).toEqual("FEATURE_ID_CHANNEL r");

      expect(fragmentUniformLines[0]).toEqual(
        "uniform sampler2D u_featureIdTexture_0;"
      );

      var expectedUniforms = {
        u_featureIdTexture_0:
          primitive.featureIdTextures[0].textureReader.texture,
      };

      expectUniformMap(renderResources.uniformMap, expectedUniforms);
    });
  });
});
