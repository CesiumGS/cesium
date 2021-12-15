import {
  AttributeType,
  ComponentDatatype,
  MetadataClass,
  MetadataComponentType,
  MetadataType,
  PntsLoader,
  Resource,
  ResourceCache,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/PntsLoader", function () {
  var pointCloudRGBUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudRGB/pointCloudRGB.pnts";
  var pointCloudRGBAUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudRGBA/pointCloudRGBA.pnts";
  var pointCloudRGB565Url =
    "./Data/Cesium3DTiles/PointCloud/PointCloudRGB565/pointCloudRGB565.pnts";
  var pointCloudNoColorUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudNoColor/pointCloudNoColor.pnts";
  var pointCloudConstantColorUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudConstantColor/pointCloudConstantColor.pnts";
  var pointCloudNormalsUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudNormals/pointCloudNormals.pnts";
  var pointCloudNormalsOctEncodedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudNormalsOctEncoded/pointCloudNormalsOctEncoded.pnts";
  var pointCloudQuantizedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudQuantized/pointCloudQuantized.pnts";
  var pointCloudQuantizedOctEncodedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudQuantizedOctEncoded/pointCloudQuantizedOctEncoded.pnts";
  var pointCloudDracoUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudDraco/pointCloudDraco.pnts";
  var pointCloudDracoPartialUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudDracoPartial/pointCloudDracoPartial.pnts";
  var pointCloudDracoBatchedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudDracoBatched/pointCloudDracoBatched.pnts";
  var pointCloudWGS84Url =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWGS84/pointCloudWGS84.pnts";
  var pointCloudBatchedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudBatched/pointCloudBatched.pnts";
  var pointCloudWithPerPointPropertiesUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWithPerPointProperties/pointCloudWithPerPointProperties.pnts";
  var pointCloudWithUnicodePropertyNamesUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWithUnicodePropertyNames/pointCloudWithUnicodePropertyNames.pnts";
  var pointCloudWithTransformUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWithTransform/pointCloudWithTransform.pnts";

  var scene;
  var pntsLoaders = [];

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    for (var i = 0; i < pntsLoaders.length; i++) {
      var loader = pntsLoaders[i];
      if (!loader.isDestroyed()) {
        loader.destroy();
      }
    }
    pntsLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  function loadPnts(pntsPath) {
    var resource = Resource.createIfNeeded(pntsPath);

    return Resource.fetchArrayBuffer({
      url: pntsPath,
    }).then(function (arrayBuffer) {
      var loader = new PntsLoader({
        pntsResource: resource,
        arrayBuffer: arrayBuffer,
      });
      pntsLoaders.push(loader);
      loader.load();

      return waitForLoaderProcess(loader, scene);
    });
  }

  function expectEmptyMetadata(featureMetadata) {
    expect(featureMetadata).toBeDefined();
    expect(featureMetadata.schema).toEqual({});
    expect(featureMetadata.propertyTableCount).toEqual(1);
    var propertyTable = featureMetadata.getPropertyTable(0);
    expect(propertyTable.getPropertyIds(0)).toEqual([]);
  }

  function expectMetadata(featureMetadata, expectedProperties) {
    expect(featureMetadata).toBeDefined();
    var schema = featureMetadata.schema;
    var batchClass = schema.classes[MetadataClass.BATCH_TABLE_CLASS_NAME];
    var properties = batchClass.properties;

    expect(featureMetadata.propertyTableCount).toEqual(1);
    var propertyTable = featureMetadata.getPropertyTable(0);
    expect(propertyTable.getPropertyIds(0).sort()).toEqual(
      Object.keys(expectedProperties).sort()
    );

    for (var propertyName in expectedProperties) {
      if (expectedProperties.hasOwnProperty(propertyName)) {
        var expectedProperty = expectedProperties[propertyName];
        var property = properties[propertyName];

        if (expectedProperty.isJson) {
          // If the batch table had JSON properties, the property will not
          // be in the schema, so check if we can access it.
          expect(propertyTable.getProperty(0, propertyName)).toBeDefined();
        } else {
          // Check the property declaration is expected
          expect(property.type).toEqual(expectedProperty.type);
          expect(property.componentType).toEqual(
            expectedProperty.componentType
          );
        }
      }
    }
  }

  function expectPosition(attribute) {
    expect(attribute.name).toBe("POSITION");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.POSITION);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
    expect(attribute.type).toBe(AttributeType.VEC3);
    expect(attribute.normalized).toBe(false);
    expect(attribute.quantization).not.toBeDefined();
    expect(attribute.max).toBeDefined();
    expect(attribute.min).toBeDefined();
  }

  function expectPositionQuantized(attribute) {
    expect(attribute.name).toBe("POSITION");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.POSITION);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
    expect(attribute.type).toBe(AttributeType.VEC3);
    expect(attribute.normalized).toBe(false);
    expect(attribute.max).toBeDefined();
    expect(attribute.min).toBeDefined();

    var quantization = attribute.quantization;
    expect(quantization.componentDatatype).toBe(
      ComponentDatatype.UNSIGNED_SHORT
    );
    expect(quantization.normalizationRange).toBeDefined();
    expect(quantization.octEncoded).toBe(false);
    expect(quantization.quantizedVolumeDimensions).toBeDefined();
    expect(quantization.quantizedVolumeOffset).toBeDefined();
    expect(quantization.quantizedVolumeStepSize).toBeDefined();
    expect(quantization.type).toBe(AttributeType.VEC3);
  }

  function expectColorRGB(attribute) {
    expect(attribute.name).toBe("COLOR");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.COLOR);
    expect(attribute.setIndex).toBe(0);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.UNSIGNED_BYTE);
    expect(attribute.type).toBe(AttributeType.VEC3);
    expect(attribute.normalized).toBe(true);
  }

  function expectColorRGB565(attribute) {
    expect(attribute.name).toBe("COLOR");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.COLOR);
    expect(attribute.setIndex).toBe(0);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
    expect(attribute.type).toBe(AttributeType.VEC3);
    expect(attribute.normalized).toBe(false);
  }

  function expectColorRGBA(attribute) {
    expect(attribute.name).toBe("COLOR");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.COLOR);
    expect(attribute.setIndex).toBe(0);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.UNSIGNED_BYTE);
    expect(attribute.type).toBe(AttributeType.VEC4);
    expect(attribute.normalized).toBe(true);
  }

  function expectConstantColor(attribute) {
    expect(attribute.name).toBe("COLOR");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.COLOR);
    expect(attribute.setIndex).toBe(0);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
    expect(attribute.type).toBe(AttributeType.VEC4);
    expect(attribute.normalized).toBe(false);
    expect(attribute.constant).toBeDefined();
  }

  function expectNormal(attribute) {
    expect(attribute.name).toBe("NORMAL");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.NORMAL);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
    expect(attribute.type).toBe(AttributeType.VEC3);
    expect(attribute.normalized).toBe(false);
    expect(attribute.quantization).not.toBeDefined();
  }

  function expectNormalOctEncoded(attribute, componentDatatype, isDraco) {
    expect(attribute.name).toBe("NORMAL");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.NORMAL);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
    expect(attribute.type).toBe(AttributeType.VEC3);
    expect(attribute.normalized).toBe(false);

    var quantization = attribute.quantization;
    expect(quantization.componentDatatype).toBe(componentDatatype);
    expect(quantization.normalizationRange).toBeDefined();
    expect(quantization.octEncoded).toBe(true);
    var isZXY = isDraco;
    expect(quantization.octEncodedZXY).toBe(isZXY);
    expect(quantization.quantizedVolumeDimensions).not.toBeDefined();
    expect(quantization.quantizedVolumeOffset).not.toBeDefined();
    expect(quantization.quantizedVolumeStepSize).not.toBeDefined();
    expect(quantization.type).toBe(AttributeType.VEC2);
  }

  function expectBatchId(attribute) {
    expect(attribute.name).toBe("BATCH_ID");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.FEATURE_ID);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.UNSIGNED_SHORT);
    expect(attribute.type).toBe(AttributeType.SCALAR);
    expect(attribute.normalized).toBe(false);
    expect(attribute.quantization).not.toBeDefined();
  }

  it("loads PointCloudRGB", function () {
    return loadPnts(pointCloudRGBUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB(attributes[1]);
    });
  });

  it("loads PointCloudRGBA", function () {
    return loadPnts(pointCloudRGBAUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGBA(attributes[1]);
    });
  });

  it("loads PointCloudRGB565", function () {
    return loadPnts(pointCloudRGB565Url).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB565(attributes[1]);
    });
  });

  it("loads PointCloudNoColor", function () {
    return loadPnts(pointCloudNoColorUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(1);
      expectPosition(attributes[0]);
    });
  });

  it("loads PointCloudConstantColor", function () {
    return loadPnts(pointCloudConstantColorUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectConstantColor(attributes[1]);
    });
  });

  it("loads PointCloudNormals", function () {
    return loadPnts(pointCloudNormalsUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(3);
      expectPosition(attributes[0]);
      expectNormal(attributes[1]);
      expectColorRGB(attributes[2]);
    });
  });

  it("loads PointCloudNormalsOctEncoded", function () {
    return loadPnts(pointCloudNormalsOctEncodedUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(3);
      expectPosition(attributes[0]);
      expectNormalOctEncoded(
        attributes[1],
        ComponentDatatype.UNSIGNED_BYTE,
        false
      );
      expectColorRGB(attributes[2]);
    });
  });

  it("loads PointCloudQuantized", function () {
    return loadPnts(pointCloudQuantizedUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPositionQuantized(attributes[0], ComponentDatatype.UNSIGNED_BYTE);
      expectColorRGB(attributes[1]);
    });
  });

  it("loads PointCloudQuantizedOctEncoded", function () {
    return loadPnts(pointCloudQuantizedOctEncodedUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(3);
      expectPositionQuantized(attributes[0]);
      expectNormalOctEncoded(
        attributes[1],
        ComponentDatatype.UNSIGNED_BYTE,
        false
      );
      expectColorRGB(attributes[2]);
    });
  });

  it("loads PointCloudDraco", function () {
    return loadPnts(pointCloudDracoUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(3);
      expectPositionQuantized(attributes[0]);
      expectNormalOctEncoded(
        attributes[1],
        ComponentDatatype.UNSIGNED_BYTE,
        true
      );
      expectColorRGB(attributes[2]);
    });
  });

  it("loads PointCloudDracoPartial", function () {
    return loadPnts(pointCloudDracoPartialUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(3);
      expectPositionQuantized(attributes[0]);
      expectNormal(attributes[1]);
      expectColorRGB(attributes[2]);
    });
  });

  it("loads PointCloudDracoBatched", function () {
    return loadPnts(pointCloudDracoBatchedUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectMetadata(components.featureMetadata, {
        dimensions: {
          type: MetadataType.VEC3,
          componentType: MetadataComponentType.FLOAT32,
        },
        name: {
          type: MetadataType.SINGLE,
          isJson: true,
        },
        id: {
          type: MetadataType.SINGLE,
          componentType: MetadataComponentType.UINT32,
        },
      });

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(4);
      expectPositionQuantized(attributes[0]);
      expectNormalOctEncoded(
        attributes[1],
        ComponentDatatype.UNSIGNED_BYTE,
        true
      );
      expectColorRGB(attributes[2]);
      expectBatchId(attributes[3]);
    });
  });

  it("loads PointCloudWGS84", function () {
    fail();
    return loadPnts(pointCloudWGS84Url).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB(attributes[1]);
    });
  });

  it("loads PointCloudBatched", function () {
    return loadPnts(pointCloudBatchedUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectMetadata(components.featureMetadata, {
        dimensions: {
          type: MetadataType.VEC3,
          componentType: MetadataComponentType.FLOAT32,
        },
        name: {
          type: MetadataType.SINGLE,
          isJson: true,
        },
        id: {
          type: MetadataType.SINGLE,
          componentType: MetadataComponentType.UINT32,
        },
      });

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(3);
      expectPosition(attributes[0]);
      expectNormal(attributes[1]);
      expectBatchId(attributes[2]);
    });
  });

  it("loads PointCloudWithPerPointProperties", function () {
    return loadPnts(pointCloudWithPerPointPropertiesUrl).then(function (
      loader
    ) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectMetadata(components.featureMetadata, {
        temperature: {
          type: MetadataType.SINGLE,
          componentType: MetadataComponentType.FLOAT32,
        },
        secondaryColor: {
          type: MetadataType.VEC3,
          componentType: MetadataComponentType.FLOAT32,
        },
        id: {
          type: MetadataType.SINGLE,
          componentType: MetadataComponentType.UINT16,
        },
      });

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB(attributes[1]);
    });
  });

  it("loads PointCloudWithUnicodePropertyNames", function () {
    return loadPnts(pointCloudWithUnicodePropertyNamesUrl).then(function (
      loader
    ) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectMetadata(components.featureMetadata, {
        "temperature ℃": {
          type: MetadataType.SINGLE,
          componentType: MetadataComponentType.FLOAT32,
        },
        secondaryColor: {
          type: MetadataType.VEC3,
          componentType: MetadataComponentType.FLOAT32,
        },
        id: {
          type: MetadataType.SINGLE,
          componentType: MetadataComponentType.UINT16,
        },
      });

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB(attributes[1]);
    });
  });

  it("loads PointCloudWithTransform", function () {
    fail();
    return loadPnts(pointCloudWithTransformUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      var primitive = components.nodes[0].primitives[0];
      var attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB(attributes[1]);
    });
  });

  // check if it throws for invalid  version
  // check if it throws for other problems
  // check if it destroys
});
