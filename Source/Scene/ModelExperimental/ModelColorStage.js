import combine from "../../Core/combine.js";
import Pass from "../../Renderer/Pass.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import ColorBlendMode from "../ColorBlendMode.js";
import ModelColorStageFS from "../../Shaders/ModelExperimental/ModelColorStageFS.js";

var ModelColorStage = {};

ModelColorStage.COLOR_UNIFORM_NAME = "model_color";
ModelColorStage.COLOR_BLEND_UNIFORM_NAME = "model_colorBlend";

ModelColorStage.process = function (renderResources, model, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_MODEL_COLOR", undefined, ShaderDestination.BOTH);
  shaderBuilder.addFragmentLines([ModelColorStageFS]);

  var stageUniforms = {};

  // Pass the model's color as a uniform. Set the pass type to translucent, if needed.
  var color = model.color;
  if (color.alpha > 0.0 && color.alpha < 1.0) {
    renderResources.alphaOptions.pass = Pass.TRANSLUCENT;
  }
  shaderBuilder.addUniform(
    "vec4",
    ModelColorStage.COLOR_UNIFORM_NAME,
    ShaderDestination.FRAGMENT
  );
  stageUniforms[ModelColorStage.COLOR_UNIFORM_NAME] = function () {
    return color;
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
