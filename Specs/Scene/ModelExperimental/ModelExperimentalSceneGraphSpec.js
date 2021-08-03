import { ModelExperimentalSceneGraph } from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalSceneGraph", function () {
  it("throws for undefined options.model", function () {
    expect(function () {
      return new ModelExperimentalSceneGraph({
        model: undefined,
        modelComponents: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined options.modelComponents", function () {
    expect(function () {
      return new ModelExperimentalSceneGraph({
        model: {},
        modelComponents: undefined,
      });
    }).toThrowDeveloperError();
  });
});
