import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import CustomShaderStage from "./CustomShaderStage.js";
import CustomShaderMode from "./CustomShaderMode.js";
import GeometryPipelineStage from "./GeometryPipelineStage.js";
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
  Check.typeOf.object("options.model", options.model);
  //>>includeEnd('debug');

  /**
   * The primitive components associated with this mesh primitive.
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

  var customShader = sceneMeshPrimitive.model.customShader;
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
  return;
}
