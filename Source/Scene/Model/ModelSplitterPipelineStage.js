import combine from "../../Core/combine.js";
import ModelSplitterStageFS from "../../Shaders/Model/ModelSplitterStageFS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The model splitting pipeline stage is responsible for discarding fragments on the wrong side of the splitter.
 *
 * @namespace ModelSplitterPipelineStage
 *
 * @private
 */
const ModelSplitterPipelineStage = {};
ModelSplitterPipelineStage.name = "ModelSplitterPipelineStage"; // Helps with debugging

ModelSplitterPipelineStage.SPLIT_DIRECTION_UNIFORM_NAME =
  "model_splitDirection";

/**
 * Process a model. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to the fragment shader to indicate that the model is split</li>
 *  <li>adds a function to the fragment shader to discard the fragment if it's on the wrong side of the splitter.</li>
 *  <li>adds a uniform indicating the "splitDirection" (side of the screen on which to show the model)
 *</ul>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {Model} model The model.
 * @param {FrameState} frameState The frameState.
 *
 * @private
 */
ModelSplitterPipelineStage.process = function (
  renderResources,
  model,
  frameState
) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "HAS_MODEL_SPLITTER",
    undefined,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addFragmentLines([ModelSplitterStageFS]);

  const stageUniforms = {};

  shaderBuilder.addUniform(
    "float",
    ModelSplitterPipelineStage.SPLIT_DIRECTION_UNIFORM_NAME,
    ShaderDestination.FRAGMENT
  );
  stageUniforms[
    ModelSplitterPipelineStage.SPLIT_DIRECTION_UNIFORM_NAME
  ] = function () {
    return model.splitDirection;
  };

  renderResources.uniformMap = combine(
    stageUniforms,
    renderResources.uniformMap
  );
};

export default ModelSplitterPipelineStage;
