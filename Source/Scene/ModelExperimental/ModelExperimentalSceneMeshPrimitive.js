import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import GeometryPipelineStage from "./GeometryPipelineStage.js";
import PickingPipelineStage from "./PickingPipelineStage.js";
import LightingPipelineStage from "./LightingPipelineStage.js";
import MaterialPipelineStage from "./MaterialPipelineStage.js";

/**
 * In memory representation of a single mesh primitive, that is, a primitive
 * and its corresponding mesh.
 *
 * @param {Object} options An object containing the following options
 * @param {ModelComponents.Primitive} options.primitive the
 *
 * @private
 */
export default function ModelExperimentalSceneMeshPrimitive(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.primitive", options.primitive);
  //>>includeEnd('debug');

  /**
   * The primitive components associated with this mesh primitive.
   *
   * @type {ModelComponents.Primitive}
   *
   * @private
   */
  this.primitive = options.primitive;

  this._allowPicking = options.allowPicking;

  /**
   * Pipeline stages to apply to this mesh primitive. This
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

function initialize(sceneMeshPrimitive) {
  var pipelineStages = sceneMeshPrimitive.pipelineStages;
  pipelineStages.push(GeometryPipelineStage);

  if (sceneMeshPrimitive._allowPicking) {
    pipelineStages.push(PickingPipelineStage);
  }

  pipelineStages.push(MaterialPipelineStage);
  pipelineStages.push(LightingPipelineStage);
  return;
}
