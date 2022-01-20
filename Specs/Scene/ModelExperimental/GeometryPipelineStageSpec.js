import {
  AttributeType,
  combine,
  ComponentDatatype,
  GltfLoader,
  GeometryPipelineStage,
  ModelExperimentalType,
  Resource,
  ResourceCache,
  SelectedFeatureIdPipelineStage,
  ShaderBuilder,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe(
  "Scene/ModelExperimental/GeometryPipelineStage",
  function () {
    var positionOnlyPrimitive = {
      attributes: [
        {
          semantic: VertexAttributeSemantic.POSITION,
          buffer: new Float32Array([0, 1, 2, 3, 4, 5]).buffer,
          type: AttributeType.VEC3,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          byteStride: 12,
        },
      ],
    };

    var customAttributePrimitive = {
      attributes: [
        {
          semantic: VertexAttributeSemantic.POSITION,
          buffer: new Float32Array([0, 1, 2, 3, 4, 5]).buffer,
          type: AttributeType.VEC3,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          byteStride: 12,
        },
        {
          name: "_TEMPERATURE",
          buffer: new Uint32Array([0, 1, 2, 3, 4, 5]).buffer,
          type: AttributeType.VEC2,
          componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
          byteOffset: 0,
          byteStride: 4,
        },
      ],
    };

    var boomBoxSpecularGlossiness =
      "./Data/Models/GltfLoader/BoomBox/glTF-pbrSpecularGlossiness/BoomBox.gltf";
    var boxTextured =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
    var boxVertexColors =
      "./Data/Models/GltfLoader/BoxVertexColors/glTF/BoxVertexColors.gltf";
    var pointCloudRGB =
      "./Data/Models/GltfLoader/PointCloudWithRGBColors/glTF-Binary/PointCloudWithRGBColors.glb";
    var microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
    var weather = "./Data/Models/GltfLoader/Weather/glTF/weather.gltf";
    var buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
    var dracoMilkTruck =
      "./Data/Models/DracoCompression/CesiumMilkTruck/CesiumMilkTruck.gltf";

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

    it("processes POSITION attribute from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      GeometryPipelineStage.process(renderResources, positionOnlyPrimitive);

      var shaderBuilder = renderResources.shaderBuilder;
      var attributes = renderResources.attributes;

      expect(attributes.length).toEqual(1);
      var positionAttribute = attributes[0];
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
      ShaderBuilderTester.expectHasVertexFunction(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
        GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
        ["    attributes.positionMC = a_positionMC;"]
      );
      ShaderBuilderTester.expectHasVertexFunction(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
        GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
        []
      );
      ShaderBuilderTester.expectHasFragmentFunction(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
        GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
        []
      );
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying vec3 v_positionEC;",
        "varying vec3 v_positionMC;",
        "varying vec3 v_positionWC;",
      ]);
      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, []);
      ShaderBuilderTester.expectHasAttributes(
        shaderBuilder,
        "attribute vec3 a_positionMC;",
        []
      );
      verifyFeatureStruct(shaderBuilder);
    });

    it("processes POSITION, NORMAL and TEXCOORD attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      return loadGltf(boxTextured).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[1].primitives[0];

        GeometryPipelineStage.process(renderResources, primitive);

        var shaderBuilder = renderResources.shaderBuilder;
        var attributes = renderResources.attributes;

        expect(attributes.length).toEqual(3);

        var normalAttribute = attributes[0];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);

        var positionAttribute = attributes[1];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(288);
        expect(positionAttribute.strideInBytes).toBe(12);

        var texCoord0Attribute = attributes[2];
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
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.normalMC = a_normalMC;",
            "    attributes.texCoord_0 = a_texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    v_texCoord_0 = attributes.texCoord_0;"]
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    attributes.texCoord_0 = v_texCoord_0;"]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "varying vec3 v_normalEC;",
          "varying vec2 v_texCoord_0;",
          "varying vec3 v_positionEC;",
          "varying vec3 v_positionMC;",
          "varying vec3 v_positionWC;",
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
          "attribute vec3 a_positionMC;",
          ["attribute vec3 a_normalMC;", "attribute vec2 a_texCoord_0;"]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes POSITION, NORMAL, TEXCOORD and TANGENT attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      return loadGltf(boomBoxSpecularGlossiness).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];

        GeometryPipelineStage.process(renderResources, primitive);

        var shaderBuilder = renderResources.shaderBuilder;
        var attributes = renderResources.attributes;

        expect(attributes.length).toEqual(4);

        var texCoord0Attribute = attributes[0];
        expect(texCoord0Attribute.index).toEqual(1);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).toBe(8);

        var normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(2);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);

        var tangentAttribute = attributes[2];
        expect(tangentAttribute.index).toEqual(3);
        expect(tangentAttribute.vertexBuffer).toBeDefined();
        expect(tangentAttribute.componentsPerAttribute).toEqual(4);
        expect(tangentAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(tangentAttribute.offsetInBytes).toBe(0);
        expect(tangentAttribute.strideInBytes).toBe(16);

        var positionAttribute = attributes[3];
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
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.normalMC = a_normalMC;",
            "    attributes.tangentMC = a_tangentMC.xyz;",
            "    attributes.bitangentMC = normalize(cross(a_normalMC, a_tangentMC.xyz) * a_tangentMC.w);",
            "    attributes.texCoord_0 = a_texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    v_texCoord_0 = attributes.texCoord_0;"]
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    attributes.texCoord_0 = v_texCoord_0;"]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "varying vec3 v_normalEC;",
          "varying vec3 v_tangentEC;",
          "varying vec3 v_bitangentEC;",
          "varying vec2 v_texCoord_0;",
          "varying vec3 v_positionEC;",
          "varying vec3 v_positionMC;",
          "varying vec3 v_positionWC;",
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
          "attribute vec3 a_positionMC;",
          [
            "attribute vec3 a_normalMC;",
            "attribute vec4 a_tangentMC;",
            "attribute vec2 a_texCoord_0;",
          ]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes multiple TEXCOORD attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      return loadGltf(microcosm).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];

        GeometryPipelineStage.process(renderResources, primitive);

        var shaderBuilder = renderResources.shaderBuilder;
        var attributes = renderResources.attributes;

        expect(attributes.length).toEqual(3);

        var positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );

        var texCoord0Attribute = attributes[1];
        expect(texCoord0Attribute.index).toEqual(1);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).toBe(8);

        var texCoord1Attribute = attributes[2];
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
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.texCoord_0 = a_texCoord_0;",
            "    attributes.texCoord_1 = a_texCoord_1;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    v_texCoord_0 = attributes.texCoord_0;",
            "    v_texCoord_1 = attributes.texCoord_1;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    attributes.texCoord_0 = v_texCoord_0;",
            "    attributes.texCoord_1 = v_texCoord_1;",
          ]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "varying vec2 v_texCoord_0;",
          "varying vec2 v_texCoord_1;",
          "varying vec3 v_positionEC;",
          "varying vec3 v_positionMC;",
          "varying vec3 v_positionWC;",
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
          "attribute vec3 a_positionMC;",
          ["attribute vec2 a_texCoord_0;", "attribute vec2 a_texCoord_1;"]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes POSITION, NORMAL, TEXCOORD and COLOR attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      return loadGltf(boxVertexColors).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[2].primitives[0];

        GeometryPipelineStage.process(renderResources, primitive);

        var shaderBuilder = renderResources.shaderBuilder;
        var attributes = renderResources.attributes;

        expect(attributes.length).toEqual(4);

        var color0Attribute = attributes[0];
        expect(color0Attribute.index).toEqual(1);
        expect(color0Attribute.vertexBuffer).toBeDefined();
        expect(color0Attribute.componentsPerAttribute).toEqual(4);
        expect(color0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(color0Attribute.offsetInBytes).toBe(0);
        expect(color0Attribute.strideInBytes).toBe(16);

        var normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(2);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);

        var positionAttribute = attributes[2];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);

        var texCoord0Attribute = attributes[3];
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
        ShaderBuilderTester.expectHasVertexFunction(
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
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    v_color_0 = attributes.color_0;",
            "    v_texCoord_0 = attributes.texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          [
            "    attributes.color_0 = v_color_0;",
            "    attributes.texCoord_0 = v_texCoord_0;",
          ]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "varying vec3 v_normalEC;",
          "varying vec4 v_color_0;",
          "varying vec2 v_texCoord_0;",
          "varying vec3 v_positionEC;",
          "varying vec3 v_positionMC;",
          "varying vec3 v_positionWC;",
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
          "attribute vec3 a_positionMC;",
          [
            "attribute vec3 a_normalMC;",
            "attribute vec4 a_color_0;",
            "attribute vec2 a_texCoord_0;",
          ]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("promotes vec3 vertex colors to vec4 in the shader", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      return loadGltf(pointCloudRGB).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];

        GeometryPipelineStage.process(renderResources, primitive);

        var shaderBuilder = renderResources.shaderBuilder;
        var attributes = renderResources.attributes;

        expect(attributes.length).toEqual(2);

        var positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(24);

        var color0Attribute = attributes[1];
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
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          [
            "    attributes.positionMC = a_positionMC;",
            "    attributes.color_0 = a_color_0;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    v_color_0 = attributes.color_0;"]
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
          GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
          ["    attributes.color_0 = v_color_0;"]
        );
        ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
          "varying vec4 v_color_0;",
          "varying vec3 v_positionEC;",
          "varying vec3 v_positionMC;",
          "varying vec3 v_positionWC;",
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
          "attribute vec3 a_positionMC;",
          ["attribute vec4 a_color_0;"]
        );
        verifyFeatureStruct(shaderBuilder);
      });
    });

    it("processes custom vertex attribute from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      GeometryPipelineStage.process(renderResources, customAttributePrimitive);

      var shaderBuilder = renderResources.shaderBuilder;
      var attributes = renderResources.attributes;

      expect(attributes.length).toEqual(2);

      var positionAttribute = attributes[0];
      expect(positionAttribute.index).toEqual(0);
      expect(positionAttribute.vertexBuffer).toBeDefined();
      expect(positionAttribute.componentsPerAttribute).toEqual(3);
      expect(positionAttribute.componentDatatype).toEqual(
        ComponentDatatype.FLOAT
      );
      expect(positionAttribute.offsetInBytes).toBe(0);
      expect(positionAttribute.strideInBytes).toBe(12);

      var customAttribute = attributes[1];
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
      ShaderBuilderTester.expectHasVertexFunction(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
        GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
        [
          "    attributes.positionMC = a_positionMC;",
          "    attributes.temperature = a_temperature;",
        ]
      );
      ShaderBuilderTester.expectHasVertexFunction(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_VS,
        GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
        ["    v_temperature = attributes.temperature;"]
      );
      ShaderBuilderTester.expectHasFragmentFunction(
        shaderBuilder,
        GeometryPipelineStage.FUNCTION_ID_SET_DYNAMIC_VARYINGS_FS,
        GeometryPipelineStage.FUNCTION_SIGNATURE_SET_DYNAMIC_VARYINGS,
        ["    attributes.temperature = v_temperature;"]
      );
      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "varying vec2 v_temperature;",
        "varying vec3 v_positionEC;",
        "varying vec3 v_positionMC;",
        "varying vec3 v_positionWC;",
      ]);
      ShaderBuilderTester.expectHasAttributes(
        shaderBuilder,
        "attribute vec3 a_positionMC;",
        ["attribute vec2 a_temperature;"]
      );
      verifyFeatureStruct(shaderBuilder);
    });

    it("processes POSITION, NORMAL and FEATURE_ID attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      return loadGltf(buildingsMetadata).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[1].primitives[0];

        GeometryPipelineStage.process(renderResources, primitive);

        var shaderBuilder = renderResources.shaderBuilder;
        var attributes = renderResources.attributes;

        expect(attributes.length).toEqual(3);

        var positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);

        var normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);

        var featureId0Attribute = attributes[2];
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
        ShaderBuilderTester.expectHasVertexFunction(
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
          "attribute vec3 a_positionMC;",
          ["attribute float a_featureId_0;", "attribute vec3 a_normalMC;"]
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
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      return loadGltf(weather).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];

        GeometryPipelineStage.process(renderResources, primitive);

        var shaderBuilder = renderResources.shaderBuilder;
        var attributes = renderResources.attributes;

        expect(attributes.length).toEqual(2);

        var positionAttribute = attributes[0];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);

        var featureId0Attribute = attributes[1];
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
        ShaderBuilderTester.expectHasVertexFunction(
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
          "attribute vec3 a_positionMC;",
          ["attribute float a_featureId_0;"]
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
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
        model: {
          type: ModelExperimentalType.TILE_GLTF,
        },
      };

      return loadGltf(dracoMilkTruck).then(function (gltfLoader) {
        var components = gltfLoader.components;
        var primitive = components.nodes[0].primitives[0];

        GeometryPipelineStage.process(renderResources, primitive);

        var shaderBuilder = renderResources.shaderBuilder;
        var attributes = renderResources.attributes;

        expect(attributes.length).toEqual(3);

        var normalAttribute = attributes[0];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(2);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).not.toBeDefined();

        var positionAttribute = attributes[1];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).not.toBeDefined();

        var texCoord0Attribute = attributes[2];
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
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          GeometryPipelineStage.FUNCTION_ID_INITIALIZE_ATTRIBUTES,
          GeometryPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_ATTRIBUTES,
          []
        );
        ShaderBuilderTester.expectHasAttributes(
          shaderBuilder,
          "attribute vec3 a_quantized_positionMC;",
          [
            "attribute vec2 a_quantized_normalMC;",
            "attribute vec2 a_quantized_texCoord_0;",
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
  },
  "WebGL"
);
