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
        const instanceAttributes = [
          {
            count: options.instanceTransformsData.length / 12,
            componentDatatype: ComponentDatatype.FLOAT,
          },
        ];
        if (defined(options.instanceFeatureIdsData)) {
          instanceAttributes.push({
            semantic: "_FEATURE_ID",
            count: options.instanceFeatureIdsData.length,
            componentDatatype: ComponentDatatype.FLOAT,
            type: "SCALAR",
            typedArray: options.instanceFeatureIdsData,
          });
        }
        instances = {
          attributes: instanceAttributes,
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

    it("returns empty array for model that is not ready", function () {
      const model = { _ready: false };

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      expect(result.length).toBe(0);
    });

    it("extracts positions for a single-feature primitive with identity transform", function () {
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
      expect(entry.positions.length).toBe(3);
      expect(entry.positions[0]).toEqual(positions[0]);
      expect(entry.positions[1]).toEqual(positions[1]);
      expect(entry.positions[2]).toEqual(positions[2]);
      expect(entry.count).toBe(3);
      expect(entry.instances).toBe(1);
    });

    it("extracts feature IDs when extractFeatureIds is true", function () {
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
        extractFeatureIds: true,
      });

      expect(result.length).toBe(1);
      const entry = result[0];
      expect(entry.positions.length).toBe(6);
      expect(entry.featureIds.length).toBe(6);
      expect(entry.featureIds[0]).toBe(0);
      expect(entry.featureIds[1]).toBe(0);
      expect(entry.featureIds[2]).toBe(0);
      expect(entry.featureIds[3]).toBe(1);
      expect(entry.featureIds[4]).toBe(1);
      expect(entry.featureIds[5]).toBe(1);
      expect(entry.positions[0]).toEqual(positions[0]);
      expect(entry.positions[1]).toEqual(positions[1]);
      expect(entry.positions[2]).toEqual(positions[2]);
      expect(entry.positions[3]).toEqual(positions[3]);
      expect(entry.positions[4]).toEqual(positions[4]);
      expect(entry.positions[5]).toEqual(positions[5]);
      expect(entry.count).toBe(6);
      expect(entry.instances).toBe(1);
    });

    it("does not extract feature IDs when extractFeatureIds is false", function () {
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
        extractFeatureIds: false,
      });

      expect(result.length).toBe(1);
      const entry = result[0];
      expect(entry.positions.length).toBe(3);
      expect(entry.featureIds).toBeUndefined();
      expect(entry.count).toBe(3);
      expect(entry.instances).toBe(1);
    });

    it("does not extract feature IDs by default", function () {
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
      });

      expect(result.length).toBe(1);
      const entry = result[0];
      expect(entry.positions.length).toBe(3);
      expect(entry.featureIds).toBeUndefined();
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

      const featurePositions = result[0].positions;
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
      expect(entry.positions.length).toBe(3);
      expect(entry.positions[0]).toEqual(positions[0]);
      expect(entry.positions[1]).toEqual(positions[1]);
      expect(entry.positions[2]).toEqual(positions[2]);
      expect(entry.indices).toBeUndefined();
      expect(entry.count).toBe(3);
      expect(entry.instances).toBe(1);
    });

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
      expect(entry.positions.length).toBe(4);
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
      expect(result[0].positions.length).toBe(3);
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
      expect(result[0].positions.length).toBe(3);
      expect(result[0].indices).toBeUndefined();
      expect(result[0].count).toBe(3);
      expect(result[0].instances).toBe(1);
    });

    it("does not include positions when extractPositions is false", function () {
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
        extractPositions: false,
        extractColors: true,
      });

      expect(result.length).toBe(1);
      const entry = result[0];
      expect(entry.positions).toBeUndefined();
      expect(entry.colors).toBeDefined();
      expect(entry.colors.length).toBe(3);
      expect(entry.primitiveType).toBe(PrimitiveType.TRIANGLES);
      expect(entry.count).toBe(3);
      expect(entry.instances).toBe(1);
    });

    it("returns only primitiveType when both extractPositions and extractColors are false", function () {
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
        extractPositions: false,
        extractColors: false,
      });

      expect(result.length).toBe(1);
      const entry = result[0];
      expect(entry.primitiveType).toBe(PrimitiveType.TRIANGLES);
      expect(entry.positions).toBeUndefined();
      expect(entry.colors).toBeUndefined();
      expect(entry.count).toBe(0);
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
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
        featureIdLabel: "myCustomLabel",
      });

      expect(result[0].positions.length).toBe(3);
      expect(result[0].count).toBe(3);
      expect(result[0].instances).toBe(1);
    });

    it("matches feature ID by positionalLabel", function () {
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
        featureIdLabel: "featureId_0",
      });

      expect(result[0].positions.length).toBe(3);
      expect(result[0].count).toBe(3);
      expect(result[0].instances).toBe(1);
    });

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
        instanceTransformsData: instanceTransformsData,
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      // 3 vertices × 2 instances = 6 positions
      const featurePositions = result[0].positions;
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

      // Two instance transforms
      const instanceTransformsData = new Float32Array([
        1, 0, 0, 10, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 20, 0, 0, 1,
        0,
      ]);

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        colorAttribute: createMockColorAttribute(colors),
        instanceTransformsData: instanceTransformsData,
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
        extractPositions: true,
        extractColors: true,
      });

      const entry = result[0];

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
      expect(entry.count).toBe(3);
      expect(entry.instances).toBe(2);
    });

    it("uses instance featureIds when no per-vertex feature IDs exist", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      // Two instance transforms
      const instanceTransformsData = new Float32Array([
        1, 0, 0, 10, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 20, 0, 0, 1,
        0,
      ]);
      const instanceFeatureIdsData = new Float32Array([42, 99]);

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        // No per-vertex featureIdAttribute
        instanceTransformsData: instanceTransformsData,
        instanceFeatureIdsData: instanceFeatureIdsData,
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      const entry = result[0];
      // 3 vertices × 2 instances = 6 positions
      expect(entry.positions.length).toBe(6);
      // Each vertex in an instance gets that instance's feature ID
      expect(entry.featureIds.length).toBe(6);
      // Instance 0: featureId 42 for all 3 vertices
      expect(entry.featureIds[0]).toBe(42);
      expect(entry.featureIds[1]).toBe(42);
      expect(entry.featureIds[2]).toBe(42);
      // Instance 1: featureId 99 for all 3 vertices
      expect(entry.featureIds[3]).toBe(99);
      expect(entry.featureIds[4]).toBe(99);
      expect(entry.featureIds[5]).toBe(99);
      expect(entry.count).toBe(3);
      expect(entry.instances).toBe(2);
    });

    it("prefers per-vertex feature IDs over instance featureIds", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      const instanceTransformsData = new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
      ]);
      const instanceFeatureIdsData = new Float32Array([42, 99]);

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        featureIdAttribute: createMockFeatureIdAttribute([10, 20, 30]),
        featureIdMapping: {
          setIndex: 0,
          label: "featureId_0",
          positionalLabel: "featureId_0",
        },
        instanceTransformsData: instanceTransformsData,
        instanceFeatureIdsData: instanceFeatureIdsData,
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
        extractFeatureIds: true,
      });

      const entry = result[0];
      expect(entry.featureIds.length).toBe(6);
      // Per-vertex feature IDs take precedence, repeated per instance
      expect(entry.featureIds[0]).toBe(10);
      expect(entry.featureIds[1]).toBe(20);
      expect(entry.featureIds[2]).toBe(30);
      expect(entry.featureIds[3]).toBe(10);
      expect(entry.featureIds[4]).toBe(20);
      expect(entry.featureIds[5]).toBe(30);
      expect(entry.count).toBe(3);
      expect(entry.instances).toBe(2);
    });

    it("does not create featureIds when neither vertex nor instance feature IDs exist", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      const instanceTransformsData = new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
      ]);

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        // No featureIdAttribute, no instanceFeatureIdsData
        instanceTransformsData: instanceTransformsData,
      });

      const result = ModelGeometryExtractor.getGeometryForModel({
        model: model,
      });

      const entry = result[0];
      expect(entry.positions.length).toBe(3);
      expect(entry.featureIds).toBeUndefined();
      expect(entry.count).toBe(3);
      expect(entry.instances).toBe(1);
    });
  },
  "WebGL",
);
