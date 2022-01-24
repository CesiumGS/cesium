import {
  combine,
  ComponentDatatype,
  FeatureIdPipelineStage,
  GltfLoader,
  Resource,
  ResourceCache,
  ShaderBuilder,
  _shadersFeatureIdStageFS,
  _shadersFeatureIdStageVS,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/ModelExperimental/FeatureIdPipelineStage",
  function () {
    var boxInstanced =
      "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
    var boxTexturedBinary =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
    var buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
    var microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
    var weather = "./Data/Models/GltfLoader/Weather/glTF/weather.gltf";

    var scene;
    var gltfLoaders = [];
    var resources = [];

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    function cleanup(resourcesArray) {
      for (var i = 0; i < resourcesArray.length; i++) {
        var resource = resourcesArray[i];
        if (!resource.isDestroyed()) {
          resource.destroy();
        }
      }
      resourcesArray.length = 0;
    }

    afterEach(function () {
      cleanup(resources);
      cleanup(gltfLoaders);
      ResourceCache.clearForSpecs();
    });

    function getOptions(gltfPath, options) {
      var resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTextures: false, // Default to false if not supplied
      });
    }

    function loadGltf(gltfPath, options) {
      var gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      gltfLoader.load();

      return waitForLoaderProcess(gltfLoader, scene);
    }

    function mockRenderResources(node) {
      return {
        shaderBuilder: new ShaderBuilder(),
        uniformMap: {},
        model: {
          // pointer to the global resources so they can be cleaned up
          // in afterEach()
          _resources: resources,
        },
        attributes: [
          {
            semantic: VertexAttributeSemantic.POSITION,
          },
        ],
        attributeIndex: 1,
        runtimeNode: {
          node: node,
        },
      };
    }

    it("handles primitives without feature IDs gracefully", function () {
      return loadGltf(boxTexturedBinary).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var node = components.nodes[1];
        var primitive = node.primitives[0];
        var frameState = scene.frameState;
        var renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        var shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS,
          []
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, []);
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, []);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageVS,
        ]);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageFS,
        ]);

        expect(resources).toEqual([]);

        expect(renderResources.attributes.length).toBe(1);

        var uniformMap = renderResources.uniformMap;
        expect(uniformMap).toEqual({});
      });
    });

    it("processes feature ID attributes", function () {
      return loadGltf(weather).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var node = components.nodes[0];
        var primitive = node.primitives[0];
        var frameState = scene.frameState;
        var renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        var shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          ["    float featureId_0;", "    float featureId_1;"]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          ["    float featureId_0;", "    float featureId_1;"]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = a_implicit_featureId_0;",
            "    featureIds.featureId_1 = attributes.featureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = v_implicit_featureId_0;",
            "    featureIds.featureId_1 = attributes.featureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS,
          ["    v_implicit_featureId_0 = a_implicit_featureId_0;"]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
          "attribute float a_implicit_featureId_0;",
        ]);
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "varying float v_implicit_featureId_0;",
        ]);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageVS,
        ]);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageFS,
        ]);

        expect(resources.length).toBe(1);
        var vertexBuffer = resources[0];
        expect(vertexBuffer).toBeDefined();
        expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

        expect(renderResources.attributes.length).toBe(2);
        var implicitAttribute = renderResources.attributes[1];
        expect(implicitAttribute.index).toBe(1);
        expect(implicitAttribute.instanceDivisor).toBeUndefined();
        expect(implicitAttribute.value).toBeUndefined();
        expect(implicitAttribute.vertexBuffer).toBe(vertexBuffer);
        expect(implicitAttribute.normalize).toBe(false);
        expect(implicitAttribute.componentsPerAttribute).toBe(1);
        expect(implicitAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(implicitAttribute.strideInBytes).toBe(4);
        expect(implicitAttribute.offsetInBytes).toBe(0);

        var uniformMap = renderResources.uniformMap;
        expect(uniformMap).toEqual({});
      });
    });

    it("processes implicit feature ID attribute with constant feature IDs", function () {
      return loadGltf(buildingsMetadata).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var node = components.nodes[1];
        var primitive = node.primitives[0];
        var frameState = scene.frameState;
        var renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        var shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          [
            "    float featureId_0;",
            "    float featureId_1;",
            "    float featureId_2;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          [
            "    float featureId_0;",
            "    float featureId_1;",
            "    float featureId_2;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = attributes.featureId_0;",
            "    featureIds.featureId_1 = a_implicit_featureId_1;",
            "    featureIds.featureId_2 = a_implicit_featureId_2;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = attributes.featureId_0;",
            "    featureIds.featureId_1 = v_implicit_featureId_1;",
            "    featureIds.featureId_2 = v_implicit_featureId_2;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS,
          [
            "    v_implicit_featureId_1 = a_implicit_featureId_1;",
            "    v_implicit_featureId_2 = a_implicit_featureId_2;",
          ]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
          "attribute float a_implicit_featureId_1;",
          "attribute float a_implicit_featureId_2;",
        ]);
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "varying float v_implicit_featureId_1;",
          "varying float v_implicit_featureId_2;",
        ]);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageVS,
        ]);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageFS,
        ]);

        expect(resources.length).toBe(1);
        var vertexBuffer = resources[0];
        expect(vertexBuffer).toBeDefined();
        expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

        expect(renderResources.attributes.length).toBe(3);
        var implicitAttribute = renderResources.attributes[1];
        expect(implicitAttribute.index).toBe(1);
        expect(implicitAttribute.instanceDivisor).toBeUndefined();
        expect(implicitAttribute.value).toBeUndefined();
        expect(implicitAttribute.vertexBuffer).toBe(vertexBuffer);
        expect(implicitAttribute.normalize).toBe(false);
        expect(implicitAttribute.componentsPerAttribute).toBe(1);
        expect(implicitAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(implicitAttribute.strideInBytes).toBe(4);
        expect(implicitAttribute.offsetInBytes).toBe(0);

        var constantAttribute = renderResources.attributes[2];
        expect(constantAttribute.index).toBe(2);
        expect(constantAttribute.instanceDivisor).toBeUndefined();
        expect(constantAttribute.value).toEqual([3]);
        expect(constantAttribute.vertexBuffer).toBeUndefined();
        expect(constantAttribute.normalize).toBe(false);
        expect(constantAttribute.componentsPerAttribute).toBe(1);
        expect(constantAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(constantAttribute.strideInBytes).toBe(4);
        expect(constantAttribute.offsetInBytes).toBe(0);

        var uniformMap = renderResources.uniformMap;
        expect(uniformMap).toEqual({});
      });
    });

    it("processes feature ID texture", function () {
      return loadGltf(microcosm).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var node = components.nodes[0];
        var primitive = node.primitives[0];
        var frameState = scene.frameState;
        var renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        var shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          ["    float featureId_0;"]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = floor(texture2D(u_featureIdTexture_0, v_texCoord_0).r * 255.0 + 0.5);",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS,
          []
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, []);
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform sampler2D u_featureIdTexture_0;",
        ]);
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, []);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageVS,
        ]);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageFS,
        ]);

        expect(resources).toEqual([]);
        expect(renderResources.attributes.length).toBe(1);

        var uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_featureIdTexture_0).toBeDefined();
        var featureIdTexture = primitive.featureIds[0];
        expect(uniformMap.u_featureIdTexture_0()).toBe(
          featureIdTexture.textureReader.texture
        );
      });
    });

    it("processes instance feature IDs", function () {
      return loadGltf(boxInstanced).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var node = components.nodes[0];
        var primitive = node.primitives[0];
        var frameState = scene.frameState;
        var renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        var shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          ["    float instanceFeatureId_0;", "    float instanceFeatureId_1;"]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          ["    float instanceFeatureId_0;", "    float instanceFeatureId_1;"]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.instanceFeatureId_0 = a_implicit_instanceFeatureId_0;",
            "    featureIds.instanceFeatureId_1 = a_instanceFeatureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.instanceFeatureId_0 = v_implicit_instanceFeatureId_0;",
            "    featureIds.instanceFeatureId_1 = v_instanceFeatureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS,
          [
            "    v_instanceFeatureId_0 = a_instanceFeatureId_0;",
            "    v_implicit_instanceFeatureId_0 = a_implicit_instanceFeatureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
          "attribute float a_implicit_instanceFeatureId_0;",
        ]);
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "varying float v_instanceFeatureId_0;",
          "varying float v_implicit_instanceFeatureId_0;",
        ]);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageVS,
        ]);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersFeatureIdStageFS,
        ]);

        expect(resources.length).toBe(1);
        var vertexBuffer = resources[0];
        expect(vertexBuffer).toBeDefined();
        expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

        expect(renderResources.attributes.length).toBe(2);
        var implicitAttribute = renderResources.attributes[1];
        expect(implicitAttribute.index).toBe(1);
        expect(implicitAttribute.instanceDivisor).toBe(1);
        expect(implicitAttribute.value).toBeUndefined();
        expect(implicitAttribute.vertexBuffer).toBe(vertexBuffer);
        expect(implicitAttribute.normalize).toBe(false);
        expect(implicitAttribute.componentsPerAttribute).toBe(1);
        expect(implicitAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(implicitAttribute.strideInBytes).toBe(4);
        expect(implicitAttribute.offsetInBytes).toBe(0);

        var uniformMap = renderResources.uniformMap;
        expect(uniformMap).toEqual({});
      });
    });
  },
  "WebGL"
);
