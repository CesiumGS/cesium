import {
  Cartesian3,
  Color,
  ComponentDatatype,
  defined,
  IndexDatatype,
  Matrix4,
  ModelComponents,
  PrimitiveType,
} from "../../../index.js";
import ModelGeometryExtractor from "../../../Source/Scene/Model/ModelGeometryExtractor.js";

describe(
  "Scene/Model/ModelGeometryExtractor",
  function () {
    function createMockBuffer(sourceTypedArray) {
      const byteArray = new Uint8Array(sourceTypedArray.buffer);
      return {
        sizeInBytes: byteArray.byteLength,
        getBufferData: function (targetArray, sourceByteOffset) {
          sourceByteOffset = sourceByteOffset ?? 0;
          if (targetArray instanceof Uint8Array) {
            targetArray.set(byteArray);
          } else {
            const bytesPerElement = targetArray.BYTES_PER_ELEMENT;
            const sourceStart = sourceByteOffset / bytesPerElement;
            for (let i = 0; i < targetArray.length; i++) {
              targetArray[i] = sourceTypedArray[sourceStart + i];
            }
          }
        },
      };
    }

    function createMockPositionAttribute(positions) {
      const typedArray = new Float32Array(positions.length * 3);
      for (let i = 0; i < positions.length; i++) {
        typedArray[i * 3] = positions[i].x;
        typedArray[i * 3 + 1] = positions[i].y;
        typedArray[i * 3 + 2] = positions[i].z;
      }
      return {
        semantic: "POSITION",
        componentDatatype: ComponentDatatype.FLOAT,
        type: "VEC3",
        count: positions.length,
        byteOffset: 0,
        byteStride: undefined,
        quantization: undefined,
        normalized: false,
        buffer: createMockBuffer(typedArray),
      };
    }

    function createMockFeatureIdAttribute(featureIds, setIndex) {
      const typedArray = new Float32Array(featureIds);
      return {
        semantic: "_FEATURE_ID",
        setIndex: setIndex ?? 0,
        componentDatatype: ComponentDatatype.FLOAT,
        type: "SCALAR",
        count: featureIds.length,
        byteOffset: 0,
        byteStride: undefined,
        buffer: createMockBuffer(typedArray),
      };
    }

    function createMockIndices(indices) {
      const typedArray = new Uint16Array(indices);
      return {
        count: indices.length,
        indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        buffer: createMockBuffer(typedArray),
      };
    }

    function createMockColorAttribute(colors, setIndex) {
      const numComponents = 4;
      const typedArray = new Float32Array(colors.length * numComponents);
      for (let i = 0; i < colors.length; i++) {
        typedArray[i * numComponents] = colors[i].red;
        typedArray[i * numComponents + 1] = colors[i].green;
        typedArray[i * numComponents + 2] = colors[i].blue;
        typedArray[i * numComponents + 3] = colors[i].alpha;
      }
      return {
        semantic: "COLOR",
        setIndex: setIndex ?? 0,
        componentDatatype: ComponentDatatype.FLOAT,
        type: "VEC4",
        count: colors.length,
        byteOffset: 0,
        byteStride: undefined,
        quantization: undefined,
        normalized: false,
        buffer: createMockBuffer(typedArray),
      };
    }

    function createMockNormalAttribute(normals) {
      const typedArray = new Float32Array(normals.length * 3);
      for (let i = 0; i < normals.length; i++) {
        typedArray[i * 3] = normals[i].x;
        typedArray[i * 3 + 1] = normals[i].y;
        typedArray[i * 3 + 2] = normals[i].z;
      }
      return {
        semantic: "NORMAL",
        componentDatatype: ComponentDatatype.FLOAT,
        type: "VEC3",
        count: normals.length,
        byteOffset: 0,
        byteStride: undefined,
        quantization: undefined,
        normalized: false,
        buffer: createMockBuffer(typedArray),
      };
    }

    function createMockPrimitive(options) {
      const attributes = [options.positionAttribute];
      if (defined(options.normalAttribute)) {
        attributes.push(options.normalAttribute);
      }
      if (defined(options.featureIdAttribute)) {
        attributes.push(options.featureIdAttribute);
      }
      if (defined(options.colorAttribute)) {
        attributes.push(options.colorAttribute);
      }
      if (defined(options.colorAttributes)) {
        for (let i = 0; i < options.colorAttributes.length; i++) {
          attributes.push(options.colorAttributes[i]);
        }
      }

      const featureIds = [];
      if (defined(options.featureIdMapping)) {
        featureIds.push(options.featureIdMapping);
      }

      return {
        attributes: attributes,
        indices: options.indices,
        featureIds: featureIds,
        primitiveType: 4, // TRIANGLES
      };
    }

    function createMockModel(options) {
      const primitive = createMockPrimitive(options);

      const runtimePrimitive = {
        primitive: primitive,
        boundingSphere: undefined,
      };

      let instances;
      if (defined(options.instanceTranslationsData)) {
        const instanceAttributes = [
          {
            semantic: "TRANSLATION",
            count: options.instanceTranslationsData.length / 3,
            componentDatatype: ComponentDatatype.FLOAT,
            type: "VEC3",
            typedArray: options.instanceTranslationsData,
          },
        ];
        if (defined(options.instanceFeatureIdsData)) {
          instanceAttributes.push({
            semantic: "_FEATURE_ID",
            setIndex: 0,
            count: options.instanceFeatureIdsData.length,
            componentDatatype: ComponentDatatype.FLOAT,
            type: "SCALAR",
            typedArray: options.instanceFeatureIdsData,
          });
        }

        const featureIds = [];
        if (defined(options.instanceFeatureIdsData)) {
          const featureIdAttribute = new ModelComponents.FeatureIdAttribute();
          featureIdAttribute.setIndex = 0;
          featureIdAttribute.positionalLabel =
            options.instanceFeatureIdLabel ?? "instanceFeatureId_0";
          featureIds.push(featureIdAttribute);
        }
        if (defined(options.instanceImplicitRangeFeatureId)) {
          const implicitRange = new ModelComponents.FeatureIdImplicitRange();
          implicitRange.offset = options.instanceImplicitRangeFeatureId.offset;
          implicitRange.repeat = options.instanceImplicitRangeFeatureId.repeat;
          implicitRange.positionalLabel =
            options.instanceImplicitRangeFeatureId.label ??
            "instanceFeatureId_0";
          featureIds.push(implicitRange);
        }

        instances = {
          attributes: instanceAttributes,
          featureIds: featureIds,
          transformInWorldSpace: false,
        };
      }

      const runtimeNode = {
        node: {
          instances: instances,
        },
        computedTransform: options.nodeTransform ?? Matrix4.IDENTITY,
        runtimePrimitives: [runtimePrimitive],
      };

      return {
        _ready: true,
        modelMatrix: options.modelMatrix ?? Matrix4.IDENTITY,
        sceneGraph: {
          _runtimeNodes: [runtimeNode],
          computedModelMatrix: options.computedModelMatrix ?? Matrix4.IDENTITY,
          axisCorrectionMatrix: Matrix4.IDENTITY,
          components: {
            transform: Matrix4.IDENTITY,
          },
        },
      };
    }

    describe("validation", function () {
      it("throws without options", function () {
        expect(function () {
          ModelGeometryExtractor.getGeometryForModel();
        }).toThrowDeveloperError();
      });

      it("throws without model", function () {
        expect(function () {
          ModelGeometryExtractor.getGeometryForModel({});
        }).toThrowDeveloperError();
      });

      it("throws if model is not ready", function () {
        const model = { _ready: false };

        expect(function () {
          ModelGeometryExtractor.getGeometryForModel({
            model: model,
          });
        }).toThrowDeveloperError();
      });
    });

    describe("position extraction", function () {
      it("extracts positions for a single-feature primitive with identity transform (attributes)", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getPositions().length).toBe(3);
        expect(entry.getPositions()[0]).toEqual(positions[0]);
        expect(entry.getPositions()[1]).toEqual(positions[1]);
        expect(entry.getPositions()[2]).toEqual(positions[2]);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(1);
      });

      it("applies node transform to extracted positions", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(0.0, 1.0, 0.0),
          new Cartesian3(0.0, 0.0, 1.0),
        ];

        const translation = new Cartesian3(10.0, 20.0, 30.0);
        const transform = Matrix4.fromTranslation(translation);

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          computedModelMatrix: transform,
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
        });

        const featurePositions = result[0].getPositions();
        expect(featurePositions.length).toBe(3);
        expect(featurePositions[0]).toEqual(
          new Cartesian3(
            positions[0].x + translation.x,
            positions[0].y + translation.y,
            positions[0].z + translation.z,
          ),
        );
        expect(result[0].count).toBe(3);
        expect(result[0].instances).toBe(1);
      });

      it("extracts positions from a model without indices", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          // No indices
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getPositions().length).toBe(3);
        expect(entry.getPositions()[0]).toEqual(positions[0]);
        expect(entry.getPositions()[1]).toEqual(positions[1]);
        expect(entry.getPositions()[2]).toEqual(positions[2]);
        expect(entry.indices).toBeUndefined();
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(1);
      });
    });

    describe("index extraction", function () {
      it("extracts indices when extractIndices is true", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
          new Cartesian3(10.0, 11.0, 12.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          indices: createMockIndices([0, 1, 2, 2, 1, 3]),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          extractIndices: true,
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getPositions().length).toBe(4);
        expect(entry.indices).toBeDefined();
        expect(entry.indices.length).toBe(6);
        expect(entry.indices[0]).toBe(0);
        expect(entry.indices[1]).toBe(1);
        expect(entry.indices[2]).toBe(2);
        expect(entry.indices[3]).toBe(2);
        expect(entry.indices[4]).toBe(1);
        expect(entry.indices[5]).toBe(3);
        expect(entry.count).toBe(4);
        expect(entry.instances).toBe(1);
      });

      it("does not extract indices when extractIndices is false", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          indices: createMockIndices([0, 1, 2]),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          extractIndices: false,
        });

        expect(result.length).toBe(1);
        expect(result[0].getPositions().length).toBe(3);
        expect(result[0].indices).toBeUndefined();
        expect(result[0].count).toBe(3);
        expect(result[0].instances).toBe(1);
      });

      it("does not extract indices by default", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          indices: createMockIndices([0, 1, 2]),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
        });

        expect(result.length).toBe(1);
        expect(result[0].getPositions().length).toBe(3);
        expect(result[0].indices).toBeUndefined();
        expect(result[0].count).toBe(3);
        expect(result[0].instances).toBe(1);
      });
    });

    describe("attribute selection", function () {
      it("does not include positions when POSITION is not in attributes", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const colors = [
          new Color(1.0, 0.0, 0.0, 1.0),
          new Color(0.0, 1.0, 0.0, 1.0),
          new Color(0.0, 0.0, 1.0, 1.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          colorAttribute: createMockColorAttribute(colors),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["COLOR"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getPositions()).toBeUndefined();
        expect(entry.getColors()).toBeDefined();
        expect(entry.getColors().length).toBe(3);
        expect(entry.primitiveType).toBe(PrimitiveType.TRIANGLES);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(1);
      });

      it("returns only primitiveType when attributes is empty", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: [],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.primitiveType).toBe(PrimitiveType.TRIANGLES);
        expect(entry.getPositions()).toBeUndefined();
        expect(entry.getColors()).toBeUndefined();
        expect(entry.count).toBe(0);
        expect(entry.instances).toBe(1);
      });
    });

    describe("feature ID attributes", function () {
      it("extracts feature IDs when _FEATURE_ID is in attributes", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
          new Cartesian3(10.0, 11.0, 12.0),
          new Cartesian3(13.0, 14.0, 15.0),
          new Cartesian3(16.0, 17.0, 18.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0, 1, 1, 1]),
          featureIdMapping: {
            setIndex: 0,
            label: "featureId_0",
            positionalLabel: "featureId_0",
          },
          indices: createMockIndices([0, 1, 2, 3, 4, 5]),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getPositions().length).toBe(6);
        expect(entry.getFeatureIds().length).toBe(6);
        expect(entry.getFeatureIds()[0]).toBe(0);
        expect(entry.getFeatureIds()[1]).toBe(0);
        expect(entry.getFeatureIds()[2]).toBe(0);
        expect(entry.getFeatureIds()[3]).toBe(1);
        expect(entry.getFeatureIds()[4]).toBe(1);
        expect(entry.getFeatureIds()[5]).toBe(1);
        expect(entry.getPositions()[0]).toEqual(positions[0]);
        expect(entry.getPositions()[1]).toEqual(positions[1]);
        expect(entry.getPositions()[2]).toEqual(positions[2]);
        expect(entry.getPositions()[3]).toEqual(positions[3]);
        expect(entry.getPositions()[4]).toEqual(positions[4]);
        expect(entry.getPositions()[5]).toEqual(positions[5]);
        expect(entry.count).toBe(6);
        expect(entry.instances).toBe(1);
      });

      it("does not extract feature IDs when not requested in attributes", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdAttribute: createMockFeatureIdAttribute([0, 0, 1]),
          featureIdMapping: {
            setIndex: 0,
            label: "featureId_0",
            positionalLabel: "featureId_0",
          },
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getPositions().length).toBe(3);
        expect(entry.getFeatureIds()).toBeUndefined();
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(1);
      });

      it("matches feature ID by label", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdAttribute: createMockFeatureIdAttribute([5, 6, 7]),
          featureIdMapping: {
            setIndex: 0,
            label: "myCustomLabel",
            positionalLabel: "featureId_0",
          },
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          featureIdLabel: "myCustomLabel",
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result[0].getFeatureIds()).toBeDefined();
        expect(result[0].getFeatureIds().length).toBe(3);
        expect(result[0].getFeatureIds()[0]).toBe(5);
        expect(result[0].getFeatureIds()[1]).toBe(6);
        expect(result[0].getFeatureIds()[2]).toBe(7);
      });

      it("matches feature ID by positionalLabel", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdAttribute: createMockFeatureIdAttribute([8, 9, 10]),
          featureIdMapping: {
            setIndex: 0,
            label: "someOtherLabel",
            positionalLabel: "featureId_0",
          },
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          featureIdLabel: "featureId_0",
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result[0].getFeatureIds()).toBeDefined();
        expect(result[0].getFeatureIds().length).toBe(3);
        expect(result[0].getFeatureIds()[0]).toBe(8);
        expect(result[0].getFeatureIds()[1]).toBe(9);
        expect(result[0].getFeatureIds()[2]).toBe(10);
      });

      it("does not create featureIds when neither vertex nor instance feature IDs exist", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const instanceTranslationsData = new Float32Array([0, 0, 0]);

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          // No featureIdAttribute, no instanceFeatureIdsData
          instanceTranslationsData: instanceTranslationsData,
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        const entry = result[0];
        expect(entry.getPositions().length).toBe(3);
        expect(entry.getFeatureIds()).toBeUndefined();
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(1);
      });
    });

    describe("primitive type", function () {
      it("includes primitiveType in the result", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
        });

        expect(result[0].primitiveType).toBe(PrimitiveType.TRIANGLES);
        expect(result[0].count).toBe(3);
        expect(result[0].instances).toBe(1);
      });

      it("propagates non-default primitiveType from the primitive", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
        });

        // Override the primitiveType on the primitive inside the mock model
        const runtimeNode = model.sceneGraph._runtimeNodes[0];
        runtimeNode.runtimePrimitives[0].primitive.primitiveType =
          PrimitiveType.LINES;

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
        });

        expect(result[0].primitiveType).toBe(PrimitiveType.LINES);
        expect(result[0].count).toBe(2);
        expect(result[0].instances).toBe(1);
      });
    });

    describe("color and normal extraction", function () {
      it("extracts both COLOR_0 and COLOR_1 when both are requested", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const colors0 = [
          new Color(1.0, 0.0, 0.0, 1.0),
          new Color(0.0, 1.0, 0.0, 1.0),
          new Color(0.0, 0.0, 1.0, 1.0),
        ];

        const colors1 = [
          new Color(0.5, 0.5, 0.0, 1.0),
          new Color(0.0, 0.5, 0.5, 1.0),
          new Color(0.5, 0.0, 0.5, 1.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          colorAttributes: [
            createMockColorAttribute(colors0, 0),
            createMockColorAttribute(colors1, 1),
          ],
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "COLOR_0", "COLOR_1"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];

        expect(entry.getPositions().length).toBe(3);

        const c0 = entry.getAttributeValues("COLOR_0");
        expect(c0).toBeDefined();
        expect(c0.length).toBe(3);
        expect(c0[0]).toEqual(colors0[0]);
        expect(c0[1]).toEqual(colors0[1]);
        expect(c0[2]).toEqual(colors0[2]);

        const c1 = entry.getAttributeValues("COLOR_1");
        expect(c1).toBeDefined();
        expect(c1.length).toBe(3);
        expect(c1[0]).toEqual(colors1[0]);
        expect(c1[1]).toEqual(colors1[1]);
        expect(c1[2]).toEqual(colors1[2]);

        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(1);
      });

      it("extracts normals when NORMAL is in attributes", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const normals = [
          new Cartesian3(0.0, 0.0, 1.0),
          new Cartesian3(0.0, 1.0, 0.0),
          new Cartesian3(1.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          normalAttribute: createMockNormalAttribute(normals),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "NORMAL"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];

        expect(entry.getPositions().length).toBe(3);
        expect(entry.getNormals()).toBeDefined();
        expect(entry.getNormals().length).toBe(3);
        expect(entry.getNormals()[0]).toEqual(normals[0]);
        expect(entry.getNormals()[1]).toEqual(normals[1]);
        expect(entry.getNormals()[2]).toEqual(normals[2]);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(1);
      });
    });

    describe("instancing", function () {
      it("duplicates positions for each instance transform", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        // Two instance translations as vec3:
        // Instance 0: translate by (10, 0, 0)
        // Instance 1: translate by (0, 20, 0)
        const instanceTranslationsData = new Float32Array([10, 0, 0, 0, 20, 0]);

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          instanceTranslationsData: instanceTranslationsData,
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
        });

        // 3 vertices Ã— 2 instances = 6 positions
        const featurePositions = result[0].getPositions();
        expect(featurePositions.length).toBe(6);

        // Instance 0 (translate +10 x): all 3 vertices
        expect(featurePositions[0]).toEqual(new Cartesian3(11.0, 2.0, 3.0));
        expect(featurePositions[1]).toEqual(new Cartesian3(14.0, 5.0, 6.0));
        expect(featurePositions[2]).toEqual(new Cartesian3(17.0, 8.0, 9.0));

        // Instance 1 (translate +20 y): all 3 vertices
        expect(featurePositions[3]).toEqual(new Cartesian3(1.0, 22.0, 3.0));
        expect(featurePositions[4]).toEqual(new Cartesian3(4.0, 25.0, 6.0));
        expect(featurePositions[5]).toEqual(new Cartesian3(7.0, 28.0, 9.0));
        expect(result[0].count).toBe(3);
        expect(result[0].instances).toBe(2);
      });

      it("duplicates colors per instance transform to match positions length", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const colors = [
          new Color(1.0, 0.0, 0.0, 1.0),
          new Color(0.0, 1.0, 0.0, 1.0),
          new Color(0.0, 0.0, 1.0, 1.0),
        ];

        // Two instance translations as vec3
        const instanceTranslationsData = new Float32Array([10, 0, 0, 0, 20, 0]);

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          colorAttribute: createMockColorAttribute(colors),
          instanceTranslationsData: instanceTranslationsData,
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "COLOR"],
        });

        const entry = result[0];

        // Both duplicated: 3 vertices Ã— 2 instances = 6
        expect(entry.getPositions().length).toBe(6);
        expect(entry.getColors().length).toBe(6);

        // Instance 0: all 3 vertex colors
        expect(entry.getColors()[0]).toEqual(colors[0]);
        expect(entry.getColors()[1]).toEqual(colors[1]);
        expect(entry.getColors()[2]).toEqual(colors[2]);
        // Instance 1: same 3 vertex colors repeated
        expect(entry.getColors()[3]).toEqual(colors[0]);
        expect(entry.getColors()[4]).toEqual(colors[1]);
        expect(entry.getColors()[5]).toEqual(colors[2]);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(2);
      });

      it("uses instance featureIds when no per-vertex feature IDs exist", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        // Two instance translations as vec3
        const instanceTranslationsData = new Float32Array([10, 0, 0, 0, 20, 0]);
        const instanceFeatureIdsData = new Float32Array([42, 99]);

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          // No per-vertex featureIdAttribute
          instanceTranslationsData: instanceTranslationsData,
          instanceFeatureIdsData: instanceFeatureIdsData,
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        const entry = result[0];
        // 3 vertices Ã— 2 instances = 6 positions
        expect(entry.getPositions().length).toBe(6);
        // Each vertex in an instance gets that instance's feature ID
        expect(entry.getFeatureIds().length).toBe(6);
        // Instance 0: featureId 42 for all 3 vertices
        expect(entry.getFeatureIds()[0]).toBe(42);
        expect(entry.getFeatureIds()[1]).toBe(42);
        expect(entry.getFeatureIds()[2]).toBe(42);
        // Instance 1: featureId 99 for all 3 vertices
        expect(entry.getFeatureIds()[3]).toBe(99);
        expect(entry.getFeatureIds()[4]).toBe(99);
        expect(entry.getFeatureIds()[5]).toBe(99);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(2);
      });

      it("prefers instance featureIds over per-vertex feature IDs", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const instanceTranslationsData = new Float32Array([0, 0, 0, 0, 0, 0]);
        const instanceFeatureIdsData = new Float32Array([42, 99]);

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdAttribute: createMockFeatureIdAttribute([10, 20, 30]),
          featureIdMapping: {
            setIndex: 0,
            label: "featureId_0",
            positionalLabel: "featureId_0",
          },
          instanceTranslationsData: instanceTranslationsData,
          instanceFeatureIdsData: instanceFeatureIdsData,
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        const entry = result[0];
        expect(entry.getFeatureIds().length).toBe(6);
        // Instance feature IDs take precedence over per-vertex
        // Instance 0 (featureId 42): 3 vertices
        expect(entry.getFeatureIds()[0]).toBe(42);
        expect(entry.getFeatureIds()[1]).toBe(42);
        expect(entry.getFeatureIds()[2]).toBe(42);
        // Instance 1 (featureId 99): 3 vertices
        expect(entry.getFeatureIds()[3]).toBe(99);
        expect(entry.getFeatureIds()[4]).toBe(99);
        expect(entry.getFeatureIds()[5]).toBe(99);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(2);
      });
    });

    describe("FeatureIdImplicitRange", function () {
      it("extracts feature IDs from FeatureIdImplicitRange with repeat", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
          new Cartesian3(10.0, 11.0, 12.0),
          new Cartesian3(13.0, 14.0, 15.0),
          new Cartesian3(16.0, 17.0, 18.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdMapping: {
            offset: 0,
            repeat: 3,
            label: "featureId_0",
            positionalLabel: "featureId_0",
          },
          indices: createMockIndices([0, 1, 2, 3, 4, 5]),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getPositions().length).toBe(6);
        expect(entry.getFeatureIds()).toBeDefined();
        expect(entry.getFeatureIds().length).toBe(6);
        // offset + floor(i / repeat) = 0 + floor(i / 3)
        expect(entry.getFeatureIds()[0]).toBe(0);
        expect(entry.getFeatureIds()[1]).toBe(0);
        expect(entry.getFeatureIds()[2]).toBe(0);
        expect(entry.getFeatureIds()[3]).toBe(1);
        expect(entry.getFeatureIds()[4]).toBe(1);
        expect(entry.getFeatureIds()[5]).toBe(1);
        expect(entry.count).toBe(6);
        expect(entry.instances).toBe(1);
      });

      it("extracts feature IDs from FeatureIdImplicitRange with offset and repeat", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(2.0, 0.0, 0.0),
          new Cartesian3(3.0, 0.0, 0.0),
          new Cartesian3(4.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdMapping: {
            offset: 5,
            repeat: 2,
            label: "featureId_0",
            positionalLabel: "featureId_0",
          },
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getFeatureIds()).toBeDefined();
        expect(entry.getFeatureIds().length).toBe(4);
        // offset + floor(i / repeat) = 5 + floor(i / 2)
        expect(entry.getFeatureIds()[0]).toBe(5);
        expect(entry.getFeatureIds()[1]).toBe(5);
        expect(entry.getFeatureIds()[2]).toBe(6);
        expect(entry.getFeatureIds()[3]).toBe(6);
        expect(entry.count).toBe(4);
        expect(entry.instances).toBe(1);
      });

      it("extracts feature IDs from FeatureIdImplicitRange without repeat", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(2.0, 0.0, 0.0),
          new Cartesian3(3.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdMapping: {
            offset: 7,
            repeat: undefined,
            label: "featureId_0",
            positionalLabel: "featureId_0",
          },
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getFeatureIds()).toBeDefined();
        expect(entry.getFeatureIds().length).toBe(3);
        // All values equal to offset when repeat is undefined
        expect(entry.getFeatureIds()[0]).toBe(7);
        expect(entry.getFeatureIds()[1]).toBe(7);
        expect(entry.getFeatureIds()[2]).toBe(7);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(1);
      });

      it("matches FeatureIdImplicitRange by label", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(2.0, 0.0, 0.0),
          new Cartesian3(3.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdMapping: {
            offset: 0,
            repeat: 1,
            label: "myImplicitRange",
            positionalLabel: "featureId_0",
          },
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          featureIdLabel: "myImplicitRange",
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getFeatureIds()).toBeDefined();
        expect(entry.getFeatureIds().length).toBe(3);
        expect(entry.getFeatureIds()[0]).toBe(0);
        expect(entry.getFeatureIds()[1]).toBe(1);
        expect(entry.getFeatureIds()[2]).toBe(2);
      });

      it("duplicates FeatureIdImplicitRange values per instance", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(2.0, 0.0, 0.0),
          new Cartesian3(3.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          featureIdMapping: {
            offset: 0,
            repeat: 1,
            label: "featureId_0",
            positionalLabel: "featureId_0",
          },
          instanceTranslationsData: new Float32Array([
            0,
            0,
            0, // instance 0
            10,
            0,
            0, // instance 1
          ]),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getFeatureIds()).toBeDefined();
        // 3 vertices * 2 instances = 6
        expect(entry.getFeatureIds().length).toBe(6);
        expect(entry.getFeatureIds()[0]).toBe(0);
        expect(entry.getFeatureIds()[1]).toBe(1);
        expect(entry.getFeatureIds()[2]).toBe(2);
        expect(entry.getFeatureIds()[3]).toBe(0);
        expect(entry.getFeatureIds()[4]).toBe(1);
        expect(entry.getFeatureIds()[5]).toBe(2);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(2);
      });

      it("uses instance FeatureIdImplicitRange when no per-vertex feature IDs exist", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(2.0, 0.0, 0.0),
          new Cartesian3(3.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          instanceTranslationsData: new Float32Array([
            0,
            0,
            0, // instance 0
            10,
            0,
            0, // instance 1
            20,
            0,
            0, // instance 2
            30,
            0,
            0, // instance 3
          ]),
          instanceImplicitRangeFeatureId: {
            offset: 10,
            repeat: 1,
          },
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        // 3 vertices * 4 instances = 12 positions
        expect(entry.getPositions().length).toBe(12);
        expect(entry.getFeatureIds()).toBeDefined();
        // Each instance's vertices get that instance's implicit range feature ID
        // Instance feature IDs: offset + floor(i / repeat) = 10 + i
        //   instance 0: 10, instance 1: 11, instance 2: 12, instance 3: 13
        expect(entry.getFeatureIds().length).toBe(12);
        // Instance 0 (featureId 10): 3 vertices
        expect(entry.getFeatureIds()[0]).toBe(10);
        expect(entry.getFeatureIds()[1]).toBe(10);
        expect(entry.getFeatureIds()[2]).toBe(10);
        // Instance 1 (featureId 11): 3 vertices
        expect(entry.getFeatureIds()[3]).toBe(11);
        expect(entry.getFeatureIds()[4]).toBe(11);
        expect(entry.getFeatureIds()[5]).toBe(11);
        // Instance 2 (featureId 12): 3 vertices
        expect(entry.getFeatureIds()[6]).toBe(12);
        expect(entry.getFeatureIds()[7]).toBe(12);
        expect(entry.getFeatureIds()[8]).toBe(12);
        // Instance 3 (featureId 13): 3 vertices
        expect(entry.getFeatureIds()[9]).toBe(13);
        expect(entry.getFeatureIds()[10]).toBe(13);
        expect(entry.getFeatureIds()[11]).toBe(13);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(4);
      });
    });

    describe("instanceFeatureIdLabel", function () {
      it("instanceFeatureIdLabel defaults to instanceFeatureId_0", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(2.0, 0.0, 0.0),
          new Cartesian3(3.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          instanceTranslationsData: new Float32Array([0, 0, 0, 10, 0, 0]),
          instanceFeatureIdsData: new Float32Array([42, 99]),
        });

        // No instanceFeatureIdLabel passed â€” should use default "instanceFeatureId_0"
        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getFeatureIds()).toBeDefined();
        expect(entry.getFeatureIds().length).toBe(6);
        // Instance 0 (featureId 42): 3 vertices
        expect(entry.getFeatureIds()[0]).toBe(42);
        expect(entry.getFeatureIds()[1]).toBe(42);
        expect(entry.getFeatureIds()[2]).toBe(42);
        // Instance 1 (featureId 99): 3 vertices
        expect(entry.getFeatureIds()[3]).toBe(99);
        expect(entry.getFeatureIds()[4]).toBe(99);
        expect(entry.getFeatureIds()[5]).toBe(99);
      });

      it("instanceFeatureIdLabel selects matching instance feature ID set", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(2.0, 0.0, 0.0),
          new Cartesian3(3.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          instanceTranslationsData: new Float32Array([0, 0, 0, 10, 0, 0]),
          instanceImplicitRangeFeatureId: {
            offset: 5,
            repeat: 1,
            label: "myCustomLabel",
          },
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
          instanceFeatureIdLabel: "myCustomLabel",
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getFeatureIds()).toBeDefined();
        expect(entry.getFeatureIds().length).toBe(6);
        // Instance 0 (featureId 5): 3 vertices
        expect(entry.getFeatureIds()[0]).toBe(5);
        expect(entry.getFeatureIds()[1]).toBe(5);
        expect(entry.getFeatureIds()[2]).toBe(5);
        // Instance 1 (featureId 6): 3 vertices
        expect(entry.getFeatureIds()[3]).toBe(6);
        expect(entry.getFeatureIds()[4]).toBe(6);
        expect(entry.getFeatureIds()[5]).toBe(6);
      });

      it("instanceFeatureIdLabel with non-matching label produces no instance feature IDs", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(2.0, 0.0, 0.0),
          new Cartesian3(3.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          instanceTranslationsData: new Float32Array([0, 0, 0, 10, 0, 0]),
          instanceFeatureIdsData: new Float32Array([42, 99]),
        });

        // Pass a label that doesn't match any instance feature ID set
        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
          instanceFeatureIdLabel: "nonExistentLabel",
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        // No feature IDs should be resolved since the label doesn't match
        expect(entry.getFeatureIds()).toBeUndefined();
      });

      it("instanceFeatureIdLabel selects FeatureIdAttribute by custom label", function () {
        const positions = [
          new Cartesian3(1.0, 0.0, 0.0),
          new Cartesian3(2.0, 0.0, 0.0),
          new Cartesian3(3.0, 0.0, 0.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          instanceTranslationsData: new Float32Array([0, 0, 0, 10, 0, 0]),
          instanceFeatureIdsData: new Float32Array([7, 13]),
          instanceFeatureIdLabel: "buildingId",
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
          attributes: ["POSITION", "_FEATURE_ID"],
          instanceFeatureIdLabel: "buildingId",
        });

        expect(result.length).toBe(1);
        const entry = result[0];
        expect(entry.getFeatureIds()).toBeDefined();
        expect(entry.getFeatureIds().length).toBe(6);
        // Instance 0 (featureId 7): 3 vertices
        expect(entry.getFeatureIds()[0]).toBe(7);
        expect(entry.getFeatureIds()[1]).toBe(7);
        expect(entry.getFeatureIds()[2]).toBe(7);
        // Instance 1 (featureId 13): 3 vertices
        expect(entry.getFeatureIds()[3]).toBe(13);
        expect(entry.getFeatureIds()[4]).toBe(13);
        expect(entry.getFeatureIds()[5]).toBe(13);
      });
    });

    describe("default attributes (no options.attributes)", function () {
      it("extracts all available attributes when attributes is undefined", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const normals = [
          new Cartesian3(0.0, 0.0, 1.0),
          new Cartesian3(0.0, 1.0, 0.0),
          new Cartesian3(1.0, 0.0, 0.0),
        ];

        const colors = [
          new Color(1.0, 0.0, 0.0, 1.0),
          new Color(0.0, 1.0, 0.0, 1.0),
          new Color(0.0, 0.0, 1.0, 1.0),
        ];

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          normalAttribute: createMockNormalAttribute(normals),
          colorAttribute: createMockColorAttribute(colors),
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
        });

        expect(result.length).toBe(1);
        const entry = result[0];

        // All three attribute types are extracted
        expect(entry.getPositions()).toBeDefined();
        expect(entry.getPositions().length).toBe(3);
        expect(entry.getPositions()[0]).toEqual(positions[0]);
        expect(entry.getPositions()[1]).toEqual(positions[1]);
        expect(entry.getPositions()[2]).toEqual(positions[2]);
        expect(entry.getNormals()).toBeDefined();
        expect(entry.getNormals().length).toBe(3);
        expect(entry.getNormals()[0]).toEqual(normals[0]);
        expect(entry.getNormals()[1]).toEqual(normals[1]);
        expect(entry.getNormals()[2]).toEqual(normals[2]);
        expect(entry.getColors()).toBeDefined();
        expect(entry.getColors().length).toBe(3);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(1);

        // Attribute names and types are recorded
        expect(entry.attributeNames).toContain("POSITION");
        expect(entry.attributeNames).toContain("NORMAL");
        expect(entry.attributeNames).toContain("COLOR_0");
        expect(entry.getAttributeType("POSITION").type).toBe("VEC3");
        expect(entry.getAttributeType("POSITION").componentDatatype).toBe(
          ComponentDatatype.FLOAT,
        );
        expect(entry.getAttributeType("NORMAL").type).toBe("VEC3");
        expect(entry.getAttributeType("COLOR_0").type).toBe("VEC4");

        // Attributes not on the primitive are not present
        expect(entry.getFeatureIds()).toBeUndefined();
      });

      it("extracts instance feature IDs when attributes is undefined", function () {
        const positions = [
          new Cartesian3(1.0, 2.0, 3.0),
          new Cartesian3(4.0, 5.0, 6.0),
          new Cartesian3(7.0, 8.0, 9.0),
        ];

        const instanceTranslationsData = new Float32Array([10, 0, 0, 0, 20, 0]);
        const instanceFeatureIdsData = new Float32Array([42, 99]);

        const model = createMockModel({
          positionAttribute: createMockPositionAttribute(positions),
          instanceTranslationsData: instanceTranslationsData,
          instanceFeatureIdsData: instanceFeatureIdsData,
        });

        const result = ModelGeometryExtractor.getGeometryForModel({
          model: model,
        });

        expect(result.length).toBe(1);
        const entry = result[0];

        // 3 vertices × 2 instances = 6 positions
        expect(entry.getPositions()).toBeDefined();
        expect(entry.getPositions().length).toBe(6);

        // Instance feature IDs are extracted
        expect(entry.getFeatureIds()).toBeDefined();
        expect(entry.getFeatureIds().length).toBe(6);
        // Instance 0: featureId 42 for all 3 vertices
        expect(entry.getFeatureIds()[0]).toBe(42);
        expect(entry.getFeatureIds()[1]).toBe(42);
        expect(entry.getFeatureIds()[2]).toBe(42);
        // Instance 1: featureId 99 for all 3 vertices
        expect(entry.getFeatureIds()[3]).toBe(99);
        expect(entry.getFeatureIds()[4]).toBe(99);
        expect(entry.getFeatureIds()[5]).toBe(99);
        expect(entry.count).toBe(3);
        expect(entry.instances).toBe(2);
      });
    });
  },
  "WebGL",
);
