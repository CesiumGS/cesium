import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import BlendingState from "../BlendingState.js";
import Pass from "../../Renderer/Pass.js";

/**
 * A pipeline stage for configuring the alpha options for handling translucency.
 *
 * @namespace AlphaPipelineStage
 *
 * @private
 */
const AlphaPipelineStage = {
  name: "AlphaPipelineStage", // Helps with debugging
};

AlphaPipelineStage.process = function (renderResources, primitive, frameState) {
  const alphaOptions = renderResources.alphaOptions;

  // Ensure the pass is defined
  const model = renderResources.model;
  alphaOptions.pass = alphaOptions.pass ?? model.opaquePass;

  const renderStateOptions = renderResources.renderStateOptions;
  if (alphaOptions.pass === Pass.TRANSLUCENT) {
    renderStateOptions.cull.enabled = false;
    renderStateOptions.depthMask = false;
    renderStateOptions.blending = BlendingState.ALPHA_BLEND;
  }

  const shaderBuilder = renderResources.shaderBuilder;
  const uniformMap = renderResources.uniformMap;

  if (defined(alphaOptions.alphaCutoff)) {
    shaderBuilder.addDefine(
      "ALPHA_MODE_MASK",
      undefined,
      ShaderDestination.FRAGMENT,
    );
    shaderBuilder.addUniform(
      "float",
      "u_alphaCutoff",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_alphaCutoff = function () {
      return alphaOptions.alphaCutoff;
    };
  }
};

export default AlphaPipelineStage;
