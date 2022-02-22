import {
  AttributeType,
  Color,
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
import Cesium3DTilesTester from "../../Cesium3DTilesTester.js";

describe("Scene/ModelExperimental/PntsLoader", function () {
  const pointCloudRGBUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudRGB/pointCloudRGB.pnts";
  const pointCloudRGBAUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudRGBA/pointCloudRGBA.pnts";
  const pointCloudRGB565Url =
    "./Data/Cesium3DTiles/PointCloud/PointCloudRGB565/pointCloudRGB565.pnts";
  const pointCloudNoColorUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudNoColor/pointCloudNoColor.pnts";
  const pointCloudConstantColorUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudConstantColor/pointCloudConstantColor.pnts";
  const pointCloudNormalsUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudNormals/pointCloudNormals.pnts";
  const pointCloudNormalsOctEncodedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudNormalsOctEncoded/pointCloudNormalsOctEncoded.pnts";
  const pointCloudQuantizedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudQuantized/pointCloudQuantized.pnts";
  const pointCloudQuantizedOctEncodedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudQuantizedOctEncoded/pointCloudQuantizedOctEncoded.pnts";
  const pointCloudDracoUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudDraco/pointCloudDraco.pnts";
  const pointCloudDracoPartialUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudDracoPartial/pointCloudDracoPartial.pnts";
  const pointCloudDracoBatchedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudDracoBatched/pointCloudDracoBatched.pnts";
  const pointCloudWGS84Url =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWGS84/pointCloudWGS84.pnts";
  const pointCloudBatchedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudBatched/pointCloudBatched.pnts";
  const pointCloudWithPerPointPropertiesUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWithPerPointProperties/pointCloudWithPerPointProperties.pnts";
  const pointCloudWithUnicodePropertyNamesUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWithUnicodePropertyNames/pointCloudWithUnicodePropertyNames.pnts";

  let scene;
  const pntsLoaders = [];

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    for (let i = 0; i < pntsLoaders.length; i++) {
      const loader = pntsLoaders[i];
      if (!loader.isDestroyed()) {
        loader.destroy();
      }
    }
    pntsLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  function loadPntsArrayBuffer(arrayBuffer) {
    const loader = new PntsLoader({
      arrayBuffer: arrayBuffer,
    });
    pntsLoaders.push(loader);
    loader.load();
    return waitForLoaderProcess(loader, scene);
  }

  function loadPnts(pntsPath) {
    return Resource.fetchArrayBuffer({
      url: pntsPath,
    }).then(loadPntsArrayBuffer);
  }

  function expectLoadError(arrayBuffer) {
    expect(function () {
      return loadPntsArrayBuffer(arrayBuffer);
    }).toThrowRuntimeError();
  }

  function expectEmptyMetadata(featureMetadata) {
    expect(featureMetadata).toBeDefined();
    expect(featureMetadata.schema).toEqual({});
    expect(featureMetadata.propertyTableCount).toEqual(1);
    const propertyTable = featureMetadata.getPropertyTable(0);
    expect(propertyTable.getPropertyIds(0)).toEqual([]);
  }

  function expectMetadata(featureMetadata, expectedProperties) {
    expect(featureMetadata).toBeDefined();
    const schema = featureMetadata.schema;
    const batchClass = schema.classes[MetadataClass.BATCH_TABLE_CLASS_NAME];
    const properties = batchClass.properties;

    expect(featureMetadata.propertyTableCount).toEqual(1);
    const propertyTable = featureMetadata.getPropertyTable(0);
    expect(propertyTable.getPropertyIds(0).sort()).toEqual(
      Object.keys(expectedProperties).sort()
    );

    for (const propertyName in expectedProperties) {
      if (expectedProperties.hasOwnProperty(propertyName)) {
        const expectedProperty = expectedProperties[propertyName];
        const property = properties[propertyName];

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

    const quantization = attribute.quantization;
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

  function expectDefaultColor(attribute) {
    expect(attribute.name).toBe("COLOR");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.COLOR);
    expect(attribute.setIndex).toBe(0);
    expect(attribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
    expect(attribute.type).toBe(AttributeType.VEC4);
    expect(attribute.normalized).toBe(false);
    expect(attribute.constant).toEqual(Color.pack(Color.DARKGRAY, []));
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

    const quantization = attribute.quantization;
    expect(quantization.componentDatatype).toBe(componentDatatype);
    expect(quantization.normalizationRange).toBeDefined();
    expect(quantization.octEncoded).toBe(true);
    const isZXY = isDraco;
    expect(quantization.octEncodedZXY).toBe(isZXY);
    expect(quantization.quantizedVolumeDimensions).not.toBeDefined();
    expect(quantization.quantizedVolumeOffset).not.toBeDefined();
    expect(quantization.quantizedVolumeStepSize).not.toBeDefined();
    expect(quantization.type).toBe(AttributeType.VEC2);
  }

  function expectBatchId(attribute, componentDatatype) {
    expect(attribute.name).toBe("_FEATURE_ID");
    expect(attribute.semantic).toBe(VertexAttributeSemantic.FEATURE_ID);
    expect(attribute.componentDatatype).toBe(componentDatatype);
    expect(attribute.type).toBe(AttributeType.SCALAR);
    expect(attribute.normalized).toBe(false);
    expect(attribute.quantization).not.toBeDefined();
  }

  it("loads PointCloudRGB", function () {
    return loadPnts(pointCloudRGBUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB(attributes[1]);
    });
  });

  it("loads PointCloudRGBA", function () {
    return loadPnts(pointCloudRGBAUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGBA(attributes[1]);
    });
  });

  it("loads PointCloudRGB565", function () {
    return loadPnts(pointCloudRGB565Url).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB565(attributes[1]);
    });
  });

  it("loads PointCloudNoColor", function () {
    return loadPnts(pointCloudNoColorUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectDefaultColor(attributes[1]);
    });
  });

  it("loads PointCloudConstantColor", function () {
    return loadPnts(pointCloudConstantColorUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectConstantColor(attributes[1]);
    });
  });

  it("loads PointCloudNormals", function () {
    return loadPnts(pointCloudNormalsUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(3);
      expectPosition(attributes[0]);
      expectNormal(attributes[1]);
      expectColorRGB(attributes[2]);
    });
  });

  it("loads PointCloudNormalsOctEncoded", function () {
    return loadPnts(pointCloudNormalsOctEncodedUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
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
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPositionQuantized(attributes[0], ComponentDatatype.UNSIGNED_BYTE);
      expectColorRGB(attributes[1]);
    });
  });

  it("loads PointCloudQuantizedOctEncoded", function () {
    return loadPnts(pointCloudQuantizedOctEncodedUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
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
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
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
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(3);
      expectPositionQuantized(attributes[0]);
      expectNormal(attributes[1]);
      expectColorRGB(attributes[2]);
    });
  });

  it("loads PointCloudDracoBatched", function () {
    return loadPnts(pointCloudDracoBatchedUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectMetadata(components.featureMetadata, {
        dimensions: {
          type: MetadataType.VEC3,
          componentType: MetadataComponentType.FLOAT32,
        },
        name: {
          type: MetadataType.SCALAR,
          isJson: true,
        },
        id: {
          type: MetadataType.SCALAR,
          componentType: MetadataComponentType.UINT32,
        },
      });

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(4);
      expectPositionQuantized(attributes[0]);
      expectNormalOctEncoded(
        attributes[1],
        ComponentDatatype.UNSIGNED_BYTE,
        true
      );
      expectColorRGB(attributes[2]);
      expectBatchId(attributes[3], ComponentDatatype.UNSIGNED_BYTE);
    });
  });

  it("loads PointCloudWGS84", function () {
    return loadPnts(pointCloudWGS84Url).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectEmptyMetadata(components.featureMetadata);

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB(attributes[1]);
    });
  });

  it("loads PointCloudBatched", function () {
    return loadPnts(pointCloudBatchedUrl).then(function (loader) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectMetadata(components.featureMetadata, {
        dimensions: {
          type: MetadataType.VEC3,
          componentType: MetadataComponentType.FLOAT32,
        },
        name: {
          type: MetadataType.SCALAR,
          isJson: true,
        },
        id: {
          type: MetadataType.SCALAR,
          componentType: MetadataComponentType.UINT32,
        },
      });

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(4);
      expectPosition(attributes[0]);
      expectNormal(attributes[1]);
      expectDefaultColor(attributes[2]);
      expectBatchId(attributes[3], ComponentDatatype.UNSIGNED_BYTE);
    });
  });

  it("loads PointCloudWithPerPointProperties", function () {
    return loadPnts(pointCloudWithPerPointPropertiesUrl).then(function (
      loader
    ) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectMetadata(components.featureMetadata, {
        temperature: {
          type: MetadataType.SCALAR,
          componentType: MetadataComponentType.FLOAT32,
        },
        secondaryColor: {
          type: MetadataType.VEC3,
          componentType: MetadataComponentType.FLOAT32,
        },
        id: {
          type: MetadataType.SCALAR,
          componentType: MetadataComponentType.UINT16,
        },
      });

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB(attributes[1]);
    });
  });

  it("loads PointCloudWithUnicodePropertyNames", function () {
    return loadPnts(pointCloudWithUnicodePropertyNamesUrl).then(function (
      loader
    ) {
      const components = loader.components;
      expect(components).toBeDefined();
      expectMetadata(components.featureMetadata, {
        "temperature ℃": {
          type: MetadataType.SCALAR,
          componentType: MetadataComponentType.FLOAT32,
        },
        secondaryColor: {
          type: MetadataType.VEC3,
          componentType: MetadataComponentType.FLOAT32,
        },
        id: {
          type: MetadataType.SCALAR,
          componentType: MetadataComponentType.UINT16,
        },
      });

      const primitive = components.nodes[0].primitives[0];
      const attributes = primitive.attributes;
      expect(attributes.length).toBe(2);
      expectPosition(attributes[0]);
      expectColorRGB(attributes[1]);
    });
  });

  it("throws with invalid version", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      version: 2,
    });
    expectLoadError(arrayBuffer);
  });

  it("throws if featureTableJsonByteLength is 0", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJsonByteLength: 0,
    });
    expectLoadError(arrayBuffer);
  });

  it("throws if the feature table does not contain POINTS_LENGTH", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POSITION: {
          byteOffset: 0,
        },
      },
    });
    expectLoadError(arrayBuffer);
  });

  it("throws if the feature table does not contain POSITION or POSITION_QUANTIZED", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POINTS_LENGTH: 1,
      },
    });
    expectLoadError(arrayBuffer);
  });

  it("throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_SCALE", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POINTS_LENGTH: 1,
        POSITION_QUANTIZED: {
          byteOffset: 0,
        },
        QUANTIZED_VOLUME_OFFSET: [0.0, 0.0, 0.0],
      },
    });
    expectLoadError(arrayBuffer);
  });

  it("throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_OFFSET", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POINTS_LENGTH: 1,
        POSITION_QUANTIZED: {
          byteOffset: 0,
        },
        QUANTIZED_VOLUME_SCALE: [1.0, 1.0, 1.0],
      },
    });
    expectLoadError(arrayBuffer);
  });

  it("throws if the BATCH_ID semantic is defined but BATCH_LENGTH is not", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POINTS_LENGTH: 2,
        POSITION: [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
        BATCH_ID: [0, 1],
      },
    });
    expectLoadError(arrayBuffer);
  });

  it("destroys pnts loader", function () {
    return loadPnts(pointCloudBatchedUrl).then(function (loader) {
      expect(loader.components).toBeDefined();
      expect(loader.isDestroyed()).toBe(false);

      loader.destroy();

      expect(loader.components).toBeUndefined();
      expect(loader.isDestroyed()).toBe(true);
    });
  });
});
