import {
  Axis,
  Cartesian3,
  defaultValue,
  InstancingPipelineStage,
  Matrix3,
  Matrix4,
  ModelExperimentalRuntimeNode,
  ModelMatrixUpdateStage,
  NodeStatisticsPipelineStage,
  Quaternion,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalRuntimeNode", function () {
  const mockNode = {
    matrix: Matrix4.IDENTITY,
  };
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
      return new ModelExperimentalRuntimeNode({
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
      return new ModelExperimentalRuntimeNode({
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
      return new ModelExperimentalRuntimeNode({
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
      return new ModelExperimentalRuntimeNode({
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
      return new ModelExperimentalRuntimeNode({
        node: mockNode,
        transform: transform,
        sceneGraph: mockSceneGraph,
        trasnformToRoot: transformToRoot,
        children: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const node = new ModelExperimentalRuntimeNode({
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

    node.configurePipeline();
    expect(node.pipelineStages).toEqual([NodeStatisticsPipelineStage]);
    expect(node.updateStages).toEqual([ModelMatrixUpdateStage]);
    expect(node.runtimePrimitives).toEqual([]);

    expect(node.translation).toBeUndefined();
    expect(node.rotation).toBeUndefined();
    expect(node.scale).toBeUndefined();

    expect(node.morphWeights).toEqual([]);
  });

  it("constructs with default transform parameters", function () {
    const mockNodeWithNoMatrix = {};

    const node = new ModelExperimentalRuntimeNode({
      node: mockNodeWithNoMatrix,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(node.node).toBe(mockNodeWithNoMatrix);
    expect(node.sceneGraph).toBe(mockSceneGraph);
    expect(node.children.length).toEqual(0);

    verifyTransforms(transform, transformToRoot, node);

    expect(node.translation).toEqual(Cartesian3.ZERO);
    expect(node.rotation).toEqual(Quaternion.IDENTITY);
    expect(node.scale).toEqual(new Cartesian3(1.0, 1.0, 1.0));
  });

  it("constructs with given transform parameters", function () {
    const mockNodeWithParameters = {
      translation: new Cartesian3(1.0, 2.0, 3.0),
      rotation: new Quaternion(0.707, 0.0, 0.707, 0.0),
      scale: new Cartesian3(1.0, 1.0, 2.0),
    };

    const node = new ModelExperimentalRuntimeNode({
      node: mockNodeWithParameters,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(node.node).toBe(mockNodeWithParameters);
    expect(node.sceneGraph).toBe(mockSceneGraph);
    expect(node.children.length).toEqual(0);

    verifyTransforms(transform, transformToRoot, node);

    expect(node.translation).toEqual(new Cartesian3(1.0, 2.0, 3.0));
    expect(node.rotation).toEqual(new Quaternion(0.707, 0.0, 0.707, 0.0));
    expect(node.scale).toEqual(new Cartesian3(1.0, 1.0, 2.0));
  });

  it("setting translation throws if node was constructed with matrix", function () {
    const node = new ModelExperimentalRuntimeNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(function () {
      node.translation = new Cartesian3(1.0, 2.0, 3.0);
    }).toThrowDeveloperError();
  });

  it("setting rotation throws if node was constructed with matrix", function () {
    const node = new ModelExperimentalRuntimeNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(function () {
      node.rotation = Quaternion.IDENTITY;
    }).toThrowDeveloperError();
  });

  it("setting scale throws if node was constructed with matrix", function () {
    const node = new ModelExperimentalRuntimeNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(function () {
      node.scale = new Cartesian3(1.0, 1.0, 2.0);
    }).toThrowDeveloperError();
  });

  it("setting morphWeights throws if given different length array", function () {
    const node = new ModelExperimentalRuntimeNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(function () {
      node.morphWeights = [0.0, 1.0, 2.0];
    }).toThrowDeveloperError();
  });

  const scratchTransform = new Matrix4();

  it("sets translation", function () {
    const mockNodeWithTranslation = {
      translation: Cartesian3.ZERO,
    };

    const node = new ModelExperimentalRuntimeNode({
      node: mockNodeWithTranslation,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    verifyTransforms(transform, transformToRoot, node);
    expect(node.translation).toEqual(Cartesian3.ZERO);

    const translation = new Cartesian3(1.0, 2.0, 3.0);
    node.translation = translation;
    node.updateComputedTransform();

    const translationMatrix = Matrix4.fromTranslation(
      translation,
      scratchTransform
    );

    expect(node.translation).toEqual(translation);
    verifyTransforms(translationMatrix, transformToRoot, node, transform);
  });

  it("sets rotation", function () {
    const mockNodeWithRotation = {
      rotation: Quaternion.IDENTITY,
    };

    const node = new ModelExperimentalRuntimeNode({
      node: mockNodeWithRotation,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    verifyTransforms(transform, transformToRoot, node);
    expect(node.rotation).toEqual(Quaternion.IDENTITY);

    const rotation = new Quaternion(0.707, 0.0, 0.707, 0.0);
    node.rotation = rotation;
    node.updateComputedTransform();

    const rotationMatrix3 = Matrix3.fromQuaternion(rotation, new Matrix3());
    const rotationMatrix = Matrix4.fromRotation(
      rotationMatrix3,
      scratchTransform
    );

    expect(node.rotation).toEqual(rotation);
    verifyTransforms(rotationMatrix, transformToRoot, node, transform);
  });

  it("sets scale", function () {
    const mockNodeWithScale = {
      scale: new Cartesian3(1.0, 1.0, 1.0),
    };

    const node = new ModelExperimentalRuntimeNode({
      node: mockNodeWithScale,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    verifyTransforms(transform, transformToRoot, node);
    expect(node.scale).toEqual(new Cartesian3(1.0, 1.0, 1.0));

    const scale = new Cartesian3(2.0, 3.0, 4.0);
    node.scale = scale;
    node.updateComputedTransform();

    const scaleMatrix = Matrix4.fromScale(scale, scratchTransform);

    expect(node.scale).toEqual(scale);
    verifyTransforms(scaleMatrix, transformToRoot, node, transform);
  });

  it("sets morphWeights", function () {
    const mockNodeWithWeights = {
      morphWeights: [0.0, 0.0, 0.0],
    };

    const node = new ModelExperimentalRuntimeNode({
      node: mockNodeWithWeights,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    expect(node.morphWeights).not.toBe(mockNodeWithWeights.morphWeights);
    expect(node.morphWeights).toEqual(mockNodeWithWeights.morphWeights);

    const morphWeights = [1.0, 2.0, 3.0];
    node.morphWeights = morphWeights;

    expect(node.morphWeights).not.toBe(morphWeights);
    expect(node.morphWeights).toEqual(morphWeights);
  });

  it("adds instancing pipeline stage if node is instanced", function () {
    const instancedMockNode = {
      instances: {
        attributes: [],
      },
    };
    const node = new ModelExperimentalRuntimeNode({
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

    node.configurePipeline();
    expect(node.pipelineStages).toEqual([
      InstancingPipelineStage,
      NodeStatisticsPipelineStage,
    ]);
    expect(node.updateStages).toEqual([ModelMatrixUpdateStage]);
    expect(node.runtimePrimitives).toEqual([]);
  });

  it("getChild throws for undefined index", function () {
    const node = new ModelExperimentalRuntimeNode({
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
    const node = new ModelExperimentalRuntimeNode({
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
    const node = new ModelExperimentalRuntimeNode({
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
    const node = new ModelExperimentalRuntimeNode({
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
    const node = new ModelExperimentalRuntimeNode({
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
    const node = new ModelExperimentalRuntimeNode({
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
