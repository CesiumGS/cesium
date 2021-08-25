import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import CustomShaderStage from "./CustomShaderStage.js";
import CustomShaderMode from "./CustomShaderMode.js";
import GeometryPipelineStage from "./GeometryPipelineStage.js";
import LightingPipelineStage from "./LightingPipelineStage.js";
import MaterialPipelineStage from "./MaterialPipelineStage.js";
import PickingPipelineStage from "./PickingPipelineStage.js";

/**
 * In memory representation of a single primitive, that is, a primitive
 * and its corresponding mesh.
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.Primitive} options.primitive The primitive component.
 * @param {Boolean} options.allowPicking Whether or not the model this primitive belongs to allows picking of primitives. See {@link ModelExperimental#allowPicking}.
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
  Check.typeOf.object("options.model", options.model);
  Check.typeOf.bool("options.allowPicking", options.allowPicking);
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
   * A reference to the model
   *
   * @type {ModelExperimental}
   *
   * @private
   */
  this.model = options.model;

  /**
   * Whether or not the model this primitive belongs to allows picking of primitives. See {@link ModelExperimental#allowPicking}.
   *
   * @type {Boolean}
   *
   * @private
   */
  this.allowPicking = options.allowPicking;

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
  pipelineStages.push(GeometryPipelineStage);

  var customShader = runtimePrimitive.model.customShader;
  var hasCustomShader = defined(customShader);
  var hasCustomFragmentShader =
    hasCustomShader && defined(customShader.fragmentShaderText);
  var materialsEnabled =
    !hasCustomFragmentShader ||
    customShader.mode !== CustomShaderMode.REPLACE_MATERIAL;

  if (materialsEnabled) {
    pipelineStages.push(MaterialPipelineStage);
  }

  if (hasCustomShader) {
    pipelineStages.push(CustomShaderStage);
  }

  pipelineStages.push(LightingPipelineStage);

  if (runtimePrimitive.allowPicking) {
    pipelineStages.push(PickingPipelineStage);
  }

  return;
}
