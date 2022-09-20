import {
  _shadersLightingStageFS,
  LightingModel,
  LightingPipelineStage,
  ModelLightingOptions,
  ShaderBuilder,
  Cartesian3,
} from "../../index.js";;
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/Model/LightingPipelineStage", function () {
  const mockPrimitive = {};
  const mockModel = {};

  const optionsUnlit = new ModelLightingOptions();
  optionsUnlit.lightingModel = LightingModel.UNLIT;

  it("supports light color", function () {
    const mockModelWithLightColor = {
      lightColor: new Cartesian3(1, 0, 0),
    };
    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      model: mockModelWithLightColor,
      shaderBuilder: shaderBuilder,
      lightingOptions: optionsUnlit,
      uniformMap: {},
    };
    LightingPipelineStage.process(renderResources, mockPrimitive);

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "USE_CUSTOM_LIGHT_COLOR",
      "LIGHTING_UNLIT",
    ]);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform vec3 model_lightColorHdr;",
    ]);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersLightingStageFS,
    ]);

    expect(renderResources.uniformMap.model_lightColorHdr).toBeDefined();
  });

  it("supports unlit lighting", function () {
    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      model: mockModel,
      shaderBuilder: shaderBuilder,
      lightingOptions: optionsUnlit,
    };
    LightingPipelineStage.process(renderResources, mockPrimitive);

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "LIGHTING_UNLIT",
    ]);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersLightingStageFS,
    ]);
  });

  it("supports PBR lighting", function () {
    const optionsPbr = new ModelLightingOptions();
    optionsPbr.lightingModel = LightingModel.PBR;

    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      model: mockModel,
      shaderBuilder: shaderBuilder,
      lightingOptions: optionsPbr,
    };
    LightingPipelineStage.process(renderResources, mockPrimitive);

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "LIGHTING_PBR",
    ]);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      _shadersLightingStageFS,
    ]);
  });
});
