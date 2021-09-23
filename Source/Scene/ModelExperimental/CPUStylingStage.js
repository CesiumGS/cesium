import ColorBlendMode from "../ColorBlendMode.js";
import combine from "../../Core/combine.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import CPUStylingStageVS from "../../Shaders/ModelExperimental/CPUStylingStageVS.js";
import CPUStylingStageFS from "../../Shaders/ModelExperimental/CPUStylingStageFS.js";

/**
 * The CPU styling pipeline stage processes the style for a model using the Batch Texture.
 */
var CPUStylingStage = {};
CPUStylingStage.name = "CPUStylingStage"; // Helps with debugging.

CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_VS = "FeatureIdentificationVS";
CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_FS = "FeatureIdentificationFS";
CPUStylingStage.STRUCT_NAME_FEATURE_IDENTIFICATION = "FeatureIdentification";
CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_VS =
  "setFeatureIdentificationVaryingsVS";
CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_FS =
  "setFeatureIdentificationVaryingsFS";
CPUStylingStage.FUNCTION_SIGNATURE_SET_FEATURE_IDENTIFICATION_VARYINGS =
  "void setFeatureIdentificationVaryings(inout FeatureIdentification feature)";

/**
 * This pipeline stage processes the show, color and style properties of a model.
 *
 * Processes a model. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> sets up the struct for feature identification</li>
 *  <li> adds the shader code to set up the feature or model color</li>
 * </ul>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {ModelExperimental} model The model.
 * @param {FrameState} frameState The frame state.
 */
CPUStylingStage.process = function (renderResources, model, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine("USE_CPU_STYLING", undefined, ShaderDestination.BOTH);
  shaderBuilder.addFragmentLines([CPUStylingStageFS]);

  if (model.hasStyle) {
    shaderBuilder.addVertexLines([CPUStylingStageVS]);
    setupShaderForFeatureStyling(shaderBuilder);
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

/**
 * Adds the color property to the FeatureIdentification struct and sets up the
 * varyings.
 *
 * @private
 */
function setupShaderForFeatureStyling(shaderBuilder) {
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
}

export default CPUStylingStage;
