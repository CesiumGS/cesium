import {
  InstancingPipelineStage,
  Matrix4,
  ModelExperimentalSceneNode,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalSceneNode", function () {
  var mockNode = {};
  var modelMatrix = Matrix4.IDENTITY;

  it("throws for undefined node", function () {
    expect(function () {
      return new ModelExperimentalSceneNode({
        node: undefined,
        modelMatrix: modelMatrix,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined modelMatrix", function () {
    expect(function () {
      return new ModelExperimentalSceneNode({
        node: mockNode,
        modelMatrix: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var node = new ModelExperimentalSceneNode({
      node: mockNode,
      modelMatrix: modelMatrix,
    });

    expect(node.node).toBe(mockNode);
    expect(node.modelMatrix).toBe(modelMatrix);
    expect(node.pipelineStages).toEqual([]);
    expect(node.sceneMeshPrimitives).toEqual([]);
  });

  it("adds instancing pipeline stage if node is instanced", function () {
    var instancedMockNode = {
      instances: {
        attributes: [],
      },
    };
    var node = new ModelExperimentalSceneNode({
      node: instancedMockNode,
      modelMatrix: modelMatrix,
    });

    expect(node.node).toBe(instancedMockNode);
    expect(node.modelMatrix).toBe(modelMatrix);
    expect(node.pipelineStages.length).toBe(1);
    expect(node.pipelineStages[0]).toEqual(InstancingPipelineStage);
    expect(node.sceneMeshPrimitives).toEqual([]);
  });
});
