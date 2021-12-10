import { ModelRenderResources } from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelRenderResources", function () {
  var mockModel = {};

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
    var modelResources = new ModelRenderResources(mockModel);

    expect(modelResources.model).toBe(mockModel);
    expect(modelResources.shaderBuilder).toBeDefined();
    checkShaderDefines(modelResources.shaderBuilder, []);
  });
});
