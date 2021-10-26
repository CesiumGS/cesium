import CPUStylingStageVS from "../../Shaders/ModelExperimental/CPUStylingStageVS.js";
import CPUStylingStageFS from "../../Shaders/ModelExperimental/CPUStylingStageFS.js";
import ColorBlendMode from "../ColorBlendMode.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";

var CPUStylingStage = {};

CPUStylingStage.process = function (renderResources, primitive, frameState) {
  var model = renderResources.model;
  var shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine("USE_CPU_STYLING", undefined, ShaderDestination.BOTH);
  shaderBuilder.addUniform(
    "float",
    "model_colorBlend",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addVertexLines([CPUStylingStageVS]);
  shaderBuilder.addFragmentLines([CPUStylingStageFS]);

  renderResources.uniformMap["model_colorBlend"] = function () {
    return ColorBlendMode.getColorBlend(
      model.colorBlendMode,
      model.colorBlendAmount
    );
  };

  var batchTexture = model.featureTables[model.featureTableId].batchTexture;
  renderResources.styleCommandsNeeded = getStyleCommandsNeeded(batchTexture);
};

/**
 * @private
 */
function getStyleCommandsNeeded(batchTexture) {
  var translucentFeaturesLength = batchTexture.translucentFeaturesLength;
  if (translucentFeaturesLength === 0) {
    return StyleCommandsNeeded.ALL_OPAQUE;
  } else if (translucentFeaturesLength === batchTexture.featuresLength) {
    return StyleCommandsNeeded.ALL_TRANSLUCENT;
  }
  return StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT;
}

export default CPUStylingStage;
