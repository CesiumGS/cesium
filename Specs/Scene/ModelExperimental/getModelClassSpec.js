import {
  ExperimentalFeatures,
  Model,
  ModelExperimental,
  getModelClass,
} from "../../../Source/Cesium.js";

describe("Scene/getModelClass", function () {
  it("sets model class to Model when ExperimentalFeatures for Model is disabled", function () {
    expect(ExperimentalFeatures.enableModelExperimental).toEqual(false);
    expect(getModelClass()).toEqual(Model);
  });

  it("sets model class to ModelExperimental when ExperimentalFeatures for Model is enabled", function () {
    ExperimentalFeatures.enableModelExperimental = true;
    expect(ExperimentalFeatures.enableModelExperimental).toEqual(true);
    expect(getModelClass()).toEqual(ModelExperimental);
    // Revert ExperimentalFeatures to avoid issues with other tests.
    ExperimentalFeatures.enableModelExperimental = false;
  });
});
