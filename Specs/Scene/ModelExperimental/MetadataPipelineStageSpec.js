import {
  Cartesian2,
  GltfLoader,
  MetadataPipelineStage,
  ModelExperimentalStatistics,
  Resource,
  ResourceCache,
  ShaderBuilder,
  HeadingPitchRange,
  Cartesian3,
  Transforms,
} from "../../../Source/Cesium.js";
import Cesium3DTilesTester from "../../Cesium3DTilesTester.js";
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
    const propertyTextureWithVectorProperties =
      "./Data/Models/GltfLoader/PropertyTextureWithVectorProperties/PropertyTextureWithVectorProperties.gltf";
    const boxTexturedBinary =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
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

    function loadGltf(gltfPath) {
      const gltfLoader = new GltfLoader({
        gltfResource: new Resource({ url: gltfPath }),
        incrementallyLoadTextures: false,
      });
      gltfLoaders.push(gltfLoader);
      gltfLoader.load();

      return waitForLoaderProcess(gltfLoader, scene);
    }

    function mockRenderResources(components) {
      return {
        shaderBuilder: new ShaderBuilder(),
        model: {
          statistics: new ModelExperimentalStatistics(),
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
        const structIdVs = `${structName}VS`;
        const structIdFs = `${structName}FS`;
        const structFields = [
          `    ${metadataType} noData;`,
          `    ${metadataType} defaultValue;`,
          `    ${metadataType} minValue;`,
          `    ${metadataType} maxValue;`,
        ];
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          structIdVs,
          structName,
          structFields
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          structIdFs,
          structName,
          structFields
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
          []
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          []
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
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
          ]
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
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
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

        const metadataTypes = ["int", "float"];
        checkMetadataClassStructs(shaderBuilder, metadataTypes);

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
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [
            "    metadata.insulation = texture2D(u_propertyTexture_1, attributes.texCoord_0).b;",
            "    metadata.insideTemperature = int(255.0 * texture2D(u_propertyTexture_1, attributes.texCoord_0).r);",
            "    metadata.outsideTemperature = int(255.0 * texture2D(u_propertyTexture_1, attributes.texCoord_0).g);",
            "    metadataClass.insulation.defaultValue = float(1);",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
          []
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
          texture1.textureReader.texture
        );
      });
    });

    it("Handles property textures with vector values", function () {
      return loadGltf(propertyTextureWithVectorProperties).then(function (
        gltfLoader
      ) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(components);

        MetadataPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;

        const metadataTypes = ["vec2", "int", "ivec3", "vec3"];
        checkMetadataClassStructs(shaderBuilder, metadataTypes);

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
            "    vec2 vec2Property;",
            "    int uint8Property;",
            "    ivec3 uint8vec3Property;",
            "    vec3 arrayProperty;",
            "    vec2 valueTransformProperty;",
          ]
        );

        // Check for the MetadataClass struct, containing the specific fields
        // required by this test dataset
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATACLASS_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATACLASS,
          [
            "    vec2MetadataClass vec2Property;",
            "    intMetadataClass uint8Property;",
            "    ivec3MetadataClass uint8vec3Property;",
            "    vec3MetadataClass arrayProperty;",
            "    vec2MetadataClass valueTransformProperty;",
          ]
        );

        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );

        // Check that the correct values are assigned to the metadata and metadataClass structs
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [
            "    metadata.vec2Property = texture2D(u_propertyTexture_1, attributes.texCoord_0).gb;",
            "    metadata.uint8Property = int(255.0 * texture2D(u_propertyTexture_1, attributes.texCoord_0).r);",
            "    metadata.uint8vec3Property = ivec3(255.0 * texture2D(u_propertyTexture_1, attributes.texCoord_0).rgb);",
            "    metadata.arrayProperty = texture2D(u_propertyTexture_1, attributes.texCoord_0).rgb;",
            "    metadata.valueTransformProperty = czm_valueTransform(u_valueTransformProperty_offset, u_valueTransformProperty_scale, texture2D(u_propertyTexture_1, attributes.texCoord_0).rg);",
            "    metadataClass.uint8vec3Property.defaultValue = ivec3(255,0,0);",
            "    metadataClass.uint8vec3Property.maxValue = ivec3(30,17,50);",
            "    metadataClass.uint8vec3Property.minValue = ivec3(10,10,10);",
            "    metadataClass.uint8vec3Property.noData = ivec3(19,13,50);",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
          []
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
          texture1.textureReader.texture
        );

        expect(uniformMap.u_valueTransformProperty_offset()).toEqual(
          new Cartesian2(1, 1)
        );
        expect(uniformMap.u_valueTransformProperty_scale()).toEqual(
          new Cartesian2(2, 2)
        );
      });
    });

    it("Handles a tileset with metadata statistics", function () {
      const modelPos = Cartesian3.fromDegrees(-75.152325, 39.94704);

      const offset = new HeadingPitchRange(0, 0, 5.0);
      scene.camera.lookAt(modelPos, offset);
      //scene.camera.moveRight(5);
      //scene.camera.moveUp(3);

      const tilesetOptions = {
        enableModelExperimental: true,
        modelMatrix: Transforms.eastNorthUpToFixedFrame(modelPos),
      };
      return Cesium3DTilesTester.loadTileset(
        scene,
        tilesetWithMetadataStatistics,
        tilesetOptions
      ).then(function (tileset) {
        expect(tileset).toBeDefined();
        expect(tileset.tilesLoaded).toBe(true);

        const metadataExtension = tileset.metadataExtension;
        expect(metadataExtension).toBeDefined();
        expect(metadataExtension.statistics).toBeDefined();

        const root = tileset.root;
        expect(root.hasEmptyContent).toBe(true);
        expect(root.contentReady).toBe(true);

        const child = root.children[0];
        expect(child).toBeDefined();
        expect(child.hasEmptyContent).toBe(false);
        expect(child.contentReady).toBe(false);
        expect(child.contentUnloaded).toBe(true);

        const child1 = root.children[1];
        expect(child1).toBeDefined();
        expect(child1.hasEmptyContent).toBe(false);
        expect(child1.contentReady).toBe(true);
        expect(child1.contentUnloaded).toBe(false);

        const content = child1.content;
        expect(content).toBeDefined();
        expect(Object.keys(content)).toEqual([
          "_tileset",
          "_tile",
          "_resource",
          "_model",
          "_metadata",
          "_group",
        ]);

        const model = content._model;
        expect(model).toBeDefined();

        const renderResources = {
          shaderBuilder: new ShaderBuilder(),
          model: model,
          uniformMap: {},
        };

        const primitive = model.sceneGraph.components.nodes[0].primitives[0];
        expect(primitive).toBeDefined();

        const frameState = scene.frameState;

        MetadataPipelineStage.process(renderResources, primitive, frameState);

        // Confirm MetadataClass sub-structs were all declared
        const metadataTypes = ["float"];
        checkMetadataClassStructs(renderResources.shaderBuilder, metadataTypes);

        // Confirm MetadataStatistics sub-structs were all declared
        const structName = `floatMetadataStatistics`;
        const structIdVs = `${structName}VS`;
        const structIdFs = `${structName}FS`;
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
          renderResources.shaderBuilder,
          structIdVs,
          structName,
          structFields
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          renderResources.shaderBuilder,
          structIdFs,
          structName,
          structFields
        );

        // Check that the correct values are set in the initializeMetadata function
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          renderResources.shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [
            "    metadata.classification = attributes.classification;",
            "    metadata.intensity = attributes.intensity;",
            "    metadataStatistics.intensity.mean = float(0.28973701532415364);",
            "    metadataStatistics.intensity.median = float(0.25416669249534607);",
            "    metadataStatistics.intensity.standardDeviation = float(0.18222664489583626);",
            "    metadataStatistics.intensity.variance = float(0.03320655011);",
            "    metadataStatistics.intensity.sum = float(8500.30455558002);",
            "    metadataStatistics.intensity.minValue = float(0);",
            "    metadataStatistics.intensity.maxValue = float(0.6333333849906921);",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          renderResources.shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [
            "    metadata.classification = attributes.classification;",
            "    metadata.intensity = attributes.intensity;",
            "    metadataStatistics.intensity.mean = float(0.28973701532415364);",
            "    metadataStatistics.intensity.median = float(0.25416669249534607);",
            "    metadataStatistics.intensity.standardDeviation = float(0.18222664489583626);",
            "    metadataStatistics.intensity.variance = float(0.03320655011);",
            "    metadataStatistics.intensity.sum = float(8500.30455558002);",
            "    metadataStatistics.intensity.minValue = float(0);",
            "    metadataStatistics.intensity.maxValue = float(0.6333333849906921);",
          ]
        );
      });
    });
  },
  "WebGL"
);
