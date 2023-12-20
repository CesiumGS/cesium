import FogStageFS from "../../Shaders/Model/FogStageFS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The fog color pipeline stage is responsible for applying fog to tiles in the distance in horizon views.
 *
 * @namespace FogColorPipelineStage
 *
 * @private
 */
const FogPipelineStage = {
  name: "FogColorPipelineStage", // Helps with debugging
};

FogPipelineStage.process = function (renderResources, model, frameState) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine("HAS_FOG", undefined, ShaderDestination.FRAGMENT);
  shaderBuilder.addFragmentLines([FogStageFS]);
};

export default FogPipelineStage;
