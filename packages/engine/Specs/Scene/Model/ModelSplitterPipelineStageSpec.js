import {
  ModelSplitterPipelineStage,
  SplitDirection,
  ShaderBuilder,
  _shadersModelSplitterStageFS,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/Model/ModelSplitterPipelineStage", function () {
  const mockFrameState = {};

  function mockRenderResources() {
    return {
      uniformMap: {},
      shaderBuilder: new ShaderBuilder(),
    };
  }

  it("Configures shader for model splitter", function () {
    const model = {
      splitDirection: SplitDirection.LEFT,
    };
    const renderResources = mockRenderResources();

    ModelSplitterPipelineStage.process(renderResources, model, mockFrameState);

    const shaderBuilder = renderResources.shaderBuilder;
    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_MODEL_SPLITTER",
    ]);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform float model_splitDirection;",
    ]);

    ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, []);
    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersModelSplitterStageFS,
    ]);

    const uniformMap = renderResources.uniformMap;
    expect(uniformMap.model_splitDirection()).toBe(SplitDirection.LEFT);
  });
});
