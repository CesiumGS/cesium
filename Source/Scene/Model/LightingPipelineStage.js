import ShaderDestination from "../../Renderer/ShaderDestination.js";
import ModelLightingFS from "../../Shaders/Model/ModelLightingFS.js";
import LightingModel from "./LightingModel.js";

export default function LightingPipelineStage() {}

LightingPipelineStage.process = function (
  primitive,
  renderResources,
  frameState
) {
  var shaderBuilder = renderResources.shaderBuilder;

  var lightingOptions = renderResources.lightingOptions;
  if (lightingOptions.lightingModel === LightingModel.PBR) {
    shaderBuilder.addDefine(
      "LIGHTING_PBR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  } else {
    shaderBuilder.addDefine(
      "LIGHTING_UNLIT",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  shaderBuilder.addFragmentLines([ModelLightingFS]);
};
