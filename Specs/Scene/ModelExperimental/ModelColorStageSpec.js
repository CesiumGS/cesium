import {
  Color,
  ColorBlendMode,
  ModelColorStage,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/ModelColorStage", function () {
  it("sets the define if model has color", function () {
    var mockModel = {
      color: Color.RED,
      colorBlendMode: ColorBlendMode.REPLACE,
      colorBlendAmount: 0.25,
    };
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
    };
    var shaderBuilder = renderResources.shaderBuilder;

    ModelColorStage.process(renderResources, mockModel);

    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_MODEL_COLOR",
    ]);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform vec4 model_color;",
      "uniform float model_colorBlend;",
    ]);

    var uniformMap = renderResources.uniformMap;
    expect(uniformMap.model_color()).toEqual(mockModel.color);
    expect(uniformMap.model_colorBlend()).toEqual(
      ColorBlendMode.getColorBlend(
        mockModel.colorBlendMode,
        mockModel.colorBlendAmount
      )
    );
  });
});
