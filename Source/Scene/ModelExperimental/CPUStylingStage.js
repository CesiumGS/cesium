import AlphaMode from "../AlphaMode.js";
import CPUStylingStageVS from "../../Shaders/ModelExperimental/CPUStylingStageVS.js";
import CPUStylingStageFS from "../../Shaders/ModelExperimental/CPUStylingStageFS.js";
import Pass from "../../Renderer/Pass.js";
import ColorBlendMode from "../ColorBlendMode.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";
/**
 * The CPU styling stage is responsible for ensuring that the feature's color is applied at runtime.
 */
var CPUStylingStage = {};

/**
 * Processes a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>adds the styling code to both the vertex and fragment shaders</li>
 *  <li>adds the define to trigger the stage's shader functions</li>
 *  <li>adds a uniform with the model's color blend mode and amount</li>
 *  <li>sets a variable in the render resources denoting whether or not the model has translucent colors that will require multiple draw commands</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 */
CPUStylingStage.process = function (renderResources, primitive, frameState) {
  var model = renderResources.model;
  var shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addVertexLines([CPUStylingStageVS]);
  shaderBuilder.addFragmentLines([CPUStylingStageFS]);
  shaderBuilder.addDefine("USE_CPU_STYLING", undefined, ShaderDestination.BOTH);

  shaderBuilder.addUniform(
    "float",
    "model_colorBlend",
    ShaderDestination.FRAGMENT
  );
  renderResources.uniformMap.model_colorBlend = function () {
    return ColorBlendMode.getColorBlend(
      model.colorBlendMode,
      model.colorBlendAmount
    );
  };

  var batchTexture = model.featureTables[model.featureTableId].batchTexture;
  var styleCommandsNeeded = getStyleCommandsNeeded(batchTexture);
  if (styleCommandsNeeded !== StyleCommandsNeeded.ALL_OPAQUE) {
    renderResources.alphaOptions.pass = Pass.TRANSLUCENT;
    renderResources.alphaOptions.alphaMode = AlphaMode.BLEND;
  }
  renderResources.styleCommandsNeeded = styleCommandsNeeded;
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
