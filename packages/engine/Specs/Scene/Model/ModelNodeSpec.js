import {
  Cartesian3,
  Matrix4,
  ModelNode,
  ModelRuntimeNode,
} from "../../index.js";;

describe("Scene/Model/ModelNode", function () {
  const mockNode = {
    name: "Mock Node",
    index: 0,
  };

  let runtimeNode, mockModel;
  const nodeTransform = Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0));

  beforeEach(function () {
    runtimeNode = new ModelRuntimeNode({
      node: mockNode,
      transform: nodeTransform,
      transformToRoot: Matrix4.IDENTITY,
      children: [],
      sceneGraph: {},
    });

    mockModel = {
      _userAnimationDirty: false,
    };
  });

  it("throws for undefined model", function () {
    expect(function () {
      return new ModelNode(undefined, runtimeNode);
    }).toThrowDeveloperError();
  });

  it("throws for undefined runtimeNode", function () {
    expect(function () {
      return new ModelNode(mockModel, undefined);
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const node = new ModelNode(mockModel, runtimeNode);

    expect(node.name).toEqual("Mock Node");
    expect(node.id).toEqual(0);
    expect(node.show).toBe(true);
    expect(node.matrix).toBe(runtimeNode.transform);
    expect(node.originalMatrix).toBe(runtimeNode.originalTransform);
  });

  it("sets show for runtime node", function () {
    const node = new ModelNode(mockModel, runtimeNode);

    node.show = false;
    expect(runtimeNode.show).toBe(false);

    node.show = true;
    expect(runtimeNode.show).toBe(true);
  });

  it("sets matrix for runtime node", function () {
    const node = new ModelNode(mockModel, runtimeNode);
    expect(node.matrix).toEqual(nodeTransform);
    expect(node.originalMatrix).toEqual(nodeTransform);
    expect(runtimeNode.userAnimated).toBe(false);
    expect(mockModel._userAnimationDirty).toBe(false);

    const matrix = Matrix4.fromTranslation(new Cartesian3(10, 10, 10));
    node.matrix = matrix;
    expect(node.matrix).toEqual(matrix);
    expect(node.originalMatrix).toEqual(nodeTransform);

    expect(runtimeNode.transform).toEqual(matrix);
    expect(runtimeNode.transform).not.toBe(matrix);
    expect(runtimeNode.originalTransform).toEqual(nodeTransform);
    expect(runtimeNode.userAnimated).toBe(true);
    expect(mockModel._userAnimationDirty).toBe(true);
  });

  it("setting matrix to undefined resets node transform", function () {
    const node = new ModelNode(mockModel, runtimeNode);

    const matrix = Matrix4.fromTranslation(new Cartesian3(10, 10, 10));
    node.matrix = matrix;
    expect(node.matrix).toEqual(matrix);
    expect(node.originalMatrix).toEqual(nodeTransform);

    expect(runtimeNode.transform).toEqual(matrix);
    expect(runtimeNode.transform).not.toBe(matrix);
    expect(runtimeNode.originalTransform).toEqual(nodeTransform);
    expect(runtimeNode.userAnimated).toBe(true);
    expect(mockModel._userAnimationDirty).toBe(true);

    node.matrix = undefined;
    expect(node.matrix).toEqual(node.originalMatrix);
    expect(node.originalMatrix).toEqual(nodeTransform);

    expect(runtimeNode.transform).toEqual(runtimeNode.originalTransform);
    expect(runtimeNode.transform).not.toBe(runtimeNode.originalTransform);
    expect(runtimeNode.userAnimated).toBe(false);
  });
});
