import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import SelectedFeatureIdStageCommon from "../../Shaders/ModelExperimental/SelectedFeatureIdStageCommon.js";
import ModelComponents from "../ModelComponents.js";

/**
 * The feature ID pipeline stage is responsible for handling features in the model.
 *
 * @namespace SelectedFeatureIdPipelineStage
 * @private
 */
var SelectedFeatureIdPipelineStage = {};
SelectedFeatureIdPipelineStage.name = "SelectedFeatureIdPipelineStage"; // Helps with debugging

SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE = "SelectedFeature";
SelectedFeatureIdPipelineStage.STRUCT_NAME_SELECTED_FEATURE = "SelectedFeature";
SelectedFeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_VS =
  "updateFeatureStructVS";
SelectedFeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_FS =
  "updateFeatureStructFS";
SelectedFeatureIdPipelineStage.FUNCTION_SIGNATURE_UPDATE_FEATURE =
  "void updateFeatureStruct(inout SelectedFeature feature)";

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

  renderResources.hasPropertyTable = true;

  var model = renderResources.model;
  var node = renderResources.runtimeNode.node;
  var selectedFeatureIds = getSelectedFeatureIds(model, node, primitive);

  shaderBuilder.addDefine(
    "HAS_SELECTED_FEATURE_ID",
    undefined,
    selectedFeatureIds.shaderDestination
  );

  // Add a define to insert the variable to use.
  // Example: #define SELECTED_FEATURE_ID featureId_1
  // This corresponds to featureIds.featureId_1
  shaderBuilder.addDefine(
    "SELECTED_FEATURE_ID",
    selectedFeatureIds.variableName,
    selectedFeatureIds.shaderDestination
  );

  updateFeatureStruct(shaderBuilder);

  if (selectedFeatureIds.shaderDestination === ShaderDestination.BOTH) {
    shaderBuilder.addVertexLines([SelectedFeatureIdStageCommon]);
  }
  shaderBuilder.addFragmentLines([SelectedFeatureIdStageCommon]);
};

function getShaderDestination(featureIds) {
  // Feature ID textures are only supported in the fragment shader.
  if (featureIds instanceof ModelComponents.FeatureIdTexture) {
    return ShaderDestination.FRAGMENT;
  }

  return ShaderDestination.BOTH;
}

function getSelectedFeatureIds(model, node, primitive) {
  var variableName;
  var featureIds;
  // Check instances first, as this is the most specific type of
  // feature ID
  if (defined(node.instances)) {
    featureIds = node.instances.featureIds[model.instanceFeatureIdIndex];

    if (defined(featureIds)) {
      variableName = "instanceFeatureId_" + model.instanceFeatureIdIndex;
      return {
        featureIds: featureIds,
        variableName: variableName,
        shaderDestination: getShaderDestination(featureIds),
      };
    }
  }

  featureIds = primitive.featureIds[model.featureIdIndex];
  variableName = "featureId_" + model.featureIdIndex;
  return {
    featureIds: featureIds,
    variableName: variableName,
    shaderDestination: getShaderDestination(featureIds),
  };
}

/**
 * Populate the "SelectedFeature" struct in the shaders that holds information about the "active" (used for picking/styling) feature.
 * The struct is always added to the shader by the GeometryPipelineStage (required for compilation). The SelectedFeature struct looks
 * as follows:
 *
 * struct SelectedFeature {
 *   int id;
 *   vec2 st;
 *   vec4 color;
 * }
 *
 * @private
 */
function updateFeatureStruct(shaderBuilder) {
  shaderBuilder.addStructField(
    SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE,
    "int",
    "id"
  );

  shaderBuilder.addStructField(
    SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE,
    "vec2",
    "st"
  );

  shaderBuilder.addStructField(
    SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE,
    "vec4",
    "color"
  );
}

export default SelectedFeatureIdPipelineStage;
