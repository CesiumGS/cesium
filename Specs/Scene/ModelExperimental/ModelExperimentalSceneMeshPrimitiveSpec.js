import {
  GeometryPipelineStage,
  LightingPipelineStage,
  MaterialPipelineStage,
  ModelExperimentalPrimitive,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalPrimitive", function () {
  var mockPrimitive = {};

  it("throws for undefined primitive", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
    });

    expect(primitive.primitive).toBe(mockPrimitive);
  });

  it("configures the pipeline stages", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
    ]);
  });
});
