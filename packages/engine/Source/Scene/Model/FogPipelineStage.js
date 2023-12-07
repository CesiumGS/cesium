import FogStageFS from "../../Shaders/Model/FogStageFS.js";

/**
 * The fog color pipeline stage is responsible for applying fog to tiles in the distance in horizon views.
 *
 * @namespace FogColorPipelineStage
 *
 * @private
 */
const FogColorPipelineStage = {
  name: "FogColorPipelineStage", // Helps with debugging
};

FogColorPipelineStage.process = function (renderResources, model, frameState) {
  renderResources.shaderBuilder.addFragmentLines(FogStageFS);
};

export default FogColorPipelineStage;
