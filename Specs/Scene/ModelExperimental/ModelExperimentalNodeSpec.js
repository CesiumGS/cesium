import {
  Cartesian3,
  InstancingPipelineStage,
  Matrix4,
  ModelExperimentalNode,
  ModelMatrixUpdateStage,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalNode", function () {
  var mockNode = {};
  var mockChildNode = {
    transform: Matrix4.IDENTITY,
  };
  var transform = Matrix4.clone(Matrix4.IDENTITY);
  var mockSceneGraph = {
    computedModelMatrix: Matrix4.clone(Matrix4.IDENTITY),
    runtimeNodes: [mockChildNode, mockNode],
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
      sceneGraph.computedModelMatrix,
      transform,
      new Matrix4()
    );
    expect(
      Matrix4.equals(runtimeNode.computedTransform, expectedComputedTransform)
    ).toEqual(true);
  }

  it("getChild throws for undefined index", function () {
    var node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    expect(function () {
      node.getChild();
    }).toThrowDeveloperError();
  });

  it("getChild throws for invalid index", function () {
    var node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    expect(function () {
      node.getChild("s");
    }).toThrowDeveloperError();
  });

  it("getChild throws for out of range index", function () {
    var node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    expect(function () {
      node.getChild(2);
    }).toThrowDeveloperError();
    expect(function () {
      node.getChild(-1);
    }).toThrowDeveloperError();
  });

  it("getChild works", function () {
    var node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    var child = node.getChild(0);
    expect(child).toBeDefined();
    expect(child.transform).toBeDefined();
  });

  it("updateModelMatrix works", function () {
    var node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    var expectedNodeTransform = Matrix4.multiplyByTranslation(
      mockSceneGraph.computedModelMatrix,
      new Cartesian3(10, 0, 0),
      mockSceneGraph.computedModelMatrix
    );

    node.updateModelMatrix();

    expect(Matrix4.equals(node.computedTransform, expectedNodeTransform)).toBe(
      true
    );
  });
});
