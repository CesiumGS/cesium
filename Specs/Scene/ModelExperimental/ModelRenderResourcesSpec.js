import {
  DepthFunction,
  ModelRenderResources,
  RenderState,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelRenderResources", function () {
  const mockModel = {};

  function checkShaderDefines(shaderBuilder, expectedDefines) {
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual(
      expectedDefines
    );
  }

  it("throws for undefined model", function () {
    expect(function () {
      return new ModelRenderResources(undefined);
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const modelResources = new ModelRenderResources(mockModel);

    const defaultRenderState = RenderState.getState(
      RenderState.fromCache({
        depthTest: {
          enabled: true,
          func: DepthFunction.LESS_OR_EQUAL,
        },
      })
    );

    expect(modelResources.model).toBe(mockModel);
    expect(modelResources.shaderBuilder).toBeDefined();
    expect(modelResources.renderStateOptions).toEqual(defaultRenderState);
    checkShaderDefines(modelResources.shaderBuilder, []);
  });
});
