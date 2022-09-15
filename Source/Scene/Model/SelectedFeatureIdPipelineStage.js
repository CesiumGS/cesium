import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import SelectedFeatureIdStageCommon from "../../Shaders/Model/SelectedFeatureIdStageCommon.js";
import ModelComponents from "../ModelComponents.js";
import ModelUtility from "./ModelUtility.js";

/**
 * The selected feature ID pipeline stage is responsible for handling the
 * set of feature IDs selected for styling/picking.
 *
 * @namespace SelectedFeatureIdPipelineStage
 * @private
 */
const SelectedFeatureIdPipelineStage = {
  name: "SelectedFeatureIdPipelineStage", // Helps with debugging

  STRUCT_ID_SELECTED_FEATURE: "SelectedFeature",
  STRUCT_NAME_SELECTED_FEATURE: "SelectedFeature",
  FUNCTION_ID_FEATURE_VARYINGS_VS: "updateFeatureStructVS",
  FUNCTION_ID_FEATURE_VARYINGS_FS: "updateFeatureStructFS",
  FUNCTION_SIGNATURE_UPDATE_FEATURE:
    "void updateFeatureStruct(inout SelectedFeature feature)",
};

/**
 * Process a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>sets the defines for the feature ID attribute to use for styling/picking</li>
 *  <li>adds fields to the SelectedFeature struct in the shader</li>
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
  const shaderBuilder = renderResources.shaderBuilder;

  renderResources.hasPropertyTable = true;

  const model = renderResources.model;
  const node = renderResources.runtimeNode.node;
  const selectedFeatureIds = getSelectedFeatureIds(model, node, primitive);
  const shaderDestination = selectedFeatureIds.shaderDestination;

  shaderBuilder.addDefine(
    "HAS_SELECTED_FEATURE_ID",
    undefined,
    shaderDestination
  );

  // Add a define to insert the variable to use.
  // Example: #define SELECTED_FEATURE_ID featureId_1
  // This corresponds to featureIds.featureId_1
  shaderBuilder.addDefine(
    "SELECTED_FEATURE_ID",
    selectedFeatureIds.variableName,
    shaderDestination
  );

  // Add a define to the shader to distinguish feature ID attributes from
  // textures. This is needed for determining where to filter features
  // by pass type.
  shaderBuilder.addDefine(
    selectedFeatureIds.featureIdDefine,
    undefined,
    shaderDestination
  );

  updateFeatureStruct(shaderBuilder);

  const nullFeatureId = selectedFeatureIds.featureIds.nullFeatureId;
  const uniformMap = renderResources.uniformMap;
  if (defined(nullFeatureId)) {
    shaderBuilder.addDefine(
      "HAS_NULL_FEATURE_ID",
      undefined,
      shaderDestination
    );
    shaderBuilder.addUniform("int", "model_nullFeatureId", shaderDestination);
    uniformMap.model_nullFeatureId = function () {
      return nullFeatureId;
    };
  }

  if (selectedFeatureIds.shaderDestination === ShaderDestination.BOTH) {
    shaderBuilder.addVertexLines(SelectedFeatureIdStageCommon);
  }
  shaderBuilder.addFragmentLines(SelectedFeatureIdStageCommon);
};

function getFeatureIdDefine(featureIds) {
  if (featureIds instanceof ModelComponents.FeatureIdTexture) {
    return "HAS_SELECTED_FEATURE_ID_TEXTURE";
  }

  return "HAS_SELECTED_FEATURE_ID_ATTRIBUTE";
}

function getShaderDestination(featureIds) {
  // Feature ID textures are only supported in the fragment shader.
  if (featureIds instanceof ModelComponents.FeatureIdTexture) {
    return ShaderDestination.FRAGMENT;
  }

  return ShaderDestination.BOTH;
}

function getSelectedFeatureIds(model, node, primitive) {
  let variableName;
  let featureIds;
  // Check instances first, as this is the most specific type of
  // feature ID
  if (defined(node.instances)) {
    featureIds = ModelUtility.getFeatureIdsByLabel(
      node.instances.featureIds,
      model.instanceFeatureIdLabel
    );

    if (defined(featureIds)) {
      // Either label could be used here, but prefer label as it may be more
      // meaningful when debugging
      variableName = defaultValue(featureIds.label, featureIds.positionalLabel);
      return {
        featureIds: featureIds,
        variableName: variableName,
        shaderDestination: getShaderDestination(featureIds),
        featureIdDefine: getFeatureIdDefine(featureIds),
      };
    }
  }

  featureIds = ModelUtility.getFeatureIdsByLabel(
    primitive.featureIds,
    model.featureIdLabel
  );
  // again, prefer label for being more descriptive
  variableName = defaultValue(featureIds.label, featureIds.positionalLabel);
  return {
    featureIds: featureIds,
    variableName: variableName,
    shaderDestination: getShaderDestination(featureIds),
    featureIdDefine: getFeatureIdDefine(featureIds),
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
