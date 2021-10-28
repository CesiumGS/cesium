import AlphaPipelineStage from "./AlphaPipelineStage.js";
import BatchTexturePipelineStage from "./BatchTexturePipelineStage.js";
import Check from "../../Core/Check.js";
import CustomShaderMode from "./CustomShaderMode.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import FeatureIdPipelineStage from "./FeatureIdPipelineStage.js";
import CPUStylingPipelineStage from "./CPUStylingPipelineStage.js";
import CustomShaderPipelineStage from "./CustomShaderPipelineStage.js";
import DequantizationPipelineStage from "./DequantizationPipelineStage.js";
import GeometryPipelineStage from "./GeometryPipelineStage.js";
import LightingPipelineStage from "./LightingPipelineStage.js";
import MaterialPipelineStage from "./MaterialPipelineStage.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import PickingPipelineStage from "./PickingPipelineStage.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

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

  initialize(this);
}

function initialize(runtimePrimitive) {
  var pipelineStages = runtimePrimitive.pipelineStages;

  var primitive = runtimePrimitive.primitive;
  var node = runtimePrimitive.node;
  var model = runtimePrimitive.model;
  var customShader = model.customShader;

  var hasCustomShader = defined(customShader);
  var hasCustomFragmentShader =
    hasCustomShader && defined(customShader.fragmentShaderText);
  var materialsEnabled =
    !hasCustomFragmentShader ||
    customShader.mode !== CustomShaderMode.REPLACE_MATERIAL;
  var hasQuantization = ModelExperimentalUtility.hasQuantizedAttributes(
    primitive.attributes
  );

  pipelineStages.push(GeometryPipelineStage);

  if (hasQuantization) {
    pipelineStages.push(DequantizationPipelineStage);
  }

  if (materialsEnabled) {
    pipelineStages.push(MaterialPipelineStage);
  }

  if (hasCustomShader) {
    pipelineStages.push(CustomShaderPipelineStage);
  }

  pipelineStages.push(LightingPipelineStage);

  // Add the FeatureIdPipelineStage and BatchTexturePipelineStage when the primitive has features, i.e. when at least one of the following conditions exists:
  // - the node is instanced and has feature ID attributes
  // - the primitive has a feature ID vertex attributes
  // - the primitive has a feature ID texture
  // It must be noted that we check for the presence of feature ID vertex attributes, and not feature ID attributes, because it is possible to have features in a model
  // without a feature table (for example, in 3D Tiles 1.0, where batch length > 0 but a batch table is not defined.)
  var featureIdAttributeIndex = model.featureIdAttributeIndex;
  var featureIdTextureIndex = model.featureIdTextureIndex;
  var hasInstancedFeatureIdAttribute;
  if (
    defined(node.instances) &&
    node.instances.featureIdAttributes.length > 0
  ) {
    var featureIdAttributes = node.instances.featureIdAttributes;
    if (defined(featureIdAttributes[featureIdAttributeIndex])) {
      hasInstancedFeatureIdAttribute = true;
    }
  }
  var hasFeatureIdVertexAttribute = defined(
    ModelExperimentalUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.FEATURE_ID
    )
  );
  var hasFeatureIdTexture = defined(
    primitive.featureIdTextures[featureIdTextureIndex]
  );
  var hasFeatureIds =
    hasInstancedFeatureIdAttribute ||
    hasFeatureIdVertexAttribute ||
    hasFeatureIdTexture;
  if (hasInstancedFeatureIdAttribute || hasFeatureIds) {
    pipelineStages.push(FeatureIdPipelineStage);
    pipelineStages.push(BatchTexturePipelineStage);
    if (!hasCustomShader) {
      pipelineStages.push(CPUStylingPipelineStage);
    }
  }

  if (model.allowPicking) {
    pipelineStages.push(PickingPipelineStage);
  }

  pipelineStages.push(AlphaPipelineStage);

  return;
}
