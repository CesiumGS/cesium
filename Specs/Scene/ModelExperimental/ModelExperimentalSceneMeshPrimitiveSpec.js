import {
  CustomShader,
  CustomShaderStage,
  GeometryPipelineStage,
  LightingPipelineStage,
  MaterialPipelineStage,
  ModelExperimentalSceneMeshPrimitive,
} from "../../../Source/Cesium.js";
import CustomShaderMode from "../../../Source/Scene/ModelExperimental/CustomShaderMode.js";

describe("Scene/ModelExperimental/ModelExperimentalSceneMeshPrimitive", function () {
  var mockPrimitive = {};
  var mockModel = {};

  it("throws for undefined primitive", function () {
    expect(function () {
      return new ModelExperimentalSceneMeshPrimitive({
        primitive: undefined,
        model: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined model", function () {
    expect(function () {
      return new ModelExperimentalSceneMeshPrimitive({
        primitive: mockPrimitive,
        model: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var primitive = new ModelExperimentalSceneMeshPrimitive({
      primitive: mockPrimitive,
      model: mockModel,
    });

    expect(primitive.primitive).toBe(mockPrimitive);
  });

  it("configures the pipeline stages", function () {
    var primitive = new ModelExperimentalSceneMeshPrimitive({
      primitive: mockPrimitive,
      model: mockModel,
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      MaterialPipelineStage,
      LightingPipelineStage,
    ]);
  });

  it("configures the pipeline for a custom shader that replaces the material", function () {
    var primitive = new ModelExperimentalSceneMeshPrimitive({
      primitive: mockPrimitive,
      model: {
        customShader: new CustomShader({
          mode: CustomShaderMode.REPLACE_MATERIAL,
          fragmentShaderText:
            "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {}",
        }),
      },
    });

    expect(primitive.pipelineStages).toEqual([
      GeometryPipelineStage,
      CustomShaderStage,
      LightingPipelineStage,
    ]);
  });

  it("configures the pipeline for a custom shader that uses the material", function () {
    var modes = [
      CustomShaderMode.BEFORE_MATERIAL,
      CustomShaderMode.MODIFY_MATERIAL,
      CustomShaderMode.AFTER_LIGHTING,
    ];

    for (var i = 0; i < modes.length; i++) {
      var mockShader = {
        mode: modes[i],
      };

      var primitive = new ModelExperimentalSceneMeshPrimitive({
        primitive: mockPrimitive,
        model: {
          customShader: mockShader,
        },
      });

      expect(primitive.pipelineStages).toEqual([
        GeometryPipelineStage,
        MaterialPipelineStage,
        CustomShaderStage,
        LightingPipelineStage,
      ]);
    }
  });
});
