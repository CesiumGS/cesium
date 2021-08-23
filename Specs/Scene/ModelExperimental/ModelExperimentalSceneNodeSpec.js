import {
  InstancingPipelineStage,
  Matrix4,
  ModelExperimentalNode,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalNode", function () {
  var mockNode = {};
  var modelMatrix = Matrix4.IDENTITY;

  it("throws for undefined node", function () {
    expect(function () {
      return new ModelExperimentalNode({
        node: undefined,
        modelMatrix: modelMatrix,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined modelMatrix", function () {
    expect(function () {
      return new ModelExperimentalNode({
        node: mockNode,
        modelMatrix: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var node = new ModelExperimentalNode({
      node: mockNode,
      modelMatrix: modelMatrix,
    });

    expect(node.node).toBe(mockNode);
    expect(node.modelMatrix).toBe(modelMatrix);
    expect(node.pipelineStages).toEqual([]);
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
      modelMatrix: modelMatrix,
    });

    expect(node.node).toBe(instancedMockNode);
    expect(node.modelMatrix).toBe(modelMatrix);
    expect(node.pipelineStages.length).toBe(1);
    expect(node.pipelineStages[0]).toEqual(InstancingPipelineStage);
    expect(node.runtimePrimitives).toEqual([]);
  });
});
