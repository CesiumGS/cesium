import ModelLightingFS from "../../Shaders/Model/ModelLightingFS.js";

export default function LightingPipelineStage() {}

LightingPipelineStage.process = function (primitive, renderResources, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addFragmentLines([ModelLightingFS]);
};