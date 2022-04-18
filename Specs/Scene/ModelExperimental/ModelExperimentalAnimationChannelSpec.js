import {
  Axis,
  Cartesian3,
  InstancingPipelineStage,
  InterpolationType,
  Matrix4,
  ModelComponents,
  ModelExperimentalAnimation,
  ModelExperimentalAnimationChannel,
  ModelExperimentalNode,
  ModelMatrixUpdateStage,
} from "../../../Source/Cesium.js";

const AnimatedPropertyType = ModelComponents.AnimatedPropertyType;

describe("Scene/ModelExperimental/ModelExperimentalAnimationChannel", function () {
  const mockSampler = {
    input: [0.0, 0.25, 0.5, 1.0],
    interpolation: InterpolationType.LINEAR,
    output: [
      Cartesian3.ZERO,
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
    ],
  };

  const mockTarget = {
    node: undefined,
    path: AnimatedPropertyType.TRANSLATION,
  };

  const mockChannel = {
    sampler: mockSampler,
    target: mockTarget,
  };

  const mockAnimation = {
    channels: [mockChannel],
  };

  function verifyTransforms(transform, transformToRoot, runtimeNode) {
    expect(Matrix4.equals(runtimeNode.transform, transform)).toBe(true);
    expect(Matrix4.equals(runtimeNode.originalTransform, transform)).toBe(true);
    expect(Matrix4.equals(runtimeNode.transformToRoot, transformToRoot)).toBe(
      true
    );
  }

  const mockNode = {};
  const transform = Matrix4.clone(Matrix4.IDENTITY);
  const transformToRoot = Matrix4.clone(Matrix4.IDENTITY);
  const mockSceneGraph = {
    computedModelMatrix: Matrix4.clone(Matrix4.IDENTITY),
    runtimeNodes: [mockNode],
    components: {
      upAxis: Axis.Y,
      forwardAxis: Axis.Z,
    },
  };

  let runtimeNode;
  let runtimeAnimation;

  beforeAll(function () {
    runtimeNode = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    runtimeAnimation = new ModelExperimentalAnimation(
      undefined,
      mockAnimation,
      {}
    );
  });

  it("throws for undefined channel", function () {
    expect(function () {
      return new ModelExperimentalAnimationChannel({
        channel: undefined,
        runtimeAnimation: runtimeAnimation,
        runtimeNode: runtimeNode,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined runtimeAnimation", function () {
    expect(function () {
      return new ModelExperimentalAnimationChannel({
        channel: mockChannel,
        runtimeAnimation: runtimeAnimation,
        runtimeNode: runtimeNode,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined runtimeNode", function () {
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
});
