import CPUStylingStageVS from "../../Shaders/ModelExperimental/CPUStylingStageVS.js";
import CPUStylingStageFS from "../../Shaders/ModelExperimental/CPUStylingStageFS.js";
import ColorBlendMode from "../ColorBlendMode.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

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
};

export default CPUStylingStage;
