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
    const boxInstanced =
      "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
    const boxTexturedBinary =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
    const buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
    const microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
    const weather = "./Data/Models/GltfLoader/Weather/glTF/weather.gltf";
    const largeFeatureIdTexture =
      "./Data/Models/GltfLoader/LargeFeatureIdTexture/glTF/LargeFeatureIdTexture.gltf";

    let scene;
    const gltfLoaders = [];
    const resources = [];

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    function cleanup(resourcesArray) {
      for (let i = 0; i < resourcesArray.length; i++) {
        const resource = resourcesArray[i];
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
      const resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTextures: false, // Default to false if not supplied
      });
    }

    function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
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
        const components = gltfLoader.components;
        const node = components.nodes[1];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
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

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap).toEqual({});
      });
    });

    it("processes feature ID attributes", function () {
      return loadGltf(weather).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
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
        const vertexBuffer = resources[0];
        expect(vertexBuffer).toBeDefined();
        expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

        expect(renderResources.attributes.length).toBe(2);
        const implicitAttribute = renderResources.attributes[1];
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

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap).toEqual({});
      });
    });

    it("processes implicit feature ID attribute with constant feature IDs", function () {
      return loadGltf(buildingsMetadata).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[1];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
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
        const vertexBuffer = resources[0];
        expect(vertexBuffer).toBeDefined();
        expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

        expect(renderResources.attributes.length).toBe(3);
        const implicitAttribute = renderResources.attributes[1];
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

        const constantAttribute = renderResources.attributes[2];
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

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap).toEqual({});
      });
    });

    it("processes feature ID texture", function () {
      return loadGltf(microcosm).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
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
            "    featureIds.featureId_0 = dot(floor(texture2D(u_featureIdTexture_0, v_texCoord_0).r * 255.0 + 0.5), 1.0);",
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

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_featureIdTexture_0).toBeDefined();
        const featureIdTexture = primitive.featureIds[0];
        expect(uniformMap.u_featureIdTexture_0()).toBe(
          featureIdTexture.textureReader.texture
        );
      });
    });

    it("processes feature ID textures with multiple channels", function () {
      return loadGltf(largeFeatureIdTexture).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
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
          [
            "    float featureId_0;",
            "    float featureId_1;",
            "    float featureId_2;",
            "    float featureId_3;",
            "    float featureId_4;",
            "    float featureId_5;",
            "    float featureId_6;",
          ]
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
            "    featureIds.featureId_0 = dot(floor(texture2D(u_featureIdTexture_0, v_texCoord_0).rgba * 255.0 + 0.5), vec4(1.0, 256.0, 65536.0, 16777216.0));",
            "    featureIds.featureId_1 = dot(floor(texture2D(u_featureIdTexture_1, v_texCoord_0).rgb * 255.0 + 0.5), vec3(1.0, 256.0, 65536.0));",
            "    featureIds.featureId_2 = dot(floor(texture2D(u_featureIdTexture_2, v_texCoord_0).g * 255.0 + 0.5), 1.0);",
            "    featureIds.featureId_3 = dot(floor(texture2D(u_featureIdTexture_3, v_texCoord_0).ba * 255.0 + 0.5), vec2(1.0, 256.0));",
            "    featureIds.featureId_4 = dot(floor(texture2D(u_featureIdTexture_4, v_texCoord_0).gr * 255.0 + 0.5), vec2(1.0, 256.0));",
            "    featureIds.featureId_5 = dot(floor(texture2D(u_featureIdTexture_5, v_texCoord_0).agbb * 255.0 + 0.5), vec4(1.0, 256.0, 65536.0, 16777216.0));",
            "    featureIds.featureId_6 = dot(floor(texture2D(u_featureIdTexture_6, v_texCoord_0).g * 255.0 + 0.5), 1.0);",
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
          "uniform sampler2D u_featureIdTexture_1;",
          "uniform sampler2D u_featureIdTexture_2;",
          "uniform sampler2D u_featureIdTexture_3;",
          "uniform sampler2D u_featureIdTexture_4;",
          "uniform sampler2D u_featureIdTexture_5;",
          "uniform sampler2D u_featureIdTexture_6;",
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

        const uniformMap = renderResources.uniformMap;
        const featureIdTexture = primitive.featureIds[0];
        // In this model, all the feature ID textures use the same PNG file
        const texture = featureIdTexture.textureReader.texture;
        expect(uniformMap.u_featureIdTexture_0()).toBe(texture);
        expect(uniformMap.u_featureIdTexture_1()).toBe(texture);
        expect(uniformMap.u_featureIdTexture_2()).toBe(texture);
        expect(uniformMap.u_featureIdTexture_3()).toBe(texture);
        expect(uniformMap.u_featureIdTexture_4()).toBe(texture);
        expect(uniformMap.u_featureIdTexture_5()).toBe(texture);
        expect(uniformMap.u_featureIdTexture_6()).toBe(texture);
      });
    });

    it("processes instance feature IDs", function () {
      return loadGltf(boxInstanced).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);

        FeatureIdPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
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
        const vertexBuffer = resources[0];
        expect(vertexBuffer).toBeDefined();
        expect(vertexBuffer.vertexArrayDestroyable).toBe(false);

        expect(renderResources.attributes.length).toBe(2);
        const implicitAttribute = renderResources.attributes[1];
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

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap).toEqual({});
      });
    });
  },
  "WebGL"
);
