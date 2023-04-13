import {
  AttributeType,
  combine,
  ComponentDatatype,
  defined,
  GeometryPipelineStage,
  ModelStatistics,
  GltfLoader,
  ModelType,
  Resource,
  ResourceCache,
  SelectedFeatureIdPipelineStage,
  ShaderBuilder,
  VertexAttributeSemantic,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import waitForLoaderProcess from "../../../../../Specs/waitForLoaderProcess.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

describe(
  "Scene/Model/GeometryPipelineStage",
  function () {
    const positionOnlyPrimitive = {
      attributes: [
        {
          semantic: VertexAttributeSemantic.POSITION,
          buffer: new Float32Array([0, 1, 2, 3, 4, 5]).buffer,
          count: 2,
          type: AttributeType.VEC3,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          byteStride: 12,
        },
      ],
    };

    const customAttributePrimitive = {
      attributes: [
        {
          semantic: VertexAttributeSemantic.POSITION,
          buffer: new Float32Array([0, 1, 2, 3, 4, 5]).buffer,
          count: 2,
          type: AttributeType.VEC3,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          byteStride: 12,
        },
        {
          name: "_TEMPERATURE",
          buffer: new Uint32Array([0, 1, 2, 3, 4, 5]).buffer,
          count: 3,
          type: AttributeType.VEC2,
          componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
          byteOffset: 0,
          byteStride: 4,
        },
      ],
    };

    const boomBoxSpecularGlossiness =
      "./Data/Models/glTF-2.0/BoomBox/glTF-pbrSpecularGlossiness/BoomBox.gltf";
    const boxTextured =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";
    const boxTexturedWithPropertyAttributes =
      "./Data/Models/glTF-2.0/BoxTexturedWithPropertyAttributes/glTF/BoxTexturedWithPropertyAttributes.gltf";
    const boxVertexColors =
      "./Data/Models/glTF-2.0/BoxVertexColors/glTF/BoxVertexColors.gltf";
    const pointCloudRGB =
      "./Data/Models/glTF-2.0/PointCloudWithRGBColors/glTF-Binary/PointCloudWithRGBColors.glb";
    const microcosm = "./Data/Models/glTF-2.0/Microcosm/glTF/microcosm.gltf";
    const weather = "./Data/Models/glTF-2.0/Weather/glTF/weather.gltf";
    const buildingsMetadata =
      "./Data/Models/glTF-2.0/BuildingsMetadata/glTF/buildings-metadata.gltf";
    const dracoMilkTruck =
      "./Data/Models/glTF-2.0/CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf";
    const dracoBoxWithTangents =
      "./Data/Models/glTF-2.0/BoxWithTangents/glTF-Draco/BoxWithTangents.gltf";
    const boxInstancedTranslationUrl =
      "./Data/Models/glTF-2.0/BoxInstancedTranslation/glTF/box-instanced-translation.gltf";

    let scene;
    let scene2D;
    const gltfLoaders = [];

    beforeAll(function () {
      scene = createScene();
      scene2D = createScene();
      scene2D.morphTo2D(0.0);
      scene2D.updateFrameState();
    });

    afterAll(function () {
      scene.destroyForSpecs();
      scene2D.destroyForSpecs();
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

    function verifyFeatureStruct(shaderBuilder) {
      ShaderBuilderTester.expectHasVertexStruct(
        shaderBuilder,
        SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE,
        SelectedFeatureIdPipelineStage.STRUCT_NAME_SELECTED_FEATURE,
        []
      );
      ShaderBuilderTester.expectHasFragmentStruct(
        shaderBuilder,
        SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE,
        SelectedFeatureIdPipelineStage.STRUCT_NAME_SELECTED_FEATURE,
        []
      );
    }

    function getOptions(gltfPath, options) {
      const resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTextures: false, // Default to false if not supplied
      });
    }

    async function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, scene);
      return gltfLoader;
    }

    function mockRenderResources(primitive) {
      const count = defined(primitive.indices)
        ? primitive.indices.count
        : primitive.attributes[0].count;

      return {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        count: count,
        model: {
          type: ModelType.TILE_GLTF,
          statistics: new ModelStatistics(),
        },
        runtimeNode: {
          node: {},
        },
        runtimePrimitive: {},
      };
    }

    it("processes POSITION attribute from primitive", function () {
      const renderResources = mockRenderResources(positionOnlyPrimitive);

      GeometryPipelineStage.process(
        renderResources,
        positionOnlyPrimitive,
        scene.frameState
      );

      const shaderBuilder = renderResources.shaderBuilder;
      const attributes = renderResources.attributes;

      expect(attributes.length).toEqual(1);
      const positionAttribute = attributes[0];
      expect(positionAttribute.index).toEqual(0);
      expect(positionAttribute.vertexBuffer).toBeDefined();
      expect(positionAttribute.componentsPerAttribute).toEqual(3);
      expect(positionAttribute.componentDatatype).toEqual(
        ComponentDatatype.FLOAT
      );
      expect(positionAttribute.offsetInBytes).toBe(0);
      expect(positionAttribute.strideInBytes).toBe(12);

      ShaderBuilderTester.expectHasVertexStruct(
        shaderBuilder,
        GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
        GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
        ["    vec3 positionMC;"]
      );
      ShaderBuilderTester.expectHasFragmentStruct(
        shaderBuilder,
        GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
        GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
        ["    vec3 positionMC;", "    vec3 positionWC;", "    vec3 positionEC;"]
      );
      ShaderBuilderTester.expectHasVertexFunctionUnordered(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
        GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
        ["    attributes.positionMC = a_positionMC;"]
      );
      ShaderBuilderTester.expectHasVertexFunctionUnordered(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
        GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
        []
      );
      ShaderBuilderTester.expectHasFragmentFunctionUnordered(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
        GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
        []
      );
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "vec3 v_positionEC;",
        "vec3 v_positionMC;",
        "vec3 v_positionWC;",
      ]);
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasAttributes(
        shaderBuilder,
        "in vec3 a_positionMC;",
        []
      );
      verifyFeatureStruct(shaderBuilder);
    });

    it("processes POSITION, NORMAL and TEXCOORD attributes from primitive", function () {
      return loadGltf(boxTextured).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(3);

        const normalAttribute = attributes[0];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);

        const positionAttribute = attributes[1];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(288);
        expect(positionAttribute.strideInBytes).toBe(12);

        const texCoord0Attribute = attributes[2];
        expect(texCoord0Attribute.index).toEqual(2);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).toBe(8);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          ["    vec3 positionMC;", "    vec3 normalMC;", "    vec2 texCoord_0;"]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec3 normalEC;",
            "    vec2 texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.normalMC = a_normalMC;",
            "    attributes.texCoord_0 = a_texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    v_texCoord_0 = attributes.texCoord_0;"]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    attributes.texCoord_0 = v_texCoord_0;"]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "vec3 v_normalEC;",
          "vec2 v_texCoord_0;",
          "vec3 v_positionEC;",
          "vec3 v_positionMC;",
          "vec3 v_positionWC;",
        ]);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          ["in vec3 a_normalMC;", "in vec2 a_texCoord_0;"]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes POSITION attribute from primitive for 2D", function () {
      return loadGltf(boxTextured).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderResources = mockRenderResources(primitive);
        const runtimePrimitive = renderResources.runtimePrimitive;

        renderResources.model._projectTo2D = true;
        runtimePrimitive.positionBuffer2D = {};

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene2D.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(4);

        const normalAttribute = attributes[0];
        expect(normalAttribute.index).toEqual(1);

        const positionAttribute = attributes[1];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(288);
        expect(positionAttribute.strideInBytes).toBe(12);

        const position2DAttribute = attributes[2];
        expect(position2DAttribute.index).toEqual(2);
        expect(position2DAttribute.vertexBuffer).toBe(
          runtimePrimitive.positionBuffer2D
        );
        expect(position2DAttribute.componentsPerAttribute).toEqual(3);
        expect(position2DAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(position2DAttribute.offsetInBytes).toBe(0);
        expect(position2DAttribute.strideInBytes).toBeUndefined();

        const texCoord0Attribute = attributes[3];
        expect(texCoord0Attribute.index).toEqual(3);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 position2D;",
            "    vec3 normalMC;",
            "    vec2 texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.position2D = a_position2D;",
            "    attributes.normalMC = a_normalMC;",
            "    attributes.texCoord_0 = a_texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          [
            "in vec3 a_position2D;",
            "in vec3 a_normalMC;",
            "in vec2 a_texCoord_0;",
          ]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes POSITION, NORMAL, TEXCOORD and TANGENT attributes from primitive", function () {
      return loadGltf(boomBoxSpecularGlossiness).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(4);

        const texCoord0Attribute = attributes[0];
        expect(texCoord0Attribute.index).toEqual(1);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).toBe(8);

        const normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(2);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);

        const tangentAttribute = attributes[2];
        expect(tangentAttribute.index).toEqual(3);
        expect(tangentAttribute.vertexBuffer).toBeDefined();
        expect(tangentAttribute.componentsPerAttribute).toEqual(4);
        expect(tangentAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(tangentAttribute.offsetInBytes).toBe(0);
        expect(tangentAttribute.strideInBytes).toBe(16);

        const positionAttribute = attributes[3];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 normalMC;",
            "    vec3 tangentMC;",
            "    float tangentSignMC;",
            "    vec3 bitangentMC;",
            "    vec2 texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec3 normalEC;",
            "    vec3 tangentEC;",
            "    vec3 bitangentEC;",
            "    vec2 texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.normalMC = a_normalMC;",
            "    attributes.tangentMC = a_tangentMC.xyz;",
            "    attributes.tangentSignMC = a_tangentMC.w;",
            "    attributes.texCoord_0 = a_texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    v_texCoord_0 = attributes.texCoord_0;"]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    attributes.texCoord_0 = v_texCoord_0;"]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "vec3 v_normalEC;",
          "vec3 v_tangentEC;",
          "vec3 v_bitangentEC;",
          "vec2 v_texCoord_0;",
          "vec3 v_positionEC;",
          "vec3 v_positionMC;",
          "vec3 v_positionWC;",
        ]);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_BITANGENTS",
          "HAS_NORMALS",
          "HAS_TANGENTS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_BITANGENTS",
          "HAS_NORMALS",
          "HAS_TANGENTS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          [
            "in vec3 a_normalMC;",
            "in vec4 a_tangentMC;",
            "in vec2 a_texCoord_0;",
          ]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes multiple TEXCOORD attributes from primitive", function () {
      return loadGltf(microcosm).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(3);

        const positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );

        const texCoord0Attribute = attributes[1];
        expect(texCoord0Attribute.index).toEqual(1);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).toBe(8);

        const texCoord1Attribute = attributes[2];
        expect(texCoord1Attribute.index).toEqual(2);
        expect(texCoord1Attribute.vertexBuffer).toBeDefined();
        expect(texCoord1Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord1Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord1Attribute.offsetInBytes).toBe(0);
        expect(texCoord1Attribute.strideInBytes).toBe(8);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec2 texCoord_0;",
            "    vec2 texCoord_1;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec2 texCoord_0;",
            "    vec2 texCoord_1;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.texCoord_0 = a_texCoord_0;",
            "    attributes.texCoord_1 = a_texCoord_1;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    v_texCoord_0 = attributes.texCoord_0;",
            "    v_texCoord_1 = attributes.texCoord_1;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    attributes.texCoord_0 = v_texCoord_0;",
            "    attributes.texCoord_1 = v_texCoord_1;",
          ]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "vec2 v_texCoord_0;",
          "vec2 v_texCoord_1;",
          "vec3 v_positionEC;",
          "vec3 v_positionMC;",
          "vec3 v_positionWC;",
        ]);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_TEXCOORD_0",
          "HAS_TEXCOORD_1",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_TEXCOORD_0",
          "HAS_TEXCOORD_1",
        ]);
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          ["in vec2 a_texCoord_0;", "in vec2 a_texCoord_1;"]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes POSITION, NORMAL, TEXCOORD and COLOR attributes from primitive", function () {
      return loadGltf(boxVertexColors).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[2].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(4);

        const color0Attribute = attributes[0];
        expect(color0Attribute.index).toEqual(1);
        expect(color0Attribute.vertexBuffer).toBeDefined();
        expect(color0Attribute.componentsPerAttribute).toEqual(4);
        expect(color0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(color0Attribute.offsetInBytes).toBe(0);
        expect(color0Attribute.strideInBytes).toBe(16);

        const normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(2);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);

        const positionAttribute = attributes[2];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);

        const texCoord0Attribute = attributes[3];
        expect(texCoord0Attribute.index).toEqual(3);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).toBe(8);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 normalMC;",
            "    vec4 color_0;",
            "    vec2 texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec3 normalEC;",
            "    vec4 color_0;",
            "    vec2 texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.normalMC = a_normalMC;",
            "    attributes.color_0 = a_color_0;",
            "    attributes.texCoord_0 = a_texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    v_color_0 = attributes.color_0;",
            "    v_texCoord_0 = attributes.texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    attributes.color_0 = v_color_0;",
            "    attributes.texCoord_0 = v_texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "vec3 v_normalEC;",
          "vec4 v_color_0;",
          "vec2 v_texCoord_0;",
          "vec3 v_positionEC;",
          "vec3 v_positionMC;",
          "vec3 v_positionWC;",
        ]);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_COLOR_0",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_COLOR_0",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          ["in vec3 a_normalMC;", "in vec4 a_color_0;", "in vec2 a_texCoord_0;"]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("promotes vec3 vertex colors to vec4 in the shader", function () {
      return loadGltf(pointCloudRGB).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(2);

        const positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(24);

        const color0Attribute = attributes[1];
        expect(color0Attribute.index).toEqual(1);
        expect(color0Attribute.vertexBuffer).toBeDefined();
        expect(color0Attribute.componentsPerAttribute).toEqual(3);
        expect(color0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(color0Attribute.offsetInBytes).toBe(12);
        expect(color0Attribute.strideInBytes).toBe(24);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          ["    vec3 positionMC;", "    vec4 color_0;"]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec4 color_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.color_0 = a_color_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    v_color_0 = attributes.color_0;"]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    attributes.color_0 = v_color_0;"]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "vec4 v_color_0;",
          "vec3 v_positionEC;",
          "vec3 v_positionMC;",
          "vec3 v_positionWC;",
        ]);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_COLOR_0",
          "PRIMITIVE_TYPE_POINTS",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_COLOR_0",
          "PRIMITIVE_TYPE_POINTS",
        ]);
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          ["in vec4 a_color_0;"]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes custom vertex attribute from primitive", function () {
      const renderResources = mockRenderResources(customAttributePrimitive);

      GeometryPipelineStage.process(
        renderResources,
        customAttributePrimitive,
        scene.frameState
      );

      const shaderBuilder = renderResources.shaderBuilder;
      const attributes = renderResources.attributes;

      expect(attributes.length).toEqual(2);

      const positionAttribute = attributes[0];
      expect(positionAttribute.index).toEqual(0);
      expect(positionAttribute.vertexBuffer).toBeDefined();
      expect(positionAttribute.componentsPerAttribute).toEqual(3);
      expect(positionAttribute.componentDatatype).toEqual(
        ComponentDatatype.FLOAT
      );
      expect(positionAttribute.offsetInBytes).toBe(0);
      expect(positionAttribute.strideInBytes).toBe(12);

      const customAttribute = attributes[1];
      expect(customAttribute.index).toEqual(1);
      expect(customAttribute.vertexBuffer).toBeDefined();
      expect(customAttribute.componentsPerAttribute).toEqual(2);
      expect(customAttribute.componentDatatype).toEqual(
        ComponentDatatype.UNSIGNED_SHORT
      );
      expect(customAttribute.offsetInBytes).toBe(0);
      expect(customAttribute.strideInBytes).toBe(4);

      ShaderBuilderTester.expectHasVertexStruct(
        shaderBuilder,
        GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
        GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
        ["    vec3 positionMC;", "    vec2 temperature;"]
      );
      ShaderBuilderTester.expectHasFragmentStruct(
        shaderBuilder,
        GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
        GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
        [
          "    vec3 positionMC;",
          "    vec3 positionWC;",
          "    vec3 positionEC;",
          "    vec2 temperature;",
        ]
      );
      ShaderBuilderTester.expectHasVertexFunctionUnordered(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
        GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
        [
          "    attributes.positionMC = a_positionMC;",
          "    attributes.temperature = a_temperature;",
        ]
      );
      ShaderBuilderTester.expectHasVertexFunctionUnordered(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
        GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
        ["    v_temperature = attributes.temperature;"]
      );
      ShaderBuilderTester.expectHasFragmentFunctionUnordered(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
        GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
        ["    attributes.temperature = v_temperature;"]
      );
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "vec2 v_temperature;",
        "vec3 v_positionEC;",
        "vec3 v_positionMC;",
        "vec3 v_positionWC;",
      ]);
      ShaderBuilderTester.expectHasAttributes(
        shaderBuilder,
        "in vec3 a_positionMC;",
        ["in vec2 a_temperature;"]
      );
      verifyFeatureStruct(shaderBuilder);
    });

    it("processes POSITION, NORMAL and _FEATURE_ID_n attributes from primitive", function () {
      return loadGltf(buildingsMetadata).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(3);

        const positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);

        const normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);

        const featureId0Attribute = attributes[2];
        expect(featureId0Attribute.index).toEqual(2);
        expect(featureId0Attribute.vertexBuffer).toBeDefined();
        expect(featureId0Attribute.componentsPerAttribute).toEqual(1);
        expect(featureId0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(featureId0Attribute.offsetInBytes).toBe(0);
        expect(featureId0Attribute.strideInBytes).toBe(4);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 normalMC;",
            "    float featureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec3 normalEC;",
            "    float featureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.normalMC = a_normalMC;",
            "    attributes.featureId_0 = a_featureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          ["in float a_featureId_0;", "in vec3 a_normalMC;"]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_FEATURE_ID_0",
          "HAS_NORMALS",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_FEATURE_ID_0",
          "HAS_NORMALS",
        ]);
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("sets PRIMITIVE_TYPE_POINTS for point primitive types", function () {
      return loadGltf(weather).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(2);

        const positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);

        const featureId0Attribute = attributes[1];
        expect(featureId0Attribute.index).toEqual(1);
        expect(featureId0Attribute.vertexBuffer).toBeDefined();
        expect(featureId0Attribute.componentsPerAttribute).toEqual(1);
        expect(featureId0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(featureId0Attribute.offsetInBytes).toBe(0);
        expect(featureId0Attribute.strideInBytes).toBe(4);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          ["    vec3 positionMC;", "    float featureId_0;"]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    float featureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.featureId_0 = a_featureId_0;",
          ]
        );
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          ["in float a_featureId_0;"]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_FEATURE_ID_0",
          "PRIMITIVE_TYPE_POINTS",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_FEATURE_ID_0",
          "PRIMITIVE_TYPE_POINTS",
        ]);
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("prepares Draco model for dequantization stage", function () {
      return loadGltf(dracoMilkTruck).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(3);

        const normalAttribute = attributes[0];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(2);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).not.toBeDefined();

        const positionAttribute = attributes[1];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).not.toBeDefined();

        const texCoord0Attribute = attributes[2];
        expect(texCoord0Attribute.index).toEqual(2);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).not.toBeDefined();

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          ["    vec3 positionMC;", "    vec3 normalMC;", "    vec2 texCoord_0;"]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec3 normalEC;",
            "    vec2 texCoord_0;",
          ]
        );
        // Initialization is skipped for dequantized attributes
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          []
        );
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_quantized_positionMC;",
          ["in vec2 a_quantized_normalMC;", "in vec2 a_quantized_texCoord_0;"]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_TEXCOORD_0",
        ]);
      });
    });

    // The tangents in this model aren't quantized, but they still should not
    // cause the model to crash.
    it("prepares Draco model with tangents for dequantization stage", function () {
      return loadGltf(dracoBoxWithTangents).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(4);

        const positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).not.toBeDefined();

        const normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(2);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_BYTE
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).not.toBeDefined();

        const tangentAttribute = attributes[2];
        expect(tangentAttribute.index).toEqual(2);
        expect(tangentAttribute.vertexBuffer).toBeDefined();
        expect(tangentAttribute.componentsPerAttribute).toEqual(4);
        expect(tangentAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).not.toBeDefined();

        const texCoord0Attribute = attributes[3];
        expect(texCoord0Attribute.index).toEqual(3);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).not.toBeDefined();

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 normalMC;",
            "    vec3 tangentMC;",
            "    float tangentSignMC;",
            "    vec3 bitangentMC;",
            "    vec2 texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec3 normalEC;",
            "    vec3 tangentEC;",
            "    vec3 bitangentEC;",
            "    vec2 texCoord_0;",
          ]
        );
        // Initialization is skipped for dequantized attributes
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.tangentMC = a_tangentMC.xyz;",
            "    attributes.tangentSignMC = a_tangentMC.w;",
          ]
        );
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_quantized_positionMC;",
          [
            "in vec2 a_quantized_normalMC;",
            "in vec2 a_quantized_texCoord_0;",
            "in vec4 a_tangentMC;",
          ]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_BITANGENTS",
          "HAS_NORMALS",
          "HAS_TANGENTS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_BITANGENTS",
          "HAS_NORMALS",
          "HAS_TANGENTS",
          "HAS_TEXCOORD_0",
        ]);
      });
    });

    it("processes Draco model for 2D", function () {
      return loadGltf(dracoMilkTruck).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const renderResources = mockRenderResources(primitive);

        renderResources.model._projectTo2D = true;
        renderResources.runtimePrimitive.positionBuffer2D = {};

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene2D.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(4);

        const normalAttribute = attributes[0];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(2);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).not.toBeDefined();

        const positionAttribute = attributes[1];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).not.toBeDefined();

        const positionAttribute2D = attributes[2];
        expect(positionAttribute2D.index).toEqual(2);
        expect(positionAttribute2D.vertexBuffer).toBeDefined();
        expect(positionAttribute2D.componentsPerAttribute).toEqual(3);
        expect(positionAttribute2D.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute2D.offsetInBytes).toBe(0);
        expect(positionAttribute2D.strideInBytes).not.toBeDefined();

        const texCoord0Attribute = attributes[3];
        expect(texCoord0Attribute.index).toEqual(3);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).not.toBeDefined();

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 position2D;",
            "    vec3 normalMC;",
            "    vec2 texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec3 normalEC;",
            "    vec2 texCoord_0;",
          ]
        );

        // While initialization is skipped for dequantized attributes,
        // the 2D position attribute should still be accounted for
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          ["    attributes.position2D = a_position2D;"]
        );
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_quantized_positionMC;",
          [
            "in vec3 a_position2D;",
            "in vec2 a_quantized_normalMC;",
            "in vec2 a_quantized_texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_TEXCOORD_0",
        ]);
      });
    });

    it("processes model with matrix attributes", function () {
      return loadGltf(boxTexturedWithPropertyAttributes).then(function (
        gltfLoader
      ) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderResources = mockRenderResources(primitive);

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(6);

        const normalAttribute = attributes[0];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);

        const positionAttribute = attributes[1];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(288);
        expect(positionAttribute.strideInBytes).toBe(12);

        const texCoord0Attribute = attributes[2];
        expect(texCoord0Attribute.index).toEqual(2);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).toBe(8);

        const warpMatrixAttribute = attributes[3];
        expect(warpMatrixAttribute.index).toEqual(3);
        expect(warpMatrixAttribute.vertexBuffer).toBeDefined();
        expect(warpMatrixAttribute.componentsPerAttribute).toEqual(2);
        expect(warpMatrixAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(warpMatrixAttribute.offsetInBytes).toBe(0);
        expect(warpMatrixAttribute.strideInBytes).toBe(16);

        const warpMatrixAttributePart2 = attributes[4];
        expect(warpMatrixAttributePart2.index).toEqual(4);
        expect(warpMatrixAttributePart2.vertexBuffer).toBeDefined();
        expect(warpMatrixAttributePart2.componentsPerAttribute).toEqual(2);
        expect(warpMatrixAttributePart2.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(warpMatrixAttributePart2.offsetInBytes).toBe(8);
        expect(warpMatrixAttributePart2.strideInBytes).toBe(16);

        const temperaturesAttribute = attributes[5];
        expect(temperaturesAttribute.index).toEqual(5);
        expect(temperaturesAttribute.vertexBuffer).toBeDefined();
        expect(temperaturesAttribute.componentsPerAttribute).toEqual(2);
        expect(temperaturesAttribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(temperaturesAttribute.offsetInBytes).toBe(0);
        expect(temperaturesAttribute.strideInBytes).toBe(4);

        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 normalMC;",
            "    vec2 texCoord_0;",
            "    mat2 warp_matrix;",
            "    vec2 temperatures;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_FS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          [
            "    vec3 positionMC;",
            "    vec3 positionWC;",
            "    vec3 positionEC;",
            "    vec3 normalEC;",
            "    vec2 texCoord_0;",
            "    mat2 warp_matrix;",
            "    vec2 temperatures;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.normalMC = a_normalMC;",
            "    attributes.texCoord_0 = a_texCoord_0;",
            "    attributes.warp_matrix = a_warp_matrix;",
            "    attributes.temperatures = a_temperatures;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    v_texCoord_0 = attributes.texCoord_0;",
            "    v_warp_matrix = attributes.warp_matrix;",
            "    v_temperatures = attributes.temperatures;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    attributes.texCoord_0 = v_texCoord_0;",
            "    attributes.warp_matrix = v_warp_matrix;",
            "    attributes.temperatures = v_temperatures;",
          ]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "vec3 v_normalEC;",
          "vec2 v_texCoord_0;",
          "vec3 v_positionEC;",
          "vec3 v_positionMC;",
          "vec3 v_positionWC;",
          "mat2 v_warp_matrix;",
          "vec2 v_temperatures;",
        ]);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_NORMALS",
          "HAS_TEXCOORD_0",
        ]);
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          [
            "in vec3 a_normalMC;",
            "in vec2 a_texCoord_0;",
            "in mat2 a_warp_matrix;",
            "in vec2 a_temperatures;",
          ]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes POSITION attribute for instanced model for 2D", function () {
      return loadGltf(boxInstancedTranslationUrl).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const renderResources = mockRenderResources(primitive);

        renderResources.runtimeNode.node = node;
        renderResources.model._projectTo2D = true;

        GeometryPipelineStage.process(
          renderResources,
          primitive,
          scene2D.frameState
        );

        const shaderBuilder = renderResources.shaderBuilder;
        const attributes = renderResources.attributes;

        expect(attributes.length).toEqual(2);

        const normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(1);

        const positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);

        // Only the attributes struct should be modified for 2D.
        // Everything else should remain the same.
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          GeometryPipelineStage.STRUCT_ID_PROCESSED_ATTRIBUTES_VS,
          GeometryPipelineStage.STRUCT_NAME_PROCESSED_ATTRIBUTES,
          ["    vec3 positionMC;", "    vec3 position2D;", "    vec3 normalMC;"]
        );
        ShaderBuilderTester.expectHasVertexFunctionUnordered(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.normalMC = a_normalMC;",
          ]
        );
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_NORMALS",
        ]);
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "in vec3 a_positionMC;",
          ["in vec3 a_normalMC;"]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });
  },
  "WebGL"
);
