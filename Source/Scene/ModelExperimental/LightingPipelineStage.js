import ShaderDestination from "../../Renderer/ShaderDestination.js";
import LightingModel from "./LightingModel.js";
import LightingFS from "../../Shaders/ModelExperimental/LightingFS.js";

export default function LightingPipelineStage() {}

LightingPipelineStage.process = function (renderResources, primitive) {
  var lightingOptions = renderResources.lightingOptions;
  var shaderBuilder = renderResources.shaderBuilder;

  var lightingModel = lightingOptions.lightingModel;
  if (lightingModel === LightingModel.PBR) {
    shaderBuilder.addDefine("LIGHTING_PBR", undefined, ShaderDestination.FRAGMENT);
  } else {
    shaderBuilder.addDefine("LIGHTING_UNLIT", undefined, ShaderDestination.FRAGMENT);
  }

  shaderBuilder.addFragmentLines([LightingFS]);
};