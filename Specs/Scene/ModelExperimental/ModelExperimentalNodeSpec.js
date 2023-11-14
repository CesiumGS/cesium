import {
  Axis,
  Cartesian3,
  defaultValue,
  InstancingPipelineStage,
  Matrix4,
  ModelExperimentalNode,
  ModelMatrixUpdateStage,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalNode", function () {
  const mockNode = {};
  const mockChildNode = {
    transform: Matrix4.IDENTITY,
  };
  const transform = Matrix4.clone(Matrix4.IDENTITY);
  const transformToRoot = Matrix4.clone(Matrix4.IDENTITY);
  const mockSceneGraph = {
    computedModelMatrix: Matrix4.clone(Matrix4.IDENTITY),
    runtimeNodes: [mockChildNode, mockNode],
    components: {
      upAxis: Axis.Y,
      forwardAxis: Axis.Z,
    },
  };

  const scratchMatrix = new Matrix4();
  function verifyTransforms(
    transform,
    transformToRoot,
    runtimeNode,
    originalTransform
  ) {
    originalTransform = defaultValue(originalTransform, transform);

    expect(Matrix4.equals(runtimeNode.transform, transform)).toBe(true);
    expect(
      Matrix4.equals(runtimeNode.originalTransform, originalTransform)
    ).toBe(true);
    expect(Matrix4.equals(runtimeNode.transformToRoot, transformToRoot)).toBe(
      true
    );

    const computedTransform = Matrix4.multiplyTransformation(
      transformToRoot,
      transform,
      scratchMatrix
    );
    expect(
      Matrix4.equals(runtimeNode.computedTransform, computedTransform)
    ).toBe(true);
  }

  it("throws for undefined node", function () {
    expect(function () {
      return new ModelExperimentalNode({
        node: undefined,
        transform: transform,
        transformToRoot: transformToRoot,
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
        transformToRoot: transformToRoot,
        sceneGraph: mockSceneGraph,
        children: [],
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined transform to root", function () {
    expect(function () {
      return new ModelExperimentalNode({
        node: mockNode,
        transform: transform,
        transformToRoot: undefined,
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
        transformToRoot: transformToRoot,
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
        trasnformToRoot: transformToRoot,
        children: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(node.node).toBe(mockNode);
    expect(node.sceneGraph).toBe(mockSceneGraph);
    expect(node.children.length).toEqual(0);

    verifyTransforms(transform, transformToRoot, node);

    expect(node.pipelineStages).toEqual([]);
    expect(node.updateStages).toEqual([ModelMatrixUpdateStage]);
    expect(node.runtimePrimitives).toEqual([]);
  });

  it("adds instancing pipeline stage if node is instanced", function () {
    const instancedMockNode = {
      instances: {
        attributes: [],
      },
    };
    const node = new ModelExperimentalNode({
      node: instancedMockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(node.node).toBe(instancedMockNode);
    expect(node.sceneGraph).toBe(mockSceneGraph);
    expect(node.children.length).toEqual(0);

    verifyTransforms(transform, transformToRoot, node);

    expect(node.pipelineStages.length).toBe(1);
    expect(node.pipelineStages[0]).toEqual(InstancingPipelineStage);
    expect(node.updateStages).toEqual([ModelMatrixUpdateStage]);
    expect(node.runtimePrimitives).toEqual([]);
  });

  it("getChild throws for undefined index", function () {
    const node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    expect(function () {
      node.getChild();
    }).toThrowDeveloperError();
  });

  it("getChild throws for invalid index", function () {
    const node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    expect(function () {
      node.getChild("s");
    }).toThrowDeveloperError();
  });

  it("getChild throws for out of range index", function () {
    const node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
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
    const node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    const child = node.getChild(0);
    expect(child).toBeDefined();
    expect(child.transform).toBeDefined();
  });

  it("sets transform without replacing original", function () {
    const node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    const newTransform = Matrix4.multiplyByTranslation(
      Matrix4.IDENTITY,
      new Cartesian3(10, 0, 0),
      new Matrix4()
    );

    node.transform = newTransform;

    expect(node._transformDirty).toBe(true);
    expect(Matrix4.equals(node.transform, newTransform)).toBe(true);
    expect(Matrix4.equals(node.originalTransform, transform)).toBe(true);
  });

  it("updateComputedTransform updates computedTransform matrix", function () {
    const node = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [0],
    });

    verifyTransforms(transform, transformToRoot, node);

    const newTransform = Matrix4.multiplyByTranslation(
      Matrix4.IDENTITY,
      new Cartesian3(10, 0, 0),
      new Matrix4()
    );

    node.transform = newTransform;
    node.updateComputedTransform();

    const originalTransform = transform;
    verifyTransforms(newTransform, transformToRoot, node, originalTransform);
  });
});
