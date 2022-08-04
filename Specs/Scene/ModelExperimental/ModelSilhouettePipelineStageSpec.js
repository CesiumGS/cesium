import {
  Color,
  ModelSilhouettePipelineStage,
  ShaderBuilder,
  _shadersModelSilhouetteStageFS,
  _shadersModelSilhouetteStageVS,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/ModelSilhouettePipelineStage", function () {
  beforeEach(function () {
    // Reset this, in case it was modified by other tests
    ModelSilhouettePipelineStage.silhouettesLength = 0;
  });

  it("configures the render resources for silhouette", function () {
    const mockModel = {
      silhouetteColor: Color.RED,
      silhouetteSize: 1.0,
      _silhouetteId: undefined,
    };

    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
    };

    const shaderBuilder = renderResources.shaderBuilder;
    ModelSilhouettePipelineStage.process(renderResources, mockModel);

    expect(ModelSilhouettePipelineStage.silhouettesLength).toEqual(1);
    expect(mockModel._silhouetteId).toEqual(1);

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "HAS_SILHOUETTE",
    ]);
    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_SILHOUETTE",
    ]);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
      "uniform float model_silhouetteSize;",
      "uniform bool model_silhouettePass;",
    ]);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform vec4 model_silhouetteColor;",
      "uniform bool model_silhouettePass;",
    ]);

    ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
      _shadersModelSilhouetteStageVS,
    ]);
    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersModelSilhouetteStageFS,
    ]);

    const uniformMap = renderResources.uniformMap;
    expect(uniformMap.model_silhouetteColor()).toEqual(
      mockModel.silhouetteColor
    );
    expect(uniformMap.model_silhouetteSize()).toEqual(mockModel.silhouetteSize);
    expect(uniformMap.model_silhouettePass()).toBe(false);

    expect(renderResources.hasSilhouette).toBe(true);
  });
});
