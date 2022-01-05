import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import InstancingPipelineStage from "./InstancingPipelineStage.js";
import ModelMatrixUpdateStage from "./ModelMatrixUpdateStage.js";
/**
 * An in-memory representation of a node as part of
 * the {@link ModelExperimentalSceneGraph}
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.Node} options.node The corresponding node components from the 3D model
 * @param {Matrix4} options.transform The model space transform of this node.
 * @param {ModelExperimentalSceneGraph} options.sceneGraph The scene graph this node belongs to.
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
  Check.typeOf.object("options.transform", options.transform);
  Check.typeOf.object("options.sceneGraph", options.sceneGraph);
  Check.typeOf.object("options.children", options.children);
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

  /**
   * Update stages to apply to this primitive.
   */
  this.updateStages = [];

  this._transformDirty = false;

  this._originalTransform = Matrix4.clone(options.transform);
  this._transform = Matrix4.clone(options.transform);

  var modelMatrix = this.sceneGraph._model.modelMatrix;
  this._computedTransform = Matrix4.multiply(
    modelMatrix,
    this._transform,
    new Matrix4()
  );

  initialize(this);
}

Object.defineProperties(ModelExperimentalNode.prototype, {
  /**
   * The node's model space transform.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
   *
   */
  transform: {
    get: function () {
      return this._transform;
    },
    set: function (value) {
      if (Matrix4.equals(this._transform, value)) {
        return;
      }
      this._transformDirty = true;
      this._transform = value;
    },
  },
  /**
   * The node's world space model transform.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
   * @readonly
   */
  computedTransform: {
    get: function () {
      var modelMatrix = this.sceneGraph._model.modelMatrix;
      return Matrix4.multiply(
        modelMatrix,
        this._transform,
        this._computedTransform
      );
    },
  },
  /**
   * The node's original model space transform.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
   * @readonly
   */
  originalTransform: {
    get: function () {
      return this._originalTransform;
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
  var updateStages = runtimeNode.updateStages;

  if (defined(node.instances)) {
    pipelineStages.push(InstancingPipelineStage);
  }

  updateStages.push(ModelMatrixUpdateStage);

  return;
}
