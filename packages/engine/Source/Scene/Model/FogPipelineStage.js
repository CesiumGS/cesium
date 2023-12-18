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
  // TODO: AtmosphereCommon.glsl includes uniforms that really should be
  // added separately to match the Model pipeline paradigm... Maybe that file could
  // be split into multiple files.
  renderResources.shaderBuilder.addFragmentLines([FogStageFS]);
};

export default FogColorPipelineStage;
