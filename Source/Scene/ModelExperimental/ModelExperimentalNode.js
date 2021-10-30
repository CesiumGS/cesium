import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import InstancingPipelineStage from "./InstancingPipelineStage.js";
/**
 * An in-memory representation of a node as part of
 * the {@link ModelExperimentalSceneGraph}
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.Node} options.node The corresponding node components from the 3D model
 * @param {Matrix4} options.modelMatrix The model matrix associated with this node.
 *
 * @alias ModelExperimentalNode
 * @constructor
 *
 * @private
 */
export default function ModelExperimentalNode(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.node", options.node);
  Check.typeOf.object("options.modelMatrix", options.modelMatrix);
  //>>includeEnd('debug');

  /**
   * The model components node associated with this scene graph node.
   *
   * @type {ModelComponents.Node}
   * @readonly
   *
   * @private
   */
  this.node = options.node;

  /**
   * The model matrix associated with this node.
   *
   * @type {Matrix4}
   * @readonly
   *
   * @private
   */
  this.modelMatrix = options.modelMatrix;

  /**
   * Pipeline stages to apply across all the mesh primitives of this node. This
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
   * The mesh primitives that belong to this node
   *
   * @type {ModelExperimentalPrimitive[]}
   * @readonly
   *
   * @private
   */
  this.runtimePrimitives = [];

  initialize(this);
}

function initialize(runtimeNode) {
  var node = runtimeNode.node;
  var pipelineStages = runtimeNode.pipelineStages;

  if (defined(node.instances)) {
    pipelineStages.push(InstancingPipelineStage);
  }

  return;
}
