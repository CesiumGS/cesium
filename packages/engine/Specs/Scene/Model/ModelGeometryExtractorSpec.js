import {
  Cartesian3,
  ComponentDatatype,
  defined,
  IndexDatatype,
  Matrix4,
} from "../../../index.js";
import ModelGeometryExtractor from "../../../Source/Scene/Model/ModelGeometryExtractor.js";

describe(
  "Scene/Model/ModelGeometryExtractor",
  function () {
    function createMockPositionAttribute(positions) {
      const typedArray = new Float32Array(positions.length * 3);
      for (let i = 0; i < positions.length; i++) {
        typedArray[i * 3] = positions[i].x;
        typedArray[i * 3 + 1] = positions[i].y;
        typedArray[i * 3 + 2] = positions[i].z;
      }
      return {
        semantic: "_POSITION",
        componentDatatype: ComponentDatatype.FLOAT,
        type: "VEC3",
        count: positions.length,
        typedArray: typedArray,
        byteOffset: 0,
        byteStride: undefined,
        quantization: undefined,
        normalized: false,
        buffer: undefined,
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
        typedArray: typedArray,
        buffer: undefined,
      };
    }

    function createMockIndices(indices) {
      return {
        count: indices.length,
        indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        typedArray: new Uint16Array(indices),
        buffer: undefined,
      };
    }

    function createMockPrimitive(options) {
      const attributes = [options.positionAttribute];
      if (defined(options.featureIdAttribute)) {
        attributes.push(options.featureIdAttribute);
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

      const runtimeNode = {
        node: {
          instances: undefined,
        },
        computedTransform: options.nodeTransform ?? Matrix4.IDENTITY,
        runtimePrimitives: [runtimePrimitive],
        transformsTypedArray: undefined,
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
        ModelGeometryExtractor.getPositionsForFeature();
      }).toThrowDeveloperError();
    });

    it("throws without model", function () {
      expect(function () {
        ModelGeometryExtractor.getPositionsForFeature({
          featureId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws without featureId", function () {
      expect(function () {
        ModelGeometryExtractor.getPositionsForFeature({
          model: {},
        });
      }).toThrowDeveloperError();
    });

    it("returns empty array for model that is not ready", function () {
      const model = { _ready: false };

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
      });

      expect(result).toEqual([]);
    });

    it("returns empty array for model without sceneGraph", function () {
      const model = { _ready: true };

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
      });

      expect(result).toEqual([]);
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

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
      });

      expect(result.length).toBe(3);
      expect(result[0]).toEqual(positions[0]);
      expect(result[1]).toEqual(positions[1]);
      expect(result[2]).toEqual(positions[2]);
    });

    it("extracts only positions for the specified feature ID", function () {
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

      // Extract feature 0
      const result0 = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
      });

      expect(result0.length).toBe(3);
      expect(result0[0]).toEqual(positions[0]);
      expect(result0[1]).toEqual(positions[1]);
      expect(result0[2]).toEqual(positions[2]);

      // Extract feature 1
      const result1 = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 1,
      });

      expect(result1.length).toBe(3);
      expect(result1[0]).toEqual(positions[3]);
      expect(result1[1]).toEqual(positions[4]);
      expect(result1[2]).toEqual(positions[5]);
    });

    it("returns empty array when no vertices match the feature ID", function () {
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

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 99,
      });

      expect(result.length).toBe(0);
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

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
      });

      // Should have 4 unique vertices, not 6
      expect(result.length).toBe(4);
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

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
      });

      expect(result.length).toBe(3);
      expect(result[0]).toEqual(
        new Cartesian3(
          positions[0].x + translation.x,
          positions[0].y + translation.y,
          positions[0].z + translation.z,
        ),
      );
    });

    it("works with non-indexed geometry", function () {
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
        // No indices
      });

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
      });

      expect(result.length).toBe(3);
      expect(result[0]).toEqual(positions[0]);
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

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
      });

      expect(result.length).toBe(3);
    });

    it("returns empty when searching for non-zero feature without feature ID data", function () {
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ];

      const model = createMockModel({
        positionAttribute: createMockPositionAttribute(positions),
        indices: createMockIndices([0, 1, 2]),
      });

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 1,
      });

      expect(result.length).toBe(0);
    });

    it("uses the result parameter for output", function () {
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

      const existingResult = [];
      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
        result: existingResult,
      });

      expect(result).toBe(existingResult);
      expect(result.length).toBe(3);
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

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
        featureIdLabel: "myCustomLabel",
      });

      expect(result.length).toBe(3);
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

      const result = ModelGeometryExtractor.getPositionsForFeature({
        model: model,
        featureId: 0,
        featureIdLabel: "featureId_0",
      });

      expect(result.length).toBe(3);
    });
  },
  "WebGL",
);
