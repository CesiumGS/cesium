import CPUStylingStageVS from "../../Shaders/ModelExperimental/CPUStylingStageVS.js";
import CPUStylingStageFS from "../../Shaders/ModelExperimental/CPUStylingStageFS.js";
import Pass from "../../Renderer/Pass.js";
import ColorBlendMode from "../ColorBlendMode.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";
import ModelColorPipelineStage from "./ModelColorPipelineStage.js";
import AlphaMode from "../AlphaMode.js";
import defined from "../../Core/defined.js";
/**
 * The CPU styling stage is responsible for ensuring that the feature's color is applied at runtime.
 *
 * @namespace CPUStylingPipelineStage
 *
 * @private
 */
const CPUStylingPipelineStage = {};
CPUStylingPipelineStage.name = "CPUStylingPipelineStage"; // Helps with debugging

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
 *
 * @private
 */
CPUStylingPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const model = renderResources.model;
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addVertexLines([CPUStylingStageVS]);
  shaderBuilder.addFragmentLines([CPUStylingStageFS]);
  shaderBuilder.addDefine("USE_CPU_STYLING", undefined, ShaderDestination.BOTH);

  // These uniforms may have already been added by the ModelColorStage if a static
  // color is applied.
  if (!defined(model.color)) {
    shaderBuilder.addUniform(
      "float",
      ModelColorPipelineStage.COLOR_BLEND_UNIFORM_NAME,
      ShaderDestination.FRAGMENT
    );
    renderResources.uniformMap[
      ModelColorPipelineStage.COLOR_BLEND_UNIFORM_NAME
    ] = function () {
      return ColorBlendMode.getColorBlend(
        model.colorBlendMode,
        model.colorBlendAmount
      );
    };
  }

  const originalCommandTranslucency =
    renderResources.alphaOptions.pass === Pass.TRANSLUCENT;
  shaderBuilder.addUniform(
    "bool",
    "model_commandTranslucent",
    ShaderDestination.BOTH
  );
  renderResources.uniformMap.model_commandTranslucent = function () {
    return originalCommandTranslucency;
  };

  const featureTable = model.featureTables[model.featureTableId];
  const styleCommandsNeeded = StyleCommandsNeeded.getStyleCommandsNeeded(
    featureTable.featuresLength,
    featureTable.batchTexture.translucentFeaturesLength
  );

  if (styleCommandsNeeded !== StyleCommandsNeeded.ALL_OPAQUE) {
    renderResources.alphaOptions.alphaMode = AlphaMode.BLEND;
  }

  renderResources.styleCommandsNeeded = styleCommandsNeeded;
};

export default CPUStylingPipelineStage;
