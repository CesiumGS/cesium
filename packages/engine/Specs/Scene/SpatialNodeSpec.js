import {
  Cartesian3,
  Matrix4,
  SpatialNode,
  VoxelBoxShape,
} from "../../index.js";

describe("Scene/SpatialNode", function () {
  function getBasicBoxShape() {
    const shape = new VoxelBoxShape();
    const modelMatrix = Matrix4.IDENTITY.clone();
    const minBounds = VoxelBoxShape.DefaultMinBounds.clone();
    const maxBounds = VoxelBoxShape.DefaultMaxBounds.clone();
    shape.update(modelMatrix, minBounds, maxBounds);
    return shape;
  }

  it("constructs", function () {
    const shape = getBasicBoxShape();

    const level = 2;
    const x = 1;
    const y = 2;
    const z = 3;
    const parent = undefined;
    const dimensions = new Cartesian3(2, 3, 4);

    const node = new SpatialNode(level, x, y, z, parent, shape, dimensions);

    expect(node.level).toEqual(2);
    expect(node.screenSpaceError).toEqual(0.0);
  });

  it("returns coordinates of child", function () {
    const shape = getBasicBoxShape();

    const level = 2;
    const x = 1;
    const y = 2;
    const z = 3;
    const parent = undefined;
    const dimensions = new Cartesian3(2, 3, 4);

    const node = new SpatialNode(level, x, y, z, parent, shape, dimensions);
    expect(node.children).toBeUndefined();
    node.constructChildNodes(shape, dimensions);
    expect(node.children.length).toBe(8);

    const expectedChildCoordinates = [
      [3, 2, 4, 6],
      [3, 3, 4, 6],
      [3, 2, 5, 6],
      [3, 3, 5, 6],
      [3, 2, 4, 7],
      [3, 3, 4, 7],
      [3, 2, 5, 7],
      [3, 3, 5, 7],
    ];
    const actualChildCoordinates = node.children.map((child) => [
      child.level,
      child.x,
      child.y,
      child.z,
    ]);

    expect(actualChildCoordinates).toEqual(expectedChildCoordinates);
  });

  it("computes screen space error", function () {
    const shape = getBasicBoxShape();

    const level = 0;
    const x = 0;
    const y = 0;
    const z = 0;
    const parent = undefined;
    const dimensions = new Cartesian3(2, 3, 4);

    const node = new SpatialNode(level, x, y, z, parent, shape, dimensions);

    const cameraPosition = new Cartesian3(0.0, 0.0, 2.0);
    node.computeScreenSpaceError(cameraPosition, 1.0);

    expect(node.screenSpaceError).toEqual(1.0);
  });

  it("adds a keyframe node", function () {
    const shape = getBasicBoxShape();

    const parent = undefined;
    const dimensions = new Cartesian3(2, 3, 4);
    const node = new SpatialNode(0, 0, 0, 0, parent, shape, dimensions);

    const numberOfStartingKeyframes = node.keyframeNodes.length;
    node.createKeyframeNode(0);
    expect(node.keyframeNodes.length - numberOfStartingKeyframes).toEqual(1);
  });
});
