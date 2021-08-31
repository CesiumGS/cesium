import ColorBlendMode from "../ColorBlendMode.js";
import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import CPUStylingStageFS from "../../Shaders/ModelExperimental/CPUStylingStageFS.js";

var CPUStylingStage = {};

CPUStylingStage.process = function (renderResources, model, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine(
    "USE_CPU_STYLING",
    undefined,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addFragmentLines([CPUStylingStageFS]);

  if (defined(model.hasStyle)) {
    shaderBuilder.addDefine(
      "FEATURE_STYLING",
      undefined,
      ShaderDestination.FRAGMENT
    );
  } else {
    var modelStylingUniforms = {};

    shaderBuilder.addUniform("vec4", "model_color", ShaderDestination.FRAGMENT);
    modelStylingUniforms.model_color = function () {
      return model._color;
    };

    shaderBuilder.addUniform(
      "float",
      "model_colorBlend",
      ShaderDestination.FRAGMENT
    );
    modelStylingUniforms.model_colorBlend = function () {
      return ColorBlendMode.getColorBlend(
        model._colorBlendMode,
        model._colorBlendAmount
      );
    };

    renderResources.uniformMap = combine(
      modelStylingUniforms,
      renderResources.uniformMap
    );
  }
};

export default CPUStylingStage;
