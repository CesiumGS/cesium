import {
  _shadersLightingStageFS,
  LightingModel,
  LightingPipelineStage,
  ModelLightingOptions,
  ShaderBuilder,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/LightingPipelineStage", function () {
  const mockPrimitive = {};

  const optionsUnlit = new ModelLightingOptions();
  optionsUnlit.lightingModel = LightingModel.UNLIT;

  it("supports unlit lighting", function () {
    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      shaderBuilder: shaderBuilder,
      lightingOptions: optionsUnlit,
    };
    LightingPipelineStage.process(renderResources, mockPrimitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "LIGHTING_UNLIT",
    ]);
  });

  it("supports PBR lighting", function () {
    const optionsPbr = new ModelLightingOptions();
    optionsPbr.lightingModel = LightingModel.PBR;

    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      shaderBuilder: shaderBuilder,
      lightingOptions: optionsPbr,
    };
    LightingPipelineStage.process(renderResources, mockPrimitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "LIGHTING_PBR",
    ]);
  });

  it("adds the lighting shader function to the shader", function () {
    const shaderBuilder = new ShaderBuilder();
    const renderResources = {
      shaderBuilder: shaderBuilder,
      lightingOptions: optionsUnlit,
    };
    LightingPipelineStage.process(renderResources, mockPrimitive);

    expect(shaderBuilder._vertexShaderParts.shaderLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.shaderLines).toEqual([
      _shadersLightingStageFS,
    ]);
  });
});
