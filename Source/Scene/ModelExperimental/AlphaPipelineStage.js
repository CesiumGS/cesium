import defaultValue from "../../Core/defaultValue.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import AlphaMode from "../AlphaMode.js";
import BlendingState from "../BlendingState.js";
import Pass from "../../Renderer/Pass.js";

/**
 * A pipeline stage for configuring the alpha options for handling translucency.
 *
 * @namespace MaterialPipelineStage
 *
 * @private
 */
const AlphaPipelineStage = {};
AlphaPipelineStage.name = "AlphaPipelineStage"; // Helps with debugging

AlphaPipelineStage.process = function (renderResources, primitive, frameState) {
  const alphaOptions = renderResources.alphaOptions;

  // Ensure the pass is defined
  const model = renderResources.model;
  alphaOptions.pass = defaultValue(alphaOptions.pass, model.opaquePass);

  const renderStateOptions = renderResources.renderStateOptions;
  if (alphaOptions.pass === Pass.TRANSLUCENT) {
    renderStateOptions.blending = BlendingState.ALPHA_BLEND;
  } else {
    renderStateOptions.blending = BlendingState.DISABLED;
  }

  const shaderBuilder = renderResources.shaderBuilder;
  const uniformMap = renderResources.uniformMap;
  const alphaMode = alphaOptions.alphaMode;

  if (alphaMode === AlphaMode.MASK) {
    shaderBuilder.addDefine(
      "ALPHA_MODE_MASK",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addUniform(
      "float",
      "u_alphaCutoff",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_alphaCutoff = function () {
      return alphaOptions.alphaCutoff;
    };
  } else if (alphaMode === AlphaMode.BLEND) {
    shaderBuilder.addDefine(
      "ALPHA_MODE_BLEND",
      undefined,
      ShaderDestination.FRAGMENT
    );
  } else {
    shaderBuilder.addDefine(
      "ALPHA_MODE_OPAQUE",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
};

export default AlphaPipelineStage;
