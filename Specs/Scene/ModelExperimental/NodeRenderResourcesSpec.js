import {
  Matrix4,
  ModelExperimentalNode,
  ModelRenderResources,
  NodeRenderResources,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/NodeRenderResources", function () {
  var mockModel = {};
  var mockNode = {};
  var mockSceneGraph = {
    _computedModelMatrix: Matrix4.IDENTITY,
  };

  var runtimeNode = new ModelExperimentalNode({
    node: mockNode,
    transform: Matrix4.IDENTITY,
    sceneGraph: mockSceneGraph,
    children: [],
  });

  function checkShaderDefines(shaderBuilder, expectedDefines) {
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual(
      expectedDefines
    );
  }
  it("throws for undefined modelRenderResources", function () {
    expect(function () {
      return new NodeRenderResources(undefined, runtimeNode);
    }).toThrowDeveloperError();
  });

  it("throws for undefined runtimeNode", function () {
    expect(function () {
      var modelResources = new ModelRenderResources(mockModel);
      return new NodeRenderResources(modelResources, undefined);
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var modelResources = new ModelRenderResources(mockModel);
    var nodeResources = new NodeRenderResources(modelResources, runtimeNode);

    expect(nodeResources.runtimeNode).toBe(runtimeNode);
    expect(nodeResources.modelMatrix).toBe(runtimeNode.transform);
    expect(nodeResources.attributes).toEqual([]);
  });

  it("inherits from model render resources", function () {
    var modelResources = new ModelRenderResources(mockModel);
    modelResources.shaderBuilder.addDefine("MODEL");
    var nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    nodeResources.shaderBuilder.addDefine("NODE");

    expect(nodeResources.model).toBe(mockModel);

    // The node's shader builder should be a clone of the model's
    expect(nodeResources.shaderBuilder).not.toBe(modelResources.shaderBuilder);

    // The model shader must not be modified by the node...
    checkShaderDefines(modelResources.shaderBuilder, ["MODEL"]);

    // ...but the node shader will be updated.
    checkShaderDefines(nodeResources.shaderBuilder, ["MODEL", "NODE"]);
  });
});
