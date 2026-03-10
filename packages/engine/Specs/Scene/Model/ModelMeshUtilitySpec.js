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
  function createScratchResult() {
    return {
      nodeComputedTransform: new Matrix4(),
      modelMatrix: new Matrix4(),
      computedModelMatrix: new Matrix4(),
    };
  }

  function createMockRuntimeNode(options) {
    options = options ?? {};
    return {
      computedTransform: options.computedTransform ?? Matrix4.IDENTITY,
      node: {
        instances: options.instances,
      },
      transformsTypedArray: options.transformsTypedArray,
      instancingTransformsBuffer: options.instancingTransformsBuffer,
    };
  }

  function createMockSceneGraph(options) {
    options = options ?? {};
    return {
      computedModelMatrix: options.computedModelMatrix ?? Matrix4.IDENTITY,
      components: {
        transform: options.componentsTransform ?? Matrix4.IDENTITY,
      },
      axisCorrectionMatrix: options.axisCorrectionMatrix ?? Matrix4.IDENTITY,
    };
  }

  function createMockModel(options) {
    options = options ?? {};
    return {
      modelMatrix: options.modelMatrix ?? Matrix4.IDENTITY,
    };
  }

  describe("computeNodeTransforms", function () {
    it("returns identity-based result when all transforms are identity", function () {
      const runtimeNode = createMockRuntimeNode();
      const sceneGraph = createMockSceneGraph();
      const model = createMockModel();
      const result = createScratchResult();

      ModelMeshUtility.computeNodeTransforms(
        runtimeNode,
        sceneGraph,
        model,
        result,
      );

      expect(result.computedModelMatrix).toEqual(Matrix4.IDENTITY);
      expect(result.nodeComputedTransform).toEqual(Matrix4.IDENTITY);
      expect(result.modelMatrix).toEqual(Matrix4.IDENTITY);
    });

    it("multiplies model matrix and node computed transform", function () {
      const nodeTransform = Matrix4.fromTranslation(new Cartesian3(1, 2, 3));
      const modelMatrix = Matrix4.fromTranslation(new Cartesian3(10, 20, 30));

      const runtimeNode = createMockRuntimeNode({
        computedTransform: nodeTransform,
      });
      const sceneGraph = createMockSceneGraph({
        computedModelMatrix: modelMatrix,
      });
      const model = createMockModel();
      const result = createScratchResult();

      ModelMeshUtility.computeNodeTransforms(
        runtimeNode,
        sceneGraph,
        model,
        result,
      );

      const expected = Matrix4.multiplyTransformation(
        modelMatrix,
        nodeTransform,
        new Matrix4(),
      );
      expect(result.computedModelMatrix).toEqual(expected);
      expect(result.nodeComputedTransform).toEqual(nodeTransform);
      expect(result.modelMatrix).toEqual(modelMatrix);
    });

    it("does not modify transforms when instances exist but transformInWorldSpace is false", function () {
      const nodeTransform = Matrix4.fromTranslation(new Cartesian3(5, 5, 5));
      const computedModelMat = Matrix4.fromUniformScale(2.0);

      const runtimeNode = createMockRuntimeNode({
        computedTransform: nodeTransform,
        instances: {
          transformInWorldSpace: false,
          attributes: [
            { count: 1, componentDatatype: ComponentDatatype.FLOAT },
          ],
        },
      });
      const sceneGraph = createMockSceneGraph({
        computedModelMatrix: computedModelMat,
      });
      const model = createMockModel();
      const result = createScratchResult();

      ModelMeshUtility.computeNodeTransforms(
        runtimeNode,
        sceneGraph,
        model,
        result,
      );

      const expected = Matrix4.multiplyTransformation(
        computedModelMat,
        nodeTransform,
        new Matrix4(),
      );
      expect(result.computedModelMatrix).toEqual(expected);
      expect(result.modelMatrix).toEqual(computedModelMat);
    });

    it("uses world-space transform path when transformInWorldSpace is true", function () {
      const nodeTransform = Matrix4.fromTranslation(new Cartesian3(1, 0, 0));
      const rawModelMatrix = Matrix4.fromUniformScale(3.0);
      const componentsTransform = Matrix4.fromTranslation(
        new Cartesian3(0, 10, 0),
      );
      const axisCorrectionMatrix = Matrix4.fromUniformScale(0.5);

      const runtimeNode = createMockRuntimeNode({
        computedTransform: nodeTransform,
        instances: {
          transformInWorldSpace: true,
          attributes: [
            { count: 1, componentDatatype: ComponentDatatype.FLOAT },
          ],
        },
      });
      const sceneGraph = createMockSceneGraph({
        computedModelMatrix: Matrix4.fromUniformScale(2.0),
        componentsTransform: componentsTransform,
        axisCorrectionMatrix: axisCorrectionMatrix,
      });
      const model = createMockModel({
        modelMatrix: rawModelMatrix,
      });
      const result = createScratchResult();

      ModelMeshUtility.computeNodeTransforms(
        runtimeNode,
        sceneGraph,
        model,
        result,
      );

      // Expected modelMatrix = model.modelMatrix * components.transform
      const expectedModelMatrix = Matrix4.multiplyTransformation(
        rawModelMatrix,
        componentsTransform,
        new Matrix4(),
      );
      // Expected nodeComputedTransform = axisCorrectionMatrix * runtimeNode.computedTransform
      const expectedNodeTransform = Matrix4.multiplyTransformation(
        axisCorrectionMatrix,
        nodeTransform,
        new Matrix4(),
      );
      const expectedComputed = Matrix4.multiplyTransformation(
        expectedModelMatrix,
        expectedNodeTransform,
        new Matrix4(),
      );

      expect(result.modelMatrix).toEqual(expectedModelMatrix);
      expect(result.nodeComputedTransform).toEqual(expectedNodeTransform);
      expect(result.computedModelMatrix).toEqual(expectedComputed);
    });

    it("populates the result parameter and returns it", function () {
      const runtimeNode = createMockRuntimeNode();
      const sceneGraph = createMockSceneGraph();
      const model = createMockModel();
      const result = createScratchResult();

      const returned = ModelMeshUtility.computeNodeTransforms(
        runtimeNode,
        sceneGraph,
        model,
        result,
      );

      expect(returned).toBe(result);
    });
  });

  describe("getInstanceTransforms", function () {
    it("returns computedModelMatrix when node has no instances", function () {
      const runtimeNode = createMockRuntimeNode();
      const computedModelMatrix = Matrix4.fromTranslation(
        new Cartesian3(1, 2, 3),
      );

      const transforms = ModelMeshUtility.getInstanceTransforms(
        runtimeNode,
        computedModelMatrix,
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
      );

      expect(transforms.length).toBe(1);
      expect(transforms[0]).toBe(computedModelMatrix);
    });

    it("returns computedModelMatrix when instances exist but no typed array is available", function () {
      const runtimeNode = createMockRuntimeNode({
        instances: {
          transformInWorldSpace: false,
          attributes: [
            { count: 2, componentDatatype: ComponentDatatype.FLOAT },
          ],
        },
        transformsTypedArray: undefined,
      });
      const computedModelMatrix = Matrix4.fromUniformScale(5.0);

      const transforms = ModelMeshUtility.getInstanceTransforms(
        runtimeNode,
        computedModelMatrix,
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
      );

      expect(transforms.length).toBe(1);
      expect(transforms[0]).toBe(computedModelMatrix);
    });

    it("builds transforms from typed array in local space", function () {
      // Identity instance transform stored as 12 float elements (3x4 row-major)
      const identityElements = new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
      ]);

      const runtimeNode = createMockRuntimeNode({
        instances: {
          transformInWorldSpace: false,
          attributes: [
            { count: 1, componentDatatype: ComponentDatatype.FLOAT },
          ],
        },
        transformsTypedArray: identityElements,
      });

      const computedModelMatrix = Matrix4.fromTranslation(
        new Cartesian3(10, 20, 30),
      );

      const transforms = ModelMeshUtility.getInstanceTransforms(
        runtimeNode,
        computedModelMatrix,
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
      );

      expect(transforms.length).toBe(1);
      // instanceTransform * computedModelMatrix
      const expected = Matrix4.multiplyTransformation(
        Matrix4.IDENTITY,
        computedModelMatrix,
        new Matrix4(),
      );
      expect(transforms[0]).toEqual(expected);
    });

    it("builds transforms from typed array in world space", function () {
      const identityElements = new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
      ]);

      const nodeComputedTransform = Matrix4.fromTranslation(
        new Cartesian3(1, 0, 0),
      );
      const modelMatrix = Matrix4.fromUniformScale(2.0);

      const runtimeNode = createMockRuntimeNode({
        instances: {
          transformInWorldSpace: true,
          attributes: [
            { count: 1, componentDatatype: ComponentDatatype.FLOAT },
          ],
        },
        transformsTypedArray: identityElements,
      });

      const transforms = ModelMeshUtility.getInstanceTransforms(
        runtimeNode,
        Matrix4.IDENTITY,
        nodeComputedTransform,
        modelMatrix,
      );

      expect(transforms.length).toBe(1);
      // transform * nodeComputedTransform, then modelMatrix * result
      const intermediate = Matrix4.multiplyTransformation(
        Matrix4.IDENTITY,
        nodeComputedTransform,
        new Matrix4(),
      );
      const expected = Matrix4.multiplyTransformation(
        modelMatrix,
        intermediate,
        new Matrix4(),
      );
      expect(transforms[0]).toEqual(expected);
    });

    it("handles multiple instances", function () {
      // Two identity instance transforms
      const twoInstances = new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
        // second instance: translation by (5, 0, 0) encoded as row-major 3x4
        1, 0, 0, 5, 0, 1, 0, 0, 0, 0, 1, 0,
      ]);

      const runtimeNode = createMockRuntimeNode({
        instances: {
          transformInWorldSpace: false,
          attributes: [
            { count: 2, componentDatatype: ComponentDatatype.FLOAT },
          ],
        },
        transformsTypedArray: twoInstances,
      });

      const computedModelMatrix = Matrix4.IDENTITY;

      const transforms = ModelMeshUtility.getInstanceTransforms(
        runtimeNode,
        computedModelMatrix,
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
      );

      expect(transforms.length).toBe(2);
    });

    it("falls back to GPU readback when typed array is missing and frameState is provided", function () {
      const readbackData = new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
      ]);

      const mockBuffer = {
        getBufferData: function (outputArray) {
          for (let i = 0; i < readbackData.length; i++) {
            outputArray[i] = readbackData[i];
          }
        },
      };

      const runtimeNode = createMockRuntimeNode({
        instances: {
          transformInWorldSpace: false,
          attributes: [
            { count: 1, componentDatatype: ComponentDatatype.FLOAT },
          ],
        },
        transformsTypedArray: undefined,
      });
      runtimeNode.instancingTransformsBuffer = mockBuffer;

      const frameState = {
        context: { webgl2: true },
      };

      const transforms = ModelMeshUtility.getInstanceTransforms(
        runtimeNode,
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
        frameState,
      );

      expect(transforms.length).toBe(1);
    });

    it("does not attempt GPU readback when frameState is undefined", function () {
      const mockBuffer = {
        getBufferData: jasmine.createSpy("getBufferData"),
      };

      const runtimeNode = createMockRuntimeNode({
        instances: {
          transformInWorldSpace: false,
          attributes: [
            { count: 1, componentDatatype: ComponentDatatype.FLOAT },
          ],
        },
        transformsTypedArray: undefined,
      });
      runtimeNode.instancingTransformsBuffer = mockBuffer;

      const transforms = ModelMeshUtility.getInstanceTransforms(
        runtimeNode,
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
      );

      expect(mockBuffer.getBufferData).not.toHaveBeenCalled();
      expect(transforms.length).toBe(1);
    });
  });

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

  describe("decodeAndTransformPosition", function () {
    it("reads raw position and applies identity transform", function () {
      const vertices = new Float32Array([10, 20, 30]);
      const result = ModelMeshUtility.decodeAndTransformPosition(
        vertices,
        0,
        0,
        3,
        undefined,
        Matrix4.IDENTITY,
        new Cartesian3(),
      );

      expect(result).toEqual(new Cartesian3(10, 20, 30));
    });

    it("reads position at correct index with stride and offset", function () {
      // Interleaved: 6 elements per vertex, position starts at offset 2
      const vertices = new Float32Array([0, 0, 1, 2, 3, 0, 0, 0, 4, 5, 6, 0]);
      const result = ModelMeshUtility.decodeAndTransformPosition(
        vertices,
        1,
        2,
        6,
        undefined,
        Matrix4.IDENTITY,
        new Cartesian3(),
      );

      expect(result).toEqual(new Cartesian3(4, 5, 6));
    });

    it("applies instance transform", function () {
      const vertices = new Float32Array([1, 0, 0]);
      const transform = Matrix4.fromTranslation(new Cartesian3(10, 20, 30));

      const result = ModelMeshUtility.decodeAndTransformPosition(
        vertices,
        0,
        0,
        3,
        undefined,
        transform,
        new Cartesian3(),
      );

      expect(result).toEqual(new Cartesian3(11, 20, 30));
    });

    it("applies volume dequantization before transform", function () {
      const vertices = new Float32Array([2, 3, 4]);
      const quantization = {
        octEncoded: false,
        quantizedVolumeStepSize: new Cartesian3(0.5, 0.5, 0.5),
        quantizedVolumeOffset: new Cartesian3(10, 20, 30),
      };

      const result = ModelMeshUtility.decodeAndTransformPosition(
        vertices,
        0,
        0,
        3,
        quantization,
        Matrix4.IDENTITY,
        new Cartesian3(),
      );

      // (2*0.5+10, 3*0.5+20, 4*0.5+30) = (11, 21.5, 32)
      expect(result.x).toBeCloseTo(11, 5);
      expect(result.y).toBeCloseTo(21.5, 5);
      expect(result.z).toBeCloseTo(32, 5);
    });

    it("applies oct-encoded dequantization", function () {
      // Use 0,0,0 as input — octDecodeInRange will decode it
      // We just verify the oct path is taken (no volume math applied)
      const vertices = new Float32Array([0, 0, 0]);
      const quantization = {
        octEncoded: true,
        octEncodedZXY: false,
        normalizationRange: 255,
      };

      const result = ModelMeshUtility.decodeAndTransformPosition(
        vertices,
        0,
        0,
        3,
        quantization,
        Matrix4.IDENTITY,
        new Cartesian3(),
      );

      // Result should be a unit-ish vector from oct decoding, not the raw (0,0,0)
      const length = Cartesian3.magnitude(result);
      expect(length).toBeGreaterThan(0);
    });

    it("swizzles ZXY when octEncodedZXY is true", function () {
      const vertices = new Float32Array([0, 0, 0]);
      const quantizationNoSwizzle = {
        octEncoded: true,
        octEncodedZXY: false,
        normalizationRange: 255,
      };
      const quantizationWithSwizzle = {
        octEncoded: true,
        octEncodedZXY: true,
        normalizationRange: 255,
      };

      const noSwizzle = ModelMeshUtility.decodeAndTransformPosition(
        vertices,
        0,
        0,
        3,
        quantizationNoSwizzle,
        Matrix4.IDENTITY,
        new Cartesian3(),
      );

      const withSwizzle = ModelMeshUtility.decodeAndTransformPosition(
        vertices,
        0,
        0,
        3,
        quantizationWithSwizzle,
        Matrix4.IDENTITY,
        new Cartesian3(),
      );

      // After ZXY swizzle: result.x = old.z, result.z = old.y, result.y = old.x
      expect(withSwizzle.x).toBeCloseTo(noSwizzle.z, 5);
      expect(withSwizzle.y).toBeCloseTo(noSwizzle.x, 5);
      expect(withSwizzle.z).toBeCloseTo(noSwizzle.y, 5);
    });

    it("returns the result parameter", function () {
      const vertices = new Float32Array([1, 2, 3]);
      const scratch = new Cartesian3();

      const returned = ModelMeshUtility.decodeAndTransformPosition(
        vertices,
        0,
        0,
        3,
        undefined,
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
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 4, false);

      expect(color.red).toBeCloseTo(0.5, 5);
      expect(color.green).toBeCloseTo(0.25, 5);
      expect(color.blue).toBeCloseTo(0.75, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("reads float RGB color with alpha defaulting to 1.0", function () {
      const typedArray = new Float32Array([0.1, 0.2, 0.3]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 3, false);

      expect(color.red).toBeCloseTo(0.1, 5);
      expect(color.green).toBeCloseTo(0.2, 5);
      expect(color.blue).toBeCloseTo(0.3, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("reads at correct vertex index", function () {
      const typedArray = new Float32Array([1, 0, 0, 1, 0, 1, 0, 0.5]);
      const color = ModelMeshUtility.decodeColor(typedArray, 1, 4, false);

      expect(color.red).toBeCloseTo(0, 5);
      expect(color.green).toBeCloseTo(1, 5);
      expect(color.blue).toBeCloseTo(0, 5);
      expect(color.alpha).toBeCloseTo(0.5, 5);
    });

    it("normalizes UNSIGNED_BYTE RGBA values", function () {
      const typedArray = new Uint8Array([255, 128, 0, 255]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 4, true);

      expect(color.red).toBeCloseTo(1.0, 5);
      expect(color.green).toBeCloseTo(128 / 255, 5);
      expect(color.blue).toBeCloseTo(0.0, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("normalizes UNSIGNED_BYTE RGB values with alpha 1.0", function () {
      const typedArray = new Uint8Array([255, 0, 128]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 3, true);

      expect(color.red).toBeCloseTo(1.0, 5);
      expect(color.green).toBeCloseTo(0.0, 5);
      expect(color.blue).toBeCloseTo(128 / 255, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("normalizes UNSIGNED_SHORT values", function () {
      const typedArray = new Uint16Array([65535, 32768, 0, 65535]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 4, true);

      expect(color.red).toBeCloseTo(1.0, 5);
      expect(color.green).toBeCloseTo(32768 / 65535, 5);
      expect(color.blue).toBeCloseTo(0.0, 5);
      expect(color.alpha).toBeCloseTo(1.0, 5);
    });

    it("returns a Color instance", function () {
      const typedArray = new Float32Array([0, 0, 0, 1]);
      const color = ModelMeshUtility.decodeColor(typedArray, 0, 4, false);

      expect(color).toBeInstanceOf(Color);
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
