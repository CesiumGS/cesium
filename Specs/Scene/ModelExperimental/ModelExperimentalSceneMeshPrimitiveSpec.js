import {
  GeometryPipelineStage,
  ModelExperimentalSceneMeshPrimitive,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalSceneMeshPrimitive", function () {
  var mockPrimitive = {};

  it("throws for undefined primitive", function () {
    expect(function () {
      return new ModelExperimentalSceneMeshPrimitive({
        primitive: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var primitive = new ModelExperimentalSceneMeshPrimitive({
      primitive: mockPrimitive,
    });

    expect(primitive.primitive).toBe(mockPrimitive);
  });

  it("configures the pipeline stages", function () {
    var primitive = new ModelExperimentalSceneMeshPrimitive({
      primitive: mockPrimitive,
    });

    expect(primitive.pipelineStages).toEqual([GeometryPipelineStage]);
  });
});
