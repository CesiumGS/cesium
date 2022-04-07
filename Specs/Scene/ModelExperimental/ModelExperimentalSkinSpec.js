import { Matrix4, ModelExperimentalSkin } from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalSkin", function () {
  const mockNodes = [{ index: 0 }, { index: 1 }, { index: 2 }];
  const mockRuntimeNodes = [
    {
      node: mockNodes[0],
    },
    {
      node: mockNodes[1],
    },
    {
      node: mockNodes[2],
    },
  ];

  const mockSceneGraph = {
    _runtimeNodes: mockRuntimeNodes,
  };

  const mockSkin = {
    inverseBindMatrices: [
      Matrix4.clone(Matrix4.IDENTITY),
      Matrix4.clone(Matrix4.IDENTITY),
    ],
    joints: [mockNodes[1], mockNodes[2]],
  };

  it("throws for undefined skin", function () {
    expect(function () {
      return new ModelExperimentalSkin({
        skin: undefined,
        sceneGraph: mockSceneGraph,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined scene graph", function () {
    expect(function () {
      return new ModelExperimentalSkin({
        skin: mockSkin,
        sceneGraph: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const skin = new ModelExperimentalSkin({
      skin: mockSkin,
      sceneGraph: mockSceneGraph,
    });

    expect(skin.skin).toBe(mockSkin);
    expect(skin.sceneGraph).toBe(mockSceneGraph);

    expect(skin.inverseBindMatrices).toEqual(mockSkin.inverseBindMatrices);
    expect(skin.joints).toEqual([mockRuntimeNodes[1], mockRuntimeNodes[2]]);
  });
});
