import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import InstancingPipelineStage from "./InstancingPipelineStage.js";
/**
 * An in-memory representation of a node as part of
 * the {@link ModelExperimentalSceneGraph}
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.Node} options.node The corresponding node components from the 3D model
 * @param {Matrix4} options.modelMatrix The model matrix associated with this node.
 * @param {ModelExperimentalSceneGraph} The scene graph this node belongs to.
 * @param {Number[]} options.children The indices of the children of this node in the runtime nodes array of the scene graph.
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
   * The scene graph this node belongs to.
   *
   * @type {ModelExperimentalSceneGraph}
   * @readonly
   *
   * @private
   */
  this.sceneGraph = options.sceneGraph;

  /**
   * The indices of the children of this node in the runtime nodes array of the scene graph.
   *
   * @type {Number[]}
   * @readonly
   *
   * @private
   */
  this.children = options.children;

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
   * The runtime transform applied to this node.
   *
   * @type {Matrix4}
   * @readonly
   */
  this.transform = Matrix4.clone(options.modelMatrix);

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

Object.defineProperties(ModelExperimentalNode.prototype, {
  transform: {
    get: function () {
      return this.transform;
    },
    set: function (value) {
      // TODO: Set dirty flag.
      this.transform = value;
    },
  },
});

/**
 * Returns the child with the given index.
 *
 * @param {Number} index The index of the child.
 *
 * @returns {ModelExperimentalNode}
 *
 * @example
 * // Iterate through all children of a runtime node.
 * for (var i = 0; i < runtimeNode.children.length; i++)
 * {
 *   var childNode = runtimeNode.getChild(i);
 * }
 *
 */
ModelExperimentalNode.prototype.getChild = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  if (index < 0 || index >= this.children.length) {
    throw new DeveloperError(
      "index must be greater than or equal to 0 and less than the number of children."
    );
  }
  //>>includeEnd('debug');

  return this.sceneGraph.runtimeNodes[this.children[index]];
};

function initialize(runtimeNode) {
  var node = runtimeNode.node;
  var pipelineStages = runtimeNode.pipelineStages;

  if (defined(node.instances)) {
    pipelineStages.push(InstancingPipelineStage);
  }

  return;
}
