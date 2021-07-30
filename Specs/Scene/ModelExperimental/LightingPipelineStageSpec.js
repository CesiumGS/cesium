import {
  LightingModel,
  LightingPipelineStage,
  _shadersLightingStageFS,
  ModelLightingOptions,
  ShaderBuilder,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/LightingPipelineStage", function () {
  var mockPrimitive = {};

  var optionsUnlit = new ModelLightingOptions();
  optionsUnlit.lightingModel = LightingModel.UNLIT;

  it("supports unlit lighting", function () {
    var shaderBuilder = new ShaderBuilder();
    var renderResources = {
      shaderBuilder: shaderBuilder,
      lightingOptions: optionsUnlit,
    };
    LightingPipelineStage.process(renderResources, mockPrimitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "LIGHTING_UNLIT",
    ]);
  });

  it("adds the lighting shader function to the shader", function () {
    var shaderBuilder = new ShaderBuilder();
    var renderResources = {
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
