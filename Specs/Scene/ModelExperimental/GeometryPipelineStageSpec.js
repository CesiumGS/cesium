import {
  AttributeType,
  combine,
  ComponentDatatype,
  GltfLoader,
  GeometryPipelineStage,
  Resource,
  ResourceCache,
  ShaderBuilder,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

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
    var microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
    var weather = "./Data/Models/GltfLoader/Weather/glTF/weather.gltf";
    var buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";

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
      expect(shaderBuilder._positionAttributeLine).toEqual(
        "attribute vec3 a_position;"
      );
    });

    it("processes POSITION, NORMAL and TEXCOORD attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
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
        expect(shaderBuilder._attributeLines[0]).toEqual(
          "attribute vec3 a_normal;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[0]).toEqual(
          "HAS_NORMALS"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[0]).toEqual(
          "HAS_NORMALS"
        );

        var positionAttribute = attributes[1];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(288);
        expect(positionAttribute.strideInBytes).toBe(12);
        expect(shaderBuilder._positionAttributeLine).toEqual(
          "attribute vec3 a_position;"
        );

        var texCoord0Attribute = attributes[2];
        expect(texCoord0Attribute.index).toEqual(2);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).toBe(8);
        expect(shaderBuilder._attributeLines[1]).toEqual(
          "attribute vec2 a_texCoord_0;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[1]).toEqual(
          "HAS_TEXCOORD_0"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[1]).toEqual(
          "HAS_TEXCOORD_0"
        );

        expect(shaderBuilder._vertexShaderParts.defineLines[2]).toEqual(
          "HAS_SET_INDEXED_ATTRIBUTES"
        );
        var expectedSetIndexedAttributedInitializationLines = [
          "void initializeSetIndexedAttributes()",
          "{",
          "    #ifdef HAS_TEXCOORD_0",
          "    v_texCoord_0 = a_texCoord_0;",
          "    #endif",
          "}",
        ];
        expect(
          shaderBuilder._vertexShaderParts.shaderLines.slice(0, 6)
        ).toEqual(expectedSetIndexedAttributedInitializationLines);
      });
    });

    it("processes POSITION, NORMAL, TEXCOORD and TANGENT attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
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
        expect(shaderBuilder._attributeLines[0]).toEqual(
          "attribute vec2 a_texCoord_0;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[0]).toEqual(
          "HAS_TEXCOORD_0"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[0]).toEqual(
          "HAS_TEXCOORD_0"
        );

        var normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(2);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);
        expect(shaderBuilder._attributeLines[1]).toEqual(
          "attribute vec3 a_normal;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[1]).toEqual(
          "HAS_NORMALS"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[1]).toEqual(
          "HAS_NORMALS"
        );

        var tangentAttribute = attributes[2];
        expect(tangentAttribute.index).toEqual(3);
        expect(tangentAttribute.vertexBuffer).toBeDefined();
        expect(tangentAttribute.componentsPerAttribute).toEqual(4);
        expect(tangentAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(tangentAttribute.offsetInBytes).toBe(0);
        expect(tangentAttribute.strideInBytes).toBe(16);
        expect(shaderBuilder._attributeLines[2]).toEqual(
          "attribute vec4 a_tangent;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[2]).toEqual(
          "HAS_TANGENTS"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[2]).toEqual(
          "HAS_TANGENTS"
        );

        var positionAttribute = attributes[3];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);
        expect(shaderBuilder._positionAttributeLine).toEqual(
          "attribute vec3 a_position;"
        );

        expect(shaderBuilder._vertexShaderParts.defineLines[3]).toEqual(
          "HAS_SET_INDEXED_ATTRIBUTES"
        );
        var expectedSetIndexedAttributedInitializationLines = [
          "void initializeSetIndexedAttributes()",
          "{",
          "    #ifdef HAS_TEXCOORD_0",
          "    v_texCoord_0 = a_texCoord_0;",
          "    #endif",
          "}",
        ];
        expect(
          shaderBuilder._vertexShaderParts.shaderLines.slice(0, 6)
        ).toEqual(expectedSetIndexedAttributedInitializationLines);
      });
    });

    it("processes multiple TEXCOORD attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
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
        expect(shaderBuilder._positionAttributeLine).toEqual(
          "attribute vec3 a_position;"
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
        expect(shaderBuilder._attributeLines[0]).toEqual(
          "attribute vec2 a_texCoord_0;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[0]).toEqual(
          "HAS_TEXCOORD_0"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[0]).toEqual(
          "HAS_TEXCOORD_0"
        );

        var texCoord1Attribute = attributes[2];
        expect(texCoord1Attribute.index).toEqual(2);
        expect(texCoord1Attribute.vertexBuffer).toBeDefined();
        expect(texCoord1Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord1Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord1Attribute.offsetInBytes).toBe(0);
        expect(texCoord1Attribute.strideInBytes).toBe(8);
        expect(shaderBuilder._attributeLines[1]).toEqual(
          "attribute vec2 a_texCoord_1;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[1]).toEqual(
          "HAS_TEXCOORD_1"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[1]).toEqual(
          "HAS_TEXCOORD_1"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[2]).toEqual(
          "HAS_SET_INDEXED_ATTRIBUTES"
        );
        var expectedSetIndexedAttributedInitializationLines = [
          "void initializeSetIndexedAttributes()",
          "{",
          "    #ifdef HAS_TEXCOORD_0",
          "    v_texCoord_0 = a_texCoord_0;",
          "    #endif",
          "    #ifdef HAS_TEXCOORD_1",
          "    v_texCoord_1 = a_texCoord_1;",
          "    #endif",
          "}",
        ];
        expect(
          shaderBuilder._vertexShaderParts.shaderLines.slice(0, 9)
        ).toEqual(expectedSetIndexedAttributedInitializationLines);
      });
    });

    it("processes POSITION, NORMAL, TEXCOORD and COLOR attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
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
        expect(shaderBuilder._attributeLines[0]).toEqual(
          "attribute vec4 a_color_0;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[0]).toEqual(
          "HAS_COLOR_0"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[0]).toEqual(
          "HAS_COLOR_0"
        );

        var normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(2);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);
        expect(shaderBuilder._attributeLines[1]).toEqual(
          "attribute vec3 a_normal;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[1]).toEqual(
          "HAS_NORMALS"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[1]).toEqual(
          "HAS_NORMALS"
        );

        var positionAttribute = attributes[2];
        expect(positionAttribute.index).toEqual(0);
        expect(positionAttribute.vertexBuffer).toBeDefined();
        expect(positionAttribute.componentsPerAttribute).toEqual(3);
        expect(positionAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.offsetInBytes).toBe(0);
        expect(positionAttribute.strideInBytes).toBe(12);
        expect(shaderBuilder._positionAttributeLine).toEqual(
          "attribute vec3 a_position;"
        );

        var texCoord0Attribute = attributes[3];
        expect(texCoord0Attribute.index).toEqual(3);
        expect(texCoord0Attribute.vertexBuffer).toBeDefined();
        expect(texCoord0Attribute.componentsPerAttribute).toEqual(2);
        expect(texCoord0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(texCoord0Attribute.offsetInBytes).toBe(0);
        expect(texCoord0Attribute.strideInBytes).toBe(8);
        expect(shaderBuilder._attributeLines[2]).toEqual(
          "attribute vec2 a_texCoord_0;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[2]).toEqual(
          "HAS_TEXCOORD_0"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[2]).toEqual(
          "HAS_TEXCOORD_0"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[3]).toEqual(
          "HAS_SET_INDEXED_ATTRIBUTES"
        );
        var expectedSetIndexedAttributedInitializationLines = [
          "void initializeSetIndexedAttributes()",
          "{",
          "    #ifdef HAS_COLOR_0",
          "    v_color_0 = a_color_0;",
          "    #endif",
          "    #ifdef HAS_TEXCOORD_0",
          "    v_texCoord_0 = a_texCoord_0;",
          "    #endif",
          "}",
        ];
        expect(
          shaderBuilder._vertexShaderParts.shaderLines.slice(0, 9)
        ).toEqual(expectedSetIndexedAttributedInitializationLines);
      });
    });

    it("processes custom vertex attribute from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
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
      expect(shaderBuilder._positionAttributeLine).toEqual(
        "attribute vec3 a_position;"
      );

      var customAttribute = attributes[1];
      expect(customAttribute.index).toEqual(1);
      expect(customAttribute.vertexBuffer).toBeDefined();
      expect(customAttribute.componentsPerAttribute).toEqual(2);
      expect(customAttribute.componentDatatype).toEqual(
        ComponentDatatype.UNSIGNED_SHORT
      );
      expect(customAttribute.offsetInBytes).toBe(0);
      expect(customAttribute.strideInBytes).toBe(4);
      expect(shaderBuilder._vertexShaderParts.shaderLines.slice(0, 4)).toEqual([
        "void initializeCustomAttributes()",
        "{",
        "    v_temperature = a_temperature;",
        "}",
      ]);
      expect(shaderBuilder._attributeLines[0]).toEqual(
        "attribute vec2 a_temperature;"
      );
    });

    it("processes POSITION, NORMAL and FEATURE_ID attributes from primitive", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
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
        expect(shaderBuilder._positionAttributeLine).toEqual(
          "attribute vec3 a_position;"
        );

        var normalAttribute = attributes[1];
        expect(normalAttribute.index).toEqual(1);
        expect(normalAttribute.vertexBuffer).toBeDefined();
        expect(normalAttribute.componentsPerAttribute).toEqual(3);
        expect(normalAttribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(normalAttribute.offsetInBytes).toBe(0);
        expect(normalAttribute.strideInBytes).toBe(12);
        expect(shaderBuilder._attributeLines[0]).toEqual(
          "attribute vec3 a_normal;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[0]).toEqual(
          "HAS_NORMALS"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[0]).toEqual(
          "HAS_NORMALS"
        );

        var featureId0Attribute = attributes[2];
        expect(featureId0Attribute.index).toEqual(2);
        expect(featureId0Attribute.vertexBuffer).toBeDefined();
        expect(featureId0Attribute.componentsPerAttribute).toEqual(1);
        expect(featureId0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(featureId0Attribute.offsetInBytes).toBe(0);
        expect(featureId0Attribute.strideInBytes).toBe(4);
        expect(shaderBuilder._attributeLines[1]).toEqual(
          "attribute float a_featureId_0;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[1]).toEqual(
          "HAS_FEATURE_ID_0"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[1]).toEqual(
          "HAS_FEATURE_ID_0"
        );
      });
    });

    it("sets PRIMITIVE_TYPE_POINTS for point primitive types", function () {
      var renderResources = {
        attributes: [],
        shaderBuilder: new ShaderBuilder(),
        attributeIndex: 1,
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
        expect(shaderBuilder._positionAttributeLine).toEqual(
          "attribute vec3 a_position;"
        );

        var featureId0Attribute = attributes[1];
        expect(featureId0Attribute.index).toEqual(1);
        expect(featureId0Attribute.vertexBuffer).toBeDefined();
        expect(featureId0Attribute.componentsPerAttribute).toEqual(1);
        expect(featureId0Attribute.componentDatatype).toEqual(
          ComponentDatatype.FLOAT
        );
        expect(featureId0Attribute.offsetInBytes).toBe(0);
        expect(featureId0Attribute.strideInBytes).toBe(4);
        expect(shaderBuilder._attributeLines[0]).toEqual(
          "attribute float a_featureId_0;"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[0]).toEqual(
          "HAS_FEATURE_ID_0"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[0]).toEqual(
          "HAS_FEATURE_ID_0"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[1]).toEqual(
          "HAS_SET_INDEXED_ATTRIBUTES"
        );
        expect(shaderBuilder._vertexShaderParts.defineLines[2]).toEqual(
          "PRIMITIVE_TYPE_POINTS"
        );
        expect(shaderBuilder._fragmentShaderParts.defineLines[1]).toEqual(
          "PRIMITIVE_TYPE_POINTS"
        );
      });
    });
  },
  "WebGL"
);
