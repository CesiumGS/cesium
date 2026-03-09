import {
  Cartesian3,
  ComponentDatatype,
  Matrix4,
  ModelMeshUtility,
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
});
