import {
  combine,
  ComponentDatatype,
  FeatureIdPipelineStage,
  GltfLoader,
  ModelExperimentalStatistics,
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
          _pipelineResources: resources,
          statistics: new ModelExperimentalStatistics(),
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
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
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

        const statistics = renderResources.model.statistics;
        expect(statistics.geometryByteLength).toBe(0);
        expect(statistics.texturesByteLength).toBe(0);
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
          [
            "    int featureId_0;",
            "    int featureId_1;",
            "    int perPoint;",
            "    int town;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          [
            "    int featureId_0;",
            "    int featureId_1;",
            "    int perPoint;",
            "    int town;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = int(czm_round(a_implicit_featureId_0));",
            "    featureIds.featureId_1 = int(czm_round(attributes.featureId_0));",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = int(czm_round(v_implicit_featureId_0));",
            "    featureIds.featureId_1 = int(czm_round(attributes.featureId_0));",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          [
            "    featureIds.perPoint = featureIds.featureId_0;",
            "    featureIds.town = featureIds.featureId_1;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          [
            "    featureIds.perPoint = featureIds.featureId_0;",
            "    featureIds.town = featureIds.featureId_1;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
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

        // Only the implicit attribute is counted here, the rest are handled
        // by the geometry stage
        const statistics = renderResources.model.statistics;
        expect(statistics.geometryByteLength).toBe(vertexBuffer.sizeInBytes);
        expect(statistics.texturesByteLength).toBe(0);
      });
    });

    it("processes implicit feature ID attribute with default feature IDs", function () {
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
            "    int featureId_0;",
            "    int featureId_1;",
            "    int buildings;",
            "    int defaultIdsTest;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          [
            "    int featureId_0;",
            "    int featureId_1;",
            "    int buildings;",
            "    int defaultIdsTest;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = int(czm_round(attributes.featureId_0));",
            "    featureIds.featureId_1 = int(czm_round(a_implicit_featureId_1));",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = int(czm_round(attributes.featureId_0));",
            "    featureIds.featureId_1 = int(czm_round(v_implicit_featureId_1));",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          [
            "    featureIds.buildings = featureIds.featureId_0;",
            "    featureIds.defaultIdsTest = featureIds.featureId_1;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          [
            "    featureIds.buildings = featureIds.featureId_0;",
            "    featureIds.defaultIdsTest = featureIds.featureId_1;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS,
          ["    v_implicit_featureId_1 = a_implicit_featureId_1;"]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasAttributes(shaderBuilder, undefined, [
          "attribute float a_implicit_featureId_1;",
        ]);
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "varying float v_implicit_featureId_1;",
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

        // Only the implicit attribute is counted here, the rest are handled
        // by the geometry stage
        const statistics = renderResources.model.statistics;
        expect(statistics.geometryByteLength).toBe(vertexBuffer.sizeInBytes);
        expect(statistics.texturesByteLength).toBe(0);
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
          ["    int featureId_0;", "    int landCover;"]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = czm_unpackUint(texture2D(u_featureIdTexture_0, v_texCoord_0).r);",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          ["    featureIds.landCover = featureIds.featureId_0;"]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
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
            "    int featureId_0;",
            "    int featureId_1;",
            "    int featureId_2;",
            "    int featureId_3;",
            "    int featureId_4;",
            "    int featureId_5;",
            "    int featureId_6;",
            "    int idsRGBA;",
            "    int idsRGB;",
            "    int idsG;",
            "    int idsBA;",
            "    int idsGR;",
            "    int idsAGBB;",
            "    int idsGWithNull;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.featureId_0 = czm_unpackUint(texture2D(u_featureIdTexture_0, v_texCoord_0).rgba);",
            "    featureIds.featureId_1 = czm_unpackUint(texture2D(u_featureIdTexture_1, v_texCoord_0).rgb);",
            "    featureIds.featureId_2 = czm_unpackUint(texture2D(u_featureIdTexture_2, v_texCoord_0).g);",
            "    featureIds.featureId_3 = czm_unpackUint(texture2D(u_featureIdTexture_3, v_texCoord_0).ba);",
            "    featureIds.featureId_4 = czm_unpackUint(texture2D(u_featureIdTexture_4, v_texCoord_0).gr);",
            "    featureIds.featureId_5 = czm_unpackUint(texture2D(u_featureIdTexture_5, v_texCoord_0).agbb);",
            "    featureIds.featureId_6 = czm_unpackUint(texture2D(u_featureIdTexture_6, v_texCoord_0).g);",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          [
            "    featureIds.idsRGBA = featureIds.featureId_0;",
            "    featureIds.idsRGB = featureIds.featureId_1;",
            "    featureIds.idsG = featureIds.featureId_2;",
            "    featureIds.idsBA = featureIds.featureId_3;",
            "    featureIds.idsGR = featureIds.featureId_4;",
            "    featureIds.idsAGBB = featureIds.featureId_5;",
            "    featureIds.idsGWithNull = featureIds.featureId_6;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
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
          [
            "    int instanceFeatureId_0;",
            "    int instanceFeatureId_1;",
            "    int perInstance;",
            "    int section;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
          FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
          [
            "    int instanceFeatureId_0;",
            "    int instanceFeatureId_1;",
            "    int perInstance;",
            "    int section;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.instanceFeatureId_0 = int(czm_round(a_implicit_instanceFeatureId_0));",
            "    featureIds.instanceFeatureId_1 = int(czm_round(a_instanceFeatureId_0));",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
          [
            "    featureIds.instanceFeatureId_0 = int(czm_round(v_implicit_instanceFeatureId_0));",
            "    featureIds.instanceFeatureId_1 = int(czm_round(v_instanceFeatureId_0));",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_VS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          [
            "    featureIds.perInstance = featureIds.instanceFeatureId_0;",
            "    featureIds.section = featureIds.instanceFeatureId_1;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_FS,
          FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
          [
            "    featureIds.perInstance = featureIds.instanceFeatureId_0;",
            "    featureIds.section = featureIds.instanceFeatureId_1;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
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

        const statistics = renderResources.model.statistics;
        expect(statistics.geometryByteLength).toBe(vertexBuffer.sizeInBytes);
        expect(statistics.texturesByteLength).toBe(0);
      });
    });
  },
  "WebGL"
);
