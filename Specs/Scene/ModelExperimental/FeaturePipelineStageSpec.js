import {
  combine,
  GltfLoader,
  FeaturePipelineStage,
  ShaderBuilder,
  Resource,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/FeaturePipelineStage", function () {
  var buildingsMetadata =
    "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
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

  it("sets the feature variables for feature ID attribute", function () {
    var renderResources = {
      attributeIndex: 1,
      pickId: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
        _featureTable: {
          _featuresLength: 10,
          _batchTexture: {
            batchTexture: 0,
            textureDimensions: {
              y: 2,
            },
            textureStep: 2,
          },
        },
      },
      runtimePrimitive: {
        primitive: {},
      },
      runtimeNode: {
        node: {},
      },
      uniformMap: {},
    };

    return loadGltf(buildingsMetadata).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var primitive = components.nodes[1].primitives[0];

      var frameState = scene.frameState;
      var context = frameState.context;
      // Reset pick objects.
      context._pickObjects = [];

      FeaturePipelineStage.process(renderResources, primitive, frameState);

      var vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      var vertexUniformLines =
        renderResources.shaderBuilder._vertexShaderParts.uniformLines;
      var vertexVaryingLines =
        renderResources.shaderBuilder._vertexShaderParts.varyingLines;
      var fragmentVaryingLines =
        renderResources.shaderBuilder._fragmentShaderParts.varyingLines;

      expect(vertexDefineLines[0]).toEqual(
        "FEATURE_ID_ATTRIBUTE a_featureId_0"
      );

      expect(vertexUniformLines[0]).toEqual(
        "uniform float model_featuresLength;"
      );
      expect(vertexUniformLines[1]).toEqual(
        "uniform sampler2D model_batchTexture;"
      );
      expect(vertexUniformLines[2]).toEqual("uniform vec4 model_textureStep;");
      expect(vertexUniformLines[3]).toEqual(
        "uniform vec2 model_textureDimensions;"
      );

      expect(vertexVaryingLines[0]).toEqual("varying vec2 model_featureSt;");
      expect(fragmentVaryingLines[0]).toEqual("varying vec2 model_featureSt;");

      var featureTable = renderResources.model._featureTable;
      var expectedUniforms = {
        model_featuresLength: featureTable._featuresLength,
        model_batchTexture: featureTable._batchTexture.batchTexture,
        model_textureDimensions: featureTable._batchTexture.textureDimensions,
        model_textureStep: featureTable._batchTexture.textureStep,
      };

      expectUniformMap(renderResources.uniformMap, expectedUniforms);
    });
  });

  it("sets the feature variables for feature ID texture", function () {
    var renderResources = {
      attributeIndex: 1,
      pickId: undefined,
      shaderBuilder: new ShaderBuilder(),
      model: {
        _resources: [],
        _featureTable: {
          _featuresLength: 10,
          _batchTexture: {
            batchTexture: 0,
            textureDimensions: {
              y: 2,
            },
            textureStep: 2,
          },
        },
      },
      runtimePrimitive: {
        primitive: {},
      },
      runtimeNode: {
        node: {},
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

      FeaturePipelineStage.process(renderResources, primitive, frameState);

      var vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      var fragmentDefineLines =
        renderResources.shaderBuilder._fragmentShaderParts.defineLines;
      var vertexUniformLines =
        renderResources.shaderBuilder._vertexShaderParts.uniformLines;
      var fragmentUniformLines =
        renderResources.shaderBuilder._fragmentShaderParts.uniformLines;
      var vertexVaryingLines =
        renderResources.shaderBuilder._vertexShaderParts.varyingLines;
      var fragmentVaryingLines =
        renderResources.shaderBuilder._fragmentShaderParts.varyingLines;

      expect(vertexDefineLines[0]).toEqual(
        "FEATURE_ID_TEXTURE u_featureIdTexture_0"
      );
      expect(vertexDefineLines[1]).toEqual("FEATURE_ID_TEXCOORD a_texCoord_0");
      expect(vertexDefineLines[2]).toEqual("FEATURE_ID_CHANNEL r");

      expect(fragmentDefineLines[0]).toEqual(
        "FEATURE_ID_TEXTURE u_featureIdTexture_0"
      );
      expect(fragmentDefineLines[1]).toEqual(
        "FEATURE_ID_TEXCOORD v_texCoord_0"
      );
      expect(fragmentDefineLines[2]).toEqual("FEATURE_ID_CHANNEL r");

      expect(vertexUniformLines[0]).toEqual(
        "uniform sampler2D u_featureIdTexture_0;"
      );
      expect(vertexUniformLines[1]).toEqual(
        "uniform float model_featuresLength;"
      );
      expect(vertexUniformLines[2]).toEqual(
        "uniform sampler2D model_batchTexture;"
      );
      expect(vertexUniformLines[3]).toEqual("uniform vec4 model_textureStep;");
      expect(vertexUniformLines[4]).toEqual(
        "uniform vec2 model_textureDimensions;"
      );

      expect(fragmentUniformLines[0]).toEqual(
        "uniform sampler2D u_featureIdTexture_0;"
      );

      expect(vertexVaryingLines[0]).toEqual("varying vec2 model_featureSt;");
      expect(fragmentVaryingLines[0]).toEqual("varying vec2 model_featureSt;");

      var featureTable = renderResources.model._featureTable;
      var expectedUniforms = {
        u_featureIdTexture_0:
          primitive.featureIdTextures[0].textureReader.texture,
        model_featuresLength: featureTable._featuresLength,
        model_batchTexture: featureTable._batchTexture.batchTexture,
        model_textureDimensions: featureTable._batchTexture.textureDimensions,
        model_textureStep: featureTable._batchTexture.textureStep,
      };

      expectUniformMap(renderResources.uniformMap, expectedUniforms);
    });
  });
});
