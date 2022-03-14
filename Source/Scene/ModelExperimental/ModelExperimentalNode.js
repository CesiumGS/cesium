import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import InstancingPipelineStage from "./InstancingPipelineStage.js";
import ModelMatrixUpdateStage from "./ModelMatrixUpdateStage.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

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

  const sceneGraph = options.sceneGraph;
  const transform = options.transform;

  this._sceneGraph = sceneGraph;
  this._children = options.children;
  this._node = options.node;

  const components = sceneGraph.components;

  this._originalTransform = Matrix4.clone(transform);
  this._axisCorrectedTransform = Matrix4.clone(transform);
  ModelExperimentalUtility.correctModelMatrix(
    this._axisCorrectedTransform,
    components.upAxis,
    components.forwardAxis
  );
  this._transform = Matrix4.clone(transform);
  this._computedTransform = Matrix4.multiplyTransformation(
    sceneGraph.computedModelMatrix,
    transform,
    new Matrix4()
  );
  this._transformDirty = false;

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
   *
   * @private
   */
  this.updateStages = [];

  this.configurePipeline();
}

Object.defineProperties(ModelExperimentalNode.prototype, {
  /**
   * The internal node this runtime node represents.
   *
   * @type {ModelComponents.Node}
   * @readonly
   *
   * @private
   */
  node: {
    get: function () {
      return this._node;
    },
  },
  /**
   * The scene graph this node belongs to.
   *
   * @type {ModelExperimentalSceneGraph}
   * @readonly
   *
   * @private
   */
  sceneGraph: {
    get: function () {
      return this._sceneGraph;
    },
  },

  /**
   * The indices of the children of this node in the scene graph.
   *
   * @type {Number[]}
   * @readonly
   */
  children: {
    get: function () {
      return this._children;
    },
  },

  /**
   * The node's model space transform.
   * <p>
   * For changes to take effect, this property must be assigned to;
   * setting individual elements of the matrix will not work.
   * </p>
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
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
      this._transform = Matrix4.clone(value, this._transform);
      this._axisCorrectedTransform = Matrix4.clone(
        value,
        this._axisCorrectedTransform
      );
      ModelExperimentalUtility.correctModelMatrix(
        this._axisCorrectedTransform,
        this._sceneGraph.components.upAxis,
        this._sceneGraph.components.forwardAxis
      );
      Matrix4.multiplyTransformation(
        this._sceneGraph.computedModelMatrix,
        value,
        this._computedTransform
      );
    },
  },

  /**
   * The node's axis corrected model space transform.
   * @type {Matrix4}
   * @private
   * @readonly
   */
  axisCorrectedTransform: {
    get: function () {
      return this._axisCorrectedTransform;
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
      return this._computedTransform;
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
 * for (let i = 0; i < runtimeNode.children.length; i++)
 * {
 *   const childNode = runtimeNode.getChild(i);
 * }
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

/**
 * Configure the node pipeline stages. If the pipeline needs to be re-run, call
 * this method again to ensure the correct sequence of pipeline stages are
 * used.
 *
 * @private
 */
ModelExperimentalNode.prototype.configurePipeline = function () {
  const node = this.node;
  const pipelineStages = this.pipelineStages;
  pipelineStages.length = 0;
  const updateStages = this.updateStages;
  updateStages.length = 0;

  if (defined(node.instances)) {
    pipelineStages.push(InstancingPipelineStage);
  }

  updateStages.push(ModelMatrixUpdateStage);
};

/**
 * @private
 */
ModelExperimentalNode.prototype.updateModelMatrix = function () {
  this._transformDirty = true;
  Matrix4.multiplyTransformation(
    this._sceneGraph.computedModelMatrix,
    this._transform,
    this._computedTransform
  );
  Matrix4.multiplyByUniformScale(
    this._computedTransform,
    this._sceneGraph._scale,
    this._computedTransform
  );
};
