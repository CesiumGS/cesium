import {
  AttributeType,
  Cartesian3,
  Color,
  ComponentDatatype,
  IndexDatatype,
  Matrix4,
  ModelMeshUtility,
  VertexAttributeSemantic,
} from "../../../index.js";

describe("Scene/Model/ModelMeshUtility", function () {
  describe("readPositionData", function () {
    function createMockPrimitive(positionAttributeOptions) {
      const attributes = [];
      if (defined(positionAttributeOptions)) {
        attributes.push(
          Object.assign(
            {
              semantic: VertexAttributeSemantic.POSITION,
              componentDatatype: ComponentDatatype.FLOAT,
              type: AttributeType.VEC3,
              count: 3,
              byteOffset: 0,
              byteStride: undefined,
              typedArray: undefined,
              quantization: undefined,
              buffer: undefined,
              normalized: false,
            },
            positionAttributeOptions,
          ),
        );
      }
      return { attributes: attributes };
    }

    function defined(value) {
      return value !== undefined && value !== null;
    }

    it("returns undefined when primitive has no position attribute", function () {
      const primitive = createMockPrimitive();
      const result = ModelMeshUtility.readPositionData(primitive);
      expect(result).toBeUndefined();
    });

    it("returns position data from a CPU typed array", function () {
      const positions = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const primitive = createMockPrimitive({
        typedArray: positions,
        count: 3,
      });

      const result = ModelMeshUtility.readPositionData(primitive);

      expect(result).toBeDefined();
      expect(result.typedArray).toBe(positions);
      expect(result.elementStride).toBe(3);
      expect(result.offset).toBe(0);
      expect(result.quantization).toBeUndefined();
      expect(result.count).toBe(3);
    });

    it("uses quantization metadata when present", function () {
      const positions = new Uint16Array([100, 200, 300, 400, 500, 600]);
      const quantization = {
        componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
        type: AttributeType.VEC3,
      };
      const primitive = createMockPrimitive({
        typedArray: positions,
        count: 2,
        quantization: quantization,
      });

      const result = ModelMeshUtility.readPositionData(primitive);

      expect(result).toBeDefined();
      expect(result.typedArray).toBe(positions);
      expect(result.quantization).toBe(quantization);
      expect(result.elementStride).toBe(3);
      expect(result.count).toBe(2);
    });

    it("computes interleaved stride and offset", function () {
      // VEC3 FLOAT = 3 components * 4 bytes = 12 bytes
      // byteStride of 24 means interleaved with other data
      const interleaved = new Float32Array([
        1, 2, 3, 0, 0, 0, 4, 5, 6, 0, 0, 0,
      ]);

      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < interleaved.length; i++) {
            outputArray[i] = interleaved[i];
          }
        },
      };

      const primitive = createMockPrimitive({
        count: 2,
        byteStride: 24,
        byteOffset: 0,
        buffer: mockBuffer,
      });

      const frameState = {
        context: { webgl2: true },
      };

      const result = ModelMeshUtility.readPositionData(primitive, frameState);

      expect(result).toBeDefined();
      expect(result.elementStride).toBe(6);
      expect(result.offset).toBe(0);
      expect(result.count).toBe(2);
    });

    it("falls back to GPU readback when typed array is missing", function () {
      const gpuData = new Float32Array([10, 20, 30, 40, 50, 60]);

      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < gpuData.length; i++) {
            outputArray[i] = gpuData[i];
          }
        },
      };

      const primitive = createMockPrimitive({
        count: 2,
        buffer: mockBuffer,
      });

      const frameState = {
        context: { webgl2: true },
      };

      const result = ModelMeshUtility.readPositionData(primitive, frameState);

      expect(result).toBeDefined();
      expect(result.typedArray.length).toBe(6);
      expect(result.count).toBe(2);
    });

    it("returns undefined when no typed array and no frameState", function () {
      const primitive = createMockPrimitive({
        count: 2,
        buffer: {},
      });

      const result = ModelMeshUtility.readPositionData(primitive);
      expect(result).toBeUndefined();
    });

    it("returns undefined when no typed array and no buffer", function () {
      const primitive = createMockPrimitive({
        count: 2,
      });

      const result = ModelMeshUtility.readPositionData(primitive);
      expect(result).toBeUndefined();
    });

    it("computes interleaved offset from byteOffset", function () {
      // byteStride 32 with FLOAT VEC3 (12 bytes) = interleaved
      // byteOffset 8 / 4 bytes = offset of 2
      const data = new Float32Array(16);

      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < data.length; i++) {
            outputArray[i] = data[i];
          }
        },
      };

      const primitive = createMockPrimitive({
        count: 2,
        byteStride: 32,
        byteOffset: 8,
        buffer: mockBuffer,
      });

      const frameState = {
        context: { webgl2: true },
      };

      const result = ModelMeshUtility.readPositionData(primitive, frameState);

      expect(result).toBeDefined();
      expect(result.elementStride).toBe(8);
      expect(result.offset).toBe(2);
    });
  });

  describe("readIndices", function () {
    it("returns undefined when primitive has no indices", function () {
      const primitive = {};
      const result = ModelMeshUtility.readIndices(primitive);
      expect(result).toBeUndefined();
    });

    it("returns typed array when available", function () {
      const typedArray = new Uint16Array([0, 1, 2, 3, 4, 5]);
      const primitive = {
        indices: {
          typedArray: typedArray,
          count: 6,
          indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        },
      };

      const result = ModelMeshUtility.readIndices(primitive);
      expect(result.typedArray).toBe(typedArray);
      expect(result.count).toBe(6);
    });

    it("falls back to GPU readback for UNSIGNED_BYTE indices", function () {
      const gpuData = new Uint8Array([0, 1, 2]);
      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < gpuData.length; i++) {
            outputArray[i] = gpuData[i];
          }
        },
      };

      const primitive = {
        indices: {
          typedArray: undefined,
          buffer: mockBuffer,
          count: 3,
          indexDatatype: IndexDatatype.UNSIGNED_BYTE,
        },
      };

      const frameState = { context: { webgl2: true } };
      const result = ModelMeshUtility.readIndices(primitive, frameState);

      expect(result.typedArray).toBeInstanceOf(Uint8Array);
      expect(result.count).toBe(3);
    });

    it("falls back to GPU readback for UNSIGNED_SHORT indices", function () {
      const gpuData = new Uint16Array([0, 1, 2]);
      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < gpuData.length; i++) {
            outputArray[i] = gpuData[i];
          }
        },
      };

      const primitive = {
        indices: {
          typedArray: undefined,
          buffer: mockBuffer,
          count: 3,
          indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        },
      };

      const frameState = { context: { webgl2: true } };
      const result = ModelMeshUtility.readIndices(primitive, frameState);

      expect(result.typedArray).toBeInstanceOf(Uint16Array);
      expect(result.count).toBe(3);
    });

    it("falls back to GPU readback for UNSIGNED_INT indices", function () {
      const gpuData = new Uint32Array([0, 1, 2]);
      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < gpuData.length; i++) {
            outputArray[i] = gpuData[i];
          }
        },
      };

      const primitive = {
        indices: {
          typedArray: undefined,
          buffer: mockBuffer,
          count: 3,
          indexDatatype: IndexDatatype.UNSIGNED_INT,
        },
      };

      const frameState = { context: { webgl2: true } };
      const result = ModelMeshUtility.readIndices(primitive, frameState);

      expect(result.typedArray).toBeInstanceOf(Uint32Array);
      expect(result.count).toBe(3);
    });

    it("returns undefined when no typed array and no frameState", function () {
      const primitive = {
        indices: {
          typedArray: undefined,
          buffer: {},
          count: 3,
          indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        },
      };

      const result = ModelMeshUtility.readIndices(primitive);
      expect(result).toBeUndefined();
    });

    it("returns undefined when no typed array and no buffer", function () {
      const primitive = {
        indices: {
          typedArray: undefined,
          buffer: undefined,
          count: 3,
          indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        },
      };

      const frameState = { context: { webgl2: true } };
      const result = ModelMeshUtility.readIndices(primitive, frameState);
      expect(result).toBeUndefined();
    });
  });

  describe("decodePosition", function () {
    it("reads raw position without transform", function () {
      const vertices = new Float32Array([10, 20, 30]);
      const result = ModelMeshUtility.decodePosition(
        vertices,
        0,
        0,
        3,
        undefined,
        new Cartesian3(),
      );

      expect(result).toEqual(new Cartesian3(10, 20, 30));
    });

    it("reads position at correct index with stride and offset", function () {
      const vertices = new Float32Array([0, 0, 1, 2, 3, 0, 0, 0, 4, 5, 6, 0]);
      const result = ModelMeshUtility.decodePosition(
        vertices,
        1,
        2,
        6,
        undefined,
        new Cartesian3(),
      );

      expect(result).toEqual(new Cartesian3(4, 5, 6));
    });

    it("applies volume dequantization", function () {
      const vertices = new Float32Array([2, 3, 4]);
      const quantization = {
        octEncoded: false,
        quantizedVolumeStepSize: new Cartesian3(0.5, 0.5, 0.5),
        quantizedVolumeOffset: new Cartesian3(10, 20, 30),
      };

      const result = ModelMeshUtility.decodePosition(
        vertices,
        0,
        0,
        3,
        quantization,
        new Cartesian3(),
      );

      expect(result.x).toBeCloseTo(11, 5);
      expect(result.y).toBeCloseTo(21.5, 5);
      expect(result.z).toBeCloseTo(32, 5);
    });

    it("applies oct-encoded dequantization", function () {
      const vertices = new Float32Array([0, 0, 0]);
      const quantization = {
        octEncoded: true,
        octEncodedZXY: false,
        normalizationRange: 255,
      };

      const result = ModelMeshUtility.decodePosition(
        vertices,
        0,
        0,
        3,
        quantization,
        new Cartesian3(),
      );

      const length = Cartesian3.magnitude(result);
      expect(length).toBeGreaterThan(0);
    });

    it("returns the result parameter", function () {
      const vertices = new Float32Array([1, 2, 3]);
      const scratch = new Cartesian3();

      const returned = ModelMeshUtility.decodePosition(
        vertices,
        0,
        0,
        3,
        undefined,
        scratch,
      );

      expect(returned).toBe(scratch);
    });
  });

  describe("transformPosition", function () {
    it("applies identity transform", function () {
      const position = new Cartesian3(1, 2, 3);
      const result = ModelMeshUtility.transformPosition(
        position,
        Matrix4.IDENTITY,
        new Cartesian3(),
      );

      expect(result).toEqual(new Cartesian3(1, 2, 3));
    });

    it("applies translation transform", function () {
      const position = new Cartesian3(1, 0, 0);
      const transform = Matrix4.fromTranslation(new Cartesian3(10, 20, 30));
      const result = ModelMeshUtility.transformPosition(
        position,
        transform,
        new Cartesian3(),
      );

      expect(result).toEqual(new Cartesian3(11, 20, 30));
    });

    it("returns the result parameter", function () {
      const position = new Cartesian3(1, 2, 3);
      const scratch = new Cartesian3();

      const returned = ModelMeshUtility.transformPosition(
        position,
        Matrix4.IDENTITY,
        scratch,
      );

      expect(returned).toBe(scratch);
    });
  });

  describe("readColorData", function () {
    function createColorPrimitive(colorAttributeOptions) {
      const attributes = [];
      if (
        colorAttributeOptions !== undefined &&
        colorAttributeOptions !== null
      ) {
        attributes.push(
          Object.assign(
            {
              semantic: VertexAttributeSemantic.COLOR,
              setIndex: 0,
              componentDatatype: ComponentDatatype.FLOAT,
              type: AttributeType.VEC4,
              count: 2,
              byteOffset: 0,
              byteStride: undefined,
              typedArray: undefined,
              buffer: undefined,
              normalized: false,
            },
            colorAttributeOptions,
          ),
        );
      }
      return { attributes: attributes };
    }

    it("returns undefined when primitive has no color attribute", function () {
      const primitive = createColorPrimitive();
      const result = ModelMeshUtility.readColorData(primitive);
      expect(result).toBeUndefined();
    });

    it("returns color data from a CPU typed array", function () {
      const colors = new Float32Array([1, 0, 0, 1, 0, 1, 0, 1]);
      const primitive = createColorPrimitive({
        typedArray: colors,
        count: 2,
      });

      const result = ModelMeshUtility.readColorData(primitive);

      expect(result).toBeDefined();
      expect(result.typedArray).toBe(colors);
      expect(result.numComponents).toBe(4);
      expect(result.elementStride).toBe(4);
      expect(result.offset).toBe(0);
      expect(result.normalized).toBe(false);
      expect(result.count).toBe(2);
    });

    it("handles VEC3 color attribute", function () {
      const colors = new Float32Array([1, 0, 0, 0, 1, 0]);
      const primitive = createColorPrimitive({
        typedArray: colors,
        type: AttributeType.VEC3,
        count: 2,
      });

      const result = ModelMeshUtility.readColorData(primitive);

      expect(result).toBeDefined();
      expect(result.numComponents).toBe(3);
      expect(result.elementStride).toBe(3);
    });

    it("returns normalized flag", function () {
      const colors = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
      const primitive = createColorPrimitive({
        typedArray: colors,
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        normalized: true,
        count: 2,
      });

      const result = ModelMeshUtility.readColorData(primitive);

      expect(result).toBeDefined();
      expect(result.normalized).toBe(true);
    });

    it("falls back to GPU readback when typed array is missing", function () {
      const gpuData = new Float32Array([1, 0, 0, 1, 0, 1, 0, 1]);
      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < gpuData.length; i++) {
            outputArray[i] = gpuData[i];
          }
        },
      };

      const primitive = createColorPrimitive({
        buffer: mockBuffer,
        count: 2,
      });

      const frameState = { context: { webgl2: true } };
      const result = ModelMeshUtility.readColorData(primitive, frameState);

      expect(result).toBeDefined();
      expect(result.typedArray.length).toBe(8);
      expect(result.count).toBe(2);
    });

    it("computes interleaved stride and offset", function () {
      // VEC4 FLOAT = 4 components * 4 bytes = 16 bytes
      // byteStride of 32 means interleaved, byteOffset 8 / 4 = offset 2
      const data = new Float32Array(16);
      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < data.length; i++) {
            outputArray[i] = data[i];
          }
        },
      };

      const primitive = createColorPrimitive({
        count: 2,
        byteStride: 32,
        byteOffset: 8,
        buffer: mockBuffer,
      });

      const frameState = { context: { webgl2: true } };
      const result = ModelMeshUtility.readColorData(primitive, frameState);

      expect(result).toBeDefined();
      expect(result.elementStride).toBe(8);
      expect(result.offset).toBe(2);
    });

    it("returns undefined when no typed array and no frameState", function () {
      const primitive = createColorPrimitive({
        buffer: {},
        count: 2,
      });

      const result = ModelMeshUtility.readColorData(primitive);
      expect(result).toBeUndefined();
    });

    it("returns undefined when no typed array and no buffer", function () {
      const primitive = createColorPrimitive({
        count: 2,
      });

      const result = ModelMeshUtility.readColorData(primitive);
      expect(result).toBeUndefined();
    });
  });

  describe("decodeColor", function () {
    it("reads float RGBA color", function () {
      const typedArray = new Float32Array([0.5, 0.25, 0.75, 1.0]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 0, 4, 4, false);

      expect(color.red).toBeCloseTo(0.5, 5);
      expect(color.green).toBeCloseTo(0.25, 5);
      expect(color.blue).toBeCloseTo(0.75, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("reads float RGB color with alpha defaulting to 1.0", function () {
      const typedArray = new Float32Array([0.1, 0.2, 0.3]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 0, 3, 3, false);

      expect(color.red).toBeCloseTo(0.1, 5);
      expect(color.green).toBeCloseTo(0.2, 5);
      expect(color.blue).toBeCloseTo(0.3, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("reads at correct vertex index", function () {
      const typedArray = new Float32Array([1, 0, 0, 1, 0, 1, 0, 0.5]);
      const color = ModelMeshUtility.decodeColor(typedArray, 1, 0, 4, 4, false);

      expect(color.red).toBeCloseTo(0, 5);
      expect(color.green).toBeCloseTo(1, 5);
      expect(color.blue).toBeCloseTo(0, 5);
      expect(color.alpha).toBeCloseTo(0.5, 5);
    });

    it("normalizes UNSIGNED_BYTE RGBA values", function () {
      const typedArray = new Uint8Array([255, 128, 0, 255]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 0, 4, 4, true);

      expect(color.red).toBeCloseTo(1.0, 5);
      expect(color.green).toBeCloseTo(128 / 255, 5);
      expect(color.blue).toBeCloseTo(0.0, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("normalizes UNSIGNED_BYTE RGB values with alpha 1.0", function () {
      const typedArray = new Uint8Array([255, 0, 128]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 0, 3, 3, true);

      expect(color.red).toBeCloseTo(1.0, 5);
      expect(color.green).toBeCloseTo(0.0, 5);
      expect(color.blue).toBeCloseTo(128 / 255, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("normalizes UNSIGNED_SHORT values", function () {
      const typedArray = new Uint16Array([65535, 32768, 0, 65535]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 0, 4, 4, true);

      expect(color.red).toBeCloseTo(1.0, 5);
      expect(color.green).toBeCloseTo(32768 / 65535, 5);
      expect(color.blue).toBeCloseTo(0.0, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("returns a Color instance", function () {
      const typedArray = new Float32Array([0, 0, 0, 1]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 0, 4, 4, false);

      expect(color).toBeInstanceOf(Color);
    });

    it("reads color at non-zero offset in interleaved data", function () {
      // Layout: [pad, pad, R, G, B, A, pad, pad, R, G, B, A]
      // offset=2, elementStride=6, numComponents=4
      const typedArray = new Float32Array([
        9, 9, 0.1, 0.2, 0.3, 1.0, 9, 9, 0.4, 0.5, 0.6, 0.8,
      ]);

      const color0 = ModelMeshUtility.decodeColor(
        typedArray,
        0,
        2,
        6,
        4,
        false,
      );
      expect(color0.red).toBeCloseTo(0.1, 5);
      expect(color0.green).toBeCloseTo(0.2, 5);
      expect(color0.blue).toBeCloseTo(0.3, 5);
      expect(color0.alpha).toBeCloseTo(1.0, 5);

      const color1 = ModelMeshUtility.decodeColor(
        typedArray,
        1,
        2,
        6,
        4,
        false,
      );
      expect(color1.red).toBeCloseTo(0.4, 5);
      expect(color1.green).toBeCloseTo(0.5, 5);
      expect(color1.blue).toBeCloseTo(0.6, 5);
      expect(color1.alpha).toBeCloseTo(0.8, 5);
    });

    it("reads VEC3 color with stride larger than numComponents", function () {
      // Layout: [R, G, B, pad, R, G, B, pad]
      // offset=0, elementStride=4, numComponents=3
      const typedArray = new Float32Array([0.1, 0.2, 0.3, 9, 0.7, 0.8, 0.9, 9]);

      const color1 = ModelMeshUtility.decodeColor(
        typedArray,
        1,
        0,
        4,
        3,
        false,
      );
      expect(color1.red).toBeCloseTo(0.7, 5);
      expect(color1.green).toBeCloseTo(0.8, 5);
      expect(color1.blue).toBeCloseTo(0.9, 5);
      expect(color1.alpha).toBeCloseTo(1.0, 5);
    });

    it("reads normalized interleaved UNSIGNED_BYTE color", function () {
      // Layout: [pad, R, G, B, A, pad, R, G, B, A]
      // offset=1, elementStride=5, numComponents=4
      const typedArray = new Uint8Array([
        0, 255, 128, 0, 255, 0, 0, 255, 64, 128,
      ]);

      const color1 = ModelMeshUtility.decodeColor(typedArray, 1, 1, 5, 4, true);
      expect(color1.red).toBeCloseTo(0.0, 5);
      expect(color1.green).toBeCloseTo(1.0, 5);
      expect(color1.blue).toBeCloseTo(64 / 255, 5);
      expect(color1.alpha).toBeCloseTo(128 / 255, 5);
    });
  });

  describe("readFeatureIdData", function () {
    function createFeatureIdPrimitive(featureIdAttributeOptions) {
      const attributes = [];
      if (featureIdAttributeOptions !== undefined) {
        attributes.push(
          Object.assign(
            {
              semantic: VertexAttributeSemantic.FEATURE_ID,
              setIndex: 0,
              componentDatatype: ComponentDatatype.FLOAT,
              type: AttributeType.SCALAR,
              count: 4,
              byteOffset: 0,
              byteStride: undefined,
              typedArray: undefined,
              buffer: undefined,
            },
            featureIdAttributeOptions,
          ),
        );
      }
      return { attributes: attributes };
    }

    it("returns undefined when featureId is undefined", function () {
      const primitive = createFeatureIdPrimitive({
        typedArray: new Float32Array([0, 1, 2, 3]),
      });
      const result = ModelMeshUtility.readFeatureIdData(primitive, undefined);
      expect(result).toBeUndefined();
    });

    it("returns undefined when featureId has no setIndex", function () {
      const primitive = createFeatureIdPrimitive({
        typedArray: new Float32Array([0, 1, 2, 3]),
      });
      const result = ModelMeshUtility.readFeatureIdData(primitive, {});
      expect(result).toBeUndefined();
    });

    it("returns undefined when primitive has no matching attribute", function () {
      const primitive = createFeatureIdPrimitive();
      const result = ModelMeshUtility.readFeatureIdData(primitive, {
        setIndex: 5,
      });
      expect(result).toBeUndefined();
    });

    it("returns undefined when attribute has no typedArray", function () {
      const primitive = createFeatureIdPrimitive({
        setIndex: 0,
      });
      const result = ModelMeshUtility.readFeatureIdData(primitive, {
        setIndex: 0,
      });
      expect(result).toBeUndefined();
    });

    it("returns typedArray and count for a valid feature ID attribute", function () {
      const featureIds = new Float32Array([0, 1, 2, 3]);
      const primitive = createFeatureIdPrimitive({
        typedArray: featureIds,
        setIndex: 0,
        count: 4,
      });

      const result = ModelMeshUtility.readFeatureIdData(primitive, {
        setIndex: 0,
      });

      expect(result).toBeDefined();
      expect(result.typedArray).toBe(featureIds);
      expect(result.count).toBe(4);
    });

    it("matches the correct setIndex when multiple feature ID attributes exist", function () {
      const featureIds0 = new Float32Array([0, 0, 1, 1]);
      const featureIds1 = new Float32Array([10, 11, 12, 13]);
      const primitive = {
        attributes: [
          {
            semantic: VertexAttributeSemantic.FEATURE_ID,
            setIndex: 0,
            typedArray: featureIds0,
            count: 4,
          },
          {
            semantic: VertexAttributeSemantic.FEATURE_ID,
            setIndex: 1,
            typedArray: featureIds1,
            count: 4,
          },
        ],
      };

      const result = ModelMeshUtility.readFeatureIdData(primitive, {
        setIndex: 1,
      });

      expect(result).toBeDefined();
      expect(result.typedArray).toBe(featureIds1);
      expect(result.count).toBe(4);
    });

    it("falls back to GPU readback when typed array is missing", function () {
      const gpuData = new Float32Array([0, 1, 2, 3]);
      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < gpuData.length; i++) {
            outputArray[i] = gpuData[i];
          }
        },
      };

      const primitive = createFeatureIdPrimitive({
        buffer: mockBuffer,
        count: 4,
      });

      const frameState = { context: { webgl2: true } };
      const result = ModelMeshUtility.readFeatureIdData(
        primitive,
        { setIndex: 0 },
        frameState,
      );

      expect(result).toBeDefined();
      expect(result.typedArray.length).toBe(4);
      expect(result.count).toBe(4);
    });

    it("returns undefined when no typed array and no frameState", function () {
      const primitive = createFeatureIdPrimitive({
        buffer: {},
        count: 4,
      });

      const result = ModelMeshUtility.readFeatureIdData(primitive, {
        setIndex: 0,
      });
      expect(result).toBeUndefined();
    });

    it("returns undefined when no typed array and no buffer", function () {
      const primitive = createFeatureIdPrimitive({
        count: 4,
      });

      const result = ModelMeshUtility.readFeatureIdData(primitive, {
        setIndex: 0,
      });
      expect(result).toBeUndefined();
    });
  });
});
