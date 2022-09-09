import {
  AttributeType,
  Color,
  ComponentDatatype,
  defaultValue,
  DracoLoader,
  Matrix4,
  MetadataClass,
  MetadataComponentType,
  MetadataType,
  PntsLoader,
  Resource,
  ResourceCache,
  RuntimeError,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import pollToPromise from "../../pollToPromise.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";
import Cesium3DTilesTester from "../../Cesium3DTilesTester.js";

describe(
  "Scene/Model/PntsLoader",
  function () {
    const pointCloudRGBUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudRGB/pointCloudRGB.pnts";
    const pointCloudRGBAUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudRGBA/pointCloudRGBA.pnts";
    const pointCloudRGB565Url =
      "./Data/Cesium3DTiles/PointCloud/PointCloudRGB565/pointCloudRGB565.pnts";
    const pointCloudNoColorUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudNoColor/pointCloudNoColor.pnts";
    const pointCloudWithTransformUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudWithTransform/pointCloudWithTransform.pnts";
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
    const pointCloudWithUnicodePropertyIdsUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudWithUnicodePropertyIds/pointCloudWithUnicodePropertyIds.pnts";

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

    function loadPntsArrayBuffer(arrayBuffer, options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      const loader = new PntsLoader({
        arrayBuffer: arrayBuffer,
        loadAttributesFor2D: options.loadAttributesFor2D,
      });
      pntsLoaders.push(loader);
      loader.load();
      return waitForLoaderProcess(loader, scene);
    }

    function loadPnts(pntsPath, options) {
      return Resource.fetchArrayBuffer({
        url: pntsPath,
      }).then(function (arrayBuffer) {
        return loadPntsArrayBuffer(arrayBuffer, options);
      });
    }

    function expectLoadError(arrayBuffer) {
      expect(function () {
        return loadPntsArrayBuffer(arrayBuffer);
      }).toThrowError(RuntimeError);
    }

    function expectEmptyMetadata(structuralMetadata) {
      expect(structuralMetadata).toBeDefined();
      expect(structuralMetadata.schema).toEqual({});
      expect(structuralMetadata.propertyTableCount).toBe(0);
    }

    function expectMetadata(structuralMetadata, expectedProperties, isBatched) {
      expect(structuralMetadata).toBeDefined();
      const schema = structuralMetadata.schema;
      const batchClass = schema.classes[MetadataClass.BATCH_TABLE_CLASS_NAME];
      const properties = batchClass.properties;

      const expectedPropertyTableCount = isBatched ? 1 : 0;
      expect(structuralMetadata.propertyTableCount).toEqual(
        expectedPropertyTableCount
      );
      const propertyTable = structuralMetadata.getPropertyTable(0);

      const tablePropertyNames = [];
      const attributePropertyNames = [];

      for (const propertyName in expectedProperties) {
        if (expectedProperties.hasOwnProperty(propertyName)) {
          const expectedProperty = expectedProperties[propertyName];
          const property = properties[propertyName];

          if (expectedProperty.isJson) {
            // If the batch table had JSON properties, the property will not
            // be in the schema, so check if we can access it.
            expect(propertyTable.getProperty(0, propertyName)).toBeDefined();
            tablePropertyNames.push(propertyName);
          } else {
            // Check the property declaration is expected
            expect(property.type).toEqual(expectedProperty.type);
            expect(property.componentType).toEqual(
              expectedProperty.componentType
            );

            // if batched, binary properties will appear in the property table.
            // Otherwise, they are per-point and parsed as a property attribute
            const nameList = isBatched
              ? tablePropertyNames
              : attributePropertyNames;
            nameList.push(propertyName);
          }
        }
      }

      // Check that the list of property IDs match in either the batch table
      // (batched points) or the property attribute (per-point properties)
      if (isBatched) {
        expect(propertyTable.getPropertyIds(0).sort()).toEqual(
          tablePropertyNames.sort()
        );
      } else {
        const propertyAttribute = structuralMetadata.getPropertyAttribute(0);
        expect(Object.keys(propertyAttribute.properties).sort()).toEqual(
          attributePropertyNames.sort()
        );
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

    it("releases array buffer when finished", function () {
      return loadPnts(pointCloudRGBUrl).then(function (loader) {
        expect(loader.components).toBeDefined();
        expect(loader._arrayBuffer).not.toBeDefined();
      });
    });

    it("loads PointCloudRGB", function () {
      return loadPnts(pointCloudRGBUrl).then(function (loader) {
        const components = loader.components;
        expect(components).toBeDefined();
        expectEmptyMetadata(components.structuralMetadata);

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
        expectEmptyMetadata(components.structuralMetadata);

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
        expectEmptyMetadata(components.structuralMetadata);

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
        expectEmptyMetadata(components.structuralMetadata);

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
        expectEmptyMetadata(components.structuralMetadata);

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
        expectEmptyMetadata(components.structuralMetadata);

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
        expectEmptyMetadata(components.structuralMetadata);

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
        expectEmptyMetadata(components.structuralMetadata);

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
        expectEmptyMetadata(components.structuralMetadata);

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
        const isBatched = false;
        expectMetadata(
          components.structuralMetadata,
          {
            secondaryColor: {
              type: MetadataType.VEC3,
              componentType: MetadataComponentType.FLOAT32,
            },
            temperature: {
              type: MetadataType.SCALAR,
              componentType: MetadataComponentType.FLOAT32,
            },
            id: {
              type: MetadataType.SCALAR,
              componentType: MetadataComponentType.UINT16,
            },
          },
          isBatched
        );

        const primitive = components.nodes[0].primitives[0];
        const attributes = primitive.attributes;
        // 3 geometry attributes + 3 metadata attributes
        expect(attributes.length).toBe(6);
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
        const isBatched = false;
        expectMetadata(
          components.structuralMetadata,
          {
            secondaryColor: {
              type: MetadataType.VEC3,
              componentType: MetadataComponentType.FLOAT32,
            },
            temperature: {
              type: MetadataType.SCALAR,
              componentType: MetadataComponentType.FLOAT32,
            },
            id: {
              type: MetadataType.SCALAR,
              componentType: MetadataComponentType.UINT16,
            },
          },
          isBatched
        );

        const primitive = components.nodes[0].primitives[0];
        const attributes = primitive.attributes;
        // 3 geometry attributes + 3 metadata attributes
        expect(attributes.length).toBe(6);
        expectPositionQuantized(attributes[0]);
        expectNormal(attributes[1]);
        expectColorRGB(attributes[2]);
      });
    });

    it("loads PointCloudDracoBatched", function () {
      return loadPnts(pointCloudDracoBatchedUrl).then(function (loader) {
        const components = loader.components;
        expect(components).toBeDefined();
        const isBatched = true;
        expectMetadata(
          components.structuralMetadata,
          {
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
          },
          isBatched
        );

        const primitive = components.nodes[0].primitives[0];
        const attributes = primitive.attributes;
        // 4 geometry attributes. No metadata attributes
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
        expectEmptyMetadata(components.structuralMetadata);

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
        const isBatched = true;
        expectMetadata(
          components.structuralMetadata,
          {
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
          },
          isBatched
        );

        const primitive = components.nodes[0].primitives[0];
        const attributes = primitive.attributes;
        // 4 geometry attributes, no metadata attributes
        expect(attributes.length).toBe(4);
        expectPosition(attributes[0]);
        expectNormal(attributes[1]);
        expectDefaultColor(attributes[2]);
        expectBatchId(attributes[3], ComponentDatatype.UNSIGNED_BYTE);
      });
    });

    it("loads PointCloudWithTransform", function () {
      return loadPnts(pointCloudWithTransformUrl).then(function (loader) {
        const components = loader.components;
        expect(components).toBeDefined();
        expectEmptyMetadata(components.structuralMetadata);

        // The transform is applied in the tileset.json, but the .pnts
        // file itself includes no transformations.
        expect(components.transform).toEqual(Matrix4.IDENTITY);
        const node = components.nodes[0];
        expect(node.matrix).not.toBeDefined();
        expect(node.translation).not.toBeDefined();
        expect(node.rotation).not.toBeDefined();
        expect(node.scale).not.toBeDefined();

        const primitive = node.primitives[0];
        const attributes = primitive.attributes;
        expect(attributes.length).toBe(2);
        expectPosition(attributes[0]);
        expectColorRGB(attributes[1]);
      });
    });

    it("BATCH_ID semantic uses componentType of UNSIGNED_SHORT by default", function () {
      const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
        featureTableJson: {
          POINTS_LENGTH: 2,
          POSITION: [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
          BATCH_ID: [0, 1],
          BATCH_LENGTH: 2,
        },
      });

      return loadPntsArrayBuffer(arrayBuffer).then(function (loader) {
        const components = loader.components;
        const primitive = components.nodes[0].primitives[0];
        const attributes = primitive.attributes;
        expect(attributes.length).toBe(3);
        expectPosition(attributes[0]);
        expectDefaultColor(attributes[1]);
        expectBatchId(attributes[2], ComponentDatatype.UNSIGNED_SHORT);
      });
    });

    it("loads PointCloudWithPerPointProperties", function () {
      return loadPnts(pointCloudWithPerPointPropertiesUrl).then(function (
        loader
      ) {
        const components = loader.components;
        expect(components).toBeDefined();
        const isBatched = false;
        expectMetadata(
          components.structuralMetadata,
          {
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
          },
          isBatched
        );

        const primitive = components.nodes[0].primitives[0];
        const attributes = primitive.attributes;
        // 2 geometry attributes + 3 metadata attributes
        expect(attributes.length).toBe(5);
        expectPosition(attributes[0]);
        expectColorRGB(attributes[1]);
      });
    });

    it("loads PointCloudWithUnicodePropertyIds", function () {
      return loadPnts(pointCloudWithUnicodePropertyIdsUrl).then(function (
        loader
      ) {
        const components = loader.components;
        expect(components).toBeDefined();
        const isBatched = false;
        expectMetadata(
          components.structuralMetadata,
          {
            // Originally "temperature ℃", but sanitized for GLSL
            temperature_: {
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
          },
          isBatched
        );

        const primitive = components.nodes[0].primitives[0];
        const attributes = primitive.attributes;
        // 2 geometry attributes + 3 metadata attributes
        expect(attributes.length).toBe(5);
        expectPosition(attributes[0]);
        expectColorRGB(attributes[1]);
      });
    });

    it("loads attributes for 2D", function () {
      return loadPnts(pointCloudRGBUrl, { loadAttributesFor2D: true }).then(
        function (loader) {
          const components = loader.components;
          expect(components).toBeDefined();
          expectEmptyMetadata(components.structuralMetadata);

          const primitive = components.nodes[0].primitives[0];
          const attributes = primitive.attributes;
          expect(attributes.length).toBe(2);

          const positionAttribute = attributes[0];
          expectPosition(positionAttribute);
          expect(positionAttribute.typedArray).toBeDefined();

          expectColorRGB(attributes[1]);
        }
      );
    });

    it("loads attributes for 2D with Draco", function () {
      return loadPnts(pointCloudDracoUrl, { loadAttributesFor2D: true }).then(
        function (loader) {
          const components = loader.components;
          expect(components).toBeDefined();
          const isBatched = false;
          expectMetadata(
            components.structuralMetadata,
            {
              secondaryColor: {
                type: MetadataType.VEC3,
                componentType: MetadataComponentType.FLOAT32,
              },
              temperature: {
                type: MetadataType.SCALAR,
                componentType: MetadataComponentType.FLOAT32,
              },
              id: {
                type: MetadataType.SCALAR,
                componentType: MetadataComponentType.UINT16,
              },
            },
            isBatched
          );

          const primitive = components.nodes[0].primitives[0];
          const attributes = primitive.attributes;
          // 3 geometry attributes + 3 metadata attributes
          expect(attributes.length).toBe(6);

          const positionAttribute = attributes[0];
          expectPositionQuantized(positionAttribute);
          expect(positionAttribute.typedArray).toBeDefined();

          expectNormalOctEncoded(
            attributes[1],
            ComponentDatatype.UNSIGNED_BYTE,
            true
          );
          expectColorRGB(attributes[2]);
        }
      );
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

    it("error decoding a draco point cloud causes loading to fail", function () {
      const readyPromise = pollToPromise(function () {
        return DracoLoader._taskProcessorReady;
      });
      DracoLoader._getDecoderTaskProcessor();
      return readyPromise
        .then(function () {
          const decoder = DracoLoader._getDecoderTaskProcessor();
          spyOn(decoder, "scheduleTask").and.callFake(function () {
            return Promise.reject({ message: "my error" });
          });

          return loadPnts(pointCloudDracoUrl);
        })
        .then(function () {
          fail("should not resolve");
        })
        .catch(function (error) {
          expect(error.message).toBe("Failed to load Draco pnts\nmy error");
        });
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
  },
  "WebGL"
);
