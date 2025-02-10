import ColorBlendMode from "../ColorBlendMode.js";
import CPUStylingStageVS from "../../Shaders/Model/CPUStylingStageVS.js";
import CPUStylingStageFS from "../../Shaders/Model/CPUStylingStageFS.js";
import defined from "../../Core/defined.js";
import ModelColorPipelineStage from "./ModelColorPipelineStage.js";
import Pass from "../../Renderer/Pass.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The CPU styling stage is responsible for ensuring that the feature's color
 * is applied at runtime.
 *
 * @namespace CPUStylingPipelineStage
 *
 * @private
 */
const CPUStylingPipelineStage = {
  name: "CPUStylingPipelineStage", // Helps with debugging
};

/**
 * Processes a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>adds the styling code to both the vertex and fragment shaders</li>
 *  <li>adds the define to trigger the stage's shader functions</li>
 *  <li>adds a uniform with the model's color blend mode and amount</li>
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
  frameState,
) {
  const model = renderResources.model;
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addVertexLines(CPUStylingStageVS);
  shaderBuilder.addFragmentLines(CPUStylingStageFS);
  shaderBuilder.addDefine("USE_CPU_STYLING", undefined, ShaderDestination.BOTH);

  // These uniforms may have already been added by the ModelColorStage
  // if a static color is applied.
  if (!defined(model.color)) {
    shaderBuilder.addUniform(
      "float",
      ModelColorPipelineStage.COLOR_BLEND_UNIFORM_NAME,
      ShaderDestination.FRAGMENT,
    );
    renderResources.uniformMap[
      ModelColorPipelineStage.COLOR_BLEND_UNIFORM_NAME
    ] = function () {
      return ColorBlendMode.getColorBlend(
        model.colorBlendMode,
        model.colorBlendAmount,
      );
    };
  }

  shaderBuilder.addUniform(
    "bool",
    "model_commandTranslucent",
    ShaderDestination.BOTH,
  );
  renderResources.uniformMap.model_commandTranslucent = function () {
    // Always check the current value, because custom shaders may
    // change the value with the translucencyMode parameter
    return renderResources.alphaOptions.pass === Pass.TRANSLUCENT;
  };
};

export default CPUStylingPipelineStage;
