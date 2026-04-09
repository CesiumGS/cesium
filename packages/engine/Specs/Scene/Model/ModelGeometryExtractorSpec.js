import {
  Cartesian3,
  Color,
  ComponentDatatype,
  defined,
  IndexDatatype,
  Matrix4,
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

    function createMockColorAttribute(colors) {
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
        setIndex: 0,
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

    function createMockPrimitive(options) {
      const attributes = [options.positionAttribute];
      if (defined(options.featureIdAttribute)) {
        attributes.push(options.featureIdAttribute);
      }
      if (defined(options.colorAttribute)) {
        attributes.push(options.colorAttribute);
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
      if (defined(options.instanceTransformsData)) {
        instances = {
          attributes: [
            {
              count: options.instanceTransformsData.length / 12,
              componentDatatype: ComponentDatatype.FLOAT,
            },
          ],
          transformInWorldSpace: false,
        };
      }

      const runtimeNode = {
        node: {
          instances: instances,
        },
        computedTransform: options.nodeTransform ?? Matrix4.IDENTITY,
        runtimePrimitives: [runtimePrimitive],
        transformsTypedArray: options.instanceTransformsData,
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

    it("returns empty map for model that is not ready", function () {
      const model = { _ready: false };

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      expect(result.size).toBe(0);
    });

    it("returns empty map for model without sceneGraph", function () {
      const model = { _ready: true };

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      expect(result.size).toBe(0);
    });

    it("extracts positions for a single-feature primitive with identity transform", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "featureId_0",
          positionalLabel: "featureId_0",
        },
        indices: createMockIndices([0, 1, 2]),
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      expect(result.size).toBe(1);
      expect(result.has(0)).toBe(true);
      const entry = result.get(0);
      expect(entry.positions.length).toBe(3);
      expect(entry.positions[0]).toEqual(positions[0]);
      expect(entry.positions[1]).toEqual(positions[1]);
      expect(entry.positions[2]).toEqual(positions[2]);
    });

    it("groups positions by feature ID", function () {
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
      });

      expect(result.size).toBe(2);

      const entry0 = result.get(0);
      expect(entry0.positions.length).toBe(3);
      expect(entry0.positions[0]).toEqual(positions[0]);
      expect(entry0.positions[1]).toEqual(positions[1]);
      expect(entry0.positions[2]).toEqual(positions[2]);

      const entry1 = result.get(1);
      expect(entry1.positions.length).toBe(3);
      expect(entry1.positions[0]).toEqual(positions[3]);
      expect(entry1.positions[1]).toEqual(positions[4]);
      expect(entry1.positions[2]).toEqual(positions[5]);
    });

    it("deduplicates vertex indices when shared by multiple triangles", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
        new Cartesian3(10.0, 11.0, 12.0),
      ];

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "featureId_0",
          positionalLabel: "featureId_0",
        },
        // Two triangles sharing vertices 1 and 2
        indices: createMockIndices([0, 1, 2, 1, 2, 3]),
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      // Should have 4 unique vertices, not 6
      expect(result.get(0).positions.length).toBe(4);
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
        featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "featureId_0",
          positionalLabel: "featureId_0",
        },
        indices: createMockIndices([0, 1, 2]),
        computedModelMatrix: transform,
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      const featurePositions = result.get(0).positions;
      expect(featurePositions.length).toBe(3);
      expect(featurePositions[0]).toEqual(
        new Cartesian3(
          positions[0].x + translation.x,
          positions[0].y + translation.y,
          positions[0].z + translation.z,
        ),
      );
    });

    it("works without feature ID mapping (all vertices treated as feature 0)", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        // No feature ID attribute or mapping
        indices: createMockIndices([0, 1, 2]),
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      expect(result.get(0).positions.length).toBe(3);
    });

    it("does not include positions when extractPositions is false", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "featureId_0",
          positionalLabel: "featureId_0",
        },
        indices: createMockIndices([0, 1, 2]),
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
        extractPositions: false,
        extractColors: false,
      });

      // Nothing requested, map should be empty since no attributes were found
      expect(result.size).toBe(0);
    });

    it("matches feature ID by label", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "myCustomLabel",
          positionalLabel: "featureId_0",
        },
        indices: createMockIndices([0, 1, 2]),
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
        featureIdLabel: "myCustomLabel",
      });

      expect(result.get(0).positions.length).toBe(3);
    });

    it("matches feature ID by positionalLabel", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "someOtherLabel",
          positionalLabel: "featureId_0",
        },
        indices: createMockIndices([0, 1, 2]),
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
        featureIdLabel: "featureId_0",
      });

      expect(result.get(0).positions.length).toBe(3);
    });

    it("includes primitiveType in the result", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "featureId_0",
          positionalLabel: "featureId_0",
        },
        indices: createMockIndices([0, 1, 2]),
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      expect(result.get(0).primitiveType).toBe(PrimitiveType.TRIANGLES);
    });

    it("propagates non-default primitiveType from the primitive", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
      ];

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        featureIdAttribute: createMockFeatureIdAttribute([0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "featureId_0",
          positionalLabel: "featureId_0",
        },
        indices: createMockIndices([0, 1]),
      });

      // Override the primitiveType on the primitive inside the mock model
      const runtimeNode = model.sceneGraph._runtimeNodes[0];
      runtimeNode.runtimePrimitives[0].primitive.primitiveType =
        PrimitiveType.LINES;

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      expect(result.get(0).primitiveType).toBe(PrimitiveType.LINES);
    });

    it("duplicates positions for each instance transform", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      // Two instance transforms as packed 12-float matrices (3 rows × 4 cols):
      // Instance 0: translate by (10, 0, 0)
      // Instance 1: translate by (0, 20, 0)
      const instanceTransformsData = new Float32Array([
        // Instance 0: identity rotation + translation (10, 0, 0)
        1, 0, 0, 10, 0, 1, 0, 0, 0, 0, 1, 0,
        // Instance 1: identity rotation + translation (0, 20, 0)
        1, 0, 0, 0, 0, 1, 0, 20, 0, 0, 1, 0,
      ]);

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "featureId_0",
          positionalLabel: "featureId_0",
        },
        indices: createMockIndices([0, 1, 2]),
        instanceTransformsData: instanceTransformsData,
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      // 3 vertices × 2 instances = 6 positions
      const featurePositions = result.get(0).positions;
      expect(featurePositions.length).toBe(6);

      // Instance 0 (translate +10 x): all 3 vertices
      expect(featurePositions[0]).toEqual(new Cartesian3(11.0, 2.0, 3.0));
      expect(featurePositions[1]).toEqual(new Cartesian3(14.0, 5.0, 6.0));
      expect(featurePositions[2]).toEqual(new Cartesian3(17.0, 8.0, 9.0));

      // Instance 1 (translate +20 y): all 3 vertices
      expect(featurePositions[3]).toEqual(new Cartesian3(1.0, 22.0, 3.0));
      expect(featurePositions[4]).toEqual(new Cartesian3(4.0, 25.0, 6.0));
      expect(featurePositions[5]).toEqual(new Cartesian3(7.0, 28.0, 9.0));
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

      // Two instance transforms
      const instanceTransformsData = new Float32Array([
        1, 0, 0, 10, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 20, 0, 0, 1,
        0,
      ]);

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        colorAttribute: createMockColorAttribute(colors),
        featureIdAttribute: createMockFeatureIdAttribute([0, 0, 0]),
        featureIdMapping: {
          setIndex: 0,
          label: "featureId_0",
          positionalLabel: "featureId_0",
        },
        indices: createMockIndices([0, 1, 2]),
        instanceTransformsData: instanceTransformsData,
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
        extractPositions: true,
        extractColors: true,
      });

      const entry = result.get(0);

      // Both duplicated: 3 vertices × 2 instances = 6
      expect(entry.positions.length).toBe(6);
      expect(entry.colors.length).toBe(6);

      // Instance 0: all 3 vertex colors
      expect(entry.colors[0]).toEqual(colors[0]);
      expect(entry.colors[1]).toEqual(colors[1]);
      expect(entry.colors[2]).toEqual(colors[2]);
      // Instance 1: same 3 vertex colors repeated
      expect(entry.colors[3]).toEqual(colors[0]);
      expect(entry.colors[4]).toEqual(colors[1]);
      expect(entry.colors[5]).toEqual(colors[2]);
    });
  },
  "WebGL",
);
