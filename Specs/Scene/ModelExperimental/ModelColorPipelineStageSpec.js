import {
  AlphaMode,
  Color,
  ColorBlendMode,
  ModelAlphaOptions,
  ModelColorPipelineStage,
  Pass,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/ModelColorPipelineStage", function () {
  it("configures the render resources for opaque color", function () {
    const mockModel = {
      color: Color.RED,
      colorBlendMode: ColorBlendMode.REPLACE,
      colorBlendAmount: 0.25,
    };
    const defaultAlphaOptions = new ModelAlphaOptions();
    defaultAlphaOptions.pass = Pass.OPAQUE;
    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
      alphaOptions: defaultAlphaOptions,
    };
    const shaderBuilder = renderResources.shaderBuilder;

    ModelColorPipelineStage.process(renderResources, mockModel);

    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_MODEL_COLOR",
    ]);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform vec4 model_color;",
      "uniform float model_colorBlend;",
    ]);

    expect(renderResources.alphaOptions.pass).toBe(Pass.OPAQUE);

    const uniformMap = renderResources.uniformMap;
    expect(uniformMap.model_color()).toEqual(mockModel.color);
    expect(uniformMap.model_colorBlend()).toEqual(
      ColorBlendMode.getColorBlend(
        mockModel.colorBlendMode,
        mockModel.colorBlendAmount
      )
    );
  });

  it("configures the render resources for translucent color", function () {
    const mockModel = {
      color: Color.RED.withAlpha(0.2),
      colorBlendMode: ColorBlendMode.MIX,
      colorBlendAmount: 0.25,
    };
    const defaultAlphaOptions = new ModelAlphaOptions();
    defaultAlphaOptions.pass = Pass.OPAQUE;
    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
      alphaOptions: defaultAlphaOptions,
    };
    const shaderBuilder = renderResources.shaderBuilder;

    ModelColorPipelineStage.process(renderResources, mockModel);

    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_MODEL_COLOR",
    ]);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform vec4 model_color;",
      "uniform float model_colorBlend;",
    ]);

    expect(renderResources.alphaOptions.pass).toBe(Pass.TRANSLUCENT);
    expect(renderResources.alphaOptions.alphaMode).toBe(AlphaMode.BLEND);

    const uniformMap = renderResources.uniformMap;
    expect(uniformMap.model_color()).toEqual(mockModel.color);
    expect(uniformMap.model_colorBlend()).toEqual(
      ColorBlendMode.getColorBlend(
        mockModel.colorBlendMode,
        mockModel.colorBlendAmount
      )
    );
  });

  it("configures the render state for transparent color", function () {
    const mockModel = {
      color: Color.RED.withAlpha(0.0),
      colorBlendMode: ColorBlendMode.MIX,
      colorBlendAmount: 0.25,
      hasSilhouette: function () {
        return false;
      },
    };
    const defaultAlphaOptions = new ModelAlphaOptions();
    defaultAlphaOptions.pass = Pass.OPAQUE;
    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: mockModel,
      alphaOptions: defaultAlphaOptions,
      renderStateOptions: {},
    };
    ModelColorPipelineStage.process(renderResources, mockModel);

    const renderStateOptions = renderResources.renderStateOptions;
    expect(renderStateOptions.colorMask).toEqual({
      red: false,
      green: false,
      blue: false,
      alpha: false,
    });
    expect(renderStateOptions.depthMask).toEqual(false);
  });
});
