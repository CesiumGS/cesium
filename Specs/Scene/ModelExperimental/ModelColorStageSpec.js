import {
  Color,
  ColorBlendMode,
  ModelAlphaOptions,
  ModelColorStage,
  Pass,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/ModelColorStage", function () {
  it("configures the render resources for opaque color", function () {
    var mockModel = {
      color: Color.RED,
      colorBlendMode: ColorBlendMode.REPLACE,
      colorBlendAmount: 0.25,
    };
    var defaultAlphaOptions = new ModelAlphaOptions();
    defaultAlphaOptions.pass = Pass.OPAQUE;
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
      alphaOptions: defaultAlphaOptions,
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

    expect(renderResources.alphaOptions.pass).toBe(Pass.OPAQUE);

    var uniformMap = renderResources.uniformMap;
    expect(uniformMap.model_color()).toEqual(mockModel.color);
    expect(uniformMap.model_colorBlend()).toEqual(
      ColorBlendMode.getColorBlend(
        mockModel.colorBlendMode,
        mockModel.colorBlendAmount
      )
    );
  });

  it("configures the render resources for translucent color", function () {
    var mockModel = {
      color: Color.RED.withAlpha(0.2),
      colorBlendMode: ColorBlendMode.MIX,
      colorBlendAmount: 0.25,
    };
    var defaultAlphaOptions = new ModelAlphaOptions();
    defaultAlphaOptions.pass = Pass.OPAQUE;
    var renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
      alphaOptions: defaultAlphaOptions,
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

    expect(renderResources.alphaOptions.pass).toBe(Pass.TRANSLUCENT);

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
