import ShaderDestination from "../../Renderer/ShaderDestination.js";
import FeatureStageCommon from "../../Shaders/ModelExperimental/FeatureStageCommon.js";
import FeatureStageFS from "../../Shaders/ModelExperimental/FeatureStageFS.js";

/**
 * The feature ID pipeline stage is responsible for handling features in the model.
 *
 * @namespace SelectedFeatureIdPipelineStage
 * @private
 */
var SelectedFeatureIdPipelineStage = {};
SelectedFeatureIdPipelineStage.name = "SelectedFeatureIdPipelineStage"; // Helps with debugging

SelectedFeatureIdPipelineStage.STRUCT_ID_FEATURE = "FeatureStruct";
SelectedFeatureIdPipelineStage.STRUCT_NAME_FEATURE = "Feature";
SelectedFeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_VS =
  "updateFeatureStructVS";
SelectedFeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_FS =
  "updateFeatureStructFS";
SelectedFeatureIdPipelineStage.FUNCTION_SIGNATURE_UPDATE_FEATURE =
  "void updateFeatureStruct(inout Feature feature)";

/**
 * Process a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>sets the defines for the feature ID attribute or texture coordinates to use for feature picking</li>
 *  <li>adds uniforms for the batch texture</li>
 *  <li>sets up varying for the feature coordinates</li>
 *  <li>adds vertex shader code for computing feature coordinates</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 */
SelectedFeatureIdPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var shaderBuilder = renderResources.shaderBuilder;

  renderResources.hasFeatureIds = true;

  shaderBuilder.addDefine("HAS_FEATURES", undefined, ShaderDestination.BOTH);
  updateFeatureStruct(shaderBuilder);

  shaderBuilder.addFragmentLines([FeatureStageCommon, FeatureStageFS]);
};

/**
 * Populate the "Feature" struct in the shaders that holds information about the "active" (used for picking/styling) feature.
 * The struct is always added to the shader by the GeometryPipelineStage (required for compilation). The Feature struct looks
 * as follows:
 *
 * struct Feature {
 *   int id;
 *   vec2 st;
 *   vec4 color;
 * }
 *
 * @private
 */
function updateFeatureStruct(shaderBuilder) {
  shaderBuilder.addStructField(
    SelectedFeatureIdPipelineStage.STRUCT_ID_FEATURE,
    "int",
    "id"
  );

  shaderBuilder.addStructField(
    SelectedFeatureIdPipelineStage.STRUCT_ID_FEATURE,
    "vec2",
    "st"
  );

  shaderBuilder.addStructField(
    SelectedFeatureIdPipelineStage.STRUCT_ID_FEATURE,
    "vec4",
    "color"
  );
}

/**
 * Generates functions in the vertex and fragment shaders to update the varyings from the Feature struct and to update the Feature struct from the varyings, respectively.
 * @private
 */
/*
function generateFeatureFunctions(shaderBuilder) {
  // Add the function to the vertex shader.
  shaderBuilder.addFunction(
    SelectedFeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_VS,
    SelectedFeatureIdPipelineStage.FUNCTION_SIGNATURE_UPDATE_FEATURE,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addFunctionLines(
    SelectedFeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_VS,
    [
      "v_activeFeatureId = float(feature.id);",
      "v_activeFeatureSt = feature.st;",
      "v_activeFeatureColor = feature.color;",
    ]
  );

  // Add the function to the fragment shader.
  shaderBuilder.addFunction(
    SelectedFeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_FS,
    SelectedFeatureIdPipelineStage.FUNCTION_SIGNATURE_UPDATE_FEATURE,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addFunctionLines(
    SelectedFeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_FS,
    [
      "feature.id = int(v_activeFeatureId);",
      "feature.st = v_activeFeatureSt;",
      "feature.color = v_activeFeatureColor;",
    ]
  );
}
*/

export default SelectedFeatureIdPipelineStage;
