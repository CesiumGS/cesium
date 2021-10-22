import AlphaMode from "../AlphaMode.js";
import ColorBlendMode from "../ColorBlendMode.js";
import combine from "../../Core/combine.js";
import ModelColorStageFS from "../../Shaders/ModelExperimental/ModelColorStageFS.js";
import Pass from "../../Renderer/Pass.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The model color pipeline stage is responsible for handling the application of a static color to the model.
 */
var ModelColorStage = {};

ModelColorStage.COLOR_UNIFORM_NAME = "model_color";
ModelColorStage.COLOR_BLEND_UNIFORM_NAME = "model_colorBlend";

/**
 * Process a model. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to the fragment shader to indicate that the model has a color</li>
 *  <li>adds a function to the fragment shader to apply the color to the model's base color</li>
 *  <li>adds the uniforms for the fragment shader for the model's color and blending properties</li>
 *  <li>updates the pass type in the render resources based on translucency of the model's color</li>
 *</ul>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {ModelExperimental} model The model.
 * @param {FrameState} frameState The frameState.
 */
ModelColorStage.process = function (renderResources, model, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "HAS_MODEL_COLOR",
    undefined,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addFragmentLines([ModelColorStageFS]);

  var stageUniforms = {};

  // Pass the model's color as a uniform. Set the pass type to translucent, if needed.
  var color = model.color;
  if (color.alpha > 0.0 && color.alpha < 1.0) {
    renderResources.alphaOptions.pass = Pass.TRANSLUCENT;
    renderResources.alphaOptions.alphaMode = AlphaMode.BLEND;
  }

  shaderBuilder.addUniform(
    "vec4",
    ModelColorStage.COLOR_UNIFORM_NAME,
    ShaderDestination.FRAGMENT
  );
  stageUniforms[ModelColorStage.COLOR_UNIFORM_NAME] = function () {
    return model.color;
  };

  // Create a colorBlend from the model's colorBlendMode and colorBlendAmount and pass it as a uniform.
  shaderBuilder.addUniform(
    "float",
    ModelColorStage.COLOR_BLEND_UNIFORM_NAME,
    ShaderDestination.FRAGMENT
  );
  stageUniforms[ModelColorStage.COLOR_BLEND_UNIFORM_NAME] = function () {
    return ColorBlendMode.getColorBlend(
      model.colorBlendMode,
      model.colorBlendAmount
    );
  };

  renderResources.uniformMap = combine(
    stageUniforms,
    renderResources.uniformMap
  );
};

export default ModelColorStage;
