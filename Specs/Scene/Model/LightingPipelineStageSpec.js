import {
  _shadersLightingStageFS,
  LightingModel,
  LightingPipelineStage,
  ModelLightingOptions,
  ShaderBuilder,
  Cartesian3,
} from "../../../Source/Cesium.js";

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

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "USE_CUSTOM_LIGHT_COLOR",
      "LIGHTING_UNLIT",
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
      model: mockModel,
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
      model: mockModel,
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
