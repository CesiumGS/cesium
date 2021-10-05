import ShaderDestination from "../../Renderer/ShaderDestination.js";
import CPUStylingStageVS from "../../Shaders/ModelExperimental/CPUStylingStageVS.js";
import CPUStylingStageFS from "../../Shaders/ModelExperimental/CPUStylingStageFS.js";
import ColorBlendMode from "../ColorBlendMode.js";
import Cesium3DTileColorBlendMode from "../Cesium3DTileColorBlendMode.js";
import CesiumMath from "../../Core/Math.js";
import DeveloperError from "../../Core/DeveloperError.js";

/**
 * The CPU styling pipeline stage processes the style for a model using the Batch Texture.
 */
var CPUStylingStage = {};
CPUStylingStage.name = "CPUStylingStage"; // Helps with debugging.

CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_VS = "FeatureIdentificationVS";
CPUStylingStage.STRUCT_ID_FEATURE_IDENTIFICATION_FS = "FeatureIdentificationFS";
CPUStylingStage.STRUCT_NAME_FEATURE_IDENTIFICATION = "FeatureIdentification";
CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_VS =
  "updateFeatureIdStructVS";
CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_FS =
  "updateFeatureIdStructFS";
CPUStylingStage.FUNCTION_SIGNATURE_SET_FEATURE_IDENTIFICATION_VARYINGS =
  "void updateFeatureIdStruct(inout FeatureIdentification feature)";

CPUStylingStage.STYLE_COLOR_BLEND_UNIFORM_NAME = "model_styleColorBlend";

/**
 * This pipeline stage processes the show, color and style properties of a model.
 *
 * Processes a model. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> sets up the struct for feature identification</li>
 *  <li> adds the shader code to set up the feature or model color</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this model.
 * @param {ModelComponents.Primitive} primitive The model.
 * @param {FrameState} frameState The frame state.
 */
CPUStylingStage.process = function (renderResources, primitive, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine("USE_CPU_STYLING", undefined, ShaderDestination.BOTH);
  shaderBuilder.addFragmentLines([CPUStylingStageFS]);
  shaderBuilder.addVertexLines([CPUStylingStageVS]);

  // Set the color blend mode from the tileset.
  var tileset = renderResources.model.content.tileset;
  var colorBlendMode = tileset.colorBlendMode;
  var colorBlendAmount = tileset.colorBlendAmount;

  renderResources.uniformMap[
    CPUStylingStage.STYLE_COLOR_BLEND_UNIFORM_NAME
  ] = function () {
    return getColorBlend(colorBlendMode, colorBlendAmount);
  };

  setupShaderForFeatureStyling(shaderBuilder);
};

function getColorBlend(colorBlendMode, colorBlendAmount) {
  if (colorBlendMode === Cesium3DTileColorBlendMode.HIGHLIGHT) {
    return 0.0;
  }
  if (colorBlendMode === Cesium3DTileColorBlendMode.REPLACE) {
    return 1.0;
  }
  if (colorBlendMode === Cesium3DTileColorBlendMode.MIX) {
    // The value 0.0 is reserved for highlight, so clamp to just above 0.0.
    return CesiumMath.clamp(colorBlendAmount, CesiumMath.EPSILON4, 1.0);
  }
  //>>includeStart('debug', pragmas.debug);
  throw new DeveloperError(
    'Invalid color blend mode "' + colorBlendMode + '".'
  );
  //>>includeEnd('debug');
}

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

  shaderBuilder.addUniform(
    "float",
    CPUStylingStage.STYLE_COLOR_BLEND_UNIFORM_NAME
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
  shaderBuilder.addVarying("vec4", "v_activeFeatureColor");

  shaderBuilder.addFunction(
    CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_VS,
    CPUStylingStage.FUNCTION_SIGNATURE_SET_FEATURE_IDENTIFICATION_VARYINGS,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addFunctionLines(
    CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_VS,
    ["v_activeFeatureColor = feature.color;"]
  );
  shaderBuilder.addFunction(
    CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_FS,
    CPUStylingStage.FUNCTION_SIGNATURE_SET_FEATURE_IDENTIFICATION_VARYINGS,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addFunctionLines(
    CPUStylingStage.FUNCTION_ID_FEATURE_IDENTIFICATION_FS,
    ["feature.color = v_activeFeatureColor;"]
  );
}

export default CPUStylingStage;
