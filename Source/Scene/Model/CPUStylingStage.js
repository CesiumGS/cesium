import ShaderDestination from "../../Renderer/ShaderDestination.js";

export default function CPUStylingStage() {}

CPUStylingStage.process = function (renderResources, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("USE_STYLE", undefined, ShaderDestination.FRAGMENT);

  // TODO: modify current color to handle blending
  shaderBuilder.addFragmentLines([
    "vec4 applyStyling(vec4 color)",
    "{",
    "    return model_featureColor;",
    "}",
  ]);
};
