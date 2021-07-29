import ShaderDestination from "../../Renderer/ShaderDestination.js";
import LightingStageFS from "../../Shaders/ModelExperimental/LightingStageFS.js";

export default function LightingPipelineStage() {}

LightingPipelineStage.process = function (renderResources, primitive) {
  var shaderBuilder = renderResources.shaderBuilder;

  // Hardcoding this for now, a future branch will enable PBR lighting
  shaderBuilder.addDefine(
    "LIGHTING_UNLIT",
    undefined,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFragmentLines([LightingStageFS]);
};
