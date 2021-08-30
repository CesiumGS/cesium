import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import GeometryPipelineStage from "./GeometryPipelineStage.js";
import LightingPipelineStage from "./LightingPipelineStage.js";
import MaterialPipelineStage from "./MaterialPipelineStage.js";
import PickingPipelineStage from "./PickingPipelineStage.js";
import FeaturePipelineStage from "./FeaturePipelineStage.js";

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
  pipelineStages.push(MaterialPipelineStage);
  pipelineStages.push(LightingPipelineStage);

  if (defined(runtimePrimitive.model._featureTable)) {
    pipelineStages.push(FeaturePipelineStage);
  }

  if (runtimePrimitive.allowPicking) {
    pipelineStages.push(PickingPipelineStage);
  }

  return;
}
