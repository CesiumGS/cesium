import {
  GeometryPipelineStage,
  LightingPipelineStage,
  MaterialPipelineStage,
  PickingPipelineStage,
  ModelExperimentalPrimitive,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalPrimitive", function () {
  var mockPrimitive = {};
  var mockModel = {
    allowPicking: true,
  };

  it("throws for undefined primitive", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: undefined,
        model: mockModel,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined model", function () {
    expect(function () {
      return new ModelExperimentalPrimitive({
        primitive: {},
        model: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: mockModel,
    });

    expect(primitive.primitive).toBe(mockPrimitive);
    expect(primitive.model).toBe(mockModel);
  });

  it("configures the pipeline stages", function () {
    var primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: mockModel,
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
      PickingPipelineStage,
    ]);

    primitive = new ModelExperimentalPrimitive({
      primitive: mockPrimitive,
      model: {
        allowPicking: false,
      },
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
    ]);
  });
});
