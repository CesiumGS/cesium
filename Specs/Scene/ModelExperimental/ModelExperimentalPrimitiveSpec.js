import {
  GeometryPipelineStage,
  LightingPipelineStage,
  MaterialPipelineStage,
  PickingPipelineStage,
  ModelExperimentalPrimitive,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalPrimitive", function () {
  var mockPrimitive = {};

  it("throws for undefined primitive", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: undefined,
        allowPicking: true,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined allowPicking", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: {},
        allowPicking: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      allowPicking: true,
    });

    expect(primitive.primitive).toBe(mockPrimitive);
    expect(primitive.allowPicking).toBe(true);
  });

  it("configures the pipeline stages", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      allowPicking: false,
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
    ]);

    primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      allowPicking: true,
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      PickingPipelineStage,
    ]);
  });
});
