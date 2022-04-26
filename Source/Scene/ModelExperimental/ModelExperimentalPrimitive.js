import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import AlphaPipelineStage from "./AlphaPipelineStage.js";
import BatchTexturePipelineStage from "./BatchTexturePipelineStage.js";
import CustomShaderMode from "./CustomShaderMode.js";
import CustomShaderPipelineStage from "./CustomShaderPipelineStage.js";
import FeatureIdPipelineStage from "./FeatureIdPipelineStage.js";
import CPUStylingPipelineStage from "./CPUStylingPipelineStage.js";
import DequantizationPipelineStage from "./DequantizationPipelineStage.js";
import GeometryPipelineStage from "./GeometryPipelineStage.js";
import LightingPipelineStage from "./LightingPipelineStage.js";
import MaterialPipelineStage from "./MaterialPipelineStage.js";
import MetadataPipelineStage from "./MetadataPipelineStage.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import MorphTargetsPipelineStage from "./MorphTargetsPipelineStage.js";
import PickingPipelineStage from "./PickingPipelineStage.js";
import PointCloudAttenuationPipelineStage from "./PointCloudAttenuationPipelineStage.js";
import SelectedFeatureIdPipelineStage from "./SelectedFeatureIdPipelineStage.js";
import SkinningPipelineStage from "./SkinningPipelineStage.js";

/**
 * In memory representation of a single primitive, that is, a primitive
 * and its corresponding mesh.
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.Primitive} options.primitive The primitive component.
 * @param {ModelExperimental} options.model The {@link ModelExperimental} this primitive belongs to.
 *
 * @alias ModelExperimentalPrimitive
 * @constructor
 *
 * @private
 */
export default function ModelExperimentalPrimitive(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.primitive", options.primitive);
  Check.typeOf.object("options.node", options.node);
  Check.typeOf.object("options.model", options.model);
  //>>includeEnd('debug');

  /**
   * The primitive component associated with this primitive.
   *
   * @type {ModelComponents.Primitive}
   *
   * @private
   */
  this.primitive = options.primitive;

  /**
   * A reference to the node this primitive belongs to.
   *
   * @type {ModelComponents.Node}
   *
   * @private
   */
  this.node = options.node;

  /**
   * A reference to the model
   *
   * @type {ModelExperimental}
   *
   * @private
   */
  this.model = options.model;

  /**
   * Pipeline stages to apply to this primitive. This
   * is an array of classes, each with a static method called
   * <code>process()</code>
   *
   * @type {Object[]}
   * @readonly
   *
   * @private
   */
  this.pipelineStages = [];

  /**
   * The generated {@link DrawCommand}s associated with this primitive.
   *
   * @type {DrawCommand[]}
   *
   * @private
   */
  this.drawCommands = [];

  /**
   * The bounding sphere of this primitive (in object-space).
   *
   * @type {BoundingSphere}
   *
   * @private
   */
  this.boundingSphere = undefined;

  /**
   * Update stages to apply to this primitive.
   *
   * @private
   */
  this.updateStages = [];

  this.configurePipeline();
}

/**
 * Configure the primitive pipeline stages. If the pipeline needs to be re-run, call
 * this method again to ensure the correct sequence of pipeline stages are
 * used.
 *
 * @private
 */
ModelExperimentalPrimitive.prototype.configurePipeline = function () {
  const pipelineStages = this.pipelineStages;
  pipelineStages.length = 0;

  const primitive = this.primitive;
  const node = this.node;
  const model = this.model;
  const customShader = model.customShader;

  const hasMorphTargets =
    defined(primitive.morphTargets) && primitive.morphTargets.length > 0;
  const hasSkinning = defined(node.skin);
  const hasCustomShader = defined(customShader);
  const hasCustomFragmentShader =
    hasCustomShader && defined(customShader.fragmentShaderText);
  const materialsEnabled =
    !hasCustomFragmentShader ||
    customShader.mode !== CustomShaderMode.REPLACE_MATERIAL;
  const hasQuantization = ModelExperimentalUtility.hasQuantizedAttributes(
    primitive.attributes
  );

  const pointCloudShading = model.pointCloudShading;
  const hasAttenuation =
    defined(pointCloudShading) && pointCloudShading.attenuation;

  const featureIdFlags = inspectFeatureIds(model, node, primitive);

  // Start of pipeline -----------------------------------------------------

  pipelineStages.push(GeometryPipelineStage);

  if (hasMorphTargets) {
    pipelineStages.push(MorphTargetsPipelineStage);
  }

  if (hasSkinning) {
    pipelineStages.push(SkinningPipelineStage);
  }

  if (hasAttenuation && primitive.primitiveType === PrimitiveType.POINTS) {
    pipelineStages.push(PointCloudAttenuationPipelineStage);
  }

  if (hasQuantization) {
    pipelineStages.push(DequantizationPipelineStage);
  }

  if (materialsEnabled) {
    pipelineStages.push(MaterialPipelineStage);
  }

  // These stages are always run to ensure structs
  // are declared to avoid compilation errors.
  pipelineStages.push(FeatureIdPipelineStage);
  pipelineStages.push(MetadataPipelineStage);

  if (featureIdFlags.hasPropertyTable) {
    pipelineStages.push(SelectedFeatureIdPipelineStage);
    pipelineStages.push(BatchTexturePipelineStage);
    pipelineStages.push(CPUStylingPipelineStage);
  }

  if (hasCustomShader) {
    pipelineStages.push(CustomShaderPipelineStage);
  }

  pipelineStages.push(LightingPipelineStage);

  if (model.allowPicking) {
    pipelineStages.push(PickingPipelineStage);
  }

  pipelineStages.push(AlphaPipelineStage);

  return;
};

function inspectFeatureIds(model, node, primitive) {
  let featureIds;
  // Check instances first, as this is the most specific type of
  // feature ID
  if (defined(node.instances)) {
    featureIds = ModelExperimentalUtility.getFeatureIdsByLabel(
      node.instances.featureIds,
      model.instanceFeatureIdLabel
    );

    if (defined(featureIds)) {
      return {
        hasFeatureIds: true,
        hasPropertyTable: defined(featureIds.propertyTableId),
      };
    }
  }

  featureIds = ModelExperimentalUtility.getFeatureIdsByLabel(
    primitive.featureIds,
    model.featureIdLabel
  );
  if (defined(featureIds)) {
    return {
      hasFeatureIds: true,
      hasPropertyTable: defined(featureIds.propertyTableId),
    };
  }

  return {
    hasFeatureIds: false,
    hasPropertyTable: false,
  };
}
