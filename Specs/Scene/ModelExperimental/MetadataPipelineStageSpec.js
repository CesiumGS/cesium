import {
  combine,
  GltfLoader,
  MetadataPipelineStage,
  Resource,
  ResourceCache,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/ModelExperimental/MetadataPipelineStage",
  function () {
    const pointCloudWithPropertyAttributes =
      "./Data/Models/GltfLoader/PointCloudWithPropertyAttributes/glTF/PointCloudWithPropertyAttributes.gltf";
    const simplePropertyTexture =
      "./Data/Models/GltfLoader/SimplePropertyTexture/SimplePropertyTexture.gltf";
    const boxTexturedBinary =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";

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

    function mockRenderResources(components) {
      return {
        shaderBuilder: new ShaderBuilder(),
        model: {
          structuralMetadata: components.structuralMetadata,
        },
        uniformMap: {},
      };
    }

    it("Handles primitives without metadata gracefully", function () {
      return loadGltf(boxTexturedBinary).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[1];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(components);

        MetadataPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_VS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          []
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
          []
        );
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

        expect(renderResources.uniformMap).toEqual({});
      });
    });

    it("Adds property attributes to the shader", function () {
      return loadGltf(pointCloudWithPropertyAttributes).then(function (
        gltfLoader
      ) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(components);

        MetadataPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_VS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          [
            "    float circleT;",
            "    float iteration;",
            "    float pointId;",
            "    float toroidalNormalized;",
            "    float poloidalNormalized;",
            "    float toroidalAngle;",
            "    float poloidalAngle;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          [
            "    float circleT;",
            "    float iteration;",
            "    float pointId;",
            "    float toroidalNormalized;",
            "    float poloidalNormalized;",
            "    float toroidalAngle;",
            "    float poloidalAngle;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [
            "    metadata.circleT = attributes.circle_t;",
            "    metadata.iteration = attributes.featureId_0;",
            "    metadata.pointId = attributes.featureId_1;",
            "    metadata.toroidalNormalized = czm_valueTransform(u_toroidalNormalized_offset, u_toroidalNormalized_scale, attributes.featureId_0);",
            "    metadata.poloidalNormalized = czm_valueTransform(u_poloidalNormalized_offset, u_poloidalNormalized_scale, attributes.featureId_1);",
            "    metadata.toroidalAngle = czm_valueTransform(u_toroidalAngle_offset, u_toroidalAngle_scale, attributes.featureId_0);",
            "    metadata.poloidalAngle = czm_valueTransform(u_poloidalAngle_offset, u_poloidalAngle_scale, attributes.featureId_1);",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [
            "    metadata.circleT = attributes.circle_t;",
            "    metadata.iteration = attributes.featureId_0;",
            "    metadata.pointId = attributes.featureId_1;",
            "    metadata.toroidalNormalized = czm_valueTransform(u_toroidalNormalized_offset, u_toroidalNormalized_scale, attributes.featureId_0);",
            "    metadata.poloidalNormalized = czm_valueTransform(u_poloidalNormalized_offset, u_poloidalNormalized_scale, attributes.featureId_1);",
            "    metadata.toroidalAngle = czm_valueTransform(u_toroidalAngle_offset, u_toroidalAngle_scale, attributes.featureId_0);",
            "    metadata.poloidalAngle = czm_valueTransform(u_poloidalAngle_offset, u_poloidalAngle_scale, attributes.featureId_1);",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
          []
        );
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
          "uniform float u_toroidalNormalized_offset;",
          "uniform float u_toroidalNormalized_scale;",
          "uniform float u_poloidalNormalized_offset;",
          "uniform float u_poloidalNormalized_scale;",
          "uniform float u_toroidalAngle_offset;",
          "uniform float u_toroidalAngle_scale;",
          "uniform float u_poloidalAngle_offset;",
          "uniform float u_poloidalAngle_scale;",
        ]);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform float u_toroidalNormalized_offset;",
          "uniform float u_toroidalNormalized_scale;",
          "uniform float u_poloidalNormalized_offset;",
          "uniform float u_poloidalNormalized_scale;",
          "uniform float u_toroidalAngle_offset;",
          "uniform float u_toroidalAngle_scale;",
          "uniform float u_poloidalAngle_offset;",
          "uniform float u_poloidalAngle_scale;",
        ]);

        // The offsets and scales should be exactly as they appear in the glTF
        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_toroidalNormalized_offset()).toBe(0);
        expect(uniformMap.u_toroidalNormalized_scale()).toBe(
          0.034482758620689655
        );
        expect(uniformMap.u_poloidalNormalized_offset()).toBe(0);
        expect(uniformMap.u_poloidalNormalized_scale()).toBe(
          0.05263157894736842
        );
        expect(uniformMap.u_toroidalAngle_offset()).toBe(0);
        expect(uniformMap.u_toroidalAngle_scale()).toBe(0.21666156231653746);
        expect(uniformMap.u_poloidalAngle_offset()).toBe(-3.141592653589793);
        expect(uniformMap.u_poloidalAngle_scale()).toBe(0.3306939635357677);
      });
    });

    it("Adds property textures to the shader", function () {
      return loadGltf(simplePropertyTexture).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(components);

        MetadataPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_VS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          [
            "    float insulation;",
            "    int insideTemperature;",
            "    int outsideTemperature;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [
            "    metadata.insulation = texture2D(u_propertyTexture_1, attributes.texCoord_0).b;",
            "    metadata.insideTemperature = int(255.0 * texture2D(u_propertyTexture_1, attributes.texCoord_0).r);",
            "    metadata.outsideTemperature = int(255.0 * texture2D(u_propertyTexture_1, attributes.texCoord_0).g);",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
          []
        );
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform sampler2D u_propertyTexture_1;",
        ]);

        const structuralMetadata = renderResources.model.structuralMetadata;
        const propertyTexture1 = structuralMetadata.getPropertyTexture(0);
        const texture1 = propertyTexture1.getProperty("insulation");

        // The offsets and scales should be exactly as they appear in the glTF
        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_propertyTexture_1()).toBe(
          texture1.textureReader.texture
        );
      });
    });

    // I want to test:
    // -- vecN properties
    // -- ivecN properties
    // -- array properties
  },
  "WebGL"
);
