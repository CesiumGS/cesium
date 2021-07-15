import ShaderDestination from "../../Renderer/ShaderDestination.js";

export default function CPUStylingStage() {}

CPUStylingStage.process = function (primitive, renderResources, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("USE_STYLE", undefined, ShaderDestination.FRAGMENT);
  shaderBuilder.addFragmentLines([
    "vec4 applyStyling()",
    "{",
    "    return model_featureColor;",
    "}",
  ]);
};
