import {
  Cartesian2,
  GltfLoader,
  MetadataPipelineStage,
  ModelStatistics,
  Resource,
  ResourceCache,
  ShaderBuilder,
  HeadingPitchRange,
  Cartesian3,
  Transforms,
} from "../../../index.js";
import Cesium3DTilesTester from "../../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../../Specs/createScene.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";

describe(
  "Scene/Model/MetadataPipelineStage",
  function () {
    const pointCloudWithPropertyAttributes =
      "./Data/Models/glTF-2.0/PointCloudWithPropertyAttributes/glTF/PointCloudWithPropertyAttributes.gltf";
    const simplePropertyTexture =
      "./Data/Models/glTF-2.0/SimplePropertyTexture/glTF/SimplePropertyTexture.gltf";
    const propertyTextureWithVectorProperties =
      "./Data/Models/glTF-2.0/PropertyTextureWithVectorProperties/glTF/PropertyTextureWithVectorProperties.gltf";
    const propertyTextureWithTextureTransformUrl =
      "./Data/Models/glTF-2.0/PropertyTextureWithTextureTransform/glTF/PropertyTextureWithTextureTransform.gltf";
    const propertyTextureWith32BitTypes =
      "./Data/Models/glTF-2.0/PropertyTextureWith32BitTypes/glTF/PropertyTextureWith32BitTypes.gltf";
    const boxTexturedBinary =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";
    const tilesetWithMetadataStatistics =
      "./Data/Cesium3DTiles/Metadata/PropertyAttributesPointCloud/tileset.json";

    let scene;
    const gltfLoaders = [];

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
      cleanup(gltfLoaders);
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    async function loadGltf(gltfPath) {
      const gltfLoader = new GltfLoader({
        gltfResource: new Resource({ url: gltfPath }),
        incrementallyLoadTextures: false,
      });
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, scene);
      return gltfLoader;
    }

    function mockRenderResources(components) {
      return {
        shaderBuilder: new ShaderBuilder(),
        model: {
          statistics: new ModelStatistics(),
          structuralMetadata: components.structuralMetadata,
        },
        uniformMap: {},
      };
    }

    function checkMetadataClassStructs(shaderBuilder, metadataTypes) {
      // Check for MetadataClass sub-structs: one for each metadata type.
      // These are constructed in both vertex and fragment shaders
      for (const metadataType of metadataTypes) {
        const structName = `${metadataType}MetadataClass`;
        const structFields = [
          `    ${metadataType} noData;`,
          `    ${metadataType} defaultValue;`,
          `    ${metadataType} minValue;`,
          `    ${metadataType} maxValue;`,
        ];
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          structName,
          structName,
          structFields,
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          structName,
          structName,
          structFields,
        );
      }
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
          [],
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          [],
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [],
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [],
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
          [],
        );
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

        expect(renderResources.uniformMap).toEqual({});
      });
    });

    it("Adds property attributes to the shader", function () {
      return loadGltf(pointCloudWithPropertyAttributes).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const node = components.nodes[0];
          const primitive = node.primitives[0];
          const frameState = scene.frameState;
          const renderResources = mockRenderResources(components);

          MetadataPipelineStage.process(renderResources, primitive, frameState);

          const shaderBuilder = renderResources.shaderBuilder;

          const metadataTypes = ["float"];
          checkMetadataClassStructs(shaderBuilder, metadataTypes);

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
            ],
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
            ],
          );
          ShaderBuilderTester.expectHasVertexFunctionUnordered(
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
            ],
          );
          ShaderBuilderTester.expectHasFragmentFunctionUnordered(
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
            ],
          );
          ShaderBuilderTester.expectHasVertexFunctionUnordered(
            shaderBuilder,
            MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
            MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
            [],
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
            0.034482758620689655,
          );
          expect(uniformMap.u_poloidalNormalized_offset()).toBe(0);
          expect(uniformMap.u_poloidalNormalized_scale()).toBe(
            0.05263157894736842,
          );
          expect(uniformMap.u_toroidalAngle_offset()).toBe(0);
          expect(uniformMap.u_toroidalAngle_scale()).toBe(0.21666156231653746);
          expect(uniformMap.u_poloidalAngle_offset()).toBe(-3.141592653589793);
          expect(uniformMap.u_poloidalAngle_scale()).toBe(0.3306939635357677);
        },
      );
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

        const metadataTypes = ["uint", "float"];
        checkMetadataClassStructs(shaderBuilder, metadataTypes);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_VS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          [],
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          [
            "    uint insideTemperature;",
            "    uint outsideTemperature;",
            "    float insulation;",
          ],
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [],
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [
            "    uint insideTemperature_unpackedValue;",
            "    uint insideTemperature_rawBits;",
            "    float insideTemperature_rawChannels = texture(u_propertyTexture_1, attributes.texCoord_0).r;",
            "    insideTemperature_rawBits = czm_unpackTexture(insideTemperature_rawChannels);",
            "    insideTemperature_unpackedValue = ((insideTemperature_rawBits));",
            "    metadata.insideTemperature = insideTemperature_unpackedValue;",
            "    uint outsideTemperature_unpackedValue;",
            "    uint outsideTemperature_rawBits;",
            "    float outsideTemperature_rawChannels = texture(u_propertyTexture_1, attributes.texCoord_0).g;",
            "    outsideTemperature_rawBits = czm_unpackTexture(outsideTemperature_rawChannels);",
            "    outsideTemperature_unpackedValue = ((outsideTemperature_rawBits));",
            "    metadata.outsideTemperature = outsideTemperature_unpackedValue;",
            "    float insulation_unpackedValue;",
            "    uint insulation_rawBits;",
            "    float insulation_rawChannels = texture(u_propertyTexture_1, attributes.texCoord_0).b;",
            "    insulation_rawBits = czm_unpackTexture(insulation_rawChannels);",
            "    insulation_unpackedValue = float((insulation_rawBits)) * 0.00392156862745098;",
            "    metadata.insulation = insulation_unpackedValue;",
            "    metadataClass.insulation.defaultValue = float(1);",
          ],
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
          [],
        );
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform sampler2D u_propertyTexture_1;",
        ]);

        // everything shares the same texture
        const structuralMetadata = renderResources.model.structuralMetadata;
        const propertyTexture1 = structuralMetadata.getPropertyTexture(0);
        const texture1 = propertyTexture1.getProperty("insulation");

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.u_propertyTexture_1()).toBe(
          texture1.textureReader.texture,
        );
      });
    });

    it("Adds property texture transform to the shader", async function () {
      const gltfLoader = await loadGltf(propertyTextureWithTextureTransformUrl);
      const components = gltfLoader.components;
      const node = components.nodes[0];
      const primitive = node.primitives[0];
      const frameState = scene.frameState;
      const renderResources = mockRenderResources(components);

      MetadataPipelineStage.process(renderResources, primitive, frameState);

      const shaderBuilder = renderResources.shaderBuilder;

      const metadataTypes = ["float"]; // Normalized UINT8
      checkMetadataClassStructs(shaderBuilder, metadataTypes);

      ShaderBuilderTester.expectHasVertexStruct(
        shaderBuilder,
        MetadataPipelineStage.STRUCT_ID_METADATA_VS,
        MetadataPipelineStage.STRUCT_NAME_METADATA,
        [],
      );
      ShaderBuilderTester.expectHasFragmentStruct(
        shaderBuilder,
        MetadataPipelineStage.STRUCT_ID_METADATA_FS,
        MetadataPipelineStage.STRUCT_NAME_METADATA,
        ["    float exampleProperty;"],
      );
      ShaderBuilderTester.expectHasVertexFunctionUnordered(
        shaderBuilder,
        MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
        MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
        [],
      );
      ShaderBuilderTester.expectHasVertexFunctionUnordered(
        shaderBuilder,
        MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
        MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
        [],
      );
      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform sampler2D u_propertyTexture_0;",
        "uniform mat3 u_propertyTexture_0Transform;",
      ]);

      // everything shares the same texture
      const structuralMetadata = renderResources.model.structuralMetadata;
      const propertyTexture0 = structuralMetadata.getPropertyTexture(0);
      const texture1 = propertyTexture0.getProperty("exampleProperty");

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_propertyTexture_0()).toBe(
        texture1.textureReader.texture,
      );
    });

    it("Handles property textures with vector values", function () {
      return loadGltf(propertyTextureWithVectorProperties).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const node = components.nodes[0];
          const primitive = node.primitives[0];
          const frameState = scene.frameState;
          const renderResources = mockRenderResources(components);

          MetadataPipelineStage.process(renderResources, primitive, frameState);

          const shaderBuilder = renderResources.shaderBuilder;

          const metadataTypes = ["vec2", "uint", "uvec3", "vec3"];
          checkMetadataClassStructs(shaderBuilder, metadataTypes);

          ShaderBuilderTester.expectHasVertexStruct(
            shaderBuilder,
            MetadataPipelineStage.STRUCT_ID_METADATA_VS,
            MetadataPipelineStage.STRUCT_NAME_METADATA,
            [],
          );
          ShaderBuilderTester.expectHasFragmentStruct(
            shaderBuilder,
            MetadataPipelineStage.STRUCT_ID_METADATA_FS,
            MetadataPipelineStage.STRUCT_NAME_METADATA,
            [
              "    vec2 vec2Property;",
              "    uint uint8Property;",
              "    uvec3 uint8vec3Property;",
              "    vec3 arrayProperty;",
              "    vec2 valueTransformProperty;",
            ],
          );

          // Check for the MetadataClass struct, containing the specific fields
          // required by this test dataset
          ShaderBuilderTester.expectHasFragmentStruct(
            shaderBuilder,
            MetadataPipelineStage.STRUCT_ID_METADATA_CLASS_FS,
            MetadataPipelineStage.STRUCT_NAME_METADATA_CLASS,
            [
              "    vec2MetadataClass vec2Property;",
              "    uintMetadataClass uint8Property;",
              "    uvec3MetadataClass uint8vec3Property;",
              "    vec3MetadataClass arrayProperty;",
              "    vec2MetadataClass valueTransformProperty;",
            ],
          );

          ShaderBuilderTester.expectHasVertexFunctionUnordered(
            shaderBuilder,
            MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
            MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
            [],
          );

          // Check that the correct values are assigned to the metadata and metadataClass structs
          ShaderBuilderTester.expectHasFragmentFunctionUnordered(
            shaderBuilder,
            MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
            MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
            [
              "    vec2 vec2Property_unpackedValue;",
              "    uint vec2Property_rawBits;",
              "    vec2 vec2Property_rawChannels = texture(u_propertyTexture_1, attributes.texCoord_0).gb;",
              "    vec2Property_rawBits = czm_unpackTexture(vec2Property_rawChannels);",
              "    vec2Property_unpackedValue[0] = float((vec2Property_rawBits)) * 0.00392156862745098;",
              "    vec2Property_rawBits = czm_unpackTexture(vec2Property_rawChannels);",
              "    vec2Property_unpackedValue[1] = float((vec2Property_rawBits)) * 0.00392156862745098;",
              "    metadata.vec2Property = vec2Property_unpackedValue;",
              "    uint uint8Property_unpackedValue;",
              "    uint uint8Property_rawBits;",
              "    float uint8Property_rawChannels = texture(u_propertyTexture_1, attributes.texCoord_0).r;",
              "    uint8Property_rawBits = czm_unpackTexture(uint8Property_rawChannels);",
              "    uint8Property_unpackedValue = ((uint8Property_rawBits));",
              "    metadata.uint8Property = uint8Property_unpackedValue;",
              "    uvec3 uint8vec3Property_unpackedValue;",
              "    uint uint8vec3Property_rawBits;",
              "    vec3 uint8vec3Property_rawChannels = texture(u_propertyTexture_1, attributes.texCoord_0).rgb;",
              "    uint8vec3Property_rawBits = czm_unpackTexture(uint8vec3Property_rawChannels);",
              "    uint8vec3Property_unpackedValue[0] = ((uint8vec3Property_rawBits));",
              "    uint8vec3Property_rawBits = czm_unpackTexture(uint8vec3Property_rawChannels);",
              "    uint8vec3Property_unpackedValue[1] = ((uint8vec3Property_rawBits));",
              "    uint8vec3Property_rawBits = czm_unpackTexture(uint8vec3Property_rawChannels);",
              "    uint8vec3Property_unpackedValue[2] = ((uint8vec3Property_rawBits));",
              "    metadata.uint8vec3Property = uint8vec3Property_unpackedValue;",
              "    metadataClass.uint8vec3Property.noData = uvec3(19,13,50);",
              "    metadataClass.uint8vec3Property.defaultValue = uvec3(255,0,0);",
              "    metadataClass.uint8vec3Property.minValue = uvec3(10,10,10);",
              "    metadataClass.uint8vec3Property.maxValue = uvec3(30,17,50);",
              "    vec3 arrayProperty_unpackedValue;",
              "    uint arrayProperty_rawBits;",
              "    vec3 arrayProperty_rawChannels = texture(u_propertyTexture_1, attributes.texCoord_0).rgb;",
              "    arrayProperty_rawBits = czm_unpackTexture(arrayProperty_rawChannels);",
              "    arrayProperty_unpackedValue[0] = float((arrayProperty_rawBits)) * 0.00392156862745098;",
              "    arrayProperty_rawBits = czm_unpackTexture(arrayProperty_rawChannels);",
              "    arrayProperty_unpackedValue[1] = float((arrayProperty_rawBits)) * 0.00392156862745098;",
              "    arrayProperty_rawBits = czm_unpackTexture(arrayProperty_rawChannels);",
              "    arrayProperty_unpackedValue[2] = float((arrayProperty_rawBits)) * 0.00392156862745098;",
              "    metadata.arrayProperty = arrayProperty_unpackedValue;",
              "    vec2 valueTransformProperty_unpackedValue;",
              "    uint valueTransformProperty_rawBits;",
              "    vec2 valueTransformProperty_rawChannels = texture(u_propertyTexture_1, attributes.texCoord_0).rg;",
              "    valueTransformProperty_rawBits = czm_unpackTexture(valueTransformProperty_rawChannels);",
              "    valueTransformProperty_unpackedValue[0] = float((valueTransformProperty_rawBits)) * 0.00392156862745098;",
              "    valueTransformProperty_rawBits = czm_unpackTexture(valueTransformProperty_rawChannels);",
              "    valueTransformProperty_unpackedValue[1] = float((valueTransformProperty_rawBits)) * 0.00392156862745098;",
              "    metadata.valueTransformProperty = czm_valueTransform(u_valueTransformProperty_offset, u_valueTransformProperty_scale, valueTransformProperty_unpackedValue);",
            ],
          );
          ShaderBuilderTester.expectHasVertexFunctionUnordered(
            shaderBuilder,
            MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
            MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
            [],
          );
          ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
          ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
            "uniform sampler2D u_propertyTexture_1;",
            "uniform vec2 u_valueTransformProperty_offset;",
            "uniform vec2 u_valueTransformProperty_scale;",
          ]);

          // everything shares the same texture.
          const structuralMetadata = renderResources.model.structuralMetadata;
          const propertyTexture1 = structuralMetadata.getPropertyTexture(0);
          const texture1 = propertyTexture1.getProperty("arrayProperty");

          const uniformMap = renderResources.uniformMap;
          expect(uniformMap.u_propertyTexture_1()).toBe(
            texture1.textureReader.texture,
          );

          expect(uniformMap.u_valueTransformProperty_offset()).toEqual(
            new Cartesian2(1, 1),
          );
          expect(uniformMap.u_valueTransformProperty_scale()).toEqual(
            new Cartesian2(2, 2),
          );
        },
      );
    });

    it("Handles property textures that use multiple channels to represent higher-precision types", function () {
      return loadGltf(propertyTextureWith32BitTypes).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const node = components.nodes[0];
          const primitive = node.primitives[0];
          const frameState = scene.frameState;
          const renderResources = mockRenderResources(components);

          MetadataPipelineStage.process(renderResources, primitive, frameState);

          const shaderBuilder = renderResources.shaderBuilder;

          checkMetadataClassStructs(shaderBuilder, ["float"]);

          ShaderBuilderTester.expectHasVertexStruct(
            shaderBuilder,
            MetadataPipelineStage.STRUCT_ID_METADATA_VS,
            MetadataPipelineStage.STRUCT_NAME_METADATA,
            [],
          );
          ShaderBuilderTester.expectHasFragmentStruct(
            shaderBuilder,
            MetadataPipelineStage.STRUCT_ID_METADATA_FS,
            MetadataPipelineStage.STRUCT_NAME_METADATA,
            ["    float insideTemperature;"],
          );

          // Check for the MetadataClass struct, containing the specific fields
          // required by this test dataset
          ShaderBuilderTester.expectHasFragmentStruct(
            shaderBuilder,
            MetadataPipelineStage.STRUCT_ID_METADATA_CLASS_FS,
            MetadataPipelineStage.STRUCT_NAME_METADATA_CLASS,
            ["    floatMetadataClass insideTemperature;"],
          );

          ShaderBuilderTester.expectHasVertexFunctionUnordered(
            shaderBuilder,
            MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
            MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
            [],
          );

          // Check that the correct values are assigned to the metadata and metadataClass structs
          ShaderBuilderTester.expectHasFragmentFunctionUnordered(
            shaderBuilder,
            MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
            MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
            [
              "    float insideTemperature_unpackedValue;",
              "    uint insideTemperature_rawBits;",
              "    vec4 insideTemperature_rawChannels = texture(u_propertyTexture_0, attributes.texCoord_0).rgba;",
              "    insideTemperature_rawBits = czm_unpackTexture(insideTemperature_rawChannels.rgba);",
              "    insideTemperature_unpackedValue = (uintBitsToFloat(insideTemperature_rawBits));",
              "    metadata.insideTemperature = insideTemperature_unpackedValue;",
            ],
          );

          ShaderBuilderTester.expectHasVertexFunctionUnordered(
            shaderBuilder,
            MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
            MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
            [],
          );
          ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
          ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
            "uniform sampler2D u_propertyTexture_0;",
          ]);
        },
      );
    });

    it("Handles a tileset with metadata statistics", function () {
      const modelPos = Cartesian3.fromDegrees(-75.152325, 39.94704);

      const offset = new HeadingPitchRange(0, 0, 5.0);
      scene.camera.lookAt(modelPos, offset);

      const tilesetOptions = {
        modelMatrix: Transforms.eastNorthUpToFixedFrame(modelPos),
      };
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithMetadataStatistics,
        tilesetOptions,
      ).then(function (tileset) {
        expect(tileset).toBeDefined();
        expect(tileset.tilesLoaded).toBe(true);

        const metadataExtension = tileset.metadataExtension;
        expect(metadataExtension).toBeDefined();
        expect(metadataExtension.statistics).toBeDefined();

        const model = tileset.root.children[1].content._model;
        expect(model).toBeDefined();

        const shaderBuilder = new ShaderBuilder();
        const renderResources = {
          shaderBuilder: shaderBuilder,
          model: model,
          uniformMap: {},
        };

        const primitive = model.sceneGraph.components.nodes[0].primitives[0];
        expect(primitive).toBeDefined();

        const frameState = scene.frameState;

        MetadataPipelineStage.process(renderResources, primitive, frameState);

        // Confirm MetadataClass sub-structs were all declared
        const metadataTypes = ["float"];
        checkMetadataClassStructs(shaderBuilder, metadataTypes);

        // Confirm MetadataStatistics sub-structs were all declared
        const structName = `floatMetadataStatistics`;
        const structFields = [
          `    float minValue;`,
          `    float maxValue;`,
          `    float mean;`,
          `    float median;`,
          `    float standardDeviation;`,
          `    float variance;`,
          `    float sum;`,
        ];
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          structName,
          structName,
          structFields,
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          structName,
          structName,
          structFields,
        );

        // Check main metadata, metadataClass, metadataStatistics structs
        const metadataFields = [
          "    float classification;",
          "    float intensity;",
        ];
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_VS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          metadataFields,
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          metadataFields,
        );

        const metadataClassFields = [
          "    floatMetadataClass classification;",
          "    floatMetadataClass intensity;",
        ];
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_CLASS_VS,
          MetadataPipelineStage.STRUCT_NAME_METADATA_CLASS,
          metadataClassFields,
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_CLASS_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA_CLASS,
          metadataClassFields,
        );

        const metadataStatisticsFields = [
          "    floatMetadataStatistics intensity;",
        ];
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_STATISTICS_VS,
          MetadataPipelineStage.STRUCT_NAME_METADATA_STATISTICS,
          metadataStatisticsFields,
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_STATISTICS_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA_STATISTICS,
          metadataStatisticsFields,
        );

        // Check that the correct values are set in the initializeMetadata function
        const assignments = [
          "    metadata.classification = attributes.classification;",
          "    metadata.intensity = attributes.intensity;",
          "    metadataStatistics.intensity.mean = float(0.28973701532415364);",
          "    metadataStatistics.intensity.median = float(0.25416669249534607);",
          "    metadataStatistics.intensity.standardDeviation = float(0.18222664489583626);",
          "    metadataStatistics.intensity.variance = float(0.03320655011);",
          "    metadataStatistics.intensity.sum = float(8500.30455558002);",
          "    metadataStatistics.intensity.minValue = float(0);",
          "    metadataStatistics.intensity.maxValue = float(0.6333333849906921);",
        ];
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          renderResources.shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          assignments,
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          renderResources.shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          assignments,
        );
      });
    });
  },
  "WebGL",
);
