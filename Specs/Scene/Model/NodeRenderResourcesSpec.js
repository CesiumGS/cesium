import {
  Axis,
  Cartesian3,
  DepthFunction,
  Matrix4,
  ModelRuntimeNode,
  ModelRenderResources,
  NodeRenderResources,
  RenderState,
} from "../../../Source/Cesium.js";

describe("Scene/Model/NodeRenderResources", function () {
  const mockModel = {};
  const mockNode = {};
  const mockSceneGraph = {
    computedModelMatrix: Matrix4.IDENTITY,
    components: {
      upAxis: Axis.Y,
      forwardAxis: Axis.Z,
    },
  };

  const runtimeNode = new ModelRuntimeNode({
    node: mockNode,
    transform: Matrix4.IDENTITY,
    transformToRoot: Matrix4.fromTranslation(new Cartesian3(1, 2, 3)),
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
      const modelResources = new ModelRenderResources(mockModel);
      return new NodeRenderResources(modelResources, undefined);
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const modelResources = new ModelRenderResources(mockModel);
    const nodeResources = new NodeRenderResources(modelResources, runtimeNode);

    const defaultRenderState = RenderState.getState(
      RenderState.fromCache({
        depthTest: {
          enabled: true,
          func: DepthFunction.LESS_OR_EQUAL,
        },
      })
    );

    expect(nodeResources.runtimeNode).toBe(runtimeNode);
    expect(nodeResources.attributes).toEqual([]);
    expect(nodeResources.renderStateOptions).toEqual(defaultRenderState);
    expect(nodeResources.hasSilhouette).toBe(false);
    expect(nodeResources.hasSkipLevelOfDetail).toBe(false);
  });

  it("inherits from model render resources", function () {
    const modelResources = new ModelRenderResources(mockModel);
    modelResources.shaderBuilder.addDefine("MODEL");
    modelResources.renderStateOptions.cull = {
      enabled: true,
    };
    modelResources.hasSilhouette = true;
    modelResources.hasSkipLevelOfDetail = true;

    const nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    nodeResources.shaderBuilder.addDefine("NODE");

    expect(nodeResources.model).toBe(mockModel);

    // The node's render resources should be a clone of the model's.
    expect(nodeResources.renderStateOptions).not.toBe(
      modelResources.renderStateOptions
    );
    expect(nodeResources.renderStateOptions.cull).toEqual({
      enabled: true,
    });

    expect(nodeResources.hasSilhouette).toBe(true);
    expect(nodeResources.hasSkipLevelOfDetail).toBe(true);

    // The node's shader builder should be a clone of the model's
    expect(nodeResources.shaderBuilder).not.toBe(modelResources.shaderBuilder);

    // The model shader must not be modified by the node...
    checkShaderDefines(modelResources.shaderBuilder, ["MODEL"]);

    // ...but the node shader will be updated.
    checkShaderDefines(nodeResources.shaderBuilder, ["MODEL", "NODE"]);
  });
});
