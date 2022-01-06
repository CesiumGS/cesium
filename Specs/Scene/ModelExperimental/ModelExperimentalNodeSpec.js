import {
  InstancingPipelineStage,
  Matrix4,
  ModelExperimentalNode,
  ModelMatrixUpdateStage,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalNode", function () {
  var mockNode = {};
  var transform = Matrix4.IDENTITY;
  var mockSceneGraph = {
    _computedModelMatrix: Matrix4.IDENTITY,
  };

  it("throws for undefined node", function () {
    expect(function () {
      return new ModelExperimentalNode({
        node: undefined,
        transform: transform,
        sceneGraph: mockSceneGraph,
        children: [],
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined transform", function () {
    expect(function () {
      return new ModelExperimentalNode({
        node: mockNode,
        transform: undefined,
        sceneGraph: mockSceneGraph,
        children: [],
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined scene graph", function () {
    expect(function () {
      return new ModelExperimentalNode({
        node: mockNode,
        transform: transform,
        sceneGraph: undefined,
        children: [],
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined children", function () {
    expect(function () {
      return new ModelExperimentalNode({
        node: mockNode,
        transform: transform,
        sceneGraph: mockSceneGraph,
        children: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(node.node).toBe(mockNode);
    expect(node.sceneGraph).toBe(mockSceneGraph);
    expect(node.children.length).toEqual(0);

    verifyTransforms(transform, mockSceneGraph, node);

    expect(node.pipelineStages).toEqual([]);
    expect(node.updateStages).toEqual([ModelMatrixUpdateStage]);
    expect(node.runtimePrimitives).toEqual([]);
  });

  it("adds instancing pipeline stage if node is instanced", function () {
    var instancedMockNode = {
      instances: {
        attributes: [],
      },
    };
    var node = new ModelExperimentalNode({
      node: instancedMockNode,
      transform: transform,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(node.node).toBe(instancedMockNode);
    expect(node.sceneGraph).toBe(mockSceneGraph);
    expect(node.children.length).toEqual(0);

    verifyTransforms(transform, mockSceneGraph, node);

    expect(node.pipelineStages.length).toBe(1);
    expect(node.pipelineStages[0]).toEqual(InstancingPipelineStage);
    expect(node.updateStages).toEqual([ModelMatrixUpdateStage]);
    expect(node.runtimePrimitives).toEqual([]);
  });

  function verifyTransforms(transform, sceneGraph, runtimeNode) {
    expect(Matrix4.equals(runtimeNode.transform, transform)).toBe(true);
    expect(Matrix4.equals(runtimeNode.originalTransform, transform)).toBe(true);

    var expectedComputedTransform = Matrix4.multiplyTransformation(
      sceneGraph._computedModelMatrix,
      transform,
      new Matrix4()
    );
    expect(
      Matrix4.equals(runtimeNode.computedTransform, expectedComputedTransform)
    ).toEqual(true);
  }
});
