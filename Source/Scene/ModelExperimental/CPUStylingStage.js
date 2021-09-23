import ColorBlendMode from "../ColorBlendMode.js";
import combine from "../../Core/combine.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import CPUStylingStageVS from "../../Shaders/ModelExperimental/CPUStylingStageVS.js";
import CPUStylingStageFS from "../../Shaders/ModelExperimental/CPUStylingStageFS.js";

var CPUStylingStage = {};

CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_VS = "FeatureIdentificationVS";
CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_FS = "FeatureIdentificationFS";
CPUStylingStage.STRUCT_NAME_FEATURE_IDENTIFICATION = "FeatureIdentification";
CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_VS =
  "setFeatureIdentificationVaryingsVS";
CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_FS =
  "setFeatureIdentificationVaryingsFS";
CPUStylingStage.FUNCTION_SIGNATURE_SET_FEATURE_IDENTIFICATION_VARYINGS =
  "void setFeatureIdentificationVaryings(inout FeatureIdentification feature)";

CPUStylingStage.process = function (renderResources, model, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine("USE_CPU_STYLING", undefined, ShaderDestination.BOTH);
  shaderBuilder.addFragmentLines([CPUStylingStageFS]);

  if (model._hasStyle) {
    shaderBuilder.addVertexLines([CPUStylingStageVS]);

    shaderBuilder.addDefine(
      "USE_FEATURE_STYLING",
      undefined,
      ShaderDestination.FRAGMENT
    );

    shaderBuilder.addStruct(
      CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_VS,
      CPUStylingStage.STRUCT_NAME_FEATURE_IDENTIFICATION,
      ShaderDestination.VERTEX
    );

    shaderBuilder.addStruct(
      CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_FS,
      CPUStylingStage.STRUCT_NAME_FEATURE_IDENTIFICATION,
      ShaderDestination.FRAGMENT
    );

    shaderBuilder.addStructField(
      CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_VS,
      "vec4",
      "color"
    );
    shaderBuilder.addStructField(
      CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_FS,
      "vec4",
      "color"
    );
    shaderBuilder.addVarying("vec4", "v_featureColor");

    shaderBuilder.addFunction(
      CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_VS,
      CPUStylingStage.FUNCTION_SIGNATURE_SET_FEATURE_IDENTIFICATION_VARYINGS,
      ShaderDestination.VERTEX
    );
    shaderBuilder.addFunctionLines(
      CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_VS,
      ["v_featureColor = feature.color;"]
    );
    shaderBuilder.addFunction(
      CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_FS,
      CPUStylingStage.FUNCTION_SIGNATURE_SET_FEATURE_IDENTIFICATION_VARYINGS,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(
      CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_FS,
      ["feature.color = v_featureColor;"]
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
